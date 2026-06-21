/**
 * 存量知识 embedding 回填脚本（Supabase AI gte-small）
 *
 * 用法：node scripts/backfill-embeddings.js
 * 环境变量：SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BATCH_SIZE (可选, 默认50)
 *
 * 调用 Supabase RPC backfill_embeddings，每次处理 BATCH_SIZE 条。
 * 多次运行直到返回 0。
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://doqcopkqbfpstuavfjsa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '50', 10);

async function sbRpc(fnName, params = {}) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${fnName}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(params),
  });
  if (!resp.ok) { const e = await resp.text(); throw new Error(`SB rpc ${fnName}: ${resp.status} ${e}`); }
  return resp.json();
}

async function main() {
  if (!SUPABASE_KEY) { console.error('Error: SUPABASE_SERVICE_ROLE_KEY not set'); process.exit(1); }

  console.log('=== Embedding Backfill (Supabase AI gte-small) ===');
  console.log('Time:', new Date().toISOString());
  console.log('Batch size:', BATCH_SIZE);

  let totalBackfilled = 0;
  let round = 0;

  while (round < 20) {
    round++;
    console.log(`\nRound ${round}: backfilling up to ${BATCH_SIZE} items...`);
    const count = await sbRpc('backfill_embeddings', { batch_size: BATCH_SIZE });
    const num = Array.isArray(count) ? count[0] : count;
    totalBackfilled += num;
    console.log(`  Backfilled: ${num} items (total: ${totalBackfilled})`);
    if (num === 0) break;
  }

  console.log(`\n=== DONE ===`);
  console.log(`Total backfilled: ${totalBackfilled}`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
