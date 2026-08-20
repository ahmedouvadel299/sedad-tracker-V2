import { useEffect, useState } from 'react'
import { ref, onValue } from 'firebase/database'
import { db } from '../firebase.js'

export function useServerTimeOffset() {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const offsetRef = ref(db, '.info/serverTimeOffset')
    const unsub = onValue(offsetRef, (snap) => {
      setOffset(snap.val() || 0)
    })
    return () => unsub()
  }, [])

  return offset
}
