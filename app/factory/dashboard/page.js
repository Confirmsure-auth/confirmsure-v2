'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Plus, 
  Package, 
  QrCode, 
  Eye, 
  TrendingUp, 
  Calendar,
  Activity,
  Users,
  BarChart3,
  Search,
  Filter,
  Download
} from 'lucide-react'
import StatsCards from '../../components/factory/StatsCards'
import RecentProducts from '../../components/factory/RecentProducts'
import QuickActions from '../../components/factory/QuickActions'

export default function FactoryDashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    publishedProducts: 0,
    todayProducts: 0,
    weekProducts: 0,
    monthProducts: 0,
    totalScans: 0,
    loading: true
  })
  
  const [recentProducts, setRecentProducts] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load stats
      const statsResponse = await fetch('/api/factory/stats')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats({ ...statsData, loading: false })
      }

      // Load recent products
      const productsResponse = await fetch('/api/products?limit=5&sort=created_at&order=desc')
      if (productsResponse.ok) {
        const productsData = await productsResponse.json()
        setRecentProducts(productsData.products || [])
      }

      // Load notifications
      const notificationsResponse = await fetch('/api/factory/notifications')
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json()
        setNotifications(notificationsData.notifications || [])
      }

    } catch (error) {
      console.error('Dashboard data loading error:', error)
    } finally {
      setLoading(false)
    }
  }

  const quickActionCards = [
    {
      title: 'Add Product',
      description: 'Register a new product',
      icon: Plus,
      href: '/factory/products/new',
      color: 'bg-confirmsure-blue',
      hoverColor: 'hover:bg-blue-600'
    },
    {
      title: 'Generate QR Codes',
      description: 'Bulk QR generation',
      icon: QrCode,
      href: '/factory/qr-codes',
      color: 'bg-confirmsure-green',
      hoverColor: 'hover:bg-green-600'
    },
    {
      title: 'View Products',
      description: 'Manage your products',
      icon: Package,
      href: '/factory/products',
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600'
    },
    {
      title: 'Analytics',
      description: 'View performance metrics',
      icon: BarChart3,
      href: '/factory/analytics',
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600'
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
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
              <h1 className="text-3xl font-bold text-gray-900">Factory Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Welcome back! Here's what's happening in your factory.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </button>
              <Link
                href="/factory/products/new"
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stats.loading ? '...' : stats.totalProducts.toLocaleString()}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Package className="w-6 h-6 text-confirmsure-blue" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600 font-medium">+{stats.weekProducts}</span>
              <span className="text-gray-600 ml-1">this week</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Published Products</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stats.loading ? '...' : stats.publishedProducts.toLocaleString()}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Eye className="w-6 h-6 text-confirmsure-green" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <Activity className="w-4 h-4 text-blue-500 mr-1" />
              <span className="text-blue-600 font-medium">{stats.totalScans}</span>
              <span className="text-gray-600 ml-1">total scans</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Products</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stats.loading ? '...' : stats.todayProducts}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-orange-500" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600 font-medium">+{stats.monthProducts}</span>
              <span className="text-gray-600 ml-1">this month</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">QR Codes Generated</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stats.loading ? '...' : stats.totalProducts.toLocaleString()}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <QrCode className="w-6 h-6 text-purple-500" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <Activity className="w-4 h-4 text-purple-500 mr-1" />
              <span className="text-purple-600 font-medium">Active</span>
              <span className="text-gray-600 ml-1">all codes</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickActionCards.map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className={`${action.color} ${action.hoverColor} text-white rounded-xl shadow-sm p-6 transition-all duration-200 hover:shadow-md hover:scale-105`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{action.title}</h3>
                  <p className="text-white/80 text-sm mt-1">{action.description}</p>
                </div>
                <action.icon className="w-8 h-8 text-white/80" />
              </div>
            </Link>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Products */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Recent Products</h2>
                  <Link
                    href="/factory/products"
                    className="text-confirmsure-blue hover:text-blue-600 font-medium text-sm"
                  >
                    View All →
                  </Link>
                </div>
              </div>
              <div className="p-6">
                {recentProducts.length > 0 ? (
                  <div className="space-y-4">
                    {recentProducts.map((product) => (
                      <div key={product.id} className="flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                          {product.product_images?.[0] ? (
                            <img
                              src={product.product_images[0].thumbnail_url || product.product_images[0].image_url}
                              alt={product.product_name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Package className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {product.product_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {product.qr_code} • {product.product_type}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            product.status === 'published' 
                              ? 'bg-green-100 text-green-800'
                              : product.status === 'draft'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {product.status}
                          </span>
                          <Link
                            href={`/factory/products/${product.id}`}
                            className="text-confirmsure-blue hover:text-blue-600"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No products found</p>
                    <Link
                      href="/factory/products/new"
                      className="text-confirmsure-blue hover:text-blue-600 font-medium"
                    >
                      Create your first product →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notifications & Activity */}
          <div className="space-y-6">
            {/* Notifications */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
              </div>
              <div className="p-6">
                {notifications.length > 0 ? (
                  <div className="space-y-3">
                    {notifications.map((notification, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-confirmsure-blue rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm">No new notifications</p>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Quick Stats</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Products This Week</span>
                    <span className="text-sm font-medium text-gray-900">{stats.weekProducts}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">QR Scans Today</span>
                    <span className="text-sm font-medium text-gray-900">-</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Success Rate</span>
                    <span className="text-sm font-medium text-green-600">99.8%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Average Processing</span>
                    <span className="text-sm font-medium text-gray-900">2.3 min</span>
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