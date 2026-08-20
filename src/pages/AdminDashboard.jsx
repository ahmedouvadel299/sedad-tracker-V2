import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { ref, onValue, update } from 'firebase/database'
import * as XLSX from 'xlsx'
import { db, auth } from '../firebase.js'

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

function AdminDashboard() {
  const navigate = useNavigate()
  const [onglet, setOnglet] = useState('listes')
  const [toutesLesListes, setToutesLesListes] = useState({})

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
    })
    return () => unsub()
  }, [])

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
        <div className="agent-header-nom">Administration</div>
        <div className="agent-header-titre">
          Registre SEDAD
          <div className="agent-header-banque">البنك الموريتاني للاستثمار</div>
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
      {onglet === 'rapports' && <RapportsPanel toutesLesListes={toutesLesListes} />}
    </div>
  )
}

function VueEnsemble({ toutesLesListes }) {
  const stats = useMemo(() => {
    let enAttente = 0
    let traites = 0
    let echecs = 0
    Object.values(toutesLesListes).forEach((contacts) => {
      Object.values(contacts || {}).forEach((c) => {
        if (c.statut === 'en_attente') enAttente++
        else if (c.statut === 'traite') traites++
        else if (c.statut === 'echec') echecs++
      })
    })
    return { enAttente, traites, echecs, total: enAttente + traites + echecs }
  }, [toutesLesListes])

  return (
    <div className="card">
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-chiffre">{stats.total}</div>
          <div className="stat-label">Total contacts</div>
        </div>
        <div className="stat-box">
          <div className="stat-chiffre">{stats.enAttente}</div>
          <div className="stat-label">En attente</div>
        </div>
        <div className="stat-box">
          <div className="stat-chiffre">{stats.traites}</div>
          <div className="stat-label">Réussis</div>
        </div>
        <div className="stat-box">
          <div className="stat-chiffre">{stats.echecs}</div>
          <div className="stat-label">Échecs</div>
        </div>
      </div>
    </div>
  )
}

function ListesPanel() {
  const [apercu, setApercu] = useState([])
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
      const nom = ligne.Nom || ligne.nom || ligne.NOM || ''
      const telephone = String(ligne.Telephone || ligne.téléphone || ligne.Téléphone || ligne.telephone || '')
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
  }

  return (
    <div className="card">
      <h3>Importer une liste (fichier Excel)</h3>
      <p className="hint">Colonnes attendues : Nom, Telephone</p>
      <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFichier} />

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

function RapportsPanel({ toutesLesListes }) {
  function exporterCSV() {
    const lignes = [['Agent', 'Nom', 'Téléphone', 'Statut', 'Raison', 'Durée (sec)']]
    Object.entries(toutesLesListes).forEach(([uid, contacts]) => {
      const nomAgent = AGENTS[uid] || uid
      Object.values(contacts || {}).forEach((c) => {
        lignes.push([nomAgent, c.nom || '', c.telephone || '', c.statut || '', c.raison || '', c.dureeAppelSec || ''])
      })
    })
    const csv = lignes.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rapport-sedad-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="card">
      <h3>Exporter un rapport</h3>
      <p className="hint">Exporte tous les contacts de tous les agents au format Excel (CSV).</p>
      <button className="btn-primaire" onClick={exporterCSV}>
        Exporter en CSV
      </button>
    </div>
  )
}

export default AdminDashboard
