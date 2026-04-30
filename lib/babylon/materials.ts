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
  const { StandardMaterial, DynamicTexture, Color3 } = await import('@babylonjs/core')

  const mat = new StandardMaterial('floor-std', scene)

  // -----------------------------------------------------------------------
  // Texture procédurale via DynamicTexture — béton poli / pierre calcaire
  // Taille 1024×1536 proportionnelle à la salle 10×15m
  // 100% client-side : aucun fichier image externe requis
  // -----------------------------------------------------------------------
  const texW = 1024
  const texH = 1536
  const dynTex = new DynamicTexture('floor-tex', { width: texW, height: texH }, scene, false)
  const ctx = dynTex.getContext() as CanvasRenderingContext2D

  // 1. Fond de base — gris très clair #F5F5F3
  ctx.fillStyle = '#F5F5F3'
  ctx.fillRect(0, 0, texW, texH)

  // 2. Variations tonales par dalle — simule les légères différences naturelles de pierre
  //    Palette 4×6 dalles couvrant toute la surface
  const COLS = 4
  const ROWS = 6
  const tileW = texW / COLS
  const tileH = texH / ROWS
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      // Variation déterministe (pseudo-aléatoire sans Math.random pour reproductibilité)
      const seed = (r * COLS + c) * 7919
      const tone = ((seed % 23) - 11) / 11  // -1 à +1
      const alpha = Math.abs(tone) * 0.04 + 0.01
      ctx.fillStyle = tone > 0
        ? `rgba(200,200,198,${alpha})`
        : `rgba(240,240,238,${alpha})`
      ctx.fillRect(c * tileW + 1, r * tileH + 1, tileW - 2, tileH - 2)
    }
  }

  // 3. Joints de dalles — lignes très fines rgba(0,0,0,0.045)
  ctx.strokeStyle = 'rgba(0,0,0,0.045)'
  ctx.lineWidth = 1.5
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath()
    ctx.moveTo(c * tileW, 0)
    ctx.lineTo(c * tileW, texH)
    ctx.stroke()
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath()
    ctx.moveTo(0, r * tileH)
    ctx.lineTo(texW, r * tileH)
    ctx.stroke()
  }

  // 4. Grain micro (bruit très subtil) — simule la texture de surface du béton poli
  const grainSize = 4
  for (let y = 0; y < texH; y += grainSize) {
    for (let x = 0; x < texW; x += grainSize) {
      const seed2 = x * 1000003 + y * 999983
      const v = ((seed2 % 17) - 8) / 8
      if (Math.abs(v) > 0.5) {
        ctx.fillStyle = `rgba(${v > 0 ? '255,255,255' : '0,0,0'},${Math.abs(v) * 0.018})`
        ctx.fillRect(x, y, grainSize, grainSize)
      }
    }
  }

  dynTex.update()

  // Texture diffuse + émissive pour assurer une luminosité de base constante
  // indépendamment des conditions d'éclairage dynamiques de la scène.
  mat.diffuseTexture = dynTex
  mat.emissiveTexture = dynTex
  mat.emissiveColor = new Color3(0.78, 0.78, 0.78)
  // Légère brillance béton poli — moins spéculaire que le blanc pur
  mat.specularColor = new Color3(0.12, 0.12, 0.12)
  mat.specularPower = 48

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
