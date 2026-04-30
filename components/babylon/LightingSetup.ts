import type { Scene, HemisphericLight, DirectionalLight, ShadowGenerator } from '@babylonjs/core'

export interface GalleryLights {
  ambient: HemisphericLight
  main: DirectionalLight
  shadowGenerator: ShadowGenerator
}

export async function setupLighting(scene: Scene): Promise<GalleryLights> {
  const { HemisphericLight, DirectionalLight, Vector3, Color3, ShadowGenerator } = await import(
    '@babylonjs/core'
  )

  // Désactivation explicite de l'IBL — évite le shader rgbdDecode
  scene.environmentIntensity = 0

  // Lumière hémisphérique zénithale — simule la lumière du ciel venant d'en haut
  // via l'ouverture sans plafond. Intensity plus élevée (0.9) car plus de compensation
  // de plafond nécessaire : la lumière arrive directement de l'ouverture supérieure.
  // groundColor modérée : assure la lisibilité des surfaces inférieures sans les surexposer.
  const ambient = new HemisphericLight(
    'ambient',
    new Vector3(0, 1, 0),
    scene
  )
  ambient.intensity = 0.9
  // Lumière descendante : blanc légèrement chaud — ambiance galerie
  ambient.diffuse = new Color3(1.0, 0.99, 0.97)
  // groundColor modérée : rebond de lumière depuis le sol, évite les zones noires
  ambient.groundColor = new Color3(0.5, 0.5, 0.5)
  // Pas de spéculaire hémisphérique — surfaces mates galerie
  ambient.specular = new Color3(0.0, 0.0, 0.0)

  // Lumière directionnelle à angle rasant — crée les ombres portées des murs sur le sol.
  // L'angle (-0.3, -1, -0.3) est plus vertical que l'ancien (-0.5, -1, -0.5) :
  // les ombres sont moins longues et plus douces, style lumière zénithale naturelle.
  // Intensity 0.6 : assez forte pour des ombres visibles sans sur-contraster les murs blancs.
  const main = new DirectionalLight(
    'main',
    new Vector3(-0.3, -1, -0.3),
    scene
  )
  main.intensity = 0.6
  // Blanc pur — pas de teinte warm qui jaunirait les murs blancs
  main.diffuse = new Color3(1.0, 1.0, 1.0)
  // Spéculaire faible — pas d'effet miroir sur les surfaces mates
  main.specular = new Color3(0.05, 0.05, 0.05)

  // ShadowGenerator haute résolution — crucial pour les ombres douces des murs épais.
  // 2048 : résolution suffisante pour les ombres aux arêtes des boîtes de murs.
  // useBlurExponentialShadowMap : ombres très douces, style galerie d'art contemporaine.
  // blurKernel=64 : flou élevé pour des ombres diffuses élégantes (pas des bords durs).
  // darkness=0.25 : ombre légère et élégante — présente mais non agressive.
  const shadowGenerator = new ShadowGenerator(2048, main)
  shadowGenerator.useBlurExponentialShadowMap = true
  shadowGenerator.blurKernel = 64
  shadowGenerator.darkness = 0.25

  return { ambient, main, shadowGenerator }
}
