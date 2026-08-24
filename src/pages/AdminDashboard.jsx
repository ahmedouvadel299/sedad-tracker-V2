import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { ref, onValue, update, get, remove } from 'firebase/database'
import * as XLSX from 'xlsx'
import { db, auth } from '../firebase.js'
import RapportsPanel from './RapportsPanel.jsx'
import Parametres from './Parametres.jsx'
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
  const [settings, setSettings] = useState({})

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

  useEffect(() => {
    const settingsRef = ref(db, 'settings')
    const unsub = onValue(settingsRef, (snap) => {
      setSettings(snap.val() || {})
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

  const agentsOverrides = settings.agentsOverrides || {}
  const agentsAffiches = Object.fromEntries(
    Object.entries(AGENTS).map(([uid, nom]) => [uid, agentsOverrides[uid]?.nom || nom]),
  )
  const agentsActifs = Object.fromEntries(
    Object.keys(AGENTS).map((uid) => [uid, agentsOverrides[uid]?.actif !== false]),
  )

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
        <button className={onglet === 'parametres' ? 'active' : ''} onClick={() => setOnglet('parametres')}>
          Paramètres
        </button>
      </nav>

      {onglet === 'vue' && <VueEnsemble toutesLesListes={toutesLesListes} agentsAffiches={agentsAffiches} />}
      {onglet === 'listes' && (
        <ListesPanel toutesLesListes={toutesLesListes} agentsAffiches={agentsAffiches} agentsActifs={agentsActifs} />
      )}
      {onglet === 'equipe' && (
        <EquipePanel
          toutesLesListes={toutesLesListes}
          settings={settings}
          agentsAffiches={agentsAffiches}
        />
      )}
      {onglet === 'rapports' && (
        <RapportsPanel toutesLesListes={toutesLesListes} agents={agentsAffiches} settings={settings} />
      )}
      {onglet === 'parametres' && <Parametres />}
    </div>
  )
}

function VueEnsemble({ toutesLesListes, agentsAffiches }) {
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
    return Object.entries(agentsAffiches).map(([uid, nom]) => {
      const contacts = tousLesContacts.filter((c) => c.agentUid === uid)
      const traites = contacts.filter((c) => c.statut === 'traite').length
      const echecs = contacts.filter((c) => c.statut === 'echec').length
      return { nom: nom.split(' ')[0], nomComplet: nom, Réussis: traites, Échecs: echecs }
    })
  }, [tousLesContacts, agentsAffiches])

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
        <TopAgents tousLesContacts={tousLesContacts} agentsAffiches={agentsAffiches} />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <TopHeures tousLesContacts={tousLesContacts} />
      </div>
    </>
  )
}

function TopAgents({ tousLesContacts, agentsAffiches }) {
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
      .map(([uid, count]) => ({ uid, nom: agentsAffiches[uid] || uid, count }))
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

function ListesPanel({ toutesLesListes, agentsAffiches, agentsActifs }) {
  const [apercu, setApercu] = useState([])
  const [colonnesDetectees, setColonnesDetectees] = useState([])
  const [agentChoisi, setAgentChoisi] = useState('')
  const [nomLot, setNomLot] = useState('')
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
      if (!nomLot) {
        setNomLot(`Import du ${new Date().toLocaleDateString('fr-FR')}`)
      }
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
    const batchId = `batch_${Date.now()}`
    const libelleLot = nomLot || `Import du ${new Date().toLocaleDateString('fr-FR')}`
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
        batchId,
        nomLot: libelleLot,
        dateImport: Date.now(),
      }
    })
    await update(ref(db), updates)
    await update(ref(db, 'meta'), { calllistsUpdatedAt: Date.now() })
    setStatut(`${Object.keys(updates).length} contacts importés et assignés avec succès.`)
    setApercu([])
    setColonnesDetectees([])
    setNomLot('')
  }

  return (
    <>
      <div className="card">
        <h3>Importer une liste (fichier Excel)</h3>
        <p className="hint">Colonnes attendues : Nom, Telephone (variantes acceptées)</p>

        <label className="select-label">
          Nom du lot (pour archivage ultérieur)
          <input type="text" value={nomLot} onChange={(e) => setNomLot(e.target.value)} placeholder="Ex: Lot Août - Groupe A" />
        </label>

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
                {Object.entries(agentsAffiches)
                  .filter(([uid]) => agentsActifs[uid])
                  .map(([uid, nom]) => (
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

      <ArchivesPanel toutesLesListes={toutesLesListes} />
    </>
  )
}

function ArchivesPanel({ toutesLesListes }) {
  const [statutAction, setStatutAction] = useState('')

  const lots = useMemo(() => {
    const map = {}
    Object.entries(toutesLesListes).forEach(([agentUid, contacts]) => {
      Object.entries(contacts || {}).forEach(([contactId, c]) => {
        if (!c.batchId) return
        if (!map[c.batchId]) {
          map[c.batchId] = {
            batchId: c.batchId,
            nomLot: c.nomLot || c.batchId,
            agentUid,
            agentNom: AGENTS[agentUid] || agentUid,
            dateImport: c.dateImport,
            total: 0,
            archives: 0,
            contactIds: [],
          }
        }
        map[c.batchId].total += 1
        if (c.archive) map[c.batchId].archives += 1
        map[c.batchId].contactIds.push(contactId)
      })
    })
    return Object.values(map).sort((a, b) => (b.dateImport || 0) - (a.dateImport || 0))
  }, [toutesLesListes])

  async function archiverLot(lot) {
    if (!window.confirm(`Archiver le lot "${lot.nomLot}" (${lot.total} contacts) ? Il restera compté dans les rapports mais disparaîtra de la liste active de l'agent.`)) return
    setStatutAction('Archivage en cours...')
    const updates = {}
    lot.contactIds.forEach((id) => {
      updates[`calllists_by_agent/${lot.agentUid}/${id}/archive`] = true
    })
    await update(ref(db), updates)
    setStatutAction('Lot archivé avec succès.')
    setTimeout(() => setStatutAction(''), 3000)
  }

  async function desarchiverLot(lot) {
    setStatutAction('Désarchivage en cours...')
    const updates = {}
    lot.contactIds.forEach((id) => {
      updates[`calllists_by_agent/${lot.agentUid}/${id}/archive`] = false
    })
    await update(ref(db), updates)
    setStatutAction('Lot désarchivé.')
    setTimeout(() => setStatutAction(''), 3000)
  }

  async function supprimerLot(lot) {
    if (!window.confirm(`Supprimer définitivement le lot "${lot.nomLot}" (${lot.total} contacts) ? Cette action est irréversible.`)) return
    setStatutAction('Suppression en cours...')
    const updates = {}
    lot.contactIds.forEach((id) => {
      updates[`calllists_by_agent/${lot.agentUid}/${id}`] = null
    })
    await update(ref(db), updates)
    setStatutAction('Lot supprimé.')
    setTimeout(() => setStatutAction(''), 3000)
  }

  return (
    <div className="card">
      <h3>Lots importés — archivage et suppression</h3>
      {lots.length === 0 && <p className="hint">Aucun lot importé pour le moment.</p>}
      {lots.map((lot) => {
        const entierementArchive = lot.archives === lot.total && lot.total > 0
        return (
          <div key={lot.batchId} className="lot-row">
            <div className="lot-row-header">
              <span className="lot-nom">{lot.nomLot}</span>
              <span className="lot-badge">{entierementArchive ? 'Archivé' : 'Actif'}</span>
            </div>
            <div className="lot-row-detail">
              {lot.agentNom} · {lot.total} contacts
              {lot.dateImport ? ` · ${new Date(lot.dateImport).toLocaleDateString('fr-FR')}` : ''}
            </div>
            <div className="lot-row-actions">
              {entierementArchive ? (
                <button className="btn-secondaire-mini" onClick={() => desarchiverLot(lot)}>
                  Désarchiver
                </button>
              ) : (
                <button className="btn-secondaire-mini" onClick={() => archiverLot(lot)}>
                  Archiver
                </button>
              )}
              <button className="btn-danger-mini" onClick={() => supprimerLot(lot)}>
                Supprimer
              </button>
            </div>
          </div>
        )
      })}
      {statutAction && <p className="statut-import">{statutAction}</p>}
    </div>
  )
}

function debutSemaine() {
  const d = new Date()
  const jour = d.getDay()
  const lundi = new Date(d)
  lundi.setDate(d.getDate() - ((jour + 6) % 7))
  lundi.setHours(0, 0, 0, 0)
  return lundi.getTime()
}

function debutMois() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
}

function debutJourEquipe() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function EquipePanel({ toutesLesListes, settings, agentsAffiches }) {
  const [agentSelectionne, setAgentSelectionne] = useState(null)
  const [renommageUid, setRenommageUid] = useState(null)
  const [nouveauNom, setNouveauNom] = useState('')
  const [statutAction, setStatutAction] = useState('')

  const objectifJournalier = Number(settings.objectifJournalier) || 125
  const objectifHebdo = objectifJournalier * 6
  const agentsOverrides = settings.agentsOverrides || {}

  const dJour = debutJourEquipe()
  const dSemaine = debutSemaine()
  const dMois = debutMois()

  const parAgent = Object.entries(agentsAffiches).map(([uid, nom]) => {
    const contacts = Object.values(toutesLesListes[uid] || {})
    const traitesContacts = contacts.filter((c) => c.statut === 'traite')
    const echecsContacts = contacts.filter((c) => c.statut === 'echec')
    const totalTraiteOuEchec = traitesContacts.length + echecsContacts.length

    const aujourdhui = traitesContacts.filter((c) => c.dateTraite >= dJour).length
    const cetteSemaine = traitesContacts.filter((c) => c.dateTraite >= dSemaine).length
    const ceMois = traitesContacts.filter((c) => c.dateTraite >= dMois).length

    const dureeTotal = [...traitesContacts, ...echecsContacts].reduce((s, c) => s + (c.dureeAppelSec || 0), 0)
    const dureeMoyenne = totalTraiteOuEchec > 0 ? Math.round(dureeTotal / totalTraiteOuEchec) : 0

    const dernierAppel = contacts.reduce((max, c) => (c.dateTraite && c.dateTraite > max ? c.dateTraite : max), 0)

    const tauxReussite =
      totalTraiteOuEchec > 0 ? Math.round((traitesContacts.length / totalTraiteOuEchec) * 100) : 0

    const etoiles = Math.max(0, Math.min(5, Math.round((cetteSemaine / objectifHebdo) * 5)))
    const actif = agentsOverrides[uid]?.actif !== false

    return {
      uid,
      nom,
      total: contacts.length,
      enAttente: contacts.filter((c) => c.statut === 'en_attente').length,
      traites: traitesContacts.length,
      echecs: echecsContacts.length,
      aujourdhui,
      cetteSemaine,
      ceMois,
      dureeMoyenne,
      dernierAppel,
      tauxReussite,
      etoiles,
      actif,
    }
  })

  function formatDureeMoyenne(sec) {
    if (!sec) return '—'
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return m > 0 ? `${m}min ${s}s` : `${s}s`
  }

  function formatDernierAppel(ts) {
    if (!ts) return 'Aucun appel enregistré'
    const jours = Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000))
    if (jours === 0) return "Aujourd'hui"
    if (jours === 1) return 'Hier'
    return `Il y a ${jours} jours`
  }

  function commencerRenommage(a) {
    setRenommageUid(a.uid)
    setNouveauNom(a.nom)
  }

  async function enregistrerRenommage(uid) {
    if (!nouveauNom.trim()) return
    setStatutAction('Enregistrement...')
    await update(ref(db, `settings/agentsOverrides/${uid}`), { nom: nouveauNom.trim() })
    setRenommageUid(null)
    setStatutAction('')
  }

  async function basculerActif(a) {
    setStatutAction('Mise à jour...')
    await update(ref(db, `settings/agentsOverrides/${a.uid}`), { actif: !a.actif })
    setStatutAction('')
  }

  return (
    <div className="card">
      <p className="hint">
        Ajout ou suppression d'un compte agent se fait toujours via Firebase Console (création manuelle
        unique). Le nom et le statut actif/inactif se gèrent ici directement.
      </p>

      {parAgent.map((a) => (
        <div key={a.uid} className="equipe-carte">
          <div className="equipe-carte-header" onClick={() => setAgentSelectionne(a.uid === agentSelectionne ? null : a.uid)}>
            <div>
              {renommageUid === a.uid ? (
                <div className="equipe-renommage" onClick={(e) => e.stopPropagation()}>
                  <input value={nouveauNom} onChange={(e) => setNouveauNom(e.target.value)} />
                  <button className="btn-secondaire-mini" onClick={() => enregistrerRenommage(a.uid)}>
                    Valider
                  </button>
                  <button className="btn-danger-mini" onClick={() => setRenommageUid(null)}>
                    Annuler
                  </button>
                </div>
              ) : (
                <span className="equipe-nom">
                  {a.nom} {!a.actif && <span className="lot-badge">Inactif</span>}
                </span>
              )}
              <div className="equipe-etoiles">
                {'★'.repeat(a.etoiles)}
                {'☆'.repeat(5 - a.etoiles)}
                <span className="hint"> · semaine en cours</span>
              </div>
            </div>
            <span className="agent-row-total">{a.total} contacts</span>
          </div>

          <div className="equipe-stats-grille">
            <div>
              <span className="equipe-stat-chiffre">{a.aujourdhui}</span>
              <span className="equipe-stat-label">Aujourd'hui</span>
            </div>
            <div>
              <span className="equipe-stat-chiffre">{a.cetteSemaine}</span>
              <span className="equipe-stat-label">Cette semaine</span>
            </div>
            <div>
              <span className="equipe-stat-chiffre">{a.ceMois}</span>
              <span className="equipe-stat-label">Ce mois</span>
            </div>
            <div>
              <span className="equipe-stat-chiffre">{a.tauxReussite}%</span>
              <span className="equipe-stat-label">Réussite</span>
            </div>
          </div>

          <div className="equipe-carte-detail">
            En attente: {a.enAttente} · Durée moyenne: {formatDureeMoyenne(a.dureeMoyenne)} · Dernier appel:{' '}
            {formatDernierAppel(a.dernierAppel)}
          </div>

          <div className="lot-row-actions" style={{ marginTop: 8 }}>
            {renommageUid !== a.uid && (
              <button className="btn-secondaire-mini" onClick={() => commencerRenommage(a)}>
                Renommer
              </button>
            )}
            <button className="btn-secondaire-mini" onClick={() => basculerActif(a)}>
              {a.actif ? 'Désactiver' : 'Réactiver'}
            </button>
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

      {statutAction && <p className="statut-import">{statutAction}</p>}
    </div>
  )
}

export default AdminDashboard
