'use client'
import { useState, useEffect } from 'react'
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Globe, 
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Building2,
  Package,
  Users,
  Eye,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

const COLORS = ['#4169E1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

export default function AdvancedAnalytics() {
  const [analyticsData, setAnalyticsData] = useState({
    overview: {},
    chartData: [],
    factoryPerformance: [],
    productTrends: [],
    qrScanData: [],
    geographicData: [],
    loading: true
  })
  
  const [timeRange, setTimeRange] = useState('30d')
  const [selectedMetric, setSelectedMetric] = useState('products')
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    loadAnalyticsData()
  }, [timeRange])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      
      const [overviewRes, chartsRes, factoriesRes, trendsRes, scansRes, geoRes] = await Promise.all([
        fetch(`/api/admin/analytics/overview?timeRange=${timeRange}`),
        fetch(`/api/admin/analytics/charts?timeRange=${timeRange}`),
        fetch(`/api/admin/analytics/factories?timeRange=${timeRange}`),
        fetch(`/api/admin/analytics/trends?timeRange=${timeRange}`),
        fetch(`/api/admin/analytics/scans?timeRange=${timeRange}`),
        fetch(`/api/admin/analytics/geographic?timeRange=${timeRange}`)
      ])

      const [overview, charts, factories, trends, scans, geographic] = await Promise.all([
        overviewRes.ok ? overviewRes.json() : { data: {} },
        chartsRes.ok ? chartsRes.json() : { data: [] },
        factoriesRes.ok ? factoriesRes.json() : { data: [] },
        trendsRes.ok ? trendsRes.json() : { data: [] },
        scansRes.ok ? scansRes.json() : { data: [] },
        geoRes.ok ? geoRes.json() : { data: [] }
      ])

      setAnalyticsData({
        overview: overview.data || {},
        chartData: charts.data || [],
        factoryPerformance: factories.data || [],
        productTrends: trends.data || [],
        qrScanData: scans.data || [],
        geographicData: geographic.data || [],
        loading: false
      })

      setLastUpdated(new Date())
    } catch (error) {
      console.error('Analytics loading error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format) => {
    try {
      const response = await fetch(`/api/admin/analytics/export?format=${format}&timeRange=${timeRange}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `analytics-${timeRange}-${format}.${format}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  const formatValue = (value, type = 'number') => {
    if (type === 'number') {
      return value?.toLocaleString() || '0'
    }
    if (type === 'percentage') {
      return `${value?.toFixed(1) || '0'}%`
    }
    if (type === 'currency') {
      return `$${value?.toLocaleString() || '0'}`
    }
    return value || 'N/A'
  }

  const getTimeRangeLabel = (range) => {
    switch (range) {
      case '24h': return 'Last 24 Hours'
      case '7d': return 'Last 7 Days'
      case '30d': return 'Last 30 Days'
      case '90d': return 'Last 90 Days'
      case '1y': return 'Last Year'
      default: return 'Last 30 Days'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              <div className="h-80 bg-gray-200 rounded-lg"></div>
              <div className="h-80 bg-gray-200 rounded-lg"></div>
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
              <h1 className="text-3xl font-bold text-gray-900">Advanced Analytics</h1>
              <p className="text-gray-600 mt-1">
                Comprehensive insights and performance metrics across all operations
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={loadAnalyticsData}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
              <div className="relative">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent appearance-none bg-white"
                >
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="1y">Last Year</option>
                </select>
              </div>
              <div className="relative">
                <button className="flex items-center px-4 py-2 bg-confirmsure-blue text-white rounded-lg hover:bg-blue-600 transition-colors">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Time Range Info */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">
              Analytics for {getTimeRangeLabel(timeRange)}
            </h2>
            {lastUpdated && (
              <p className="text-sm text-gray-500">
                Last updated: {format(lastUpdated, 'MMM dd, yyyy HH:mm')}
              </p>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatValue(analyticsData.overview.totalProducts)}
                </p>
                <div className="flex items-center mt-2">
                  {analyticsData.overview.productGrowth >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm font-medium ${
                    analyticsData.overview.productGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatValue(Math.abs(analyticsData.overview.productGrowth), 'percentage')}
                  </span>
                  <span className="text-gray-500 text-sm ml-1">vs previous period</span>
                </div>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Package className="w-8 h-8 text-confirmsure-blue" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">QR Scans</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatValue(analyticsData.overview.totalScans)}
                </p>
                <div className="flex items-center mt-2">
                  <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm font-medium text-green-600">
                    {formatValue(analyticsData.overview.scanGrowth, 'percentage')}
                  </span>
                  <span className="text-gray-500 text-sm ml-1">vs previous period</span>
                </div>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Eye className="w-8 h-8 text-confirmsure-green" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Factories</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatValue(analyticsData.overview.activeFactories)}
                </p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-600">
                    {formatValue(analyticsData.overview.factoryUtilization, 'percentage')} utilization
                  </span>
                </div>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Building2 className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatValue(analyticsData.overview.activeUsers)}
                </p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-600">
                    Across {formatValue(analyticsData.overview.totalFactories)} factories
                  </span>
                </div>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <Users className="w-8 h-8 text-orange-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Production Trends */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Production Trends</h3>
              <p className="text-gray-600 text-sm">Daily product registration over time</p>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analyticsData.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                    formatter={(value, name) => [formatValue(value), name]}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="products" 
                    stackId="1"
                    stroke="#4169E1" 
                    fill="#4169E1" 
                    fillOpacity={0.6}
                    name="Products Created"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="published" 
                    stackId="1"
                    stroke="#10B981" 
                    fill="#10B981" 
                    fillOpacity={0.6}
                    name="Products Published"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* QR Scan Analytics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">QR Scan Activity</h3>
              <p className="text-gray-600 text-sm">Customer verification trends</p>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData.qrScanData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                    formatter={(value) => [formatValue(value), 'QR Scans']}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="scans" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    name="Daily Scans"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="uniqueUsers" 
                    stroke="#F59E0B" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#F59E0B', strokeWidth: 2, r: 3 }}
                    name="Unique Users"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Factory Performance & Geographic Distribution */}
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* Factory Performance */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Factory Performance</h3>
              <p className="text-gray-600 text-sm">Production output by factory</p>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.factoryPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [formatValue(value), 'Products']} />
                  <Legend />
                  <Bar 
                    dataKey="products" 
                    fill="#4169E1" 
                    name="Total Products"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="published" 
                    fill="#10B981" 
                    name="Published Products"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Geographic Distribution */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Geographic Distribution</h3>
              <p className="text-gray-600 text-sm">QR scans by region</p>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData.geographicData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analyticsData.geographicData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatValue(value), 'Scans']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Detailed Metrics Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Factory Details</h3>
            <p className="text-gray-600 text-sm">Comprehensive factory performance metrics</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Factory
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Products
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    QR Scans
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Success Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg. Processing Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analyticsData.factoryPerformance.map((factory, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building2 className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{factory.name}</div>
                          <div className="text-sm text-gray-500">{factory.location}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatValue(factory.products)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatValue(factory.scans)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        factory.successRate > 95 
                          ? 'bg-green-100 text-green-800' 
                          : factory.successRate > 90
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {formatValue(factory.successRate, 'percentage')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {factory.avgProcessingTime}min
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {factory.performance >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                        )}
                        <span className={`text-sm font-medium ${
                          factory.performance >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatValue(Math.abs(factory.performance), 'percentage')}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}