import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { pool } from '../db/pool.js'

const router = Router()

// تسجيل الدخول: الاسم + رمز PIN من 4 أرقام
router.post('/login', async (req, res) => {
  const { name, pin } = req.body

  if (!name || !pin) {
    return res.status(400).json({ error: 'الاسم ورمز PIN مطلوبان' })
  }

  try {
    const result = await pool.query(
      'SELECT id, name, pin_hash, role, team_id FROM users WHERE name = $1 AND status = $2',
      [name, 'active']
    )
    const user = result.rows[0]

    if (!user) {
      return res.status(401).json({ error: 'الاسم أو الرمز غير صحيح' })
    }

    const pinMatches = await bcrypt.compare(pin, user.pin_hash)
    if (!pinMatches) {
      return res.status(401).json({ error: 'الاسم أو الرمز غير صحيح' })
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role, teamId: user.team_id },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    )

    res.json({ token, user: { id: user.id, name: user.name, role: user.role, teamId: user.team_id } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'خطأ في الخادم' })
  }
})

export default router
