import sharp from 'sharp'
import { createClient } from './supabase'

const supabase = createClient()

// Image processing configuration
const IMAGE_CONFIG = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 85,
  thumbnailSize: 300,
  watermarkOpacity: 0.3,
  allowedFormats: ['jpeg', 'png', 'webp'],
  maxFileSize: 10 * 1024 * 1024 // 10MB
}

/**
 * Process and optimize uploaded image
 */
export async function processImage(buffer, options = {}) {
  try {
    const config = { ...IMAGE_CONFIG, ...options }
    
    // Get image metadata
    const metadata = await sharp(buffer).metadata()
    
    // Validate image
    if (!config.allowedFormats.includes(metadata.format)) {
      throw new Error(`Unsupported image format: ${metadata.format}`)
    }
    
    // Create Sharp instance
    let image = sharp(buffer)
    
    // Auto-rotate based on EXIF orientation
    image = image.rotate()
    
    // Resize if too large
    if (metadata.width > config.maxWidth || metadata.height > config.maxHeight) {
      image = image.resize(config.maxWidth, config.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
    }
    
    // Apply compression and convert to JPEG for consistency
    const processedBuffer = await image
      .jpeg({ 
        quality: config.quality,
        progressive: true,
        mozjpeg: true
      })
      .toBuffer()
    
    // Get processed metadata
    const processedMetadata = await sharp(processedBuffer).metadata()
    
    return {
      buffer: processedBuffer,
      metadata: {
        width: processedMetadata.width,
        height: processedMetadata.height,
        format: processedMetadata.format,
        size: processedBuffer.length,
        originalSize: buffer.length,
        compressionRatio: ((buffer.length - processedBuffer.length) / buffer.length * 100).toFixed(2)
      }
    }
  } catch (error) {
    throw new Error(`Image processing failed: ${error.message}`)
  }
}

/**
 * Generate thumbnail from image buffer
 */
export async function generateThumbnail(buffer, size = IMAGE_CONFIG.thumbnailSize) {
  try {
    const thumbnailBuffer = await sharp(buffer)
      .resize(size, size, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toBuffer()
    
    return thumbnailBuffer
  } catch (error) {
    throw new Error(`Thumbnail generation failed: ${error.message}`)
  }
}

/**
 * Add watermark to image
 */
export async function addWatermark(buffer, watermarkText = 'ConfirmSure', options = {}) {
  try {
    const config = { ...IMAGE_CONFIG, ...options }
    
    // Get image dimensions
    const { width, height } = await sharp(buffer).metadata()
    
    // Create text watermark SVG
    const fontSize = Math.min(width, height) * 0.08 // 8% of smallest dimension
    const watermarkSvg = `
      <svg width="${width}" height="${height}">
        <text
          x="50%"
          y="95%"
          text-anchor="middle"
          font-family="Arial, sans-serif"
          font-size="${fontSize}"
          font-weight="bold"
          fill="white"
          opacity="${config.watermarkOpacity}"
          stroke="black"
          stroke-width="1"
        >${watermarkText}</text>
      </svg>
    `
    
    // Apply watermark
    const watermarkedBuffer = await sharp(buffer)
      .composite([{
        input: Buffer.from(watermarkSvg),
        blend: 'over'
      }])
      .jpeg({ quality: config.quality })
      .toBuffer()
    
    return watermarkedBuffer
  } catch (error) {
    throw new Error(`Watermark application failed: ${error.message}`)
  }
}

/**
 * Extract EXIF data from image
 */
export async function extractImageMetadata(buffer) {
  try {
    const metadata = await sharp(buffer).metadata()
    
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      space: metadata.space,
      channels: metadata.channels,
      depth: metadata.depth,
      density: metadata.density,
      hasProfile: metadata.hasProfile,
      hasAlpha: metadata.hasAlpha,
      orientation: metadata.orientation,
      exif: metadata.exif ? parseExifData(metadata.exif) : null
    }
  } catch (error) {
    throw new Error(`Metadata extraction failed: ${error.message}`)
  }
}

/**
 * Parse EXIF data buffer
 */
function parseExifData(exifBuffer) {
  try {
    // Basic EXIF parsing - in production, use a proper EXIF library
    return {
      hasExif: true,
      size: exifBuffer.length,
      // Add more EXIF parsing as needed
    }
  } catch (error) {
    return { hasExif: false, error: error.message }
  }
}

/**
 * Validate image file
 */
export function validateImageFile(file) {
  const errors = []
  
  if (!file) {
    errors.push('No file provided')
    return { isValid: false, errors }
  }
  
  // Check file size
  if (file.size > IMAGE_CONFIG.maxFileSize) {
    errors.push(`File size exceeds ${IMAGE_CONFIG.maxFileSize / 1024 / 1024}MB limit`)
  }
  
  // Check file type
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ]
  
  if (!allowedMimeTypes.includes(file.type)) {
    errors.push('Invalid file type. Please upload JPEG, PNG, or WebP images.')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Upload processed image to Supabase storage
 */
export async function uploadImageToStorage(buffer, fileName, bucket = 'product-images', folder = '') {
  try {
    const filePath = folder ? `${folder}/${fileName}` : fileName
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: 'image/jpeg',
        upsert: true
      })
    
    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`)
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)
    
    return {
      path: filePath,
      publicUrl: urlData.publicUrl,
      fileName
    }
  } catch (error) {
    throw new Error(`Image upload failed: ${error.message}`)
  }
}

/**
 * Process and upload image with thumbnail
 */
export async function processAndUploadImage(file, productId, options = {}) {
  try {
    // Validate file
    const validation = validateImageFile(file)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
    }
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Process main image
    const processed = await processImage(buffer, options)
    
    // Generate thumbnail
    const thumbnailBuffer = await generateThumbnail(processed.buffer)
    
    // Add watermark if requested
    let finalBuffer = processed.buffer
    if (options.addWatermark) {
      finalBuffer = await addWatermark(processed.buffer, options.watermarkText)
    }
    
    // Generate unique file names
    const timestamp = Date.now()
    const mainFileName = `${productId}_${timestamp}.jpg`
    const thumbnailFileName = `${productId}_${timestamp}_thumb.jpg`
    
    // Upload main image
    const mainUpload = await uploadImageToStorage(
      finalBuffer,
      mainFileName,
      'product-images',
      productId
    )
    
    // Upload thumbnail
    const thumbnailUpload = await uploadImageToStorage(
      thumbnailBuffer,
      thumbnailFileName,
      'product-images',
      `${productId}/thumbnails`
    )
    
    return {
      main: {
        ...mainUpload,
        metadata: processed.metadata
      },
      thumbnail: thumbnailUpload,
      processing: {
        originalSize: buffer.length,
        processedSize: finalBuffer.length,
        thumbnailSize: thumbnailBuffer.length,
        compressionRatio: processed.metadata.compressionRatio
      }
    }
  } catch (error) {
    throw new Error(`Image processing and upload failed: ${error.message}`)
  }
}

/**
 * Batch process multiple images
 */
export async function batchProcessImages(files, productId, options = {}) {
  try {
    const results = []
    const errors = []
    
    for (let i = 0; i < files.length; i++) {
      try {
        const result = await processAndUploadImage(files[i], productId, {
          ...options,
          isPrimary: i === 0 // First image is primary
        })
        results.push({
          index: i,
          success: true,
          ...result
        })
      } catch (error) {
        errors.push({
          index: i,
          fileName: files[i].name,
          error: error.message
        })
      }
    }
    
    return {
      results,
      errors,
      totalProcessed: results.length,
      totalErrors: errors.length
    }
  } catch (error) {
    throw new Error(`Batch image processing failed: ${error.message}`)
  }
}

/**
 * Delete image from storage
 */
export async function deleteImageFromStorage(filePath, bucket = 'product-images') {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath])
    
    if (error) {
      throw new Error(`Storage deletion failed: ${error.message}`)
    }
    
    return { success: true, path: filePath }
  } catch (error) {
    throw new Error(`Image deletion failed: ${error.message}`)
  }
}

/**
 * Generate multiple image sizes
 */
export async function generateImageSizes(buffer, sizes = [300, 600, 1200]) {
  try {
    const results = {}
    
    for (const size of sizes) {
      const resizedBuffer = await sharp(buffer)
        .resize(size, size, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toBuffer()
      
      results[`size_${size}`] = {
        buffer: resizedBuffer,
        size: resizedBuffer.length,
        dimensions: await sharp(resizedBuffer).metadata()
      }
    }
    
    return results
  } catch (error) {
    throw new Error(`Image size generation failed: ${error.message}`)
  }
}

/**
 * Optimize image for web delivery
 */
export async function optimizeForWeb(buffer, options = {}) {
  try {
    const config = {
      quality: 85,
      progressive: true,
      optimizeScans: true,
      ...options
    }
    
    // Check if WebP is supported/requested
    if (config.format === 'webp') {
      return await sharp(buffer)
        .webp({ 
          quality: config.quality,
          effort: 6 // Max compression effort
        })
        .toBuffer()
    }
    
    // Default to optimized JPEG
    return await sharp(buffer)
      .jpeg({
        quality: config.quality,
        progressive: config.progressive,
        optimizeScans: config.optimizeScans,
        mozjpeg: true
      })
      .toBuffer()
  } catch (error) {
    throw new Error(`Web optimization failed: ${error.message}`)
  }
}

/**
 * Create image collage from multiple images
 */
export async function createImageCollage(imageBuffers, options = {}) {
  try {
    const config = {
      width: 1200,
      height: 800,
      padding: 10,
      backgroundColor: '#ffffff',
      ...options
    }
    
    if (imageBuffers.length === 0) {
      throw new Error('No images provided for collage')
    }
    
    // Calculate grid dimensions
    const cols = Math.ceil(Math.sqrt(imageBuffers.length))
    const rows = Math.ceil(imageBuffers.length / cols)
    
    const cellWidth = Math.floor((config.width - config.padding * (cols + 1)) / cols)
    const cellHeight = Math.floor((config.height - config.padding * (rows + 1)) / rows)
    
    // Create base image
    let collage = sharp({
      create: {
        width: config.width,
        height: config.height,
        channels: 3,
        background: config.backgroundColor
      }
    })
    
    // Prepare composite operations
    const compositeOps = []
    
    for (let i = 0; i < imageBuffers.length; i++) {
      const row = Math.floor(i / cols)
      const col = i % cols
      
      const x = config.padding + col * (cellWidth + config.padding)
      const y = config.padding + row * (cellHeight + config.padding)
      
      // Resize image to fit cell
      const resizedImage = await sharp(imageBuffers[i])
        .resize(cellWidth, cellHeight, {
          fit: 'cover',
          position: 'center'
        })
        .toBuffer()
      
      compositeOps.push({
        input: resizedImage,
        left: x,
        top: y
      })
    }
    
    // Apply all composite operations
    const collageBuffer = await collage
      .composite(compositeOps)
      .jpeg({ quality: 90 })
      .toBuffer()
    
    return collageBuffer
  } catch (error) {
    throw new Error(`Collage creation failed: ${error.message}`)
  }
}