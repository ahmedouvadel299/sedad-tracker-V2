function LogoIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect x="1" y="1" width="98" height="98" rx="22" fill="#ffffff" stroke="#e5e0d5" />
      <g>
        <rect x="24" y="26" width="24" height="40" rx="5" fill="#9c7a2e" transform="rotate(-14 36 46)" />
        <rect x="32" y="24" width="24" height="40" rx="5" fill="#c39a3f" transform="rotate(-3 44 44)" />
        <rect x="40" y="23" width="24" height="40" rx="5" fill="#dcbb5c" transform="rotate(8 52 43)" />
        <path
          d="M28 52 L44 68 L70 34"
          stroke="#8a6a24"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M70 34 L82 20 L74 38 Z" fill="#8a6a24" />
      </g>
    </svg>
  )
}

export default LogoIcon
