import { NextResponse } from 'next/server'
import { getCurrentUser } from '../../../lib/auth'
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

    // Check permissions - only admins can access system alerts
    if (user.profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const alerts = []
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Check for failed authentication attempts
    const { data: failedLogins, error: loginError } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('event_type', 'auth')
      .eq('event_name', 'SIGN_IN_FAILED')
      .gte('created_at', oneDayAgo.toISOString())

    if (failedLogins && failedLogins.length > 10) {
      alerts.push({
        type: 'security',
        severity: 'warning',
        message: `${failedLogins.length} failed login attempts in the last 24 hours`,
        timestamp: now.toISOString(),
        action: 'review_security_logs'
      })
    }

    // Check for inactive factories
    const { data: factories } = await supabase
      .from('factories')
      .select(`
        *,
        products:products(created_at)
      `)
      .eq('is_active', true)

    const inactiveFactories = factories?.filter(factory => {
      if (!factory.products || factory.products.length === 0) {
        return true
      }
      
      const lastProduct = factory.products
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
      
      return new Date(lastProduct.created_at) < oneWeekAgo
    }) || []

    if (inactiveFactories.length > 0) {
      alerts.push({
        type: 'operational',
        severity: 'info',
        message: `${inactiveFactories.length} factories have not created products in the last week`,
        timestamp: now.toISOString(),
        action: 'check_factory_status',
        details: inactiveFactories.map(f => f.name)
      })
    }

    // Check for users pending activation
    const { data: pendingUsers } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('is_active', false)
      .gte('created_at', oneWeekAgo.toISOString())

    if (pendingUsers && pendingUsers.length > 0) {
      alerts.push({
        type: 'admin',
        severity: 'medium',
        message: `${pendingUsers.length} user accounts are pending activation`,
        timestamp: now.toISOString(),
        action: 'review_pending_users'
      })
    }

    // Check for system errors
    const { data: systemErrors } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('event_type', 'system')
      .eq('event_name', 'SYSTEM_ERROR')
      .gte('created_at', oneDayAgo.toISOString())

    if (systemErrors && systemErrors.length > 0) {
      alerts.push({
        type: 'system',
        severity: 'high',
        message: `${systemErrors.length} system errors reported in the last 24 hours`,
        timestamp: now.toISOString(),
        action: 'check_system_logs'
      })
    }

    // Check for low storage space (simulated)
    const storageUsagePercent = 75 // This would come from actual storage monitoring
    if (storageUsagePercent > 80) {
      alerts.push({
        type: 'system',
        severity: storageUsagePercent > 90 ? 'high' : 'medium',
        message: `Storage usage is at ${storageUsagePercent}%`,
        timestamp: now.toISOString(),
        action: 'manage_storage'
      })
    }

    // Check for API rate limit hits
    const { data: rateLimitHits } = await supabase
      .from('audit_logs')
      .select('*')
      .ilike('metadata', '%rate_limit%')
      .gte('created_at', oneDayAgo.toISOString())

    if (rateLimitHits && rateLimitHits.length > 50) {
      alerts.push({
        type: 'performance',
        severity: 'warning',
        message: `High rate limit activity detected (${rateLimitHits.length} hits)`,
        timestamp: now.toISOString(),
        action: 'review_api_usage'
      })
    }

    // Check for database performance (simulated metrics)
    const avgResponseTime = 150 // This would come from actual monitoring
    if (avgResponseTime > 200) {
      alerts.push({
        type: 'performance',
        severity: avgResponseTime > 500 ? 'high' : 'medium',
        message: `Database response time is ${avgResponseTime}ms (target: <100ms)`,
        timestamp: now.toISOString(),
        action: 'optimize_database'
      })
    }

    // Check for backup status (simulated)
    const lastBackup = new Date(now.getTime() - 25 * 60 * 60 * 1000) // 25 hours ago
    if (now - lastBackup > 24 * 60 * 60 * 1000) {
      alerts.push({
        type: 'backup',
        severity: 'high',
        message: 'Daily backup is overdue',
        timestamp: now.toISOString(),
        action: 'check_backup_system'
      })
    }

    // Sort alerts by severity and timestamp
    const severityOrder = { high: 3, medium: 2, warning: 1, info: 0 }
    alerts.sort((a, b) => {
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity]
      if (severityDiff !== 0) return severityDiff
      return new Date(b.timestamp) - new Date(a.timestamp)
    })

    // Group alerts by type for summary
    const alertSummary = alerts.reduce((acc, alert) => {
      if (!acc[alert.type]) {
        acc[alert.type] = { count: 0, highestSeverity: 'info' }
      }
      acc[alert.type].count++
      
      if (severityOrder[alert.severity] > severityOrder[acc[alert.type].highestSeverity]) {
        acc[alert.type].highestSeverity = alert.severity
      }
      
      return acc
    }, {})

    return NextResponse.json({
      alerts,
      summary: alertSummary,
      total: alerts.length,
      bySeiverty: {
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
        info: alerts.filter(a => a.severity === 'info').length
      },
      lastUpdated: now.toISOString()
    })

  } catch (error) {
    console.error('Admin alerts error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch system alerts' },
      { status: 500 }
    )
  }
}

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

    // Check permissions - only admins can dismiss alerts
    if (user.profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { alertId, action } = body

    // Log alert action
    await supabase
      .from('audit_logs')
      .insert([{
        event_type: 'system',
        event_name: 'ALERT_ACTION',
        user_id: user.id,
        metadata: {
          alert_id: alertId,
          action,
          timestamp: new Date().toISOString()
        }
      }])

    return NextResponse.json({
      success: true,
      message: 'Alert action recorded',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Alert action error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process alert action' },
      { status: 500 }
    )
  }
}