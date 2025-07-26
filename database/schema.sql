-- ConfirmSure Database Schema
-- Phase 2: Enhanced schema with authentication, audit, and security features

-- Enable Row Level Security
ALTER DATABASE postgres SET row_security = on;

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'factory_manager', 'factory_operator');
CREATE TYPE product_status AS ENUM ('draft', 'pending', 'approved', 'published', 'archived');
CREATE TYPE marker_type AS ENUM ('color_dot', 'pattern', 'texture', 'hologram', 'uv_mark', 'microprint');
CREATE TYPE audit_event_type AS ENUM ('auth', 'product', 'factory', 'user', 'system');

-- Enhanced factories table
CREATE TABLE IF NOT EXISTS factories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  address TEXT,
  country TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  api_key UUID DEFAULT gen_random_uuid() UNIQUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'factory_operator',
  factory_id UUID REFERENCES factories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced products table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_code TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL,
  description TEXT,
  batch_id TEXT,
  serial_number TEXT,
  manufacturing_date DATE,
  expiry_date DATE,
  status product_status DEFAULT 'draft',
  factory_id UUID NOT NULL REFERENCES factories(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced product images table
CREATE TABLE IF NOT EXISTS product_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  image_type TEXT DEFAULT 'product',
  angle_description TEXT,
  is_primary BOOLEAN DEFAULT false,
  file_size INTEGER,
  dimensions JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced authentication markers table
CREATE TABLE IF NOT EXISTS authentication_markers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type marker_type NOT NULL,
  position TEXT NOT NULL,
  color TEXT,
  pattern TEXT,
  size_mm DECIMAL,
  coordinates JSONB,
  description TEXT,
  verification_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type audit_event_type NOT NULL,
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Batch operations table
CREATE TABLE IF NOT EXISTS batch_operations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_type TEXT NOT NULL,
  factory_id UUID NOT NULL REFERENCES factories(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  total_items INTEGER NOT NULL DEFAULT 0,
  processed_items INTEGER NOT NULL DEFAULT 0,
  failed_items INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  error_details JSONB DEFAULT '[]',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Batch operation items table
CREATE TABLE IF NOT EXISTS batch_operation_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_operation_id UUID NOT NULL REFERENCES batch_operations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  item_data JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- QR code tracking table
CREATE TABLE IF NOT EXISTS qr_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id),
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  referrer TEXT,
  scan_result TEXT DEFAULT 'success',
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_factory_id ON user_profiles(factory_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

CREATE INDEX IF NOT EXISTS idx_products_qr_code ON products(qr_code);
CREATE INDEX IF NOT EXISTS idx_products_factory_id ON products(factory_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_created_by ON products(created_by);
CREATE INDEX IF NOT EXISTS idx_products_batch_id ON products(batch_id);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_is_primary ON product_images(is_primary);

CREATE INDEX IF NOT EXISTS idx_authentication_markers_product_id ON authentication_markers(product_id);
CREATE INDEX IF NOT EXISTS idx_authentication_markers_type ON authentication_markers(type);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_batch_operations_factory_id ON batch_operations(factory_id);
CREATE INDEX IF NOT EXISTS idx_batch_operations_created_by ON batch_operations(created_by);
CREATE INDEX IF NOT EXISTS idx_batch_operations_status ON batch_operations(status);

CREATE INDEX IF NOT EXISTS idx_qr_scans_product_id ON qr_scans(product_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at ON qr_scans(scanned_at);
CREATE INDEX IF NOT EXISTS idx_qr_scans_country ON qr_scans(country);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_factories_updated_at BEFORE UPDATE ON factories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE authentication_markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_operation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scans ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() AND up.role = 'admin'
        )
    );

CREATE POLICY "Factory managers can view their factory users" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'factory_manager' 
            AND up.factory_id = user_profiles.factory_id
        )
    );

-- Factories policies
CREATE POLICY "Users can view their factory" ON factories
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND (up.factory_id = factories.id OR up.role = 'admin')
        )
    );

CREATE POLICY "Admins can manage all factories" ON factories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() AND up.role = 'admin'
        )
    );

-- Products policies
CREATE POLICY "Users can view products from their factory" ON products
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND (up.factory_id = products.factory_id OR up.role = 'admin')
        )
    );

CREATE POLICY "Factory users can create products for their factory" ON products
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.factory_id = products.factory_id
            AND up.role IN ('factory_manager', 'factory_operator')
        )
    );

CREATE POLICY "Factory users can update their factory products" ON products
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.factory_id = products.factory_id
            AND up.role IN ('factory_manager', 'factory_operator')
        )
    );

-- Product images policies
CREATE POLICY "Users can view images for accessible products" ON product_images
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM products p 
            JOIN user_profiles up ON up.user_id = auth.uid()
            WHERE p.id = product_images.product_id 
            AND (up.factory_id = p.factory_id OR up.role = 'admin')
        )
    );

-- Authentication markers policies
CREATE POLICY "Users can view markers for accessible products" ON authentication_markers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM products p 
            JOIN user_profiles up ON up.user_id = auth.uid()
            WHERE p.id = authentication_markers.product_id 
            AND (up.factory_id = p.factory_id OR up.role = 'admin')
        )
    );

-- QR scans policies (public read for product verification)
CREATE POLICY "Anyone can view QR scan data" ON qr_scans
    FOR SELECT USING (true);

CREATE POLICY "System can insert QR scan data" ON qr_scans
    FOR INSERT WITH CHECK (true);

-- Audit logs policies
CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() AND up.role = 'admin'
        )
    );

-- Insert default system settings
INSERT INTO system_settings (key, value, description, is_public) VALUES
('app_name', '"ConfirmSure"', 'Application name', true),
('app_version', '"1.0.0"', 'Application version', true),
('max_images_per_product', '6', 'Maximum number of images per product', false),
('max_file_size_mb', '10', 'Maximum file size for uploads in MB', false),
('qr_code_prefix', '"CS"', 'Prefix for QR codes', false),
('password_policy', '{"minLength": 8, "requireUppercase": true, "requireLowercase": true, "requireNumbers": true, "requireSpecialChars": true}', 'Password policy configuration', false)
ON CONFLICT (key) DO NOTHING;

-- Create admin user function
CREATE OR REPLACE FUNCTION create_admin_user(
    admin_email TEXT,
    admin_password TEXT,
    admin_name TEXT
) RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- This would be called from the application layer
    -- after creating the auth user via Supabase admin API
    
    INSERT INTO user_profiles (user_id, email, full_name, role, is_active)
    VALUES (new_user_id, admin_email, admin_name, 'admin', true);
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate unique QR codes
CREATE OR REPLACE FUNCTION generate_qr_code() RETURNS TEXT AS $$
DECLARE
    prefix TEXT;
    new_code TEXT;
    counter INTEGER := 0;
BEGIN
    SELECT value::TEXT FROM system_settings WHERE key = 'qr_code_prefix' INTO prefix;
    IF prefix IS NULL THEN
        prefix := 'CS';
    ELSE
        prefix := trim(prefix, '"');
    END IF;
    
    LOOP
        -- Generate random 6-digit code
        new_code := prefix || '-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
        
        -- Check if code already exists
        IF NOT EXISTS (SELECT 1 FROM products WHERE qr_code = new_code) THEN
            RETURN new_code;
        END IF;
        
        counter := counter + 1;
        IF counter > 100 THEN
            RAISE EXCEPTION 'Unable to generate unique QR code after 100 attempts';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to log QR scan events
CREATE OR REPLACE FUNCTION log_qr_scan(
    p_product_id UUID,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_country TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_referrer TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    scan_id UUID;
BEGIN
    INSERT INTO qr_scans (
        product_id, 
        ip_address, 
        user_agent, 
        country, 
        city, 
        referrer
    ) VALUES (
        p_product_id, 
        p_ip_address, 
        p_user_agent, 
        p_country, 
        p_city, 
        p_referrer
    ) RETURNING id INTO scan_id;
    
    RETURN scan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create materialized view for dashboard statistics
CREATE MATERIALIZED VIEW factory_stats AS
SELECT 
    f.id as factory_id,
    f.name as factory_name,
    COUNT(p.id) as total_products,
    COUNT(CASE WHEN p.status = 'published' THEN 1 END) as published_products,
    COUNT(CASE WHEN p.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as products_last_30_days,
    COUNT(CASE WHEN p.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as products_last_7_days,
    COUNT(CASE WHEN p.created_at >= CURRENT_DATE THEN 1 END) as products_today,
    MAX(p.created_at) as last_product_created
FROM factories f
LEFT JOIN products p ON f.id = p.factory_id
GROUP BY f.id, f.name;

-- Create unique index for materialized view
CREATE UNIQUE INDEX idx_factory_stats_factory_id ON factory_stats(factory_id);

-- Refresh materialized view function
CREATE OR REPLACE FUNCTION refresh_factory_stats() RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY factory_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set up automatic refresh of materialized view (every hour)
-- This would be handled by a cron job or scheduled function in production