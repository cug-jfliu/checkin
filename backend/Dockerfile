# ================================
# Stage 1: Build
# ================================
FROM rust:slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y \
    pkg-config libssl-dev libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# 先复制依赖声明，单独编译依赖层（源码不变时此层可复用缓存）
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs \
    && cargo build --release \
    && rm -rf src

# 再复制源码，只重新编译项目本身
COPY src ./src
RUN touch src/main.rs && cargo build --release

# ================================
# Stage 2: Runtime
# ================================
FROM debian:bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ca-certificates libsqlite3-0 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/backend ./backend

VOLUME ["/app/data"]
EXPOSE 3000
CMD ["./backend"]
