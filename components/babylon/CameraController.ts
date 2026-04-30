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
  scene.preventDefaultOnPointerDown = false

  // --- État du clavier ---
  const keys: Record<string, boolean> = {}
  const onKeyDown = (e: KeyboardEvent) => { keys[e.code] = true }
  const onKeyUp = (e: KeyboardEvent) => { keys[e.code] = false }
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('keyup', onKeyUp)

  const SPEED = 0.08

  scene.onBeforeRenderObservable.add(() => {
    camera.rotation.x = 0

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

    // Applique le déplacement souris (inertie) via moveWithCollisions
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
      // Clampe la position à l'intérieur de la salle (width=10, depth=15, marge ellipsoid=0.4)
      const MARGIN = 0.5
      camera.position.x = Math.max(-5 + MARGIN, Math.min(5 - MARGIN, camera.position.x))
      camera.position.z = Math.max(-7.5 + MARGIN, Math.min(7.5 - MARGIN, camera.position.z))
    }
  })

  // --- Souris : drag gauche = rotation yaw + avance/recule ---
  let isDragging = false
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
    lastX = e.clientX
    lastY = e.clientY
    velocityX = 0
    velocityY = 0
    canvas.setPointerCapture(e.pointerId)
    e.preventDefault()
  }
  const onPointerUp = (e: PointerEvent) => {
    if (!isDragging) return
    isDragging = false
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
    velocityX = velocityX * 0.6 + dx * ROTATION_SENSITIVITY * 0.4
    velocityY = velocityY * 0.6 + dy * FORWARD_SENSITIVITY * 0.4
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
  })

  return camera
}
