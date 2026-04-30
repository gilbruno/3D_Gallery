'use client'

import dynamic from 'next/dynamic'
import LoadingScreen from '@/components/ui/LoadingScreen'
import type { ArtworkConfig, ExhibitionConfig } from '@/data/exhibitions/schema'

const GalleryScene = dynamic(
  () => import('@/components/babylon/GalleryScene'),
  {
    ssr: false,
    loading: () => <LoadingScreen />,
  }
)

interface GalleryClientProps {
  slug: string
  exhibition: ExhibitionConfig | null
}

export default function GalleryClient({ slug, exhibition }: GalleryClientProps) {
  const handleArtworkClick = (artwork: ArtworkConfig) => {
    console.log('[GalleryClient] artwork clicked:', artwork.meta.title)
  }

  return (
    <GalleryScene
      slug={slug}
      exhibition={exhibition ?? undefined}
      onArtworkClick={handleArtworkClick}
    />
  )
}
