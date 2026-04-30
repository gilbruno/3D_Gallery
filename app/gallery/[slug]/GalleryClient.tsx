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
  const [detailArtwork, setDetailArtwork] = useState<ArtworkConfig | null>(null)
  /** Référence aux contrôles caméra Babylon, transmis via onCameraReady */
  const cameraControlsRef = useRef<CameraControls | null>(null)

  const handleCameraReady = (controls: CameraControls) => {
    cameraControlsRef.current = controls
  }

  const handleArtworkClick = (artwork: ArtworkConfig) => {
    setDetailArtwork(artwork)
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
    setDetailArtwork(null)
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

        {/* Panneau mode détail — bouton + infos œuvre */}
        {detailMode && (
          <div
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              gap: '0',
              minWidth: '240px',
              maxWidth: '300px',
            }}
          >
            {/* Bouton sortir */}
            <button
              onClick={handleExitDetailMode}
              style={{
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                color: 'rgba(255,255,255,0.75)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderBottom: detailArtwork ? 'none' : '1px solid rgba(255,255,255,0.15)',
                borderRadius: detailArtwork ? '10px 10px 0 0' : '10px',
                padding: '10px 16px',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                width: '100%',
              }}
            >
              <span style={{ fontSize: '13px', opacity: 0.6 }}>&#x2715;</span>
              <span>Sortir du mode détail</span>
            </button>

            {/* Infos œuvre */}
            {detailArtwork && (
              <div
                style={{
                  background: 'rgba(0,0,0,0.7)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '0 0 10px 10px',
                  padding: '16px 18px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {/* Titre */}
                <span
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.92)',
                    letterSpacing: '0.01em',
                    lineHeight: 1.3,
                    fontFamily: 'var(--font-sans, sans-serif)',
                  }}
                >
                  {detailArtwork.meta.title}
                </span>

                {/* Artiste · Année */}
                <span
                  style={{
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.5)',
                    fontFamily: 'var(--font-sans, sans-serif)',
                    fontWeight: 300,
                  }}
                >
                  {detailArtwork.meta.artist}
                  <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
                  {detailArtwork.meta.year}
                </span>

                {/* Medium */}
                {detailArtwork.meta.medium && (
                  <span
                    style={{
                      fontSize: '12px',
                      fontStyle: 'italic',
                      color: 'rgba(255,255,255,0.35)',
                      fontFamily: 'var(--font-sans, sans-serif)',
                    }}
                  >
                    {detailArtwork.meta.medium}
                  </span>
                )}

                {/* Séparateur */}
                {detailArtwork.meta.price && (
                  <div
                    style={{
                      marginTop: '6px',
                      paddingTop: '10px',
                      borderTop: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '10px',
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.3)',
                        fontFamily: 'var(--font-sans, sans-serif)',
                      }}
                    >
                      Prix
                    </span>
                    <span
                      style={{
                        fontSize: '15px',
                        fontWeight: 500,
                        color: 'rgba(255,255,255,0.85)',
                        fontFamily: 'var(--font-sans, sans-serif)',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {detailArtwork.meta.price.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <ArtworkPopup artwork={hoveredArtwork} />
      </div>
    </SiteLayout>
  )
}
