import { NextResponse } from 'next/server'
import { getCurrentUser, hasPermission, PERMISSIONS } from '../../../lib/auth'
import { createClient } from '../../../lib/supabase'
import { authenticationMarkerSchema } from '../../../lib/validation'

const supabase = createClient()

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

    // Validate input
    try {
      authenticationMarkerSchema.parse(body)
    } catch (validationError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationError.errors 
        },
        { status: 400 }
      )
    }

    // Check if product exists and user has access
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, factory_id')
      .eq('id', body.product_id)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Check factory access for non-admin users
    if (user.profile.role !== 'admin' && user.profile.factory_id !== product.factory_id) {
      return NextResponse.json(
        { error: 'Access denied to this product' },
        { status: 403 }
      )
    }

    // Insert authentication marker
    const { data: marker, error } = await supabase
      .from('authentication_markers')
      .insert([{
        product_id: body.product_id,
        type: body.type,
        position: body.position,
        color: body.color,
        pattern: body.pattern,
        size_mm: body.size_mm,
        coordinates: body.coordinates,
        description: body.description,
        verification_instructions: body.verification_instructions
      }])
      .select()
      .single()

    if (error) {
      console.error('Marker creation error:', error)
      return NextResponse.json(
        { error: 'Failed to create authentication marker' },
        { status: 500 }
      )
    }

    // Log marker creation
    await supabase
      .from('audit_logs')
      .insert([{
        event_type: 'product',
        event_name: 'MARKER_CREATED',
        user_id: user.id,
        resource_type: 'authentication_marker',
        resource_id: marker.id,
        metadata: {
          product_id: body.product_id,
          marker_type: body.type,
          position: body.position
        }
      }])

    return NextResponse.json(marker, { status: 201 })

  } catch (error) {
    console.error('Marker creation error:', error)
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

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Check if product exists and user has access
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, factory_id')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Check factory access for non-admin users
    if (user.profile.role !== 'admin' && user.profile.factory_id !== product.factory_id) {
      return NextResponse.json(
        { error: 'Access denied to this product' },
        { status: 403 }
      )
    }

    // Get authentication markers
    const { data: markers, error } = await supabase
      .from('authentication_markers')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Markers fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch authentication markers' },
        { status: 500 }
      )
    }

    return NextResponse.json({ markers })

  } catch (error) {
    console.error('Markers fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}