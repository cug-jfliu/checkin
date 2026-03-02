# ============================================================
# Stage 1: Builder
# 使用官方 Rust 镜像编译项目
# ============================================================
FROM rust:1.86-slim AS builder

WORKDIR /app

# 安装编译 SQLite 所需的本地依赖
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# 先只复制依赖声明，利用 Docker 层缓存加速重复构建
COPY Cargo.toml Cargo.lock ./

# 创建占位 src 以预编译依赖
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src

# 复制实际源码并完整编译
COPY src ./src
RUN touch src/main.rs && cargo build --release

# ============================================================
# Stage 2: Runtime
# 使用最小化的 Debian 镜像运行二进制
# ============================================================
FROM debian:bookworm-slim AS runtime

WORKDIR /app

# 安装运行时依赖（ca-certificates 用于 HTTPS 请求）
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libsqlite3-0 \
    && rm -rf /var/lib/apt/lists/*

# 从 builder 阶段复制编译好的二进制
COPY --from=builder /app/target/release/backend ./backend

# 数据库文件持久化目录
VOLUME ["/app/data"]

# 暴露服务端口（与 .env 中的配置保持一致）
EXPOSE 3000

# 启动命令
CMD ["./backend"]
