export type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
  JWT_SECRET?: string;
  TIMEZONE_OFFSET_HOURS?: string;
  TYPST_WASM_UPSTREAM_URL?: string;
  ASSETS_BUCKET?: R2Bucket;
  TYPST_WASM_KEY?: string;
};

