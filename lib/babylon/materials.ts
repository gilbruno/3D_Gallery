import type { Scene, StandardMaterial, PBRMaterial } from '@babylonjs/core'

/**
 * Matériaux "white cube gallery" — style galerie d'art contemporaine haut de gamme.
 * Palette monochrome blanc/gris très clair, ombres douces, sol légèrement lustré.
 *
 * Principe d'éclairage retenu (galerie ouverte sans plafond) :
 *   - emissiveColor = ZERO — les ombres portées doivent être pleinement visibles
 *   - diffuseColor = couleur réelle réagissant à la HemisphericLight + DirectionalLight
 *   - specularColor calibré : quasi-zéro pour les murs (mat), modéré pour le sol (lustré)
 *
 * Hiérarchie tonale "white cube" :
 *   - Murs   : blanc légèrement grisé (#EDEDED ≈ 0.93) — surface de référence neutre
 *   - Sol    : parquet chêne blond clair, lames larges décalées, satiné discret
 *   - Plinthe : gris discret (#D1D1D1 ≈ 0.82) — séparation subtile sol/mur
 *
 * Le plafond est supprimé — l'espace est ouvert vers le haut (lumière zénithale naturelle).
 */

export async function createWallMaterial(scene: Scene): Promise<StandardMaterial> {
  const { StandardMaterial, Color3 } = await import('@babylonjs/core')

  const mat = new StandardMaterial('wall-std', scene)
  // Blanc légèrement grisé (#EDEDED ≈ 0.93) — surface neutre de référence.
  // Assez clair pour l'ambiance galerie, assez sombre pour que les ombres
  // portées des murs épais soient clairement visibles.
  mat.diffuseColor = new Color3(0.80, 0.80, 0.80)
  // ZERO émissif — crucial pour que les ombres portées soient bien visibles.
  // Un emissive non-nul annule partiellement les ombres et aplatit la scène.
  mat.emissiveColor = new Color3(0.0, 0.0, 0.0)
  // Quasi pas de spéculaire — surface mate galerie, pas d'effet brillant
  mat.specularColor = new Color3(0.03, 0.03, 0.03)
  mat.backFaceCulling = false
  return mat
}

export async function createFloorMaterial(scene: Scene): Promise<PBRMaterial> {
  const { PBRMaterial, Texture } = await import('@babylonjs/core')

  const mat = new PBRMaterial('floor-pbr', scene)

  // Parquet chêne clair haute qualité — mêmes textures que le playground K4S3GU#49
  // albedo (couleur), normal map (relief des lames), metallic/roughness/AO
  mat.albedoTexture = new Texture('https://i.imgur.com/MBBMaaH.jpg', scene)
  mat.bumpTexture = new Texture('https://i.imgur.com/wKKTSfY.png', scene)
  mat.invertNormalMapY = true
  mat.metallicTexture = new Texture('https://i.imgur.com/0QXmsyA.jpg', scene)
  mat.useAmbientOcclusionFromMetallicTextureRed = true
  mat.useMetallnessFromMetallicTextureBlue = true
  mat.useRoughnessFromMetallicTextureGreen = true

  // Tiling pour couvrir la salle entière (10×15m) avec des lames à l'échelle réelle
  const scaleU = 4
  const scaleV = 6
  ;(mat.albedoTexture as InstanceType<typeof Texture>).uScale = scaleU
  ;(mat.albedoTexture as InstanceType<typeof Texture>).vScale = scaleV
  ;(mat.bumpTexture as InstanceType<typeof Texture>).uScale = scaleU
  ;(mat.bumpTexture as InstanceType<typeof Texture>).vScale = scaleV
  ;(mat.metallicTexture as InstanceType<typeof Texture>).uScale = scaleU
  ;(mat.metallicTexture as InstanceType<typeof Texture>).vScale = scaleV

  return mat
}

/**
 * Matériau de plinthe — gris discret pour une jonction sol/mur subtile.
 * Style "white cube" : séparation visible mais non agressive.
 */
export async function createSkirtingMaterial(scene: Scene): Promise<StandardMaterial> {
  const { StandardMaterial, Color3 } = await import('@babylonjs/core')

  const mat = new StandardMaterial('skirting-std', scene)
  // Gris clair (#D1D1D1 ≈ 0.82) — marque la transition sol/mur sans noir agressif.
  // Entre le sol (0.90) et blanc pur : transition douce, lecture spatiale claire.
  mat.diffuseColor = new Color3(0.82, 0.82, 0.82)
  mat.emissiveColor = new Color3(0.0, 0.0, 0.0)
  mat.specularColor = new Color3(0.03, 0.03, 0.03)
  return mat
}
