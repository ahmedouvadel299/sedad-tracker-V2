import jwt from 'jsonwebtoken'

// يتحقق من صحة الـ JWT ويرفق بيانات المستخدم (id, role, teamId) على الطلب
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'مطلوب تسجيل الدخول' })
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'جلسة غير صالحة أو منتهية' })
  }
}

// يقيّد المسار على أدوار محددة فقط — يُستخدم بعد requireAuth دائماً
// مثال: requireRole(['admin', 'assistant'])
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'لا تملك صلاحية لهذا الإجراء' })
    }
    next()
  }
}

// حاجز صريح إضافي: يمنع أي طلب كتابة إن كان الدور "observer"،
// حتى لو نُسي تطبيق requireRole على مسار معيّن بالخطأ لاحقاً
export function blockObserverWrites(req, res, next) {
  const isWriteMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)
  if (isWriteMethod && req.user?.role === 'observer') {
    return res.status(403).json({ error: 'دور المراقب: قراءة فقط' })
  }
  next()
}
