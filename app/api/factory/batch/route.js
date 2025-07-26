import { NextResponse } from 'next/server'
import { getCurrentUser, hasPermission, PERMISSIONS } from '../../../lib/auth'
import { supabase } from '../../../lib/supabase'
import { generateUniqueQRCode } from '../../../lib/qr-generator'

export async function POST(request) {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check permissions
    if (!hasPermission(user, PERMISSIONS.PRODUCTS.CREATE)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const operationType = formData.get('operation_type')

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload CSV or Excel files only.' },
        { status: 400 }
      )
    }

    // Read and parse file
    const fileBuffer = await file.arrayBuffer()
    const fileContent = Buffer.from(fileBuffer).toString('utf-8')
    
    let items = []
    
    try {
      // Parse CSV (simple implementation)
      if (file.type === 'text/csv') {
        items = parseCSV(fileContent)
      } else {
        // For Excel files, you'd need a library like 'xlsx'
        throw new Error('Excel parsing not implemented. Please use CSV files.')
      }
    } catch (parseError) {
      return NextResponse.json(
        { error: `File parsing failed: ${parseError.message}` },
        { status: 400 }
      )
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'No valid data found in file' },
        { status: 400 }
      )
    }

    if (items.length > 1000) {
      return NextResponse.json(
        { error: 'File contains too many items. Maximum 1000 items per batch.' },
        { status: 400 }
      )
    }

    // Validate items based on operation type
    const validationResult = validateBatchItems(items, operationType)
    if (!validationResult.isValid) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      )
    }

    // Create batch operation record
    const { data: operation, error: operationError } = await supabase
      .from('batch_operations')
      .insert([{
        operation_type: operationType,
        factory_id: user.profile.factory_id,
        created_by: user.id,
        total_items: items.length,
        status: 'pending'
      }])
      .select()
      .single()

    if (operationError) {
      console.error('Batch operation creation error:', operationError)
      return NextResponse.json(
        { error: 'Failed to create batch operation' },
        { status: 500 }
      )
    }

    // Create batch operation items
    const batchItems = items.map((item, index) => ({
      batch_operation_id: operation.id,
      item_data: item,
      status: 'pending'
    }))

    const { error: itemsError } = await supabase
      .from('batch_operation_items')
      .insert(batchItems)

    if (itemsError) {
      console.error('Batch items creation error:', itemsError)
      return NextResponse.json(
        { error: 'Failed to create batch items' },
        { status: 500 }
      )
    }

    // Log batch operation creation
    await supabase
      .from('audit_logs')
      .insert([{
        event_type: 'product',
        event_name: 'BATCH_OPERATION_CREATED',
        user_id: user.id,
        resource_type: 'batch_operation',
        resource_id: operation.id,
        metadata: {
          operation_type: operationType,
          total_items: items.length,
          factory_id: user.profile.factory_id
        }
      }])

    return NextResponse.json({
      success: true,
      operation: {
        ...operation,
        items: batchItems.length
      },
      message: `Batch operation created successfully with ${items.length} items`
    })

  } catch (error) {
    console.error('Batch operation error:', error)
    return NextResponse.json(
      { error: error.message || 'Batch operation failed' },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit')) || 20
    const offset = parseInt(searchParams.get('offset')) || 0

    // Build query
    let query = supabase
      .from('batch_operations')
      .select(`
        *,
        created_by_user:user_profiles!batch_operations_created_by_fkey(full_name)
      `)
      .order('created_at', { ascending: false })

    // Filter by factory for non-admin users
    if (user.profile.role !== 'admin') {
      query = query.eq('factory_id', user.profile.factory_id)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: operations, error } = await query

    if (error) {
      console.error('Batch operations query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch batch operations' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      operations: operations || []
    })

  } catch (error) {
    console.error('Batch operations fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch batch operations' },
      { status: 500 }
    )
  }
}

function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row')
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const items = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
    
    if (values.length !== headers.length) {
      continue // Skip malformed rows
    }

    const item = {}
    headers.forEach((header, index) => {
      item[header] = values[index]
    })

    items.push(item)
  }

  return items
}

function validateBatchItems(items, operationType) {
  const requiredFields = {
    create_products: ['product_name', 'product_type'],
    update_products: ['id', 'product_name'],
    generate_qr_codes: ['product_id'],
    upload_images: ['product_id', 'image_url']
  }

  const required = requiredFields[operationType]
  if (!required) {
    return { isValid: false, error: 'Invalid operation type' }
  }

  // Check if all items have required fields
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    
    for (const field of required) {
      if (!item[field] || item[field].trim() === '') {
        return { 
          isValid: false, 
          error: `Missing required field '${field}' in row ${i + 2}` 
        }
      }
    }

    // Additional validation for create_products
    if (operationType === 'create_products') {
      if (item.product_name && item.product_name.length > 200) {
        return { 
          isValid: false, 
          error: `Product name too long in row ${i + 2} (max 200 characters)` 
        }
      }
      
      if (item.product_type && item.product_type.length > 100) {
        return { 
          isValid: false, 
          error: `Product type too long in row ${i + 2} (max 100 characters)` 
        }
      }
    }
  }

  return { isValid: true }
}