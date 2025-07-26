'use client'
import Link from 'next/link'
import { Shield, ArrowLeft, AlertTriangle, Mail } from 'lucide-react'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-confirmsure-blue mr-2" />
            <h1 className="text-2xl font-bold text-gray-900">ConfirmSure</h1>
          </div>
        </div>

        {/* Unauthorized Message */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <div className="text-center mb-6">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">
              You don't have permission to access this resource.
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-medium text-yellow-800 mb-2">Possible Reasons:</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Your account doesn't have the required permissions</li>
                <li>• Your account is pending activation</li>
                <li>• You're trying to access a restricted area</li>
                <li>• Your session may have expired</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 mb-2">What you can do:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Contact your system administrator</li>
                <li>• Check if you're signed in to the correct account</li>
                <li>• Try signing out and signing back in</li>
                <li>• Request additional permissions if needed</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="w-full flex items-center justify-center px-4 py-3 bg-confirmsure-blue text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </Link>

            <a
              href="mailto:admin@confirmsure.com"
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Mail className="w-4 h-4 mr-2" />
              Contact Administrator
            </a>
          </div>
        </div>

        {/* Additional Help */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Need immediate assistance?{' '}
            <a 
              href="mailto:support@confirmsure.com" 
              className="text-confirmsure-blue hover:text-blue-600 font-medium"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}