// Types TypeScript stricts pour la configuration JSON des expositions
// Correspondent au format data/exhibitions/*.json

export type FrameStyle = 'black' | 'gold' | 'white' | 'none'

export interface ArtworkDimensions {
  /** Largeur de l'œuvre en centimètres */
  widthCm: number
  /** Hauteur de l'œuvre en centimètres */
  heightCm: number
}

export interface ArtworkMeta {
  title: string
  artist: string
  year: number
  medium?: string
  /** Prix en euros, undefined = non à vendre */
  price?: number
  description?: string
  externalUrl?: string
}

export interface ArtworkConfig {
  id: string
  imageUrl: string
  /** Position [x, y, z] en mètres dans la scène Babylon */
  position: [number, number, number]
  /** Rotation [x, y, z] en radians (Euler) */
  rotation: [number, number, number]
  dimensions: ArtworkDimensions
  frameStyle: FrameStyle
  /**
   * Position du SpotLight au plafond éclairant cette œuvre.
   * Typiquement y ≈ 3.7 (près du plafond de 4m), 0.5m devant le mur.
   */
  spotPosition: [number, number, number]
  meta: ArtworkMeta
}

export interface RoomPortal {
  targetRoom: string
  position: [number, number, number]
  rotation?: [number, number, number]
}

export interface RoomConfig {
  id: string
  /** Chemin vers un GLB optionnel, si absent la salle est procédurale */
  model?: string
  artworks: ArtworkConfig[]
  portals?: RoomPortal[]
}

export interface ExhibitionConfig {
  slug: string
  title: string
  curator?: string
  description?: string
  /** Date d'ouverture ISO 8601 */
  openingDate?: string
  rooms: RoomConfig[]
}
