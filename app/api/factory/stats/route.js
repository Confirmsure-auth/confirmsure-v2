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

    // Check permissions
    if (!hasPermission(user, PERMISSIONS.PRODUCTS.READ)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const factoryId = user.profile.factory_id
    
    // For admin users, get stats for all factories or specific factory
    const { searchParams } = new URL(request.url)
    const requestedFactoryId = searchParams.get('factory_id')
    
    let targetFactoryId = factoryId
    if (user.profile.role === 'admin' && requestedFactoryId) {
      targetFactoryId = requestedFactoryId
    }

    // Calculate date ranges
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Build base query
    let query = supabase.from('products').select('*', { count: 'exact', head: true })
    
    if (targetFactoryId && user.profile.role !== 'admin') {
      query = query.eq('factory_id', targetFactoryId)
    } else if (targetFactoryId) {
      query = query.eq('factory_id', targetFactoryId)
    }

    // Get total products
    const { count: totalProducts } = await query

    // Get published products
    let publishedQuery = supabase.from('products').select('*', { count: 'exact', head: true })
      .eq('status', 'published')
    
    if (targetFactoryId && user.profile.role !== 'admin') {
      publishedQuery = publishedQuery.eq('factory_id', targetFactoryId)
    } else if (targetFactoryId) {
      publishedQuery = publishedQuery.eq('factory_id', targetFactoryId)
    }

    const { count: publishedProducts } = await publishedQuery

    // Get today's products
    let todayQuery = supabase.from('products').select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())
    
    if (targetFactoryId && user.profile.role !== 'admin') {
      todayQuery = todayQuery.eq('factory_id', targetFactoryId)
    } else if (targetFactoryId) {
      todayQuery = todayQuery.eq('factory_id', targetFactoryId)
    }

    const { count: todayProducts } = await todayQuery

    // Get week's products
    let weekQuery = supabase.from('products').select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString())
    
    if (targetFactoryId && user.profile.role !== 'admin') {
      weekQuery = weekQuery.eq('factory_id', targetFactoryId)
    } else if (targetFactoryId) {
      weekQuery = weekQuery.eq('factory_id', targetFactoryId)
    }

    const { count: weekProducts } = await weekQuery

    // Get month's products
    let monthQuery = supabase.from('products').select('*', { count: 'exact', head: true })
      .gte('created_at', monthAgo.toISOString())
    
    if (targetFactoryId && user.profile.role !== 'admin') {
      monthQuery = monthQuery.eq('factory_id', targetFactoryId)
    } else if (targetFactoryId) {
      monthQuery = monthQuery.eq('factory_id', targetFactoryId)
    }

    const { count: monthProducts } = await monthQuery

    // Get QR scan statistics
    let scanQuery = supabase
      .from('qr_scans')
      .select(`
        *,
        product:products!qr_scans_product_id_fkey(factory_id)
      `, { count: 'exact', head: true })

    if (targetFactoryId && user.profile.role !== 'admin') {
      scanQuery = scanQuery.eq('product.factory_id', targetFactoryId)
    } else if (targetFactoryId) {
      scanQuery = scanQuery.eq('product.factory_id', targetFactoryId)
    }

    const { count: totalScans } = await scanQuery || { count: 0 }

    // Get recent activity for chart data
    const recentActivityQuery = supabase
      .from('products')
      .select('created_at, status')
      .gte('created_at', monthAgo.toISOString())
      .order('created_at', { ascending: true })

    if (targetFactoryId && user.profile.role !== 'admin') {
      recentActivityQuery.eq('factory_id', targetFactoryId)
    } else if (targetFactoryId) {
      recentActivityQuery.eq('factory_id', targetFactoryId)
    }

    const { data: recentActivity = [] } = await recentActivityQuery

    // Group by date for chart
    const dailyActivity = {}
    recentActivity.forEach(product => {
      const date = product.created_at.split('T')[0]
      if (!dailyActivity[date]) {
        dailyActivity[date] = { total: 0, published: 0 }
      }
      dailyActivity[date].total++
      if (product.status === 'published') {
        dailyActivity[date].published++
      }
    })

    // Convert to array format for charts
    const chartData = Object.entries(dailyActivity).map(([date, counts]) => ({
      date,
      total: counts.total,
      published: counts.published
    }))

    // Calculate trends
    const yesterdayStart = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    let yesterdayQuery = supabase.from('products').select('*', { count: 'exact', head: true })
      .gte('created_at', yesterdayStart.toISOString())
      .lt('created_at', today.toISOString())

    if (targetFactoryId && user.profile.role !== 'admin') {
      yesterdayQuery = yesterdayQuery.eq('factory_id', targetFactoryId)
    } else if (targetFactoryId) {
      yesterdayQuery = yesterdayQuery.eq('factory_id', targetFactoryId)
    }

    const { count: yesterdayProducts } = await yesterdayQuery

    const todayTrend = todayProducts - (yesterdayProducts || 0)
    const weekTrend = weekProducts - (monthProducts - weekProducts || 0)

    return NextResponse.json({
      totalProducts: totalProducts || 0,
      publishedProducts: publishedProducts || 0,
      todayProducts: todayProducts || 0,
      weekProducts: weekProducts || 0,
      monthProducts: monthProducts || 0,
      totalScans: totalScans || 0,
      trends: {
        today: todayTrend,
        week: weekTrend
      },
      chartData,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Factory stats error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch factory statistics' },
      { status: 500 }
    )
  }
}