import { NextResponse } from 'next/server'
import { getCurrentUser, hasPermission, PERMISSIONS } from '../../lib/auth'
import { 
  processAndUploadImage, 
  batchProcessImages, 
  validateImageFile 
} from '../../lib/image-processing'
import { createClient } from '../../lib/supabase'
import { imageUploadSchema } from '../../lib/validation'

const supabase = createClient()

export async function POST(request) {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check permissions
    if (!hasPermission(user, PERMISSIONS.PRODUCTS.CREATE)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const files = formData.getAll('files')
    const productId = formData.get('productId')
    const imageType = formData.get('imageType') || 'product'
    const isPrimary = formData.get('isPrimary') === 'true'
    const angleDescription = formData.get('angleDescription')
    const addWatermark = formData.get('addWatermark') === 'true'

    // Validate required fields
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    // Validate file count
    if (files.length > 6) {
      return NextResponse.json(
        { error: 'Maximum 6 files allowed per upload' },
        { status: 400 }
      )
    }

    // Check if product exists and user has access
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, factory_id, product_name')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Check factory access for non-admin users
    if (user.profile.role !== 'admin' && user.profile.factory_id !== product.factory_id) {
      return NextResponse.json(
        { error: 'Access denied to this product' },
        { status: 403 }
      )
    }

    // Validate each file
    const validationErrors = []
    files.forEach((file, index) => {
      const validation = validateImageFile(file)
      if (!validation.isValid) {
        validationErrors.push({
          fileIndex: index,
          fileName: file.name,
          errors: validation.errors
        })
      }
    })

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'File validation failed',
          validationErrors 
        },
        { status: 400 }
      )
    }

    const uploadOptions = {
      addWatermark,
      watermarkText: 'ConfirmSure',
      isPrimary
    }

    let results

    if (files.length === 1) {
      // Single file upload
      const result = await processAndUploadImage(files[0], productId, uploadOptions)
      
      // Save to database
      const { data: imageRecord, error: dbError } = await supabase
        .from('product_images')
        .insert([{
          product_id: productId,
          image_url: result.main.publicUrl,
          thumbnail_url: result.thumbnail.publicUrl,
          image_type: imageType,
          angle_description: angleDescription,
          is_primary: isPrimary,
          file_size: result.processing.processedSize,
          dimensions: {
            width: result.main.metadata.width,
            height: result.main.metadata.height
          },
          metadata: {
            originalSize: result.processing.originalSize,
            compressionRatio: result.main.metadata.compressionRatio,
            processed: true,
            watermarked: addWatermark
          }
        }])
        .select()
        .single()

      if (dbError) {
        console.error('Database insert error:', dbError)
        return NextResponse.json(
          { error: 'Failed to save image record' },
          { status: 500 }
        )
      }

      results = {
        success: true,
        image: imageRecord,
        processing: result.processing
      }
    } else {
      // Batch upload
      const batchResult = await batchProcessImages(files, productId, uploadOptions)
      
      // Save successful uploads to database
      const imageRecords = []
      for (const result of batchResult.results) {
        const { data: imageRecord, error: dbError } = await supabase
          .from('product_images')
          .insert([{
            product_id: productId,
            image_url: result.main.publicUrl,
            thumbnail_url: result.thumbnail.publicUrl,
            image_type: imageType,
            angle_description: angleDescription,
            is_primary: result.isPrimary || false,
            file_size: result.processing.processedSize,
            dimensions: {
              width: result.main.metadata.width,
              height: result.main.metadata.height
            },
            metadata: {
              originalSize: result.processing.originalSize,
              compressionRatio: result.main.metadata.compressionRatio,
              processed: true,
              watermarked: addWatermark,
              batchIndex: result.index
            }
          }])
          .select()
          .single()

        if (!dbError) {
          imageRecords.push(imageRecord)
        }
      }

      results = {
        success: true,
        images: imageRecords,
        batch: {
          totalFiles: files.length,
          successfulUploads: batchResult.totalProcessed,
          failedUploads: batchResult.totalErrors,
          errors: batchResult.errors
        }
      }
    }

    // Log upload activity
    await supabase
      .from('audit_logs')
      .insert([{
        event_type: 'product',
        event_name: 'IMAGES_UPLOADED',
        user_id: user.id,
        resource_type: 'product',
        resource_id: productId,
        metadata: {
          product_id: productId,
          file_count: files.length,
          image_type: imageType,
          watermarked: addWatermark,
          total_size: files.reduce((sum, file) => sum + file.size, 0)
        }
      }])

    return NextResponse.json(results)

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}

export async function DELETE(request) {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('imageId')

    if (!imageId) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      )
    }

    // Get image record
    const { data: image, error: imageError } = await supabase
      .from('product_images')
      .select(`
        *,
        product:products!product_images_product_id_fkey(
          id,
          factory_id,
          product_name
        )
      `)
      .eq('id', imageId)
      .single()

    if (imageError || !image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      )
    }

    // Check permissions
    if (!hasPermission(user, PERMISSIONS.PRODUCTS.DELETE)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Check factory access for non-admin users
    if (user.profile.role !== 'admin' && user.profile.factory_id !== image.product.factory_id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Delete from storage
    try {
      // Extract file paths from URLs
      const mainImagePath = extractStoragePath(image.image_url)
      const thumbnailPath = extractStoragePath(image.thumbnail_url)

      if (mainImagePath) {
        await supabase.storage
          .from('product-images')
          .remove([mainImagePath])
      }

      if (thumbnailPath) {
        await supabase.storage
          .from('product-images')
          .remove([thumbnailPath])
      }
    } catch (storageError) {
      console.error('Storage deletion error:', storageError)
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('product_images')
      .delete()
      .eq('id', imageId)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete image record' },
        { status: 500 }
      )
    }

    // Log deletion
    await supabase
      .from('audit_logs')
      .insert([{
        event_type: 'product',
        event_name: 'IMAGE_DELETED',
        user_id: user.id,
        resource_type: 'product_image',
        resource_id: imageId,
        metadata: {
          product_id: image.product_id,
          image_type: image.image_type,
          was_primary: image.is_primary
        }
      }])

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully'
    })

  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: error.message || 'Deletion failed' },
      { status: 500 }
    )
  }
}

function extractStoragePath(url) {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    // Remove the first few parts to get the storage path
    // Expected format: /storage/v1/object/public/bucket-name/path
    const bucketIndex = pathParts.indexOf('product-images')
    if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
      return pathParts.slice(bucketIndex + 1).join('/')
    }
    return null
  } catch (error) {
    return null
  }
}