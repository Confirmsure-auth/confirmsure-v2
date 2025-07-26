'use client'
import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Image from 'next/image'
import { 
  Upload, 
  X, 
  Plus, 
  Camera, 
  Save, 
  QrCode, 
  Eye,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { productSchema, authenticationMarkerSchema } from '../../lib/validation'

const MARKER_TYPES = [
  { value: 'color_dot', label: 'Color Dot', description: 'Small colored marking' },
  { value: 'pattern', label: 'Pattern', description: 'Geometric or text pattern' },
  { value: 'texture', label: 'Texture', description: 'Surface texture variation' },
  { value: 'hologram', label: 'Hologram', description: 'Holographic element' },
  { value: 'uv_mark', label: 'UV Mark', description: 'UV-visible marking' },
  { value: 'microprint', label: 'Microprint', description: 'Tiny printed text' }
]

export default function ProductForm({ 
  initialData = null, 
  onSubmit, 
  onCancel,
  isEditing = false 
}) {
  const [currentStep, setCurrentStep] = useState(1)
  const [uploadedImages, setUploadedImages] = useState([])
  const [markers, setMarkers] = useState(initialData?.markers || [])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [qrCode, setQrCode] = useState(initialData?.qr_code || null)
  const [previewMode, setPreviewMode] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
    trigger
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: initialData || {
      product_name: '',
      product_type: '',
      description: '',
      batch_id: '',
      serial_number: '',
      manufacturing_date: '',
      expiry_date: '',
      factory_id: '', // Will be set from user context
      metadata: {}
    },
    mode: 'onChange'
  })

  const watchedValues = watch()

  // Handle image upload
  const handleImageUpload = useCallback(async (files) => {
    if (!files || files.length === 0) return

    const formData = new FormData()
    Array.from(files).forEach(file => {
      formData.append('files', file)
    })

    if (qrCode) {
      formData.append('productId', 'temp-' + Date.now()) // Temporary ID for preview
    }

    try {
      // For now, just preview the images locally
      const imagePromises = Array.from(files).map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve({
            file,
            preview: e.target.result,
            name: file.name,
            size: file.size
          })
          reader.readAsDataURL(file)
        })
      })

      const newImages = await Promise.all(imagePromises)
      setUploadedImages(prev => [...prev, ...newImages])
    } catch (error) {
      console.error('Image upload error:', error)
    }
  }, [qrCode])

  // Remove uploaded image
  const removeImage = (index) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }

  // Add authentication marker
  const addMarker = () => {
    const newMarker = {
      id: Date.now(),
      type: 'color_dot',
      position: '',
      color: '',
      pattern: '',
      size_mm: '',
      description: '',
      verification_instructions: ''
    }
    setMarkers(prev => [...prev, newMarker])
  }

  // Update marker
  const updateMarker = (index, field, value) => {
    setMarkers(prev => prev.map((marker, i) => 
      i === index ? { ...marker, [field]: value } : marker
    ))
  }

  // Remove marker
  const removeMarker = (index) => {
    setMarkers(prev => prev.filter((_, i) => i !== index))
  }

  // Generate QR code
  const generateQR = async () => {
    try {
      const response = await fetch('/api/qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'single' })
      })

      if (response.ok) {
        const data = await response.json()
        setQrCode(data.qrCode)
      }
    } catch (error) {
      console.error('QR generation error:', error)
    }
  }

  // Handle form submission
  const onFormSubmit = async (data) => {
    setIsSubmitting(true)

    try {
      const submitData = {
        ...data,
        qr_code: qrCode,
        images: uploadedImages,
        markers: markers.filter(m => m.position && m.type)
      }

      await onSubmit(submitData)
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Step navigation
  const nextStep = async () => {
    const isStepValid = await trigger()
    if (isStepValid && currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const steps = [
    { number: 1, title: 'Product Details', icon: Camera },
    { number: 2, title: 'Images', icon: Upload },
    { number: 3, title: 'Authentication', icon: Eye },
    { number: 4, title: 'Review', icon: CheckCircle }
  ]

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-confirmsure-blue text-white p-6">
        <h2 className="text-2xl font-bold">
          {isEditing ? 'Edit Product' : 'Register New Product'}
        </h2>
        <p className="text-blue-100 mt-1">
          {isEditing ? 'Update product information' : 'Add a new product to your factory'}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep >= step.number 
                  ? 'bg-confirmsure-blue text-white' 
                  : 'bg-gray-300 text-gray-600'
              }`}>
                {currentStep > step.number ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <step.icon className="w-4 h-4" />
                )}
              </div>
              <span className={`ml-2 text-sm ${
                currentStep >= step.number ? 'text-confirmsure-blue' : 'text-gray-600'
              }`}>
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-4 ${
                  currentStep > step.number ? 'bg-confirmsure-blue' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="p-6">
        {/* Step 1: Product Details */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  {...register('product_name')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent"
                  placeholder="Enter product name"
                />
                {errors.product_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.product_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Type *
                </label>
                <input
                  {...register('product_type')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent"
                  placeholder="e.g., Electronics, Clothing, etc."
                />
                {errors.product_type && (
                  <p className="mt-1 text-sm text-red-600">{errors.product_type.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Batch ID
                </label>
                <input
                  {...register('batch_id')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent"
                  placeholder="Optional batch identifier"
                />
                {errors.batch_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.batch_id.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Serial Number
                </label>
                <input
                  {...register('serial_number')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent"
                  placeholder="Optional serial number"
                />
                {errors.serial_number && (
                  <p className="mt-1 text-sm text-red-600">{errors.serial_number.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Manufacturing Date
                </label>
                <input
                  {...register('manufacturing_date')}
                  type="date"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent"
                />
                {errors.manufacturing_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.manufacturing_date.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Date
                </label>
                <input
                  {...register('expiry_date')}
                  type="date"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent"
                />
                {errors.expiry_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.expiry_date.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent"
                placeholder="Optional product description"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* QR Code Generation */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">QR Code</h3>
                {!qrCode && (
                  <button
                    type="button"
                    onClick={generateQR}
                    className="flex items-center px-3 py-2 bg-confirmsure-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Generate QR
                  </button>
                )}
              </div>
              {qrCode ? (
                <div className="flex items-center space-x-4">
                  <div className="bg-white p-2 rounded">
                    <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                      <QrCode className="w-8 h-8 text-gray-600" />
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{qrCode}</p>
                    <p className="text-sm text-gray-600">QR code generated successfully</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">Generate a unique QR code for this product</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Images */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Product Images</h3>
              <p className="text-gray-600 mb-6">
                Upload 3-6 high-quality images of your product from different angles. 
                The first image will be used as the primary image.
              </p>
            </div>

            {/* Image Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-confirmsure-blue transition-colors">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files)}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Click to upload images
                </p>
                <p className="text-gray-500">
                  PNG, JPG, WebP up to 10MB each (max 6 images)
                </p>
              </label>
            </div>

            {/* Uploaded Images Preview */}
            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {uploadedImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={image.preview}
                        alt={`Product image ${index + 1}`}
                        width={200}
                        height={200}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-900">
                        {index === 0 ? 'Primary Image' : `Image ${index + 1}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(image.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {uploadedImages.length < 6 && (
              <button
                type="button"
                onClick={() => document.getElementById('image-upload').click()}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-confirmsure-blue hover:text-confirmsure-blue transition-colors"
              >
                <Plus className="w-5 h-5 mx-auto mb-1" />
                Add More Images
              </button>
            )}
          </div>
        )}

        {/* Step 3: Authentication Markers */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Authentication Markers</h3>
              <p className="text-gray-600 mb-6">
                Define visual markers that customers can use to verify product authenticity.
                Add specific details about colors, positions, patterns, or special features.
              </p>
            </div>

            {markers.map((marker, index) => (
              <div key={marker.id} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900">Marker {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeMarker(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Marker Type
                    </label>
                    <select
                      value={marker.type}
                      onChange={(e) => updateMarker(index, 'type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent"
                    >
                      {MARKER_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Position
                    </label>
                    <input
                      value={marker.position}
                      onChange={(e) => updateMarker(index, 'position', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent"
                      placeholder="e.g., Bottom left corner"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color
                    </label>
                    <input
                      value={marker.color}
                      onChange={(e) => updateMarker(index, 'color', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent"
                      placeholder="e.g., Blue, Red, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Size (mm)
                    </label>
                    <input
                      type="number"
                      value={marker.size_mm}
                      onChange={(e) => updateMarker(index, 'size_mm', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent"
                      placeholder="5"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={marker.description}
                    onChange={(e) => updateMarker(index, 'description', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent"
                    placeholder="Detailed description of the marker"
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addMarker}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-confirmsure-blue hover:text-confirmsure-blue transition-colors"
            >
              <Plus className="w-5 h-5 mx-auto mb-1" />
              Add Authentication Marker
            </button>
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Review Product</h3>
              <p className="text-gray-600 mb-6">
                Please review all information before submitting the product for registration.
              </p>
            </div>

            {/* Product Summary */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-4">Product Information</h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Name:</span> {watchedValues.product_name}
                </div>
                <div>
                  <span className="font-medium">Type:</span> {watchedValues.product_type}
                </div>
                <div>
                  <span className="font-medium">QR Code:</span> {qrCode}
                </div>
                <div>
                  <span className="font-medium">Batch ID:</span> {watchedValues.batch_id || 'N/A'}
                </div>
              </div>
              {watchedValues.description && (
                <div className="mt-4">
                  <span className="font-medium">Description:</span>
                  <p className="text-gray-600 mt-1">{watchedValues.description}</p>
                </div>
              )}
            </div>

            {/* Images Summary */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-4">
                Images ({uploadedImages.length})
              </h4>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {uploadedImages.map((image, index) => (
                  <div key={index} className="aspect-square rounded overflow-hidden">
                    <Image
                      src={image.preview}
                      alt={`Preview ${index + 1}`}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Markers Summary */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-4">
                Authentication Markers ({markers.length})
              </h4>
              {markers.length > 0 ? (
                <div className="space-y-3">
                  {markers.map((marker, index) => (
                    <div key={marker.id} className="bg-white p-3 rounded border">
                      <div className="font-medium capitalize">
                        {marker.type.replace('_', ' ')} - {marker.position}
                      </div>
                      {marker.color && (
                        <div className="text-sm text-gray-600">Color: {marker.color}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No authentication markers added</p>
              )}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
            )}
          </div>

          <div className="flex space-x-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-3 bg-confirmsure-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting || !qrCode}
                className="flex items-center px-6 py-3 bg-confirmsure-green text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {isEditing ? 'Update Product' : 'Create Product'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}