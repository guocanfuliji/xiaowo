<script setup>
/** 帖子详情：正文 + 点赞 + 评论 */
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CharAvatar from '@/components/CharAvatar.vue'
import { Api } from '@/api/index.js'
import { charOf, state, toast } from '@/stores/app.js'
import { DISTRICTS } from '@/data/seed.js'

const route = useRoute()
const router = useRouter()

const post = ref(null)
const comments = ref([])
const loading = ref(true)
const notFound = ref(false)
const draft = ref('')
const sending = ref(false)

const meId = computed(() => state.user.charId)
const isMine = computed(() => post.value && post.value.authorId === meId.value)
const districtName = computed(() => {
  const d = DISTRICTS.find((x) => x.id === post.value?.district)
  return d ? d.name : (post.value?.district || '')
})

async function load() {
  loading.value = true
  try {
    post.value = await Api.community.post(route.params.id)
    comments.value = await Api.community.comments(route.params.id)
  } catch (e) {
    notFound.value = true
  } finally {
    loading.value = false
  }
}

async function toggleLike() {
  if (!post.value) return
  const before = { liked: post.value.liked, likeCount: post.value.likeCount, hotScore: post.value.hotScore }
  post.value.liked = !post.value.liked
  post.value.likeCount += post.value.liked ? 1 : -1
  try {
    const d = await Api.community.like(post.value.id)
    post.value.liked = d.liked
    post.value.likeCount = d.likeCount
    post.value.hotScore = d.hotScore
  } catch (e) {
    Object.assign(post.value, before)
    toast(e.message || '操作失败')
  }
}

async function send() {
  const content = draft.value.trim()
  if (!content) return toast('评论不能为空')
  if (content.length > 500) return toast('评论最多 500 字')
  sending.value = true
  try {
    const c = await Api.community.comment(post.value.id, content)
    comments.value.push(c)
    post.value.commentCount += 1
    post.value.hotScore += 5
    draft.value = ''
    toast('评论已发布')
  } catch (e) {
    toast(e.message || '评论失败')
  } finally {
    sending.value = false
  }
}

async function removeComment(c) {
  try {
    await Api.community.removeComment(c.id)
    comments.value = comments.value.filter((x) => x.id !== c.id)
    post.value.commentCount = Math.max(0, post.value.commentCount - 1)
    toast('评论已删除')
  } catch (e) {
    toast(e.message || '删除失败')
  }
}

async function removePost() {
  if (!window.confirm('确认删除这条帖子？评论和点赞会一并清除。')) return
  try {
    await Api.community.remove(post.value.id)
    toast('帖子已删除')
    router.replace('/community')
  } catch (e) {
    toast(e.message || '删除失败')
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>{{ post ? '帖子详情' : (notFound ? '帖子不存在' : '加载中…') }}</h1>
        <p v-if="post">{{ districtName }} · {{ post.createdAt }} · 热度 {{ post.hotScore }}</p>
      </div>
      <div class="page-head__acts">
        <button class="btn btn--ghost" @click="router.push('/community')">返回社区</button>
        <button v-if="isMine" class="btn btn--ghost" style="color:#bb2b36" @click="removePost">删除帖子</button>
      </div>
    </div>

    <div v-if="loading" class="card" style="text-align:center;padding:32px;color:var(--ink3)">正在加载…</div>

    <div v-else-if="notFound" class="card" style="text-align:center;padding:40px">
      <p style="color:var(--ink2)">这条帖子可能已经被作者删除了。</p>
      <button class="btn btn--primary" style="margin-top:12px" @click="router.push('/community')">回到社区</button>
    </div>

    <template v-else-if="post">
      <div class="card">
        <div style="display:flex;align-items:center;gap:10px">
          <CharAvatar :char="charOf(post.authorId)" :size="44" />
          <div style="flex:1;min-width:0">
            <b style="font-size:13px">{{ charOf(post.authorId).name }}</b>
            <div style="font-size:11px;color:var(--ink3)">
              {{ charOf(post.authorId).role }} · {{ districtName }}
            </div>
          </div>
          <span class="badge badge--mint">{{ districtName }}</span>
        </div>

        <h2 style="font-size:19px;font-weight:900;line-height:1.45;margin:16px 0 10px">{{ post.title }}</h2>
        <p style="font-size:13.5px;line-height:1.85;color:var(--ink2);white-space:pre-wrap">{{ post.content }}</p>

        <div v-if="post.tags?.length" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px">
          <span v-for="t in post.tags" :key="t" class="badge">{{ t }}</span>
        </div>

        <div style="display:flex;align-items:center;gap:14px;margin-top:18px;padding-top:14px;border-top:1px dashed rgba(18,60,63,.12)">
          <button class="like-btn" :class="{ 'is-on': post.liked }" @click="toggleLike">
            ♥ {{ post.liked ? '已赞' : '点赞' }} · {{ post.likeCount }}
          </button>
          <span style="font-size:12px;color:var(--ink3)">💬 {{ post.commentCount }} 条评论</span>
        </div>
      </div>

      <div class="card" style="margin-top:14px">
        <div class="card__title">评论 {{ comments.length }}</div>

        <div v-if="comments.length" style="margin-top:14px">
          <div v-for="c in comments" :key="c.id" class="cmt">
            <CharAvatar :char="charOf(c.authorId)" :size="32" />
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px">
                <b style="font-size:12px">{{ charOf(c.authorId).name }}</b>
                <span style="font-size:10.5px;color:var(--ink3)">{{ c.createdAt }}</span>
                <button
                  v-if="c.authorId === meId"
                  style="margin-left:auto;font-size:10.5px;color:#bb2b36"
                  @click="removeComment(c)"
                >删除</button>
              </div>
              <p style="font-size:12.5px;color:var(--ink2);line-height:1.7;margin:4px 0 0">{{ c.content }}</p>
            </div>
          </div>
        </div>
        <p v-else style="font-size:12.5px;color:var(--ink3);margin-top:10px">还没有评论，说说你的看法。</p>

        <div style="margin-top:16px;display:flex;gap:10px;align-items:flex-start">
          <textarea
            v-model="draft"
            rows="3"
            maxlength="500"
            placeholder="写下你的评论…"
            style="flex:1;height:auto;padding:12px 14px;line-height:1.7"
          ></textarea>
          <button class="btn btn--primary" :disabled="sending" @click="send">
            {{ sending ? '发送中…' : '发表' }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.like-btn {
  height: 34px;
  padding: 0 16px;
  border-radius: 999px;
  background: #fdeef3;
  color: #d1436b;
  font-size: 12.5px;
  font-weight: 800;
  transition: all .15s ease;
}
.like-btn.is-on { background: #e2547a; color: #fff; }
.cmt {
  display: flex;
  gap: 10px;
  padding: 12px 0;
  border-top: 1px dashed rgba(18, 60, 63, .1);
}
.cmt:first-child { border-top: none; }
</style>
