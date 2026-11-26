-- 小蜗 · 比奇堡租房  MySQL 8 / MariaDB 建表脚本
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(32)  NOT NULL PRIMARY KEY,
  char_id       VARCHAR(32)  NOT NULL,
  name          VARCHAR(64)  NOT NULL,
  phone         VARCHAR(32)  DEFAULT '',
  email         VARCHAR(128) DEFAULT '',
  credit        INT          DEFAULT 90,
  member        VARCHAR(32)  DEFAULT '珊瑚会员',
  joined_at     VARCHAR(16)  DEFAULT '',
  verified      TINYINT      DEFAULT 0,
  avatar        VARCHAR(32)  DEFAULT '',
  password_hash VARCHAR(128) DEFAULT '',
  created_at    VARCHAR(32)  DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 登录会话：只存 token 的 sha256，库被看到也拿不到可用的 token */
CREATE TABLE IF NOT EXISTS sessions (
  token_hash VARCHAR(64) NOT NULL PRIMARY KEY,
  user_id    VARCHAR(32) NOT NULL,
  created_at VARCHAR(19) DEFAULT '',
  expires_at VARCHAR(19) DEFAULT '',
  INDEX idx_session_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS houses (
  id             VARCHAR(32)   NOT NULL PRIMARY KEY,
  title          VARCHAR(160)  NOT NULL,
  type           VARCHAR(32)   NOT NULL,
  trade          VARCHAR(8)    NOT NULL DEFAULT 'rent',
  svg            VARCHAR(32)   NOT NULL,
  district       VARCHAR(32)   NOT NULL,
  address        VARCHAR(160)  NOT NULL,
  price          DECIMAL(10,2) NOT NULL DEFAULT 0,
  deposit        DECIMAL(10,2) NOT NULL DEFAULT 0,
  area           INT           DEFAULT 0,
  rooms          INT           DEFAULT 1,
  halls          INT           DEFAULT 0,
  baths          INT           DEFAULT 1,
  floor          INT           DEFAULT 1,
  total_floor    INT           DEFAULT 1,
  orientation    VARCHAR(32)   DEFAULT '',
  fit            VARCHAR(16)   DEFAULT '精装',
  tags           TEXT,
  facilities     TEXT,
  owner_id       VARCHAR(32)   NOT NULL,
  status         VARCHAR(16)   DEFAULT 'available',
  available_from VARCHAR(16)   DEFAULT '',
  min_lease      INT           DEFAULT 12,
  views          INT           DEFAULT 0,
  rating         DECIMAL(3,1)  DEFAULT 5.0,
  review_count   INT           DEFAULT 0,
  featured       TINYINT       DEFAULT 0,
  map_x          INT           DEFAULT 50,
  map_y          INT           DEFAULT 50,
  description    TEXT,
  created_at     VARCHAR(32)   DEFAULT '',
  INDEX idx_house_district (district),
  INDEX idx_house_owner (owner_id),
  INDEX idx_house_status (status),
  INDEX idx_house_trade (trade, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS leases (
  id          VARCHAR(32)   NOT NULL PRIMARY KEY,
  house_id    VARCHAR(32)   NOT NULL,
  owner_id    VARCHAR(32)   NOT NULL,
  tenant_id   VARCHAR(32)   NOT NULL,
  start_date  VARCHAR(16)   NOT NULL,
  end_date    VARCHAR(16)   NOT NULL,
  rent        DECIMAL(10,2) NOT NULL DEFAULT 0,
  deposit     DECIMAL(10,2) NOT NULL DEFAULT 0,
  pay_cycle   VARCHAR(16)   DEFAULT '月付',
  status      VARCHAR(16)   DEFAULT 'pending',
  signed_at   VARCHAR(16)   DEFAULT '',
  terms       TEXT,
  note        TEXT,
  INDEX idx_lease_house (house_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bills (
  id        VARCHAR(32)   NOT NULL PRIMARY KEY,
  lease_id  VARCHAR(32)   DEFAULT '',
  house_id  VARCHAR(32)   DEFAULT '',
  user_id   VARCHAR(32)   DEFAULT '',
  type      VARCHAR(16)   NOT NULL,
  amount    DECIMAL(10,2) NOT NULL DEFAULT 0,
  due_date  VARCHAR(16)   DEFAULT '',
  status    VARCHAR(16)   DEFAULT 'unpaid',
  period    VARCHAR(32)   DEFAULT '',
  paid_at   VARCHAR(16)   DEFAULT '',
  method    VARCHAR(32)   DEFAULT '',
  INDEX idx_bill_status (status),
  INDEX idx_bill_house (house_id),
  INDEX idx_bill_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bookings (
  id         VARCHAR(32) NOT NULL PRIMARY KEY,
  house_id   VARCHAR(32) NOT NULL,
  visit_date VARCHAR(16) NOT NULL,
  visit_time VARCHAR(8)  NOT NULL,
  agent_id   VARCHAR(32) NOT NULL,
  user_id    VARCHAR(32) DEFAULT '',
  status     VARCHAR(16) DEFAULT 'pending',
  note       TEXT,
  created_at VARCHAR(16) DEFAULT '',
  INDEX idx_booking_house (house_id),
  INDEX idx_booking_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS messages (
  id         VARCHAR(32) NOT NULL PRIMARY KEY,
  type       VARCHAR(16) NOT NULL,
  from_id    VARCHAR(32) DEFAULT 'system',
  user_id    VARCHAR(32) DEFAULT '',
  title      VARCHAR(160) NOT NULL,
  body       TEXT,
  time_label VARCHAR(32) DEFAULT '',
  read_flag  TINYINT     DEFAULT 0,
  created_at VARCHAR(32) DEFAULT '',
  INDEX idx_msg_user (user_id, read_flag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS friends (
  id          VARCHAR(32) NOT NULL PRIMARY KEY,
  char_id     VARCHAR(32) NOT NULL,
  district    VARCHAR(32) DEFAULT '',
  relation    VARCHAR(16) DEFAULT '好友',
  status      VARCHAR(16) DEFAULT 'offline',
  last_active VARCHAR(32) DEFAULT '',
  note        TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reviews (
  id        VARCHAR(32) NOT NULL PRIMARY KEY,
  house_id  VARCHAR(32) NOT NULL,
  author_id VARCHAR(32) NOT NULL,
  rating    INT         DEFAULT 5,
  content   TEXT,
  tags      TEXT,
  review_date VARCHAR(16) DEFAULT '',
  INDEX idx_review_house (house_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS feeds (
  id         VARCHAR(32) NOT NULL PRIMARY KEY,
  char_id    VARCHAR(32) NOT NULL,
  text       TEXT,
  time_label VARCHAR(32) DEFAULT '',
  likes      INT         DEFAULT 0,
  comments   INT         DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS favorites (
  user_id  VARCHAR(32) NOT NULL,
  house_id VARCHAR(32) NOT NULL,
  PRIMARY KEY (user_id, house_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS decor_state (
  user_id VARCHAR(32) NOT NULL PRIMARY KEY,
  theme   INT         DEFAULT 0,
  placed  TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ---------- 邻里社区 ---------- */
CREATE TABLE IF NOT EXISTS community_posts (
  id            VARCHAR(32)  NOT NULL PRIMARY KEY,
  district      VARCHAR(32)  NOT NULL,
  author_id     VARCHAR(32)  NOT NULL,
  title         VARCHAR(120) NOT NULL,
  content       TEXT,
  tags          TEXT,
  like_count    INT          DEFAULT 0,
  comment_count INT          DEFAULT 0,
  hot_score     INT          DEFAULT 0,
  status        VARCHAR(16)  DEFAULT 'normal',
  created_at    VARCHAR(20)  DEFAULT '',
  INDEX idx_post_district (district),
  INDEX idx_post_author (author_id),
  INDEX idx_post_hot (hot_score),
  INDEX idx_post_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS post_comments (
  id         VARCHAR(32) NOT NULL PRIMARY KEY,
  post_id    VARCHAR(32) NOT NULL,
  author_id  VARCHAR(32) NOT NULL,
  content    TEXT,
  created_at VARCHAR(20) DEFAULT '',
  INDEX idx_comment_post (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS post_likes (
  post_id    VARCHAR(32) NOT NULL,
  user_id    VARCHAR(32) NOT NULL,
  created_at VARCHAR(20) DEFAULT '',
  PRIMARY KEY (post_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ---------- 二手房买卖 ---------- */
CREATE TABLE IF NOT EXISTS sale_intents (
  id         VARCHAR(32)   NOT NULL PRIMARY KEY,
  house_id   VARCHAR(32)   NOT NULL,
  buyer_id   VARCHAR(32)   NOT NULL,
  seller_id  VARCHAR(32)   NOT NULL,
  price      DECIMAL(10,2) NOT NULL DEFAULT 0,
  message    TEXT,
  status     VARCHAR(16)   DEFAULT 'pending',
  created_at VARCHAR(19)   DEFAULT '',
  INDEX idx_intent_house (house_id),
  INDEX idx_intent_buyer (buyer_id),
  INDEX idx_intent_seller (seller_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
