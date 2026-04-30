/**
 * ArtworkLoader.ts — Phase 3
 * Charge les œuvres depuis un ArtworkConfig[], crée :
 *   - Mesh plan texturé (image)
 *   - Cadre procédural 4 boîtes parentées
 *   - Cartel 3D via @babylonjs/gui
 *   - ActionManager pour interaction clic + hover
 *
 * Note : les SpotLights individuels ont été supprimés.
 * Les œuvres utilisent disableLighting=true (emissiveTexture) — les spots
 * n'avaient aucun effet sur elles et projetaient des halos ovales visibles
 * sur les murs. L'éclairage ambiant global (HemisphericLight + DirectionalLight)
 * assure un rendu uniforme de la salle.
 */

import type { Scene, Mesh } from '@babylonjs/core'
import type { ArtworkConfig, FrameStyle } from '@/data/exhibitions/schema'

export interface LoadedArtwork {
  plane: Mesh
  frame: Mesh[]
  label: Mesh
  config: ArtworkConfig
}

const PIXELS_PER_METER = 100

// -------------------------------------------------------------------
// Matériau de cadre selon frameStyle
// StandardMaterial uniquement — PBRMaterial sans HDRI/IBL déclenche
// le shader rgbdDecode de Babylon.js même sans scene.environmentTexture,
// ce qui génère une erreur console et un rendu noir des cadres.
// -------------------------------------------------------------------
async function createFrameMaterial(
  style: FrameStyle,
  id: string,
  scene: Scene
) {
  const { StandardMaterial, Color3 } = await import('@babylonjs/core')

  const mat = new StandardMaterial(`frame-mat-${id}`, scene)

  switch (style) {
    case 'black':
      mat.diffuseColor = new Color3(0.05, 0.05, 0.05)
      mat.emissiveColor = new Color3(0.02, 0.02, 0.02)
      mat.specularColor = new Color3(0.15, 0.15, 0.15)
      mat.specularPower = 64
      break
    case 'gold':
      mat.diffuseColor = new Color3(0.83, 0.68, 0.21)
      mat.emissiveColor = new Color3(0.12, 0.09, 0.02)
      mat.specularColor = new Color3(0.6, 0.5, 0.2)
      mat.specularPower = 48
      break
    case 'white':
      mat.diffuseColor = new Color3(0.95, 0.95, 0.95)
      mat.emissiveColor = new Color3(0.08, 0.08, 0.08)
      mat.specularColor = new Color3(0.1, 0.1, 0.1)
      mat.specularPower = 16
      break
    case 'none':
      break
  }

  return mat
}

// -------------------------------------------------------------------
// Cadre procédural : 4 boîtes parentées au plan
// -------------------------------------------------------------------
async function buildFrame(
  artwork: ArtworkConfig,
  plane: Mesh,
  meshWidth: number,
  meshHeight: number,
  scene: Scene
): Promise<Mesh[]> {
  if (artwork.frameStyle === 'none') return []

  const { MeshBuilder, Vector3 } = await import('@babylonjs/core')
  const frameMat = await createFrameMaterial(artwork.frameStyle, artwork.id, scene)

  const thickness = 0.04 // largeur de la moulure
  const depth = 0.03     // profondeur de la moulure (saillie)

  // Définition des 4 segments : [name, width, height, position relative]
  const segments: Array<{ name: string; w: number; h: number; pos: [number, number, number] }> = [
    {
      name: 'top',
      w: meshWidth + thickness * 2,
      h: thickness,
      pos: [0, meshHeight / 2 + thickness / 2, depth / 2],
    },
    {
      name: 'bottom',
      w: meshWidth + thickness * 2,
      h: thickness,
      pos: [0, -(meshHeight / 2 + thickness / 2), depth / 2],
    },
    {
      name: 'left',
      w: thickness,
      h: meshHeight,
      pos: [-(meshWidth / 2 + thickness / 2), 0, depth / 2],
    },
    {
      name: 'right',
      w: thickness,
      h: meshHeight,
      pos: [meshWidth / 2 + thickness / 2, 0, depth / 2],
    },
  ]

  const boxes: Mesh[] = []

  for (const seg of segments) {
    const box = MeshBuilder.CreateBox(
      `frame-${artwork.id}-${seg.name}`,
      { width: seg.w, height: seg.h, depth },
      scene
    )
    box.position = new Vector3(seg.pos[0], seg.pos[1], seg.pos[2])
    box.parent = plane
    box.material = frameMat
    box.isPickable = false
    boxes.push(box)
  }

  return boxes
}

// -------------------------------------------------------------------
// Cartel 3D (Étape 10)
// -------------------------------------------------------------------
async function buildLabel(
  artwork: ArtworkConfig,
  plane: Mesh,
  meshWidth: number,
  meshHeight: number,
  scene: Scene
): Promise<Mesh> {
  const { MeshBuilder, Vector3, Mesh: BabMesh } = await import('@babylonjs/core')
  const GUI = await import('@babylonjs/gui')

  const labelWidth = Math.max(meshWidth, 0.5)
  const labelHeight = 0.15

  const labelPlane = MeshBuilder.CreatePlane(
    `label-${artwork.id}`,
    { width: labelWidth, height: labelHeight, sideOrientation: BabMesh.DOUBLESIDE },
    scene
  )

  // Positionnement : sous l'œuvre, légèrement décalé vers l'avant
  labelPlane.position = new Vector3(
    plane.position.x,
    plane.position.y - meshHeight / 2 - 0.12,
    plane.position.z
  )
  labelPlane.rotation = plane.rotation.clone()
  labelPlane.isPickable = false
  labelPlane.billboardMode = BabMesh.BILLBOARDMODE_NONE
  // Masqué par défaut — affiché uniquement au survol pour ne pas polluer la vue
  labelPlane.setEnabled(false)

  // Texture GUI
  // uScale = -1 corrige l'inversion horizontale (miroir) du texte sur le plan
  const adt = GUI.AdvancedDynamicTexture.CreateForMesh(labelPlane, 512, 128)
  adt.uScale = -1

  const bg = new GUI.Rectangle('bg')
  bg.background = 'white'
  bg.alpha = 0.9
  bg.thickness = 0
  bg.cornerRadius = 4
  adt.addControl(bg)

  const stack = new GUI.StackPanel('stack')
  stack.isVertical = true
  stack.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER
  bg.addControl(stack)

  const titleBlock = new GUI.TextBlock('title', artwork.meta.title)
  titleBlock.color = '#111111'
  titleBlock.fontSize = 28
  titleBlock.fontWeight = 'bold'
  titleBlock.height = '40px'
  titleBlock.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER
  stack.addControl(titleBlock)

  const artistBlock = new GUI.TextBlock('artist', artwork.meta.artist)
  artistBlock.color = '#333333'
  artistBlock.fontSize = 22
  artistBlock.height = '32px'
  artistBlock.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER
  stack.addControl(artistBlock)

  const yearText = artwork.meta.price
    ? `${artwork.meta.year}  ·  ${artwork.meta.price} €`
    : `${artwork.meta.year}`
  const yearBlock = new GUI.TextBlock('year', yearText)
  yearBlock.color = '#555555'
  yearBlock.fontSize = 20
  yearBlock.height = '28px'
  yearBlock.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER
  stack.addControl(yearBlock)

  return labelPlane
}

// -------------------------------------------------------------------
// Export principal : loadArtworks
// -------------------------------------------------------------------
export async function loadArtworks(
  artworks: ArtworkConfig[],
  scene: Scene,
  onArtworkClick?: (artwork: ArtworkConfig) => void
): Promise<LoadedArtwork[]> {
  const {
    MeshBuilder,
    Mesh: BabMesh,
    StandardMaterial,
    Texture,
    Color3,
    Vector3,
    ActionManager,
    ExecuteCodeAction,
  } = await import('@babylonjs/core')

  const results: LoadedArtwork[] = []

  for (const artwork of artworks) {
    const meshHeight = artwork.dimensions.heightCm / PIXELS_PER_METER
    const meshWidth = artwork.dimensions.widthCm / PIXELS_PER_METER

    // ---------------------------------------------------------------
    // Étape 9a : mesh plan image
    // ---------------------------------------------------------------
    const plane = MeshBuilder.CreatePlane(
      `artwork-${artwork.id}`,
      { width: meshWidth, height: meshHeight, sideOrientation: BabMesh.DOUBLESIDE },
      scene
    )
    plane.position = new Vector3(
      artwork.position[0],
      artwork.position[1],
      artwork.position[2]
    )
    plane.rotation = new Vector3(
      artwork.rotation[0],
      artwork.rotation[1],
      artwork.rotation[2]
    )

    // Matériau image — emissiveColor blanc + disableLighting pour affichage
    // fidèle des couleurs sans dépendance à l'IBL
    const mat = new StandardMaterial(`mat-${artwork.id}`, scene)
    const tex = new Texture(artwork.imageUrl, scene)
    tex.hasAlpha = false
    mat.emissiveTexture = tex
    mat.disableLighting = true
    mat.backFaceCulling = false
    plane.material = mat

    // ---------------------------------------------------------------
    // Étape 9b : cadre procédural
    // ---------------------------------------------------------------
    const frame = await buildFrame(artwork, plane, meshWidth, meshHeight, scene)

    // ---------------------------------------------------------------
    // Étape 10 : cartel 3D
    // ---------------------------------------------------------------
    const label = await buildLabel(artwork, plane, meshWidth, meshHeight, scene)

    // ---------------------------------------------------------------
    // Étape 11 : ActionManager (clic + hover)
    // ---------------------------------------------------------------
    plane.actionManager = new ActionManager(scene)

    // Clic → callback React
    plane.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
        onArtworkClick?.(artwork)
      })
    )

    // Hover ON → curseur pointer + affiche cartel
    plane.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
        label.setEnabled(true)
        const canvas = scene.getEngine().getRenderingCanvas()
        if (canvas) canvas.style.cursor = 'pointer'
      })
    )

    // Hover OFF → curseur normal + masque cartel
    plane.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
        label.setEnabled(false)
        const canvas = scene.getEngine().getRenderingCanvas()
        if (canvas) canvas.style.cursor = 'default'
      })
    )

    results.push({ plane, frame, label, config: artwork })
  }

  return results
}
