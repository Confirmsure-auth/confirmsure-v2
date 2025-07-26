'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Shield, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle,
  ArrowRight,
  Building2,
  Users
} from 'lucide-react'
import { signIn } from '../../lib/auth'

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false)
})

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/factory/dashboard'
  
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError: setFieldError
  } = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    }
  })

  const onSubmit = async (data) => {
    setIsSubmitting(true)
    setError('')

    try {
      const result = await signIn(data.email, data.password)
      
      if (result.user && result.profile) {
        // Redirect based on user role
        const { role } = result.profile
        
        let destination = redirectTo
        if (role === 'admin') {
          destination = '/admin/dashboard'
        } else if (role === 'factory_manager' || role === 'factory_operator') {
          destination = '/factory/dashboard'
        }
        
        router.push(destination)
      }
    } catch (error) {
      console.error('Sign in error:', error)
      setError(error.message || 'Sign in failed. Please try again.')
      
      // Set specific field errors based on error type
      if (error.message.includes('Invalid login credentials')) {
        setFieldError('email', { message: 'Invalid email or password' })
        setFieldError('password', { message: 'Invalid email or password' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="min-h-screen flex">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-confirmsure-blue">
          <div className="flex flex-col justify-center px-12 text-white">
            <div className="mb-8">
              <div className="flex items-center mb-6">
                <Shield className="h-12 w-12 mr-4" />
                <h1 className="text-4xl font-bold">ConfirmSure</h1>
              </div>
              <h2 className="text-2xl font-semibold mb-4">
                Eliminating Counterfeiting Globally
              </h2>
              <p className="text-blue-100 text-lg leading-relaxed">
                Secure product authentication system protecting brands and consumers 
                through cutting-edge visual verification technology.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-500 p-2 rounded-lg">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Factory Integration</h3>
                  <p className="text-blue-100 text-sm">
                    Seamlessly integrate with your manufacturing processes
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-blue-500 p-2 rounded-lg">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Unbreakable Security</h3>
                  <p className="text-blue-100 text-sm">
                    Advanced authentication that cannot be counterfeited
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-blue-500 p-2 rounded-lg">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Consumer Trust</h3>
                  <p className="text-blue-100 text-sm">
                    Build customer confidence with instant verification
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Sign In Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-md">
            {/* Mobile Header */}
            <div className="lg:hidden text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-confirmsure-blue mr-2" />
                <h1 className="text-2xl font-bold text-gray-900">ConfirmSure</h1>
              </div>
              <p className="text-gray-600">Factory Authentication Portal</p>
            </div>

            {/* Sign In Form */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
                <p className="text-gray-600">Sign in to your factory account</p>
              </div>

              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                    <span className="text-red-700 text-sm">{error}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent transition-colors ${
                      errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Enter your email"
                    disabled={isSubmitting}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent transition-colors ${
                        errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Enter your password"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      disabled={isSubmitting}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      {...register('rememberMe')}
                      type="checkbox"
                      className="h-4 w-4 text-confirmsure-blue focus:ring-confirmsure-blue border-gray-300 rounded"
                      disabled={isSubmitting}
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      Remember me
                    </label>
                  </div>

                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-confirmsure-blue hover:text-blue-600"
                  >
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center px-4 py-3 bg-confirmsure-blue text-white font-medium rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-confirmsure-blue focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-gray-600">
                  Don't have an account?{' '}
                  <Link
                    href="/auth/signup"
                    className="text-confirmsure-blue hover:text-blue-600 font-medium"
                  >
                    Contact your administrator
                  </Link>
                </p>
              </div>
            </div>

            {/* Demo Access */}
            <div className="mt-6 text-center">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-medium text-blue-900 mb-2">Demo Access</h3>
                <p className="text-sm text-blue-700 mb-3">
                  Try the system with demo credentials
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-2 rounded border">
                    <div className="font-medium">Factory Operator</div>
                    <div className="text-gray-600">operator@demo.com</div>
                    <div className="text-gray-600">demo123</div>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <div className="font-medium">Factory Manager</div>
                    <div className="text-gray-600">manager@demo.com</div>
                    <div className="text-gray-600">demo123</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}