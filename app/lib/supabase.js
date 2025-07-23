import { supabase } from '../../../lib/supabase'
import ProductAuthentication from './ProductAuthentication'
import { notFound } from 'next/navigation'

async function getProduct(qrCode) {
  const { data: product, error } = await supabase
    .from('products')
    .select(`
      *,
      factory:factories(*),
      product_images(*)
    `)
    .eq('qr_code', qrCode)
    .single()

  if (error || !product) {
    return null
  }

  return product
}

export default async function ProductPage({ params }) {
  const product = await getProduct(params.qrCode)

  if (!product) {
    notFound()
  }

  // Log the authentication scan
  await supabase
    .from('authentication_logs')
    .insert({
      product_id: product.id,
      verification_result: 'verified'
    })

  return <ProductAuthentication product={product} />
}
