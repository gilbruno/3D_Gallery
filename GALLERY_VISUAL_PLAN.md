# Plan d'amélioration visuelle — Galerie de luxe
# Objectif : atteindre le rendu de l'image de référence (style kunstmatrix)
# Babylon.js 9.5.0 — primitives uniquement, sans asset externe

---

## Référence visuelle cible

Galerie blanche lumineuse, style contemporain haut de gamme :
- Murs blancs purs, sol gris clair lisse légèrement réfléchissant
- Faux plafond avec caisson et corniche périphérique
- Grandes fenêtres à croisillons sur un mur (lumière naturelle simulée)
- Mobilier minimaliste noir laque + blanc
- Éclairage doux, pas de spots visibles, lumière venant des fenêtres

---

## Priorité 1 — Palette de couleurs (impact immédiat)

**Fichier : `lib/babylon/materials.ts`**

| Surface | Couleur actuelle | Couleur cible |
|---|---|---|
| Murs | Gris moyen `Color3(0.94, 0.93, 0.91)` | Blanc pur `Color3(0.98, 0.98, 0.98)` |
| Sol | Beige sable `Color3(0.91, 0.89, 0.85)` | Chêne blond `Color3(0.82, 0.72, 0.58)` + texture parquet |
| Plafond | Blanc chaud `Color3(0.96, 0.95, 0.94)` | Blanc pur `Color3(0.99, 0.99, 0.99)` |
| Plinthes | Beige | Blanc satiné `Color3(0.97, 0.97, 0.97)` |

- Sol : roughness=0.55, texture parquet chêne clair (DynamicTexture lames larges), sans MirrorTexture
- Murs : roughness=0.90, sans texture apparente (supprimer DynamicTexture granuleuse)
- `scene.clearColor` → `Color4(0.97, 0.97, 0.97, 1.0)` (blanc neutre)

---

## Priorité 2 — Architecture plafond (caisson + corniche)

**Fichier : `components/babylon/CeilingBuilder.ts`** (nouveau)

Éléments à construire avec primitives Babylon.js :

### Caisson central
- Faux plafond abaissé de 0.3m par rapport au plafond réel
- `CreateBox` plat couvrant 80% de la surface au sol
- Matériau blanc pur, roughness=0.88
- Légère emissive `Color3(0.02, 0.02, 0.02)` pour simuler la diffusion lumineuse

### Corniche périphérique
- `CreateBox` rectangulaire sur tout le périmètre du faux plafond (4 segments)
- Section : 0.15m hauteur × 0.12m profondeur
- Matériau blanc satiné, même que le plafond

### Rebord entre faux plafond et plafond réel
- `CreateBox` vertical sur le périmètre (joint d'angle)
- Crée l'effet de caisson en retrait visible dans l'image de référence

---

## Priorité 3 — Fenêtres avec lumière naturelle simulée

**Fichier : `components/babylon/WindowsBuilder.ts`** (nouveau)

### Géométrie des fenêtres (mur du fond ou mur latéral gauche)
- 3 grandes fenêtres côte à côte (largeur 1.2m, hauteur 3.0m chacune)
- Cadre : `CreateBox` blanc (épaisseur 0.08m) sur le périmètre
- Croisillons : 2 barres verticales + 3 barres horizontales par fenêtre (`CreateBox` fin brun `Color3(0.45, 0.30, 0.15)`)
- Vitre : `CreatePlane` avec matériau blanc semi-opaque émissif (simule lumière extérieure)
  - `emissiveColor Color3(1.0, 0.98, 0.95)`, `emissiveIntensity=1.8`
  - `alpha=0.85` (légère transparence)

### Lumière venant des fenêtres
- 1 `DirectionalLight` par groupe de fenêtres, direction vers l'intérieur de la salle
- Couleur lumière naturelle froide `Color3(0.92, 0.95, 1.0)` (blanc daylight)
- Intensity=1.2, avec `ShadowGenerator` pour les ombres portées sur le sol
- Ombres : `useBlurExponentialShadowMap=true`, résolution 1024

---

## Priorité 4 — Parquet élégant chêne clair

**Fichier : `lib/babylon/materials.ts`**

Style référence : parquet chêne naturel, lames larges ~15cm, ton sable/blond chaud, léger reflet satiné.

- Sol PBRMaterial, **pas de MirrorTexture** (reflet trop fort — utiliser roughness seul)
- `roughness=0.55`, `metallic=0.0`
- Couleur de base : `Color3(0.82, 0.72, 0.58)` (chêne blond naturel)
- Texture procédurale via `DynamicTexture` simulant les lames de parquet :
  - Fond : `#D2B896` (chêne clair)
  - Joints entre lames : lignes horizontales fines `#B89870` (légèrement plus foncé), espacement ~15cm (converti en px selon la résolution)
  - Variation de teinte subtile lame par lame (±5% luminosité) pour l'aspect naturel du bois
  - Lames larges (~0.15m), disposition en rangées décalées (parquet point de Hongrie simple)
- Taille texture : 512×512px mappée sur 4m×4m (tiling pour couvrir toute la surface)
- Pas de MirrorTexture — le léger reflet satiné est obtenu uniquement via `roughness=0.55`
- Supprimer l'ancienne texture granuleuse beige sable

---

## Priorité 5 — Mobilier minimaliste noir/blanc

**Fichier : `components/babylon/GalleryFurniture.ts`** (modifier)

Remplacer les bancs bois beige et socles par :

### Table basse minimaliste (style image de référence)
- Plateau : `CreateBox` blanc `Color3(0.98, 0.98, 0.98)`, roughness=0.20, 1.2m×0.04m×0.6m
- Pieds/structure : `CreateBox` noir laque `Color3(0.05, 0.05, 0.05)`, metallic=0.1, roughness=0.05
- Structure en H (2 montants verticaux + 1 traverse horizontale)
- Positionnée au centre de la galerie

### Table d'appoint basse (optionnel)
- Même style, dimensions 0.6m×0.35m, hauteur 0.35m
- Décalée de 0.5m sur le côté

### Supprimer
- Les sphères bronze (trop voyantes)
- Les bancs bois beige

---

## Priorité 6 — Éclairage revu

**Fichier : `components/babylon/LightingSetup.ts`**

- `HemisphericLight` : intensity=0.7 (plus lumineux), diffuse blanc pur `Color3(1.0, 1.0, 1.0)`
- `DirectionalLight` principale : intensity=0.6, direction légèrement rasante
- Supprimer les spotlights par œuvre pour l'instant (trop complexes, pas dans l'image de référence)
- `scene.clearColor` : blanc `Color4(0.97, 0.97, 0.97, 1.0)`

---

## Ordre d'implémentation recommandé

```
1. Priorité 1 — Couleurs            (lib/babylon/materials.ts)
2. Priorité 4 — Sol propre          (lib/babylon/materials.ts, même fichier)
3. Priorité 6 — Éclairage           (components/babylon/LightingSetup.ts)
4. Priorité 2 — Caisson plafond     (components/babylon/CeilingBuilder.ts — nouveau)
5. Priorité 3 — Fenêtres            (components/babylon/WindowsBuilder.ts — nouveau)
6. Priorité 5 — Mobilier            (components/babylon/GalleryFurniture.ts — modifier)
7. Intégration GalleryScene.tsx
8. tsc --noEmit → 0 erreur
```

---

## Ce que ce plan ne fait PAS (hors scope)

- Pas d'HDRI / IBL externe (dépendance réseau, problèmes CORS)
- Pas de SSAO (risque d'artefacts)
- Pas de navigation WebXR
- Pas de chargement d'assets GLTF/GLB

---

## Statut

- [ ] Priorité 1 — Palette couleurs
- [ ] Priorité 2 — Caisson plafond
- [ ] Priorité 3 — Fenêtres lumineuses
- [ ] Priorité 4 — Sol propre
- [ ] Priorité 5 — Mobilier minimaliste
- [ ] Priorité 6 — Éclairage
- [ ] Intégration GalleryScene.tsx
- [ ] TypeScript 0 erreur
