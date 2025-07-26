'use client'
import { useState, useEffect } from 'react'
import { 
  Upload, 
  Download, 
  Package, 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  FileText,
  Trash2,
  Eye,
  Plus
} from 'lucide-react'

export default function BatchOperations() {
  const [operations, setOperations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOperation, setSelectedOperation] = useState(null)
  const [uploadFile, setUploadFile] = useState(null)
  const [operationType, setOperationType] = useState('create_products')

  useEffect(() => {
    loadBatchOperations()
  }, [])

  const loadBatchOperations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/factory/batch')
      if (response.ok) {
        const data = await response.json()
        setOperations(data.operations || [])
      }
    } catch (error) {
      console.error('Failed to load batch operations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file, type) => {
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('operation_type', type)

    try {
      const response = await fetch('/api/factory/batch', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        setOperations(prev => [result.operation, ...prev])
        setUploadFile(null)
      } else {
        const error = await response.json()
        alert(`Upload failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed. Please try again.')
    }
  }

  const startOperation = async (operationId) => {
    try {
      const response = await fetch(`/api/factory/batch/${operationId}/start`, {
        method: 'POST'
      })

      if (response.ok) {
        loadBatchOperations()
      }
    } catch (error) {
      console.error('Failed to start operation:', error)
    }
  }

  const pauseOperation = async (operationId) => {
    try {
      const response = await fetch(`/api/factory/batch/${operationId}/pause`, {
        method: 'POST'
      })

      if (response.ok) {
        loadBatchOperations()
      }
    } catch (error) {
      console.error('Failed to pause operation:', error)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return CheckCircle
      case 'failed': return XCircle
      case 'running': return Play
      case 'paused': return Pause
      case 'pending': return Clock
      default: return Clock
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'failed': return 'text-red-600 bg-red-100'
      case 'running': return 'text-blue-600 bg-blue-100'
      case 'paused': return 'text-yellow-600 bg-yellow-100'
      case 'pending': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const calculateProgress = (operation) => {
    if (operation.total_items === 0) return 0
    return Math.round((operation.processed_items / operation.total_items) * 100)
  }

  const operationTypes = [
    { value: 'create_products', label: 'Create Products', description: 'Bulk create products from CSV' },
    { value: 'update_products', label: 'Update Products', description: 'Update existing products' },
    { value: 'generate_qr_codes', label: 'Generate QR Codes', description: 'Generate QR codes for products' },
    { value: 'upload_images', label: 'Upload Images', description: 'Bulk upload product images' }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-confirmsure-blue"></div>
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
              <h1 className="text-3xl font-bold text-gray-900">Batch Operations</h1>
              <p className="text-gray-600 mt-1">
                Manage bulk operations for efficient product processing
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => document.getElementById('file-upload').click()}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Batch Operation
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Start New Batch Operation</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operation Type
              </label>
              <select
                value={operationType}
                onChange={(e) => setOperationType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent"
              >
                {operationTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                {operationTypes.find(t => t.value === operationType)?.description}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload File
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-confirmsure-blue transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="hidden"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {uploadFile ? uploadFile.name : 'Click to upload CSV or Excel file'}
                  </p>
                </label>
              </div>
              {uploadFile && (
                <button
                  onClick={() => handleFileUpload(uploadFile, operationType)}
                  className="w-full mt-3 btn-primary"
                >
                  Upload and Process
                </button>
              )}
            </div>
          </div>

          {/* Template Downloads */}
          <div className="mt-6 border-t pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Download Templates</h3>
            <div className="flex flex-wrap gap-3">
              <button className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                <Download className="w-4 h-4 mr-2" />
                Product Creation Template
              </button>
              <button className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                <Download className="w-4 h-4 mr-2" />
                Product Update Template
              </button>
              <button className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                <Download className="w-4 h-4 mr-2" />
                QR Generation Template
              </button>
            </div>
          </div>
        </div>

        {/* Operations List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Recent Operations</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {operations.length > 0 ? (
              operations.map((operation) => {
                const StatusIcon = getStatusIcon(operation.status)
                const progress = calculateProgress(operation)
                
                return (
                  <div key={operation.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-lg ${getStatusColor(operation.status)}`}>
                          <StatusIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {operationTypes.find(t => t.value === operation.operation_type)?.label || operation.operation_type}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {operation.total_items} items • Created {new Date(operation.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {/* Progress */}
                        <div className="text-right min-w-[100px]">
                          <div className="text-sm font-medium text-gray-900">
                            {operation.processed_items} / {operation.total_items}
                          </div>
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-confirmsure-blue h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2">
                          {operation.status === 'pending' && (
                            <button
                              onClick={() => startOperation(operation.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                              title="Start operation"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          
                          {operation.status === 'running' && (
                            <button
                              onClick={() => pauseOperation(operation.id)}
                              className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                              title="Pause operation"
                            >
                              <Pause className="w-4 h-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => setSelectedOperation(operation)}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {operation.status === 'completed' && (
                            <button className="p-2 text-confirmsure-blue hover:bg-blue-50 rounded-lg">
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Error Summary */}
                    {operation.failed_items > 0 && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center">
                          <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />
                          <span className="text-sm text-red-700">
                            {operation.failed_items} items failed to process
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="p-12 text-center">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No batch operations found</p>
                <p className="text-sm text-gray-500 mt-1">
                  Upload a file to start your first batch operation
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Operation Details Modal */}
      {selectedOperation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Operation Details</h2>
                <button
                  onClick={() => setSelectedOperation(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm font-medium text-gray-500">Operation Type</label>
                  <p className="text-lg text-gray-900">{selectedOperation.operation_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="text-lg text-gray-900 capitalize">{selectedOperation.status}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Total Items</label>
                  <p className="text-lg text-gray-900">{selectedOperation.total_items}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Processed</label>
                  <p className="text-lg text-gray-900">{selectedOperation.processed_items}</p>
                </div>
              </div>

              {selectedOperation.error_details && selectedOperation.error_details.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Error Details</h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                    {selectedOperation.error_details.map((error, index) => (
                      <div key={index} className="text-sm text-red-700 mb-2">
                        Row {error.row}: {error.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}