'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import LoadingScreen from '@/components/ui/LoadingScreen'
import ArtworkPopup from '@/components/ui/ArtworkPopup'
import GalleryHeader from '@/components/ui/GalleryHeader'
import GalleryFooter from '@/components/ui/GalleryFooter'
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
  const [hoveredArtwork, setHoveredArtwork] = useState<ArtworkConfig | null>(null)

  const handleArtworkClick = (artwork: ArtworkConfig) => {
    console.log('[GalleryClient] artwork clicked:', artwork.meta.title)
  }

  const handleArtworkHover = (artwork: ArtworkConfig | null) => {
    setHoveredArtwork(artwork)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <GalleryHeader exhibitionTitle={exhibition?.title} />
      <main style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <GalleryScene
          slug={slug}
          exhibition={exhibition ?? undefined}
          onArtworkClick={handleArtworkClick}
          onArtworkHover={handleArtworkHover}
        />
        <ArtworkPopup artwork={hoveredArtwork} />
      </main>
      <GalleryFooter />
    </div>
  )
}
