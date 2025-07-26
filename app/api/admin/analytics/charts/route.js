import { NextResponse } from 'next/server'
import { getCurrentUser } from '../../../../lib/auth'
import { supabase } from '../../../../lib/supabase'
import { format, eachDayOfInterval, startOfDay } from 'date-fns'

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

    // Calculate date range
    const endDate = new Date()
    const startDate = getDateFromTimeRange(timeRange)

    // Generate date array for chart
    const dateArray = eachDayOfInterval({ start: startDate, end: endDate })

    // Get product creation data
    const { data: products } = await supabase
      .from('products')
      .select('created_at, status')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true })

    // Get QR scan data
    const { data: scans } = await supabase
      .from('qr_scans')
      .select('scanned_at')
      .gte('scanned_at', startDate.toISOString())
      .lte('scanned_at', endDate.toISOString())
      .order('scanned_at', { ascending: true })

    // Process data into daily aggregates
    const chartData = dateArray.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd')
      
      // Count products created on this date
      const dailyProducts = products?.filter(p => 
        format(new Date(p.created_at), 'yyyy-MM-dd') === dateStr
      ) || []
      
      const dailyPublished = dailyProducts.filter(p => p.status === 'published')
      
      // Count scans on this date
      const dailyScans = scans?.filter(s => 
        format(new Date(s.scanned_at), 'yyyy-MM-dd') === dateStr
      ) || []

      return {
        date: dateStr,
        products: dailyProducts.length,
        published: dailyPublished.length,
        scans: dailyScans.length,
        // Calculate cumulative totals
        cumulativeProducts: products?.filter(p => 
          new Date(p.created_at) <= date
        ).length || 0,
        cumulativeScans: scans?.filter(s => 
          new Date(s.scanned_at) <= date
        ).length || 0
      }
    })

    // Calculate additional metrics
    const totalProducts = products?.length || 0
    const totalPublished = products?.filter(p => p.status === 'published').length || 0
    const totalScans = scans?.length || 0

    // Calculate trends
    const midPoint = Math.floor(chartData.length / 2)
    const firstHalf = chartData.slice(0, midPoint)
    const secondHalf = chartData.slice(midPoint)

    const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.products, 0) / firstHalf.length
    const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.products, 0) / secondHalf.length
    const productTrend = secondHalfAvg > firstHalfAvg ? 'increasing' : 'decreasing'

    const firstHalfScanAvg = firstHalf.reduce((sum, day) => sum + day.scans, 0) / firstHalf.length
    const secondHalfScanAvg = secondHalf.reduce((sum, day) => sum + day.scans, 0) / secondHalf.length
    const scanTrend = secondHalfScanAvg > firstHalfScanAvg ? 'increasing' : 'decreasing'

    // Get peak days
    const peakProductionDay = chartData.reduce((max, day) => 
      day.products > max.products ? day : max, chartData[0]
    )
    
    const peakScanDay = chartData.reduce((max, day) => 
      day.scans > max.scans ? day : max, chartData[0]
    )

    return NextResponse.json({
      success: true,
      data: chartData,
      metadata: {
        timeRange,
        totalDataPoints: chartData.length,
        totalProducts,
        totalPublished,
        totalScans,
        publishedRatio: totalProducts > 0 ? (totalPublished / totalProducts) * 100 : 0,
        trends: {
          products: productTrend,
          scans: scanTrend,
          productGrowthRate: firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0,
          scanGrowthRate: firstHalfScanAvg > 0 ? ((secondHalfScanAvg - firstHalfScanAvg) / firstHalfScanAvg) * 100 : 0
        },
        peaks: {
          production: peakProductionDay,
          scans: peakScanDay
        },
        averages: {
          dailyProducts: totalProducts / chartData.length,
          dailyScans: totalScans / chartData.length
        }
      }
    })

  } catch (error) {
    console.error('Analytics charts error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch chart data' },
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