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
ENV NEXT_PUBLIC_CLOUDBASE_ENV_ID=test-d3gqp6tfx48ae40f2
ENV NEXT_PUBLIC_CLOUDBASE_PUBLISHABLE_KEY=eyJhbGciOiJSUzI1NiIsImtpZCI6IjkxODIyNzFiLTU4MWUtNGZmMS04MDQyLTUxYTI5NjZhMGJmZCJ9.eyJpc3MiOiJodHRwczovL3Rlc3QtZDNncXA2dGZ4NDhhZTQwZjIuYXAtc2hhbmdoYWkudGNiLWFwaS50ZW5jZW50Y2xvdWRhcGkuY29tIiwic3ViIjoiYW5vbiIsImF1ZCI6InRlc3QtZDNncXA2dGZ4NDhhZTQwZjIiLCJleHAiOjQwOTA5OTA5MDYsImlhdCI6MTc4NzMwNzcwNiwibm9uY2UiOiJUTHFhb3pGYlFxS3A5MzBVTkpzTk5RIiwiYXRfaGFzaCI6IlRMcWFvekZiUXFLcDkzMFVOSnNOTlEiLCJuYW1lIjoiQW5vbnltb3VzIiwic2NvcGUiOiJhbm9ueW1vdXMiLCJwcm9qZWN0X2lkIjoidGVzdC1kM2dxcDZ0Zng4YWU0MGYyIiwibWV0YSI6eyJwbGF0Zm9ybSI6IlB1Ymxpc2hhYmxlS2V5In0sInJvbGUiOiJhbm9uIiwiaXNfYW5vbnltb3VzIjp0cnVlLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJhbm9ueW1vdXMiLCJwcm92aWRlcnMiOlsiYW5vbnltb3VzIl19LCJ1c2VyX21ldGFkYXRhIjp7Im5hbWUiOiJBbm9ueW1vdXMifSwidXNlcl90eXBlIjoiIiwiY2xpZW50X3R5cGUiOiJjbGllbnRfdXNlciIsImlzX3N5c3RlbV9hZG1pbiI6ZmFsc2V9.M0HKgyOkaK3HdFxIGBskF--4ZWMg5FVcSs-Ja_SUb1UAlNh4Lm2qqWT_tcJPBCsaYzBXMV17NWBsxquV3ghIde_nGyHrlErQBGYMOC3qY-HaS4bvsGE--FrQiuOE_1FKPokyo8_aMkhaW9WNnDTsP_KqUBt6Q9-M9j3nt5Dga8i5vV39iBDlPBGiA1IndJRVqlnu-Q-Ha0MXn1C2S2eGIpQ_stTWdqOvTYSzEnIkYDs9_NP8cWHTjUiqitykzQfIWGzEbrWFsc9Gl1cpG7zgm_VTYUlIdfkWoTLKQPx6Zvs5GVBRLwXwoMceR3kr06S_iOo9ePB41pykcI3zzYNY_g

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
