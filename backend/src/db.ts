import pg from "pg";

const pool = new pg.Pool({
  host: process.env.DB_HOST ?? "postgres",
  user: process.env.DB_USER ?? "nfe",
  password: process.env.DB_PASS ?? "senha",
  database: process.env.DB_NAME ?? "nfe_db",
});

export const query = (text: string, params?: unknown[]) =>
  pool.query(text, params);

export default pool;
