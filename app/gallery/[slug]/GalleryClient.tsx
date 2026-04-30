'use client'

import dynamic from 'next/dynamic'
import LoadingScreen from '@/components/ui/LoadingScreen'
import type { ArtworkConfig } from '@/data/exhibitions/schema'

// Import dynamique avec ssr: false — obligatoire, Babylon.js accède à window/document
const GalleryScene = dynamic(
  () => import('@/components/babylon/GalleryScene'),
  {
    ssr: false,
    loading: () => <LoadingScreen />,
  }
)

interface GalleryClientProps {
  slug: string
}

export default function GalleryClient({ slug }: GalleryClientProps) {
  const handleArtworkClick = (artwork: ArtworkConfig) => {
    // Phase 4 : ouvrira ArtworkModal
    console.log('[GalleryClient] artwork clicked:', artwork.meta.title)
  }

  return (
    <GalleryScene
      slug={slug}
      onArtworkClick={handleArtworkClick}
    />
  )
}
