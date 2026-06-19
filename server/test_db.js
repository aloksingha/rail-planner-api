const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_7wH4UCBRqFWe@ep-nameless-silence-aoe7e5f1.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
});

async function test() {
  try {
    console.log('Connecting to PostgreSQL...');
    await client.connect();
    console.log('Connected successfully!');
    const res = await client.query('SELECT NOW()');
    console.log('Server time:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Connection error', err.stack);
  }
}

test();
