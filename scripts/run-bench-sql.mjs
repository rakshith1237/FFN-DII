import { readFileSync } from 'fs';
import pg from 'pg';
const { Client } = pg;

const sql = readFileSync('./scripts/bench-vectors.sql', 'utf8');
const client = new Client({ connectionString: process.argv[2] });

await client.connect();
console.log('Connected. Running SQL...');
await client.query(sql);
console.log('Done!');
await client.end();