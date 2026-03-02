# 打卡 · Checkin

> 一个轻量级的员工/团队打卡管理系统，支持每日打卡、历史查询与管理员后台。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Rust · Axum · SeaORM · SQLite · JWT |
| 前端 | React · TypeScript · Vite · Axios |

---

## 项目结构

```
checkin/
├── backend/          # Rust 后端服务
│   ├── src/
│   │   ├── api/      # 路由处理器
│   │   ├── models/   # 数据模型
│   │   └── utils/    # JWT、认证守卫、错误处理
│   ├── Dockerfile
│   └── .env.example
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

- Rust（推荐通过 [rustup](https://rustup.rs/) 安装）
- Node.js ≥ 18 + pnpm（或 npm）

### 后端

```bash
cd backend

# 复制并配置环境变量
cp .env.example .env
# 编辑 .env，设置 JWT_SECRET 等

# 启动开发服务器（监听 :3000）
cargo run
```

### 前端

```bash
cd frontend

# 安装依赖
pnpm install

# 复制环境变量（开发环境默认指向 localhost:3000）
cp .env.example .env.development

# 启动开发服务器（监听 :5173）
pnpm dev
```

---

## Docker 部署（后端）

```bash
# 构建镜像
docker build -t checkin-backend ./backend

# 运行容器
# - 挂载 ./data 目录持久化 SQLite 数据库
# - 通过 --env-file 注入环境变量
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --env-file ./backend/.env \
  --name checkin-backend \
  checkin-backend
```

> **注意**：Docker 部署时请将 `.env` 中的 `DATABASE_URL` 改为：
> ```
> DATABASE_URL=sqlite:///app/data/database.sqlite?mode=rwc
> ```
> 确保数据库文件落在挂载卷内，避免容器重启后数据丢失。

---

## 环境变量

### 后端 `backend/.env`

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | SQLite 数据库路径 | `sqlite://database.sqlite?mode=rwc` |
| `JWT_SECRET` | JWT 签名密钥（生产环境务必修改） | `your_random_secret` |
| `RUST_LOG` | 日志级别 | `info` |

### 前端 `frontend/.env.development` / `.env.production`

| 变量 | 说明 | 示例 |
|------|------|------|
| `VITE_API_BASE_URL` | 后端 API 基础地址 | `http://localhost:3000/api` |

---

## License

MIT
