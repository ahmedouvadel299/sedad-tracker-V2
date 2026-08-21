function LogoIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect x="1" y="1" width="98" height="98" rx="22" fill="#ffffff" stroke="#e5e0d5" />
      <g>
        <rect x="20" y="30" width="26" height="38" rx="4" fill="#a9812f" transform="rotate(-18 33 49)" />
        <rect x="28" y="26" width="26" height="38" rx="4" fill="#c39a3f" transform="rotate(-6 41 45)" />
        <rect x="36" y="24" width="26" height="38" rx="4" fill="#d9b755" transform="rotate(6 49 43)" />
        <path
          d="M30 50 L46 66 L76 28"
          stroke="#8a6a24"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  )
}

export default LogoIcon
