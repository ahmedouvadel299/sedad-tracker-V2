import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { LOGO_DATA_URL } from './logo.jsx'

const BANQUE = 'Banque Mauritanienne pour l\'Investissement'

const TYPES_RAPPORT = [
  { valeur: 'mensuel', label: "Résumé de l'équipe (mensuel)" },
  { valeur: 'journalier', label: 'Rapport journalier' },
  { valeur: 'hebdomadaire', label: 'Rapport hebdomadaire' },
  { valeur: 'periode', label: 'Période personnalisée' },
  { valeur: 'individuel', label: 'Rapport individuel' },
  { valeur: 'echecs', label: 'Appels échoués uniquement' },
  { valeur: 'succes', label: 'Appels acceptés uniquement' },
]

function debutJour(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function finJour(date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

function formatDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDureeSec(sec) {
  if (!sec) return '0s'
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  const s = sec % 60
  return `${min}min ${s}s`
}

function RapportsPanel({ toutesLesListes, agents, settings = {} }) {
  const nomSignature = settings.nomSignature || 'Sellem brahim'
  const titreSignature = settings.titreSignature || 'Responsable de centre — contact'
  const nomDirecteur = settings.nomDirecteur || ''
  const [type, setType] = useState('mensuel')
  const [dateJournaliere, setDateJournaliere] = useState(new Date().toISOString().slice(0, 10))
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().slice(0, 10))
  const [dateFin, setDateFin] = useState(new Date().toISOString().slice(0, 10))
  const [agentChoisi, setAgentChoisi] = useState('')

  const tousLesContacts = useMemo(() => {
    const liste = []
    Object.entries(toutesLesListes).forEach(([agentUid, contacts]) => {
      Object.entries(contacts || {}).forEach(([id, c]) =>
        liste.push({ id, ...c, agentUid, agentNom: agents[agentUid] || agentUid }),
      )
    })
    return liste
  }, [toutesLesListes, agents])

  const { contactsFiltres, periodeLabel } = useMemo(() => {
    let debut = null
    let fin = null
    let label = ''

    if (type === 'mensuel') {
      const now = new Date()
      debut = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
      fin = finJour(now)
      label = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    } else if (type === 'journalier') {
      debut = debutJour(dateJournaliere)
      fin = finJour(dateJournaliere)
      label = new Date(dateJournaliere).toLocaleDateString('fr-FR')
    } else if (type === 'hebdomadaire') {
      const now = new Date()
      const jour = now.getDay()
      const lundi = new Date(now)
      lundi.setDate(now.getDate() - ((jour + 6) % 7))
      debut = debutJour(lundi)
      fin = finJour(now)
      label = `Semaine du ${lundi.toLocaleDateString('fr-FR')}`
    } else if (type === 'periode' || type === 'individuel' || type === 'echecs' || type === 'succes') {
      debut = debutJour(dateDebut)
      fin = finJour(dateFin)
      label = `${new Date(dateDebut).toLocaleDateString('fr-FR')} — ${new Date(dateFin).toLocaleDateString('fr-FR')}`
    }

    let filtres = tousLesContacts.filter((c) => {
      if (!c.dateTraite) return false
      if (debut && c.dateTraite < debut) return false
      if (fin && c.dateTraite > fin) return false
      return true
    })

    if (type === 'individuel' && agentChoisi) {
      filtres = filtres.filter((c) => c.agentUid === agentChoisi)
    }
    if (type === 'echecs') {
      filtres = filtres.filter((c) => c.statut === 'echec')
    }
    if (type === 'succes') {
      filtres = filtres.filter((c) => c.statut === 'traite')
    }

    return { contactsFiltres: filtres, periodeLabel: label }
  }, [type, dateJournaliere, dateDebut, dateFin, agentChoisi, tousLesContacts])

  const parAgent = useMemo(() => {
    const map = {}
    contactsFiltres.forEach((c) => {
      if (!map[c.agentUid]) {
        map[c.agentUid] = { nom: c.agentNom, tempsTotalSec: 0, totalTraite: 0, reussis: 0, echecs: 0 }
      }
      map[c.agentUid].tempsTotalSec += c.dureeAppelSec || 0
      map[c.agentUid].totalTraite += 1
      if (c.statut === 'traite') map[c.agentUid].reussis += 1
      if (c.statut === 'echec') map[c.agentUid].echecs += 1
    })
    return Object.values(map).sort((a, b) => b.totalTraite - a.totalTraite)
  }, [contactsFiltres])

  const parRaison = useMemo(() => {
    const map = {}
    contactsFiltres.forEach((c) => {
      if (!c.raison) return
      map[c.raison] = (map[c.raison] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [contactsFiltres])

  const totalReussis = contactsFiltres.filter((c) => c.statut === 'traite').length
  const totalEchecs = contactsFiltres.filter((c) => c.statut === 'echec').length

  function enTeteDocument(doc) {
    try {
      doc.addImage(LOGO_DATA_URL, 'PNG', 14, 8, 18, 18)
    } catch (e) {
      // le rapport continue sans logo en cas d'erreur
    }
    const decalageX = 36
    doc.setFontSize(16)
    doc.setFont(undefined, 'bold')
    doc.text('Registre SEDAD', decalageX, 16)
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.text(BANQUE, decalageX, 23)
    doc.setFontSize(11)
    doc.text(TYPES_RAPPORT.find((t) => t.valeur === type)?.label || '', 14, 34)
    doc.setFontSize(9)
    doc.text(`Période : ${periodeLabel}`, 14, 40)
    doc.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, 14, 45)
  }

  function piedDocument(doc) {
    const pageHeight = doc.internal.pageSize.height
    const pageWidth = doc.internal.pageSize.width
    doc.setFontSize(9)

    doc.text('Signature :', 14, pageHeight - 25)
    doc.text(nomSignature, 14, pageHeight - 19)
    doc.text(titreSignature, 14, pageHeight - 14)

    doc.text('Signature :', pageWidth - 80, pageHeight - 25)
    doc.text(nomDirecteur || '________________', pageWidth - 80, pageHeight - 19)
    doc.text('Directeur SEDAD', pageWidth - 80, pageHeight - 14)
  }

  function exporterPDF() {
    const doc = new jsPDF()
    enTeteDocument(doc)

    autoTable(doc, {
      startY: 50,
      head: [['Réussis', 'Échecs', 'Total traité']],
      body: [[totalReussis, totalEchecs, contactsFiltres.length]],
      theme: 'grid',
    })

    let yApres = doc.lastAutoTable.finalY + 8

    if (parAgent.length > 0) {
      doc.setFontSize(11)
      doc.text('Détail par agent', 14, yApres)
      autoTable(doc, {
        startY: yApres + 4,
        head: [['Agent', "Temps d'appel", 'Total traité', 'Réussis', 'Échecs']],
        body: parAgent.map((a) => [a.nom, formatDureeSec(a.tempsTotalSec), a.totalTraite, a.reussis, a.echecs]),
        theme: 'striped',
      })
      yApres = doc.lastAutoTable.finalY + 8
    }

    if (parRaison.length > 0) {
      doc.setFontSize(11)
      doc.text('Répartition par raison', 14, yApres)
      autoTable(doc, {
        startY: yApres + 4,
        head: [['Raison', 'Nombre']],
        body: parRaison.map(([r, n]) => [r, n]),
        theme: 'striped',
      })
      yApres = doc.lastAutoTable.finalY + 8
    }

    if (type === 'individuel' || type === 'echecs' || type === 'succes') {
      doc.setFontSize(11)
      doc.text('Détail des appels', 14, yApres)
      autoTable(doc, {
        startY: yApres + 4,
        head: [['Client', 'Téléphone', 'Statut', 'Raison', 'Heure', 'Durée']],
        body: contactsFiltres.map((c) => [
          c.nom || '',
          c.telephone || '',
          c.statut === 'traite' ? 'Réussi' : 'Échec',
          c.raison || '',
          formatDate(c.dateTraite),
          formatDureeSec(c.dureeAppelSec),
        ]),
        theme: 'striped',
        styles: { fontSize: 8 },
      })
    }

    piedDocument(doc)
    doc.save(`rapport-sedad-${type}-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  function exporterExcel() {
    const wb = XLSX.utils.book_new()

    const feuilleResume = [
      ['Registre SEDAD'],
      [BANQUE],
      [TYPES_RAPPORT.find((t) => t.valeur === type)?.label || ''],
      [`Période : ${periodeLabel}`],
      [`Généré le ${new Date().toLocaleString('fr-FR')}`],
      [],
      ['Réussis', 'Échecs', 'Total traité'],
      [totalReussis, totalEchecs, contactsFiltres.length],
    ]
    const wsResume = XLSX.utils.aoa_to_sheet(feuilleResume)
    XLSX.utils.book_append_sheet(wb, wsResume, 'Résumé')

    if (parAgent.length > 0) {
      const feuilleAgents = [
        ['Agent', "Temps d'appel", 'Total traité', 'Réussis', 'Échecs'],
        ...parAgent.map((a) => [a.nom, formatDureeSec(a.tempsTotalSec), a.totalTraite, a.reussis, a.echecs]),
      ]
      const wsAgents = XLSX.utils.aoa_to_sheet(feuilleAgents)
      XLSX.utils.book_append_sheet(wb, wsAgents, 'Par agent')
    }

    const feuilleDetail = [
      ['Agent', 'Client', 'Téléphone', 'Statut', 'Raison', 'Date et heure', 'Durée (sec)'],
      ...contactsFiltres.map((c) => [
        c.agentNom,
        c.nom || '',
        c.telephone || '',
        c.statut === 'traite' ? 'Réussi' : 'Échec',
        c.raison || '',
        formatDate(c.dateTraite),
        c.dureeAppelSec || 0,
      ]),
    ]
    const wsDetail = XLSX.utils.aoa_to_sheet(feuilleDetail)
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Détail des appels')

    XLSX.writeFile(wb, `rapport-sedad-${type}-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="card">
      <label className="select-label">
        Type de rapport
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES_RAPPORT.map((t) => (
            <option key={t.valeur} value={t.valeur}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      {type === 'journalier' && (
        <label className="select-label">
          Choisir le jour
          <input type="date" value={dateJournaliere} onChange={(e) => setDateJournaliere(e.target.value)} />
        </label>
      )}

      {(type === 'periode' || type === 'individuel' || type === 'echecs' || type === 'succes') && (
        <>
          <label className="select-label">
            Date début
            <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
          </label>
          <label className="select-label">
            Date fin
            <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
          </label>
        </>
      )}

      {type === 'individuel' && (
        <label className="select-label">
          Agent
          <select value={agentChoisi} onChange={(e) => setAgentChoisi(e.target.value)}>
            <option value="">-- Choisir --</option>
            {Object.entries(agents).map(([uid, nom]) => (
              <option key={uid} value={uid}>
                {nom}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="stats-grid" style={{ margin: '16px 0' }}>
        <div className="stat-box">
          <div className="stat-chiffre">{totalReussis}</div>
          <div className="stat-label">Réussites</div>
        </div>
        <div className="stat-box">
          <div className="stat-chiffre">{totalEchecs}</div>
          <div className="stat-label">Échecs</div>
        </div>
      </div>

      {parAgent.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3>Détail par agent</h3>
          {parAgent.map((a) => (
            <div key={a.nom} className="contact-row-mini">
              <span>{a.nom}</span>
              <span>{formatDureeSec(a.tempsTotalSec)}</span>
              <span>{a.totalTraite} traités</span>
            </div>
          ))}
        </div>
      )}

      <div className="rapport-boutons">
        <button className="btn-primaire" onClick={exporterPDF}>
          Exporter en PDF
        </button>
        <button className="btn-primaire btn-secondaire" onClick={exporterExcel}>
          Exporter en Excel
        </button>
      </div>
    </div>
  )
}

export default RapportsPanel
