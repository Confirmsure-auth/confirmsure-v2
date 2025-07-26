import QRCode from 'qrcode'
import { createClient } from './supabase'

const supabase = createClient()

// QR code generation configuration
const QR_CONFIG = {
  errorCorrectionLevel: 'M', // Medium error correction
  type: 'image/png',
  quality: 0.92,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  },
  width: 256 // Default size
}

// Generate unique QR code with format CS-XXXXXX
export async function generateUniqueQRCode() {
  const maxAttempts = 100
  let attempts = 0
  
  while (attempts < maxAttempts) {
    // Generate 6-digit random number
    const randomNum = Math.floor(Math.random() * 900000) + 100000
    const qrCode = `CS-${randomNum}`
    
    // Check if QR code already exists
    const { data, error } = await supabase
      .from('products')
      .select('qr_code')
      .eq('qr_code', qrCode)
      .single()
    
    if (error && error.code === 'PGRST116') {
      // No matching row found - QR code is unique
      return qrCode
    }
    
    if (error) {
      throw new Error(`Database error checking QR code uniqueness: ${error.message}`)
    }
    
    attempts++
  }
  
  throw new Error(`Unable to generate unique QR code after ${maxAttempts} attempts`)
}

// Generate QR code image data URL
export async function generateQRCodeImage(qrCode, options = {}) {
  try {
    const config = { ...QR_CONFIG, ...options }
    
    // The QR code will link to the product verification page
    const verificationURL = `${process.env.NEXT_PUBLIC_APP_URL || 'https://confirmsure.com'}/product/${qrCode}`
    
    // Generate QR code as data URL
    const qrDataURL = await QRCode.toDataURL(verificationURL, config)
    
    return {
      dataURL: qrDataURL,
      verificationURL,
      format: 'png',
      size: config.width
    }
  } catch (error) {
    throw new Error(`QR code generation failed: ${error.message}`)
  }
}

// Generate QR code with custom logo
export async function generateQRCodeWithLogo(qrCode, logoPath, options = {}) {
  try {
    const config = {
      ...QR_CONFIG,
      ...options,
      errorCorrectionLevel: 'H' // High error correction for logo overlay
    }
    
    const verificationURL = `${process.env.NEXT_PUBLIC_APP_URL || 'https://confirmsure.com'}/product/${qrCode}`
    
    // Generate base QR code
    const qrBuffer = await QRCode.toBuffer(verificationURL, {
      ...config,
      type: 'png'
    })
    
    // If no logo provided, return basic QR code
    if (!logoPath) {
      const dataURL = `data:image/png;base64,${qrBuffer.toString('base64')}`
      return {
        dataURL,
        verificationURL,
        format: 'png',
        size: config.width
      }
    }
    
    // This would require additional image processing with Sharp
    // For now, returning basic QR code
    const dataURL = `data:image/png;base64,${qrBuffer.toString('base64')}`
    
    return {
      dataURL,
      verificationURL,
      format: 'png',
      size: config.width,
      hasLogo: false
    }
  } catch (error) {
    throw new Error(`QR code with logo generation failed: ${error.message}`)
  }
}

// Generate multiple QR codes for batch operations
export async function generateBatchQRCodes(count, options = {}) {
  try {
    if (count > 1000) {
      throw new Error('Batch size cannot exceed 1000 QR codes')
    }
    
    const qrCodes = []
    const config = { ...QR_CONFIG, ...options }
    
    for (let i = 0; i < count; i++) {
      const qrCode = await generateUniqueQRCode()
      const qrImage = await generateQRCodeImage(qrCode, config)
      
      qrCodes.push({
        qrCode,
        ...qrImage,
        index: i + 1
      })
    }
    
    return qrCodes
  } catch (error) {
    throw new Error(`Batch QR code generation failed: ${error.message}`)
  }
}

// Validate QR code format
export function validateQRCodeFormat(qrCode) {
  const qrCodeRegex = /^CS-\d{6}$/
  return qrCodeRegex.test(qrCode)
}

// Extract QR code from verification URL
export function extractQRCodeFromURL(url) {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    
    // Expected format: /product/CS-XXXXXX
    if (pathParts.length >= 3 && pathParts[1] === 'product') {
      const qrCode = pathParts[2]
      
      if (validateQRCodeFormat(qrCode)) {
        return qrCode
      }
    }
    
    return null
  } catch (error) {
    return null
  }
}

// Generate QR code for printing (higher resolution)
export async function generatePrintableQRCode(qrCode, options = {}) {
  const printConfig = {
    ...QR_CONFIG,
    width: 512, // Higher resolution for printing
    margin: 4, // Larger margin for printing
    ...options
  }
  
  return await generateQRCodeImage(qrCode, printConfig)
}

// Generate QR code with custom styling
export async function generateStyledQRCode(qrCode, style = {}) {
  const styledConfig = {
    ...QR_CONFIG,
    color: {
      dark: style.darkColor || '#4169E1', // ConfirmSure blue
      light: style.lightColor || '#FFFFFF'
    },
    width: style.size || 256,
    margin: style.margin || 2,
    ...style
  }
  
  return await generateQRCodeImage(qrCode, styledConfig)
}

// Generate QR code as SVG (vector format)
export async function generateQRCodeSVG(qrCode, options = {}) {
  try {
    const config = { ...QR_CONFIG, ...options }
    const verificationURL = `${process.env.NEXT_PUBLIC_APP_URL || 'https://confirmsure.com'}/product/${qrCode}`
    
    const svgString = await QRCode.toString(verificationURL, {
      type: 'svg',
      color: config.color,
      margin: config.margin,
      errorCorrectionLevel: config.errorCorrectionLevel,
      width: config.width
    })
    
    return {
      svg: svgString,
      verificationURL,
      format: 'svg',
      size: config.width
    }
  } catch (error) {
    throw new Error(`SVG QR code generation failed: ${error.message}`)
  }
}

// Save QR code to Supabase storage
export async function saveQRCodeToStorage(qrCode, imageData, bucket = 'qr-codes') {
  try {
    // Convert data URL to buffer
    const base64Data = imageData.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')
    
    const fileName = `${qrCode}.png`
    const filePath = `qr-codes/${fileName}`
    
    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: 'image/png',
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
    throw new Error(`QR code storage failed: ${error.message}`)
  }
}

// Verify QR code exists in database
export async function verifyQRCodeExists(qrCode) {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, qr_code, product_name, status')
      .eq('qr_code', qrCode)
      .single()
    
    if (error && error.code === 'PGRST116') {
      return { exists: false, product: null }
    }
    
    if (error) {
      throw new Error(`Database verification failed: ${error.message}`)
    }
    
    return { 
      exists: true, 
      product: data,
      isActive: data.status === 'published'
    }
  } catch (error) {
    throw new Error(`QR code verification failed: ${error.message}`)
  }
}

// Log QR code generation event
export async function logQRCodeGeneration(qrCode, userId, metadata = {}) {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        event_type: 'product',
        event_name: 'QR_CODE_GENERATED',
        user_id: userId,
        resource_type: 'qr_code',
        resource_id: qrCode,
        metadata: {
          qr_code: qrCode,
          ...metadata
        },
        created_at: new Date().toISOString()
      }])
    
    if (error) {
      console.error('Failed to log QR code generation:', error)
    }
  } catch (error) {
    console.error('Error logging QR code generation:', error)
  }
}

// Get QR code analytics
export async function getQRCodeAnalytics(qrCode, timeframe = '30d') {
  try {
    let dateFilter = new Date()
    
    switch (timeframe) {
      case '24h':
        dateFilter.setDate(dateFilter.getDate() - 1)
        break
      case '7d':
        dateFilter.setDate(dateFilter.getDate() - 7)
        break
      case '30d':
        dateFilter.setDate(dateFilter.getDate() - 30)
        break
      case '90d':
        dateFilter.setDate(dateFilter.getDate() - 90)
        break
      default:
        dateFilter.setDate(dateFilter.getDate() - 30)
    }
    
    // Get product info
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, product_name, created_at')
      .eq('qr_code', qrCode)
      .single()
    
    if (productError) {
      throw new Error(`Product not found: ${productError.message}`)
    }
    
    // Get scan analytics
    const { data: scans, error: scanError } = await supabase
      .from('qr_scans')
      .select('*')
      .eq('product_id', product.id)
      .gte('scanned_at', dateFilter.toISOString())
      .order('scanned_at', { ascending: false })
    
    if (scanError) {
      throw new Error(`Analytics query failed: ${scanError.message}`)
    }
    
    // Calculate analytics
    const totalScans = scans.length
    const uniqueCountries = [...new Set(scans.map(s => s.country).filter(Boolean))].length
    const recentScans = scans.slice(0, 10)
    
    // Group scans by date
    const scansByDate = scans.reduce((acc, scan) => {
      const date = scan.scanned_at.split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {})
    
    return {
      qrCode,
      product: {
        id: product.id,
        name: product.product_name,
        createdAt: product.created_at
      },
      analytics: {
        totalScans,
        uniqueCountries,
        timeframe,
        scansByDate,
        recentScans: recentScans.map(scan => ({
          scannedAt: scan.scanned_at,
          country: scan.country,
          city: scan.city,
          ipAddress: scan.ip_address ? scan.ip_address.replace(/\.\d+$/, '.xxx') : null // Anonymize IP
        }))
      }
    }
  } catch (error) {
    throw new Error(`QR code analytics failed: ${error.message}`)
  }
}