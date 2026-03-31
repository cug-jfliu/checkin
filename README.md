# 打卡 · Checkin

> 一个轻量级的员工/团队打卡管理系统，支持每日打卡、历史查询与管理员后台。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Cloudflare Workers · Hono · D1 · JWT |
| 前端 | React · TypeScript · Vite · Axios |

---

## 项目结构

```
checkin/
├── worker/           # Cloudflare Workers 后端（Hono + D1 + JWT）
└── frontend/         # React 前端
    ├── src/
    │   ├── pages/    # 页面组件（登录、打卡、管理后台）
    │   ├── components/
    │   ├── lib/      # Axios 实例
    │   └── store/    # 认证状态
    └── .env.example
```

---

## 页面路由

| 路径 | 说明 | 权限 |
|------|------|------|
| `/login` | 登录页 | 公开 |
| `/register` | 注册页 | 公开 |
| `/checkin/today` | 今日打卡 | 需登录 |
| `/checkin/history` | 打卡历史 | 需登录 |
| `/admin/checkins` | 打卡记录管理 | 仅管理员 |
| `/admin/users` | 用户管理 | 仅管理员 |
| `/admin/weekly` | 周报统计 | 仅管理员 |

---

## 本地开发

### 前置要求

- Node.js ≥ 18 + pnpm（或 npm）
- Cloudflare Wrangler（在 `worker/` 中作为 devDependency 安装）

### 前端

```bash
cd frontend

# 安装依赖
pnpm install

# 复制环境变量（开发环境默认指向 localhost:8787）
cp .env.example .env.development

# 启动开发服务器（监听 :5173）
pnpm dev
```

### Worker（Cloudflare Workers + D1）

```bash
cd worker

# 安装依赖
pnpm install

# 1) 创建 D1 数据库（首次执行）
pnpm wrangler d1 create checkin_db
# 将输出的 database_id 填入 worker/wrangler.toml 的 database_id

# 2) 设置 JWT 密钥（本地/远程都可用；生产环境务必设置）
pnpm wrangler secret put JWT_SECRET

# 3) 初始化表结构（本地）
pnpm d1:migrate:local

# 4) 启动本地开发（推荐：本地模式）
pnpm dev
```

> 说明：Worker 版本通过 `wrangler d1 migrations apply` 显式执行迁移（见脚本 `d1:migrate:*`）。

---

## 环境变量

### Worker（Cloudflare）

- **密钥（Secret）**：用 `wrangler secret put JWT_SECRET` 设置（生产环境务必设置强随机值）
- **D1 迁移**：本地用 `pnpm d1:migrate:local`，远程用 `pnpm d1:migrate:remote`

### 前端 `frontend/.env.development` / `.env.production`

| 变量 | 说明 | 示例 |
|------|------|------|
| `VITE_API_BASE_URL` | 后端 API 基础地址 | `http://localhost:8787/api`（本地 wrangler dev）/ `/api`（同域部署） |

---

## License

MIT
