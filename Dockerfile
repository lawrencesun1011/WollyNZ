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

# 构建期注入公钥（打进客户端 bundle）。
# 注意：NEXT_PUBLIC_* 必须在 next build 时确定并烧入前端 bundle，
# 运行时通过控制台环境变量注入无效，因此这里直接写死（publishable key 本就公开）。
ENV NEXT_PUBLIC_CLOUDBASE_ENV_ID=wollynz-d2gvvk54afe1d25a3
ENV NEXT_PUBLIC_CLOUDBASE_PUBLISHABLE_KEY=eyJhbGciOiJSUzI1NiIsImtpZCI6ImI2YTJlMzBkLWExYTAtNGFhMi04ZWQ3LTEwYmMzYWRmODNmMSJ9.eyJpc3MiOiJodHRwczovL3dvbGx5bnotZDJndnZrNTRhZmUxZDI1YTMuYXAtc2hhbmdoYWkudGNiLWFwaS50ZW5jZW50Y2xvdWRhcGkuY29tIiwic3ViIjoiYW5vbiIsImF1ZCI6IndvbGx5bnotZDJndnZrNTRhZmUxZDI1YTMiLCJleHAiOjQwOTExNzA1NDQsImlhdCI6MTc4NzQ4NzM0NCwibm9uY2UiOiI4S3k0cVZzYlI5Q2YwS2M5Zm9GTHpRIiwiYXRfaGFzaCI6IjhLeTRxVnNiUjlDZjBLYzlmb0ZMelEiLCJuYW1lIjoiQW5vbnltb3VzIiwic2NvcGUiOiJhbm9ueW1vdXMiLCJwcm9qZWN0X2lkIjoid29sbHluei1kMmd2dms1NGFmZTFkMjVhMyIsIm1ldGEiOnsicGxhdGZvcm0iOiJQdWJsaXNoYWJsZUtleSJ9LCJyb2xlIjoiYW5vbiIsImlzX2Fub255bW91cyI6dHJ1ZSwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiYW5vbnltb3VzIiwicHJvdmlkZXJzIjpbImFub255bW91cyJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoiQW5vbnltb3VzIn0sInVzZXJfdHlwZSI6IiIsImNsaWVudF90eXBlIjoiY2xpZW50X3VzZXIiLCJpc19zeXN0ZW1fYWRtaW4iOmZhbHNlfQ.PUiwAeQ1y1mp-AGC1xLy0MxxCP_1AQRBcsnfYNDb0Me1RdFltjQfp_h4UFH8Hb6C9JIhBu5d65Cn6c_yiXJPl3GS9bF-maC9YZRT9L5zVLFwTl76QDOO0HHkHqwQ78lRfaAjbpXwH-KCMydhIBDbxmVl5YII-QxQMt8h3brGjzpaWDZjo_veN3NmDZljClxmUnBIe9qMEUIsB1T577GaWf85T946pzhN-uPqT6ZZI5V8uLL9gOgMZf2Z9OQ84bA220A_jjf6guh0hKPxU-w245bd8HW4caWbHMQn-phnssfFEu25khef5B8rnlZHNI1OVKENUCIdHFDMnT-hewFiJQ

RUN npm run build

# 运行阶段
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Next.js standalone 产物
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# 本地数据文件（学校库直接读取 data/ 下的 JSON，不再依赖 PostgreSQL）
COPY --from=builder /app/data ./data

EXPOSE 3000
CMD ["node", "server.js"]
