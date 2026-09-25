-- GustoPlay API: схема базы D1 (Cloudflare)
-- Применение: npx wrangler d1 execute gustoplay --file=worker/schema.sql --remote

-- Пользователи. password_hash/password_salt пустые для Google-аккаунтов.
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  name            TEXT DEFAULT '',
  provider        TEXT NOT NULL DEFAULT 'email',   -- email | google
  provider_id     TEXT,                            -- sub из Google
  password_hash   TEXT,                            -- PBKDF2-SHA256, base64url
  password_salt   TEXT,
  iterations      INTEGER DEFAULT 210000,
  email_verified  INTEGER DEFAULT 0,
  created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Сессии: в базе только SHA-256 хеш токена, утёкшая база не даёт войти.
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  device      TEXT DEFAULT '',
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_hash ON sessions(token_hash);

-- Профиль вкуса (JSON-строка): ответы квиза, отметки игр, впечатления.
CREATE TABLE IF NOT EXISTS profiles (
  user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  profile     TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

-- Одноразовые токены сброса пароля: в базе только хеш, живут 60 минут.
CREATE TABLE IF NOT EXISTS reset_tokens (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  used        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_reset_user ON reset_tokens(user_id);

-- Rate limit: скользящее окно по ключу (IP или e-mail).
CREATE TABLE IF NOT EXISTS rate_limits (
  key         TEXT PRIMARY KEY,
  count       INTEGER NOT NULL DEFAULT 0,
  expires_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_expires ON rate_limits(expires_at);
