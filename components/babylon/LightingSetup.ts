import type { Scene, HemisphericLight, DirectionalLight } from '@babylonjs/core'

export interface GalleryLights {
  ambient: HemisphericLight
  main: DirectionalLight
}

export async function setupLighting(scene: Scene): Promise<GalleryLights> {
  const { HemisphericLight, DirectionalLight, Vector3, Color3 } = await import(
    '@babylonjs/core'
  )

  // Désactivation explicite de l'IBL — évite le shader rgbdDecode
  // qui se déclenche même sans scene.environmentTexture explicite
  scene.environmentIntensity = 0

  // Lumière principale venant du plafond avec inclinaison latérale.
  // La direction (-0.3, -1, -0.5) crée un gradient sur les murs latéraux
  // et révèle la jonction sol/mur — essentiel pour la perception de volume.
  const main = new DirectionalLight(
    'main',
    new Vector3(-0.3, -1, -0.5),
    scene
  )
  main.intensity = 1.2
  main.diffuse = new Color3(1, 0.98, 0.92)
  main.specular = new Color3(0.1, 0.1, 0.08)

  // Hémisphérique très douce — évite le noir total dans les coins
  // sans annuler les ombres que crée la directionnelle
  const ambient = new HemisphericLight(
    'ambient',
    new Vector3(0, 1, 0),
    scene
  )
  ambient.intensity = 0.4
  ambient.diffuse = new Color3(0.9, 0.88, 0.85)
  ambient.groundColor = new Color3(0.3, 0.28, 0.25)
  ambient.specular = new Color3(0.05, 0.05, 0.05)

  return { ambient, main }
}
