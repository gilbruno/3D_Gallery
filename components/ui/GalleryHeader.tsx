interface GalleryHeaderProps {
  exhibitionTitle?: string
}

export default function GalleryHeader({ exhibitionTitle }: GalleryHeaderProps) {
  return (
    <header
      style={{
        background: '#0a0a0a',
        height: '64px',
        padding: '0 32px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}
    >
      {/* Logo gauche */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <img
          src="/inrealart_logo.jpeg"
          alt="InRealArt"
          style={{ height: '36px', width: 'auto' }}
        />
      </div>

      {/* Titre d'exposition centré (optionnel) */}
      {exhibitionTitle && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '13px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-sans, sans-serif)',
            pointerEvents: 'none',
          }}
        >
          {exhibitionTitle}
        </div>
      )}

      {/* Espace réservé nav droite */}
      <div />
    </header>
  )
}
