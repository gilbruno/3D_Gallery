import type { Scene } from '@babylonjs/core'

// Table basse minimaliste : plateau blanc + 4 pieds noirs carrés
// Inspiré du screenshot : structure épurée, pieds massifs, plateau fin
async function buildCoffeeTable(
  scene: Scene,
  id: string,
  posX: number,
  posZ: number,
  tableW: number,  // largeur (axe Z)
  tableD: number,  // profondeur (axe X)
  tableH: number,  // hauteur totale
  MeshBuilder: typeof import('@babylonjs/core').MeshBuilder,
  Vector3: typeof import('@babylonjs/core').Vector3,
  platMat: InstanceType<typeof import('@babylonjs/core').StandardMaterial>,
  legMat: InstanceType<typeof import('@babylonjs/core').StandardMaterial>,
) {
  const LEG_S = 0.06   // section carrée des pieds (m)
  const TOP_H = 0.05   // épaisseur du plateau (m)
  const LEG_H = tableH - TOP_H
  const LEG_Y = LEG_H / 2
  const TOP_Y = LEG_H + TOP_H / 2

  // Plateau blanc
  const top = MeshBuilder.CreateBox(`${id}-top`, { width: tableD, height: TOP_H, depth: tableW }, scene)
  top.position = new Vector3(posX, TOP_Y, posZ)
  top.material = platMat
  top.isPickable = false

  // 4 pieds aux coins — retrait de LEG_S/2 depuis le bord du plateau
  const offX = tableD / 2 - LEG_S
  const offZ = tableW / 2 - LEG_S
  for (const [dx, dz] of [[-1,-1],[-1,1],[1,-1],[1,1]] as Array<[number,number]>) {
    const leg = MeshBuilder.CreateBox(`${id}-leg-${dx}${dz}`, { width: LEG_S, height: LEG_H, depth: LEG_S }, scene)
    leg.position = new Vector3(posX + dx * offX, LEG_Y, posZ + dz * offZ)
    leg.material = legMat
    leg.isPickable = false
  }
}

export async function buildFurniture(scene: Scene): Promise<void> {
  const { MeshBuilder, StandardMaterial, Color3, Vector3 } = await import('@babylonjs/core')

  // Plateau blanc laqué mat
  const platMat = new StandardMaterial('furniture-white', scene)
  platMat.diffuseColor = new Color3(0.97, 0.97, 0.97)
  platMat.specularColor = new Color3(0.15, 0.15, 0.15)
  platMat.specularPower = 40

  // Pieds noir laque
  const legMat = new StandardMaterial('furniture-black', scene)
  legMat.diffuseColor = new Color3(0.05, 0.05, 0.05)
  legMat.specularColor = new Color3(0.12, 0.12, 0.12)
  legMat.specularPower = 80

  // Table principale — grande, centrée légèrement vers l'avant
  await buildCoffeeTable(scene, 'table-main', 0, 1.5, 1.4, 0.7, 0.38,
    MeshBuilder, Vector3, platMat, legMat)

  // Table d'appoint — plus petite, décalée côté droit/arrière
  await buildCoffeeTable(scene, 'table-side', 0.9, 0.2, 0.7, 0.55, 0.48,
    MeshBuilder, Vector3, platMat, legMat)
}
