import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { ref, onValue, update, get } from 'firebase/database'
import * as XLSX from 'xlsx'
import { db, auth } from '../firebase.js'
import RapportsPanel from './RapportsPanel.jsx'
import LogoIcon from './logo.jsx'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

const AGENTS = {
  Nh768OOap7W0VxDs6u7dxER0WbP2: 'Fatimetou ebloul',
  '8gtZpvoI6DOOpZZJ0dF7NiiP3Fn2': 'Jemile salem',
  '5NqBk8NMP7TxdrV5wxRzqAgSkhA2': 'Khweire Mohamed',
  '7dTHkZbqj8QaQcWed4RjgYmWz2D2': 'Zeinebou ebloul',
  BOQPUnpkQyVnINH6MB595qPp6Oy1: 'Zeinebou med lemin',
  Ve1wjRz3U9gmtBTSf2GMcQ9VnHa2: 'Aicha mohamed',
  JHEWReVwQAb8Tp7HvwXWjkAtStW2: 'Aminetou Bakar',
  '9gZZIFDw3RT0cMLTb5ysfvfImLq2': 'Bintou Mohamednavee',
  kw6OIAR9mbhnh7yaVm8lPoFqGcH3: 'Cheitt Sidi Mohamed',
  '1MHFdDj6pvXGTS6xhG4arMdqzah1': 'El aliya ayiih',
  Ia1Jc3lTPrOpOTvKWS8SSwjEWIR2: 'Emna Aicha Eboubecar',
}

const RAISONS_RETRY = ['Injoignable', 'En cours']
const COULEUR_OR = '#c9a24b'
const COULEUR_MENTHE = '#7fd9a8'
const COULEUR_ROUGE = '#e0a1a1'

function normaliserCle(cle) {
  return cle.toString().trim().toLowerCase()
}

function extraireValeur(ligne, candidats) {
  const cles = Object.keys(ligne)
  for (const cle of cles) {
    if (candidats.includes(normaliserCle(cle))) {
      return ligne[cle]
    }
  }
  return ''
}

function AdminDashboard() {
  const navigate = useNavigate()
  const [onglet, setOnglet] = useState('listes')
  const [toutesLesListes, setToutesLesListes] = useState({})
  const [derniereMaj, setDerniereMaj] = useState(Date.now())
  const [actualisation, setActualisation] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) navigate('/', { replace: true })
    })
    return () => unsub()
  }, [navigate])

  useEffect(() => {
    const listesRef = ref(db, 'calllists_by_agent')
    const unsub = onValue(listesRef, (snap) => {
      setToutesLesListes(snap.val() || {})
      setDerniereMaj(Date.now())
    })
    return () => unsub()
  }, [])

  async function actualiserManuel() {
    setActualisation(true)
    try {
      const snap = await get(ref(db, 'calllists_by_agent'))
      setToutesLesListes(snap.val() || {})
      setDerniereMaj(Date.now())
    } finally {
      setActualisation(false)
    }
  }

  async function deconnexion() {
    await signOut(auth)
    navigate('/', { replace: true })
  }

  return (
    <div className="page admin-page">
      <header className="agent-header">
        <button className="btn-deconnexion" onClick={deconnexion}>
          Déconnexion
        </button>
        <div>
          <div className="agent-header-nom">Administration</div>
          <button className="btn-actualiser" onClick={actualiserManuel} disabled={actualisation}>
            {actualisation ? 'Actualisation...' : '🔄 Actualiser'}
          </button>
          <div className="derniere-maj">
            Mis à jour : {new Date(derniereMaj).toLocaleTimeString('fr-FR')}
          </div>
        </div>
        <div className="agent-header-titre-wrapper">
          <div className="agent-header-titre">
            Registre SEDAD
            <div className="agent-header-banque">البنك الموريتاني للاستثمار</div>
          </div>
          <LogoIcon size={40} />
        </div>
      </header>

      <nav className="pill-tabs">
        <button className={onglet === 'vue' ? 'active' : ''} onClick={() => setOnglet('vue')}>
          Vue d'ensemble
        </button>
        <button className={onglet === 'listes' ? 'active' : ''} onClick={() => setOnglet('listes')}>
          Listes
        </button>
        <button className={onglet === 'equipe' ? 'active' : ''} onClick={() => setOnglet('equipe')}>
          Équipe
        </button>
        <button className={onglet === 'rapports' ? 'active' : ''} onClick={() => setOnglet('rapports')}>
          Rapports
        </button>
      </nav>

      {onglet === 'vue' && <VueEnsemble toutesLesListes={toutesLesListes} />}
      {onglet === 'listes' && <ListesPanel />}
      {onglet === 'equipe' && <EquipePanel toutesLesListes={toutesLesListes} />}
      {onglet === 'rapports' && <RapportsPanel toutesLesListes={toutesLesListes} agents={AGENTS} />}
    </div>
  )
}

function VueEnsemble({ toutesLesListes }) {
  const tousLesContacts = useMemo(() => {
    const liste = []
    Object.entries(toutesLesListes).forEach(([agentUid, contacts]) => {
      Object.values(contacts || {}).forEach((c) => liste.push({ ...c, agentUid }))
    })
    return liste
  }, [toutesLesListes])

  const stats = useMemo(() => {
    let nonAppeles = 0
    let traites = 0
    let aRappeler = 0
    let echecsDefinitifs = 0
    tousLesContacts.forEach((c) => {
      if (c.statut === 'en_attente') nonAppeles++
      else if (c.statut === 'traite') traites++
      else if (c.statut === 'echec') {
        if (RAISONS_RETRY.includes(c.raison)) aRappeler++
        else echecsDefinitifs++
      }
    })
    return {
      totalContacts: traites + echecsDefinitifs + aRappeler,
      nonAppeles,
      traites,
      aRappeler,
      echecsDefinitifs,
    }
  }, [tousLesContacts])

  const donneesParAgent = useMemo(() => {
    return Object.entries(AGENTS).map(([uid, nom]) => {
      const contacts = tousLesContacts.filter((c) => c.agentUid === uid)
      const traites = contacts.filter((c) => c.statut === 'traite').length
      const echecs = contacts.filter((c) => c.statut === 'echec').length
      return { nom: nom.split(' ')[0], nomComplet: nom, Réussis: traites, Échecs: echecs }
    })
  }, [tousLesContacts])

  const donneesRepartition = useMemo(
    () => [
      { name: 'Réussis', value: stats.traites, color: COULEUR_MENTHE },
      { name: 'À rappeler', value: stats.aRappeler, color: COULEUR_OR },
      { name: 'Échecs définitifs', value: stats.echecsDefinitifs, color: COULEUR_ROUGE },
      { name: 'Non appelés', value: stats.nonAppeles, color: '#5c7a4a' },
    ],
    [stats],
  )

  const tendance14Jours = useMemo(() => {
    const jours = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      jours.push({ date: d, label: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), reussis: 0, echecs: 0 })
    }
    tousLesContacts.forEach((c) => {
      if (!c.dateTraite) return
      const d = new Date(c.dateTraite)
      d.setHours(0, 0, 0, 0)
      const jour = jours.find((j) => j.date.getTime() === d.getTime())
      if (!jour) return
      if (c.statut === 'traite') jour.reussis++
      else if (c.statut === 'echec') jour.echecs++
    })
    return jours
  }, [tousLesContacts])

  return (
    <>
      <div className="card">
        <div className="stats-grid">
          <div className="stat-box stat-box-3d stat-gold">
            <div className="stat-chiffre">{stats.totalContacts}</div>
            <div className="stat-label">Total appels traités</div>
          </div>
          <div className="stat-box stat-box-3d stat-gold">
            <div className="stat-chiffre">{stats.aRappeler}</div>
            <div className="stat-label">En attente (à rappeler)</div>
          </div>
          <div className="stat-box stat-box-3d stat-mint">
            <div className="stat-chiffre">{stats.traites}</div>
            <div className="stat-label">Réussis</div>
          </div>
          <div className="stat-box stat-box-3d stat-rouge">
            <div className="stat-chiffre">{stats.echecsDefinitifs}</div>
            <div className="stat-label">Échecs définitifs</div>
          </div>
        </div>
      </div>

      <div className="card chart-card" style={{ marginTop: 16 }}>
        <h3>Répartition globale des contacts</h3>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <defs>
              <filter id="ombre3dAdmin" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.35" />
              </filter>
              {donneesRepartition.map((d, i) => (
                <linearGradient id={`gradAdmin-${i}`} key={i} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={d.color} stopOpacity={1} />
                  <stop offset="100%" stopColor={d.color} stopOpacity={0.55} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={donneesRepartition}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={95}
              paddingAngle={3}
              filter="url(#ombre3dAdmin)"
              label={({ name, value }) => (value > 0 ? `${name}: ${value}` : '')}
              labelLine={false}
            >
              {donneesRepartition.map((d, i) => (
                <Cell key={i} fill={`url(#gradAdmin-${i})`} stroke="#16241a" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: '#16241a', border: '1px solid #c9a24b', borderRadius: 8 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="card chart-card" style={{ marginTop: 16 }}>
        <h3>Performance par agent</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={donneesParAgent} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
            <defs>
              <linearGradient id="gradReussiAdmin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COULEUR_MENTHE} stopOpacity={1} />
                <stop offset="100%" stopColor={COULEUR_MENTHE} stopOpacity={0.4} />
              </linearGradient>
              <linearGradient id="gradEchecAdmin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COULEUR_ROUGE} stopOpacity={1} />
                <stop offset="100%" stopColor={COULEUR_ROUGE} stopOpacity={0.4} />
              </linearGradient>
              <filter id="ombreBarreAdmin" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="1" dy="3" stdDeviation="2" floodColor="#000" floodOpacity="0.4" />
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#3a4f2f" />
            <XAxis dataKey="nom" angle={-40} textAnchor="end" tick={{ fill: '#cdd6c4', fontSize: 11 }} interval={0} />
            <YAxis tick={{ fill: '#cdd6c4', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#16241a', border: '1px solid #c9a24b', borderRadius: 8 }}
              labelFormatter={(label, payload) => payload?.[0]?.payload?.nomComplet || label}
            />
            <Bar dataKey="Réussis" fill="url(#gradReussiAdmin)" filter="url(#ombreBarreAdmin)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Échecs" fill="url(#gradEchecAdmin)" filter="url(#ombreBarreAdmin)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card chart-card" style={{ marginTop: 16 }}>
        <h3>Tendance des 14 derniers jours</h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={tendance14Jours} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradAireReussiAdmin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COULEUR_MENTHE} stopOpacity={0.8} />
                <stop offset="95%" stopColor={COULEUR_MENTHE} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradAireEchecAdmin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COULEUR_ROUGE} stopOpacity={0.7} />
                <stop offset="95%" stopColor={COULEUR_ROUGE} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#3a4f2f" />
            <XAxis dataKey="label" tick={{ fill: '#cdd6c4', fontSize: 10 }} />
            <YAxis tick={{ fill: '#cdd6c4', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#16241a', border: '1px solid #c9a24b', borderRadius: 8 }} />
            <Area type="monotone" dataKey="reussis" name="Réussis" stroke={COULEUR_MENTHE} fill="url(#gradAireReussiAdmin)" strokeWidth={2} />
            <Area type="monotone" dataKey="echecs" name="Échecs" stroke={COULEUR_ROUGE} fill="url(#gradAireEchecAdmin)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <TopAgents tousLesContacts={tousLesContacts} />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <TopHeures tousLesContacts={tousLesContacts} />
      </div>
    </>
  )
}

function TopAgents({ tousLesContacts }) {
  const classement = useMemo(() => {
    const maintenant = new Date()
    const moisActuel = maintenant.getMonth()
    const anneeActuelle = maintenant.getFullYear()

    const compteurs = {}
    tousLesContacts.forEach((c) => {
      if (c.statut !== 'traite' || !c.dateTraite) return
      const d = new Date(c.dateTraite)
      if (d.getMonth() !== moisActuel || d.getFullYear() !== anneeActuelle) return
      compteurs[c.agentUid] = (compteurs[c.agentUid] || 0) + 1
    })

    return Object.entries(compteurs)
      .map(([uid, count]) => ({ uid, nom: AGENTS[uid] || uid, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
  }, [tousLesContacts])

  const nomsMois = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
  ]
  const moisLabel = nomsMois[new Date().getMonth()]

  return (
    <div>
      <h3>🏆 Top 3 agents — {moisLabel}</h3>
      {classement.length === 0 && <p className="hint">Aucune réussite enregistrée ce mois-ci.</p>}
      {classement.map((a, idx) => (
        <div key={a.uid} className="classement-row">
          <span className="classement-rang">{idx + 1}</span>
          <span className="classement-nom">{a.nom}</span>
          <span className="classement-score">{a.count} réussites</span>
        </div>
      ))}
    </div>
  )
}

function TopHeures({ tousLesContacts }) {
  const heures = useMemo(() => {
    const parHeure = {}
    tousLesContacts.forEach((c) => {
      if (c.heureAppel === undefined || c.heureAppel === null) return
      if (c.statut !== 'traite' && c.statut !== 'echec') return
      const h = c.heureAppel
      if (!parHeure[h]) parHeure[h] = { succes: 0, total: 0 }
      parHeure[h].total++
      if (c.statut === 'traite') parHeure[h].succes++
    })

    return Object.entries(parHeure)
      .filter(([, v]) => v.total >= 3)
      .map(([h, v]) => ({ heure: h, taux: Math.round((v.succes / v.total) * 100) }))
      .sort((a, b) => b.taux - a.taux)
      .slice(0, 3)
  }, [tousLesContacts])

  return (
    <div>
      <h3>⏰ Meilleurs horaires d'appel</h3>
      <p className="hint">Basé sur le taux de réussite (minimum 3 appels par heure)</p>
      {heures.length === 0 && <p className="hint">Pas encore assez de données.</p>}
      {heures.map((h) => (
        <div key={h.heure} className="heure-row">
          <span className="heure-taux">{h.taux}%</span>
          <div className="heure-barre-fond">
            <div className="heure-barre" style={{ width: `${h.taux}%` }} />
          </div>
          <span className="heure-label">{h.heure.padStart(2, '0')}:00</span>
        </div>
      ))}
    </div>
  )
}

function ListesPanel() {
  const [apercu, setApercu] = useState([])
  const [colonnesDetectees, setColonnesDetectees] = useState([])
  const [agentChoisi, setAgentChoisi] = useState('')
  const [statut, setStatut] = useState('')

  function handleFichier(e) {
    const f = e.target.files[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' })
      const feuille = wb.Sheets[wb.SheetNames[0]]
      const lignes = XLSX.utils.sheet_to_json(feuille, { defval: '' })
      setApercu(lignes)
      setColonnesDetectees(lignes.length > 0 ? Object.keys(lignes[0]) : [])
      setStatut('')
    }
    reader.readAsBinaryString(f)
  }

  async function importerEtAssigner() {
    if (!agentChoisi) {
      setStatut('Veuillez choisir un agent.')
      return
    }
    if (apercu.length === 0) {
      setStatut('Aucune donnée à importer.')
      return
    }
    setStatut('Import en cours...')
    const updates = {}
    apercu.forEach((ligne, idx) => {
      const nom = extraireValeur(ligne, ['nom', 'name', 'الاسم', 'nom complet'])
      const telephone = String(
        extraireValeur(ligne, ['telephone', 'téléphone', 'tel', 'phone', 'الهاتف', 'رقم الهاتف']),
      )
      if (!nom && !telephone) return
      const id = `id_${Date.now()}_${idx}`
      updates[`calllists_by_agent/${agentChoisi}/${id}`] = {
        nom,
        telephone,
        statut: 'en_attente',
      }
    })
    await update(ref(db), updates)
    await update(ref(db, 'meta'), { calllistsUpdatedAt: Date.now() })
    setStatut(`${Object.keys(updates).length} contacts importés et assignés avec succès.`)
    setApercu([])
    setColonnesDetectees([])
  }

  return (
    <div className="card">
      <h3>Importer une liste (fichier Excel)</h3>
      <p className="hint">Colonnes attendues : Nom, Telephone (variantes acceptées)</p>
      <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFichier} />

      {colonnesDetectees.length > 0 && (
        <p className="hint">Colonnes trouvées dans le fichier : {colonnesDetectees.join(', ')}</p>
      )}

      {apercu.length > 0 && (
        <>
          <p className="hint">{apercu.length} lignes détectées.</p>

          <label className="select-label">
            Assigner à l'agent :
            <select value={agentChoisi} onChange={(e) => setAgentChoisi(e.target.value)}>
              <option value="">-- Choisir --</option>
              {Object.entries(AGENTS).map(([uid, nom]) => (
                <option key={uid} value={uid}>
                  {nom}
                </option>
              ))}
            </select>
          </label>

          <button className="btn-primaire" onClick={importerEtAssigner}>
            Importer et assigner
          </button>
        </>
      )}

      {statut && <p className="statut-import">{statut}</p>}
    </div>
  )
}

function EquipePanel({ toutesLesListes }) {
  const [agentSelectionne, setAgentSelectionne] = useState(null)

  const parAgent = Object.entries(AGENTS).map(([uid, nom]) => {
    const contacts = Object.values(toutesLesListes[uid] || {})
    return {
      uid,
      nom,
      total: contacts.length,
      enAttente: contacts.filter((c) => c.statut === 'en_attente').length,
      traites: contacts.filter((c) => c.statut === 'traite').length,
      echecs: contacts.filter((c) => c.statut === 'echec').length,
    }
  })

  return (
    <div className="card">
      {parAgent.map((a) => (
        <div key={a.uid} className="agent-row" onClick={() => setAgentSelectionne(a.uid === agentSelectionne ? null : a.uid)}>
          <div className="agent-row-header">
            <span className="agent-row-nom">{a.nom}</span>
            <span className="agent-row-total">{a.total} contacts</span>
          </div>
          <div className="agent-row-detail">
            En attente: {a.enAttente} · Réussis: {a.traites} · Échecs: {a.echecs}
          </div>

          {agentSelectionne === a.uid && (
            <div className="agent-contacts-liste">
              {Object.entries(toutesLesListes[a.uid] || {}).map(([id, c]) => (
                <div key={id} className="contact-row-mini">
                  <span>{c.nom}</span>
                  <span>{c.telephone}</span>
                  <span className={`badge-${c.statut}`}>{c.statut}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default AdminDashboard
