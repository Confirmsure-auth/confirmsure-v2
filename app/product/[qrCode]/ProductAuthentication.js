'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Shield, CheckCircle, Eye, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function ProductAuthentication({ product }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const images = product.product_images || []

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <ArrowLeft className="h-5 w-5" />
              <Shield className="h-6 w-6 text-confirmsure-blue" />
              <span className="text-xl font-bold text-gray-900">ConfirmSure</span>
            </Link>
            <div className="verification-badge">
              <CheckCircle className="h-5 w-5" />
              <span>Verified Authentic</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Product Info */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 border-b">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.product_name}</h1>
              <p className="text-gray-600">QR Code: {product.qr_code}</p>
              <p className="text-gray-600">Factory: {product.factory?.name}</p>
              <p className="text-gray-600">Location: {product.factory?.location}</p>
            </div>

            {/* Image Gallery */}
            <div className="relative">
              {images.length > 0 && (
                <>
                  <div className="aspect-square md:aspect-video relative bg-gray-100">
                    <Image
                      src={images[currentImageIndex]?.image_url}
                      alt={`${product.product_name} - View ${currentImageIndex + 1}`}
                      fill
                      className="object-cover"
                    />
                    
                    {/* Navigation Buttons */}
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all"
                        >
                          <ChevronLeft className="h-6 w-6" />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all"
                        >
                          <ChevronRight className="h-6 w-6" />
                        </button>
                      </>
                    )}
                    
                    {/* Image Counter */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  </div>

                  {/* Thumbnail Strip */}
                  <div className="p-4 bg-gray-50">
                    <div className="flex space-x-2 overflow-x-auto">
                      {images.map((image, index) => (
                        <button
                          key={image.id}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                            index === currentImageIndex ? 'border-confirmsure-blue' : 'border-gray-200'
                          }`}
                        >
                          <Image
                            src={image.image_url}
                            alt={`Thumbnail ${index + 1}`}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Authentication Details */}
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <Eye className="h-6 w-6 text-confirmsure-blue mr-2" />
                Authentication Markers
              </h2>
              
              {product.markers && product.markers.length > 0 && (
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  {product.markers.map((marker, index) => (
                    <div key={index} className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 capitalize">
                        {marker.type?.replace('_', ' ')}
                      </h3>
                      <p className="text-gray-600">Position: {marker.position}</p>
                      {marker.color && <p className="text-gray-600">Color: {marker.color}</p>}
                      {marker.pattern && <p className="text-gray-600">Pattern: {marker.pattern}</p>}
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-confirmsure-green mb-2">Verification Instructions</h3>
                <p className="text-gray-700">
                  Compare the physical product in your hands with these authentication photos. 
                  Look for the specific markers shown above in the exact positions indicated. 
                  If all markers match, your product is guaranteed authentic.
                </p>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Product Details</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Product Information</h3>
                <p className="text-gray-600">Type: {product.product_type}</p>
                <p className="text-gray-600">Batch: {product.batch_id || 'N/A'}</p>
                <p className="text-gray-600">Manufactured: {new Date(product.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Factory Information</h3>
                <p className="text-gray-600">{product.factory?.name}</p>
                <p className="text-gray-600">{product.factory?.location}</p>
                <p className="text-gray-600">Contact: {product.factory?.contact_email}</p>
              </div>
            </div>
            
            {product.description && (
              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-600">{product.description}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
