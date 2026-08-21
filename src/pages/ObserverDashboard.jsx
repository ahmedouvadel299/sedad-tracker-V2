import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { ref, onValue } from 'firebase/database'
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
import { db, auth } from '../firebase.js'
import LogoIcon from './logo.jsx'

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

function ObserverDashboard() {
  const navigate = useNavigate()
  const [toutesLesListes, setToutesLesListes] = useState({})
  const [chargement, setChargement] = useState(true)

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
      setChargement(false)
    })
    return () => unsub()
  }, [])

  async function deconnexion() {
    await signOut(auth)
    navigate('/', { replace: true })
  }

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
    const totalTraites = traites + echecsDefinitifs + aRappeler
    const tauxReussite = totalTraites > 0 ? Math.round((traites / totalTraites) * 100) : 0
    return { nonAppeles, traites, aRappeler, echecsDefinitifs, totalTraites, tauxReussite }
  }, [tousLesContacts])

  const donneesParAgent = useMemo(() => {
    return Object.entries(AGENTS).map(([uid, nom]) => {
      const contacts = tousLesContacts.filter((c) => c.agentUid === uid)
      const traites = contacts.filter((c) => c.statut === 'traite').length
      const echecs = contacts.filter((c) => c.statut === 'echec').length
      return {
        nom: nom.split(' ')[0],
        nomComplet: nom,
        Réussis: traites,
        Échecs: echecs,
        total: traites + echecs,
      }
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

  const topAgents = useMemo(() => {
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

  const meilleuresHeures = useMemo(() => {
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
      .map(([h, v]) => ({ heure: `${h.padStart(2, '0')}:00`, taux: Math.round((v.succes / v.total) * 100) }))
      .sort((a, b) => b.taux - a.taux)
      .slice(0, 5)
  }, [tousLesContacts])

  return (
    <div className="page observer-page">
      <header className="agent-header">
        <button className="btn-deconnexion" onClick={deconnexion}>
          Déconnexion
        </button>
        <div className="observer-badge">👁 Lecture seule</div>
        <div className="agent-header-titre-wrapper">
          <div className="agent-header-titre">
            Registre SEDAD
            <div className="agent-header-banque">البنك الموريتاني للاستثمار</div>
          </div>
          <LogoIcon size={40} />
        </div>
      </header>

      <h2 className="observer-titre">Vue d'ensemble — Direction</h2>

      {chargement ? (
        <p className="hint">Chargement des données…</p>
      ) : (
        <>
          <div className="stats-grid observer-stats-grid">
            <div className="stat-box stat-box-3d stat-gold">
              <div className="stat-chiffre">{stats.totalTraites}</div>
              <div className="stat-label">Appels traités</div>
            </div>
            <div className="stat-box stat-box-3d stat-mint">
              <div className="stat-chiffre">{stats.tauxReussite}%</div>
              <div className="stat-label">Taux de réussite</div>
            </div>
            <div className="stat-box stat-box-3d stat-gold">
              <div className="stat-chiffre">{stats.aRappeler}</div>
              <div className="stat-label">À rappeler</div>
            </div>
            <div className="stat-box stat-box-3d stat-rouge">
              <div className="stat-chiffre">{stats.echecsDefinitifs}</div>
              <div className="stat-label">Échecs définitifs</div>
            </div>
          </div>

          <div className="card chart-card">
            <h3>Répartition globale des contacts</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <defs>
                  <filter id="ombre3d" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.35" />
                  </filter>
                  {donneesRepartition.map((d, i) => (
                    <linearGradient id={`grad-${i}`} key={i} x1="0" y1="0" x2="0" y2="1">
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
                  filter="url(#ombre3d)"
                  label={({ name, value }) => (value > 0 ? `${name}: ${value}` : '')}
                  labelLine={false}
                >
                  {donneesRepartition.map((d, i) => (
                    <Cell key={i} fill={`url(#grad-${i})`} stroke="#16241a" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#16241a', border: '1px solid #c9a24b', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card chart-card">
            <h3>Performance par agent</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={donneesParAgent} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                <defs>
                  <linearGradient id="gradReussi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COULEUR_MENTHE} stopOpacity={1} />
                    <stop offset="100%" stopColor={COULEUR_MENTHE} stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id="gradEchec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COULEUR_ROUGE} stopOpacity={1} />
                    <stop offset="100%" stopColor={COULEUR_ROUGE} stopOpacity={0.4} />
                  </linearGradient>
                  <filter id="ombreBarre" x="-20%" y="-20%" width="140%" height="140%">
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
                <Bar dataKey="Réussis" fill="url(#gradReussi)" filter="url(#ombreBarre)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Échecs" fill="url(#gradEchec)" filter="url(#ombreBarre)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card chart-card">
            <h3>Tendance des 14 derniers jours</h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={tendance14Jours} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradAireReussi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COULEUR_MENTHE} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={COULEUR_MENTHE} stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gradAireEchec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COULEUR_ROUGE} stopOpacity={0.7} />
                    <stop offset="95%" stopColor={COULEUR_ROUGE} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#3a4f2f" />
                <XAxis dataKey="label" tick={{ fill: '#cdd6c4', fontSize: 10 }} />
                <YAxis tick={{ fill: '#cdd6c4', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#16241a', border: '1px solid #c9a24b', borderRadius: 8 }} />
                <Area type="monotone" dataKey="reussis" name="Réussis" stroke={COULEUR_MENTHE} fill="url(#gradAireReussi)" strokeWidth={2} />
                <Area type="monotone" dataKey="echecs" name="Échecs" stroke={COULEUR_ROUGE} fill="url(#gradAireEchec)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3>🏆 Top agents du mois</h3>
            {topAgents.length === 0 && <p className="hint">Aucune réussite enregistrée ce mois-ci.</p>}
            {topAgents.map((a, idx) => (
              <div key={a.uid} className="classement-row">
                <span className="classement-rang">{idx + 1}</span>
                <span className="classement-nom">{a.nom}</span>
                <span className="classement-score">{a.count} réussites</span>
              </div>
            ))}
          </div>

          <div className="card">
            <h3>⏰ Meilleurs horaires d'appel</h3>
            {meilleuresHeures.length === 0 && <p className="hint">Pas encore assez de données.</p>}
            {meilleuresHeures.map((h) => (
              <div key={h.heure} className="heure-row">
                <span className="heure-taux">{h.taux}%</span>
                <div className="heure-barre-fond">
                  <div className="heure-barre" style={{ width: `${h.taux}%` }} />
                </div>
                <span className="heure-label">{h.heure}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <h3>Détail complet de l'équipe</h3>
            {donneesParAgent.map((a) => (
              <div key={a.nomComplet} className="contact-row-mini observer-agent-row">
                <span>{a.nomComplet}</span>
                <span className="badge-traite">{a.Réussis} réussis</span>
                <span className="badge-echec">{a.Échecs} échecs</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default ObserverDashboard
