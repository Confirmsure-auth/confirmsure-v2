import { createClient } from './supabase'

const supabase = createClient()

// User roles and permissions
export const ROLES = {
  ADMIN: 'admin',
  FACTORY_MANAGER: 'factory_manager', 
  FACTORY_OPERATOR: 'factory_operator'
}

export const PERMISSIONS = {
  PRODUCTS: {
    CREATE: 'products:create',
    READ: 'products:read',
    UPDATE: 'products:update',
    DELETE: 'products:delete'
  },
  FACTORIES: {
    CREATE: 'factories:create',
    READ: 'factories:read',
    UPDATE: 'factories:update',
    DELETE: 'factories:delete'
  },
  USERS: {
    CREATE: 'users:create',
    READ: 'users:read',
    UPDATE: 'users:update',
    DELETE: 'users:delete'
  },
  ANALYTICS: {
    READ: 'analytics:read'
  }
}

// Role-based permissions mapping
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS).flatMap(p => Object.values(p)),
  [ROLES.FACTORY_MANAGER]: [
    PERMISSIONS.PRODUCTS.CREATE,
    PERMISSIONS.PRODUCTS.READ,
    PERMISSIONS.PRODUCTS.UPDATE,
    PERMISSIONS.PRODUCTS.DELETE,
    PERMISSIONS.FACTORIES.READ,
    PERMISSIONS.FACTORIES.UPDATE,
    PERMISSIONS.USERS.READ,
    PERMISSIONS.ANALYTICS.READ
  ],
  [ROLES.FACTORY_OPERATOR]: [
    PERMISSIONS.PRODUCTS.CREATE,
    PERMISSIONS.PRODUCTS.READ,
    PERMISSIONS.PRODUCTS.UPDATE
  ]
}

// Password policy requirements
const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  minSpecialChars: 1
}

/**
 * Sign in user with email, password and role validation
 */
export async function signIn(email, password, expectedRole = null) {
  try {
    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError) {
      await logAuthEvent('SIGN_IN_FAILED', { email, error: authError.message })
      throw new Error(`Authentication failed: ${authError.message}`)
    }

    // Get user profile with role information
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*, factory:factories(*)')
      .eq('user_id', authData.user.id)
      .single()

    if (profileError || !profile) {
      await logAuthEvent('PROFILE_FETCH_FAILED', { user_id: authData.user.id })
      throw new Error('User profile not found')
    }

    // Validate role if specified
    if (expectedRole && profile.role !== expectedRole) {
      await logAuthEvent('ROLE_MISMATCH', { 
        user_id: authData.user.id, 
        expected: expectedRole, 
        actual: profile.role 
      })
      throw new Error('Insufficient permissions')
    }

    // Check if user is active
    if (!profile.is_active) {
      await logAuthEvent('INACTIVE_USER_ATTEMPT', { user_id: authData.user.id })
      throw new Error('Account is deactivated')
    }

    await logAuthEvent('SIGN_IN_SUCCESS', { 
      user_id: authData.user.id, 
      role: profile.role,
      factory_id: profile.factory_id 
    })

    return {
      user: authData.user,
      profile,
      session: authData.session
    }
  } catch (error) {
    throw error
  }
}

/**
 * Sign out current user
 */
export async function signOut() {
  try {
    const user = await getCurrentUser()
    
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      throw new Error(`Sign out failed: ${error.message}`)
    }

    if (user) {
      await logAuthEvent('SIGN_OUT_SUCCESS', { user_id: user.id })
    }

    return true
  } catch (error) {
    throw error
  }
}

/**
 * Get current authenticated user with profile
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return null
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*, factory:factories(*)')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      return null
    }

    return {
      ...user,
      profile
    }
  } catch (error) {
    return null
  }
}

/**
 * Check if user has specific permission
 */
export function hasPermission(user, permission) {
  if (!user || !user.profile) {
    return false
  }

  const userRole = user.profile.role
  const rolePermissions = ROLE_PERMISSIONS[userRole] || []
  
  return rolePermissions.includes(permission)
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(user, permissions) {
  return permissions.some(permission => hasPermission(user, permission))
}

/**
 * Check if user has all specified permissions
 */
export function hasAllPermissions(user, permissions) {
  return permissions.every(permission => hasPermission(user, permission))
}

/**
 * Validate password against policy
 */
export function enforcePasswordPolicy(password) {
  const errors = []

  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters long`)
  }

  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (PASSWORD_POLICY.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (PASSWORD_POLICY.requireSpecialChars) {
    const specialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/g
    const matches = password.match(specialChars)
    if (!matches || matches.length < PASSWORD_POLICY.minSpecialChars) {
      errors.push(`Password must contain at least ${PASSWORD_POLICY.minSpecialChars} special character(s)`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Log authentication events for audit trail
 */
export async function logAuthEvent(event, metadata = {}) {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        event_type: 'auth',
        event_name: event,
        metadata,
        ip_address: await getClientIP(),
        user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null,
        created_at: new Date().toISOString()
      }])

    if (error) {
      console.error('Failed to log auth event:', error)
    }
  } catch (error) {
    console.error('Error logging auth event:', error)
  }
}

/**
 * Get client IP address (helper function)
 */
async function getClientIP() {
  try {
    if (typeof window === 'undefined') {
      return null
    }
    
    // In production, this would come from request headers
    // For now, return a placeholder
    return 'client_ip'
  } catch (error) {
    return null
  }
}

/**
 * Create new user with role and factory assignment
 */
export async function createUser(userData) {
  try {
    // Validate password
    const passwordValidation = enforcePasswordPolicy(userData.password)
    if (!passwordValidation.isValid) {
      throw new Error(`Password policy violation: ${passwordValidation.errors.join(', ')}`)
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true
    })

    if (authError) {
      throw new Error(`User creation failed: ${authError.message}`)
    }

    // Create user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert([{
        user_id: authData.user.id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        factory_id: userData.factory_id,
        is_active: true,
        created_by: userData.created_by
      }])
      .select()
      .single()

    if (profileError) {
      // Cleanup auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw new Error(`Profile creation failed: ${profileError.message}`)
    }

    await logAuthEvent('USER_CREATED', {
      user_id: authData.user.id,
      role: userData.role,
      factory_id: userData.factory_id,
      created_by: userData.created_by
    })

    return {
      user: authData.user,
      profile
    }
  } catch (error) {
    throw error
  }
}

/**
 * Update user role and permissions
 */
export async function updateUserRole(userId, newRole, updatedBy) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ 
        role: newRole,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Role update failed: ${error.message}`)
    }

    await logAuthEvent('ROLE_UPDATED', {
      user_id: userId,
      new_role: newRole,
      updated_by: updatedBy
    })

    return data
  } catch (error) {
    throw error
  }
}

/**
 * Deactivate user account
 */
export async function deactivateUser(userId, deactivatedBy) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`User deactivation failed: ${error.message}`)
    }

    await logAuthEvent('USER_DEACTIVATED', {
      user_id: userId,
      deactivated_by: deactivatedBy
    })

    return data
  } catch (error) {
    throw error
  }
}