import { useEffect, useState } from 'react'

// عنوان الـ backend يُقرأ من متغير بيئة (يُضبط لاحقاً في لوحة Vercel/Netlify)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function App() {
  const [status, setStatus] = useState('جارٍ التحقق من الاتصال بالخادم...')

  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then((res) => res.json())
      .then((data) => setStatus(`✅ الخادم يعمل — ${data.message}`))
      .catch(() => setStatus('⚠️ لم يتم الاتصال بالخادم بعد (تأكد أن الـ backend يعمل وأن VITE_API_URL مضبوط)'))
  }, [])

  return (
    <div className="app-shell">
      <h1>سجل السداد</h1>
      <p className="subtitle">النسخة الجديدة — قيد البناء</p>
      <div className="status-card">{status}</div>
    </div>
  )
}
