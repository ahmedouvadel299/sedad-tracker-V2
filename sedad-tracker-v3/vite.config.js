import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: اسم المستودع على GitHub Pages (يُنشر على github.io/اسم-المستودع/)
export default defineConfig({
  plugins: [react()],
  base: '/sedad-tracker-v3/',
})
