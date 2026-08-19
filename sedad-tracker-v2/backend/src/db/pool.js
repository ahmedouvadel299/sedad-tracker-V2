import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

// مصدر الحقيقة الوحيد لكل الاتصالات بقاعدة البيانات
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})
