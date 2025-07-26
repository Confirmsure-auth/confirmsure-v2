import { NextResponse } from 'next/server'
import { getCurrentUser } from '../../../../lib/auth'
import { supabase } from '../../../../lib/supabase'

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

    // Check permissions - only admins can access analytics
    if (user.profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '30d'

    // Calculate date ranges
    const now = new Date()
    const currentPeriodStart = getDateFromTimeRange(timeRange)
    const previousPeriodStart = getPreviousPeriodStart(currentPeriodStart, timeRange)
    const previousPeriodEnd = currentPeriodStart

    // Get current period metrics
    const currentMetrics = await getMetricsForPeriod(currentPeriodStart, now)
    const previousMetrics = await getMetricsForPeriod(previousPeriodStart, previousPeriodEnd)

    // Calculate growth rates
    const productGrowth = calculateGrowthRate(
      currentMetrics.totalProducts, 
      previousMetrics.totalProducts
    )
    const scanGrowth = calculateGrowthRate(
      currentMetrics.totalScans, 
      previousMetrics.totalScans
    )
    const userGrowth = calculateGrowthRate(
      currentMetrics.activeUsers, 
      previousMetrics.activeUsers
    )

    // Get factory utilization
    const { data: factories } = await supabase
      .from('factories')
      .select('id, is_active')

    const activeFactories = factories?.filter(f => f.is_active).length || 0
    const totalFactories = factories?.length || 0
    const factoryUtilization = totalFactories > 0 ? (activeFactories / totalFactories) * 100 : 0

    // Get additional metrics
    const { data: publishedProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')

    const { data: pendingProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    const overview = {
      totalProducts: currentMetrics.totalProducts,
      totalScans: currentMetrics.totalScans,
      activeUsers: currentMetrics.activeUsers,
      activeFactories,
      totalFactories,
      publishedProducts: publishedProducts?.length || 0,
      pendingProducts: pendingProducts?.length || 0,
      factoryUtilization,
      
      // Growth rates
      productGrowth,
      scanGrowth,
      userGrowth,
      
      // Ratios
      publishedRatio: currentMetrics.totalProducts > 0 
        ? ((publishedProducts?.length || 0) / currentMetrics.totalProducts) * 100 
        : 0,
      
      // Time period info
      timeRange,
      currentPeriodStart: currentPeriodStart.toISOString(),
      currentPeriodEnd: now.toISOString(),
      lastUpdated: now.toISOString()
    }

    return NextResponse.json({
      success: true,
      data: overview
    })

  } catch (error) {
    console.error('Analytics overview error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics overview' },
      { status: 500 }
    )
  }
}

function getDateFromTimeRange(timeRange) {
  const now = new Date()
  
  switch (timeRange) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    case '1y':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }
}

function getPreviousPeriodStart(currentStart, timeRange) {
  const duration = new Date() - currentStart
  return new Date(currentStart.getTime() - duration)
}

async function getMetricsForPeriod(startDate, endDate) {
  // Get products count
  const { count: totalProducts } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  // Get QR scans count
  const { count: totalScans } = await supabase
    .from('qr_scans')
    .select('*', { count: 'exact', head: true })
    .gte('scanned_at', startDate.toISOString())
    .lte('scanned_at', endDate.toISOString())

  // Get active users (users who logged in during period)
  const { count: activeUsers } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .gte('last_login_at', startDate.toISOString())
    .lte('last_login_at', endDate.toISOString())

  return {
    totalProducts: totalProducts || 0,
    totalScans: totalScans || 0,
    activeUsers: activeUsers || 0
  }
}

function calculateGrowthRate(current, previous) {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }
  return ((current - previous) / previous) * 100
}