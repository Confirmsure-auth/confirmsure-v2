import { z } from 'zod'

// Common validation patterns
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/
const QR_CODE_REGEX = /^CS-\d{6}$/
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/

// File validation
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// User validation schemas
export const userRegistrationSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .regex(EMAIL_REGEX, 'Invalid email format')
    .max(255, 'Email too long'),
  
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(PASSWORD_REGEX, 'Password must contain uppercase, lowercase, number and special character'),
  
  confirmPassword: z.string(),
  
  full_name: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Full name contains invalid characters'),
  
  role: z.enum(['admin', 'factory_manager', 'factory_operator'], {
    errorMap: () => ({ message: 'Invalid role selected' })
  }),
  
  factory_id: z
    .string()
    .uuid('Invalid factory ID')
    .optional()
    .nullable()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  // Factory operators and managers must have a factory assigned
  if (['factory_manager', 'factory_operator'].includes(data.role)) {
    return data.factory_id != null
  }
  return true
}, {
  message: "Factory assignment required for this role",
  path: ["factory_id"],
})

export const userUpdateSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Full name contains invalid characters')
    .optional(),
  
  role: z.enum(['admin', 'factory_manager', 'factory_operator']).optional(),
  
  factory_id: z
    .string()
    .uuid('Invalid factory ID')
    .optional()
    .nullable(),
  
  is_active: z.boolean().optional()
})

export const passwordChangeSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(PASSWORD_REGEX, 'Password must contain uppercase, lowercase, number and special character'),
  confirm_password: z.string()
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
})

// Factory validation schemas
export const factorySchema = z.object({
  name: z
    .string()
    .min(2, 'Factory name must be at least 2 characters')
    .max(100, 'Factory name too long')
    .regex(/^[a-zA-Z0-9\s&.-]+$/, 'Factory name contains invalid characters'),
  
  location: z
    .string()
    .min(2, 'Location must be at least 2 characters')
    .max(100, 'Location too long'),
  
  contact_email: z
    .string()
    .min(1, 'Contact email is required')
    .regex(EMAIL_REGEX, 'Invalid email format')
    .max(255, 'Email too long'),
  
  contact_phone: z
    .string()
    .regex(PHONE_REGEX, 'Invalid phone number format')
    .optional()
    .nullable(),
  
  address: z
    .string()
    .max(500, 'Address too long')
    .optional()
    .nullable(),
  
  country: z
    .string()
    .min(2, 'Country is required')
    .max(100, 'Country name too long'),
  
  is_active: z.boolean().default(true)
})

// Product validation schemas
export const productSchema = z.object({
  product_name: z
    .string()
    .min(2, 'Product name must be at least 2 characters')
    .max(200, 'Product name too long')
    .regex(/^[a-zA-Z0-9\s&.,()-]+$/, 'Product name contains invalid characters'),
  
  product_type: z
    .string()
    .min(2, 'Product type must be at least 2 characters')
    .max(100, 'Product type too long'),
  
  description: z
    .string()
    .max(1000, 'Description too long')
    .optional()
    .nullable(),
  
  batch_id: z
    .string()
    .max(50, 'Batch ID too long')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Batch ID contains invalid characters')
    .optional()
    .nullable(),
  
  serial_number: z
    .string()
    .max(100, 'Serial number too long')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Serial number contains invalid characters')
    .optional()
    .nullable(),
  
  manufacturing_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional()
    .nullable(),
  
  expiry_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional()
    .nullable(),
  
  factory_id: z
    .string()
    .uuid('Invalid factory ID'),
  
  metadata: z.record(z.any()).default({})
}).refine((data) => {
  // Expiry date must be after manufacturing date
  if (data.manufacturing_date && data.expiry_date) {
    return new Date(data.expiry_date) > new Date(data.manufacturing_date)
  }
  return true
}, {
  message: "Expiry date must be after manufacturing date",
  path: ["expiry_date"],
})

export const productUpdateSchema = productSchema.partial().omit(['factory_id'])

// Authentication marker validation schemas
export const authenticationMarkerSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  
  type: z.enum(['color_dot', 'pattern', 'texture', 'hologram', 'uv_mark', 'microprint'], {
    errorMap: () => ({ message: 'Invalid marker type' })
  }),
  
  position: z
    .string()
    .min(2, 'Position description required')
    .max(200, 'Position description too long'),
  
  color: z
    .string()
    .max(50, 'Color description too long')
    .optional()
    .nullable(),
  
  pattern: z
    .string()
    .max(200, 'Pattern description too long')
    .optional()
    .nullable(),
  
  size_mm: z
    .number()
    .positive('Size must be positive')
    .max(1000, 'Size too large')
    .optional()
    .nullable(),
  
  coordinates: z
    .object({
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
      width: z.number().min(0).max(1).optional(),
      height: z.number().min(0).max(1).optional()
    })
    .optional()
    .nullable(),
  
  description: z
    .string()
    .max(500, 'Description too long')
    .optional()
    .nullable(),
  
  verification_instructions: z
    .string()
    .max(1000, 'Instructions too long')
    .optional()
    .nullable()
})

// File upload validation schemas
export const imageUploadSchema = z.object({
  file: z.instanceof(File, { message: 'File is required' }),
  product_id: z.string().uuid('Invalid product ID'),
  image_type: z.enum(['product', 'marker', 'packaging']).default('product'),
  angle_description: z
    .string()
    .max(100, 'Angle description too long')
    .optional()
    .nullable(),
  is_primary: z.boolean().default(false)
}).refine((data) => {
  return ALLOWED_IMAGE_TYPES.includes(data.file.type)
}, {
  message: "File must be JPEG, PNG, or WebP format",
  path: ["file"],
}).refine((data) => {
  return data.file.size <= MAX_FILE_SIZE
}, {
  message: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`,
  path: ["file"],
})

// QR code validation
export const qrCodeSchema = z.object({
  qr_code: z
    .string()
    .regex(QR_CODE_REGEX, 'Invalid QR code format (must be CS-XXXXXX)')
})

// Search and filter validation schemas
export const productSearchSchema = z.object({
  query: z
    .string()
    .max(100, 'Search query too long')
    .optional(),
  
  factory_id: z
    .string()
    .uuid('Invalid factory ID')
    .optional(),
  
  status: z
    .enum(['draft', 'pending', 'approved', 'published', 'archived'])
    .optional(),
  
  product_type: z
    .string()
    .max(100, 'Product type too long')
    .optional(),
  
  batch_id: z
    .string()
    .max(50, 'Batch ID too long')
    .optional(),
  
  date_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .optional(),
  
  date_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .optional(),
  
  limit: z
    .number()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
  
  offset: z
    .number()
    .min(0, 'Offset cannot be negative')
    .default(0)
}).refine((data) => {
  if (data.date_from && data.date_to) {
    return new Date(data.date_to) >= new Date(data.date_from)
  }
  return true
}, {
  message: "End date must be after start date",
  path: ["date_to"],
})

// Batch operation validation schemas
export const batchOperationSchema = z.object({
  operation_type: z.enum(['create_products', 'update_products', 'delete_products', 'generate_qr_codes']),
  factory_id: z.string().uuid('Invalid factory ID'),
  items: z.array(z.record(z.any())).min(1, 'At least one item required').max(1000, 'Too many items')
})

// API request validation schemas
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc')
})

// Validation utility functions
export function validateFile(file, options = {}) {
  const maxSize = options.maxSize || MAX_FILE_SIZE
  const allowedTypes = options.allowedTypes || ALLOWED_IMAGE_TYPES
  
  const errors = []
  
  if (!file) {
    errors.push('File is required')
    return { isValid: false, errors }
  }
  
  if (file.size > maxSize) {
    errors.push(`File size must be less than ${maxSize / 1024 / 1024}MB`)
  }
  
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File must be one of: ${allowedTypes.join(', ')}`)
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
}

export function validateQRCode(qrCode) {
  return QR_CODE_REGEX.test(qrCode)
}

export function validateEmail(email) {
  return EMAIL_REGEX.test(email)
}

export function validatePhone(phone) {
  return PHONE_REGEX.test(phone)
}

// SQL injection prevention
export function sanitizeForSQL(input) {
  if (typeof input !== 'string') {
    return input
  }
  
  return input
    .replace(/'/g, "''") // Escape single quotes
    .replace(/;/g, '') // Remove semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove SQL comments
    .replace(/\*\//g, '') // Remove SQL comments
}

// XSS prevention
export function sanitizeForHTML(input) {
  if (typeof input !== 'string') {
    return input
  }
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

// Validation error formatter
export function formatValidationErrors(error) {
  if (error.errors) {
    return error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }))
  }
  
  if (error.issues) {
    return error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message
    }))
  }
  
  return [{ field: 'general', message: error.message || 'Validation failed' }]
}

// Rate limiting validation
export function validateRateLimit(key, windowMs = 60000, maxRequests = 100) {
  // This would integrate with your rate limiting store
  // Implementation depends on your rate limiting strategy
  return { allowed: true, remaining: maxRequests - 1, resetTime: Date.now() + windowMs }
}