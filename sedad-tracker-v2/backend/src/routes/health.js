import { Router } from 'express'

const router = Router()

// نقطة فحص بسيطة تستخدمها الواجهة للتأكد أن الخادم يعمل
router.get('/health', (req, res) => {
  res.json({ message: 'الخادم متصل بنجاح', time: new Date().toISOString() })
})

export default router
