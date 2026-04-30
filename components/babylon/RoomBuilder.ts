import type { Scene, Mesh } from '@babylonjs/core'

export interface RoomDimensions {
  width: number
  height: number
  depth: number
}

export interface RoomMeshes {
  floor: Mesh
  walls: {
    back: Mesh
    front: Mesh
    left: Mesh
    right: Mesh
  }
  skirtings: Mesh[]
}

export async function buildRoom(
  scene: Scene,
  dimensions: RoomDimensions
): Promise<RoomMeshes> {
  const { MeshBuilder, StandardMaterial, Color3, Vector3 } = await import(
    '@babylonjs/core'
  )

  const { width, height, depth } = dimensions

  // Épaisseur réelle des murs (30cm) — l'arête supérieure est visible depuis la caméra
  // et les murs projettent leur ombre sur le sol grâce au volume.
  const WALL_THICKNESS = 0.3

  // Matériau temporaire murs — cohérent avec createWallMaterial() pour éviter le flash au swap.
  // emissive zéro : les ombres portées doivent être visibles dès le premier frame.
  const tempMat = new StandardMaterial('temp-wall', scene)
  tempMat.diffuseColor = new Color3(0.80, 0.80, 0.80)
  tempMat.emissiveColor = new Color3(0.0, 0.0, 0.0)
  tempMat.specularColor = new Color3(0.03, 0.03, 0.03)
  tempMat.backFaceCulling = false

  // Matériau temporaire sol — cohérent avec createFloorMaterial() pour éviter le flash au swap.
  // diffuse/emissive alignés sur le fond #F5F5F3 (≈ 0.96, 0.96, 0.95) de la DynamicTexture.
  // emissive (0.78) : luminosité de base identique à l'emissiveColor du matériau définitif.
  const tempFloorMat = new StandardMaterial('temp-floor', scene)
  tempFloorMat.diffuseColor = new Color3(0.96, 0.96, 0.95)
  tempFloorMat.emissiveColor = new Color3(0.78, 0.78, 0.78)
  tempFloorMat.specularColor = new Color3(0.12, 0.12, 0.12)
  tempFloorMat.specularPower = 48

  // -------------------------------------------------------------------
  // Sol — CreateGround : plan horizontal, normales vers +Y
  // width=10, height=depth=15 (paramètre "height" de CreateGround = profondeur Z)
  // centré en (0,0,0) → s'étend de X=-5 à X=5 et Z=-7.5 à Z=7.5
  // -------------------------------------------------------------------
  const floor = MeshBuilder.CreateGround(
    'floor',
    { width, height: depth, subdivisions: 1 },
    scene
  )
  floor.position = new Vector3(0, 0, 0)
  floor.material = tempFloorMat
  floor.checkCollisions = true
  floor.isPickable = true

  // -------------------------------------------------------------------
  // Pas de plafond — espace ouvert vers le haut pour la lumière zénithale.
  // Le fond de scène clearColor (0.93, 0.93, 0.93) se fond naturellement
  // avec les murs blancs, donnant l'illusion d'un espace ouvert infini.
  // -------------------------------------------------------------------

  // -------------------------------------------------------------------
  // Murs avec épaisseur — CreateBox avec depth=WALL_THICKNESS.
  // Cela donne une vraie arête supérieure visible depuis la caméra et
  // permet aux murs de projeter des ombres portées réalistes sur le sol.
  // -------------------------------------------------------------------

  // Mur arrière (fond de salle) — à Z=-depth/2
  // Centré à Y=height/2 pour couvrir Y=0 à Y=height
  const wallBack = MeshBuilder.CreateBox(
    'wall-back',
    { width, height, depth: WALL_THICKNESS },
    scene
  )
  wallBack.position = new Vector3(0, height / 2, -depth / 2)
  wallBack.material = tempMat
  wallBack.checkCollisions = true
  wallBack.isPickable = false

  // Mur avant (entrée) — à Z=+depth/2
  const wallFront = MeshBuilder.CreateBox(
    'wall-front',
    { width, height, depth: WALL_THICKNESS },
    scene
  )
  wallFront.position = new Vector3(0, height / 2, depth / 2)
  wallFront.material = tempMat
  wallFront.checkCollisions = true
  wallFront.isPickable = false

  // Mur gauche — à X=-width/2
  // depth du box = depth de la salle pour couvrir toute la longueur
  const wallLeft = MeshBuilder.CreateBox(
    'wall-left',
    { width: WALL_THICKNESS, height, depth },
    scene
  )
  wallLeft.position = new Vector3(-width / 2, height / 2, 0)
  wallLeft.material = tempMat
  wallLeft.checkCollisions = true
  wallLeft.isPickable = false

  // Mur droit — à X=+width/2
  const wallRight = MeshBuilder.CreateBox(
    'wall-right',
    { width: WALL_THICKNESS, height, depth },
    scene
  )
  wallRight.position = new Vector3(width / 2, height / 2, 0)
  wallRight.material = tempMat
  wallRight.checkCollisions = true
  wallRight.isPickable = false

  // -------------------------------------------------------------------
  // Plinthes — lignes sombres à la base des 4 murs
  // Hauteur 0.1m, posées sur le sol (Y=0.05), saillent de 0.02m
  // Couleur discrète (0.82, 0.82, 0.82) — jonction visible mais non agressive
  // -------------------------------------------------------------------
  const skirtingMat = new StandardMaterial('skirting-temp', scene)
  skirtingMat.diffuseColor = new Color3(0.82, 0.82, 0.82)
  skirtingMat.emissiveColor = new Color3(0.0, 0.0, 0.0)
  skirtingMat.specularColor = new Color3(0.03, 0.03, 0.03)

  const skirtingH = 0.1   // hauteur de la plinthe (m)
  const skirtingD = 0.02  // épaisseur / saillie (m)
  const skirtingY = skirtingH / 2 // centre Y = posée sur sol

  // Plinthe mur arrière (Z=-depth/2)
  const skirtBack = MeshBuilder.CreateBox(
    'skirting-back',
    { width, height: skirtingH, depth: skirtingD },
    scene
  )
  skirtBack.position = new Vector3(0, skirtingY, -depth / 2 + skirtingD / 2 + WALL_THICKNESS / 2)
  skirtBack.material = skirtingMat
  skirtBack.isPickable = false

  // Plinthe mur avant (Z=+depth/2)
  const skirtFront = MeshBuilder.CreateBox(
    'skirting-front',
    { width, height: skirtingH, depth: skirtingD },
    scene
  )
  skirtFront.position = new Vector3(0, skirtingY, depth / 2 - skirtingD / 2 - WALL_THICKNESS / 2)
  skirtFront.material = skirtingMat
  skirtFront.isPickable = false

  // Plinthe mur gauche (X=-width/2)
  const skirtLeft = MeshBuilder.CreateBox(
    'skirting-left',
    { width: skirtingD, height: skirtingH, depth },
    scene
  )
  skirtLeft.position = new Vector3(-width / 2 + skirtingD / 2 + WALL_THICKNESS / 2, skirtingY, 0)
  skirtLeft.material = skirtingMat
  skirtLeft.isPickable = false

  // Plinthe mur droit (X=+width/2)
  const skirtRight = MeshBuilder.CreateBox(
    'skirting-right',
    { width: skirtingD, height: skirtingH, depth },
    scene
  )
  skirtRight.position = new Vector3(width / 2 - skirtingD / 2 - WALL_THICKNESS / 2, skirtingY, 0)
  skirtRight.material = skirtingMat
  skirtRight.isPickable = false

  return {
    floor,
    walls: {
      back: wallBack,
      front: wallFront,
      left: wallLeft,
      right: wallRight,
    },
    skirtings: [skirtBack, skirtFront, skirtLeft, skirtRight],
  }
}
