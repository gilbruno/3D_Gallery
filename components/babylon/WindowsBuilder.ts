import type { Scene, ShadowGenerator } from '@babylonjs/core'

export const WIN_W = 0.9      // largeur fenêtre (m)
export const WIN_H = 3.2      // hauteur fenêtre (m) — plus haute que large
export const WIN_Y = 1.9      // centre Y (bas à 0.3m du sol)
export const WIN_Z_POSITIONS = [-6.2, -2.25, 2.25]  // entre les œuvres Z=-4.5, 0, +4.5

const FRAME_T = 0.07
const DEPTH = 0.05
const MULLION_T = 0.04

export interface WindowsResult {
  shadowGenerator: ShadowGenerator
}

// Construit les fenêtres (cadre + vitre + croisillons) sur un mur latéral.
// wallX  : position X du mur (intérieur), sign : +1 pour mur droit, -1 pour mur gauche
async function buildWindowsOnWall(
  scene: Scene,
  wallX: number,
  sign: -1 | 1,
  frameMat: InstanceType<typeof import('@babylonjs/core').StandardMaterial>,
  glassMat: InstanceType<typeof import('@babylonjs/core').StandardMaterial>,
  MeshBuilder: typeof import('@babylonjs/core').MeshBuilder,
  Vector3: typeof import('@babylonjs/core').Vector3,
) {
  const x = wallX + sign * DEPTH / 2  // légèrement en retrait côté intérieur

  for (const zc of WIN_Z_POSITIONS) {
    const id = `${sign > 0 ? 'R' : 'L'}-${zc}`

    // Vitre — BACKSIDE pour mur gauche, FRONTSIDE pour mur droit
    const glass = MeshBuilder.CreatePlane(`win-glass-${id}`, {
      width: WIN_W - FRAME_T * 2,
      height: WIN_H - FRAME_T * 2,
      sideOrientation: sign > 0 ? 0 : 2,
    }, scene)
    glass.position = new Vector3(x, WIN_Y, zc)
    glass.rotation.y = -Math.PI / 2
    glass.material = glassMat
    glass.isPickable = false

    // Montants latéraux cadre
    for (const dz of [-1, 1]) {
      const f = MeshBuilder.CreateBox(`win-f${dz > 0 ? 'R' : 'L'}-${id}`, { width: DEPTH, height: WIN_H, depth: FRAME_T }, scene)
      f.position = new Vector3(x, WIN_Y, zc + dz * (WIN_W / 2 - FRAME_T / 2))
      f.material = frameMat; f.isPickable = false
    }
    // Traverses haut/bas cadre
    for (const dy of [-1, 1]) {
      const f = MeshBuilder.CreateBox(`win-f${dy > 0 ? 'T' : 'B'}-${id}`, { width: DEPTH, height: FRAME_T, depth: WIN_W }, scene)
      f.position = new Vector3(x, WIN_Y + dy * (WIN_H / 2 - FRAME_T / 2), zc)
      f.material = frameMat; f.isPickable = false
    }
    // Croisillon vertical central
    const mV = MeshBuilder.CreateBox(`win-mV-${id}`, { width: DEPTH, height: WIN_H - FRAME_T * 2, depth: MULLION_T }, scene)
    mV.position = new Vector3(x, WIN_Y, zc)
    mV.material = frameMat; mV.isPickable = false

    // 2 croisillons horizontaux (tiers)
    for (let t = 1; t <= 2; t++) {
      const yBar = WIN_Y - WIN_H / 2 + FRAME_T + (WIN_H - FRAME_T * 2) * (t / 3)
      const mH = MeshBuilder.CreateBox(`win-mH-${id}-${t}`, { width: DEPTH, height: MULLION_T, depth: WIN_W - FRAME_T * 2 }, scene)
      mH.position = new Vector3(x, yBar, zc)
      mH.material = frameMat; mH.isPickable = false
    }
  }
}

export async function buildWindows(scene: Scene): Promise<WindowsResult> {
  const { MeshBuilder, StandardMaterial, Color3, Vector3,
          DirectionalLight, PointLight, ShadowGenerator } = await import('@babylonjs/core')

  const frameMat = new StandardMaterial('win-frame', scene)
  frameMat.diffuseColor = new Color3(0.97, 0.97, 0.97)
  frameMat.specularColor = new Color3(0.08, 0.08, 0.08)
  frameMat.specularPower = 32

  const glassMat = new StandardMaterial('win-glass', scene)
  glassMat.diffuseColor = new Color3(0.95, 0.97, 1.0)
  glassMat.emissiveColor = new Color3(0.88, 0.92, 1.0)
  glassMat.specularColor = new Color3(0.3, 0.3, 0.3)
  glassMat.specularPower = 128
  glassMat.alpha = 0.55

  // Mur gauche (X=-5)
  await buildWindowsOnWall(scene, -5.0, -1, frameMat, glassMat, MeshBuilder, Vector3)
  // Mur droit (X=+5) — symétrique
  await buildWindowsOnWall(scene, +5.0, +1, frameMat, glassMat, MeshBuilder, Vector3)

  // Lumière directionnelle douce et zénithale légèrement biaisée — sert pour les ombres
  const winLight = new DirectionalLight('window-light', new Vector3(0.2, -1, 0.1), scene)
  winLight.position = new Vector3(0, 6, 0)
  winLight.intensity = 0.25
  winLight.diffuse = new Color3(0.92, 0.95, 1.0)
  winLight.specular = new Color3(0.0, 0.0, 0.0)

  // PointLights derrière chaque vitre — projettent la lumière des fenêtres vers
  // l'intérieur de la salle ET vers le plafond, créant des nuances/dégradés
  // naturels sur le faux plafond (zones plus claires en face des fenêtres).
  for (const zc of WIN_Z_POSITIONS) {
    // Source côté gauche (X=-5)
    const pL = new PointLight(`win-pt-L-${zc}`, new Vector3(-4.7, WIN_Y, zc), scene)
    pL.diffuse = new Color3(0.92, 0.95, 1.0)
    pL.specular = new Color3(0.0, 0.0, 0.0)
    pL.intensity = 0.55
    pL.range = 9   // portée limitée pour éviter de sur-éclairer le mur opposé

    // Source côté droit (X=+5)
    const pR = new PointLight(`win-pt-R-${zc}`, new Vector3(4.7, WIN_Y, zc), scene)
    pR.diffuse = new Color3(0.92, 0.95, 1.0)
    pR.specular = new Color3(0.0, 0.0, 0.0)
    pR.intensity = 0.55
    pR.range = 9
  }

  const shadowGenerator = new ShadowGenerator(1024, winLight)
  shadowGenerator.useBlurExponentialShadowMap = true
  shadowGenerator.blurKernel = 32
  shadowGenerator.darkness = 0.35

  return { shadowGenerator }
}
