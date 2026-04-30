'use client'

import { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import LoadingScreen from '@/components/ui/LoadingScreen'
import ArtworkPopup from '@/components/ui/ArtworkPopup'
import SiteLayout from '@/components/ui/SiteLayout'
import type { ArtworkConfig, ExhibitionConfig } from '@/data/exhibitions/schema'
import type { CameraControls } from '@/components/babylon/CameraController'

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

  // --- Mode détail : caméra zoomée sur une œuvre ---
  const [detailMode, setDetailMode] = useState(false)
  /** Référence aux contrôles caméra Babylon, transmis via onCameraReady */
  const cameraControlsRef = useRef<CameraControls | null>(null)

  const handleCameraReady = (controls: CameraControls) => {
    cameraControlsRef.current = controls
  }

  const handleArtworkClick = (artwork: ArtworkConfig) => {
    console.log('[GalleryClient] artwork clicked:', artwork.meta.title)
    // Le zoom est géré dans GalleryScene via controls.focusOnArtwork.
    // onDetailModeChange notifiera ce composant via handleDetailModeChange.
  }

  const handleArtworkHover = (artwork: ArtworkConfig | null) => {
    setHoveredArtwork(artwork)
  }

  /** Appelé par GalleryScene quand la caméra entre ou sort du mode détail */
  const handleDetailModeChange = (inDetail: boolean) => {
    setDetailMode(inDetail)
  }

  /** Sortie du mode détail : retour smooth vers la position de visite */
  const handleExitDetailMode = () => {
    cameraControlsRef.current?.exitDetailMode()
    // setDetailMode(false) sera aussi déclenché via onDetailModeChange
    // une fois que le lerp est terminé — mais on le fait immédiatement
    // pour masquer le bouton sans attendre la fin de l'animation.
    setDetailMode(false)
  }

  return (
    <SiteLayout exhibitionTitle={exhibition?.title} fullHeightMain>
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <GalleryScene
          slug={slug}
          exhibition={exhibition ?? undefined}
          onArtworkClick={handleArtworkClick}
          onArtworkHover={handleArtworkHover}
          onDetailModeChange={handleDetailModeChange}
          onCameraReady={handleCameraReady}
        />

        {/* Bouton "Sortir du mode détail" — visible uniquement quand la caméra
            est zoomée sur une œuvre. Position absolute dans le <main> relatif. */}
        {detailMode && (
          <button
            onClick={handleExitDetailMode}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              zIndex: 50,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              letterSpacing: '0.05em',
            }}
          >
            <span>&#x2715;</span>
            <span>Sortir du mode détail</span>
          </button>
        )}

        <ArtworkPopup artwork={hoveredArtwork} />
      </div>
    </SiteLayout>
  )
}
