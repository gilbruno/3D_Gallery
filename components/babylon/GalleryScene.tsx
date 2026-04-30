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
  createSkirtingMaterial,
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
  /** Callback déclenché au survol d'une œuvre — null = fin du survol */
  onArtworkHover?: (artwork: ArtworkConfig | null) => void
}

export default function GalleryScene({
  slug,
  exhibition,
  onArtworkClick,
  onArtworkHover,
}: GallerySceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const handleSceneReady = useCallback(
    async (scene: Scene, canvas: HTMLCanvasElement) => {
      console.log('[GalleryScene] scene ready — Phase 3 init', { slug })

      canvasRef.current = canvas

      // Étape 6 : éclairage ambiant + fill + shadow generator
      const { shadowGenerator } = await setupLighting(scene)

      // Étape 5 : construction de la salle procédurale
      const room = await buildRoom(scene, ROOM_DIMENSIONS)

      // Murs épais comme shadow casters — leur volume (CreateBox avec depth=0.3)
      // projette des ombres portées réalistes sur le sol (arête supérieure visible).
      // Sol comme receiver uniquement — c'est lui qui affiche les ombres des murs.
      const wallMeshes = [
        room.walls.back,
        room.walls.front,
        room.walls.left,
        room.walls.right,
        ...room.skirtings,
      ]
      for (const mesh of wallMeshes) {
        shadowGenerator.addShadowCaster(mesh)
        mesh.receiveShadows = true
      }
      // Le sol reçoit les ombres mais ne les projette pas (plan horizontal)
      room.floor.receiveShadows = true

      // Étape 7 : caméra first-person
      await setupCamera(scene, canvas)

      // Étape 8 : matériaux des surfaces (galerie ouverte sans plafond)
      const [wallMat, floorMat, skirtingMat] = await Promise.all([
        createWallMaterial(scene),
        createFloorMaterial(scene),
        createSkirtingMaterial(scene),
      ])

      room.floor.material = floorMat
      room.walls.back.material = wallMat
      room.walls.front.material = wallMat
      room.walls.left.material = wallMat
      room.walls.right.material = wallMat
      for (const skirting of room.skirtings) {
        skirting.material = skirtingMat
      }

      // ---------------------------------------------------------------
      // Phase 3 : chargement des œuvres
      // ---------------------------------------------------------------

      const config: ExhibitionConfig | null = exhibition ?? null

      console.log('[GalleryScene] exhibition prop:', config ? `${config.rooms[0]?.artworks?.length} artworks` : 'NULL')

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

      const handleHover = (artwork: ArtworkConfig | null) => {
        onArtworkHover?.(artwork)
      }

      await loadArtworks(roomConfig.artworks, scene, handleClick, handleHover)

      console.log(
        `[GalleryScene] ${roomConfig.artworks.length} œuvre(s) chargée(s) pour "${config.title}"`
      )
    },
    [slug, exhibition, onArtworkClick, onArtworkHover]
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
