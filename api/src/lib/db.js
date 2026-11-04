import pg from 'pg';
const { Pool } = pg;
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres',
    max:20,
    idleTimeoutMillis:3000,
    connectionTimeoutMillis:2000,
});
export const query = (text,params) => pool.query(text,params);