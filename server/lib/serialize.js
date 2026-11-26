/**
 * 表结构 => 前端对象 的序列化映射
 * 数据库用 snake_case，接口用 camelCase（少量别名保持与前端字段一致）
 */

export const TABLES = {
  users: ['id', 'char_id', 'avatar', 'name', 'phone', 'email', 'credit', 'member', 'joined_at', 'verified', 'password_hash', 'created_at'],
  houses: [
    'id', 'title', 'type', 'trade', 'svg', 'district', 'address', 'price', 'deposit', 'area', 'rooms', 'halls', 'baths',
    'floor', 'total_floor', 'orientation', 'fit', 'tags', 'facilities', 'owner_id', 'status', 'available_from',
    'min_lease', 'views', 'rating', 'review_count', 'featured', 'map_x', 'map_y', 'description', 'created_at'
  ],
  leases: ['id', 'house_id', 'owner_id', 'tenant_id', 'start_date', 'end_date', 'rent', 'deposit', 'pay_cycle', 'status', 'signed_at', 'terms', 'note'],
  bills: ['id', 'lease_id', 'house_id', 'user_id', 'type', 'amount', 'due_date', 'status', 'period', 'paid_at', 'method'],
  bookings: ['id', 'house_id', 'user_id', 'visit_date', 'visit_time', 'agent_id', 'status', 'note', 'created_at'],
  messages: ['id', 'type', 'from_id', 'user_id', 'title', 'body', 'time_label', 'read_flag', 'created_at'],
  friends: ['id', 'char_id', 'district', 'relation', 'status', 'last_active', 'note'],
  reviews: ['id', 'house_id', 'author_id', 'rating', 'content', 'tags', 'review_date'],
  feeds: ['id', 'char_id', 'text', 'time_label', 'likes', 'comments'],
  favorites: ['user_id', 'house_id'],
  decor_state: ['user_id', 'theme', 'placed'],
  community_posts: [
    'id', 'district', 'author_id', 'title', 'content', 'tags',
    'like_count', 'comment_count', 'hot_score', 'status', 'created_at'
  ],
  post_comments: ['id', 'post_id', 'author_id', 'content', 'created_at'],
  post_likes: ['post_id', 'user_id', 'created_at'],
  sale_intents: ['id', 'house_id', 'buyer_id', 'seller_id', 'price', 'message', 'status', 'created_at'],
  auctions: [
    'id', 'house_id', 'seller_id', 'title', 'start_price', 'step', 'deposit',
    'current_price', 'current_bidder', 'bid_count', 'extend_count', 'status',
    'start_at', 'end_at', 'result_price', 'winner_id', 'created_at'
  ],
  bids: ['id', 'auction_id', 'bidder_id', 'price', 'extend_flag', 'created_at'],
  sessions: ['token_hash', 'user_id', 'created_at', 'expires_at']
}

/** 列名 → 接口字段（只列无法用驼峰直接推导的） */
export const ALIAS = {
  map_x: 'x',
  map_y: 'y',
  description: 'desc',
  read_flag: 'read',
  review_date: 'date',
  visit_date: 'date',
  visit_time: 'time',
  time_label: 'time',
  due_date: 'due',
  start_date: 'start',
  end_date: 'end'
}

export const JSON_COLS = {
  houses: ['tags', 'facilities'],
  leases: ['terms'],
  reviews: ['tags'],
  decor_state: ['placed'],
  community_posts: ['tags']
}

const camel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
const snake = (s) => s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())

export const fieldOf = (col) => ALIAS[col] || camel(col)
const colOf = (field) => {
  const hit = Object.keys(ALIAS).find((c) => ALIAS[c] === field)
  return hit || snake(field)
}

function parseJson(table, col, v) {
  if (!JSON_COLS[table] || !JSON_COLS[table].includes(col)) return v
  if (v == null) return []
  if (typeof v !== 'string') return v
  try { return JSON.parse(v) } catch (e) { return [] }
}

/** 数据库行 → 接口对象 */
export function rowToObj(table, row) {
  if (!row) return null
  const out = {}
  for (const [col, val] of Object.entries(row)) {
    out[fieldOf(col)] = parseJson(table, col, val)
  }
  return out
}

export const rowsToObjs = (table, rows) => rows.map((r) => rowToObj(table, r))

/** 接口对象 → 数据库行（只取表里存在的列） */
export function objToRow(table, obj) {
  const row = {}
  for (const col of TABLES[table]) {
    const field = fieldOf(col)
    if (obj[field] === undefined) continue
    let v = obj[field]
    if (JSON_COLS[table] && JSON_COLS[table].includes(col)) v = JSON.stringify(v ?? [])
    else if (typeof v === 'boolean') v = v ? 1 : 0
    row[col] = v
  }
  return row
}

export function buildInsert(table, obj) {
  const row = objToRow(table, obj)
  const cols = Object.keys(row)
  return {
    sql: `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
    params: cols.map((c) => row[c])
  }
}

export function buildUpdate(table, obj, whereCol, whereVal) {
  const row = objToRow(table, obj)
  const cols = Object.keys(row).filter((c) => c !== whereCol)
  if (!cols.length) return null
  return {
    sql: `UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE ${whereCol} = ?`,
    params: [...cols.map((c) => row[c]), whereVal]
  }
}

export const genId = (prefix) =>
  prefix + Date.now().toString(36).toUpperCase().slice(-5) + Math.random().toString(36).slice(2, 4).toUpperCase()

/** 客户端可以自带 id（前端乐观更新用），只要格式合法 */
export const isClientId = (id) => /^[A-Za-z0-9_-]{4,32}$/.test(String(id || ''))

export const today = () => new Date().toISOString().slice(0, 10)
