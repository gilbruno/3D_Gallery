'use client'

import { useEffect, useRef, useState } from 'react'
import type { ArtworkConfig } from '@/data/exhibitions/schema'

interface ArtworkPopupProps {
  artwork: ArtworkConfig | null
}

/**
 * ArtworkPopup — popup HTML positionnée en bas de l'écran.
 * S'affiche au survol d'une œuvre dans la galerie 3D, remplace le cartel Babylon GUI.
 *
 * L'animation repose sur deux états distincts :
 *  - `visible`  : l'élément est dans le DOM (opacity peut transitioner)
 *  - `animated` : classe CSS qui déclenche opacity=1 + translateY(0)
 *
 * Séquence apparition  : visible=true → RAF → animated=true
 * Séquence disparition : animated=false → attente transition (300ms) → visible=false
 */
export default function ArtworkPopup({ artwork }: ArtworkPopupProps) {
  const [visible, setVisible] = useState(false)
  const [animated, setAnimated] = useState(false)
  const [displayed, setDisplayed] = useState<ArtworkConfig | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (artwork) {
      setDisplayed(artwork)
      setVisible(true)
      // Laisser le navigateur peindre l'élément avant d'activer la transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimated(true))
      })
    } else {
      // Lancer la transition de sortie, puis retirer du DOM
      setAnimated(false)
      timerRef.current = setTimeout(() => {
        setVisible(false)
        setDisplayed(null)
      }, 320)
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [artwork])

  if (!visible || !displayed) return null

  const { meta } = displayed
  const hasPrice = typeof meta.price === 'number'
  const hasMedium = Boolean(meta.medium)

  return (
    <div
      role="tooltip"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '32px',
        left: '50%',
        transform: animated
          ? 'translateX(-50%) translateY(0)'
          : 'translateX(-50%) translateY(10px)',
        opacity: animated ? 1 : 0,
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        zIndex: 100,
        pointerEvents: 'none',
        // Conteneur
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        borderRadius: '12px',
        padding: '20px 28px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        minWidth: '260px',
        maxWidth: '480px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      {/* Titre */}
      <span
        style={{
          fontSize: '18px',
          fontWeight: '700',
          color: '#111111',
          lineHeight: 1.3,
          letterSpacing: '-0.01em',
        }}
      >
        {meta.title}
      </span>

      {/* Artiste · Année */}
      <span
        style={{
          fontSize: '14px',
          fontWeight: '400',
          color: '#555555',
          lineHeight: 1.4,
        }}
      >
        {meta.artist}
        <span style={{ margin: '0 6px', color: '#bbb' }}>·</span>
        {meta.year}
      </span>

      {/* Medium */}
      {hasMedium && (
        <span
          style={{
            fontSize: '13px',
            fontStyle: 'italic',
            color: '#888888',
            lineHeight: 1.4,
          }}
        >
          {meta.medium}
        </span>
      )}

      {/* Prix */}
      {hasPrice && (
        <span
          style={{
            display: 'inline-block',
            alignSelf: 'flex-start',
            marginTop: '4px',
            background: '#f5f5f5',
            color: '#333333',
            fontSize: '12px',
            fontWeight: '500',
            padding: '3px 10px',
            borderRadius: '20px',
            letterSpacing: '0.02em',
          }}
        >
          {meta.price!.toLocaleString('fr-FR')} €
        </span>
      )}
    </div>
  )
}
