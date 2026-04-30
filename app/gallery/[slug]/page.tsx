import type { Metadata } from 'next'
import GalleryClient from './GalleryClient'

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

  return (
    // Plein écran sans padding, le canvas Babylon occupe tout l'espace
    <main className="w-full h-screen overflow-hidden" data-slug={slug}>
      <GalleryClient slug={slug} />
    </main>
  )
}
