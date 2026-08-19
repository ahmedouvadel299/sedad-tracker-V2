import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// خادم Vercel/Netlify سيبني المشروع تلقائياً بالأمر: npm run build
export default defineConfig({
  plugins: [react()],
})
