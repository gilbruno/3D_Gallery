import type { Scene, StandardMaterial } from '@babylonjs/core'

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
 *   - Sol    : blanc grisé légèrement plus sombre (#E6E6E6 ≈ 0.90) + légère brillance
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

export async function createFloorMaterial(scene: Scene): Promise<StandardMaterial> {
  const { StandardMaterial, Color3 } = await import('@babylonjs/core')

  const mat = new StandardMaterial('floor-std', scene)
  // Sol gris très clair quasi-blanc (≈ 0.97) avec légère teinte chaude — style galerie
  // contemporaine minimaliste. Presque blanc mais pas pur pour éviter l'éblouissement.
  // La légère composante chaude (R/G > B) donne une tonalité pierre de taille ou béton poli.
  mat.diffuseColor = new Color3(0.97, 0.97, 0.96)
  mat.emissiveColor = new Color3(0.82, 0.82, 0.81)
  mat.specularColor = new Color3(0.15, 0.15, 0.15)
  mat.specularPower = 64
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
