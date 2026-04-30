import type { Scene, Mesh } from '@babylonjs/core'

export interface RoomDimensions {
  width: number
  height: number
  depth: number
}

export interface RoomMeshes {
  floor: Mesh
  ceiling: Mesh
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
  const { MeshBuilder, StandardMaterial, Color3, Vector3, Mesh: BabMesh } = await import(
    '@babylonjs/core'
  )

  const { width, height, depth } = dimensions

  // Matériau temporaire neutre — sera remplacé par GalleryScene avec les matériaux
  // définitifs. emissiveColor minimal (pas blanc uniforme) pour que la directionnelle
  // révèle déjà la géométrie à ce stade.
  const tempMat = new StandardMaterial('temp-white', scene)
  tempMat.diffuseColor = new Color3(0.9, 0.9, 0.9)
  tempMat.emissiveColor = new Color3(0.05, 0.05, 0.05)
  tempMat.backFaceCulling = false

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
  floor.material = tempMat
  floor.checkCollisions = true
  floor.isPickable = false

  // -------------------------------------------------------------------
  // Plafond — plan horizontal retourné (normales vers -Y = vers le bas)
  // À Y=height (4m) — rotation.x=PI retourne les normales vers le bas,
  // rendant la face visible depuis l'intérieur de la salle
  // -------------------------------------------------------------------
  const ceiling = MeshBuilder.CreateGround(
    'ceiling',
    { width, height: depth, subdivisions: 1 },
    scene
  )
  ceiling.position = new Vector3(0, height, 0)
  ceiling.rotation = new Vector3(Math.PI, 0, 0)
  ceiling.material = tempMat
  ceiling.checkCollisions = true
  ceiling.isPickable = false

  // -------------------------------------------------------------------
  // Mur arrière (fond de salle) — à Z=-depth/2 = Z=-7.5
  // DOUBLESIDE : visible depuis les deux côtés (sécurité si caméra traverse)
  // rotation.y=PI : face avant du plan pointe vers +Z (vers la caméra)
  // centré à Y=height/2=2 pour couvrir Y=0 à Y=4
  // -------------------------------------------------------------------
  const wallBack = MeshBuilder.CreatePlane(
    'wall-back',
    { width, height, sideOrientation: BabMesh.DOUBLESIDE },
    scene
  )
  wallBack.position = new Vector3(0, height / 2, -depth / 2)
  wallBack.rotation = new Vector3(0, Math.PI, 0)
  wallBack.material = tempMat
  wallBack.checkCollisions = true
  wallBack.isPickable = false

  // -------------------------------------------------------------------
  // Mur avant (entrée) — à Z=+depth/2 = Z=+7.5
  // rotation.y=0 : face avant pointe vers -Z (vers l'intérieur de la salle)
  // -------------------------------------------------------------------
  const wallFront = MeshBuilder.CreatePlane(
    'wall-front',
    { width, height, sideOrientation: BabMesh.DOUBLESIDE },
    scene
  )
  wallFront.position = new Vector3(0, height / 2, depth / 2)
  wallFront.rotation = new Vector3(0, 0, 0)
  wallFront.material = tempMat
  wallFront.checkCollisions = true
  wallFront.isPickable = false

  // -------------------------------------------------------------------
  // Mur gauche — à X=-width/2 = X=-5
  // rotation.y=-PI/2 : face avant pointe vers +X (vers l'intérieur)
  // width du plan = depth (15m) pour couvrir toute la longueur de la salle
  // -------------------------------------------------------------------
  const wallLeft = MeshBuilder.CreatePlane(
    'wall-left',
    { width: depth, height, sideOrientation: BabMesh.DOUBLESIDE },
    scene
  )
  wallLeft.position = new Vector3(-width / 2, height / 2, 0)
  wallLeft.rotation = new Vector3(0, -Math.PI / 2, 0)
  wallLeft.material = tempMat
  wallLeft.checkCollisions = true
  wallLeft.isPickable = false

  // -------------------------------------------------------------------
  // Mur droit — à X=+width/2 = X=+5
  // rotation.y=PI/2 : face avant pointe vers -X (vers l'intérieur)
  // -------------------------------------------------------------------
  const wallRight = MeshBuilder.CreatePlane(
    'wall-right',
    { width: depth, height, sideOrientation: BabMesh.DOUBLESIDE },
    scene
  )
  wallRight.position = new Vector3(width / 2, height / 2, 0)
  wallRight.rotation = new Vector3(0, Math.PI / 2, 0)
  wallRight.material = tempMat
  wallRight.checkCollisions = true
  wallRight.isPickable = false

  // -------------------------------------------------------------------
  // Plinthes — lignes sombres à la base des 4 murs
  // Hauteur 0.1m, posées sur le sol (Y=0.05), saillent de 0.02m
  // Créent un contraste sol/mur net qui renforce la perception de perspective
  // -------------------------------------------------------------------
  const skirtingMat = new StandardMaterial('skirting-temp', scene)
  skirtingMat.diffuseColor = new Color3(0.3, 0.28, 0.26)
  skirtingMat.emissiveColor = new Color3(0.04, 0.04, 0.03)
  skirtingMat.specularColor = new Color3(0.05, 0.05, 0.05)

  const skirtingH = 0.1   // hauteur de la plinthe (m)
  const skirtingD = 0.02  // épaisseur / saillie (m)
  const skirtingY = skirtingH / 2 // centre Y = posée sur sol

  // Plinthe mur arrière (Z=-depth/2)
  const skirtBack = MeshBuilder.CreateBox(
    'skirting-back',
    { width, height: skirtingH, depth: skirtingD },
    scene
  )
  skirtBack.position = new Vector3(0, skirtingY, -depth / 2 + skirtingD / 2)
  skirtBack.material = skirtingMat
  skirtBack.isPickable = false

  // Plinthe mur avant (Z=+depth/2)
  const skirtFront = MeshBuilder.CreateBox(
    'skirting-front',
    { width, height: skirtingH, depth: skirtingD },
    scene
  )
  skirtFront.position = new Vector3(0, skirtingY, depth / 2 - skirtingD / 2)
  skirtFront.material = skirtingMat
  skirtFront.isPickable = false

  // Plinthe mur gauche (X=-width/2)
  const skirtLeft = MeshBuilder.CreateBox(
    'skirting-left',
    { width: skirtingD, height: skirtingH, depth },
    scene
  )
  skirtLeft.position = new Vector3(-width / 2 + skirtingD / 2, skirtingY, 0)
  skirtLeft.material = skirtingMat
  skirtLeft.isPickable = false

  // Plinthe mur droit (X=+width/2)
  const skirtRight = MeshBuilder.CreateBox(
    'skirting-right',
    { width: skirtingD, height: skirtingH, depth },
    scene
  )
  skirtRight.position = new Vector3(width / 2 - skirtingD / 2, skirtingY, 0)
  skirtRight.material = skirtingMat
  skirtRight.isPickable = false

  return {
    floor,
    ceiling,
    walls: {
      back: wallBack,
      front: wallFront,
      left: wallLeft,
      right: wallRight,
    },
    skirtings: [skirtBack, skirtFront, skirtLeft, skirtRight],
  }
}
