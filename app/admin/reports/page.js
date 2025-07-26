'use client'
import { useState, useEffect } from 'react'
import { 
  Download, 
  Calendar, 
  FileText, 
  BarChart3, 
  TrendingUp,
  Building2,
  Package,
  Eye,
  Users,
  Filter,
  Search,
  Play,
  Clock,
  CheckCircle
} from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'

export default function ComprehensiveReports() {
  const [reportTypes, setReportTypes] = useState([])
  const [generatedReports, setGeneratedReports] = useState([])
  const [selectedReportType, setSelectedReportType] = useState('')
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  })
  const [filters, setFilters] = useState({
    factory_id: '',
    status: '',
    format: 'pdf'
  })
  const [loading, setLoading] = useState(false)
  const [factories, setFactories] = useState([])

  useEffect(() => {
    loadReportData()
  }, [])

  const loadReportData = async () => {
    try {
      const [reportsRes, factoriesRes, generatedRes] = await Promise.all([
        fetch('/api/admin/reports/types'),
        fetch('/api/factories'),
        fetch('/api/admin/reports/generated')
      ])

      if (reportsRes.ok) {
        const data = await reportsRes.json()
        setReportTypes(data.reportTypes || [])
      }

      if (factoriesRes.ok) {
        const data = await factoriesRes.json()
        setFactories(data.factories || [])
      }

      if (generatedRes.ok) {
        const data = await generatedRes.json()
        setGeneratedReports(data.reports || [])
      }
    } catch (error) {
      console.error('Failed to load report data:', error)
    }
  }

  const generateReport = async () => {
    if (!selectedReportType) {
      alert('Please select a report type')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/admin/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reportType: selectedReportType,
          dateRange,
          filters
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        if (result.downloadUrl) {
          // Direct download
          window.open(result.downloadUrl, '_blank')
        } else {
          // Report queued for generation
          alert('Report generation started. You will be notified when it\'s ready.')
          loadReportData() // Refresh the list
        }
      } else {
        const error = await response.json()
        alert(`Report generation failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Report generation error:', error)
      alert('Report generation failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const downloadReport = async (reportId, filename) => {
    try {
      const response = await fetch(`/api/admin/reports/${reportId}/download`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Download error:', error)
      alert('Download failed. Please try again.')
    }
  }

  const quickDateRanges = [
    { label: 'Today', start: format(new Date(), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') },
    { label: 'Yesterday', start: format(subDays(new Date(), 1), 'yyyy-MM-dd'), end: format(subDays(new Date(), 1), 'yyyy-MM-dd') },
    { label: 'Last 7 days', start: format(subDays(new Date(), 7), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') },
    { label: 'Last 30 days', start: format(subDays(new Date(), 30), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') },
    { label: 'This month', start: format(startOfMonth(new Date()), 'yyyy-MM-dd'), end: format(endOfMonth(new Date()), 'yyyy-MM-dd') }
  ]

  const defaultReportTypes = [
    {
      id: 'factory_performance',
      name: 'Factory Performance Report',
      description: 'Comprehensive performance metrics for all factories',
      icon: Building2,
      category: 'Operations',
      estimatedTime: '2-5 minutes'
    },
    {
      id: 'product_analytics',
      name: 'Product Analytics Report',
      description: 'Detailed analysis of product creation and verification',
      icon: Package,
      category: 'Products',
      estimatedTime: '3-7 minutes'
    },
    {
      id: 'qr_scan_analysis',
      name: 'QR Scan Analysis',
      description: 'Customer verification patterns and geographic distribution',
      icon: Eye,
      category: 'Customer',
      estimatedTime: '2-4 minutes'
    },
    {
      id: 'user_activity',
      name: 'User Activity Report',
      description: 'User engagement and system usage analytics',
      icon: Users,
      category: 'Users',
      estimatedTime: '1-3 minutes'
    },
    {
      id: 'security_audit',
      name: 'Security Audit Report',
      description: 'Security events, failed logins, and system health',
      icon: CheckCircle,
      category: 'Security',
      estimatedTime: '5-10 minutes'
    },
    {
      id: 'financial_summary',
      name: 'Financial Summary',
      description: 'Cost analysis and ROI metrics',
      icon: TrendingUp,
      category: 'Finance',
      estimatedTime: '3-6 minutes'
    }
  ]

  const reportTypesToShow = reportTypes.length > 0 ? reportTypes : defaultReportTypes

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
              <p className="text-gray-600 mt-1">
                Generate comprehensive reports and export data for analysis
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Report Generation */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Generate New Report</h2>
              
              {/* Report Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Report Type
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reportTypesToShow.map((reportType) => {
                    const IconComponent = reportType.icon
                    return (
                      <div
                        key={reportType.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedReportType === reportType.id
                            ? 'border-confirmsure-blue bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        onClick={() => setSelectedReportType(reportType.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <IconComponent className={`w-6 h-6 mt-1 ${
                            selectedReportType === reportType.id ? 'text-confirmsure-blue' : 'text-gray-400'
                          }`} />
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{reportType.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">{reportType.description}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-400">{reportType.category}</span>
                              <span className="text-xs text-gray-400">{reportType.estimatedTime}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Date Range */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Range
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent"
                    />
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent"
                    />
                  </div>
                  
                  <div className="mt-3">
                    <label className="text-xs text-gray-500 mb-2 block">Quick Select:</label>
                    <div className="flex flex-wrap gap-2">
                      {quickDateRanges.map((range) => (
                        <button
                          key={range.label}
                          onClick={() => setDateRange({ startDate: range.start, endDate: range.end })}
                          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filters & Options
                  </label>
                  <div className="space-y-3">
                    <select
                      value={filters.factory_id}
                      onChange={(e) => setFilters(prev => ({ ...prev, factory_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent"
                    >
                      <option value="">All Factories</option>
                      {factories.map(factory => (
                        <option key={factory.id} value={factory.id}>
                          {factory.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={filters.format}
                      onChange={(e) => setFilters(prev => ({ ...prev, format: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent"
                    >
                      <option value="pdf">PDF Report</option>
                      <option value="excel">Excel Spreadsheet</option>
                      <option value="csv">CSV Data</option>
                      <option value="json">JSON Data</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={generateReport}
                disabled={loading || !selectedReportType}
                className="w-full flex items-center justify-center px-6 py-3 bg-confirmsure-blue text-white font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Recent Reports */}
          <div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">Recent Reports</h3>
              </div>
              
              <div className="p-6">
                {generatedReports.length > 0 ? (
                  <div className="space-y-4">
                    {generatedReports.slice(0, 10).map((report) => (
                      <div key={report.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className={`p-2 rounded-lg ${
                          report.status === 'completed' ? 'bg-green-100 text-green-600' :
                          report.status === 'failed' ? 'bg-red-100 text-red-600' :
                          'bg-yellow-100 text-yellow-600'
                        }`}>
                          {report.status === 'completed' ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : report.status === 'failed' ? (
                            <FileText className="w-4 h-4" />
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {report.name || report.type}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(report.created_at), 'MMM dd, HH:mm')}
                          </p>
                          <p className="text-xs text-gray-400">
                            {report.format?.toUpperCase()} • {report.file_size || 'Unknown size'}
                          </p>
                        </div>
                        
                        {report.status === 'completed' && (
                          <button
                            onClick={() => downloadReport(report.id, report.filename)}
                            className="p-1 text-confirmsure-blue hover:bg-blue-50 rounded"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">No reports generated yet</p>
                    <p className="text-sm text-gray-500">
                      Generate your first report to see it here
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 mt-6">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">Quick Stats</h3>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Reports This Month</span>
                    <span className="text-sm font-medium text-gray-900">
                      {generatedReports.filter(r => 
                        new Date(r.created_at).getMonth() === new Date().getMonth()
                      ).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Avg. Generation Time</span>
                    <span className="text-sm font-medium text-gray-900">2.3 min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Data Exported</span>
                    <span className="text-sm font-medium text-gray-900">847 MB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Most Popular Format</span>
                    <span className="text-sm font-medium text-gray-900">PDF</span>
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