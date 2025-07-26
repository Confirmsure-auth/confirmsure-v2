'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function NewProductPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (productData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Create product
      const productResponse = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_name: productData.product_name,
          product_type: productData.product_type,
          description: productData.description,
          batch_id: productData.batch_id,
          serial_number: productData.serial_number,
          manufacturing_date: productData.manufacturing_date,
          expiry_date: productData.expiry_date,
          qr_code: productData.qr_code,
          metadata: productData.metadata || {}
        })
      })

      if (!productResponse.ok) {
        const errorData = await productResponse.json()
        throw new Error(errorData.error || 'Failed to create product')
      }

      const product = await productResponse.json()

      // Upload images if any
      if (productData.images && productData.images.length > 0) {
        const formData = new FormData()
        
        productData.images.forEach((image, index) => {
          formData.append('files', image.file)
        })
        
        formData.append('productId', product.id)
        formData.append('imageType', 'product')
        formData.append('addWatermark', 'true')

        if (productData.images.length > 0) {
          formData.append('isPrimary', 'true')
        }

        const imageResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })

        if (!imageResponse.ok) {
          console.error('Image upload failed, but product was created')
        }
      }

      // Create authentication markers
      if (productData.markers && productData.markers.length > 0) {
        const markerPromises = productData.markers.map(marker => 
          fetch('/api/products/markers', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              product_id: product.id,
              type: marker.type,
              position: marker.position,
              color: marker.color,
              pattern: marker.pattern,
              size_mm: marker.size_mm ? parseFloat(marker.size_mm) : null,
              description: marker.description,
              verification_instructions: marker.verification_instructions
            })
          })
        )

        await Promise.all(markerPromises)
      }

      setSuccess(true)
      
      // Redirect to product list after a short delay
      setTimeout(() => {
        router.push('/factory/products')
      }, 2000)

    } catch (error) {
      console.error('Product creation error:', error)
      setError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push('/factory/products')
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-confirmsure-green mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Created Successfully!</h2>
          <p className="text-gray-600 mb-6">
            Your product has been registered and is now available for authentication.
          </p>
          <Link
            href="/factory/products"
            className="btn-primary inline-flex items-center"
          >
            View Products
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center">
            <Link
              href="/factory/products"
              className="flex items-center text-gray-600 hover:text-confirmsure-blue mr-4"
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
              Back to Products
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
              <p className="text-gray-600">Register a new product for authentication</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Form */}
        <InlineProductForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  )
}

function InlineProductForm({ onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState({
    product_name: '',
    product_type: '',
    description: '',
    batch_id: '',
    serial_number: '',
    manufacturing_date: '',
    expiry_date: '',
    qr_code: '',
    metadata: {},
    images: [],
    markers: []
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Name *
            </label>
            <input
              type="text"
              name="product_name"
              value={formData.product_name}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent"
              placeholder="Enter product name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Type *
            </label>
            <select
              name="product_type"
              value={formData.product_type}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent"
            >
              <option value="">Select product type</option>
              <option value="Electronics">Electronics</option>
              <option value="Pharmaceuticals">Pharmaceuticals</option>
              <option value="Cosmetics">Cosmetics</option>
              <option value="Food & Beverage">Food & Beverage</option>
              <option value="Automotive">Automotive</option>
              <option value="Textiles">Textiles</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Batch ID
            </label>
            <input
              type="text"
              name="batch_id"
              value={formData.batch_id}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent"
              placeholder="Enter batch ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Serial Number
            </label>
            <input
              type="text"
              name="serial_number"
              value={formData.serial_number}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent"
              placeholder="Enter serial number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Manufacturing Date
            </label>
            <input
              type="date"
              name="manufacturing_date"
              value={formData.manufacturing_date}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expiry Date
            </label>
            <input
              type="date"
              name="expiry_date"
              value={formData.expiry_date}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent"
            placeholder="Enter product description"
          />
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating Product...' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  )
}