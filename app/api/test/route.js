import { supabase } from '../../lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('count')
      .limit(1)

    if (error) {
      console.error('Supabase connection test failed:', error)
      return NextResponse.json({
        success: false,
        message: 'Database connection failed',
        error: error.message,
        details: error.details || 'No additional details available'
      }, { status: 500 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful',
      database: {
        connected: true,
        queryResult: data || 'No data returned (table may not exist yet)'
      },
      auth: {
        initialized: !authError,
        user: user ? 'User authenticated' : 'No authenticated user'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Connection test error:', error)
    return NextResponse.json({
      success: false,
      message: 'Connection test failed',
      error: error.message || 'Unknown error occurred'
    }, { status: 500 })
  }
}