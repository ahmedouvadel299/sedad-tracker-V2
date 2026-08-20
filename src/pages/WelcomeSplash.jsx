import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const PHRASES = [
  "Votre régularité fait la force de l'équipe.",
  "Chaque appel compte, continuez ainsi.",
  'Un bon jour commence par un bon rythme.',
  "La constance d'aujourd'hui prépare le succès de demain.",
  'Votre travail fait la différence.',
]

function heureSalutation() {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

function WelcomeSplash() {
  const navigate = useNavigate()
  const [phrase] = useState(PHRASES[Math.floor(Math.random() * PHRASES.length)])
  const [data] = useState(() => {
    const stored = sessionStorage.getItem('sedad_splash')
    return stored ? JSON.parse(stored) : null
  })

  useEffect(() => {
    if (!data || !data.destination) {
      navigate('/', { replace: true })
      return
    }
    const timer = setTimeout(() => {
      sessionStorage.removeItem('sedad_splash')
      navigate(data.destination, { replace: true })
    }, 2200)
    return () => clearTimeout(timer)
  }, [data, navigate])

  return (
    <div className="splash">
      <div className="splash-badge">
        <div className="splash-badge-inner">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none">
            <path
              d="M4 14L9 9L13 13L20 6"
              stroke="#c9a24b"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M15 6H20V11" stroke="#c9a24b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <p className="splash-label">{heureSalutation().toUpperCase()}</p>
      <h1 className="splash-nom">{data?.nom || 'Utilisateur'}</h1>
      <p className="splash-phrase">{phrase}</p>

      <p className="splash-footer">
        البنك الموريتاني للاستثمار — <strong>SEDAD</strong> Registre
      </p>
    </div>
  )
}

export default WelcomeSplash
