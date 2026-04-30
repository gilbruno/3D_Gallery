import GalleryHeader from './GalleryHeader'
import GalleryFooter from './GalleryFooter'

interface SiteLayoutProps {
  children: React.ReactNode
  exhibitionTitle?: string
  fullHeightMain?: boolean
}

export default function SiteLayout({ children, exhibitionTitle, fullHeightMain }: SiteLayoutProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <GalleryHeader exhibitionTitle={exhibitionTitle} />
      <main
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          ...(fullHeightMain ? {} : { overflowY: 'auto' }),
        }}
      >
        {children}
      </main>
      <GalleryFooter />
    </div>
  )
}
