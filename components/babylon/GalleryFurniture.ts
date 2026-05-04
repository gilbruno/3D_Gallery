import type { Scene } from '@babylonjs/core'

// Crée une texture procédurale de cuir blanc matelassé (style Barcelona/Chesterfield) :
// - fond crème légèrement nuancé
// - capitonnage : motif de losanges réguliers + boutons aux intersections
// - micro-grain pour l'aspect cuir naturel
async function createLeatherTexture(
  scene: Scene,
  DynamicTexture: typeof import('@babylonjs/core').DynamicTexture,
) {
  const SIZE = 512
  const tex = new DynamicTexture('leather-tex', { width: SIZE, height: SIZE }, scene, true)
  const ctx = tex.getContext() as CanvasRenderingContext2D

  // Fond crème naturel
  const grad = ctx.createLinearGradient(0, 0, SIZE, SIZE)
  grad.addColorStop(0, '#F4F1EB')
  grad.addColorStop(0.5, '#EDE8DD')
  grad.addColorStop(1, '#F2EDE2')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Motif de losanges (capitonnage)
  const TILE = 64       // taille du losange en px
  const HALF = TILE / 2

  ctx.strokeStyle = 'rgba(80, 65, 45, 0.18)'
  ctx.lineWidth = 1.2

  for (let y = -TILE; y < SIZE + TILE; y += TILE) {
    for (let x = -TILE; x < SIZE + TILE; x += TILE) {
      ctx.beginPath()
      ctx.moveTo(x, y + HALF)
      ctx.lineTo(x + HALF, y)
      ctx.lineTo(x + TILE, y + HALF)
      ctx.lineTo(x + HALF, y + TILE)
      ctx.closePath()
      ctx.stroke()

      // Léger ombrage à l'intérieur de chaque losange (creux du capitonnage)
      const innerGrad = ctx.createRadialGradient(
        x + HALF, y + HALF, 4,
        x + HALF, y + HALF, HALF
      )
      innerGrad.addColorStop(0, 'rgba(50, 40, 25, 0.10)')
      innerGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = innerGrad
      ctx.beginPath()
      ctx.moveTo(x, y + HALF)
      ctx.lineTo(x + HALF, y)
      ctx.lineTo(x + TILE, y + HALF)
      ctx.lineTo(x + HALF, y + TILE)
      ctx.closePath()
      ctx.fill()

      // Bouton brillant au centre de chaque losange
      ctx.fillStyle = 'rgba(60, 50, 35, 0.55)'
      ctx.beginPath()
      ctx.arc(x + HALF, y + HALF, 2.2, 0, Math.PI * 2)
      ctx.fill()
      // Reflet du bouton
      ctx.fillStyle = 'rgba(255, 250, 240, 0.7)'
      ctx.beginPath()
      ctx.arc(x + HALF - 0.7, y + HALF - 0.7, 0.9, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Micro-grain — aspect cuir naturel
  for (let i = 0; i < 1800; i++) {
    const x = Math.floor(Math.random() * SIZE)
    const y = Math.floor(Math.random() * SIZE)
    const a = Math.random() * 0.06
    ctx.fillStyle = Math.random() > 0.5
      ? `rgba(255,255,255,${a})`
      : `rgba(40,30,15,${a * 0.8})`
    ctx.fillRect(x, y, 1, 1)
  }

  tex.update()
  return tex
}

// Fauteuil-banquette moderne : assise capitonnée en cuir blanc + structure noire laquée
async function buildModernBench(
  scene: Scene,
  id: string,
  posX: number,
  posZ: number,
  benchW: number,  // largeur (axe Z)
  benchD: number,  // profondeur (axe X)
  benchH: number,  // hauteur totale
  MeshBuilder: typeof import('@babylonjs/core').MeshBuilder,
  Vector3: typeof import('@babylonjs/core').Vector3,
  cushionMat: InstanceType<typeof import('@babylonjs/core').StandardMaterial>,
  legMat: InstanceType<typeof import('@babylonjs/core').StandardMaterial>,
) {
  const LEG_S = 0.04         // pieds plus fins, plus modernes
  const CUSHION_H = 0.12     // épaisseur du coussin matelassé
  const FRAME_H = 0.02       // structure plate sous le coussin
  const LEG_H = benchH - CUSHION_H - FRAME_H
  const LEG_Y = LEG_H / 2
  const FRAME_Y = LEG_H + FRAME_H / 2
  const CUSHION_Y = LEG_H + FRAME_H + CUSHION_H / 2

  // Coussin matelassé — légèrement plus petit que la structure pour effet "posé dessus"
  // Utilisation de SubdivBox pour adoucir l'aspect (apparence plus moelleuse)
  const cushion = MeshBuilder.CreateBox(
    `${id}-cushion`,
    { width: benchD - 0.02, height: CUSHION_H, depth: benchW - 0.02 },
    scene,
  )
  cushion.position = new Vector3(posX, CUSHION_Y, posZ)
  cushion.material = cushionMat
  cushion.isPickable = false

  // Structure plate noire sous le coussin (plateau de base)
  const frame = MeshBuilder.CreateBox(
    `${id}-frame`,
    { width: benchD, height: FRAME_H, depth: benchW },
    scene,
  )
  frame.position = new Vector3(posX, FRAME_Y, posZ)
  frame.material = legMat
  frame.isPickable = false

  // 4 pieds noir laque brillant aux coins
  const offX = benchD / 2 - LEG_S
  const offZ = benchW / 2 - LEG_S
  for (const [dx, dz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as Array<[number, number]>) {
    const leg = MeshBuilder.CreateBox(`${id}-leg-${dx}${dz}`, { width: LEG_S, height: LEG_H, depth: LEG_S }, scene)
    leg.position = new Vector3(posX + dx * offX, LEG_Y, posZ + dz * offZ)
    leg.material = legMat
    leg.isPickable = false
  }
}

export async function buildFurniture(scene: Scene): Promise<void> {
  const { MeshBuilder, StandardMaterial, DynamicTexture, Color3, Vector3 } = await import('@babylonjs/core')

  // Texture cuir blanc matelassé pour le coussin
  const leatherTex = await createLeatherTexture(scene, DynamicTexture)
  // Tiling : 1.5 répétitions sur la largeur du coussin pour des losanges visibles
  leatherTex.uScale = 2
  leatherTex.vScale = 1.5

  // Matériau coussin — cuir blanc matelassé satiné
  const cushionMat = new StandardMaterial('bench-cushion', scene)
  cushionMat.diffuseTexture = leatherTex
  cushionMat.diffuseColor = new Color3(1.0, 1.0, 1.0)
  cushionMat.specularColor = new Color3(0.22, 0.22, 0.20)
  cushionMat.specularPower = 64
  cushionMat.emissiveColor = new Color3(0.06, 0.06, 0.06)

  // Matériau pieds + structure — noir laqué brillant
  const legMat = new StandardMaterial('bench-leg', scene)
  legMat.diffuseColor = new Color3(0.04, 0.04, 0.04)
  legMat.specularColor = new Color3(0.45, 0.45, 0.45)
  legMat.specularPower = 128

  // Disposition en angle droit devant artwork-back-03 (X=3, mur fond Z=-7.3)
  // Banquette 1 — orientée le long de Z (parallèle au mur du fond)
  await buildModernBench(scene, 'bench-main', 2.2, -5.6, 1.1, 0.55, 0.40,
    MeshBuilder, Vector3, cushionMat, legMat)

  // Banquette 2 — perpendiculaire, légèrement décalée
  await buildModernBench(scene, 'bench-side', 3.2, -4.7, 0.55, 1.0, 0.40,
    MeshBuilder, Vector3, cushionMat, legMat)
}
