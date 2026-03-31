export type Env = {
  DB: D1Database;
  // Wrangler [assets] 提供的静态资源 fetcher
  ASSETS: Fetcher;
  // 生产环境必须设置；本地开发若未设置，会回退到与 Rust 后端一致的默认值 "secret"
  JWT_SECRET?: string;
  TIMEZONE_OFFSET_HOURS?: string;
};

