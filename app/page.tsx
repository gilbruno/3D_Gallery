export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-light tracking-widest mb-4">In Real Art</h1>
      <p className="text-gray-500 mb-8">Galerie d&apos;art immersive 3D</p>
      <a
        href="/gallery/example-show"
        className="px-8 py-3 border border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white transition-colors duration-200 text-sm tracking-wider uppercase"
      >
        Entrer dans la galerie
      </a>
    </main>
  )
}
