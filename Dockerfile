# ---------- 构建阶段：把前端打成静态文件 ----------
FROM node:22-alpine AS build
WORKDIR /app

# 依赖单独一层，改代码不会重装依赖
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# 高德 Key 是构建期注入的（JS API Key 本身公开，安全靠 Referer 白名单）
ARG VITE_AMAP_KEY=""
ARG VITE_AMAP_SECURITY=""
ENV VITE_AMAP_KEY=$VITE_AMAP_KEY \
    VITE_AMAP_SECURITY=$VITE_AMAP_SECURITY
RUN npm run build

# ---------- 运行阶段：只要 dist + server，镜像小一半 ----------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3001
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# 后端会 import src/data/seed.js（种子数据前后端共用），所以只拷贝这一个目录
COPY server ./server
COPY src/data ./src/data

COPY --from=build /app/dist ./dist

# 容器内用非 root 跑；server 目录可写（SQLite 模式会把库文件落在这里）
RUN mkdir -p /app/server/data && chown -R node:node /app
USER node

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--experimental-sqlite", "server/index.js"]
