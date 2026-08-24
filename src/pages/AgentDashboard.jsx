import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { ref, onValue, update } from 'firebase/database'
import { auth, db } from '../firebase.js'
import { useServerTimeOffset } from '../lib/useServerTime.js'
import LogoIcon from './logo.jsx'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts'

const RAISONS_ECHEC = ['Injoignable', 'En cours', 'Refus', 'Numéro erroné', 'Autre']
const RAISONS_SUCCES = [
  'Déjà validé',
  'Validé',
  'Blocage',
  'Mot de passe oublié',
  'Changement de numéro',
  'Changement de téléphone',
  'Autre',
  "Le client n'a pas connaissance de son compte",
]
const SEUIL_DUREE_ANORMALE = 15 * 60 * 1000
const RAISONS_RETRY = ['Injoignable', 'En cours']

function formatDuree(ms) {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function formatDureeCourte(sec) {
  if (sec < 60) return `${sec}s`
  return `${Math.floor(sec / 60)}min`
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
  const [settings, setSettings] = useState({})
  const [tri, setTri] = useState('recent')
  const alerteJoueeRef = useRef(false)

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
    const settingsRef = ref(db, 'settings')
    const unsub = onValue(settingsRef, (snap) => {
      setSettings(snap.val() || {})
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!appelEnCours) {
      alerteJoueeRef.current = false
      return
    }
    const timer = setInterval(() => setMaintenant(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [appelEnCours])

  useEffect(() => {
    if (!appelEnCours) return
    const dureeMs = maintenant - appelEnCours.debut
    if (dureeMs > SEUIL_DUREE_ANORMALE && !alerteJoueeRef.current) {
      alerteJoueeRef.current = true
      try {
        if (navigator.vibrate) navigator.vibrate([200, 100, 200])
      } catch (e) {
        // vibration non supportée sur cet appareil
      }
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        osc.start()
        osc.stop(ctx.currentTime + 0.4)
      } catch (e) {
        // audio non supporté sur cet appareil
      }
    }
  }, [maintenant, appelEnCours])

  const listeContacts = useMemo(() => {
    return Object.entries(contacts).map(([id, c]) => ({ id, ...c }))
  }, [contacts])

  const delaiRappelMs = (Number(settings.delaiRappelJours) || 14) * 24 * 60 * 60 * 1000

  function estEnDelaiRappel(c) {
    if (!c.dateTraite) return true
    return Date.now() - c.dateTraite < delaiRappelMs
  }

  const maListe = listeContacts.filter((c) => {
    if (c.archive) return false
    if (c.statut === 'en_attente') return true
    if (c.statut === 'echec' && RAISONS_RETRY.includes(c.raison) && !estEnDelaiRappel(c)) return true
    return false
  })

  const listeAttente = listeContacts.filter(
    (c) => c.statut === 'echec' && RAISONS_RETRY.includes(c.raison) && estEnDelaiRappel(c) && !c.archive,
  )

  const listeAffichee = onglet === 'maListe' ? maListe : listeAttente
  const listeRecherchee = recherche
    ? listeAffichee.filter(
        (c) =>
          c.nom?.toLowerCase().includes(recherche.toLowerCase()) ||
          c.telephone?.includes(recherche),
      )
    : listeAffichee

  const listeFiltree = useMemo(() => {
    const copie = [...listeRecherchee]
    if (tri === 'alpha') {
      copie.sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr'))
    } else {
      copie.sort((a, b) => (b.dateTraite || 0) - (a.dateTraite || 0))
    }
    return copie
  }, [listeRecherchee, tri])

  function serverNow() {
    return Date.now() + offset
  }

  function demarrerAppel(contactId) {
    setAppelEnCours({ contactId, debut: serverNow() })
    setMaintenant(serverNow())
  }

  function ouvrirConfirmation(contactId, type) {
    const debut = appelEnCours?.debut
    const dureeMs = debut ? serverNow() - debut : 0
    const anormale = dureeMs > SEUIL_DUREE_ANORMALE
    setContactPourRaison({ contactId, type, dureeMs, anormale })
  }

  function confirmerRaison(raison) {
    if (!contactPourRaison) return
    const { contactId, type, dureeMs, anormale } = contactPourRaison
    const maintenantMs = serverNow()

    setContactPourRaison(null)
    setAppelEnCours(null)

    update(ref(db, `calllists_by_agent/${uid}/${contactId}`), {
      statut: type === 'succes' ? 'traite' : 'echec',
      raison,
      dureeAppelSec: Math.round(dureeMs / 1000),
      dureeAnormale: anormale,
      dateTraite: maintenantMs,
      heureAppel: new Date(maintenantMs).getHours(),
    }).catch(() => {
      // En cas d'échec réseau, la liste se resynchronisera au prochain onValue.
    })
  }

  function annulerAppelEnCours() {
    setAppelEnCours(null)
  }

  function annulerConfirmation() {
    setContactPourRaison(null)
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
        <div className="agent-header-titre-wrapper">
          <div className="agent-header-titre">
            Registre SEDAD
            <div className="agent-header-banque">البنك الموريتاني للاستثمار</div>
          </div>
          <LogoIcon size={40} />
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
        <AujourdhuiPanel
          nom={nom}
          contacts={listeContacts}
          objectifJour={Number(settings.objectifsParAgent?.[uid]) || Number(settings.objectifJournalier) || 125}
        />
      ) : (
        <div className="card">
          <div className="recherche-ligne">
            <input
              className="recherche-input"
              placeholder="Rechercher par nom ou téléphone..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
            <select className="tri-select" value={tri} onChange={(e) => setTri(e.target.value)}>
              <option value="recent">Plus récent</option>
              <option value="alpha">Ordre alphabétique</option>
            </select>
          </div>

          {listeFiltree.length === 0 && <p className="liste-vide">Aucun contact à afficher.</p>}

          {listeFiltree.map((c) => (
            <div className="contact-row" key={c.id}>
              <div className="contact-actions">
                <button
                  className="icon-btn icon-echec"
                  disabled={appelEnCours?.contactId !== c.id}
                  onClick={() => ouvrirConfirmation(c.id, 'echec')}
                  aria-label="Échec"
                >
                  ✕
                </button>
                <button
                  className="icon-btn icon-succes"
                  disabled={appelEnCours?.contactId !== c.id}
                  onClick={() => ouvrirConfirmation(c.id, 'succes')}
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

      {appelEnCours && !contactPourRaison && (
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
              <button className="icon-btn icon-echec" onClick={() => ouvrirConfirmation(appelEnCours.contactId, 'echec')}>
                ✕ Échec
              </button>
              <button className="icon-btn icon-succes" onClick={() => ouvrirConfirmation(appelEnCours.contactId, 'succes')}>
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
          <div className="appel-carte confirmation-carte">
            <p className="confirmation-titre">
              {contactPourRaison.type === 'succes' ? 'Confirmer la réussite' : "Confirmer l'échec"}
            </p>

            <div className="raisons-grille">
              {(contactPourRaison.type === 'succes' ? RAISONS_SUCCES : RAISONS_ECHEC).map((r) => (
                <button
                  key={r}
                  className={`raison-btn ${contactPourRaison.type === 'succes' ? 'raison-succes' : 'raison-echec'}`}
                  onClick={() => confirmerRaison(r)}
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="duree-affichage">
              <p className="duree-label">Durée de l'appel</p>
              <p className="duree-valeur">{formatDureeCourte(Math.round(contactPourRaison.dureeMs / 1000))}</p>
              <p className="duree-note">
                Mesurée automatiquement depuis l'appui sur le bouton d'appel 📞 — non modifiable
              </p>
            </div>

            <button className="btn-annuler btn-annuler-large" onClick={annulerConfirmation}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function debutJourneeAvecDecalage(joursAvant) {
  const d = new Date()
  d.setDate(d.getDate() - joursAvant)
  d.setHours(0, 0, 0, 0)
  return d
}

function debutAujourdhui() {
  return debutJourneeAvecDecalage(0).getTime()
}

function debutSemaineAgent() {
  const d = new Date()
  const jour = d.getDay()
  const lundi = new Date(d)
  lundi.setDate(d.getDate() - ((jour + 6) % 7))
  lundi.setHours(0, 0, 0, 0)
  return lundi
}

function debutMoisAgent() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
}

const NOMS_JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

function AujourdhuiPanel({ nom, contacts, objectifJour }) {
  const debut = debutAujourdhui()
  const fait = contacts.filter(
    (c) => c.statut === 'traite' && c.dateTraite && c.dateTraite >= debut,
  ).length
  const objectifAtteint = fait >= objectifJour

  const objectifHebdo = objectifJour * 6

  const donneesSemaine = useMemo(() => {
    const lundi = debutSemaineAgent()
    const jours = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(lundi)
      d.setDate(lundi.getDate() + i)
      jours.push({ date: d, label: NOMS_JOURS[d.getDay()], reussis: 0 })
    }
    contacts.forEach((c) => {
      if (c.statut !== 'traite' || !c.dateTraite) return
      const d = new Date(c.dateTraite)
      d.setHours(0, 0, 0, 0)
      const jour = jours.find((j) => j.date.getTime() === d.getTime())
      if (jour) jour.reussis += 1
    })
    return jours
  }, [contacts])

  const totalSemaine = donneesSemaine.reduce((s, j) => s + j.reussis, 0)
  const totalMois = contacts.filter(
    (c) => c.statut === 'traite' && c.dateTraite && c.dateTraite >= debutMoisAgent(),
  ).length

  const meilleurJour = donneesSemaine.reduce(
    (meilleur, j) => (j.reussis > meilleur.reussis ? j : meilleur),
    donneesSemaine[0],
  )

  const etoiles = Math.max(0, Math.min(5, Math.round((totalSemaine / objectifHebdo) * 5)))

  const dernierAppelTs = contacts.reduce(
    (max, c) => (c.dateTraite && c.dateTraite > max ? c.dateTraite : max),
    0,
  )
  const joursSansActivite = dernierAppelTs
    ? Math.floor((Date.now() - dernierAppelTs) / (24 * 60 * 60 * 1000))
    : null

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

      {objectifAtteint ? (
        <div className="alerte-succes">🎉 Objectif du jour atteint — excellent travail !</div>
      ) : (
        <div className="alerte-retard">
          Il reste {objectifJour - fait} opérations pour atteindre l'objectif du jour
        </div>
      )}

      {joursSansActivite !== null && joursSansActivite >= 2 && (
        <div className="alerte-inactivite">Aucune activité depuis {joursSansActivite} jours</div>
      )}

      <div className="progres-cercle-wrapper">
        <div
          className={`progres-cercle ${objectifAtteint ? 'progres-cercle-atteint' : ''}`}
          style={{ '--pct': Math.min(100, Math.round((fait / objectifJour) * 100)) }}
        >
          <span className="progres-chiffre">{fait}</span>
          <span className="progres-total">sur {objectifJour} aujourd'hui</span>
        </div>
      </div>

      <div className="agent-etoiles-wrapper">
        <div className="equipe-etoiles agent-etoiles">
          {'★'.repeat(etoiles)}
          {'☆'.repeat(5 - etoiles)}
        </div>
        <p className="hint">Performance de la semaine</p>
      </div>

      <div className="equipe-stats-grille" style={{ marginTop: 12 }}>
        <div>
          <span className="equipe-stat-chiffre">{totalSemaine}</span>
          <span className="equipe-stat-label">Cette semaine</span>
        </div>
        <div>
          <span className="equipe-stat-chiffre">{totalMois}</span>
          <span className="equipe-stat-label">Ce mois</span>
        </div>
      </div>

      {meilleurJour.reussis > 0 && (
        <p className="hint" style={{ textAlign: 'center', marginTop: 10 }}>
          Votre meilleur jour cette semaine : <strong>{meilleurJour.label}</strong> avec{' '}
          {meilleurJour.reussis} réussites
        </p>
      )}

      <div style={{ marginTop: 16 }}>
        <h3>Réussites de la semaine</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={donneesSemaine} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradAgentSemaine" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7fd9a8" stopOpacity={1} />
                <stop offset="100%" stopColor="#7fd9a8" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#3a4f2f" />
            <XAxis dataKey="label" tick={{ fill: '#cdd6c4', fontSize: 11 }} />
            <YAxis tick={{ fill: '#cdd6c4', fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: '#16241a', border: '1px solid #c9a24b', borderRadius: 8 }} />
            <Bar dataKey="reussis" radius={[6, 6, 0, 0]}>
              {donneesSemaine.map((j, i) => (
                <Cell key={i} fill={j.label === meilleurJour.label && j.reussis > 0 ? '#c9a24b' : 'url(#gradAgentSemaine)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default AgentDashboard
