import { NextResponse } from 'next/server'
import { getCurrentUser, hasPermission, PERMISSIONS } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { productSchema, productSearchSchema } from '../../lib/validation'
import { generateUniqueQRCode } from '../../lib/qr-generator'

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

    const body = await request.json()

    // Add factory_id and created_by from user context
    const productData = {
      ...body,
      factory_id: user.profile.factory_id || body.factory_id,
      created_by: user.id
    }

    // Validate input
    try {
      productSchema.parse(productData)
    } catch (validationError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationError.errors 
        },
        { status: 400 }
      )
    }

    // Generate QR code if not provided
    if (!productData.qr_code) {
      productData.qr_code = await generateUniqueQRCode()
    }

    // Check if QR code is unique
    const { data: existingProduct } = await supabase
      .from('products')
      .select('qr_code')
      .eq('qr_code', productData.qr_code)
      .single()

    if (existingProduct) {
      return NextResponse.json(
        { error: 'QR code already exists' },
        { status: 409 }
      )
    }

    // Insert product
    const { data: product, error } = await supabase
      .from('products')
      .insert([{
        qr_code: productData.qr_code,
        product_name: productData.product_name,
        product_type: productData.product_type,
        description: productData.description,
        batch_id: productData.batch_id,
        serial_number: productData.serial_number,
        manufacturing_date: productData.manufacturing_date,
        expiry_date: productData.expiry_date,
        factory_id: productData.factory_id,
        created_by: productData.created_by,
        status: 'draft',
        metadata: productData.metadata || {}
      }])
      .select(`
        *,
        factory:factories(*),
        created_by_user:user_profiles!products_created_by_fkey(full_name)
      `)
      .single()

    if (error) {
      console.error('Product creation error:', error)
      return NextResponse.json(
        { error: 'Failed to create product' },
        { status: 500 }
      )
    }

    // Log product creation
    await supabase
      .from('audit_logs')
      .insert([{
        event_type: 'product',
        event_name: 'PRODUCT_CREATED',
        user_id: user.id,
        resource_type: 'product',
        resource_id: product.id,
        metadata: {
          product_name: product.product_name,
          qr_code: product.qr_code,
          factory_id: product.factory_id
        }
      }])

    return NextResponse.json(product, { status: 201 })

  } catch (error) {
    console.error('Product creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
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

    // Check permissions
    if (!hasPermission(user, PERMISSIONS.PRODUCTS.READ)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // Parse and validate search parameters
    const searchQuery = {
      query: searchParams.get('query') || undefined,
      factory_id: searchParams.get('factory_id') || undefined,
      status: searchParams.get('status') || undefined,
      product_type: searchParams.get('product_type') || undefined,
      batch_id: searchParams.get('batch_id') || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      limit: parseInt(searchParams.get('limit')) || 20,
      offset: parseInt(searchParams.get('offset')) || 0
    }

    try {
      productSearchSchema.parse(searchQuery)
    } catch (validationError) {
      return NextResponse.json(
        { 
          error: 'Invalid search parameters',
          details: validationError.errors 
        },
        { status: 400 }
      )
    }

    // Build query
    let query = supabase
      .from('products')
      .select(`
        *,
        factory:factories(id, name, location),
        created_by_user:user_profiles!products_created_by_fkey(full_name),
        product_images(id, image_url, thumbnail_url, is_primary),
        authentication_markers(id, type, position)
      `, { count: 'exact' })

    // Apply factory filter for non-admin users
    if (user.profile.role !== 'admin') {
      query = query.eq('factory_id', user.profile.factory_id)
    } else if (searchQuery.factory_id) {
      query = query.eq('factory_id', searchQuery.factory_id)
    }

    // Apply filters
    if (searchQuery.query) {
      query = query.or(`product_name.ilike.%${searchQuery.query}%,qr_code.ilike.%${searchQuery.query}%`)
    }

    if (searchQuery.status) {
      query = query.eq('status', searchQuery.status)
    }

    if (searchQuery.product_type) {
      query = query.eq('product_type', searchQuery.product_type)
    }

    if (searchQuery.batch_id) {
      query = query.eq('batch_id', searchQuery.batch_id)
    }

    if (searchQuery.date_from) {
      query = query.gte('created_at', searchQuery.date_from)
    }

    if (searchQuery.date_to) {
      query = query.lte('created_at', searchQuery.date_to + 'T23:59:59.999Z')
    }

    // Apply pagination and sorting
    query = query
      .order('created_at', { ascending: false })
      .range(searchQuery.offset, searchQuery.offset + searchQuery.limit - 1)

    const { data: products, error, count } = await query

    if (error) {
      console.error('Products query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      )
    }

    // Calculate pagination info
    const totalPages = Math.ceil(count / searchQuery.limit)
    const currentPage = Math.floor(searchQuery.offset / searchQuery.limit) + 1

    return NextResponse.json({
      products,
      pagination: {
        total: count,
        limit: searchQuery.limit,
        offset: searchQuery.offset,
        currentPage,
        totalPages,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1
      },
      filters: searchQuery
    })

  } catch (error) {
    console.error('Products fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}