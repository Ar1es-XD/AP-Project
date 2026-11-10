// our routes needs to talk to database so instead of writing the database connection code in everyfile we put in lib/db.js
// as lib flder contains reusable utility functuons 


import pg from 'pg';
// pg is official lib for node.js
const { Pool } = pg;
// Pool is a class provided by the pg package used to manage multiple database connection. 
// so instead of creating new connection for every upcoming request it creares reusable connections and majorly used so we can know how many request are upcoming are in total.
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres',
    max:20,
    // maximum 20 pools available
    idleTimeoutMillis:3000,
    // if the connection is unused for 30s then it closes the connection to prevent database memory 
    // closing idles ones keep the system clean 
    connectionTimeoutMillis:2000,
    // maximum wautung time to obtain a database connection 
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
});
// if a database suddendly breaks print error instead of crashing .


export const query = (text,params) => pool.query(text,params);

// runs the given function inside a database transaction ,automatically comits success or rollback an error.
export async function withTransaction(fn) {
const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
// custom function so that we can plug any database request into it 