// 5. Create postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

// 6. Create next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['via.placeholder.com', 'owevfzpqvrejnuzkmkkv.supabase.co'],
  },
}

module.exports = nextConfig
