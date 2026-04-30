import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Domaines autorisés pour next/image et chargement de textures
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
    ],
  },

  // Headers CORS pour textures cross-origin (CDN d'assets)
  async headers() {
    return [
      {
        source: '/textures/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/models/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },

  webpack(config, { isServer }) {
    if (isServer) {
      // Exclure les packages Babylon.js du bundle serveur
      // Babylon accède à window/document et crasherait le build SSR
      const externals = config.externals ?? []
      const babylonExternals = [
        '@babylonjs/core',
        '@babylonjs/gui',
        '@babylonjs/loaders',
        '@babylonjs/materials',
        '@babylonjs/post-processes',
      ]
      config.externals = Array.isArray(externals)
        ? [...externals, ...babylonExternals]
        : externals
    }
    return config
  },
}

export default nextConfig
