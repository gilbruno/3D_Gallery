interface GalleryHeaderProps {
  exhibitionTitle?: string
}

export default function GalleryHeader({ exhibitionTitle }: GalleryHeaderProps) {
  return (
    <header
      style={{
        background: '#0a0a0a',
        height: '96px',
        padding: '0 32px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {/* Logo + titre centré */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center' }}>
          <img
            src="/logo_inrealart.png"
            alt="InRealArt"
            style={{ height: '56px', width: 'auto' }}
          />
        </a>
        <span
          style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: '14px',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-sans, sans-serif)',
            fontWeight: 300,
            borderLeft: '1px solid rgba(255,255,255,0.2)',
            paddingLeft: '14px',
          }}
        >
          3D Gallery
        </span>
        </div>
    </header>
  )
}
