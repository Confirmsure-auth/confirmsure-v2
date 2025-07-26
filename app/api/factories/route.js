import { NextResponse } from 'next/server'
import { getCurrentUser, hasPermission, PERMISSIONS } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { factorySchema } from '../../lib/validation'

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

    // Check permissions - only admins can create factories
    if (!hasPermission(user, PERMISSIONS.FACTORIES.CREATE)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate input
    try {
      factorySchema.parse(body)
    } catch (validationError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationError.errors 
        },
        { status: 400 }
      )
    }

    // Check if factory name already exists
    const { data: existingFactory } = await supabase
      .from('factories')
      .select('name')
      .eq('name', body.name)
      .single()

    if (existingFactory) {
      return NextResponse.json(
        { error: 'Factory name already exists' },
        { status: 409 }
      )
    }

    // Insert factory
    const { data: factory, error } = await supabase
      .from('factories')
      .insert([{
        name: body.name,
        location: body.location,
        contact_email: body.contact_email,
        contact_phone: body.contact_phone,
        address: body.address,
        country: body.country,
        is_active: body.is_active !== undefined ? body.is_active : true,
        settings: {}
      }])
      .select()
      .single()

    if (error) {
      console.error('Factory creation error:', error)
      return NextResponse.json(
        { error: 'Failed to create factory' },
        { status: 500 }
      )
    }

    // Log factory creation
    await supabase
      .from('audit_logs')
      .insert([{
        event_type: 'factory',
        event_name: 'FACTORY_CREATED',
        user_id: user.id,
        resource_type: 'factory',
        resource_id: factory.id,
        metadata: {
          factory_name: factory.name,
          location: factory.location
        }
      }])

    return NextResponse.json(factory, { status: 201 })

  } catch (error) {
    console.error('Factory creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    // For factory listing, we'll allow public access for signup
    // but limit the data returned
    
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('include_inactive') === 'true'
    const publicOnly = searchParams.get('public') === 'true'

    // Build query
    let query = supabase
      .from('factories')
      .select('id, name, location, country, is_active, created_at')
      .order('name', { ascending: true })

    // Filter active factories for public access
    if (publicOnly || !includeInactive) {
      query = query.eq('is_active', true)
    }

    // For authenticated requests, get more details and check permissions
    if (!publicOnly) {
      const user = await getCurrentUser()
      
      if (user) {
        // Check permissions for detailed access
        if (hasPermission(user, PERMISSIONS.FACTORIES.READ)) {
          query = supabase
            .from('factories')
            .select(`
              *,
              products:products(count),
              users:user_profiles(count)
            `)
            .order('name', { ascending: true })

          if (!includeInactive) {
            query = query.eq('is_active', true)
          }
        } else if (user.profile.factory_id) {
          // Factory users can only see their own factory
          query = supabase
            .from('factories')
            .select('id, name, location, country, is_active, created_at')
            .eq('id', user.profile.factory_id)
        }
      }
    }

    const { data: factories, error } = await query

    if (error) {
      console.error('Factories query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch factories' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      factories: factories || [],
      total: factories?.length || 0
    })

  } catch (error) {
    console.error('Factories fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request) {
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
    if (!hasPermission(user, PERMISSIONS.FACTORIES.UPDATE)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Factory ID is required' },
        { status: 400 }
      )
    }

    // Validate input
    try {
      factorySchema.partial().parse(updateData)
    } catch (validationError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationError.errors 
        },
        { status: 400 }
      )
    }

    // Update factory
    const { data: factory, error } = await supabase
      .from('factories')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Factory update error:', error)
      return NextResponse.json(
        { error: 'Failed to update factory' },
        { status: 500 }
      )
    }

    if (!factory) {
      return NextResponse.json(
        { error: 'Factory not found' },
        { status: 404 }
      )
    }

    // Log factory update
    await supabase
      .from('audit_logs')
      .insert([{
        event_type: 'factory',
        event_name: 'FACTORY_UPDATED',
        user_id: user.id,
        resource_type: 'factory',
        resource_id: factory.id,
        metadata: {
          factory_name: factory.name,
          updated_fields: Object.keys(updateData)
        }
      }])

    return NextResponse.json(factory)

  } catch (error) {
    console.error('Factory update error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}