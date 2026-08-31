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
