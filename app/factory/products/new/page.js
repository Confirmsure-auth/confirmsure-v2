'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ProductForm from '../../../components/factory/ProductForm'
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
        <ProductForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  )
}