'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Building2, 
  Users, 
  Package, 
  TrendingUp, 
  Activity,
  AlertCircle,
  Plus,
  Settings,
  BarChart3,
  Globe,
  Shield,
  CheckCircle,
  Clock,
  Eye
} from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalFactories: 0,
    activeFactories: 0,
    totalUsers: 0,
    totalProducts: 0,
    totalScans: 0,
    loading: true
  })
  
  const [recentActivity, setRecentActivity] = useState([])
  const [factories, setFactories] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load admin stats
      const [statsRes, factoriesRes, activityRes, alertsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/factories'),
        fetch('/api/admin/activity'),
        fetch('/api/admin/alerts')
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats({ ...statsData, loading: false })
      }

      if (factoriesRes.ok) {
        const factoriesData = await factoriesRes.json()
        setFactories(factoriesData.factories || [])
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json()
        setRecentActivity(activityData.activities || [])
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json()
        setAlerts(alertsData.alerts || [])
      }

    } catch (error) {
      console.error('Dashboard data loading error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 h-96 bg-gray-200 rounded-lg"></div>
              <div className="h-96 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">System Administration</h1>
              <p className="text-gray-600 mt-1">
                Central management dashboard for all ConfirmSure operations
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                href="/admin/settings"
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Link>
              <Link
                href="/admin/factories/new"
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Factory
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* System Alerts */}
        {alerts.length > 0 && (
          <div className="mb-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                <h3 className="font-medium text-yellow-800">System Alerts</h3>
              </div>
              <div className="space-y-2">
                {alerts.map((alert, index) => (
                  <div key={index} className="text-sm text-yellow-700">
                    • {alert.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Factories</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stats.loading ? '...' : stats.totalFactories}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Building2 className="w-6 h-6 text-confirmsure-blue" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600 font-medium">{stats.activeFactories}</span>
              <span className="text-gray-600 ml-1">active</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stats.loading ? '...' : stats.totalUsers.toLocaleString()}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-confirmsure-green" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <Activity className="w-4 h-4 text-blue-500 mr-1" />
              <span className="text-blue-600 font-medium">85%</span>
              <span className="text-gray-600 ml-1">active this week</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stats.loading ? '...' : stats.totalProducts.toLocaleString()}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Package className="w-6 h-6 text-purple-500" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600 font-medium">+12%</span>
              <span className="text-gray-600 ml-1">this month</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">QR Scans</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stats.loading ? '...' : stats.totalScans.toLocaleString()}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <Eye className="w-6 h-6 text-orange-500" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <Globe className="w-4 h-4 text-purple-500 mr-1" />
              <span className="text-purple-600 font-medium">Global</span>
              <span className="text-gray-600 ml-1">reach</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Health</p>
                <p className="text-3xl font-bold text-confirmsure-green mt-1">99.9%</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Shield className="w-6 h-6 text-confirmsure-green" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600 font-medium">Operational</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link
            href="/admin/factories"
            className="bg-confirmsure-blue hover:bg-blue-600 text-white rounded-xl shadow-sm p-6 transition-all duration-200 hover:shadow-md hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Manage Factories</h3>
                <p className="text-blue-100 text-sm mt-1">Add, edit, and monitor factories</p>
              </div>
              <Building2 className="w-8 h-8 text-blue-200" />
            </div>
          </Link>

          <Link
            href="/admin/users"
            className="bg-confirmsure-green hover:bg-green-600 text-white rounded-xl shadow-sm p-6 transition-all duration-200 hover:shadow-md hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">User Management</h3>
                <p className="text-green-100 text-sm mt-1">Control access and permissions</p>
              </div>
              <Users className="w-8 h-8 text-green-200" />
            </div>
          </Link>

          <Link
            href="/admin/analytics"
            className="bg-purple-500 hover:bg-purple-600 text-white rounded-xl shadow-sm p-6 transition-all duration-200 hover:shadow-md hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Analytics</h3>
                <p className="text-purple-100 text-sm mt-1">System-wide reports and insights</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-200" />
            </div>
          </Link>

          <Link
            href="/admin/settings"
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-sm p-6 transition-all duration-200 hover:shadow-md hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">System Settings</h3>
                <p className="text-orange-100 text-sm mt-1">Configure global settings</p>
              </div>
              <Settings className="w-8 h-8 text-orange-200" />
            </div>
          </Link>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Factory Overview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Factory Overview</h2>
                  <Link
                    href="/admin/factories"
                    className="text-confirmsure-blue hover:text-blue-600 font-medium text-sm"
                  >
                    View All →
                  </Link>
                </div>
              </div>
              <div className="p-6">
                {factories.length > 0 ? (
                  <div className="space-y-4">
                    {factories.slice(0, 5).map((factory) => (
                      <div key={factory.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-confirmsure-blue" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{factory.name}</p>
                            <p className="text-sm text-gray-500">{factory.location}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {factory.products?.[0]?.count || 0} products
                            </p>
                            <p className="text-sm text-gray-500">
                              {factory.users?.[0]?.count || 0} users
                            </p>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${
                            factory.is_active ? 'bg-green-500' : 'bg-gray-400'
                          }`}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No factories registered</p>
                    <Link
                      href="/admin/factories/new"
                      className="text-confirmsure-blue hover:text-blue-600 font-medium"
                    >
                      Create your first factory →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity & System Info */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
              </div>
              <div className="p-6">
                {recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.slice(0, 8).map((activity, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-confirmsure-blue rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">{activity.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {activity.timestamp} • {activity.user}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm">No recent activity</p>
                )}
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">System Status</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Database</span>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-green-600">Operational</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Storage</span>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-green-600">Operational</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">API</span>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-green-600">Operational</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Authentication</span>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-green-600">Operational</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Today's Numbers</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">New Products</span>
                    <span className="text-sm font-medium text-gray-900">247</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">QR Scans</span>
                    <span className="text-sm font-medium text-gray-900">1,432</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">New Users</span>
                    <span className="text-sm font-medium text-gray-900">8</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">API Calls</span>
                    <span className="text-sm font-medium text-gray-900">23.4k</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}