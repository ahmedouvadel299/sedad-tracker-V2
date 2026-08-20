import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { ref, onValue, update } from 'firebase/database'
import { auth, db } from '../firebase.js'
import { useServerTimeOffset } from '../lib/useServerTime.js'

const RAISONS_ECHEC = ['Injoignable', 'En cours', 'Refus', 'Numéro erroné', 'Autre']
const SEUIL_DUREE_ANORMALE = 15 * 60 * 1000

function formatDuree(ms) {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function AgentDashboard() {
  const navigate = useNavigate()
  const offset = useServerTimeOffset()
  const [uid, setUid] = useState(null)
  const [nom, setNom] = useState('')
  const [contacts, setContacts] = useState({})
  const [onglet, setOnglet] = useState('maListe')
  const [recherche, setRecherche] = useState('')

  const [appelEnCours, setAppelEnCours] = useState(null)
  const [maintenant, setMaintenant] = useState(Date.now())
  const [contactPourRaison, setContactPourRaison] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/', { replace: true })
        return
      }
      setUid(user.uid)
      setNom(user.email ? user.email.split('@')[0] : 'Agent')
    })
    return () => unsub()
  }, [navigate])

  useEffect(() => {
    if (!uid) return
    const contactsRef = ref(db, `calllists_by_agent/${uid}`)
    const unsub = onValue(contactsRef, (snap) => {
      setContacts(snap.val() || {})
    })
    return () => unsub()
  }, [uid])

  useEffect(() => {
    if (!appelEnCours) return
    const timer = setInterval(() => setMaintenant(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [appelEnCours])

  const listeContacts = useMemo(() => {
    return Object.entries(contacts).map(([id, c]) => ({ id, ...c }))
  }, [contacts])

  const maListe = listeContacts.filter((c) => c.statut === 'en_attente')
  const listeAttente = listeContacts.filter(
    (c) => c.statut === 'echec' && (c.raison === 'Injoignable' || c.raison === 'En cours'),
  )

  const listeAffichee = onglet === 'maListe' ? maListe : listeAttente
  const listeFiltree = recherche
    ? listeAffichee.filter(
        (c) =>
          c.nom?.toLowerCase().includes(recherche.toLowerCase()) ||
          c.telephone?.includes(recherche),
      )
    : listeAffichee

  function serverNow() {
    return Date.now() + offset
  }

  function demarrerAppel(contactId) {
    setAppelEnCours({ contactId, debut: serverNow() })
    setMaintenant(serverNow())
  }

  async function terminerAppel(contactId, resultat) {
    const debut = appelEnCours?.debut
    let dureeMs = debut ? serverNow() - debut : 0
    const anormale = dureeMs > SEUIL_DUREE_ANORMALE

    if (resultat === 'succes') {
      await update(ref(db, `calllists_by_agent/${uid}/${contactId}`), {
        statut: 'traite',
        resultat: 'succes',
        dureeAppelSec: Math.round(dureeMs / 1000),
        dureeAnormale: anormale,
      })
      setAppelEnCours(null)
    } else {
      setContactPourRaison({ contactId, dureeMs, anormale })
    }
  }

  async function confirmerEchec(raison) {
    if (!contactPourRaison) return
    const { contactId, dureeMs, anormale } = contactPourRaison
    await update(ref(db, `calllists_by_agent/${uid}/${contactId}`), {
      statut: 'echec',
      raison,
      dureeAppelSec: Math.round(dureeMs / 1000),
      dureeAnormale: anormale,
    })
    setContactPourRaison(null)
    setAppelEnCours(null)
  }

  function annulerAppelEnCours() {
    setAppelEnCours(null)
  }

  async function deconnexion() {
    await signOut(auth)
    navigate('/', { replace: true })
  }

  const dureeActuelle = appelEnCours ? maintenant - appelEnCours.debut : 0
  const dureeAnormaleEnCours = dureeActuelle > SEUIL_DUREE_ANORMALE

  return (
    <div className="page agent-page">
      <header className="agent-header">
        <button className="btn-deconnexion" onClick={deconnexion}>
          Déconnexion
        </button>
        <div className="agent-header-nom">{nom}</div>
        <div className="agent-header-titre">
          Registre SEDAD
          <div className="agent-header-banque">البنك الموريتاني للاستثمار</div>
        </div>
      </header>

      <nav className="pill-tabs">
        <button
          className={onglet === 'listeAttente' ? 'active' : ''}
          onClick={() => setOnglet('listeAttente')}
        >
          Liste d'attente ({listeAttente.length})
        </button>
        <button className={onglet === 'maListe' ? 'active' : ''} onClick={() => setOnglet('maListe')}>
          Ma liste ({maListe.length})
        </button>
        <button
          className={onglet === 'aujourdhui' ? 'active' : ''}
          onClick={() => setOnglet('aujourdhui')}
        >
          Aujourd'hui
        </button>
      </nav>

      {onglet === 'aujourdhui' ? (
        <AujourdhuiPanel nom={nom} contacts={listeContacts} />
      ) : (
        <div className="card">
          <input
            className="recherche-input"
            placeholder="Rechercher par nom ou téléphone..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />

          {listeFiltree.length === 0 && <p className="liste-vide">Aucun contact à afficher.</p>}

          {listeFiltree.map((c) => (
            <div className="contact-row" key={c.id}>
              <div className="contact-actions">
                <button
                  className="icon-btn icon-echec"
                  disabled={appelEnCours?.contactId !== c.id}
                  onClick={() => terminerAppel(c.id, 'echec')}
                  aria-label="Échec"
                >
                  ✕
                </button>
                <button
                  className="icon-btn icon-succes"
                  disabled={appelEnCours?.contactId !== c.id}
                  onClick={() => terminerAppel(c.id, 'succes')}
                  aria-label="Succès"
                >
                  ✓
                </button>
                <button
                  className="icon-btn icon-appel"
                  disabled={!!appelEnCours}
                  onClick={() => demarrerAppel(c.id)}
                  aria-label="Appeler"
                >
                  📞
                </button>
              </div>
              <div className="contact-info">
                <div className="contact-nom">{c.nom}</div>
                <div className="contact-tel">{c.telephone}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {appelEnCours && (
        <div className="appel-overlay">
          <div className="appel-carte">
            <p className="appel-label">Appel en cours…</p>
            <p className={`appel-minuteur ${dureeAnormaleEnCours ? 'anormal' : ''}`}>
              {formatDuree(dureeActuelle)}
            </p>
            {dureeAnormaleEnCours && (
              <p className="appel-alerte">Durée anormalement longue — vérifiez la ligne.</p>
            )}
            <div className="appel-boutons">
              <button className="icon-btn icon-echec" onClick={() => terminerAppel(appelEnCours.contactId, 'echec')}>
                ✕ Échec
              </button>
              <button className="icon-btn icon-succes" onClick={() => terminerAppel(appelEnCours.contactId, 'succes')}>
                ✓ Succès
              </button>
              <button className="btn-annuler" onClick={annulerAppelEnCours}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {contactPourRaison && (
        <div className="appel-overlay">
          <div className="appel-carte">
            <p className="appel-label">Raison de l'échec</p>
            <div className="raisons-liste">
              {RAISONS_ECHEC.map((r) => (
                <button key={r} className="raison-btn" onClick={() => confirmerEchec(r)}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AujourdhuiPanel({ nom, contacts }) {
  const objectifJour = 30
  const fait = contacts.filter((c) => c.statut === 'traite' || c.statut === 'echec').length

  function heureSalutation() {
    const h = new Date().getHours()
    if (h < 12) return 'Bonjour'
    if (h < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }

  return (
    <div className="card aujourdhui-panel">
      <p className="salutation">
        👋 {heureSalutation()}, <strong>{nom}</strong>
      </p>

      {fait < objectifJour && (
        <div className="alerte-retard">
          Il reste {objectifJour - fait} opérations pour atteindre l'objectif du jour
        </div>
      )}

      <div className="progres-cercle-wrapper">
        <div
          className="progres-cercle"
          style={{ '--pct': Math.min(100, Math.round((fait / objectifJour) * 100)) }}
        >
          <span className="progres-chiffre">{fait}</span>
          <span className="progres-total">sur {objectifJour} aujourd'hui</span>
        </div>
      </div>
    </div>
  )
}

export default AgentDashboard
