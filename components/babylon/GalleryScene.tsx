'use client'

import { useCallback, useRef } from 'react'
import type { Scene } from '@babylonjs/core'
import BabylonCanvas from './BabylonCanvas'
import { setupLighting } from './LightingSetup'
import { buildRoom } from './RoomBuilder'
import { setupCamera } from './CameraController'
import type { CameraControls } from './CameraController'
import { loadArtworks } from './ArtworkLoader'
import { buildWindows } from './WindowsBuilder'
import { buildFurniture } from './GalleryFurniture'
import {
  createWallMaterial,
  createFloorMaterial,
  createSkirtingMaterial,
} from '@/lib/babylon/materials'
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
  /**
   * Appelé quand le mode détail change (true = caméra zoomée sur une œuvre).
   * Permet à GalleryClient d'afficher/masquer le bouton "Sortir du mode détail".
   */
  onDetailModeChange?: (inDetail: boolean) => void
  /**
   * Appelé une fois la caméra initialisée, avec les contrôles permettant
   * d'appeler focusOnArtwork / exitDetailMode depuis React.
   */
  onCameraReady?: (controls: CameraControls) => void
}

export default function GalleryScene({
  slug,
  exhibition,
  onArtworkClick,
  onArtworkHover,
  onDetailModeChange,
  onCameraReady,
}: GallerySceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  /** Référence aux contrôles caméra pour le mode détail */
  const cameraControlsRef = useRef<CameraControls | null>(null)

  const handleSceneReady = useCallback(
    async (scene: Scene, canvas: HTMLCanvasElement) => {
      console.log('[GalleryScene] scene ready — Phase 3 init', { slug })

      canvasRef.current = canvas

      // Étape 6 : éclairage ambiant + fill + shadow generator
      const { shadowGenerator } = await setupLighting(scene)

      // Étape 5 : construction de la salle procédurale
      const room = await buildRoom(scene, ROOM_DIMENSIONS)

      // Fenêtres hautes avec lumière naturelle sur le mur gauche
      const { shadowGenerator: winShadows } = await buildWindows(scene)

      room.floor.receiveShadows = true
      for (const mesh of [room.walls.back, room.walls.front, ...room.wallLeftSegments, ...room.wallRightSegments, ...room.skirtings]) {
        winShadows.addShadowCaster(mesh)
      }

      // Murs épais comme shadow casters
      const wallMeshes = [
        room.walls.back,
        room.walls.front,
        ...room.wallLeftSegments,
        ...room.wallRightSegments,
        ...room.skirtings,
      ]
      for (const mesh of wallMeshes) {
        shadowGenerator.addShadowCaster(mesh)
        mesh.receiveShadows = true
      }
      room.floor.receiveShadows = true

      // Étape 7 : caméra first-person avec contrôles de mode détail
      const { camera: _camera, controls } = await setupCamera(scene, canvas)

      // Stocke les contrôles et notifie GalleryClient
      cameraControlsRef.current = controls
      onCameraReady?.(controls)

      // Étape 8 : matériaux des surfaces (galerie ouverte sans plafond)
      const [wallMat, floorMat, skirtingMat] = await Promise.all([
        createWallMaterial(scene),
        createFloorMaterial(scene),
        createSkirtingMaterial(scene),
      ])

      room.floor.material = floorMat
      room.walls.back.material = wallMat
      room.walls.front.material = wallMat
      for (const seg of room.wallLeftSegments) seg.material = wallMat
      for (const seg of room.wallRightSegments) seg.material = wallMat
      for (const skirting of room.skirtings) skirting.material = skirtingMat

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

        // Zoom smooth vers l'œuvre via les contrôles caméra
        const ctrl = cameraControlsRef.current
        if (ctrl) {
          ctrl.focusOnArtwork(artwork)
          onDetailModeChange?.(true)
        }

        // Notifie également le parent (GalleryClient) pour d'éventuels side-effects
        onArtworkClick?.(artwork)
      }

      const handleHover = (artwork: ArtworkConfig | null) => {
        onArtworkHover?.(artwork)
      }

      await buildFurniture(scene)

      await loadArtworks(roomConfig.artworks, scene, handleClick, handleHover)

      console.log(
        `[GalleryScene] ${roomConfig.artworks.length} œuvre(s) chargée(s) pour "${config.title}"`
      )
    },
    [slug, exhibition, onArtworkClick, onArtworkHover, onDetailModeChange, onCameraReady]
  )

  const handleRender = useCallback((_scene: Scene) => {
    // Phase 4 : logique par frame (animations, portails, UI overlay)
  }, [])

  return (
    <div className="w-full bg-[#f7f7f7]" style={{ flex: 1, minHeight: 0 }}>
      <BabylonCanvas
        onSceneReady={handleSceneReady}
        onRender={handleRender}
        className="w-full h-full block"
      />
    </div>
  )
}
