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

    // Calculate date range
    const endDate = new Date()
    const startDate = getDateFromTimeRange(timeRange)

    // Get factories with their performance data
    const { data: factories } = await supabase
      .from('factories')
      .select(`
        id,
        name,
        location,
        is_active,
        created_at,
        products:products(
          id,
          status,
          created_at,
          qr_scans:qr_scans(id, scanned_at)
        )
      `)
      .order('name')

    if (!factories) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    // Process factory performance data
    const factoryPerformance = await Promise.all(
      factories.map(async (factory) => {
        // Filter products by time range
        const timeRangeProducts = factory.products?.filter(p => 
          new Date(p.created_at) >= startDate && new Date(p.created_at) <= endDate
        ) || []

        // Calculate metrics for this factory
        const totalProducts = timeRangeProducts.length
        const publishedProducts = timeRangeProducts.filter(p => p.status === 'published').length
        const pendingProducts = timeRangeProducts.filter(p => p.status === 'pending').length
        const draftProducts = timeRangeProducts.filter(p => p.status === 'draft').length

        // Get QR scan data for this factory's products
        const productIds = timeRangeProducts.map(p => p.id)
        let totalScans = 0
        let uniqueUsers = 0

        if (productIds.length > 0) {
          const { data: scans } = await supabase
            .from('qr_scans')
            .select('id, ip_address')
            .in('product_id', productIds)
            .gte('scanned_at', startDate.toISOString())
            .lte('scanned_at', endDate.toISOString())

          totalScans = scans?.length || 0
          uniqueUsers = new Set(scans?.map(s => s.ip_address) || []).size
        }

        // Calculate success rate (published / total)
        const successRate = totalProducts > 0 ? (publishedProducts / totalProducts) * 100 : 100

        // Calculate average processing time (simulated)
        const avgProcessingTime = Math.random() * 5 + 1 // 1-6 minutes

        // Calculate performance trend (current vs previous period)
        const previousPeriodStart = getPreviousPeriodStart(startDate, timeRange)
        const previousProducts = factory.products?.filter(p => 
          new Date(p.created_at) >= previousPeriodStart && new Date(p.created_at) < startDate
        )?.length || 0

        const performance = previousProducts > 0 
          ? ((totalProducts - previousProducts) / previousProducts) * 100
          : totalProducts > 0 ? 100 : 0

        // Calculate efficiency metrics
        const scansPerProduct = totalProducts > 0 ? totalScans / totalProducts : 0
        const publishedRatio = totalProducts > 0 ? (publishedProducts / totalProducts) * 100 : 0

        return {
          id: factory.id,
          name: factory.name,
          location: factory.location,
          isActive: factory.is_active,
          
          // Core metrics
          products: totalProducts,
          published: publishedProducts,
          pending: pendingProducts,
          draft: draftProducts,
          scans: totalScans,
          uniqueUsers,
          
          // Performance metrics
          successRate: Math.round(successRate * 10) / 10,
          avgProcessingTime: Math.round(avgProcessingTime * 10) / 10,
          performance: Math.round(performance * 10) / 10,
          scansPerProduct: Math.round(scansPerProduct * 10) / 10,
          publishedRatio: Math.round(publishedRatio * 10) / 10,
          
          // Additional data
          previousPeriodProducts: previousProducts,
          createdAt: factory.created_at
        }
      })
    )

    // Sort by performance descending
    factoryPerformance.sort((a, b) => b.performance - a.performance)

    // Calculate aggregate statistics
    const totalFactoryProducts = factoryPerformance.reduce((sum, f) => sum + f.products, 0)
    const totalFactoryScans = factoryPerformance.reduce((sum, f) => sum + f.scans, 0)
    const averageSuccessRate = factoryPerformance.length > 0
      ? factoryPerformance.reduce((sum, f) => sum + f.successRate, 0) / factoryPerformance.length
      : 0

    // Find top performers
    const topPerformer = factoryPerformance[0]
    const mostProductiveFactory = factoryPerformance.reduce((max, f) => 
      f.products > max.products ? f : max, factoryPerformance[0]
    )
    const mostScannedFactory = factoryPerformance.reduce((max, f) => 
      f.scans > max.scans ? f : max, factoryPerformance[0]
    )

    return NextResponse.json({
      success: true,
      data: factoryPerformance,
      summary: {
        totalFactories: factoryPerformance.length,
        activeFactories: factoryPerformance.filter(f => f.isActive).length,
        totalProducts: totalFactoryProducts,
        totalScans: totalFactoryScans,
        averageSuccessRate: Math.round(averageSuccessRate * 10) / 10,
        topPerformer: topPerformer?.name,
        mostProductiveFactory: mostProductiveFactory?.name,
        mostScannedFactory: mostScannedFactory?.name
      },
      timeRange,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Factory analytics error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch factory analytics' },
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