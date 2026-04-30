export default function LoadingScreen() {
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-[#f7f7f7]">
      {/* Spinner SVG animé */}
      <svg
        className="animate-spin mb-6"
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle
          cx="24"
          cy="24"
          r="20"
          stroke="#e0e0e0"
          strokeWidth="4"
        />
        <path
          d="M44 24C44 13 35 4 24 4"
          stroke="#2d2d2d"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <p className="text-sm tracking-widest text-gray-500 uppercase">
        Chargement de la galerie...
      </p>
    </div>
  )
}
