function LogoIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <rect x="2" y="2" width="96" height="96" rx="24" fill="#ffffff" />
      <g transform="translate(20,18)">
        <path d="M6 55 Q0 30 10 4" stroke="#b4933a" strokeWidth="7" strokeLinecap="round" fill="none" />
        <path d="M20 58 Q16 28 24 2" stroke="#c9a24b" strokeWidth="7" strokeLinecap="round" fill="none" />
        <path d="M34 60 L34 6" stroke="#d4af5a" strokeWidth="7" strokeLinecap="round" />
        <path d="M34 6 L52 6 L52 24" stroke="#d4af5a" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path
          d="M20 44 L34 58 L62 20"
          stroke="#b4933a"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  )
}

export default LogoIcon
