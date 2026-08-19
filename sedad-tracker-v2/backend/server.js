import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import healthRouter from './src/routes/health.js'
import authRouter from './src/routes/auth.js'
import { blockObserverWrites } from './src/middleware/auth.js'

dotenv.config()

const app = express()

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }))
app.use(express.json())

// حاجز عام: يمنع أي طلب كتابة من دور "المراقب" على مستوى كل التطبيق
app.use(blockObserverWrites)

app.use('/api', healthRouter)
app.use('/api/auth', authRouter)

// المسارات القادمة في المراحل التالية: /api/contacts, /api/calls, /api/reports, /api/team ...

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`السيرفر يعمل على المنفذ ${PORT}`)
})
