import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth'
import { ref, get } from 'firebase/database'
import { auth, db } from '../firebase.js'
import LogoIcon from './logo.jsx'

function agentCredentials(nom, pin) {
  const email = `${nom.trim().toLowerCase().replace(/\s+/g, '')}@sedad.local`
  const password = `pin${pin}pin`
  return { email, password }
}

function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('agent')
  const [nom, setNom] = useState('')
  const [pin, setPin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(false)
  const [verificationSession, setVerificationSession] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setVerificationSession(false)
        return
      }
      try {
        const snap = await get(ref(db, `roles/${user.uid}`))
        const role = snap.exists() ? snap.val() : null
        const nomAffiche = user.email ? user.email.split('@')[0] : 'Utilisateur'
        let destination = null
        if (role === 'admin') destination = '/admin'
        else if (role === 'observer') destination = '/observateur'
        else if (role === 'agent') destination = '/agent'

        if (destination) {
          sessionStorage.setItem('sedad_splash', JSON.stringify({ nom: nomAffiche, destination }))
          navigate('/bienvenue', { replace: true })
        } else {
          setVerificationSession(false)
        }
      } catch {
        setVerificationSession(false)
      }
    })
    return () => unsub()
  }, [navigate])

  async function allerVersSplash(uid, nomAffiche) {
    const snap = await get(ref(db, `roles/${uid}`))
    const role = snap.exists() ? snap.val() : null
    let destination = null
    if (role === 'admin') destination = '/admin'
    else if (role === 'observer') destination = '/observateur'
    else if (role === 'agent') destination = '/agent'

    if (!destination) {
      setErreur("Aucun rôle attribué à ce compte. Contactez l'administrateur.")
      return
    }

    sessionStorage.setItem('sedad_splash', JSON.stringify({ nom: nomAffiche, destination }))
    navigate('/bienvenue')
  }

  async function handleAgentSubmit(e) {
    e.preventDefault()
    setErreur('')
    setChargement(true)
    try {
      const { email, password } = agentCredentials(nom, pin)
      const cred = await signInWithEmailAndPassword(auth, email, password)
      await allerVersSplash(cred.user.uid, nom)
    } catch (err) {
      setErreur('Nom ou code PIN incorrect.')
    } finally {
      setChargement(false)
    }
  }

  async function handleAdminSubmit(e) {
    e.preventDefault()
    setErreur('')
    setChargement(true)
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      const nomAffiche = email.split('@')[0]
      await allerVersSplash(cred.user.uid, nomAffiche)
    } catch (err) {
      setErreur('Email ou mot de passe incorrect.')
    } finally {
      setChargement(false)
    }
  }

  if (verificationSession) {
    return (
      <div className="page login-page">
        <div className="login-logo-wrapper">
          <LogoIcon size={64} />
        </div>
        <h1>Registre SEDAD</h1>
        <p className="hint">Vérification de la session…</p>
      </div>
    )
  }

  return (
    <div className="page login-page">
      <div className="login-logo-wrapper">
        <LogoIcon size={64} />
      </div>
      <h1>Registre SEDAD</h1>

      <div className="login-tabs">
        <button type="button" className={mode === 'agent' ? 'active' : ''} onClick={() => setMode('agent')}>
          Agent
        </button>
        <button type="button" className={mode === 'admin' ? 'active' : ''} onClick={() => setMode('admin')}>
          Administration
        </button>
      </div>

      {mode === 'agent' ? (
        <form onSubmit={handleAgentSubmit} className="login-form">
          <label>
            Nom
            <input value={nom} onChange={(e) => setNom(e.target.value)} required />
          </label>
          <label>
            Code PIN
            <input type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value)} required />
          </label>
          <button type="submit" disabled={chargement}>
            {chargement ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleAdminSubmit} className="login-form">
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Mot de passe
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button type="submit" disabled={chargement}>
            {chargement ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      )}

      {erreur && <p className="login-erreur">{erreur}</p>}
    </div>
  )
}

export default Login
