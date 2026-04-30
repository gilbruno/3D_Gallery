import type { Scene, UniversalCamera } from '@babylonjs/core'

export async function setupCamera(
  scene: Scene,
  canvas: HTMLCanvasElement
): Promise<UniversalCamera> {
  const { UniversalCamera, Vector3 } = await import('@babylonjs/core')

  const camera = new UniversalCamera('gallery-cam', new Vector3(0, 1.65, 6), scene)
  camera.setTarget(new Vector3(0, 1.65, 0))
  camera.fov = 1.2
  camera.minZ = 0.1
  camera.maxZ = 100
  camera.checkCollisions = true
  camera.applyGravity = false
  camera.ellipsoid = new Vector3(0.4, 0.9, 0.4)
  scene.collisionsEnabled = true

  // Pas de attachControl — on gère tout manuellement via Pointer Events.
  // On désactive aussi le système de pick interne de Babylon sur les events pointer
  // pour éviter qu'il n'appelle stopPropagation avant nos handlers.
  // Les ActionManager (clic œuvres) utilisent OnPickTrigger qui fonctionne
  // indépendamment via scene.pick() dans le render loop de Babylon.
  scene.preventDefaultOnPointerDown = false

  // --- État du clavier ---
  const keys: Record<string, boolean> = {}

  const onKeyDown = (e: KeyboardEvent) => { keys[e.code] = true }
  const onKeyUp = (e: KeyboardEvent) => { keys[e.code] = false }
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('keyup', onKeyUp)

  // --- Mouvement par frame via clavier ---
  const SPEED = 0.08
  scene.onBeforeRenderObservable.add(() => {
    // Verrouille le pitch à 0
    camera.rotation.x = 0

    const forward = camera.getDirection(new Vector3(0, 0, 1))
    forward.y = 0
    if (forward.length() > 0.001) forward.normalize()

    const right = camera.getDirection(new Vector3(1, 0, 0))
    right.y = 0
    if (right.length() > 0.001) right.normalize()

    // Avancer : W, Z, ArrowUp
    if (keys['KeyW'] || keys['KeyZ'] || keys['ArrowUp']) {
      camera.position.addInPlace(forward.scale(SPEED))
    }
    // Reculer : S, ArrowDown
    if (keys['KeyS'] || keys['ArrowDown']) {
      camera.position.addInPlace(forward.scale(-SPEED))
    }
    // Gauche : A, Q, ArrowLeft
    if (keys['KeyA'] || keys['KeyQ'] || keys['ArrowLeft']) {
      camera.position.addInPlace(right.scale(-SPEED))
    }
    // Droite : D, ArrowRight
    if (keys['KeyD'] || keys['ArrowRight']) {
      camera.position.addInPlace(right.scale(SPEED))
    }

    // --- Application de la vélocité souris avec inertie ---
    // On applique à chaque frame, que ce soit pendant le drag ou après (inertie).
    // Le seuil 0.00001 évite les micro-dérives infinitésimales.
    if (Math.abs(velocityX) > 0.00001 || Math.abs(velocityY) > 0.00001) {
      // Rotation horizontale (yaw)
      camera.rotation.y += velocityX

      // Déplacement forward/backward via drag vertical
      if (Math.abs(velocityY) > 0.00001) {
        const fwd = camera.getDirection(new Vector3(0, 0, 1))
        fwd.y = 0
        if (fwd.length() > 0.001) fwd.normalize()
        camera.position.addInPlace(fwd.scale(-velocityY))
      }

      // Damping exponentiel : la vélocité diminue de (1 - DAMPING) à chaque frame.
      // Après le pointerup, l'utilisateur perçoit une décélération naturelle
      // similaire au momentum d'un scroll iOS.
      velocityX *= DAMPING
      velocityY *= DAMPING
    }
  })

  // --- Souris : drag pour rotation + déplacement avant/arrière ---
  let isDragging = false
  let lastX = 0
  let lastY = 0
  const ROTATION_SENSITIVITY = 0.005
  const FORWARD_SENSITIVITY = 0.008

  // --- Inertie / momentum ---
  // velocityX : vélocité angulaire horizontale (yaw), en radians/frame
  // velocityY : vélocité de déplacement vertical (forward), en unités/frame
  // Au pointerup, on ne reset pas : l'inertie continue puis décélère.
  let velocityX = 0
  let velocityY = 0
  // Facteur de damping par frame : 0.92 ≈ ~12 frames pour perdre 63% de la vitesse
  // (équivalent à une décélération naturelle visible sans être trop longue)
  const DAMPING = 0.92

  // --- Pointer Events API (remplace mouse events) ---
  // PointerEvent fournit pointerId natif pour setPointerCapture,
  // ce qui garantit la réception de pointermove/pointerup même
  // quand le curseur sort du canvas pendant le drag.
  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    isDragging = true
    lastX = e.clientX
    lastY = e.clientY
    // Couper l'inertie résiduelle au moment où l'utilisateur reprend le drag,
    // sinon la vélocité précédente se cumule avec le nouveau mouvement.
    velocityX = 0
    velocityY = 0
    // La capture redirige tous les events pointer vers ce canvas
    // jusqu'au releasePointerCapture, indépendamment de la position du curseur
    canvas.setPointerCapture(e.pointerId)
    e.preventDefault()
  }
  const onPointerUp = (e: PointerEvent) => {
    if (!isDragging) return
    isDragging = false
    // Ne pas reset velocityX/velocityY ici : l'inertie prend le relais.
    if (canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId)
    }
  }
  const onPointerMove = (e: PointerEvent) => {
    if (!isDragging) return

    const dx = e.clientX - lastX
    const dy = e.clientY - lastY
    lastX = e.clientX
    lastY = e.clientY

    // On alimente la vélocité à partir du delta courant (pas d'application directe).
    // Le lerp (0.4) lisse les micro-saccades de souris tout en restant réactif.
    velocityX = velocityX * 0.6 + dx * ROTATION_SENSITIVITY * 0.4
    velocityY = velocityY * 0.6 + dy * FORWARD_SENSITIVITY * 0.4
  }

  // --- Molette : avancer/reculer ---
  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const forward = camera.getDirection(new Vector3(0, 0, 1))
    forward.y = 0
    if (forward.length() > 0.001) forward.normalize()
    camera.position.addInPlace(forward.scale(-e.deltaY * 0.01))
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('wheel', onWheel, { passive: false })

  // Nettoyage
  scene.onDisposeObservable.addOnce(() => {
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointerup', onPointerUp)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('wheel', onWheel)
    document.removeEventListener('keydown', onKeyDown)
    document.removeEventListener('keyup', onKeyUp)
  })

  return camera
}
