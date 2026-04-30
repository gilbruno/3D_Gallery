import type { Scene, StandardMaterial } from '@babylonjs/core'

/**
 * StandardMaterial avec emissiveColor pour les surfaces de la salle.
 * PBRMaterial sans HDRI/IBL rend en noir et déclenche le shader rgbdDecode —
 * on utilise StandardMaterial pour garantir la visibilité des surfaces
 * indépendamment de l'IBL.
 *
 * Différenciation visuelle intentionnelle :
 *   - Sol : parquet chêne moyen (warm), contraste maximal avec les murs blancs
 *   - Murs : blanc cassé légèrement chaud, emissive faible pour rester visibles
 *   - Plafond : légèrement plus sombre que les murs pour ancrer le volume
 */

export async function createWallMaterial(scene: Scene): Promise<StandardMaterial> {
  const { StandardMaterial, Color3 } = await import('@babylonjs/core')

  const mat = new StandardMaterial('wall-std', scene)
  // Blanc cassé légèrement warm — évoque le blanc galerie (pas blanc pur qui brûle)
  mat.diffuseColor = new Color3(0.96, 0.95, 0.92)
  // Auto-éclairage très faible : garantit la visibilité même dans les zones peu éclairées
  mat.emissiveColor = new Color3(0.15, 0.14, 0.13)
  mat.specularColor = new Color3(0.05, 0.05, 0.05)
  mat.backFaceCulling = false
  return mat
}

export async function createFloorMaterial(scene: Scene): Promise<StandardMaterial> {
  const { StandardMaterial, Color3 } = await import('@babylonjs/core')

  const mat = new StandardMaterial('floor-std', scene)
  // Parquet chêne moyen — couleur warm qui contraste clairement avec les murs blancs
  mat.diffuseColor = new Color3(0.72, 0.62, 0.48)
  mat.emissiveColor = new Color3(0.05, 0.04, 0.03)
  mat.specularColor = new Color3(0.2, 0.18, 0.15)
  mat.specularPower = 32
  return mat
}

export async function createCeilingMaterial(scene: Scene): Promise<StandardMaterial> {
  const { StandardMaterial, Color3 } = await import('@babylonjs/core')

  const mat = new StandardMaterial('ceiling-std', scene)
  // Légèrement plus sombre que les murs — ancre le plafond visuellement,
  // évite la confusion avec les murs (sans HDRI le plafond disparaît sinon)
  mat.diffuseColor = new Color3(0.88, 0.87, 0.85)
  mat.emissiveColor = new Color3(0.12, 0.12, 0.12)
  mat.specularColor = new Color3(0.02, 0.02, 0.02)
  mat.backFaceCulling = false
  return mat
}

/**
 * Matériau de plinthe — gris foncé warm pour marquer la jonction sol/mur.
 * Crée une ligne de contraste qui renforce la perception de perspective.
 */
export async function createSkirtingMaterial(scene: Scene): Promise<StandardMaterial> {
  const { StandardMaterial, Color3 } = await import('@babylonjs/core')

  const mat = new StandardMaterial('skirting-std', scene)
  mat.diffuseColor = new Color3(0.3, 0.28, 0.26)
  mat.emissiveColor = new Color3(0.04, 0.04, 0.03)
  mat.specularColor = new Color3(0.05, 0.05, 0.05)
  return mat
}
