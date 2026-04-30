'use client'

import { useCallback, useRef } from 'react'
import type { Scene } from '@babylonjs/core'
import BabylonCanvas from './BabylonCanvas'
import { setupLighting } from './LightingSetup'
import { buildRoom } from './RoomBuilder'
import { setupCamera } from './CameraController'
import { loadArtworks } from './ArtworkLoader'
import {
  createWallMaterial,
  createFloorMaterial,
  createCeilingMaterial,
} from '@/lib/babylon/materials'
// Les matériaux retournés sont désormais des StandardMaterial (pas PBRMaterial)
// — typage implicite via inférence, pas besoin d'importer le type explicitement
import type { ArtworkConfig, ExhibitionConfig } from '@/data/exhibitions/schema'

const ROOM_DIMENSIONS = { width: 10, height: 4, depth: 15 }

interface GallerySceneProps {
  /** Slug de l'exposition — utilisé pour charger le bon JSON */
  slug?: string
  /** Données d'exposition pré-chargées (optionnel, sinon chargées depuis le slug) */
  exhibition?: ExhibitionConfig
  /** Callback déclenché quand l'utilisateur clique sur une œuvre */
  onArtworkClick?: (artwork: ArtworkConfig) => void
}

export default function GalleryScene({
  slug,
  exhibition,
  onArtworkClick,
}: GallerySceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const handleSceneReady = useCallback(
    async (scene: Scene, canvas: HTMLCanvasElement) => {
      console.log('[GalleryScene] scene ready — Phase 3 init', { slug })

      canvasRef.current = canvas

      // Étape 6 : éclairage ambiant + fill
      await setupLighting(scene)

      // Étape 5 : construction de la salle procédurale
      const room = await buildRoom(scene, ROOM_DIMENSIONS)

      // Étape 7 : caméra first-person
      await setupCamera(scene, canvas)

      // Étape 8 : matériaux PBR des surfaces
      const [wallMat, floorMat, ceilingMat] = await Promise.all([
        createWallMaterial(scene),
        createFloorMaterial(scene),
        createCeilingMaterial(scene),
      ])

      room.floor.material = floorMat
      room.ceiling.material = ceilingMat
      room.walls.back.material = wallMat
      room.walls.front.material = wallMat
      room.walls.left.material = wallMat
      room.walls.right.material = wallMat

      // ---------------------------------------------------------------
      // Phase 3 : chargement des œuvres
      // ---------------------------------------------------------------

      // Résolution de la config exposition
      let config: ExhibitionConfig | null = exhibition ?? null

      if (!config && slug) {
        try {
          // Import dynamique du JSON (Next.js le bundle statiquement)
          const mod = await import(`@/data/exhibitions/${slug}.json`)
          config = mod.default as ExhibitionConfig
        } catch (err) {
          console.error(`[GalleryScene] impossible de charger l'exposition "${slug}"`, err)
        }
      }

      if (!config) {
        console.warn('[GalleryScene] aucune config exposition — scène vide')
        return
      }

      // Seule la première salle est chargée pour l'instant (multi-salles = Phase 4)
      const roomConfig = config.rooms[0]
      if (!roomConfig) return

      const handleClick = (artwork: ArtworkConfig) => {
        console.log('[GalleryScene] clic œuvre :', artwork.meta.title, artwork)
        onArtworkClick?.(artwork)
      }

      await loadArtworks(roomConfig.artworks, scene, handleClick)

      console.log(
        `[GalleryScene] ${roomConfig.artworks.length} œuvre(s) chargée(s) pour "${config.title}"`
      )
    },
    [slug, exhibition, onArtworkClick]
  )

  const handleRender = useCallback((_scene: Scene) => {
    // Phase 4 : logique par frame (animations, portails, UI overlay)
  }, [])

  return (
    <div className="w-full h-screen bg-[#f7f7f7]">
      <BabylonCanvas
        onSceneReady={handleSceneReady}
        onRender={handleRender}
        className="w-full h-full block"
      />
    </div>
  )
}
