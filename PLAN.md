# Plan d'implémentation — Galerie d'art 3D immersive
# Stack : Next.js 15 + Babylon.js 7 + TypeScript strict

---

## 1. Architecture Next.js

### Structure de dossiers

```
3D_Gallery/
├── app/
│   ├── layout.tsx                  # Layout racine (fonts, metadata globale)
│   ├── page.tsx                    # Page d'accueil (liste des expositions)
│   ├── gallery/
│   │   └── [slug]/
│   │       └── page.tsx            # Page galerie dynamique (SSG via generateStaticParams)
│   └── api/
│       └── exhibitions/
│           └── route.ts            # API REST : liste des expositions et salles
├── components/
│   ├── babylon/
│   │   ├── BabylonCanvas.tsx       # Composant React bas-niveau : canvas + Engine lifecycle
│   │   ├── GalleryScene.tsx        # Orchestrateur de scène : salles, œuvres, caméra
│   │   ├── RoomBuilder.ts          # Construction procédurale des salles (murs/sol/plafond)
│   │   ├── ArtworkLoader.ts        # Chargement textures, mesh plan, cadre, cartel
│   │   ├── LightingSetup.ts        # HemisphericLight + SpotLights par œuvre
│   │   ├── CameraController.ts     # UniversalCamera first-person + collisions
│   │   └── GalleryUI.tsx           # Overlay DOM : HUD, cartel popup, minimap
│   ├── ui/
│   │   ├── LoadingScreen.tsx       # Écran de chargement avec progress bar
│   │   ├── ArtworkModal.tsx        # Modal detail œuvre (titre, artiste, prix, lien)
│   │   └── NavigationHints.tsx     # Hints clavier ZQSD / WASD au démarrage
│   └── layout/
│       └── GalleryLayout.tsx       # Wrapper plein-écran sans navbar pour galerie
├── data/
│   └── exhibitions/
│       ├── example-show.json       # Configuration déclarative d'une exposition
│       └── schema.ts               # Types TypeScript correspondant au JSON
├── lib/
│   ├── babylon/
│   │   ├── engine.ts               # Singleton Engine avec détection WebGPU/WebGL
│   │   ├── materials.ts            # Factories PBRMaterial (mur, sol, cadre)
│   │   └── optimizer.ts            # SceneOptimizer config adaptative
│   └── utils/
│       ├── aspectRatio.ts          # Calcul dimensions mesh selon ratio œuvre
│       └── cors.ts                 # Headers CORS pour textures cross-origin
├── public/
│   ├── models/
│   │   └── gallery-room.glb        # Modèle salle de base (optionnel, sinon procédural)
│   ├── textures/
│   │   ├── floor-parquet.ktx2      # Texture sol compressée KTX2
│   │   ├── wall-white.ktx2         # Texture mur blanc légèrement texturé
│   │   └── environment.env         # HDRI compressé Babylon pour ambiance
│   └── fonts/
│       └── gallery-sans.woff2      # Police pour cartels 3D
├── styles/
│   └── globals.css                 # Reset + variables CSS (couleurs galerie)
├── next.config.ts                  # Config Next.js avec headers CORS
├── tsconfig.json                   # TypeScript strict
└── package.json
```

### Pages et routing

- `app/page.tsx` : page d'accueil SSR listant les expositions disponibles (cards 2D).
  Rendu serveur complet, pas de Babylon.js ici.
- `app/gallery/[slug]/page.tsx` : page galerie. Génère les métadonnées côté serveur
  (`generateMetadata`), mais le composant 3D est importé dynamiquement avec `ssr: false`.
- `app/api/exhibitions/route.ts` : endpoint REST retournant les configurations JSON.
  En production, remplacé par un CMS headless (Contentful, Sanity, Directus).

---

## 2. Intégration Babylon.js dans Next.js

### Problème SSR

Babylon.js accède à `window`, `document`, `HTMLCanvasElement` au moment de l'import.
Ces APIs n'existent pas côté serveur (Node.js). Un import direct crashe le build Next.js.

### Solution : dynamic import avec `ssr: false`

Dans `app/gallery/[slug]/page.tsx` :

```tsx
// page.tsx (Server Component)
import dynamic from 'next/dynamic'

const GalleryScene = dynamic(
  () => import('@/components/babylon/GalleryScene'),
  {
    ssr: false,
    loading: () => <LoadingScreen />   // fallback rendu serveur
  }
)
```

`GalleryScene` reçoit la configuration JSON en prop. Tout le code Babylon.js reste
dans des fichiers marqués `'use client'` ou dans des modules non-importés côté serveur.

### Lifecycle du composant BabylonCanvas

`BabylonCanvas.tsx` gère exclusivement l'Engine :

1. `useRef` sur le `<canvas>` HTML
2. `useEffect` : instanciation `Engine`, création `Scene`, démarrage `runRenderLoop`
3. `window.addEventListener('resize', engine.resize)` pour la réactivité
4. Cleanup (return du useEffect) : `scene.getEngine().dispose()` + remove listener
5. Props exposées : `onSceneReady(scene: Scene)` callback, `onRender(scene: Scene)` callback

`GalleryScene.tsx` utilise `BabylonCanvas` et implémente `onSceneReady` pour
construire la scène complète à partir du JSON de configuration.

### Détection WebGPU

```ts
// lib/babylon/engine.ts
import { WebGPUEngine, Engine } from '@babylonjs/core'

export async function createEngine(canvas: HTMLCanvasElement): Promise<Engine> {
  const webGPUSupported = await WebGPUEngine.IsSupportedAsync
  if (webGPUSupported) {
    const engine = new WebGPUEngine(canvas)
    await engine.initAsync()
    return engine
  }
  return new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true })
}
```

### Mode dégradé 2D

Si `'webgl' in document.createElement('canvas')` est `false` (vieux navigateurs),
le composant `GalleryScene` affiche une galerie 2D alternative : grille CSS avec
les images des œuvres, sans aucun Babylon.js. Ce fallback est détecté dans un
`useEffect` initial avant tout chargement 3D.

---

## 3. Design de la scène 3D : salle blanche

### Géométrie procédurale de la salle

La salle est construite entièrement par code (pas de GLB obligatoire) via `MeshBuilder`.
Dimensions de référence artspaces.kunstmatrix.com : 10m x 4m de haut x 15m de profondeur.

```
Composants géométriques :
- Sol       : MeshBuilder.CreateGround       (width: 10, height: 15)
- Plafond   : MeshBuilder.CreateGround inversé (flipFaces: true)
- Mur fond  : MeshBuilder.CreatePlane        (face Z-)
- Mur entrée: MeshBuilder.CreatePlane        (face Z+)
- Mur gauche: MeshBuilder.CreatePlane        (face X-)
- Mur droit : MeshBuilder.CreatePlane        (face X+)
```

Chaque mesh a `checkCollisions = true` pour bloquer la caméra first-person.

### Matériaux PBR des surfaces

Tous les matériaux utilisent `PBRMaterial` pour un rendu cohérent avec l'éclairage IBL.

**Mur blanc galerie :**
```
albedoColor     : Color3(0.97, 0.97, 0.97)   // blanc légèrement chaud
metallic        : 0.0
roughness       : 0.85                          // légèrement mat
```

**Sol parquet clair :**
```
albedoTexture   : Texture('textures/floor-parquet.ktx2')
metallic        : 0.0
roughness       : 0.4                           // semi-brillant
bumpTexture     : normal map parquet
```

**Plafond blanc mat :**
```
albedoColor     : Color3(0.99, 0.99, 0.99)
metallic        : 0.0
roughness       : 1.0
```

### Éclairage galerie

```
1. HemisphericLight "ambient"
   direction : Vector3(0, 1, 0)
   intensity : 0.3
   groundColor : Color3(0.1, 0.1, 0.1)    // très faible, évite le noir total

2. DirectionalLight "fill"
   direction : Vector3(0, -1, 0.2)
   intensity : 0.2
   // Lumière de remplissage douce pour éviter les ombres trop dures

3. SpotLight par œuvre (voir section 4)

4. Environment IBL
   scene.environmentTexture = CubeTexture.CreateFromPrefilteredData(
     'textures/environment.env', scene
   )
   scene.environmentIntensity = 0.4
```

### Post-processing

Pipeline appliqué sur la caméra active :
```
- SSAO2RenderingPipeline     : radius 0.5, samples 8 (occlusion ambiante)
- DefaultRenderingPipeline   :
    bloomEnabled     : true, bloomWeight 0.3
    fxaaEnabled      : true
    tonemappingEnabled : true (ACES)
    imageProcessingEnabled : true, contrast 1.1, exposure 1.0
```
En mode mobile : SSAO2 désactivé, bloom désactivé (détecté par `SceneOptimizer`).

---

## 4. Pipeline d'affichage des œuvres

### Mesh d'œuvre (artwork plane)

Pour chaque œuvre dans le JSON :

1. Calcul des dimensions 3D selon le ratio réel de l'image :
   ```ts
   const ratio = meta.dimensions.width / meta.dimensions.height
   const meshHeight = meta.dimensions.height / 100  // px → mètres (base 100px/m)
   const meshWidth = meshHeight * ratio
   ```

2. Création du plan :
   ```ts
   const plane = MeshBuilder.CreatePlane(`artwork-${id}`, {
     width: meshWidth,
     height: meshHeight,
     sideOrientation: Mesh.FRONTSIDE
   }, scene)
   plane.position = Vector3.FromArray(artwork.position)
   plane.rotation = Vector3.FromArray(artwork.rotation)
   ```

3. Matériau image :
   ```ts
   const mat = new StandardMaterial(`mat-${id}`, scene)
   mat.diffuseTexture = new Texture(artwork.imageUrl, scene)
   mat.diffuseTexture.hasAlpha = false
   mat.emissiveColor = new Color3(1, 1, 1)  // émissif pour ne pas noircir l'image
   // ou PBRMaterial avec albedoTexture + metallic 0 + roughness 1 + emissiveTexture
   plane.material = mat
   ```

4. Chargement progressif : `AssetManager` avec `TextureAssetTask` pour chaque œuvre.
   Un `BinaryFileAssetTask` précharge d'abord une version basse résolution (300px wide)
   puis swap vers la haute résolution au passage dans le frustum.

### Cadre 3D procédural

Le cadre est généré par 4 `MeshBuilder.CreateBox` formant un rectangle creux,
parented au mesh œuvre :

```
Cadre : 4 boîtes (haut, bas, gauche, droite)
Épaisseur : 0.03m
Profondeur : 0.02m
Matériau   : PBRMaterial noir mat (metallic: 0, roughness: 0.8, albedo: Color3(0.05))
             ou doré selon le JSON (meta.frameStyle: 'black' | 'gold' | 'none')
```

Alternative pour performances : un seul mesh cadre généré via `Ribbon` ou importé
depuis un GLB générique réutilisé par instances (`InstancedMesh`).

### Spot individualisé par œuvre

```ts
const spot = new SpotLight(
  `spot-${id}`,
  new Vector3(artwork.position[0], roomHeight - 0.3, artwork.position[2] - 0.5),
  new Vector3(0, -1, 0.3).normalize(),
  Math.PI / 5,   // angle ouverture
  2,             // exposant de dispersion
  scene
)
spot.intensity = 1.2
spot.diffuse = new Color3(1, 0.97, 0.9)   // blanc légèrement chaud (3200K)
spot.specular = new Color3(0.5, 0.48, 0.45)

const shadowGen = new ShadowGenerator(512, spot)
shadowGen.addShadowCaster(plane)
shadowGen.usePoissonSampling = true
```

### Cartel 3D (label)

Utilisation de `GUI.AdvancedDynamicTexture` en mode `CreateForMesh` sur un petit
plan positionné sous l'œuvre :

```
Plan cartel : width 0.4m, height 0.12m
Contenu GUI : titre (14px bold), artiste (12px), année (12px), prix (11px italic)
Fond        : Rectangle blanc semi-transparent (alpha 0.85)
BillboardMode : Mesh.BILLBOARDMODE_NONE (fixe, face au mur)
```

### Interaction : clic sur une œuvre

```ts
plane.actionManager = new ActionManager(scene)
plane.actionManager.registerAction(
  new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
    onArtworkClick(artwork)   // callback React → ouvre ArtworkModal DOM
  })
)
```

Au survol (`OnPointerOverTrigger`) : curseur CSS `pointer`, légère élévation du spot
en intensité (1.2 → 1.5) pour effet "mise en valeur".

---

## 5. Navigation first-person

### Configuration UniversalCamera

```ts
const camera = new UniversalCamera(
  'gallery-cam',
  new Vector3(0, 1.65, 6),   // hauteur yeux adulte, position départ
  scene
)
camera.setTarget(new Vector3(0, 1.65, 0))
camera.attachControl(canvas, true)

// Vitesse et limites
camera.speed = 0.08               // marche lente (galerie)
camera.angularSensibility = 4000  // rotation douce à la souris
camera.minZ = 0.1
camera.maxZ = 100

// Collisions
camera.checkCollisions = true
camera.applyGravity = false       // pas de gravité (sol fixe)
camera.ellipsoid = new Vector3(0.4, 0.9, 0.4)  // capsule collision visiteur
scene.gravity = new Vector3(0, -9.81, 0)

// Pointer lock pour immersion
canvas.addEventListener('click', () => canvas.requestPointerLock())
```

### Contrôles clavier

`UniversalCamera` supporte WASD et touches directionnelles nativement.
Ajout d'un mapping ZQSD pour les claviers AZERTY :

```ts
camera.keysUp    = [87, 90, 38]   // W, Z, ArrowUp
camera.keysDown  = [83, 40]       // S, ArrowDown
camera.keysLeft  = [65, 81, 37]   // A, Q, ArrowLeft
camera.keysRight = [68, 39]       // D, ArrowRight
```

### Transition vers ArcRotateCamera (zoom œuvre)

Quand l'utilisateur clique une œuvre, transition animée vers une `ArcRotateCamera`
orbitale centrée sur l'œuvre :

```ts
// Animation de transition sur 800ms avec EaseInOutQuart
scene.activeCamera = arcCamera
arcCamera.setTarget(artwork.position)
const anim = Animation.CreateAndStartAnimation(
  'cam-transition', arcCamera, 'radius',
  60, 48, arcCamera.radius, 2.5,
  Animation.ANIMATIONLOOPMODE_CONSTANT,
  new QuarticEase()
)
```

Retour en first-person : touche Escape ou bouton DOM "Retour à la visite".

### Mode visite guidée (optionnel, phase 2)

Waypoints définis dans le JSON par œuvre. Animation automatique de la caméra
entre les waypoints avec interpolation Bezier, pause de 5s devant chaque œuvre,
lecture du cartel en audio (Web Speech API).

---

## 6. Format JSON déclaratif

### Fichier `data/exhibitions/example-show.json`

```json
{
  "version": "1.0",
  "exhibition": {
    "id": "example-show",
    "title": "Titre de l'exposition",
    "artist": "Nom de l'artiste",
    "startDate": "2024-03-01",
    "endDate": "2024-04-30",
    "coverImage": "https://cdn.example.com/cover.jpg"
  },
  "settings": {
    "ambientIntensity": 0.3,
    "spotIntensity": 1.2,
    "wallColor": "#f7f7f7",
    "floorTexture": "parquet",
    "enableSSAO": true,
    "enableBloom": true,
    "backgroundColor": "#e8e8e8"
  },
  "rooms": [
    {
      "id": "room-main",
      "label": "Salle principale",
      "dimensions": { "width": 10, "height": 4, "depth": 15 },
      "spawnPoint": [0, 1.65, 6],
      "spawnTarget": [0, 1.65, 0],
      "artworks": [
        {
          "id": "artwork-01",
          "imageUrl": "https://cdn.example.com/artworks/01-full.jpg",
          "imageUrlLow": "https://cdn.example.com/artworks/01-thumb.jpg",
          "position": [0, 1.8, -7.4],
          "rotation": [0, 0, 0],
          "dimensions": { "widthCm": 120, "heightCm": 80 },
          "frameStyle": "black",
          "spotPosition": [0, 3.7, -6.9],
          "meta": {
            "title": "Titre de l'œuvre",
            "artist": "Nom de l'artiste",
            "year": 2024,
            "medium": "Huile sur toile",
            "edition": "1/1",
            "price": 2500,
            "currency": "EUR",
            "available": true,
            "description": "Description courte de l'œuvre.",
            "externalUrl": "https://example.com/oeuvre-01"
          }
        },
        {
          "id": "artwork-02",
          "imageUrl": "https://cdn.example.com/artworks/02-full.jpg",
          "imageUrlLow": "https://cdn.example.com/artworks/02-thumb.jpg",
          "position": [-4.5, 1.8, -3],
          "rotation": [0, 1.5708, 0],
          "dimensions": { "widthCm": 60, "heightCm": 90 },
          "frameStyle": "gold",
          "spotPosition": [-4.0, 3.7, -3],
          "meta": {
            "title": "Deuxième œuvre",
            "artist": "Nom de l'artiste",
            "year": 2023,
            "medium": "Photographie",
            "edition": "3/5",
            "price": 800,
            "currency": "EUR",
            "available": true,
            "description": "",
            "externalUrl": ""
          }
        }
      ],
      "portals": []
    },
    {
      "id": "room-side",
      "label": "Salle secondaire",
      "dimensions": { "width": 8, "height": 4, "depth": 10 },
      "spawnPoint": [0, 1.65, 4],
      "spawnTarget": [0, 1.65, 0],
      "artworks": [],
      "portals": [
        {
          "targetRoom": "room-main",
          "position": [0, 0, 4.5],
          "label": "Retour salle principale"
        }
      ]
    }
  ]
}
```

### Types TypeScript (`data/exhibitions/schema.ts`)

```ts
export interface ArtworkMeta {
  title: string
  artist: string
  year: number
  medium: string
  edition: string
  price: number
  currency: 'EUR' | 'USD' | 'GBP'
  available: boolean
  description: string
  externalUrl: string
}

export interface Artwork {
  id: string
  imageUrl: string
  imageUrlLow: string
  position: [number, number, number]
  rotation: [number, number, number]
  dimensions: { widthCm: number; heightCm: number }
  frameStyle: 'black' | 'gold' | 'white' | 'none'
  spotPosition: [number, number, number]
  meta: ArtworkMeta
}

export interface Portal {
  targetRoom: string
  position: [number, number, number]
  label: string
}

export interface Room {
  id: string
  label: string
  dimensions: { width: number; height: number; depth: number }
  spawnPoint: [number, number, number]
  spawnTarget: [number, number, number]
  artworks: Artwork[]
  portals: Portal[]
}

export interface ExhibitionSettings {
  ambientIntensity: number
  spotIntensity: number
  wallColor: string
  floorTexture: 'parquet' | 'concrete' | 'marble'
  enableSSAO: boolean
  enableBloom: boolean
  backgroundColor: string
}

export interface ExhibitionConfig {
  version: string
  exhibition: {
    id: string
    title: string
    artist: string
    startDate: string
    endDate: string
    coverImage: string
  }
  settings: ExhibitionSettings
  rooms: Room[]
}
```

---

## 7. Optimisations performances

### Textures

| Problème | Solution |
|---|---|
| Images JPEG lourdes | Conversion en KTX2 (BasisU) via `toktx` ou `basisu` CLI |
| Format GPU-natif | BCn sur desktop, ASTC sur mobile Apple/Android, ETC2 fallback |
| Chargement lent | Preload thumbnail 300px → swap haute-résolution au focus |
| CORS CDN | Header `Access-Control-Allow-Origin: *` sur Cloudflare R2 |

Pipeline de conversion :
```bash
# Pour chaque image œuvre
basisu -ktx2 -mipmap artwork-01.jpg -output_file artwork-01.ktx2
# Pour les textures d'environnement
npx @babylonjs/cli ktx2 -i environment.hdr -o environment.env
```

### Géométrie et meshes

- `InstancedMesh` pour les cadres : un seul mesh cadre de base, N instances
- `LOD` via `addLODLevel` : mesh cadre simplifié à distance > 5m
- `setEnabled(false)` sur les œuvres hors de la salle active
- `mesh.freezeWorldMatrix()` sur tous les murs/sol/plafond (statiques)
- `scene.autoClear = true`, `scene.autoClearDepthAndStencil = true`

### SceneOptimizer

```ts
const options = new SceneOptimizerOptions(60, 2000)
options.optimizations = [
  new ShadowsOptimization(0),       // shadows off si < 60fps
  new PostProcessesOptimization(1), // postprocess off
  new LensFlaresOptimization(2),
  new HardwareScalingOptimization(3, 1.5) // scale 0.66x
]
SceneOptimizer.OptimizeAsync(scene, options)
```

### Lazy loading multi-salles

- Seule la salle active est en mémoire GPU
- Au passage d'un portail : chargement async de la salle suivante en background
- `ImportMeshAsync` depuis GLB optionnel, ou construction procédurale depuis JSON
- Dispose complet de la salle précédente après transition : `mesh.dispose()` sur
  tous les meshes, `texture.dispose()` sur toutes les textures de la salle

### Frustum culling

Babylon.js applique le frustum culling automatiquement. Pour les grandes scènes :
```ts
scene.skipFrustumClipping = false  // s'assurer qu'il est actif
mesh.isPickable = false             // désactiver raycasting sur murs
```

### Métriques Lighthouse cibles

| Contexte | LCP | TBT | Score |
|---|---|---|---|
| Desktop | < 2s | < 150ms | > 85 |
| Mobile | < 4s | < 300ms | > 65 |

Le canvas Babylon est chargé après le LCP : l'écran de chargement (image statique)
sert de placeholder pendant l'initialisation WebGL.

---

## 8. Stack technique précise

### Packages NPM

```json
{
  "dependencies": {
    "next": "15.1.8",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "@babylonjs/core": "7.x",
    "@babylonjs/gui": "7.x",
    "@babylonjs/loaders": "7.x",
    "@babylonjs/materials": "7.x",
    "@babylonjs/post-processes": "7.x",
    "@babylonjs/serializers": "7.x"
  },
  "devDependencies": {
    "typescript": "5.x",
    "@types/node": "22.x",
    "@types/react": "19.x",
    "@types/react-dom": "19.x",
    "tailwindcss": "4.x"
  }
}
```

Note : ne pas importer `babylonjs` (bundle monolithique legacy).
Toujours utiliser les packages scopés `@babylonjs/*` pour le tree-shaking.

### Configuration Next.js (`next.config.ts`)

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Headers CORS pour les textures servies depuis Next.js
  async headers() {
    return [
      {
        source: '/textures/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
    ]
  },
  // Permettre les images depuis le CDN
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.example.com' },
    ],
  },
  // Webpack : exclure Babylon.js du bundle serveur
  webpack(config, { isServer }) {
    if (isServer) {
      config.externals = [...(config.externals || []), '@babylonjs/core']
    }
    return config
  },
}

export default nextConfig
```

### TypeScript (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

---

## 9. Séquence d'implémentation étape par étape

### Phase 1 — Fondations (Jour 1-2)

**Étape 1 : Initialisation du projet**
```bash
npx create-next-app@latest 3D_Gallery \
  --typescript --tailwind --app --src-dir=false --import-alias="@/*"
cd 3D_Gallery
npm install @babylonjs/core @babylonjs/gui @babylonjs/loaders \
  @babylonjs/materials @babylonjs/post-processes
```

**Étape 2 : BabylonCanvas.tsx**
Composant pur canvas avec Engine lifecycle. Pas encore de scène.
Vérification : le canvas rend en noir, pas d'erreur console, resize fonctionnel.

**Étape 3 : Intégration Next.js**
Créer `app/gallery/[slug]/page.tsx` avec `dynamic(() => import(...), { ssr: false })`.
Vérifier que le build `next build` passe sans erreur (pas d'accès à `window` côté serveur).

**Étape 4 : LoadingScreen.tsx**
Écran de chargement CSS pur (spinner + titre exposition) affiché pendant l'init WebGL.

---

### Phase 2 — Scène de base (Jour 3-4)

**Étape 5 : RoomBuilder.ts**
Construire une salle procédurale avec StandardMaterial blanc pour les 6 surfaces.
Vérification visuelle : salle visible depuis la caméra ArcRotate de debug.

**Étape 6 : LightingSetup.ts**
HemisphericLight + 1 DirectionalLight. Activer l'environment IBL.
Vérification : surfaces bien éclairées, pas de noir total.

**Étape 7 : CameraController.ts**
Remplacer ArcRotateCamera par UniversalCamera first-person.
Configurer collisions sur tous les murs. Tester WASD + ZQSD.
Vérification : on ne traverse pas les murs, hauteur stable.

**Étape 8 : Matériaux PBR**
Remplacer StandardMaterial par PBRMaterial sur sol et murs.
Charger la texture parquet KTX2 sur le sol.

---

### Phase 3 — Affichage des œuvres (Jour 5-6)

**Étape 9 : ArtworkLoader.ts**
Parser le JSON example-show.json, créer les planes d'œuvres avec Texture depuis URL.
Chargement via AssetManager avec progress callback.
Vérification : les images s'affichent correctement sur les murs.

**Étape 10 : Cadres procéduraux**
Générer les 4 boîtes de cadre pour chaque œuvre. Tester frameStyle black/gold.

**Étape 11 : SpotLights par œuvre**
Ajouter un SpotLight et ShadowGenerator pour chaque œuvre.
Vérification : chaque œuvre est mise en valeur individuellement.

**Étape 12 : Cartels 3D**
`GUI.AdvancedDynamicTexture.CreateForMesh` sur des plans sous chaque œuvre.
Vérification : titre, artiste, prix lisibles à distance normale de visite (1.5-2m).

---

### Phase 4 — Interaction et UI (Jour 7-8)

**Étape 13 : ActionManager sur œuvres**
Clic → callback `onArtworkClick`. Hover → changement curseur + intensité spot.

**Étape 14 : ArtworkModal.tsx**
Modal DOM (Tailwind) avec image haute résolution, métadonnées complètes, lien externe.
Pointer lock libéré à l'ouverture du modal.

**Étape 15 : GalleryUI.tsx**
HUD : minimap 2D optionnelle, hints clavier au démarrage (fade après 5s),
bouton plein-écran, bouton retour à l'accueil.

**Étape 16 : Transition caméra orbital**
Clic œuvre → transition animée vers ArcRotateCamera.
Escape → retour UniversalCamera.

---

### Phase 5 — Optimisations (Jour 9-10)

**Étape 17 : Chargement progressif**
Implémenter double résolution : thumbnail immédiat → haute résolution async.
`mesh.isVisible = false` jusqu'au chargement de la texture haute résolution.

**Étape 18 : Post-processing**
DefaultRenderingPipeline avec bloom et FXAA. SSAO2 sur desktop uniquement.

**Étape 19 : SceneOptimizer**
Configurer et activer l'optimiseur adaptatif.
Tester sur mobile (throttle CPU Chrome DevTools).

**Étape 20 : Mode dégradé 2D**
Détecter absence WebGL → afficher galerie 2D CSS Grid comme fallback.

---

### Phase 6 — Polish et déploiement (Jour 11-12)

**Étape 21 : Navigation multi-salles**
Implémenter le système de portails : zone trigger → chargement async salle suivante.
Dispose de la salle précédente après transition.

**Étape 22 : Page d'accueil**
Liste des expositions depuis l'API route. Cards avec image, titre, dates.
Navigation vers `/gallery/[slug]`.

**Étape 23 : Métadonnées SEO**
`generateMetadata` par exposition : title, description, og:image depuis coverImage.

**Étape 24 : Variables d'environnement**
```
NEXT_PUBLIC_CDN_URL=https://cdn.example.com
NEXT_PUBLIC_API_URL=https://api.example.com
```

**Étape 25 : Déploiement Vercel**
`vercel deploy`. Vérifier les headers CORS sur les textures.
Audit Lighthouse. Ajuster SceneOptimizer si score < cible.

---

## Récapitulatif des points critiques

| Point | Risque | Mitigation |
|---|---|---|
| Import Babylon.js côté serveur | Build crash | `dynamic({ ssr: false })` systématique |
| CORS textures CDN | Textures noires | Header `Access-Control-Allow-Origin: *` |
| Performance mobile | < 30fps | SceneOptimizer + désactiver SSAO/shadows |
| Pointer lock | UX bloquante | Toujours libérer au modal/Escape |
| Mémoire multi-salles | Leak GPU | Dispose explicite textures/meshes salle précédente |
| Ratio d'aspect œuvre | Distorsion | Calculer dimensions mesh depuis widthCm/heightCm |
| KTX2 non supporté | Fallback JPEG | Babylon gère le fallback automatiquement |

---

*Plan rédigé pour le projet IN_REAL_ART — 3D_Gallery*
*Stack : Next.js 15.1.8 + Babylon.js 7 + TypeScript strict*
*Référence design : artspaces.kunstmatrix.com*
