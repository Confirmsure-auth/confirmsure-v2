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

    // Check permissions - only admins can access system-wide activity
    if (user.profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit')) || 50
    const timeframe = searchParams.get('timeframe') || '24h'

    // Calculate time filter
    const now = new Date()
    let timeFilter = new Date()
    
    switch (timeframe) {
      case '1h':
        timeFilter.setHours(now.getHours() - 1)
        break
      case '24h':
        timeFilter.setDate(now.getDate() - 1)
        break
      case '7d':
        timeFilter.setDate(now.getDate() - 7)
        break
      case '30d':
        timeFilter.setDate(now.getDate() - 30)
        break
      default:
        timeFilter.setDate(now.getDate() - 1)
    }

    // Get audit logs with user information
    const { data: activities, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        user:user_profiles!audit_logs_user_id_fkey(full_name, email, role)
      `)
      .gte('created_at', timeFilter.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Activity query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch activity data' },
        { status: 500 }
      )
    }

    // Format activities for display
    const formattedActivities = activities?.map(activity => {
      const user = activity.user
      const userName = user?.full_name || user?.email || 'System'
      const userRole = user?.role || 'system'
      
      let description = formatActivityDescription(activity)
      let timestamp = formatTimestamp(activity.created_at)
      let priority = getActivityPriority(activity)
      let icon = getActivityIcon(activity)

      return {
        id: activity.id,
        description,
        timestamp,
        user: userName,
        userRole,
        eventType: activity.event_type,
        eventName: activity.event_name,
        priority,
        icon,
        metadata: activity.metadata,
        ipAddress: activity.ip_address ? maskIP(activity.ip_address) : null
      }
    }) || []

    // Group activities by type for summary
    const activitySummary = activities?.reduce((acc, activity) => {
      const type = activity.event_type
      if (!acc[type]) {
        acc[type] = { count: 0, latest: activity.created_at }
      }
      acc[type].count++
      if (new Date(activity.created_at) > new Date(acc[type].latest)) {
        acc[type].latest = activity.created_at
      }
      return acc
    }, {}) || {}

    return NextResponse.json({
      activities: formattedActivities,
      summary: activitySummary,
      timeframe,
      total: activities?.length || 0,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Admin activity error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch activity data' },
      { status: 500 }
    )
  }
}

function formatActivityDescription(activity) {
  const { event_type, event_name, metadata } = activity
  
  switch (event_type) {
    case 'auth':
      switch (event_name) {
        case 'SIGN_IN_SUCCESS':
          return `User signed in successfully`
        case 'SIGN_IN_FAILED':
          return `Failed sign-in attempt`
        case 'SIGN_OUT_SUCCESS':
          return `User signed out`
        case 'USER_CREATED':
          return `New user account created`
        case 'USER_DEACTIVATED':
          return `User account deactivated`
        case 'ROLE_UPDATED':
          return `User role updated to ${metadata?.new_role || 'unknown'}`
        default:
          return `Authentication event: ${event_name}`
      }
    
    case 'product':
      switch (event_name) {
        case 'PRODUCT_CREATED':
          return `Created product "${metadata?.product_name || 'Unknown'}"`
        case 'PRODUCT_UPDATED':
          return `Updated product "${metadata?.product_name || 'Unknown'}"`
        case 'PRODUCT_DELETED':
          return `Deleted product "${metadata?.product_name || 'Unknown'}"`
        case 'QR_CODE_GENERATED':
          return `Generated QR code ${metadata?.qr_code || ''}`
        case 'IMAGES_UPLOADED':
          return `Uploaded ${metadata?.file_count || 1} product images`
        case 'IMAGE_DELETED':
          return `Deleted product image`
        case 'MARKER_CREATED':
          return `Added authentication marker`
        default:
          return `Product event: ${event_name}`
      }
    
    case 'factory':
      switch (event_name) {
        case 'FACTORY_CREATED':
          return `Created factory "${metadata?.factory_name || 'Unknown'}"`
        case 'FACTORY_UPDATED':
          return `Updated factory "${metadata?.factory_name || 'Unknown'}"`
        case 'FACTORY_DEACTIVATED':
          return `Deactivated factory "${metadata?.factory_name || 'Unknown'}"`
        default:
          return `Factory event: ${event_name}`
      }
    
    case 'user':
      switch (event_name) {
        case 'USER_PERMISSION_CHANGED':
          return `Changed user permissions`
        case 'USER_PROFILE_UPDATED':
          return `Updated user profile`
        default:
          return `User management event: ${event_name}`
      }
    
    case 'system':
      switch (event_name) {
        case 'SYSTEM_BACKUP':
          return `System backup completed`
        case 'SYSTEM_UPDATE':
          return `System configuration updated`
        case 'SYSTEM_ERROR':
          return `System error occurred`
        default:
          return `System event: ${event_name}`
      }
    
    default:
      return `${event_type}: ${event_name}`
  }
}

function formatTimestamp(timestamp) {
  const now = new Date()
  const time = new Date(timestamp)
  const diff = now - time
  
  if (diff < 60000) { // Less than 1 minute
    return 'Just now'
  } else if (diff < 3600000) { // Less than 1 hour
    const minutes = Math.floor(diff / 60000)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else if (diff < 86400000) { // Less than 1 day
    const hours = Math.floor(diff / 3600000)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else if (diff < 604800000) { // Less than 1 week
    const days = Math.floor(diff / 86400000)
    return `${days} day${days > 1 ? 's' : ''} ago`
  } else {
    return time.toLocaleDateString()
  }
}

function getActivityPriority(activity) {
  const { event_type, event_name } = activity
  
  // High priority events
  if (event_name.includes('FAILED') || 
      event_name.includes('ERROR') || 
      event_name.includes('DELETED') ||
      event_name.includes('DEACTIVATED')) {
    return 'high'
  }
  
  // Medium priority events
  if (event_type === 'auth' || 
      event_name.includes('CREATED') ||
      event_name.includes('UPDATED')) {
    return 'medium'
  }
  
  // Low priority events
  return 'low'
}

function getActivityIcon(activity) {
  const { event_type, event_name } = activity
  
  if (event_name.includes('FAILED') || event_name.includes('ERROR')) {
    return 'alert-circle'
  }
  
  switch (event_type) {
    case 'auth':
      return 'shield'
    case 'product':
      return 'package'
    case 'factory':
      return 'building'
    case 'user':
      return 'users'
    case 'system':
      return 'settings'
    default:
      return 'activity'
  }
}

function maskIP(ipAddress) {
  // Mask last octet for privacy
  if (typeof ipAddress === 'string') {
    const parts = ipAddress.split('.')
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`
    }
  }
  return 'masked'
}