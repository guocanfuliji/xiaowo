/**
 * 小蜗 · 比奇堡租房 —— 种子数据
 * 所有业务实体的初始数据，首次进入时写入 localStorage，之后以本地存储为准。
 */

/**
 * 动画角色（身份：昵称 / 职业 / 配色）
 *
 * 注意：这里只管「身份」，不管「脸」——头像在下面的 AVATARS 里，一个角色可以有多张。
 * 所以换头像不会改昵称，换身份才会改昵称。
 */
export const CHARS = [
  { id: 'spongebob', name: '海绵宝宝', svg: 'ch-spongebob', role: '蟹堡王厨师', color: '#F7C948' },
  { id: 'patrick', name: '派大星', svg: 'ch-patrick', role: '石头屋住户', color: '#FF9EB5' },
  { id: 'squidward', name: '章鱼哥', svg: 'ch-squidward', role: '蟹堡王收银员', color: '#5ED3D6' },
  { id: 'sandy', name: '珊迪', svg: 'ch-sandy', role: '海底科学家', color: '#C77DD8' },
  { id: 'krabs', name: '蟹老板', svg: 'ch-krabs', role: '资深房东', color: '#E2603A' },
  { id: 'gary', name: '小蜗', svg: 'ch-gary', role: '平台吉祥物', color: '#7FD8FF' },
  { id: 'plankton', name: '痞老板', svg: 'ch-plankton', role: '海之霸老板', color: '#2F9BE0' }
]

/**
 * 头像库（public/avatars 下的手绘图，已压到长边 240px）
 *
 * charId 为空的（fish-*）是路人脸：只能当头像用，不会变成房东/邻居/帖子作者。
 * 同名角色按「全身 → 特写」排，选头像时两张挨在一起。
 */
export const AVATARS = [
  { id: 'spongebob-1', charId: 'spongebob', img: '/avatars/spongebob.jpg', label: '海绵宝宝 · 全身' },
  { id: 'spongebob-2', charId: 'spongebob', img: '/avatars/spongebob-2.jpg', label: '海绵宝宝 · 特写' },
  { id: 'patrick-1', charId: 'patrick', img: '/avatars/patrick.jpg', label: '派大星 · 全身' },
  { id: 'patrick-2', charId: 'patrick', img: '/avatars/patrick-2.jpg', label: '派大星 · 特写' },
  { id: 'squidward-1', charId: 'squidward', img: '/avatars/squidward.jpg', label: '章鱼哥 · 全身' },
  { id: 'squidward-2', charId: 'squidward', img: '/avatars/squidward-2.jpg', label: '章鱼哥 · 特写' },
  { id: 'sandy-1', charId: 'sandy', img: '/avatars/sandy.jpg', label: '珊迪 · 全身' },
  { id: 'sandy-2', charId: 'sandy', img: '/avatars/sandy-2.jpg', label: '珊迪 · 特写' },
  { id: 'krabs-1', charId: 'krabs', img: '/avatars/krabs.jpg', label: '蟹老板 · 全身' },
  { id: 'krabs-2', charId: 'krabs', img: '/avatars/krabs-2.jpg', label: '蟹老板 · 特写' },
  { id: 'gary-1', charId: 'gary', img: '/avatars/gary.jpg', label: '小蜗' },
  { id: 'plankton-1', charId: 'plankton', img: '/avatars/plankton.jpg', label: '痞老板' },
  { id: 'fish-1', charId: '', img: '/avatars/fish-1.jpg', label: '咸鱼 · 橙' },
  { id: 'fish-2', charId: '', img: '/avatars/fish-2.jpg', label: '咸鱼 · 绿' }
]

export const charOf = (id) => CHARS.find((c) => c.id === id) || CHARS[0]

/** 按 id 取头像 */
export const avatarById = (id) => AVATARS.find((a) => a.id === id) || null

/** 某角色的默认头像（列表里的第一张）：别人发的帖子、房东、邻居都用它 */
export const avatarOfChar = (charId) => AVATARS.find((a) => a.charId && a.charId === charId) || null

/**
 * 解析出该渲染哪张脸：优先用户自己选的，选不到（老数据 / 空值 / 已下架）就退回角色默认。
 * 返回值可能为 null —— 此时调用方回落到 svg 图标。
 */
export const resolveAvatar = (avatarId, charId) => avatarById(avatarId) || avatarOfChar(charId) || null

/** 房屋外观（对应 SVG symbol h-*） */
export const HOUSE_TYPES = [
  { id: 'pineapple', name: '菠萝屋', svg: 'h-pineapple', img: '/houses/pineapple.jpg' },
  { id: 'rock', name: '岩石屋', svg: 'h-rock', img: '/houses/rock.jpg' },
  { id: 'moai', name: '石像屋', svg: 'h-moai', img: '/houses/moai.jpg' },
  { id: 'dome', name: '圆顶树屋', svg: 'h-dome', img: '/houses/dome.jpg' },
  { id: 'anchor', name: '船锚屋', svg: 'h-anchor', img: '/houses/anchor.jpg' }
]

/** 房型配图（原画截图），没配图时组件回落 <symbol> 插画 */
export const typeImg = (typeId) => (HOUSE_TYPES.find((t) => t.id === typeId) || {}).img || ''

/** 比奇堡街区（用于筛选与地图分区） */
export const DISTRICTS = [
  { id: 'center', name: '比奇堡市中心', x: 50, y: 44, lng: 118.0825, lat: 24.448 },
  { id: 'rock', name: '岩石区', x: 24, y: 62, lng: 118.065, lat: 24.462 },
  { id: 'jelly', name: '水母田', x: 74, y: 26, lng: 118.105, lat: 24.47 },
  { id: 'kelp', name: '海带森林', x: 78, y: 66, lng: 118.098, lat: 24.435 },
  { id: 'sand', name: '沙地平原', x: 34, y: 22, lng: 118.062, lat: 24.432 },
  { id: 'ship', name: '沉船区', x: 16, y: 26, lng: 118.045, lat: 24.47 }
]

/**
 * 房源的实际坐标（GCJ-02，高德直接可用）。
 * 比奇堡是虚构的，这里把它落到真实海岸线上：街区坐标 + 房源在街区内的相对偏移，
 * 这样每套房在地图上都会有一个不重叠的点，同时保持"同街区聚在一起"的空间关系。
 */
export const housePos = (h) => {
  if (!h) return null
  const d = DISTRICTS.find((x) => x.id === h.district) || DISTRICTS[0]
  const dx = (((h.x ?? 50) - 50) / 50) * 0.0055
  const dy = (((h.y ?? 50) - 50) / 50) * 0.0045
  return { lng: +(d.lng + dx).toFixed(6), lat: +(d.lat - dy).toFixed(6) }
}

/**
 * 同一街区里可能挤着五六套房，光靠 x/y 的相对偏移在地图上会叠成一坨。
 * 这里额外按「同街区房源序号」铺一个 3×4 的网格槽位，保证气泡互不遮挡；
 * 只在视觉层面拉开，不改变房源归属的街区。
 */
const SLOT = [
  [0, 0], [1, 0], [-1, 0],
  [0, 1], [1, 1], [-1, 1],
  [0, -1], [1, -1], [-1, -1],
  [2, 0], [-2, 0], [2, 1]
]

export const placeHouses = (list = []) => {
  const groups = {}
  list.forEach((h) => {
    const k = h.district || 'center'
    ;(groups[k] || (groups[k] = [])).push(h)
  })
  Object.values(groups).forEach((g) => g.sort((a, b) => String(a.id).localeCompare(String(b.id))))
  return list.map((h) => {
    const base = housePos(h)
    const g = groups[h.district || 'center']
    const slot = SLOT[g.indexOf(h) % SLOT.length]
    return {
      ...h,
      lng: +(base.lng + slot[0] * 0.0088).toFixed(6),
      lat: +(base.lat + slot[1] * 0.0061).toFixed(6)
    }
  })
}

export const FACILITIES = [
  '海景阳台', '水母灯', '气泡WiFi', '贝壳浴缸', '开放式厨房',
  '阳光天窗', '储物海沟', '停车位', '宠物友好', '24h温泉', '家具齐全', '近蟹堡王'
]

export const TAGS = ['可短租', '押一付一', '免中介费', '新上架', '房东直租', '随时看房', '精装', '近地铁']

/** 房源 */
export const HOUSES = [
  {
    id: 'H1001', title: '比奇堡市中心 · 精装菠萝屋', type: 'pineapple', svg: 'h-pineapple',
    district: 'center', address: '比奇堡 珊瑚街 124 号', price: 2600, deposit: 2600,
    area: 78, rooms: 2, halls: 1, baths: 1, floor: 2, totalFloor: 3, orientation: '朝南海景',
    fit: '精装', tags: ['房东直租', '随时看房', '精装'], facilities: ['海景阳台', '气泡WiFi', '贝壳浴缸', '家具齐全', '宠物友好'],
    ownerId: 'spongebob', status: 'available', availableFrom: '2026-11-01', minLease: 12,
    views: 1284, rating: 4.9, reviewCount: 36, featured: true, x: 50, y: 43,
    desc: '正宗比奇堡菠萝屋，屋顶叶片朝向正南，通风极佳。客厅挑高 3.2 米，配水母造型吊灯；主卧带海景阳台，清晨能看到水母群迁徙。步行 5 分钟到蟹堡王，楼下是珊迪的橡树屋气阀站。'
  },
  {
    id: 'H1002', title: '岩石区 · 原生态岩石屋', type: 'rock', svg: 'h-rock',
    district: 'rock', address: '比奇堡 岩石大道 8 号', price: 1200, deposit: 1200,
    area: 46, rooms: 1, halls: 1, baths: 1, floor: 1, totalFloor: 1, orientation: '安静内街',
    fit: '简装', tags: ['押一付一', '免中介费', '可短租'], facilities: ['气泡WiFi', '停车位', '宠物友好'],
    ownerId: 'patrick', status: 'available', availableFrom: '2026-10-28', minLease: 3,
    views: 856, rating: 4.4, reviewCount: 21, featured: false, x: 25, y: 61,
    desc: '派大星自住的岩石屋，冬暖夏凉，隔音效果一流（邻居完全听不见你唱歌）。屋顶可躺看流星，附带一块私人沙地。适合独居、预算有限的租客。'
  },
  {
    id: 'H1003', title: '沙地平原 · 石像屋（复式）', type: 'moai', svg: 'h-moai',
    district: 'sand', address: '比奇堡 沙地环路 33 号', price: 3400, deposit: 6800,
    area: 112, rooms: 3, halls: 2, baths: 2, floor: 3, totalFloor: 3, orientation: '全明户型',
    fit: '豪装', tags: ['新上架', '精装', '房东直租'], facilities: ['海景阳台', '阳光天窗', '24h温泉', '储物海沟', '家具齐全', '气泡WiFi'],
    ownerId: 'squidward', status: 'available', availableFrom: '2026-11-15', minLease: 24,
    views: 2140, rating: 4.8, reviewCount: 44, featured: true, x: 33, y: 23,
    desc: '章鱼哥的复式石像屋，艺术感拉满。一层客厅挑高带天窗，二层三间卧室均朝南。屋内有章鱼哥亲手绘制的壁画（不喜欢可协商取下）。含 24 小时海底温泉入户。'
  },
  {
    id: 'H1004', title: '水母田 · 圆顶树屋（含氧气罩）', type: 'dome', svg: 'h-dome',
    district: 'jelly', address: '比奇堡 水母田 7 号树', price: 2900, deposit: 2900,
    area: 86, rooms: 2, halls: 1, baths: 1, floor: 4, totalFloor: 5, orientation: '正对水母田',
    fit: '精装', tags: ['随时看房', '精装'], facilities: ['海景阳台', '阳光天窗', '气泡WiFi', '家具齐全', '近蟹堡王'],
    ownerId: 'sandy', status: 'available', availableFrom: '2026-11-05', minLease: 12,
    views: 1673, rating: 4.7, reviewCount: 29, featured: true, x: 73, y: 27,
    desc: '珊迪设计的加压圆顶屋，无需额外氧气罩即可长期居住。落地窗正对水母田，夜晚水母荧光照进客厅。附赠珊迪自制坚果能量补给包（每月一份）。'
  },
  {
    id: 'H1005', title: '沉船区 · 船锚主题小屋', type: 'anchor', svg: 'h-anchor',
    district: 'ship', address: '比奇堡 沉船湾 21 号', price: 980, deposit: 980,
    area: 38, rooms: 1, halls: 1, baths: 1, floor: 1, totalFloor: 2, orientation: '朝东',
    fit: '简装', tags: ['押一付一', '新上架'], facilities: ['停车位', '气泡WiFi'],
    ownerId: 'plankton', status: 'available', availableFrom: '2026-10-30', minLease: 6,
    views: 512, rating: 4.1, reviewCount: 12, featured: false, x: 17, y: 27,
    desc: '沉船改造的主题小屋，船锚结构稳固，抗洋流一级。面积不大但层高舒服，适合刚工作的年轻人。房东痞老板承诺：不收取任何隐形费用（他发誓）。'
  },
  {
    id: 'H1006', title: '海带森林 · 圆顶树屋（独栋）', type: 'dome', svg: 'h-dome',
    district: 'kelp', address: '比奇堡 海带森林 55 号', price: 4200, deposit: 8400,
    area: 135, rooms: 4, halls: 2, baths: 2, floor: 1, totalFloor: 2, orientation: '南北通透',
    fit: '豪装', tags: ['房东直租', '精装', '可短租'], facilities: ['海景阳台', '贝壳浴缸', '开放式厨房', '储物海沟', '24h温泉', '家具齐全', '宠物友好'],
    ownerId: 'krabs', status: 'available', availableFrom: '2026-12-01', minLease: 12,
    views: 3021, rating: 4.9, reviewCount: 58, featured: true, x: 77, y: 65,
    desc: '蟹老板的独栋圆顶树屋，玻璃穹顶，天然恒温。四室两厅，带私家海带花园和 24 小时温泉。蟹老板亲自验房，签约送一个月蟹黄堡券。'
  },
  {
    id: 'H1007', title: '市中心 · 精装菠萝屋（小户型）', type: 'pineapple', svg: 'h-pineapple',
    district: 'center', address: '比奇堡 珊瑚街 88 号', price: 1800, deposit: 1800,
    area: 52, rooms: 1, halls: 1, baths: 1, floor: 1, totalFloor: 3, orientation: '朝南',
    fit: '精装', tags: ['免中介费', '随时看房'], facilities: ['气泡WiFi', '家具齐全', '近蟹堡王'],
    ownerId: 'spongebob', status: 'rented', availableFrom: '2026-12-20', minLease: 12,
    views: 964, rating: 4.6, reviewCount: 18, featured: false, x: 55, y: 50,
    desc: '同一街区的另一套菠萝屋，一室一厅，适合单身或情侣。家具家电全齐，拎包入住。目前租约至 2026 年 12 月，可提前预约看房排号。'
  },
  {
    id: 'H1008', title: '岩石区 · 岩石屋（带院子）', type: 'rock', svg: 'h-rock',
    district: 'rock', address: '比奇堡 岩石大道 15 号', price: 1550, deposit: 1550,
    area: 58, rooms: 2, halls: 1, baths: 1, floor: 1, totalFloor: 1, orientation: '带院子',
    fit: '简装', tags: ['可短租', '押一付一'], facilities: ['停车位', '宠物友好', '气泡WiFi'],
    ownerId: 'patrick', status: 'available', availableFrom: '2026-11-10', minLease: 6,
    views: 733, rating: 4.3, reviewCount: 15, featured: false, x: 21, y: 68,
    desc: '带 40 平米私人沙地院子，可种海带、晒太阳、开派对。两室一厅，主卧朝南。派大星说：邻居很安静，因为方圆两百米只有他自己。'
  },
  {
    id: 'H1009', title: '水母田 · 圆顶树屋（顶层）', type: 'dome', svg: 'h-dome',
    district: 'jelly', address: '比奇堡 水母田 12 号树顶', price: 3600, deposit: 7200,
    area: 98, rooms: 3, halls: 1, baths: 2, floor: 5, totalFloor: 5, orientation: '270° 观景',
    fit: '豪装', tags: ['新上架', '精装', '房东直租'], facilities: ['海景阳台', '阳光天窗', '24h温泉', '家具齐全', '气泡WiFi'],
    ownerId: 'sandy', status: 'available', availableFrom: '2026-11-20', minLease: 12,
    views: 1882, rating: 4.8, reviewCount: 33, featured: true, x: 80, y: 22,
    desc: '顶层圆顶屋，270° 无遮挡观景，水母田全景尽收眼底。夜间有专属观星平台。三室两卫，主卧带独立浴缸。珊迪提供科学级空气净化系统。'
  },
  {
    id: 'H1010', title: '市中心 · 石像屋（标准层）', type: 'moai', svg: 'h-moai',
    district: 'center', address: '比奇堡 珊瑚街 200 号', price: 2200, deposit: 2200,
    area: 68, rooms: 2, halls: 1, baths: 1, floor: 2, totalFloor: 4, orientation: '朝东',
    fit: '精装', tags: ['随时看房', '免中介费'], facilities: ['气泡WiFi', '家具齐全', '近蟹堡王', '停车位'],
    ownerId: 'squidward', status: 'pending', availableFrom: '2026-11-08', minLease: 12,
    views: 1105, rating: 4.5, reviewCount: 24, featured: false, x: 46, y: 38,
    desc: '市中心稀缺石像屋，通勤便利，步行 3 分钟到气泡巴士站。装修是章鱼哥风格：极简、冷色、安静。介意艺术气息浓厚的租客请谨慎。'
  },
  {
    id: 'H1011', title: '沙地平原 · 岩石屋（两居）', type: 'rock', svg: 'h-rock',
    district: 'sand', address: '比奇堡 沙地环路 6 号', price: 2400, deposit: 4800,
    area: 82, rooms: 2, halls: 2, baths: 1, floor: 2, totalFloor: 2, orientation: '南北通透',
    fit: '精装', tags: ['房东直租', '精装'], facilities: ['贝壳浴缸', '阳光天窗', '家具齐全', '宠物友好', '气泡WiFi'],
    ownerId: 'krabs', status: 'available', availableFrom: '2026-11-12', minLease: 12,
    views: 1420, rating: 4.6, reviewCount: 27, featured: false, x: 38, y: 18,
    desc: '蟹老板第二套贝壳屋，两室两厅，分区合理。贝壳浴缸是天然珍珠母材质，泡澡体验一流。蟹老板提供季度免费检修服务。'
  },
  {
    id: 'H1012', title: '沉船区 · 船锚屋（LOFT）', type: 'anchor', svg: 'h-anchor',
    district: 'ship', address: '比奇堡 沉船湾 5 号', price: 1350, deposit: 1350,
    area: 62, rooms: 1, halls: 1, baths: 1, floor: 2, totalFloor: 2, orientation: 'LOFT 挑高',
    fit: '简装', tags: ['可短租', '新上架', '押一付一'], facilities: ['开放式厨房', '气泡WiFi', '停车位'],
    ownerId: 'plankton', status: 'available', availableFrom: '2026-11-02', minLease: 3,
    views: 604, rating: 4.2, reviewCount: 9, featured: false, x: 13, y: 33,
    desc: 'LOFT 结构，一层起居室 + 开放式厨房，二层卧室。挑高 4.5 米，空间感十足。沉船区正在改造，未来规划有海底商业街。'
  },
  {
    id: 'H1013', title: '海带森林 · 小蜗的玻璃树屋', type: 'dome', svg: 'h-dome',
    district: 'kelp', address: '比奇堡 海带森林 9 号', price: 2100, deposit: 2100,
    area: 64, rooms: 2, halls: 1, baths: 1, floor: 1, totalFloor: 1, orientation: '朝南海景',
    fit: '精装', tags: ['房东直租', '随时看房'], facilities: ['贝壳浴缸', '气泡WiFi', '家具齐全', '宠物友好'],
    ownerId: 'gary', status: 'available', availableFrom: '2026-11-01', minLease: 12,
    views: 486, rating: 4.8, reviewCount: 7, featured: false, x: 82, y: 58,
    desc: '我自己的贝壳小屋，就在海带森林边上，出门左转是一片会发光的水母田。两室一厅，贝壳浴缸是天然珍珠母材质，泡进去像被海水抱住。希望你也是爱安静的人。'
  },
  {
    id: 'H1014', title: '水母田 · 我的观景菠萝屋', type: 'pineapple', svg: 'h-pineapple',
    district: 'jelly', address: '比奇堡 水母田 3 号', price: 2800, deposit: 5600,
    area: 88, rooms: 2, halls: 2, baths: 1, floor: 3, totalFloor: 3, orientation: '270° 观景',
    fit: '精装', tags: ['精装', '房东直租', '免中介费'], facilities: ['海景阳台', '阳光天窗', '水母灯', '气泡WiFi', '家具齐全'],
    ownerId: 'gary', status: 'rented', availableFrom: '2026-12-15', minLease: 12,
    views: 1524, rating: 4.9, reviewCount: 12, featured: true, x: 70, y: 33,
    desc: '另一套我自己打理的小菠萝屋，三层带观景阳台，晚上能看到整片水母田的荧光。目前租给一位安静的租客，合约到 12 月中，可提前预约排号。'
  }
]

/** 租约 */
export const LEASES = [
  {
    id: 'L2001', houseId: 'H1001', ownerId: 'spongebob', tenantId: 'gary',
    start: '2026-03-01', end: '2027-02-28', rent: 2600, deposit: 2600,
    payCycle: '月付', status: 'active', signedAt: '2026-02-20',
    terms: [
      '租金每月 5 日前支付，逾期按日 0.5% 计违约金',
      '押金在退租验收无损后 7 个工作日内退还',
      '不得在屋内养殖食人花等危险生物',
      '允许饲养蜗牛类宠物，无需额外押金',
      '转租需提前 30 天书面告知房东'
    ],
    note: '当前租约履行正常，已连续 8 个月按时交租。'
  },
  {
    id: 'L2002', houseId: 'H1005', ownerId: 'plankton', tenantId: 'gary',
    start: '2024-06-01', end: '2025-05-31', rent: 980, deposit: 980,
    payCycle: '季付', status: 'ended', signedAt: '2024-05-25',
    terms: ['租金按季度支付', '退租需提前 30 天告知', '房屋结构不得改动'],
    note: '已到期退租，押金全额退还。'
  },
  {
    id: 'L2003', houseId: 'H1009', ownerId: 'sandy', tenantId: 'gary',
    start: '2026-12-01', end: '2027-11-30', rent: 3600, deposit: 7200,
    payCycle: '月付', status: 'pending', signedAt: '',
    terms: ['押金为两个月租金', '起租日前完成房屋验收', '含氧气系统月度维护'],
    note: '待双方电子签约后生效。'
  },
  {
    id: 'L2004', houseId: 'H1014', ownerId: 'gary', tenantId: 'patrick',
    start: '2026-06-01', end: '2027-05-31', rent: 2800, deposit: 2800,
    payCycle: '月付', status: 'active', signedAt: '2026-05-26',
    terms: [
      '租金每月 5 日前支付，逾期按日 0.5% 计违约金',
      '水母田区域含月度观景台维护费',
      '押金在退租验收无损后 7 个工作日内退还',
      '允许在观景台摆放贝壳类装饰'
    ],
    note: '作为房东出租中，已连续 6 个月按时收到租金。'
  }
]

/** 账单 */
export const BILLS = [
  { id: 'B3001', leaseId: 'L2001', houseId: 'H1001', type: '房租', amount: 2600, due: '2026-11-05', status: 'unpaid', period: '2026年11月' },
  { id: 'B3002', leaseId: 'L2001', houseId: 'H1001', type: '水电', amount: 186.5, due: '2026-11-05', status: 'unpaid', period: '2026年10月' },
  { id: 'B3003', leaseId: 'L2001', houseId: 'H1001', type: '物业', amount: 120, due: '2026-11-10', status: 'unpaid', period: '2026年11月' },
  { id: 'B3004', leaseId: 'L2001', houseId: 'H1001', type: '房租', amount: 2600, due: '2026-10-05', status: 'paid', period: '2026年10月', paidAt: '2026-10-03', method: '贝壳支付' },
  { id: 'B3005', leaseId: 'L2001', houseId: 'H1001', type: '水电', amount: 214.8, due: '2026-10-05', status: 'paid', period: '2026年09月', paidAt: '2026-10-01', method: '贝壳支付' },
  { id: 'B3006', leaseId: 'L2001', houseId: 'H1001', type: '维修', amount: 380, due: '2026-09-20', status: 'overdue', period: '贝壳浴缸检修' },

  /* 房东侧：痞老板观景菠萝屋（H1014）的收租流水，用于房东看板收入曲线 */
  { id: 'B3007', leaseId: 'L2004', houseId: 'H1014', type: '房租', amount: 2800, due: '2026-06-05', status: 'paid', period: '2026年06月', paidAt: '2026-06-04', method: '贝壳支付' },
  { id: 'B3008', leaseId: 'L2004', houseId: 'H1014', type: '房租', amount: 2800, due: '2026-07-05', status: 'paid', period: '2026年07月', paidAt: '2026-07-03', method: '贝壳支付' },
  { id: 'B3009', leaseId: 'L2004', houseId: 'H1014', type: '水电', amount: 186, due: '2026-07-05', status: 'paid', period: '2026年06月', paidAt: '2026-07-03', method: '贝壳支付' },
  { id: 'B3010', leaseId: 'L2004', houseId: 'H1014', type: '房租', amount: 2800, due: '2026-08-05', status: 'paid', period: '2026年08月', paidAt: '2026-08-04', method: '贝壳支付' },
  { id: 'B3011', leaseId: 'L2004', houseId: 'H1014', type: '水电', amount: 210, due: '2026-08-05', status: 'paid', period: '2026年07月', paidAt: '2026-08-04', method: '贝壳支付' },
  { id: 'B3012', leaseId: 'L2004', houseId: 'H1014', type: '房租', amount: 2800, due: '2026-09-05', status: 'paid', period: '2026年09月', paidAt: '2026-09-03', method: '贝壳支付' },
  { id: 'B3013', leaseId: 'L2004', houseId: 'H1014', type: '水电', amount: 245, due: '2026-09-05', status: 'paid', period: '2026年08月', paidAt: '2026-09-03', method: '贝壳支付' },
  { id: 'B3014', leaseId: 'L2004', houseId: 'H1014', type: '房租', amount: 2800, due: '2026-10-05', status: 'paid', period: '2026年10月', paidAt: '2026-10-04', method: '贝壳支付' },
  { id: 'B3015', leaseId: 'L2004', houseId: 'H1014', type: '水电', amount: 198, due: '2026-10-05', status: 'paid', period: '2026年09月', paidAt: '2026-10-04', method: '贝壳支付' },
  { id: 'B3016', leaseId: 'L2004', houseId: 'H1014', type: '房租', amount: 2800, due: '2026-11-05', status: 'unpaid', period: '2026年11月' },
  { id: 'B3017', leaseId: 'L2004', houseId: 'H1014', type: '水电', amount: 232.6, due: '2026-11-05', status: 'unpaid', period: '2026年10月' }
]

/** 预约看房 */
export const BOOKINGS = [
  { id: 'K4001', houseId: 'H1003', date: '2026-10-26', time: '10:00', agentId: 'squidward', status: 'pending', note: '想重点看天窗和温泉', createdAt: '2026-10-22' },
  { id: 'K4002', houseId: 'H1006', date: '2026-10-27', time: '14:30', agentId: 'krabs', status: 'pending', note: '带家人一起看', createdAt: '2026-10-23' },
  { id: 'K4003', houseId: 'H1002', date: '2026-10-20', time: '16:00', agentId: 'patrick', status: 'done', note: '已看房，考虑中', createdAt: '2026-10-18' },
  { id: 'K4004', houseId: 'H1004', date: '2026-10-24', time: '09:30', agentId: 'sandy', status: 'canceled', note: '临时有事取消', createdAt: '2026-10-21' }
]

/** 消息通知 */
export const MESSAGES = [
  { id: 'M5001', type: 'house', fromId: 'sandy', title: '你关注的房源降价了', body: '水母田 · 圆顶树屋（顶层） 月租由 ¥3800 调整为 ¥3600，快去看看吧。', time: '10 分钟前', read: false },
  { id: 'M5002', type: 'friend', fromId: 'patrick', title: '派大星邀请你做邻居', body: '岩石区新空出一套带院子的岩石屋，要不要一起住？', time: '1 小时前', read: false },
  { id: 'M5003', type: 'pay', fromId: 'system', title: '账单待支付提醒', body: '11 月房租 ¥2600 将于 2026-11-05 到期，请提前安排。', time: '3 小时前', read: false },
  { id: 'M5004', type: 'system', fromId: 'system', title: '你的信用分提升了', body: '按时交租 8 个月，比奇堡居住信用分 +15，当前 92 分。', time: '昨天', read: true },
  { id: 'M5005', type: 'house', fromId: 'krabs', title: '蟹老板回复了你的咨询', body: '贝壳屋可以随时看房，本周六上午我都在。', time: '2 天前', read: true },
  { id: 'M5006', type: 'friend', fromId: 'squidward', title: '章鱼哥给你发了消息', body: '晚上请不要在阳台演奏乐器，谢谢配合。', time: '3 天前', read: true }
]

/** 邻居与好友 */
export const FRIENDS = [
  { id: 'F6001', charId: 'patrick', district: 'rock', relation: '好友', status: 'online', lastActive: '刚刚', note: '邻居兼饭搭子，会分享海带零食' },
  { id: 'F6002', charId: 'squidward', district: 'center', relation: '邻居', status: 'offline', lastActive: '2 小时前', note: '对噪音敏感，晚上请安静' },
  { id: 'F6003', charId: 'sandy', district: 'jelly', relation: '好友', status: 'online', lastActive: '5 分钟前', note: '科学家，能帮你修一切家电' },
  { id: 'F6004', charId: 'krabs', district: 'kelp', relation: '房东', status: 'online', lastActive: '1 分钟前', note: '资深房东，名下 2 套房' },
  { id: 'F6005', charId: 'plankton', district: 'ship', relation: '邻居', status: 'offline', lastActive: '昨天', note: '海之霸老板，总在搞发明' },
  { id: 'F6006', charId: 'spongebob', district: 'center', relation: '好友', status: 'online', lastActive: '刚刚', note: '你的房东，人非常好说话' }
]

/** 评价 */
export const REVIEWS = [
  { id: 'R7001', houseId: 'H1001', authorId: 'gary', rating: 5, date: '2026-09-15', tags: ['房东好说话', '采光超棒', '位置便利'], content: '住了半年多，菠萝屋通风和采光都很好，海绵宝宝解决问题特别快。楼下就是蟹堡王，早饭不用愁。' },
  { id: 'R7002', houseId: 'H1002', authorId: 'squidward', rating: 4, date: '2026-08-02', tags: ['性价比高', '安静'], content: '价格实在，隔音很好。缺点是离市中心有点远，通勤要坐两站气泡巴士。' },
  { id: 'R7003', houseId: 'H1003', authorId: 'sandy', rating: 5, date: '2026-07-21', tags: ['装修精美', '温泉很赞'], content: '章鱼哥的壁画确实有艺术感，天窗晚上能看到月光折射，温泉入户太舒服了。' },
  { id: 'R7004', houseId: 'H1005', authorId: 'patrick', rating: 3, date: '2026-06-11', tags: ['面积偏小', '价格便宜'], content: '房子本身没问题，就是小了点。痞老板收费倒是真的很透明，一分钱没多要。' },
  { id: 'R7005', houseId: 'H1006', authorId: 'spongebob', rating: 5, date: '2026-05-30', tags: ['空间大', '适合家庭'], content: '四室的贝壳屋，一家四口住完全够。蟹老板人虽然抠门但房子质量没话说。' }
]

/** 装修家具目录 */
export const FURNITURE = [
  { id: 'sofa', name: '珊瑚沙发', icon: '🛋️', price: 1280, w: 2, h: 2, cat: '客厅' },
  { id: 'table', name: '贝壳茶几', icon: '🪑', price: 460, w: 1, h: 1, cat: '客厅' },
  { id: 'lamp', name: '水母落地灯', icon: '💡', price: 320, w: 1, h: 2, cat: '客厅' },
  { id: 'tv', name: '海带电视墙', icon: '📺', price: 2100, w: 2, h: 1, cat: '客厅' },
  { id: 'bed', name: '珍珠大床', icon: '🛏️', price: 2680, w: 2, h: 2, cat: '卧室' },
  { id: 'desk', name: '船木书桌', icon: '🪵', price: 780, w: 2, h: 1, cat: '卧室' },
  { id: 'plant', name: '海带盆栽', icon: '🪴', price: 180, w: 1, h: 1, cat: '装饰' },
  { id: 'rug', name: '沙地地毯', icon: '🟫', price: 260, w: 2, h: 1, cat: '装饰' },
  { id: 'painting', name: '海底挂画', icon: '🖼️', price: 540, w: 1, h: 1, cat: '装饰' },
  { id: 'piano', name: '章鱼哥钢琴', icon: '🎹', price: 5600, w: 2, h: 2, cat: '娱乐' },
  { id: 'fridge', name: '蟹堡冰箱', icon: '🧊', price: 1890, w: 1, h: 2, cat: '厨房' },
  { id: 'bubble', name: '气泡躺椅', icon: '🫧', price: 690, w: 1, h: 1, cat: '娱乐' }
]

/** 装修主题（房间整体风格） */
export const DECOR_THEMES = [
  { id: 0, name: '珊瑚海岸', wall: '#BFF0EC', floor: '#F3D9A4', accent: '#FF7F5C' },
  { id: 1, name: '深海静谧', wall: '#7FA8C9', floor: '#6E8CA8', accent: '#5ED3D6' },
  { id: 2, name: '水母之夜', wall: '#C9B6E4', floor: '#8E7BB8', accent: '#C77DD8' },
  { id: 3, name: '沙地暖阳', wall: '#FFE9BE', floor: '#E8C98A', accent: '#F2B40E' }
]

/** 帮助中心分类条目 */
export const HELPS = [
  { id: 'HP1', cat: '租房流程', q: '如何预约看房？', a: '进入「预约看房」，选择想看的房源与时间段，提交后房东会在 24 小时内确认。也可在房源详情页直接点击「预约看房」。' },
  { id: 'HP2', cat: '租房流程', q: '签约需要准备什么？', a: '需要身份认证、比奇堡居住许可、以及首期租金与押金。电子签约在「我的租约」中完成，双方确认后即时生效。' },
  { id: 'HP3', cat: '费用相关', q: '中介费怎么收？', a: '本平台所有房东直租房源免收中介费。非直租房源由中介机构收取，签约前会明确告知。' },
  { id: 'HP4', cat: '费用相关', q: '押金什么时候退？', a: '退租验收无损后 7 个工作日内原路退回。若产生维修费用会从押金中扣除并提供明细。' },
  { id: 'HP5', cat: '房屋维护', q: '设施坏了找谁修？', a: '在「我的租约」中提交维修申请，房东需在 48 小时内响应。紧急情况（漏水、气泡泄漏）可拨打 24 小时热线。' },
  { id: 'HP6', cat: '账号安全', q: '如何更换绑定手机号？', a: '在「设置 → 账号与安全」中更换，需要原手机号验证码或身份认证。' },
  { id: 'HP7', cat: '社区规则', q: '什么是居住信用分？', a: '信用分基于按时交租、履约记录、评价反馈计算，满分 100。分数越高越容易通过房东审核，也可享受押金减免。' },
  { id: 'HP8', cat: '社区规则', q: '如何举报虚假房源？', a: '在房源详情页点击「举报」，平台会在 3 个工作日内核实。确认虚假将下架房源并对房东扣分。' }
]

/** 邻居动态（社区时间线） */
export const FEEDS = [
  { id: 'FD1', charId: 'krabs', text: '刚上架一套海带森林的独栋贝壳屋，欢迎来看房！', time: '30 分钟前', likes: 12, comments: 3 },
  { id: 'FD2', charId: 'sandy', text: '水母田圆顶屋的空气过滤系统升级完成，PM2.5 直降 40%。', time: '2 小时前', likes: 28, comments: 6 },
  { id: 'FD3', charId: 'patrick', text: '岩石区今晚有流星雨，谁要一起来屋顶看？', time: '5 小时前', likes: 45, comments: 17 },
  { id: 'FD4', charId: 'squidward', text: '市中心新增了气泡巴士夜班线路，通勤更方便了。', time: '昨天', likes: 19, comments: 2 },
  { id: 'FD5', charId: 'spongebob', text: '菠萝屋的屋顶叶片刚做过保养，今年冬天不会再漏雨啦。', time: '2 天前', likes: 33, comments: 8 }
]

/** 邻里社区 · 帖子（按街区聚合） */
export const COMMUNITY_POSTS = [
  {
    id: 'P6001', district: 'jelly', authorId: 'sandy',
    title: '水母田晚上九点的水母群，有人一起去捞果酱吗',
    content: '最近水母活跃期，晚上九点到十一点是高峰。我准备了两个网兜和一只防刺手套，谁想一起？回来可以分果酱，顺便聊聊今年水母田的房价。',
    tags: ['邻里活动', '水母田'],
    likeCount: 12, commentCount: 2, hotScore: 46,
    status: 'normal', createdAt: '2026-11-24'
  },
  {
    id: 'P6002', district: 'center', authorId: 'squidward',
    title: '市中心晚上施工噪音，已经连续三天了',
    content: '贝壳大道那边在铺新的气泡管道，晚上十一点还在响。我在业主群里问过了，说是市政工程，预计还要一周。有同样被吵到的邻居吗？',
    tags: ['噪音', '市政'],
    likeCount: 9, commentCount: 3, hotScore: 42,
    status: 'normal', createdAt: '2026-11-24'
  },
  {
    id: 'P6003', district: 'kelp', authorId: 'krabs',
    title: '海带森林这周新开了家蟹堡分店，前三天半价',
    content: '就在贝壳小屋往东两个路口。我试了他们的蟹堡，说实话比我做的差一点点，但半价确实划算。想吃省钱版的可以去。',
    tags: ['美食', '开业'],
    likeCount: 21, commentCount: 4, hotScore: 83,
    status: 'normal', createdAt: '2026-11-23'
  },
  {
    id: 'P6004', district: 'rock', authorId: 'patrick',
    title: '岩石区的路灯又灭了两盏，晚上遛弯看不清',
    content: '在 3 号路口和 5 号路口之间。已经报修了，说是两天内来换。住附近的晚上出门记得带手电。',
    tags: ['设施报修'],
    likeCount: 6, commentCount: 1, hotScore: 23,
    status: 'normal', createdAt: '2026-11-23'
  },
  {
    id: 'P6005', district: 'sand', authorId: 'spongebob',
    title: '沙地平原周末跳蚤市场，我摆个摊卖二手贝壳灯',
    content: '周六上午十点开始，在沙地广场。我家里攒了七盏贝壳灯，成色都不错，半卖半送。有想一起摆摊的邻居可以在这条下面留言。',
    tags: ['跳蚤市场', '二手'],
    likeCount: 15, commentCount: 2, hotScore: 55,
    status: 'normal', createdAt: '2026-11-22'
  },
  {
    id: 'P6006', district: 'ship', authorId: 'plankton',
    title: '沉船区停车位实在太紧张了，有没有拼车的',
    content: '每天早高峰从沉船区到市中心要四十分钟，车位还找不到。我在海之霸上班，八点出发，车上还有两个位置，可以顺路捎一段。',
    tags: ['出行', '拼车'],
    likeCount: 8, commentCount: 1, hotScore: 29,
    status: 'normal', createdAt: '2026-11-22'
  },
  {
    id: 'P6007', district: 'jelly', authorId: 'gary',
    title: '观景菠萝屋的租客经验分享：水母季要注意什么',
    content: '住了半年，总结几条：一是窗户晚上要关，水母会被屋里的光吸引；二是阳台的贝壳装饰最好固定住，风大的时候会掉；三是水费会涨，做好心理准备。',
    tags: ['租房经验', '水母田'],
    likeCount: 18, commentCount: 2, hotScore: 64,
    status: 'normal', createdAt: '2026-11-21'
  },
  {
    id: 'P6008', district: 'center', authorId: 'gary',
    title: '有没有人一起拼单买水母灯，十盏起批',
    content: '市中心那家灯饰店，十盏以上打七折。我要两盏，还差八盏。有需要的邻居在下面留言，凑够了我统一去买。',
    tags: ['拼单', '家居'],
    likeCount: 5, commentCount: 0, hotScore: 15,
    status: 'normal', createdAt: '2026-11-20'
  }
]

/** 邻里社区 · 评论 */
export const POST_COMMENTS = [
  { id: 'PC7001', postId: 'P6001', authorId: 'spongebob', content: '算我一个！我带上我的网兜，上次捞了满满一桶。', createdAt: '2026-11-24 20:15' },
  { id: 'PC7002', postId: 'P6001', authorId: 'patrick', content: '我也想去，但是我怕被蛰。', createdAt: '2026-11-24 21:02' },
  { id: 'PC7003', postId: 'P6002', authorId: 'krabs', content: '我这边也听到了，半夜还在敲。已经打市政热线投诉了。', createdAt: '2026-11-24 22:40' },
  { id: 'PC7004', postId: 'P6002', authorId: 'sandy', content: '可以录个音作为证据，投诉的时候有用。', createdAt: '2026-11-25 08:10' },
  { id: 'PC7005', postId: 'P6003', authorId: 'spongebob', content: '半价也太香了，中午就去排队！', createdAt: '2026-11-23 11:20' },
  { id: 'PC7006', postId: 'P6007', authorId: 'patrick', content: '水费是真的涨，我上个月多交了八十。', createdAt: '2026-11-21 19:30' }
]

/** 二手房 · 专用标签 */
export const SALE_TAGS = ['满五唯一', '满二低税', '可贷款', '带学位', '近蟹堡王', '有产权证', '精装拎包', '海景房']

/**
 * 二手房源：price 表示总价（不是月租），deposit / minLease 对售房无意义，统一置 0。
 * status：available 在售 / sold 已售 / pending 待上架，与租房共用一套状态词。
 */
export const SALE_HOUSES = [
  {
    id: 'H2001', title: '比奇堡市中心 · 珊瑚街全景公寓', type: 'anchor', trade: 'sale', svg: 'h-anchor',
    district: 'center', address: '比奇堡 珊瑚街 88 号 18F', price: 880000, deposit: 0,
    area: 98, rooms: 3, halls: 2, baths: 2, floor: 18, totalFloor: 26, orientation: '南北通透',
    fit: '精装', tags: ['满五唯一', '可贷款', '近蟹堡王'], facilities: ['海景阳台', '阳光天窗', '气泡WiFi', '停车位', '24h温泉'],
    ownerId: 'krabs', status: 'available', availableFrom: '', minLease: 0,
    views: 3268, rating: 4.9, reviewCount: 12, featured: true, x: 52, y: 38,
    desc: '蟹老板放出来的市中心全景公寓，18 楼，南北通透，客厅正对珊瑚街，晚上能俯瞰整条气泡大道。满五唯一，税费极低，可正常办理按揭。楼下就是气泡巴士总站，步行 6 分钟到蟹堡王。'
  },
  {
    id: 'H2002', title: '海带森林 · 小蜗的玻璃树屋（出售）', type: 'dome', trade: 'sale', svg: 'h-dome',
    district: 'kelp', address: '比奇堡 海带森林 9 号', price: 420000, deposit: 0,
    area: 64, rooms: 2, halls: 1, baths: 1, floor: 1, totalFloor: 1, orientation: '朝南海景',
    fit: '精装', tags: ['满二低税', '有产权证', '精装拎包'], facilities: ['贝壳浴缸', '气泡WiFi', '家具齐全', '宠物友好'],
    ownerId: 'gary', status: 'available', availableFrom: '', minLease: 0,
    views: 764, rating: 4.8, reviewCount: 6, featured: false, x: 82, y: 58,
    desc: '就是我自住那套贝壳小屋，因为要搬去水母田所以出手。独栋、带一小块私人沙地，贝壳浴缸是天然珍珠母材质。产权清晰、满二低税，家具家电全送，拎包即可入住。'
  },
  {
    id: 'H2003', title: '水母田 · 270° 观景菠萝屋', type: 'pineapple', trade: 'sale', svg: 'h-pineapple',
    district: 'jelly', address: '比奇堡 水母田 3 号', price: 1260000, deposit: 0,
    area: 88, rooms: 2, halls: 2, baths: 1, floor: 3, totalFloor: 3, orientation: '270° 观景',
    fit: '精装', tags: ['海景房', '可贷款', '带学位'], facilities: ['海景阳台', '阳光天窗', '水母灯', '气泡WiFi', '家具齐全'],
    ownerId: 'sandy', status: 'available', availableFrom: '', minLease: 0,
    views: 5120, rating: 5.0, reviewCount: 21, featured: true, x: 70, y: 33,
    desc: '珊迪的整套三层观景菠萝屋，顶楼露台能看到整片水母田的荧光。带水母田学区名额，有独立氧气循环系统，科研设备可留下。整栋出售，不接受分拆。'
  },
  {
    id: 'H2004', title: '岩石区 · 独栋岩石屋（已售）', type: 'rock', trade: 'sale', svg: 'h-rock',
    district: 'rock', address: '比奇堡 岩石大道 8 号', price: 360000, deposit: 0,
    area: 46, rooms: 1, halls: 1, baths: 1, floor: 1, totalFloor: 1, orientation: '安静内街',
    fit: '简装', tags: ['满五唯一', '有产权证'], facilities: ['气泡WiFi', '停车位', '宠物友好'],
    ownerId: 'patrick', status: 'sold', availableFrom: '', minLease: 0,
    views: 2890, rating: 4.4, reviewCount: 9, featured: false, x: 25, y: 61,
    desc: '派大星的岩石屋，已通过平台成交。留作成交案例展示：挂牌 36 万，历时 11 天，买家一次性付款。'
  }
]

/** 购房意向单：pending 待卖家确认 / accepted 已接受 / rejected 已拒绝 / canceled 买家撤回 */
export const SALE_INTENTS = [
  {
    id: 'SI8001', houseId: 'H2002', buyerId: 'spongebob', sellerId: 'gary',
    price: 410000, status: 'pending',
    message: '我想买这套贝壳小屋，能不能按 41 万成交？可以全款，随时可以办手续。',
    createdAt: '2026-11-24 10:20'
  },
  {
    id: 'SI8002', houseId: 'H2003', buyerId: 'gary', sellerId: 'sandy',
    price: 1200000, status: 'pending',
    message: '珊迪你好，我看中这套菠萝屋很久了，120 万可以谈吗？首付已经准备好。',
    createdAt: '2026-11-23 15:40'
  },
  {
    id: 'SI8003', houseId: 'H2004', buyerId: 'squidward', sellerId: 'patrick',
    price: 355000, status: 'accepted',
    message: '35.5 万，一次性付款，两周内完成过户。',
    createdAt: '2026-11-15 09:30'
  },
  {
    id: 'SI8004', houseId: 'H2002', buyerId: 'patrick', sellerId: 'gary',
    price: 390000, status: 'rejected',
    message: '39 万行不行，我真的很喜欢这个贝壳浴缸。',
    createdAt: '2026-11-20 14:10'
  }
]
