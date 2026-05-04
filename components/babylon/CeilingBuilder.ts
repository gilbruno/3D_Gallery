import type { Scene } from '@babylonjs/core'

// Faux plafond avec caisson en retrait — style galerie kunstmatrix.
// Architecture (vue de l'intérieur) :
//
//   Mur ─────┐                                        ┌──── Mur
//            │ <- bandeau périph. (visible vers bas)  │
//            └──┐                                  ┌──┘ <- corniche fine saillante
//               │   <- vide (caisson en retrait)   │
//               └──────── panneau central ─────────┘  <- Y=3.5 (lumineux)
//                                                        Y=4.0 (plafond bandeau)
//
// Le panneau central blanc pur lumineux est entouré par un cadre périphérique
// en retrait — l'effet de caisson vient du fait que les bords forment un U inversé.

export async function buildCeiling(scene: Scene): Promise<void> {
  const { MeshBuilder, StandardMaterial, Color3, Vector3 } = await import('@babylonjs/core')

  const ROOM_W = 10
  const ROOM_D = 15

  // Hauteurs : panneau central abaissé + bandeau périph. au niveau plafond
  const Y_PANEL = 3.5      // panneau central (face inférieure visible)
  const Y_BAND_BOT = 4.0   // bandeau périph. (face inférieure visible) — plus haut = en retrait
  const BORDER_W = 1.0     // largeur du cadre périphérique (le retrait visible)

  // Largeur du panneau central
  const PAN_W = ROOM_W - BORDER_W * 2  // 8m
  const PAN_D = ROOM_D - BORDER_W * 2  // 13m

  // Matériau panneau central — gris très clair naturel, faiblement émissif.
  // L'émissif faible (0.10) garde une luminosité de base sans saturer ;
  // le diffus à 0.88 réagit fortement aux DirectionalLight des fenêtres.
  const panelMat = new StandardMaterial('ceil-panel', scene)
  panelMat.diffuseColor = new Color3(0.88, 0.88, 0.88)
  panelMat.emissiveColor = new Color3(0.10, 0.10, 0.10)
  panelMat.specularColor = new Color3(0.0, 0.0, 0.0)
  panelMat.backFaceCulling = false

  // Matériau bandeau périphérique — gris légèrement plus foncé (en retrait, plus sombre)
  // Très peu émissif pour rester dans l'ombre du retrait par rapport au panneau central.
  const bandMat = new StandardMaterial('ceil-band', scene)
  bandMat.diffuseColor = new Color3(0.78, 0.78, 0.78)
  bandMat.emissiveColor = new Color3(0.05, 0.05, 0.05)
  bandMat.specularColor = new Color3(0.0, 0.0, 0.0)
  bandMat.backFaceCulling = false

  // ── 1. Panneau central abaissé (Y=3.5) ──
  // Plan horizontal face inférieure visible vers le bas
  const panel = MeshBuilder.CreateBox('ceil-panel-mesh', {
    width: PAN_W, height: 0.04, depth: PAN_D,
  }, scene)
  panel.position = new Vector3(0, Y_PANEL, 0)
  panel.material = panelMat
  panel.isPickable = false

  // ── 2. Cadre périphérique horizontal (Y=4.0) ──
  // 4 bandes plates qui forment un cadre rectangulaire en U autour du panneau central.
  // Vu d'en bas, on voit le panneau central blanc + le cadre gris en retrait au-dessus.

  // Bandeau arrière
  const bBack = MeshBuilder.CreateBox('ceil-band-back', {
    width: ROOM_W, height: 0.04, depth: BORDER_W,
  }, scene)
  bBack.position = new Vector3(0, Y_BAND_BOT, -ROOM_D / 2 + BORDER_W / 2)
  bBack.material = bandMat
  bBack.isPickable = false

  // Bandeau avant
  const bFront = MeshBuilder.CreateBox('ceil-band-front', {
    width: ROOM_W, height: 0.04, depth: BORDER_W,
  }, scene)
  bFront.position = new Vector3(0, Y_BAND_BOT, ROOM_D / 2 - BORDER_W / 2)
  bFront.material = bandMat
  bFront.isPickable = false

  // Bandeau gauche
  const bLeft = MeshBuilder.CreateBox('ceil-band-left', {
    width: BORDER_W, height: 0.04, depth: PAN_D,
  }, scene)
  bLeft.position = new Vector3(-ROOM_W / 2 + BORDER_W / 2, Y_BAND_BOT, 0)
  bLeft.material = bandMat
  bLeft.isPickable = false

  // Bandeau droit
  const bRight = MeshBuilder.CreateBox('ceil-band-right', {
    width: BORDER_W, height: 0.04, depth: PAN_D,
  }, scene)
  bRight.position = new Vector3(ROOM_W / 2 - BORDER_W / 2, Y_BAND_BOT, 0)
  bRight.material = bandMat
  bRight.isPickable = false

  // ── 3. Joues verticales du caisson ──
  // Plans verticaux qui relient le bord du panneau central (Y=3.5) au cadre périph. (Y=4.0).
  // Visibles de l'intérieur depuis le panneau lumineux : créent l'effet de profondeur du caisson.
  const JOUE_H = Y_BAND_BOT - Y_PANEL   // 0.5m
  const JOUE_Y = Y_PANEL + JOUE_H / 2    // centre vertical
  const JOUE_T = 0.04                    // épaisseur

  // Joue arrière
  const jBack = MeshBuilder.CreateBox('ceil-joue-back', {
    width: PAN_W, height: JOUE_H, depth: JOUE_T,
  }, scene)
  jBack.position = new Vector3(0, JOUE_Y, -PAN_D / 2)
  jBack.material = panelMat   // même matériau lumineux que le panneau (réflexion lumière)
  jBack.isPickable = false

  // Joue avant
  const jFront = MeshBuilder.CreateBox('ceil-joue-front', {
    width: PAN_W, height: JOUE_H, depth: JOUE_T,
  }, scene)
  jFront.position = new Vector3(0, JOUE_Y, PAN_D / 2)
  jFront.material = panelMat
  jFront.isPickable = false

  // Joue gauche
  const jLeft = MeshBuilder.CreateBox('ceil-joue-left', {
    width: JOUE_T, height: JOUE_H, depth: PAN_D,
  }, scene)
  jLeft.position = new Vector3(-PAN_W / 2, JOUE_Y, 0)
  jLeft.material = panelMat
  jLeft.isPickable = false

  // Joue droite
  const jRight = MeshBuilder.CreateBox('ceil-joue-right', {
    width: JOUE_T, height: JOUE_H, depth: PAN_D,
  }, scene)
  jRight.position = new Vector3(PAN_W / 2, JOUE_Y, 0)
  jRight.material = panelMat
  jRight.isPickable = false

  // ── 4. Corniche saillante — listel fin à la jonction mur/cadre périph. ──
  // Saille vers l'intérieur depuis le bandeau, à hauteur Y=4.0 (sous le cadre).
  const CORN_T = 0.04   // saillie verticale
  const CORN_W = 0.05   // saillie horizontale
  const CORN_Y = Y_BAND_BOT - CORN_T / 2

  // Corniche arrière
  const cBack = MeshBuilder.CreateBox('ceil-corn-back', {
    width: ROOM_W, height: CORN_T, depth: CORN_W,
  }, scene)
  cBack.position = new Vector3(0, CORN_Y, -ROOM_D / 2 + CORN_W / 2)
  cBack.material = bandMat
  cBack.isPickable = false

  // Corniche avant
  const cFront = MeshBuilder.CreateBox('ceil-corn-front', {
    width: ROOM_W, height: CORN_T, depth: CORN_W,
  }, scene)
  cFront.position = new Vector3(0, CORN_Y, ROOM_D / 2 - CORN_W / 2)
  cFront.material = bandMat
  cFront.isPickable = false

  // Corniche gauche
  const cLeft = MeshBuilder.CreateBox('ceil-corn-left', {
    width: CORN_W, height: CORN_T, depth: ROOM_D,
  }, scene)
  cLeft.position = new Vector3(-ROOM_W / 2 + CORN_W / 2, CORN_Y, 0)
  cLeft.material = bandMat
  cLeft.isPickable = false

  // Corniche droite
  const cRight = MeshBuilder.CreateBox('ceil-corn-right', {
    width: CORN_W, height: CORN_T, depth: ROOM_D,
  }, scene)
  cRight.position = new Vector3(ROOM_W / 2 - CORN_W / 2, CORN_Y, 0)
  cRight.material = bandMat
  cRight.isPickable = false
}
