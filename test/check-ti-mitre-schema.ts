#!/usr/bin/env npx tsx

import { Client } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'postgres',
    port: 5432,
    database: process.env.POSTGRES_DB || 'n8n',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
  });

  await client.connect();

  console.log('📊 ti_mitre 테이블 구조:\n');
  const schema = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'ioclog' AND table_name = 'ti_mitre'
    ORDER BY ordinal_position
  `);
  console.table(schema.rows);

  console.log('\n📝 샘플 데이터 (5개):\n');
  const sample = await client.query(`
    SELECT * FROM ioclog.ti_mitre LIMIT 5
  `);
  console.log(JSON.stringify(sample.rows, null, 2));

  console.log('\n🔍 T1112 기법 검색:\n');
  const t1112 = await client.query(`
    SELECT * FROM ioclog.ti_mitre WHERE technique_id = 'T1112'
  `);
  console.log(JSON.stringify(t1112.rows, null, 2));

  await client.end();
}

main().catch(console.error);
