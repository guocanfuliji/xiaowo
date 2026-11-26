-- 小蜗 · 比奇堡租房  SQLite 建表脚本（兜底方案，零安装）
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  char_id       TEXT NOT NULL,
  name          TEXT NOT NULL,
  phone         TEXT DEFAULT '',
  email         TEXT DEFAULT '',
  credit        INTEGER DEFAULT 90,
  member        TEXT DEFAULT '珊瑚会员',
  joined_at     TEXT DEFAULT '',
  verified      INTEGER DEFAULT 0,
  avatar        TEXT DEFAULT '',
  password_hash TEXT DEFAULT '',
  created_at    TEXT DEFAULT ''
);

/* 登录会话：只存 token 的 sha256，库被看到也拿不到可用的 token */
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  created_at TEXT DEFAULT '',
  expires_at TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_session_user ON sessions (user_id);

CREATE TABLE IF NOT EXISTS houses (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  type           TEXT NOT NULL,
  trade          TEXT NOT NULL DEFAULT 'rent',
  svg            TEXT NOT NULL,
  district       TEXT NOT NULL,
  address        TEXT NOT NULL,
  price          REAL NOT NULL DEFAULT 0,
  deposit        REAL NOT NULL DEFAULT 0,
  area           INTEGER DEFAULT 0,
  rooms          INTEGER DEFAULT 1,
  halls          INTEGER DEFAULT 0,
  baths          INTEGER DEFAULT 1,
  floor          INTEGER DEFAULT 1,
  total_floor    INTEGER DEFAULT 1,
  orientation    TEXT DEFAULT '',
  fit            TEXT DEFAULT '精装',
  tags           TEXT,
  facilities     TEXT,
  owner_id       TEXT NOT NULL,
  status         TEXT DEFAULT 'available',
  available_from TEXT DEFAULT '',
  min_lease      INTEGER DEFAULT 12,
  views          INTEGER DEFAULT 0,
  rating         REAL DEFAULT 5.0,
  review_count   INTEGER DEFAULT 0,
  featured       INTEGER DEFAULT 0,
  map_x          INTEGER DEFAULT 50,
  map_y          INTEGER DEFAULT 50,
  description    TEXT,
  created_at     TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_house_district ON houses (district);
CREATE INDEX IF NOT EXISTS idx_house_owner ON houses (owner_id);
CREATE INDEX IF NOT EXISTS idx_house_status ON houses (status);
CREATE INDEX IF NOT EXISTS idx_house_trade ON houses (trade, status);

CREATE TABLE IF NOT EXISTS leases (
  id         TEXT PRIMARY KEY,
  house_id   TEXT NOT NULL,
  owner_id   TEXT NOT NULL,
  tenant_id  TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date   TEXT NOT NULL,
  rent       REAL NOT NULL DEFAULT 0,
  deposit    REAL NOT NULL DEFAULT 0,
  pay_cycle  TEXT DEFAULT '月付',
  status     TEXT DEFAULT 'pending',
  signed_at  TEXT DEFAULT '',
  terms      TEXT,
  note       TEXT
);

CREATE TABLE IF NOT EXISTS bills (
  id       TEXT PRIMARY KEY,
  lease_id TEXT DEFAULT '',
  house_id TEXT DEFAULT '',
  user_id  TEXT DEFAULT '',
  type     TEXT NOT NULL,
  amount   REAL NOT NULL DEFAULT 0,
  due_date TEXT DEFAULT '',
  status   TEXT DEFAULT 'unpaid',
  period   TEXT DEFAULT '',
  paid_at  TEXT DEFAULT '',
  method   TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_bill_house ON bills (house_id);
CREATE INDEX IF NOT EXISTS idx_bill_user ON bills (user_id);

CREATE TABLE IF NOT EXISTS bookings (
  id         TEXT PRIMARY KEY,
  house_id   TEXT NOT NULL,
  visit_date TEXT NOT NULL,
  visit_time TEXT NOT NULL,
  agent_id   TEXT NOT NULL,
  user_id    TEXT DEFAULT '',
  status     TEXT DEFAULT 'pending',
  note       TEXT,
  created_at TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS messages (
  id         TEXT PRIMARY KEY,
  type       TEXT NOT NULL,
  from_id    TEXT DEFAULT 'system',
  user_id    TEXT DEFAULT '',
  title      TEXT NOT NULL,
  body       TEXT,
  time_label TEXT DEFAULT '',
  read_flag  INTEGER DEFAULT 0,
  created_at TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_booking_house ON bookings (house_id);
CREATE INDEX IF NOT EXISTS idx_booking_user ON bookings (user_id);

CREATE INDEX IF NOT EXISTS idx_msg_user ON messages (user_id, read_flag);

CREATE TABLE IF NOT EXISTS friends (
  id          TEXT PRIMARY KEY,
  char_id     TEXT NOT NULL,
  district    TEXT DEFAULT '',
  relation    TEXT DEFAULT '好友',
  status      TEXT DEFAULT 'offline',
  last_active TEXT DEFAULT '',
  note        TEXT
);

CREATE TABLE IF NOT EXISTS reviews (
  id          TEXT PRIMARY KEY,
  house_id    TEXT NOT NULL,
  author_id   TEXT NOT NULL,
  rating      INTEGER DEFAULT 5,
  content     TEXT,
  tags        TEXT,
  review_date TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS feeds (
  id         TEXT PRIMARY KEY,
  char_id    TEXT NOT NULL,
  text       TEXT,
  time_label TEXT DEFAULT '',
  likes      INTEGER DEFAULT 0,
  comments   INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id  TEXT NOT NULL,
  house_id TEXT NOT NULL,
  PRIMARY KEY (user_id, house_id)
);

CREATE TABLE IF NOT EXISTS decor_state (
  user_id TEXT PRIMARY KEY,
  theme   INTEGER DEFAULT 0,
  placed  TEXT
);

/* ---------- 邻里社区 ---------- */
CREATE TABLE IF NOT EXISTS community_posts (
  id            TEXT PRIMARY KEY,
  district      TEXT NOT NULL,
  author_id     TEXT NOT NULL,
  title         TEXT NOT NULL,
  content       TEXT,
  tags          TEXT,
  like_count    INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  hot_score     INTEGER DEFAULT 0,
  status        TEXT DEFAULT 'normal',
  created_at    TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_post_district ON community_posts (district);
CREATE INDEX IF NOT EXISTS idx_post_author ON community_posts (author_id);
CREATE INDEX IF NOT EXISTS idx_post_hot ON community_posts (hot_score);
CREATE INDEX IF NOT EXISTS idx_post_created ON community_posts (created_at);

CREATE TABLE IF NOT EXISTS post_comments (
  id         TEXT PRIMARY KEY,
  post_id    TEXT NOT NULL,
  author_id  TEXT NOT NULL,
  content    TEXT,
  created_at TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_comment_post ON post_comments (post_id);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id    TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  created_at TEXT DEFAULT '',
  PRIMARY KEY (post_id, user_id)
);

/* ---------- 二手房买卖 ---------- */
CREATE TABLE IF NOT EXISTS sale_intents (
  id         TEXT PRIMARY KEY,
  house_id   TEXT NOT NULL,
  buyer_id   TEXT NOT NULL,
  seller_id  TEXT NOT NULL,
  price      REAL NOT NULL DEFAULT 0,
  message    TEXT,
  status     TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_intent_house ON sale_intents (house_id);
CREATE INDEX IF NOT EXISTS idx_intent_buyer ON sale_intents (buyer_id);
CREATE INDEX IF NOT EXISTS idx_intent_seller ON sale_intents (seller_id);
