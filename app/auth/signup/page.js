'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { 
  Shield, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Building2,
  User,
  Mail,
  Lock
} from 'lucide-react'
import { userRegistrationSchema } from '../../lib/validation'
import { createUser } from '../../lib/auth'

export default function SignUpPage() {
  const router = useRouter()
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [factories, setFactories] = useState([])
  const [loadingFactories, setLoadingFactories] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setError: setFieldError
  } = useForm({
    resolver: zodResolver(userRegistrationSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      full_name: '',
      role: 'factory_operator',
      factory_id: ''
    }
  })

  const watchedRole = watch('role')

  // Load factories when role requires factory assignment
  const loadFactories = async () => {
    if (loadingFactories) return
    
    setLoadingFactories(true)
    try {
      const response = await fetch('/api/factories')
      if (response.ok) {
        const data = await response.json()
        setFactories(data.factories || [])
      }
    } catch (error) {
      console.error('Failed to load factories:', error)
    } finally {
      setLoadingFactories(false)
    }
  }

  // Load factories when component mounts or role changes
  React.useEffect(() => {
    if (['factory_manager', 'factory_operator'].includes(watchedRole)) {
      loadFactories()
    }
  }, [watchedRole])

  const onSubmit = async (data) => {
    setIsSubmitting(true)
    setError('')

    try {
      const result = await createUser({
        ...data,
        created_by: 'self-registration' // This would be the admin user ID in production
      })
      
      if (result.user && result.profile) {
        setSuccess(true)
        
        // Redirect to sign in after a delay
        setTimeout(() => {
          router.push('/auth/signin?message=account-created')
        }, 3000)
      }
    } catch (error) {
      console.error('Sign up error:', error)
      setError(error.message || 'Account creation failed. Please try again.')
      
      // Set specific field errors
      if (error.message.includes('email')) {
        setFieldError('email', { message: 'Email already exists or is invalid' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 max-w-md w-full mx-4">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-confirmsure-green mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Created!</h2>
            <p className="text-gray-600 mb-6">
              Your account has been successfully created. You will be redirected to sign in shortly.
            </p>
            <Link
              href="/auth/signin"
              className="btn-primary inline-flex items-center"
            >
              Sign In Now
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-confirmsure-blue mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">ConfirmSure</h1>
            </div>
            <p className="text-gray-600">Create Factory Account</p>
          </div>

          {/* Sign Up Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="flex items-center mb-6">
              <Link
                href="/auth/signin"
                className="flex items-center text-gray-600 hover:text-confirmsure-blue mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Link>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
                <p className="text-gray-600 text-sm">Join the ConfirmSure platform</p>
              </div>
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
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Full Name
                </label>
                <input
                  {...register('full_name')}
                  type="text"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent transition-colors ${
                    errors.full_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter your full name"
                  disabled={isSubmitting}
                />
                {errors.full_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
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

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Role
                </label>
                <select
                  {...register('role')}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent transition-colors ${
                    errors.role ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                >
                  <option value="factory_operator">Factory Operator</option>
                  <option value="factory_manager">Factory Manager</option>
                  <option value="admin">System Administrator</option>
                </select>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {watchedRole === 'factory_operator' && 'Can create and manage products'}
                  {watchedRole === 'factory_manager' && 'Can manage factory operations and users'}
                  {watchedRole === 'admin' && 'Full system access across all factories'}
                </p>
              </div>

              {/* Factory Selection */}
              {['factory_manager', 'factory_operator'].includes(watchedRole) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Factory Assignment
                  </label>
                  <select
                    {...register('factory_id')}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent transition-colors ${
                      errors.factory_id ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    disabled={isSubmitting || loadingFactories}
                  >
                    <option value="">Select a factory</option>
                    {factories.map(factory => (
                      <option key={factory.id} value={factory.id}>
                        {factory.name} - {factory.location}
                      </option>
                    ))}
                  </select>
                  {errors.factory_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.factory_id.message}</p>
                  )}
                  {loadingFactories && (
                    <p className="mt-1 text-xs text-gray-500">Loading factories...</p>
                  )}
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Lock className="w-4 h-4 inline mr-1" />
                  Password
                </label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent transition-colors ${
                      errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Create a strong password"
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
                <p className="mt-1 text-xs text-gray-500">
                  Must contain uppercase, lowercase, number, and special character
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    {...register('confirmPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-confirmsure-blue focus:border-transparent transition-colors ${
                      errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Confirm your password"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={isSubmitting}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center px-4 py-3 bg-confirmsure-blue text-white font-medium rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-confirmsure-blue focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600 text-sm">
                Already have an account?{' '}
                <Link
                  href="/auth/signin"
                  className="text-confirmsure-blue hover:text-blue-600 font-medium"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </div>

          {/* Note */}
          <div className="mt-6 text-center">
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Account creation may require approval from your system administrator.
                You will receive an email confirmation once your account is activated.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}