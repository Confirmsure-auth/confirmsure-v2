import { NextResponse } from 'next/server'
import { getCurrentUser, hasPermission, PERMISSIONS } from '../../../lib/auth'
import { supabase } from '../../../lib/supabase'

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

    // Check permissions - only admins can manage users
    if (user.profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('include_inactive') === 'true'
    const role = searchParams.get('role')
    const factoryId = searchParams.get('factory_id')
    const limit = parseInt(searchParams.get('limit')) || 50
    const offset = parseInt(searchParams.get('offset')) || 0

    // Build query
    let query = supabase
      .from('user_profiles')
      .select(`
        *,
        factory:factories(id, name, location)
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    if (role) {
      query = query.eq('role', role)
    }

    if (factoryId) {
      query = query.eq('factory_id', factoryId)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: users, error, count } = await query

    if (error) {
      console.error('Users query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })

    if (!includeInactive) {
      countQuery = countQuery.eq('is_active', true)
    }

    const { count: totalCount } = await countQuery

    return NextResponse.json({
      users: users || [],
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (totalCount || 0)
      }
    })

  } catch (error) {
    console.error('Admin users error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    )
  }
}