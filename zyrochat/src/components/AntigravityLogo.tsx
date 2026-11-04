interface LogoProps {
  size?: number | string;
  className?: string;
  glow?: boolean;
}

/**
 * Application logo emblem:
 * Signature chat bubble with vibrant multi-stop gradient, the iconic "Z" mark, and notification dot.
 */
export default function AntigravityLogo({
  size = 24,
  className = "",
  glow = false,
}: LogoProps) {
  const pixelSize = typeof size === "number" ? `${size}px` : size;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
    >
      {glow && (
        <div
          className="absolute inset-0 rounded-2xl bg-cyan-500/25 blur-md pointer-events-none"
          aria-hidden="true"
        />
      )}
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        role="img"
        aria-label="Logo"
      >
        <defs>
          <linearGradient id="zyro-bubble-grad" x1="10" y1="8" x2="54" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00c2a8" />
            <stop offset="55%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
          <filter id="zyro-bubble-shadow" x="4" y="5" width="56" height="56" colorInterpolationFilters="sRGB">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#0f172a" floodOpacity="0.25" />
          </filter>
        </defs>

        <rect width="64" height="64" rx="16" fill="#0c0e14" />
        <path
          fill="url(#zyro-bubble-grad)"
          filter="url(#zyro-bubble-shadow)"
          d="M16 13h32c5 0 9 4 9 9v18c0 5-4 9-9 9H33.5L22 57v-8h-6c-5 0-9-4-9-9V22c0-5 4-9 9-9Z"
        />
        <path
          fill="#ffffff"
          d="M22 22h25v6L31.5 42H47v7H20v-6l15.4-14H22v-7Z"
        />
        <circle cx="48" cy="18" r="4" fill="#ffffff" opacity="0.95" />
      </svg>
    </div>
  );
}
