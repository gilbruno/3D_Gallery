import type { Metadata } from 'next'
import { readFileSync } from 'fs'
import { join } from 'path'
import GalleryClient from './GalleryClient'
import type { ExhibitionConfig } from '@/data/exhibitions/schema'

interface GalleryPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata(
  { params }: GalleryPageProps
): Promise<Metadata> {
  const { slug } = await params
  return {
    title: `Galerie — ${slug}`,
    description: `Exposition immersive 3D : ${slug}`,
  }
}

export default async function GalleryPage({ params }: GalleryPageProps) {
  const { slug } = await params

  let exhibition: ExhibitionConfig | null = null
  try {
    const filePath = join(process.cwd(), 'data', 'exhibitions', `${slug}.json`)
    exhibition = JSON.parse(readFileSync(filePath, 'utf-8')) as ExhibitionConfig
  } catch {
    console.error(`[GalleryPage] exposition introuvable : ${slug}`)
  }

  return (
    <div className="w-full" data-slug={slug}>
      <GalleryClient slug={slug} exhibition={exhibition} />
    </div>
  )
}
