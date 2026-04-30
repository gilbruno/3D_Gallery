import SiteLayout from '@/components/ui/SiteLayout'

const exhibitions = [
  {
    slug: 'example-show',
    title: 'Fragments du Réel',
    curator: 'Marie Leconte',
    date: 'Mai 2026',
    artworkCount: 12,
    cover: 'https://pub-d7df68395d644bd3bc80d24168d6d8be.r2.dev/artists/Adam%20Akner/landing/entre-deux.webp',
  },
]

export default function HomePage() {
  return (
    <SiteLayout>
      {/* Hero */}
      <section
        style={{
          background: '#0f0f0f',
          padding: '100px 48px 80px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <p
          style={{
            fontSize: '10px',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.35)',
            fontFamily: 'var(--font-sans, sans-serif)',
          }}
        >
          Galerie d&apos;art immersive
        </p>
        <h1
          style={{
            fontSize: 'clamp(32px, 5vw, 60px)',
            fontWeight: 200,
            letterSpacing: '0.12em',
            color: 'rgba(255,255,255,0.92)',
            lineHeight: 1.15,
            fontFamily: 'var(--font-sans, sans-serif)',
            textTransform: 'uppercase',
            maxWidth: '700px',
          }}
        >
          Explorez l&apos;art en trois dimensions
        </h1>
        <p
          style={{
            fontSize: '15px',
            color: 'rgba(255,255,255,0.4)',
            lineHeight: 1.8,
            maxWidth: '480px',
            fontFamily: 'var(--font-sans, sans-serif)',
            fontWeight: 300,
          }}
        >
          Naviguez librement dans nos galeries virtuelles. Découvrez les œuvres, approchez-vous, ressentez chaque détail.
        </p>
        <a
          href="/gallery/example-show"
          style={{
            marginTop: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 36px',
            border: '1px solid rgba(255,255,255,0.25)',
            color: 'rgba(255,255,255,0.85)',
            fontSize: '11px',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            fontFamily: 'var(--font-sans, sans-serif)',
          }}
        >
          <span>Entrer dans la galerie</span>
          <span style={{ fontSize: '16px', opacity: 0.6 }}>→</span>
        </a>
      </section>

      {/* Expositions */}
      <section
        style={{
          background: '#111111',
          padding: '72px 48px',
          flex: 1,
        }}
      >
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: '48px',
              paddingBottom: '20px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <h2
              style={{
                fontSize: '11px',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.4)',
                fontFamily: 'var(--font-sans, sans-serif)',
                fontWeight: 400,
              }}
            >
              Expositions en cours
            </h2>
            <span
              style={{
                fontSize: '11px',
                letterSpacing: '0.15em',
                color: 'rgba(255,255,255,0.2)',
                fontFamily: 'var(--font-sans, sans-serif)',
              }}
            >
              {exhibitions.length} exposition{exhibitions.length > 1 ? 's' : ''}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '2px',
            }}
          >
            {exhibitions.map(expo => (
              <a
                key={expo.slug}
                href={`/gallery/${expo.slug}`}
                style={{
                  textDecoration: 'none',
                  display: 'block',
                  position: 'relative',
                  overflow: 'hidden',
                  aspectRatio: '4/3',
                  background: '#1a1a1a',
                  cursor: 'pointer',
                }}
              >
                <img
                  src={expo.cover}
                  alt={expo.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    filter: 'brightness(0.55)',
                    transition: 'transform 0.6s ease',
                  }}
                />

                {/* Gradient bas */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)',
                  }}
                />

                {/* Infos */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '28px',
                  }}
                >
                  <p
                    style={{
                      fontSize: '10px',
                      letterSpacing: '0.25em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.45)',
                      fontFamily: 'var(--font-sans, sans-serif)',
                      marginBottom: '8px',
                    }}
                  >
                    {expo.date} · {expo.artworkCount} œuvres
                  </p>
                  <h3
                    style={{
                      fontSize: '22px',
                      fontWeight: 300,
                      letterSpacing: '0.06em',
                      color: 'rgba(255,255,255,0.92)',
                      fontFamily: 'var(--font-sans, sans-serif)',
                      marginBottom: '4px',
                    }}
                  >
                    {expo.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.35)',
                      fontFamily: 'var(--font-sans, sans-serif)',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Curated by {expo.curator}
                  </p>
                </div>

                {/* Badge 3D */}
                <div
                  style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '4px',
                    padding: '6px 14px',
                    fontSize: '10px',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.6)',
                    fontFamily: 'var(--font-sans, sans-serif)',
                  }}
                >
                  3D
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </SiteLayout>
  )
}
