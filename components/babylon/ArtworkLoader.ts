/**
 * ArtworkLoader.ts — Phase 3
 * Charge les œuvres depuis un ArtworkConfig[], crée :
 *   - Mesh plan texturé (image)
 *   - Cadre procédural 4 boîtes parentées
 *   - ActionManager pour interaction clic + hover
 *
 * Note : les SpotLights individuels ont été supprimés.
 * Les œuvres utilisent disableLighting=true (emissiveTexture) — les spots
 * n'avaient aucun effet sur elles et projetaient des halos ovales visibles
 * sur les murs. L'éclairage ambiant global (HemisphericLight + DirectionalLight)
 * assure un rendu uniforme de la salle.
 *
 * Note : le cartel 3D Babylon GUI a été supprimé — remplacé par une popup
 * HTML/React gérée via le callback onArtworkHover.
 */

import type { Scene, Mesh } from '@babylonjs/core'
import type { ArtworkConfig, FrameStyle } from '@/data/exhibitions/schema'

export interface LoadedArtwork {
  plane: Mesh
  frame: Mesh[]
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
// Export principal : loadArtworks
// -------------------------------------------------------------------
export async function loadArtworks(
  artworks: ArtworkConfig[],
  scene: Scene,
  onArtworkClick?: (artwork: ArtworkConfig) => void,
  onArtworkHover?: (artwork: ArtworkConfig | null) => void
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
    // Étape 11 : ActionManager (clic + hover)
    // ---------------------------------------------------------------
    plane.actionManager = new ActionManager(scene)

    // Clic → callback React
    plane.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
        onArtworkClick?.(artwork)
      })
    )

    // Hover ON → curseur pointer + popup HTML React
    plane.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
        onArtworkHover?.(artwork)
        const canvas = scene.getEngine().getRenderingCanvas()
        if (canvas) canvas.style.cursor = 'pointer'
      })
    )

    // Hover OFF → curseur normal + ferme popup HTML React
    plane.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
        onArtworkHover?.(null)
        const canvas = scene.getEngine().getRenderingCanvas()
        if (canvas) canvas.style.cursor = 'default'
      })
    )

    results.push({ plane, frame, config: artwork })
  }

  return results
}
