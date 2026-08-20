import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { ref, get } from 'firebase/database'
import { auth, db } from '../firebase.js'

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

  async function redirigerSelonRole(uid) {
    const snap = await get(ref(db, `roles/${uid}`))
    const role = snap.exists() ? snap.val() : null
    if (role === 'admin') navigate('/admin')
    else if (role === 'observer') navigate('/observateur')
    else if (role === 'agent') navigate('/agent')
    else setErreur("Aucun rôle attribué à ce compte. Contactez l'administrateur.")
  }

  async function handleAgentSubmit(e) {
    e.preventDefault()
    setErreur('')
    setChargement(true)
    try {
      const { email, password } = agentCredentials(nom, pin)
      const cred = await signInWithEmailAndPassword(auth, email, password)
      await redirigerSelonRole(cred.user.uid)
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
      await redirigerSelonRole(cred.user.uid)
    } catch (err) {
      setErreur('Email ou mot de passe incorrect.')
    } finally {
      setChargement(false)
    }
  }

  return (
    <div className="page login-page">
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
