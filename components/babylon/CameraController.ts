import type { Scene, UniversalCamera, Mesh } from '@babylonjs/core'
import type { ArtworkConfig } from '@/data/exhibitions/schema'

// ---------------------------------------------------------------------------
// Interface publique exposée aux composants React
// ---------------------------------------------------------------------------
export interface CameraControls {
  /** Zoom smooth vers une œuvre, sauvegarde la position courante */
  focusOnArtwork: (artwork: ArtworkConfig) => void
  /** Retour smooth vers la position sauvegardée avant le zoom */
  exitDetailMode: () => void
  /** Indique si la caméra est actuellement en mode détail */
  isInDetailMode: () => boolean
}

// ---------------------------------------------------------------------------
// Calcule la position caméra et la rotation Y pour faire face à une œuvre
// ---------------------------------------------------------------------------
function computeViewTarget(
  artwork: ArtworkConfig,
  fov: number
): { position: { x: number; y: number; z: number }; rotationY: number } {
  const [ax, ay, az] = artwork.position
  const rotY = artwork.rotation[1]

  // Normale de l'œuvre : un CreatePlane orienté rotY expose sa face +Z locale
  // vers la direction (sin(rotY), 0, cos(rotY)) en espace monde.
  // C'est la direction depuis laquelle la caméra doit regarder l'œuvre.
  const nx = Math.sin(rotY)
  const nz = Math.cos(rotY)

  // Distance calculée pour que l'œuvre tienne dans ~70 % de la hauteur viewport
  const artworkHeight = artwork.dimensions.heightCm / 100
  const rawDist = (artworkHeight / 2) / Math.tan(fov / 2) * 1.5
  const viewDist = Math.max(1.2, Math.min(3.5, rawDist))

  // Position cible = centre de l'œuvre + normale * distance
  // Clamp de sécurité : la caméra reste dans la salle (marge 0.3 m des murs)
  const tx = Math.max(-4.7, Math.min(4.7, ax + nx * viewDist))
  const tz = Math.max(-7.0, Math.min(7.0, az + nz * viewDist))

  // La caméra regarde vers l'œuvre = direction opposée à la normale
  // rotation.y = angle yaw pour pointer vers (ax, az) depuis (tx, tz)
  const targetRotY = Math.atan2(ax - tx, az - tz)

  return {
    position: { x: tx, y: ay, z: tz },
    rotationY: targetRotY,
  }
}

// ---------------------------------------------------------------------------
// Setup principal — retourne la caméra ET les contrôles de mode détail
// ---------------------------------------------------------------------------
export async function setupCamera(
  scene: Scene,
  canvas: HTMLCanvasElement
): Promise<{ camera: UniversalCamera; controls: CameraControls }> {
  const { UniversalCamera, Vector3, MeshBuilder, StandardMaterial, Color3 } = await import('@babylonjs/core')

  const camera = new UniversalCamera('gallery-cam', new Vector3(0, 1.65, 6), scene)
  camera.setTarget(new Vector3(0, 1.65, 0))
  camera.fov = 1.2
  camera.minZ = 0.1
  camera.maxZ = 100
  camera.checkCollisions = true
  camera.applyGravity = false
  camera.ellipsoid = new Vector3(0.4, 0.9, 0.4)
  scene.collisionsEnabled = true
  scene.preventDefaultOnPointerDown = false

  // --- Disque curseur sol ---
  const cursorDisc = MeshBuilder.CreateDisc('cursor-disc', { radius: 0.3, tessellation: 32 }, scene) as Mesh
  cursorDisc.rotation.x = Math.PI / 2
  cursorDisc.isPickable = false
  cursorDisc.setEnabled(false)

  const cursorMat = new StandardMaterial('cursor-disc-mat', scene)
  cursorMat.diffuseColor = new Color3(0.3, 0.3, 0.3)
  cursorMat.emissiveColor = new Color3(0.3, 0.3, 0.3)
  cursorMat.alpha = 0.75
  cursorMat.disableLighting = true
  cursorDisc.material = cursorMat

  // Limites de la salle pour clamp de la cible
  const ROOM_X_MIN = -4.5
  const ROOM_X_MAX = 4.5
  const ROOM_Z_MIN = -7.0
  const ROOM_Z_MAX = 7.0
  const CAMERA_Y = 1.65
  const LERP_FACTOR = 0.08
  const ARRIVE_THRESHOLD = 0.05

  // ---------------------------------------------------------------------------
  // État interne du mode détail
  // ---------------------------------------------------------------------------
  /** Position cible pour le déplacement smooth au clic sol */
  let targetPosition: { x: number; z: number } | null = null

  /** Mode détail actif */
  let detailMode = false

  /**
   * Quand true : inputs clavier et drag souris ignorés,
   * le lerp vers l'œuvre (ou le retour) est en cours.
   */
  let locked = false

  /** Cible de zoom vers une œuvre */
  let detailTarget: { x: number; y: number; z: number; rotY: number } | null = null

  /** Position sauvegardée avant le zoom, pour le retour */
  let savedPosition: { x: number; y: number; z: number; rotY: number } | null = null

  /** Callback appelé une fois arrivé en mode détail ou de retour */
  let onArrivalCallback: (() => void) | null = null

  // --- État du clavier ---
  const keys: Record<string, boolean> = {}
  const onKeyDown = (e: KeyboardEvent) => {
    if (!locked) keys[e.code] = true
  }
  const onKeyUp = (e: KeyboardEvent) => { keys[e.code] = false }
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('keyup', onKeyUp)

  const SPEED = 0.08

  // ---------------------------------------------------------------------------
  // Boucle de rendu — gestion keyboard, drag inertia, lerp sol, lerp œuvre
  // ---------------------------------------------------------------------------
  scene.onBeforeRenderObservable.add(() => {
    camera.rotation.x = 0

    // --- Lerp vers une œuvre (mode détail entrant ou sortant) ---
    if (detailTarget !== null) {
      const dx = detailTarget.x - camera.position.x
      const dy = detailTarget.y - camera.position.y
      const dz = detailTarget.z - camera.position.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

      // Interpolation angulaire (yaw) via angle normalisé
      let dRot = detailTarget.rotY - camera.rotation.y
      // Normalise l'angle entre -PI et PI pour prendre le chemin le plus court
      while (dRot > Math.PI) dRot -= 2 * Math.PI
      while (dRot < -Math.PI) dRot += 2 * Math.PI

      camera.position.x += dx * 0.06
      camera.position.y += dy * 0.06
      camera.position.z += dz * 0.06
      camera.rotation.y += dRot * 0.06

      if (dist < ARRIVE_THRESHOLD && Math.abs(dRot) < 0.01) {
        // Snap sur la cible exacte pour éviter l'oscillation résiduelle
        camera.position.x = detailTarget.x
        camera.position.y = detailTarget.y
        camera.position.z = detailTarget.z
        camera.rotation.y = detailTarget.rotY

        detailTarget = null
        locked = false // déverrouille les inputs une fois arrivé

        if (onArrivalCallback) {
          onArrivalCallback()
          onArrivalCallback = null
        }
      }
      // Pendant le lerp détail, on n'applique pas les autres déplacements
      return
    }

    // --- Inputs clavier (ignorés si locked) ---
    if (!locked) {
      const forward = camera.getDirection(new Vector3(0, 0, 1))
      forward.y = 0
      if (forward.length() > 0.001) forward.normalize()

      const right = camera.getDirection(new Vector3(1, 0, 0))
      right.y = 0
      if (right.length() > 0.001) right.normalize()

      const displacement = Vector3.Zero()

      if (keys['KeyW'] || keys['KeyZ'] || keys['ArrowUp']) {
        displacement.addInPlace(forward.scale(SPEED))
      }
      if (keys['KeyS'] || keys['ArrowDown']) {
        displacement.addInPlace(forward.scale(-SPEED))
      }
      if (keys['KeyA'] || keys['KeyQ'] || keys['ArrowLeft']) {
        displacement.addInPlace(right.scale(-SPEED))
      }
      if (keys['KeyD'] || keys['ArrowRight']) {
        displacement.addInPlace(right.scale(SPEED))
      }

      // Inertie souris (rotation yaw + avance)
      if (Math.abs(velocityX) > 0.00001) {
        camera.rotation.y += velocityX
        velocityX *= DAMPING
      }
      if (Math.abs(velocityY) > 0.00001) {
        const fwd = camera.getDirection(new Vector3(0, 0, 1))
        fwd.y = 0
        if (fwd.length() > 0.001) fwd.normalize()
        displacement.addInPlace(fwd.scale(-velocityY))
        velocityY *= DAMPING
      }

      if (displacement.length() > 0.0001) {
        camera.position.addInPlace(displacement)
        // Clamp dans la salle (width=10, depth=15, marge=0.5)
        const MARGIN = 0.5
        camera.position.x = Math.max(-5 + MARGIN, Math.min(5 - MARGIN, camera.position.x))
        camera.position.z = Math.max(-7.5 + MARGIN, Math.min(7.5 - MARGIN, camera.position.z))
      }
    }

    // --- Lerp vers la position cible (clic sur le sol) ---
    if (targetPosition !== null && !locked) {
      const dx = targetPosition.x - camera.position.x
      const dz = targetPosition.z - camera.position.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist < ARRIVE_THRESHOLD) {
        targetPosition = null
      } else {
        camera.position.x += dx * LERP_FACTOR
        camera.position.z += dz * LERP_FACTOR
        camera.position.y = CAMERA_Y
      }
    }
  })

  // ---------------------------------------------------------------------------
  // Souris : drag gauche = rotation yaw + avance/recule
  // ---------------------------------------------------------------------------
  let isDragging = false
  let hasDragged = false
  let lastX = 0
  let lastY = 0
  const ROTATION_SENSITIVITY = 0.005
  const FORWARD_SENSITIVITY = 0.008
  let velocityX = 0
  let velocityY = 0
  const DAMPING = 0.92

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    isDragging = true
    hasDragged = false
    lastX = e.clientX
    lastY = e.clientY
    velocityX = 0
    velocityY = 0
    canvas.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  const onPointerUp = (e: PointerEvent) => {
    if (!isDragging) return

    // Si pas de drag significatif → clic → déplacement sol (uniquement hors mode détail)
    if (!hasDragged && !detailMode && !locked) {
      const rect = canvas.getBoundingClientRect()
      const pickX = e.clientX - rect.left
      const pickY = e.clientY - rect.top
      const pickResult = scene.pick(pickX, pickY)
      if (pickResult?.hit && pickResult.pickedMesh?.name === 'floor' && pickResult.pickedPoint) {
        const tx = Math.max(ROOM_X_MIN, Math.min(ROOM_X_MAX, pickResult.pickedPoint.x))
        const tz = Math.max(ROOM_Z_MIN, Math.min(ROOM_Z_MAX, pickResult.pickedPoint.z))
        targetPosition = { x: tx, z: tz }
      }
    }

    isDragging = false
    if (canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId)
    }
  }

  const onPointerMove = (e: PointerEvent) => {
    // Drag rotation — ignoré si locked
    if (isDragging && !locked) {
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasDragged = true
        targetPosition = null
      }

      velocityX = velocityX * 0.6 + dx * ROTATION_SENSITIVITY * 0.4
      velocityY = velocityY * 0.6 + dy * FORWARD_SENSITIVITY * 0.4
    }

    // Curseur disque sur le sol (hors drag, hors mode détail)
    if (!isDragging && !detailMode) {
      const rect = canvas.getBoundingClientRect()
      const pickResult = scene.pick(e.clientX - rect.left, e.clientY - rect.top)
      if (pickResult?.hit && pickResult.pickedMesh?.name === 'floor' && pickResult.pickedPoint) {
        cursorDisc.position.x = pickResult.pickedPoint.x
        cursorDisc.position.y = 0.01
        cursorDisc.position.z = pickResult.pickedPoint.z
        cursorDisc.setEnabled(true)
      } else {
        cursorDisc.setEnabled(false)
      }
    } else {
      cursorDisc.setEnabled(false)
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointermove', onPointerMove)

  scene.onDisposeObservable.addOnce(() => {
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointerup', onPointerUp)
    canvas.removeEventListener('pointermove', onPointerMove)
    document.removeEventListener('keydown', onKeyDown)
    document.removeEventListener('keyup', onKeyUp)
    cursorDisc.dispose()
  })

  // ---------------------------------------------------------------------------
  // Contrôles exposés à GalleryScene / GalleryClient
  // ---------------------------------------------------------------------------
  const controls: CameraControls = {
    /**
     * Zoom smooth vers l'œuvre.
     * Sauvegarde la position courante pour permettre le retour via exitDetailMode.
     */
    focusOnArtwork(artwork: ArtworkConfig): void {
      if (locked) return // interdit pendant une transition en cours

      // Sauvegarde de la position de visite courante
      savedPosition = {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
        rotY: camera.rotation.y,
      }

      const { position, rotationY } = computeViewTarget(artwork, camera.fov)

      detailMode = true
      locked = true
      targetPosition = null // annule tout déplacement sol en cours
      velocityX = 0
      velocityY = 0

      detailTarget = { ...position, rotY: rotationY }
    },

    /**
     * Retour smooth vers la position sauvegardée avant le zoom.
     */
    exitDetailMode(): void {
      if (!detailMode || locked || !savedPosition) return

      locked = true
      detailTarget = {
        x: savedPosition.x,
        y: savedPosition.y,
        z: savedPosition.z,
        rotY: savedPosition.rotY,
      }

      // Une fois revenu, désactive le mode détail
      onArrivalCallback = () => {
        detailMode = false
        savedPosition = null
      }
    },

    isInDetailMode(): boolean {
      return detailMode
    },
  }

  return { camera, controls }
}
