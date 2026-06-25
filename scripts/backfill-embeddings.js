/**
 * 存量知识 embedding 回填脚本
 *
 * 用法：node scripts/backfill-embeddings.js
 * 环境变量：
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   EMBEDDING_API_KEY, EMBEDDING_BASE_URL (可选), EMBEDDING_MODEL (可选)
 *
 * 每次处理 BATCH_SIZE 条记录，避免超时。
 * 多次运行直到所有记录都有 embedding。
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMBEDDING_API_KEY = process.env.EMBEDDING_API_KEY || process.env.QWEN_API_KEY || process.env.OPENAI_API_KEY;
const EMBEDDING_BASE_URL = process.env.EMBEDDING_BASE_URL || process.env.QWEN_BASE_URL || 'https://api.openai.com/v1';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-v3';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '50', 10);

async function sbQuery(table, params) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.set('select', params.select || '*');
  if (params.eq) Object.entries(params.eq).forEach(([k, v]) => url.searchParams.set(k, `eq.${v}`));
  if (params.is) Object.entries(params.is).forEach(([k, v]) => url.searchParams.set(k, `is.${v}`));
  if (params.limit) url.searchParams.set('limit', params.limit.toString());
  if (params.order) url.searchParams.set('order', params.order);
  const resp = await fetch(url, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
  });
  if (!resp.ok) return [];
  return resp.json();
}

async function sbUpdate(table, eq, data) {
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  const params = new URLSearchParams();
  for (const [c, v] of Object.entries(eq)) params.append(c, `eq.${v}`);
  url += `?${params.toString()}`;
  const resp = await fetch(url, {
    method: 'PATCH',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(data),
  });
  if (!resp.ok) throw new Error(`SB update ${table}: ${resp.status}`);
  return resp.json();
}

async function callEmbeddings(texts) {
  if (!EMBEDDING_API_KEY || texts.length === 0) return texts.map(() => null);
  try {
    let url = (EMBEDDING_BASE_URL || '').replace(/\/+$/, '');
    if (url.startsWith('http://')) url = url.replace('http://', 'https://');
    if (!url.includes('/embeddings')) {
      url += (url.endsWith('/v1') || url.endsWith('/v3')) ? '/embeddings' : '/v1/embeddings';
    }
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${EMBEDDING_API_KEY}` },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts, encoding_format: 'float' }),
      signal: AbortSignal.timeout(60000),
    });
    if (!resp.ok) { console.error('Embedding API error:', resp.status); return texts.map(() => null); }
    const data = await resp.json();
    const results = new Array(texts.length).fill(null);
    for (const item of (data.data || [])) { results[item.index] = item.embedding; }
    return results;
  } catch (e) { console.error('callEmbeddings error:', e.message); return texts.map(() => null); }
}

async function main() {
  if (!SUPABASE_KEY) { console.error('Error: SUPABASE_SERVICE_ROLE_KEY not set'); process.exit(1); }
  if (!EMBEDDING_API_KEY) { console.error('Error: EMBEDDING_API_KEY not set'); process.exit(1); }

  console.log('=== Embedding Backfill ===');
  console.log('Time:', new Date().toISOString());
  console.log('Model:', EMBEDDING_MODEL);
  console.log('Batch size:', BATCH_SIZE);

  // 1. Count items without embedding
  const allItems = await sbQuery('knowledge_items', {
    select: 'id,content',
    is: { embedding: null, status: 'ACTIVE' },
    limit: BATCH_SIZE,
    order: 'created_at.desc',
  });

  console.log(`Found ${allItems.length} items without embedding`);

  if (allItems.length === 0) {
    console.log('Nothing to backfill. Done!');
    return;
  }

  // 2. Batch generate embeddings
  console.log('Generating embeddings...');
  const texts = allItems.map(item => (item.content || '').slice(0, 2000));
  const embeddings = await callEmbeddings(texts);
  const successCount = embeddings.filter(e => e !== null).length;
  console.log(`Generated: ${successCount}/${allItems.length}`);

  // 3. Update records
  let updated = 0;
  let failed = 0;
  for (let i = 0; i < allItems.length; i++) {
    if (!embeddings[i]) { failed++; continue; }
    try {
      await sbUpdate('knowledge_items', { id: allItems[i].id }, { embedding: embeddings[i] });
      updated++;
      if (updated % 10 === 0) console.log(`  Updated: ${updated}/${successCount}`);
    } catch (e) {
      failed++;
      if (failed <= 3) console.error(`  Update failed: ${e.message.slice(0, 80)}`);
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);
  console.log(`Remaining without embedding: check database`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
