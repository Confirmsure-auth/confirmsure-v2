import { supabase } from '../../lib/supabase'
import ProductAuthentication from './ProductAuthentication'
import { notFound } from 'next/navigation'

async function getProductData(qrCode) {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        factory:factories(*),
        product_images(*),
        markers:authentication_markers(*)
      `)
      .eq('qr_code', qrCode)
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return null
    }

    return product
  } catch (error) {
    console.error('Error fetching product:', error)
    return null
  }
}

export default async function ProductPage({ params }) {
  const { qrCode } = params
  
  if (!qrCode) {
    notFound()
  }

  const product = await getProductData(qrCode)
  
  if (!product) {
    notFound()
  }

  return <ProductAuthentication product={product} />
}

export async function generateMetadata({ params }) {
  const { qrCode } = params
  const product = await getProductData(qrCode)
  
  if (!product) {
    return {
      title: 'Product Not Found - ConfirmSure',
      description: 'The requested product could not be found.'
    }
  }

  return {
    title: `${product.product_name} - Authentication | ConfirmSure`,
    description: `Verify the authenticity of ${product.product_name}. Manufactured by ${product.factory?.name || 'Unknown Factory'}.`,
    openGraph: {
      title: `${product.product_name} - Authentication`,
      description: `Verify the authenticity of ${product.product_name}`,
      images: product.product_images?.[0]?.image_url ? [product.product_images[0].image_url] : [],
    },
  }
}