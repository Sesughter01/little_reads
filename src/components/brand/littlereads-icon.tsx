export function LittleReadsIcon({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Left page — forms the "L" with the spine */}
      <path
        d="M6 12C6 10 8 8 10 8L23 8V38H10C8 38 6 36 6 34V12Z"
        fill="#7C3AED"
      />
      {/* Right page */}
      <path
        d="M42 12C42 10 40 8 38 8L25 8V38H38C40 38 42 36 42 34V12Z"
        fill="#9333EA"
      />
      {/* Spine */}
      <rect x="23" y="8" width="2" height="30" fill="#6D28D9" rx="1" />
      {/* Page lines — left */}
      <line x1="11" y1="15" x2="21" y2="15" stroke="white" strokeOpacity="0.25" strokeWidth="1" strokeLinecap="round" />
      <line x1="11" y1="19" x2="19" y2="19" stroke="white" strokeOpacity="0.25" strokeWidth="1" strokeLinecap="round" />
      <line x1="11" y1="23" x2="20" y2="23" stroke="white" strokeOpacity="0.25" strokeWidth="1" strokeLinecap="round" />
      {/* Page lines — right */}
      <line x1="27" y1="15" x2="37" y2="15" stroke="white" strokeOpacity="0.2" strokeWidth="1" strokeLinecap="round" />
      <line x1="27" y1="19" x2="35" y2="19" stroke="white" strokeOpacity="0.2" strokeWidth="1" strokeLinecap="round" />
      <line x1="27" y1="23" x2="36" y2="23" stroke="white" strokeOpacity="0.2" strokeWidth="1" strokeLinecap="round" />
      {/* Sparkle star */}
      <path
        d="M24 2L25.5 6.5L30 5L26.5 8L30 11L25.5 9L24 13.5L22.5 9L18 11L21.5 8L18 5L22.5 6.5Z"
        fill="#F97316"
      />
      <circle cx="24" cy="8" r="1.5" fill="#FBBF24" />
    </svg>
  );
}

export function LittleReadsLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <g transform="translate(0, 4)">
        <path d="M4 8C4 6 6 4 8 4L19 4V32H8C6 32 4 30 4 28V8Z" fill="#7C3AED" />
        <path d="M34 8C34 6 32 4 30 4L21 4V32H30C32 32 34 30 34 28V8Z" fill="#9333EA" />
        <rect x="19" y="4" width="2" height="28" fill="#6D28D9" rx="1" />
        <path d="M21 -1L22 3L26 2L23 4L26 6L22 5L21 9L20 5L16 6L19 4L16 2L20 3Z" fill="#F97316" />
        <circle cx="21" cy="3" r="1.2" fill="#FBBF24" />
      </g>
      <text x="46" y="26" fontFamily="'Poppins', 'Inter', system-ui, sans-serif" fontSize="22" fontWeight="700" fill="#7C3AED">LittleReads</text>
      <text x="46" y="42" fontFamily="'Inter', system-ui, sans-serif" fontSize="9" fill="#9CA3AF" letterSpacing="0.3">Big Adventures for Little Readers</text>
    </svg>
  );
}
