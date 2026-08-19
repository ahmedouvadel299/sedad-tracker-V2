-- سجل السداد — مخطط قاعدة البيانات (PostgreSQL)
-- يُنفَّذ هذا الملف مرة واحدة عبر لوحة تحكم SQL في Supabase/Railway (بدون سطر أوامر)

CREATE TYPE user_role AS ENUM ('admin', 'assistant', 'agent', 'observer');
CREATE TYPE user_status AS ENUM ('active', 'inactive');
CREATE TYPE contact_status AS ENUM ('pending', 'success', 'failed');
CREATE TYPE batch_status AS ENUM ('active', 'archived');

CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE -- "غير مفعّل" / "غير نشط"
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  role user_role NOT NULL,
  team_id INTEGER REFERENCES teams(id),
  status user_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE list_batches (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  team_id INTEGER REFERENCES teams(id),
  imported_by INTEGER REFERENCES users(id),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status batch_status NOT NULL DEFAULT 'active'
);

CREATE TABLE contacts (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER REFERENCES list_batches(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  assigned_agent_id INTEGER REFERENCES users(id),
  status contact_status NOT NULL DEFAULT 'pending',
  failure_reason TEXT,
  retry_after TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- فهرس أساسي: كل عامل يجلب فقط عناصره — هذا هو أساس خفض الاستهلاك 95%
CREATE INDEX idx_contacts_agent ON contacts(assigned_agent_id);

CREATE TABLE call_sessions (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER REFERENCES contacts(id),
  agent_id INTEGER REFERENCES users(id) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(), -- وقت الخادم دائماً، لا وقت الجهاز
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  result contact_status,
  is_flagged_abnormal BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_call_sessions_agent ON call_sessions(agent_id);

CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- بيانات ابتدائية للفريقين الحاليين
INSERT INTO teams (name) VALUES ('غير مفعّل'), ('غير نشط');
