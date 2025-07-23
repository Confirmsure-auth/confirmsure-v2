// 12. Create app/not-found.js (404 Page)
import Link from 'next/link'
import { Shield, AlertCircle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="flex items-center justify-center mb-6">
          <Shield className="h-12 w-12 text-confirmsure-blue mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">ConfirmSure</h1>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md">
          <AlertCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h2>
          <p className="text-gray-600 mb-6">
            The QR code you scanned doesn't match any product in our authentication system. 
            This could indicate a counterfeit product.
          </p>
          <div className="space-y-3">
            <Link href="/" className="btn-primary block">
              Go to Homepage
            </Link>
            <p className="text-sm text-gray-500">
              If you believe this is an error, please contact the manufacturer.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
