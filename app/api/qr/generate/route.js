import { NextResponse } from 'next/server'
import { 
  generateUniqueQRCode, 
  generateQRCodeImage, 
  generateBatchQRCodes,
  generatePrintableQRCode,
  generateStyledQRCode,
  saveQRCodeToStorage,
  logQRCodeGeneration
} from '../../../lib/qr-generator'
import { getCurrentUser } from '../../../lib/auth'
import { supabase } from '../../../lib/supabase'

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

    const body = await request.json()
    const { 
      type = 'single', 
      count = 1, 
      options = {},
      saveToStorage = false,
      productId = null
    } = body

    // Validate request
    if (type === 'batch' && count > 100) {
      return NextResponse.json(
        { error: 'Batch size cannot exceed 100' },
        { status: 400 }
      )
    }

    let result

    switch (type) {
      case 'single':
        result = await generateSingleQRCode(options, saveToStorage, user)
        break
      
      case 'batch':
        result = await generateBatchQRCodesHandler(count, options, user)
        break
      
      case 'printable':
        result = await generatePrintableQRCodeHandler(options, user)
        break
      
      case 'styled':
        result = await generateStyledQRCodeHandler(options, user)
        break
      
      default:
        return NextResponse.json(
          { error: 'Invalid QR code type' },
          { status: 400 }
        )
    }

    // Log generation
    await logQRCodeGeneration(
      Array.isArray(result.qrCodes) ? `batch_${result.qrCodes.length}` : result.qrCode,
      user.id,
      { type, count, options: { ...options, productId } }
    )

    return NextResponse.json({
      success: true,
      ...result,
      generatedAt: new Date().toISOString(),
      generatedBy: user.profile.full_name
    })

  } catch (error) {
    console.error('QR generation error:', error)
    return NextResponse.json(
      { error: error.message || 'QR code generation failed' },
      { status: 500 }
    )
  }
}

async function generateSingleQRCode(options, saveToStorage, user) {
  const qrCode = await generateUniqueQRCode()
  const qrImage = await generateQRCodeImage(qrCode, options)
  
  let storageInfo = null
  if (saveToStorage) {
    storageInfo = await saveQRCodeToStorage(qrCode, qrImage.dataURL)
  }
  
  return {
    qrCode,
    ...qrImage,
    storage: storageInfo
  }
}

async function generateBatchQRCodesHandler(count, options, user) {
  const qrCodes = await generateBatchQRCodes(count, options)
  
  return {
    qrCodes,
    totalGenerated: qrCodes.length,
    batchId: `batch_${Date.now()}`
  }
}

async function generatePrintableQRCodeHandler(options, user) {
  const qrCode = await generateUniqueQRCode()
  const qrImage = await generatePrintableQRCode(qrCode, options)
  
  return {
    qrCode,
    ...qrImage,
    printSpecs: {
      recommendedSize: '2cm x 2cm',
      dpi: 300,
      format: 'PNG'
    }
  }
}

async function generateStyledQRCodeHandler(options, user) {
  const qrCode = await generateUniqueQRCode()
  const qrImage = await generateStyledQRCode(qrCode, options)
  
  return {
    qrCode,
    ...qrImage,
    style: options
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const qrCode = searchParams.get('qrCode')
    const format = searchParams.get('format') || 'png'
    const size = parseInt(searchParams.get('size')) || 256
    
    if (!qrCode) {
      return NextResponse.json(
        { error: 'QR code parameter required' },
        { status: 400 }
      )
    }

    // Generate QR code image
    const qrImage = await generateQRCodeImage(qrCode, { 
      width: size,
      type: `image/${format}`
    })
    
    return NextResponse.json({
      success: true,
      qrCode,
      ...qrImage
    })

  } catch (error) {
    console.error('QR generation error:', error)
    return NextResponse.json(
      { error: error.message || 'QR code generation failed' },
      { status: 500 }
    )
  }
}