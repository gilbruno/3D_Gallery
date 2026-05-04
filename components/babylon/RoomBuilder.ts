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
    left: Mesh       // bandeau bas (représentant) — utiliser wallLeftSegments pour tout
    right: Mesh
  }
  wallLeftSegments: Mesh[]   // tous les segments du mur gauche percé
  wallRightSegments: Mesh[]  // tous les segments du mur droit percé
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

  // Mur gauche — découpé pour laisser les ouvertures des 3 fenêtres
  // Fenêtres : WIN_H=3.2m (Y 0.3→3.5), WIN_W=0.9m, centres Z=-2.8, 0, +2.8
  // Le mur est reconstruit en 3 bandeaux horizontaux + 4 poteaux verticaux
  const WIN_H = 3.2, WIN_W = 0.9, WIN_Y = 1.9
  const winYBot = WIN_Y - WIN_H / 2   // 0.3
  const winYTop = WIN_Y + WIN_H / 2   // 3.5
  // Positions Z synchronisées avec WindowsBuilder — entre les œuvres gauche (Z=-4.5, 0, +4.5)
  const zCenters = [-6.2, -2.25, 2.25]
  const halfW = WIN_W / 2

  // Bandeau bas (sous les fenêtres) — pleine longueur
  const leftBandBot = MeshBuilder.CreateBox('wall-left-bot', { width: WALL_THICKNESS, height: winYBot, depth }, scene)
  leftBandBot.position = new Vector3(-width / 2, winYBot / 2, 0)
  leftBandBot.material = tempMat; leftBandBot.checkCollisions = true; leftBandBot.isPickable = false

  // Bandeau haut (dessus des fenêtres) — pleine longueur
  const topH = height - winYTop
  const leftBandTop = MeshBuilder.CreateBox('wall-left-top', { width: WALL_THICKNESS, height: topH, depth }, scene)
  leftBandTop.position = new Vector3(-width / 2, winYTop + topH / 2, 0)
  leftBandTop.material = tempMat; leftBandTop.checkCollisions = true; leftBandTop.isPickable = false

  // Poteaux entre (et autour) des fenêtres — hauteur de la zone fenêtrée
  const postH = WIN_H
  const postY = WIN_Y
  // Bords Z des ouvertures
  const openings = zCenters.map(z => [z - halfW, z + halfW] as [number, number])
  // Intervalles entre ouvertures : de -depth/2 aux bords gauches/droits
  const [o0, o1, o2] = openings as [[number,number],[number,number],[number,number]]
  const postZRanges: Array<[number, number]> = [
    [-depth / 2, o0[0]],
    [o0[1], o1[0]],
    [o1[1], o2[0]],
    [o2[1], depth / 2],
  ]
  const wallLeftMeshes = [leftBandBot, leftBandTop]
  for (const [zA, zB] of postZRanges) {
    const pDepth = zB - zA
    if (pDepth <= 0) continue
    const post = MeshBuilder.CreateBox(`wall-left-post-${zA}`, { width: WALL_THICKNESS, height: postH, depth: pDepth }, scene)
    post.position = new Vector3(-width / 2, postY, (zA + zB) / 2)
    post.material = tempMat; post.checkCollisions = true; post.isPickable = false
    wallLeftMeshes.push(post)
  }
  // Représentant principal du mur gauche (bandeau bas) pour l'API existante
  const wallLeft = leftBandBot

  // Mur droit — percé symétriquement avec les mêmes ouvertures que le mur gauche
  const rightBandBot = MeshBuilder.CreateBox('wall-right-bot', { width: WALL_THICKNESS, height: winYBot, depth }, scene)
  rightBandBot.position = new Vector3(width / 2, winYBot / 2, 0)
  rightBandBot.material = tempMat; rightBandBot.checkCollisions = true; rightBandBot.isPickable = false

  const rightBandTop = MeshBuilder.CreateBox('wall-right-top', { width: WALL_THICKNESS, height: topH, depth }, scene)
  rightBandTop.position = new Vector3(width / 2, winYTop + topH / 2, 0)
  rightBandTop.material = tempMat; rightBandTop.checkCollisions = true; rightBandTop.isPickable = false

  const wallRightMeshes = [rightBandBot, rightBandTop]
  for (const [zA, zB] of postZRanges) {
    const pDepth = zB - zA
    if (pDepth <= 0) continue
    const post = MeshBuilder.CreateBox(`wall-right-post-${zA}`, { width: WALL_THICKNESS, height: postH, depth: pDepth }, scene)
    post.position = new Vector3(width / 2, postY, (zA + zB) / 2)
    post.material = tempMat; post.checkCollisions = true; post.isPickable = false
    wallRightMeshes.push(post)
  }
  const wallRight = rightBandBot

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
    wallLeftSegments: wallLeftMeshes,
    wallRightSegments: wallRightMeshes,
    skirtings: [skirtBack, skirtFront, skirtLeft, skirtRight],
  }
}
