<script setup>
/** 发布房源：表单 + 实时预览 + 发布贴士 */
import { reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import SvgIcon from '@/components/SvgIcon.vue'
import { publishHouse, money, toast, state } from '@/stores/app.js'
import { DISTRICTS, HOUSE_TYPES, TAGS, FACILITIES, SALE_TAGS } from '@/data/seed.js'

const router = useRouter()
const route = useRoute()

const f = reactive({
  trade: 'rent',
  title: '', type: 'pineapple', district: 'center', address: '',
  price: 2200, deposit: 2200, area: 60, rooms: 1, halls: 1, baths: 1,
  floor: 1, totalFloor: 3, orientation: '朝南', fit: '精装',
  availableFrom: '', minLease: 12, tags: [], facilities: [], desc: ''
})

const isSale = computed(() => f.trade === 'sale')
const svg = computed(() => HOUSE_TYPES.find((t) => t.id === f.type)?.svg || 'h-pineapple')
const typeName = computed(() => HOUSE_TYPES.find((t) => t.id === f.type)?.name || '')
const districtName = computed(() => DISTRICTS.find((d) => d.id === f.district)?.name || '')

/** 切到出售时把租金默认值换成总价量级，避免出现「月租 420000」这种明显错位的标价 */
watch(isSale, (sale) => {
  if (sale) {
    f.price = 420000
    f.deposit = 0
    f.minLease = 0
    f.tags = f.tags.filter((t) => SALE_TAGS.includes(t)).slice(0, 4)
  } else {
    f.price = 2200
    f.deposit = 2200
    f.minLease = 12
  }
})

function chk(arr, v) {
  const i = arr.indexOf(v)
  if (i >= 0) arr.splice(i, 1)
  else arr.push(v)
}

const errors = computed(() => {
  const e = {}
  if (!f.title.trim()) e.title = '请填写房源标题'
  if (!f.address.trim()) e.address = '请填写详细地址'
  if (!(Number(f.price) > 0)) e.price = isSale.value ? '总价需大于 0' : '月租需大于 0'
  if (!(Number(f.area) > 0)) e.area = '面积需大于 0'
  if (!isSale.value && !(Number(f.deposit) >= 0)) e.deposit = '押金不能为负'
  if (!isSale.value && !f.availableFrom) e.availableFrom = '请选择可入住日期'
  return e
})
const valid = computed(() => Object.keys(errors.value).length === 0)

function submit() {
  if (!valid.value) {
    toast('还有 ' + Object.keys(errors.value).length + ' 项信息待完善', 'warn')
    return
  }
  const h = publishHouse({ ...f, svg: svg.value, tags: [...f.tags], facilities: [...f.facilities] })
  router.push('/house/' + h.id)
}

function fillDemo() {
  const sale = isSale.value
  Object.assign(f, {
    title: '比奇堡市中心 · ' + (sale ? '电梯三房出售' : '精装' + typeName.value),
    address: '比奇堡 珊瑚街 ' + Math.floor(Math.random() * 200 + 1) + ' 号',
    desc: sale
      ? '满五唯一，税费低，可正常办理按揭。户型方正，采光好，家电全留，看房随时约。'
      : '屋子采光好，通风佳，步行可达蟹堡王与气泡巴士站。房东好说话，随时看房。',
    availableFrom: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
    tags: sale ? ['满五唯一', '可贷款'] : ['房东直租', '随时看房'],
    facilities: ['气泡WiFi', '家具齐全']
  })
  toast('已填入示例信息，可自行修改')
}

onMounted(() => {
  if (route.query.trade === 'sale') f.trade = 'sale'
  if (route.query.demo) fillDemo()
})
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>发布房源</h1>
        <p>可发布出租或出售房源，审核通过后立即上架。带 <span style="color:var(--red)">*</span> 为必填项。</p>
      </div>
      <div class="page-head__acts">
        <button class="btn btn--ghost" @click="fillDemo">填入示例</button>
      </div>
    </div>

    <div class="pub">
      <!-- 表单 -->
      <div class="card form">
        <div class="card__title">基本信息</div>
        <div style="margin-top:14px">
          <label>交易类型</label>
          <div class="chips">
            <button class="chip" :class="{ 'is-on': f.trade === 'rent' }" @click="f.trade = 'rent'">出租</button>
            <button class="chip" :class="{ 'is-on': f.trade === 'sale' }" @click="f.trade = 'sale'">出售</button>
          </div>
        </div>
        <div class="form__row" style="margin-top:14px">
          <div>
            <label>房源标题 <span style="color:var(--red)">*</span></label>
            <input v-model="f.title" type="text" placeholder="例如：比奇堡市中心 · 精装菠萝屋" />
            <span v-if="errors.title" style="font-size:11px;color:#bb2b36">{{ errors.title }}</span>
          </div>
          <div>
            <label>房屋类型</label>
            <select v-model="f.type">
              <option v-for="t in HOUSE_TYPES" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
        </div>

        <div class="form__row">
          <div>
            <label>所在街区</label>
            <select v-model="f.district">
              <option v-for="d in DISTRICTS" :key="d.id" :value="d.id">{{ d.name }}</option>
            </select>
          </div>
          <div>
            <label>详细地址 <span style="color:var(--red)">*</span></label>
            <input v-model="f.address" type="text" placeholder="比奇堡 珊瑚街 124 号" />
            <span v-if="errors.address" style="font-size:11px;color:#bb2b36">{{ errors.address }}</span>
          </div>
        </div>

        <div class="card__title" style="margin-top:22px">价格与户型</div>
        <div class="form__row" style="margin-top:14px">
          <div>
            <label>{{ isSale ? '总价（元）' : '月租金（元）' }} <span style="color:var(--red)">*</span></label>
            <input v-model.number="f.price" type="number" min="0" :step="isSale ? 10000 : 50" />
            <span v-if="errors.price" style="font-size:11px;color:#bb2b36">{{ errors.price }}</span>
          </div>
          <div v-if="!isSale">
            <label>押金（元）</label>
            <input v-model.number="f.deposit" type="number" min="0" step="100" />
          </div>
          <div v-else>
            <label>参考单价（元/m²）</label>
            <input :value="f.area > 0 ? Math.round(f.price / f.area) : 0" type="number" readonly />
          </div>
        </div>

        <div class="form__row">
          <div>
            <label>建筑面积（m²）</label>
            <input v-model.number="f.area" type="number" min="1" />
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
            <div><label>室</label><input v-model.number="f.rooms" type="number" min="1" max="9" /></div>
            <div><label>厅</label><input v-model.number="f.halls" type="number" min="0" max="5" /></div>
            <div><label>卫</label><input v-model.number="f.baths" type="number" min="0" max="5" /></div>
          </div>
        </div>

        <div class="form__row">
          <div>
            <label>所在楼层 / 总楼层</label>
            <div style="display:flex;gap:8px">
              <input v-model.number="f.floor" type="number" min="1" />
              <input v-model.number="f.totalFloor" type="number" min="1" />
            </div>
          </div>
          <div>
            <label>朝向 / 装修</label>
            <div style="display:flex;gap:8px">
              <input v-model="f.orientation" type="text" />
              <select v-model="f.fit" style="flex:0 0 110px">
                <option>精装</option><option>简装</option><option>豪装</option><option>毛坯</option>
              </select>
            </div>
          </div>
        </div>

        <div class="form__row" v-if="!isSale">
          <div>
            <label>可入住日期 <span style="color:var(--red)">*</span></label>
            <input v-model="f.availableFrom" type="date" />
            <span v-if="errors.availableFrom" style="font-size:11px;color:#bb2b36">{{ errors.availableFrom }}</span>
          </div>
          <div>
            <label>最短租期（月）</label>
            <input v-model.number="f.minLease" type="number" min="1" max="60" />
          </div>
        </div>

        <div class="card__title" style="margin-top:22px">{{ isSale ? '卖点与配套' : '标签与配套' }}</div>
        <div style="margin-top:10px">
          <label>房源标签</label>
          <div class="checks">
            <label v-for="t in (isSale ? SALE_TAGS : TAGS)" :key="t" class="check">
              <input type="checkbox" :checked="f.tags.includes(t)" @change="chk(f.tags, t)" />{{ t }}
            </label>
          </div>
        </div>
        <div style="margin-top:14px">
          <label>房屋配套</label>
          <div class="checks">
            <label v-for="c in FACILITIES" :key="c" class="check">
              <input type="checkbox" :checked="f.facilities.includes(c)" @change="chk(f.facilities, c)" />{{ c }}
            </label>
          </div>
        </div>

        <div style="margin-top:16px">
          <label>房源描述</label>
          <textarea v-model="f.desc" placeholder="介绍采光、通风、周边、交通等，越详细越容易被租客选中"></textarea>
        </div>

        <div class="upload">
          <SvgIcon name="ic-camera" />
          <div>上传房屋实拍图（演示环境暂用主题插画代替）</div>
        </div>

        <button class="btn btn--primary btn--lg" style="margin-top:18px" @click="submit">
          {{ isSale ? '提交并挂牌出售' : '提交并上架' }}
        </button>
        <p v-if="!valid" style="font-size:11.5px;color:var(--ink3);margin-top:8px;text-align:center">
          还有 {{ Object.keys(errors).length }} 项待完善：{{ Object.values(errors).join('、') }}
        </p>
      </div>

      <!-- 预览 + 贴士 -->
      <div>
        <div class="card">
          <div class="card__title">实时预览</div>
          <div class="card__desc">租客在列表中看到的样子</div>

          <div class="hpreview">
            <div class="hpreview__art"><svg viewBox="0 0 120 150"><use :href="'#' + svg" /></svg></div>
            <div class="hpreview__body">
              <span class="tag-pill ok">{{ isSale ? '在售' : '可租' }}</span>
              <b>{{ f.title || '房源标题示例' }}</b>
              <span>{{ f.address || districtName + ' · 详细地址待填写' }}</span>
              <span>{{ f.rooms }}室{{ f.halls }}厅{{ f.baths }}卫 · {{ f.area }}m² · {{ f.floor }}/{{ f.totalFloor }}层 · {{ f.orientation }}</span>
              <em>{{ money(f.price || 0) }}<i>{{ isSale ? '总价' : '/月' }}</i></em>
            </div>
          </div>

          <div class="kv" style="margin-top:12px"><span>交易类型</span><b>{{ isSale ? '出售' : '出租' }}</b></div>
          <div class="kv"><span>房屋类型</span><b>{{ typeName }}</b></div>
          <div class="kv"><span>所在街区</span><b>{{ districtName }}</b></div>
          <template v-if="isSale">
            <div class="kv"><span>参考单价</span><b>{{ money(f.area > 0 ? Math.round(f.price / f.area) : 0) }}/m²</b></div>
          </template>
          <template v-else>
            <div class="kv"><span>押金</span><b>{{ money(f.deposit || 0) }}</b></div>
            <div class="kv"><span>可入住</span><b>{{ f.availableFrom || '待填写' }}</b></div>
            <div class="kv"><span>最短租期</span><b>{{ f.minLease }} 个月</b></div>
          </template>
          <div class="kv"><span>房东</span><b>{{ state.user.name }}</b></div>
        </div>

        <div class="card" style="margin-top:14px">
          <div class="card__title">发布贴士</div>
          <div class="insp">
            <div class="insp__card">
              <span class="insp__sw" style="background:linear-gradient(160deg,#FFE987,#F2B40E)"></span>
              <b>标题要具体</b>
              <span>写清街区 + 房型 + 装修，例如「市中心 · 精装菠萝屋」。</span>
            </div>
            <div class="insp__card">
              <span class="insp__sw" style="background:linear-gradient(160deg,#7FD8FF,#2F9BE0)"></span>
              <b>价格要真实</b>
              <span>虚高会拉低排序，参考同街区均价定价更容易成交。</span>
            </div>
            <div class="insp__card">
              <span class="insp__sw" style="background:linear-gradient(160deg,#A6E37B,#57A93A)"></span>
              <b>配套填满</b>
              <span>配套越全，租客筛选命中率越高。</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
