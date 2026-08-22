# Next.js 16 生产镜像（standalone 输出，部署到 CloudBase 云托管）
FROM node:20-alpine AS base
RUN corepack enable

# 依赖安装阶段
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# 构建阶段
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 构建期注入公钥（打进客户端 bundle）
ARG NEXT_PUBLIC_CLOUDBASE_ENV_ID
ARG NEXT_PUBLIC_CLOUDBASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLOUDBASE_ENV_ID=$NEXT_PUBLIC_CLOUDBASE_ENV_ID
ENV NEXT_PUBLIC_CLOUDBASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLOUDBASE_PUBLISHABLE_KEY

RUN npm run build

# 运行阶段
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# 服务端运行所需的环境变量（容器启动时可被 CloudBase 环境变量覆盖）
ENV CLOUDBASE_ENV_ID=""
ENV CLOUDBASE_PUBLISHABLE_KEY=""
ENV CLOUDBASE_API_KEY=""

# Next.js standalone 产物
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
