const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:fudpe6-jastuj-nupzeT@db.sezvlnxoafyjxidlpwuy.supabase.co:5432/postgres?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    console.log('🔌 Connessione a Supabase...');
    await client.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connesso! Ora:', result.rows[0].now);
    await client.end();
  } catch (err) {
    console.error('❌ Errore:', err.message);
    process.exit(1);
  }
}

test();
