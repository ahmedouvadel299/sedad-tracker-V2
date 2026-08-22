import { useEffect, useState } from 'react'
import { ref, onValue, update } from 'firebase/database'
import { db } from '../firebase.js'

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

const DEFAUT = {
  objectifJournalier: 125,
  objectifMensuel: 2500,
  seuilDureeAnormaleMin: 15,
  nomSignature: 'Sellem brahim',
  titreSignature: 'Responsable de centre — contact',
  delaiRappelJours: 14,
}

function Parametres() {
  const [parametres, setParametres] = useState(DEFAUT)
  const [objectifsParAgent, setObjectifsParAgent] = useState({})
  const [statut, setStatut] = useState('')
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    const settingsRef = ref(db, 'settings')
    const unsub = onValue(settingsRef, (snap) => {
      const val = snap.val() || {}
      setParametres({ ...DEFAUT, ...val })
      setObjectifsParAgent(val.objectifsParAgent || {})
      setChargement(false)
    })
    return () => unsub()
  }, [])

  function majChamp(champ, valeur) {
    setParametres((p) => ({ ...p, [champ]: valeur }))
  }

  function majObjectifAgent(uid, valeur) {
    setObjectifsParAgent((o) => ({ ...o, [uid]: valeur }))
  }

  async function enregistrer() {
    setStatut('Enregistrement...')
    await update(ref(db, 'settings'), {
      objectifJournalier: Number(parametres.objectifJournalier) || DEFAUT.objectifJournalier,
      objectifMensuel: Number(parametres.objectifMensuel) || DEFAUT.objectifMensuel,
      seuilDureeAnormaleMin: Number(parametres.seuilDureeAnormaleMin) || DEFAUT.seuilDureeAnormaleMin,
      nomSignature: parametres.nomSignature || DEFAUT.nomSignature,
      titreSignature: parametres.titreSignature || DEFAUT.titreSignature,
      delaiRappelJours: Number(parametres.delaiRappelJours) || DEFAUT.delaiRappelJours,
      objectifsParAgent,
    })
    setStatut('Paramètres enregistrés avec succès.')
    setTimeout(() => setStatut(''), 3000)
  }

  if (chargement) return <div className="card"><p className="hint">Chargement…</p></div>

  return (
    <div className="parametres-wrapper">
      <div className="card">
        <h3>Objectifs généraux</h3>

        <label className="select-label">
          Objectif journalier par agent (nombre d'appels)
          <input
            type="number"
            value={parametres.objectifJournalier}
            onChange={(e) => majChamp('objectifJournalier', e.target.value)}
          />
        </label>
        <p className="hint">
          Basé sur les appels effectivement passés (réussis + échoués), pas sur les contacts en attente.
        </p>

        <label className="select-label">
          Objectif mensuel par agent
          <input
            type="number"
            value={parametres.objectifMensuel}
            onChange={(e) => majChamp('objectifMensuel', e.target.value)}
          />
        </label>

        <label className="select-label">
          Seuil de durée d'appel anormale (minutes)
          <input
            type="number"
            value={parametres.seuilDureeAnormaleMin}
            onChange={(e) => majChamp('seuilDureeAnormaleMin', e.target.value)}
          />
        </label>

        <label className="select-label">
          Délai avant nouvelle tentative — Injoignable / En cours (jours)
          <input
            type="number"
            value={parametres.delaiRappelJours}
            onChange={(e) => majChamp('delaiRappelJours', e.target.value)}
          />
        </label>
      </div>

      <div className="card">
        <h3>Objectifs individuels (optionnel)</h3>
        <p className="hint">Laisser vide pour utiliser l'objectif journalier général.</p>
        {Object.entries(AGENTS).map(([uid, nom]) => (
          <label key={uid} className="select-label parametres-agent-ligne">
            {nom}
            <input
              type="number"
              placeholder={String(parametres.objectifJournalier)}
              value={objectifsParAgent[uid] || ''}
              onChange={(e) => majObjectifAgent(uid, e.target.value)}
            />
          </label>
        ))}
      </div>

      <div className="card">
        <h3>Signature des rapports</h3>

        <label className="select-label">
          Nom du responsable
          <input
            type="text"
            value={parametres.nomSignature}
            onChange={(e) => majChamp('nomSignature', e.target.value)}
          />
        </label>

        <label className="select-label">
          Titre / fonction
          <input
            type="text"
            value={parametres.titreSignature}
            onChange={(e) => majChamp('titreSignature', e.target.value)}
          />
        </label>
      </div>

      <button className="btn-primaire" onClick={enregistrer}>
        Enregistrer les paramètres
      </button>
      {statut && <p className="statut-import">{statut}</p>}
    </div>
  )
}

export default Parametres
