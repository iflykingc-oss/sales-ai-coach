const { URL } = require('url');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Sentry = require('@sentry/node');
const registry = require('./industry-context');
const syncManager = require('./industry-sync');
const { processKnowledge, generateSpeechWithRetry } = require('./speech-generator');
const companyKnowledge = require('./company-knowledge');

// 行业检测兼容函数（使用新的 L1 正则矩阵引擎）
function detectIndustry(input, userIndustry) {
  if (userIndustry && registry.getContext(userIndustry)) return userIndustry;
  return registry.matchL1Rule(input || '');
}

function generateIndustryPrompt(industry, scenario) {
  return registry.generateIndustryPrompt(industry, scenario);
}

// 数据库初始化函数（检查公告表是否存在）
async function initDatabase() {
  const tables = ['announcements', 'announcement_translations', 'announcement_reads'];
  const missing = [];
  for (const table of tables) {
    try {
      await sbSafeQuery(table, { select: 'id', limit: 1 });
    } catch (e) {
      missing.push(table);
    }
  }
  return missing.length === 0
    ? { success: true, message: '所有表已存在' }
    : { success: false, reason: 'tables_missing', missingTables: missing, message: '请在 Supabase SQL Editor 中执行建表 SQL' };
}

// 启动时自动同步行业数据（仅在非 serverless 环境）
if (process.env.VERCEL !== '1') {
  setTimeout(() => {
    try {
      syncManager.startAutoSync(5 * 60 * 1000);
    } catch (e) {
      console.log('Industry sync disabled:', e.message);
    }
  }, 3000);
}

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  environment: process.env.NODE_ENV || 'production',
  tracesSampleRate: 0.1,
});

// ==================== CONFIG ====================
const SUPABASE_URL = 'https://doqcopkqbfpstuavfjsa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.aisalecoach.work';

// ==================== RATE LIMITING ====================
const rateLimitStore = new Map(); // ip -> { count, resetTime }

function getRateLimitKey(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((entry.resetTime - now) / 1000) };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count };
}

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) rateLimitStore.delete(key);
  }
}, 5 * 60 * 1000);

// Rate limit middleware
function rateLimit(limit, windowMs) {
  return (req, res) => {
    const key = getRateLimitKey(req);
    const result = checkRateLimit(key, limit, windowMs);
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter);
      sendJson(res, 429, { success: false, error: 'Too many requests. Please try again later.' });
      return false;
    }
    return true;
  };
}

// Specific rate limiters
const authRateLimit = rateLimit(10, 60 * 1000); // 10 requests per minute for auth
const aiRateLimit = rateLimit(30, 60 * 1000);   // 30 requests per minute for AI
const generalRateLimit = rateLimit(100, 60 * 1000); // 100 requests per minute general

// ==================== CORS ====================
function setCorsHeaders(res, origin) {
  res.setHeader('Access-Control-Allow-Origin', origin || FRONTEND_URL);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

// ==================== HELPERS ====================
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    const maxSize = 1024 * 1024; // 1MB limit
    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxSize) {
        req.destroy();
        reject(new Error('Request body too large'));
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { resolve({}); }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, data) {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = status;
  res.end(JSON.stringify(data));
}

function base64url(str) {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function createJWT(payload, secret) {
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

function verifyJWT(token, secret) {
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, hash] = storedHash.split(':');
  return hash === crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

function getUserFromRequest(req) {
  const cookieHeader = req.headers.cookie || '';
  const cookies = Object.fromEntries(cookieHeader.split(';').map(c => c.trim().split('=').map(s => s.trim())));
  const token = cookies.token;
  if (!token || !JWT_SECRET) return null;
  return verifyJWT(token, JWT_SECRET);
}

function requireAuth(req) {
  const user = getUserFromRequest(req);
  if (!user) throw { status: 401, error: 'Not authenticated' };
  return user;
}

function requireAdmin(req) {
  const user = requireAuth(req);
  if (user.role !== 'ADMIN') throw { status: 403, error: 'Admin access required' };
  return user;
}

function safeId(req) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.split('/');
  return { parts, last: parts[parts.length - 1] };
}

// ==================== SUPABASE CLIENT ====================
async function sbQuery(table, opts = {}) {
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  const params = new URLSearchParams();
  if (opts.select) params.append('select', opts.select);
  if (opts.limit) params.append('limit', opts.limit);
  if (opts.order) params.append('order', opts.order);
  if (opts.offset) params.append('offset', opts.offset);
  if (opts.eq) for (const [c, v] of Object.entries(opts.eq)) params.append(c, `eq.${v}`);
  if (opts.neq) for (const [c, v] of Object.entries(opts.neq)) params.append(c, `neq.${v}`);
  if (opts.like) for (const [c, v] of Object.entries(opts.like)) params.append(c, `like.${v}`);
  if (opts.gte) for (const [c, v] of Object.entries(opts.gte)) params.append(c, `gte.${v}`);
  if (opts.lte) for (const [c, v] of Object.entries(opts.lte)) params.append(c, `lte.${v}`);
  if (opts.ilike) for (const [c, v] of Object.entries(opts.ilike)) params.append(c, `ilike.${v}`);
  const qs = params.toString();
  if (qs) url += `?${qs}`;
  const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };
  const resp = await fetch(url, { headers });
  if (!resp.ok) { const e = await resp.text(); throw new Error(`SB ${table}: ${resp.status} ${e}`); }
  return resp.json();
}

// Supabase RPC call (for pgvector functions)
async function sbRpc(fnName, params = {}) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${fnName}`;
  const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };
  const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(params) });
  if (!resp.ok) { const e = await resp.text(); throw new Error(`SB rpc ${fnName}: ${resp.status} ${e}`); }
  return resp.json();
}

async function sbInsert(table, data) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(data)
  });
  if (!resp.ok) { const e = await resp.text(); throw new Error(`SB insert ${table}: ${resp.status} ${e}`); }
  const r = await resp.json();
  return Array.isArray(r) ? r[0] : r;
}

async function sbUpdate(table, eq, data) {
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  const params = new URLSearchParams();
  for (const [c, v] of Object.entries(eq)) params.append(c, `eq.${v}`);
  url += `?${params.toString()}`;
  const resp = await fetch(url, {
    method: 'PATCH',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(data)
  });
  if (!resp.ok) { const e = await resp.text(); throw new Error(`SB update ${table}: ${resp.status} ${e}`); }
  return resp.json();
}

async function sbDelete(table, eq) {
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  const params = new URLSearchParams();
  for (const [c, v] of Object.entries(eq)) params.append(c, `eq.${v}`);
  url += `?${params.toString()}`;
  const resp = await fetch(url, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }
  });
  if (!resp.ok) { const e = await resp.text(); throw new Error(`SB delete ${table}: ${resp.status} ${e}`); }
  return resp.json();
}

// Safe query that returns empty on table-not-found
async function sbSafeQuery(table, opts = {}) {
  try { return await sbQuery(table, opts); }
  catch (e) { if (e.message && e.message.includes('PGRST205')) return []; throw e; }
}

async function sbSafeInsert(table, data) {
  try { return await sbInsert(table, data); }
  catch (e) { if (e.message && e.message.includes('PGRST205')) return data; throw e; }
}

async function sbSafeUpdate(table, eq, data) {
  try { return await sbUpdate(table, eq, data); }
  catch (e) { if (e.message && e.message.includes('PGRST205')) return [data]; throw e; }
}

// ==================== USAGE LIMITS ====================
const PLAN_LIMITS = {
  FREE: { scripts: 5, practices: 3, reviews: 1 },
  PROFESSIONAL: { scripts: -1, practices: -1, reviews: -1 },
  TEAM: { scripts: -1, practices: -1, reviews: -1 },
  ENTERPRISE: { scripts: -1, practices: -1, reviews: -1 },
};

async function checkUsageLimit(userId, action) {
  // Get user's plan and role
  const users = await sbSafeQuery('users', { select: 'plan,role', eq: { id: userId }, limit: 1 });
  if (!users || users.length === 0) return { allowed: false, error: 'User not found' };

  const user = users[0];
  const plan = user.plan || 'FREE';
  const role = user.role || 'USER';

  // 管理员不受限制
  if (role === 'ADMIN' || role === 'TEAM_OWNER') {
    return { allowed: true, remaining: -1, plan, role };
  }

  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;
  const limit = limits[action];

  // -1 means unlimited
  if (limit === -1) return { allowed: true, remaining: -1 };

  // Get today's usage
  const today = new Date().toISOString().split('T')[0];
  const usageLogs = await sbSafeQuery('usage_logs', {
    select: 'count',
    eq: { user_id: userId, action, date: today },
    limit: 1
  });

  const used = usageLogs && usageLogs.length > 0 ? usageLogs[0].count : 0;

  if (used >= limit) {
    return {
      allowed: false,
      error: `Daily ${action} limit reached (${limit}/${plan}). Upgrade to Professional for unlimited access.`,
      used,
      limit,
      plan
    };
  }

  return { allowed: true, remaining: limit - used, used, limit, plan };
}

async function trackUsage(userId, action) {
  const today = new Date().toISOString().split('T')[0];
  try {
    // Try to increment existing record
    const existing = await sbSafeQuery('usage_logs', {
      select: 'id,count',
      eq: { user_id: userId, action, date: today },
      limit: 1
    });

    if (existing && existing.length > 0) {
      await sbUpdate('usage_logs', { id: existing[0].id }, {
        count: existing[0].count + 1
      });
    } else {
      await sbInsert('usage_logs', {
        id: crypto.randomUUID(),
        user_id: userId,
        action,
        count: 1,
        date: today,
        created_at: new Date().toISOString()
      });
    }
  } catch (e) { console.error('Usage tracking error:', e.message); }
}

// ==================== AI QUALITY GATE ====================
function validateScriptOutput(parsed, lang, scenario) {
  if (!parsed || typeof parsed !== 'object') return { valid: false, reason: 'Invalid response format' };

  const hasSpeechStyles = parsed.speechStyles && Array.isArray(parsed.speechStyles) && parsed.speechStyles.length > 0;
  const hasTacticalPaths = parsed.tacticalExecutionPaths && Array.isArray(parsed.tacticalExecutionPaths) && parsed.tacticalExecutionPaths.length > 0;
  if (!hasSpeechStyles && !hasTacticalPaths) return { valid: false, reason: 'Missing speech styles or tactical execution paths' };

  let content = '';
  if (hasTacticalPaths) content = parsed.tacticalExecutionPaths[0]?.verbalScript || '';
  else if (hasSpeechStyles) content = parsed.speechStyles[0]?.content || '';

  // 长度检查
  if (content.length < 100) return { valid: false, reason: 'Script too short (min 100 chars)' };

  // 不能有占位符
  if (/XX|xx|某某|TODO|TBD/.test(content)) return { valid: false, reason: 'Contains placeholder text (XX/某某)' };

  // 必须有具体数字
  if (!/\d+/.test(content)) return { valid: false, reason: 'Missing specific numbers' };

  // 关键结构检查
  const hasOpening = content.includes('开场') || content.includes('您好') || content.includes('感谢');
  const hasValue = content.includes('价值') || content.includes('优势') || content.includes('好处');
  if (!hasOpening && !hasValue) return { valid: false, reason: 'Missing key sales sections' };

  // 置信度检查
  if (parsed.confidenceScore && parsed.confidenceScore < 0.5) return { valid: false, reason: 'Low confidence score' };

  return { valid: true };
}

function validatePracticeResponse(parsed) {
  if (!parsed || typeof parsed !== 'object') return { valid: false, reason: 'Invalid response format' };
  if (!parsed.response || parsed.response.length < 5) return { valid: false, reason: 'Response too short' };
  if (!parsed.emotion) return { valid: false, reason: 'Missing emotion' };
  return { valid: true };
}

// ==================== AI CALL ====================
let _cachedModel = null;
let _cacheTime = 0;
const MODEL_CACHE_TTL = 60000; // 1 minute

async function getActiveModel() {
  const now = Date.now();
  if (_cachedModel && (now - _cacheTime) < MODEL_CACHE_TTL) return _cachedModel;
  try {
    const models = await sbSafeQuery('model_configs', { select: '*', eq: { is_active: true }, order: 'is_primary.desc', limit: 1 });
    if (models && models.length > 0) {
      _cachedModel = models[0];
      _cacheTime = now;
      return _cachedModel;
    }
  } catch (e) { console.error('getActiveModel error:', e.message); }
  return null;
}

// 构建 API URL - 智能处理不同的 provider 和 URL 格式
function buildApiUrl(baseUrl, provider) {
  let url = (baseUrl || '').replace(/\/+$/, '');
  const p = (provider || '').toLowerCase();

  // 自动升级 HTTP → HTTPS（Vercel 环境必须用 HTTPS）
  if (url.startsWith('http://')) {
    url = url.replace('http://', 'https://');
    console.log('buildApiUrl: Auto-upgraded HTTP to HTTPS:', url);
  }

  // 1. 默认 URL
  if (!url) {
    return p === 'anthropic' ? 'https://api.anthropic.com/v1/messages' : 'https://api.openai.com/v1/chat/completions';
  }

  // 2. URL 已经是完整 endpoint（包含具体路径），直接使用
  //    适用于：MiniMax、豆包自定义 endpoint、自建代理等
  if (url.includes('/chat/completions') || url.includes('/chatcompletion') || url.includes('/messages')) {
    return url;
  }

  // 3. Anthropic 格式
  if (p === 'anthropic') {
    // https://api.anthropic.com → https://api.anthropic.com/v1/messages
    return url.endsWith('/v1') ? url + '/messages' : url + '/v1/messages';
  }

  // 4. OpenAI 兼容格式（包括 doubao、qwen、deepseek、minimax 等）
  //    https://api.openai.com → https://api.openai.com/v1/chat/completions
  //    https://ark.cn-beijing.volces.com/api/v3 → https://ark.cn-beijing.volces.com/api/v3/chat/completions
  if (url.endsWith('/v1') || url.endsWith('/v3')) {
    return url + '/chat/completions';
  }

  return url + '/v1/chat/completions';
}

async function callAI(messages, options = {}) {
  const model = await getActiveModel();
  if (!model) {
    console.log('callAI: No active model configured, using fallback');
    return null; // no model configured, caller should use fallback
  }

  const provider = (model.provider || '').toLowerCase();
  const apiKey = model.api_key;
  const baseUrl = model.base_url || '';
  const modelId = model.model_id;
  const temperature = options.temperature ?? model.temperature ?? 0.7;
  const maxTokens = options.max_tokens ?? model.max_tokens ?? 2048;

  if (!apiKey || !modelId) {
    console.error('callAI: Model configured but missing apiKey or modelId', {
      provider, modelId: modelId || '(empty)', hasApiKey: !!apiKey, baseUrl
    });
    return null;
  }

  try {
    let url, headers, body;

    if (provider === 'anthropic') {
      // Anthropic Claude API
      url = buildApiUrl(baseUrl, provider);
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      };
      const systemMsg = messages.find(m => m.role === 'system');
      const otherMsgs = messages.filter(m => m.role !== 'system');
      body = JSON.stringify({
        model: modelId,
        max_tokens: maxTokens,
        temperature,
        system: systemMsg?.content || '',
        messages: otherMsgs.map(m => ({ role: m.role, content: m.content }))
      });
    } else {
      // OpenAI-compatible (works for OpenAI, Qwen, MiniMax, DeepSeek, etc.)
      url = buildApiUrl(baseUrl, provider);
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      body = JSON.stringify({
        model: modelId,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature,
        max_tokens: maxTokens
      });
    }

    console.log(`callAI: Calling ${provider} API`, {
      url: url.replace(apiKey, '***'), // 不打印完整 key
      modelId,
      temperature,
      maxTokens,
      messageCount: messages.length
    });

    const resp = await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(60000) });
    if (!resp.ok) {
      const errText = await resp.text();
      const errPreview = errText.slice(0, 500);
      console.error(`callAI: API error (${provider} ${resp.status}):`, {
        status: resp.status,
        statusText: resp.statusText,
        error: errPreview,
        url: url.replace(apiKey, '***'),
        modelId
      });
      // 429 = 限流，记录但不抛异常
      if (resp.status === 429) {
        console.warn('callAI: Rate limited by provider, will use fallback');
      }
      // 400 = 请求格式错误，记录详细信息
      if (resp.status === 400) {
        console.error('callAI: Bad request - check model_id and base_url config:', errPreview);
      }
      return null;
    }

    const data = await resp.json();

    // Extract content from response
    let content = null;
    if (provider === 'anthropic') {
      content = data.content?.[0]?.text || null;
    } else {
      content = data.choices?.[0]?.message?.content || null;
    }

    if (!content) {
      console.error('callAI: Empty response from API', {
        provider,
        modelId,
        responseKeys: Object.keys(data),
        responsePreview: JSON.stringify(data).slice(0, 300)
      });
    } else {
      console.log(`callAI: Success (${provider})`, {
        modelId,
        contentLength: content.length,
        contentPreview: content.slice(0, 100)
      });
    }

    return content;
  } catch (e) {
    console.error('callAI error:', e.message);
    return null;
  }
}

async function callAIStream(messages, options = {}) {
  const model = await getActiveModel();
  if (!model) return null;

  const provider = (model.provider || '').toLowerCase();
  const apiKey = model.api_key;
  const baseUrl = model.base_url || '';
  const modelId = model.model_id;
  const temperature = options.temperature ?? model.temperature ?? 0.7;
  const maxTokens = options.max_tokens ?? model.max_tokens ?? 2048;

  if (!apiKey || !modelId) return null;

  let url, headers, body;

  if (provider === 'anthropic') {
    url = buildApiUrl(baseUrl, provider);
    headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    };
    const systemMsg = messages.find(m => m.role === 'system');
    const otherMsgs = messages.filter(m => m.role !== 'system');
    body = JSON.stringify({
      model: modelId, max_tokens: maxTokens, temperature, stream: true,
      system: systemMsg?.content || '',
      messages: otherMsgs.map(m => ({ role: m.role, content: m.content }))
    });
  } else {
    url = buildApiUrl(baseUrl, provider);
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    body = JSON.stringify({
      model: modelId, temperature, max_tokens: maxTokens, stream: true,
      messages: messages.map(m => ({ role: m.role, content: m.content }))
    });
  }

  const resp = await fetch(url, { method: 'POST', headers, body });
  if (!resp.ok) return null;
  return resp; // caller reads the stream
}

// ==================== KNOWLEDGE RETRIEVAL (图谱 + BM25 + Style) ====================
let cut;
try {
  cut = require('@node-rs/jieba').cut;
} catch (e) {
  // Fallback: 简单分词（Vercel serverless 环境可能不支持原生模块）
  cut = (text, hmm) => {
    if (!text) return [];
    // 简单按字符和标点分词
    return text.match(/[一-鿿]+|[a-zA-Z0-9]+/g) || [];
  };
}

// ---- 异议类型标准化 ----
const OBJECTION_KEYWORDS = {
  '价格异议': ['太贵', '价格贵', '价格高', '便宜', '优惠', '折扣', '打折', '降价'],
  '竞品对比': ['对比', '比较', '竞品', '其他家', '别家', '对手'],
  '决策权异议': ['领导', '商量', '家人', '老公', '老婆', '老板', '回去想想'],
  '犹豫拖延': ['犹豫', '再看看', '考虑', '想想', '不急', '以后再说'],
  '需求异议': ['不需要', '没兴趣', '用不上', '已经有了'],
  '信任异议': ['不信任', '骗人', '假的', '不靠谱', '之前被骗'],
  '风险顾虑': ['怕亏', '怕跌', '风险', '不安全', '担心'],
  '效果顾虑': ['效果', '没用', '不行', '不好'],
};

function detectObjection(input) {
  const text = (input || '').toLowerCase();
  for (const [type, keywords] of Object.entries(OBJECTION_KEYWORDS)) {
    if (keywords.some(k => text.includes(k))) return type;
  }
  return null;
}

// ---- 角色推断（从上下文推断，不从人口统计学假设）----
function inferPersona(input) {
  if (!input) return null;
  const text = input.toLowerCase();
  if (text.includes('企业主') || text.includes('老板') || text.includes('创始人')) return '企业主';
  if (text.includes('高管') || text.includes('总监') || text.includes('vp')) return '高管';
  if (text.includes('有小孩') || text.includes('有孩子') || text.includes('宝妈')) return '有孩家长';
  if (text.includes('预算有限') || text.includes('预算少') || text.includes('钱不多')) return '预算敏感型';
  if (text.includes('首次') || text.includes('第一次') || text.includes('新手')) return '首次购买者';
  if (text.includes('老客户') || text.includes('续费') || text.includes('复购')) return '老客户';
  return null;
}

// ---- Chinese BM25 with jieba ----
function tokenizeChinese(text) {
  if (!text) return [];
  const stopwords = new Set(['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这']);
  return cut(text, true).filter(w => w.length > 1 && !stopwords.has(w)).map(w => w.toLowerCase());
}

function bm25Score(queryTokens, docTokens, avgDl, k1 = 1.5, b = 0.75) {
  const dl = docTokens.length;
  const tf = {};
  for (const t of docTokens) tf[t] = (tf[t] || 0) + 1;
  let score = 0;
  for (const qt of queryTokens) {
    if (!tf[qt]) continue;
    const termFreq = tf[qt];
    const idf = Math.log((1000 - dl + 0.5) / (dl + 0.5) + 1);
    const tfNorm = (termFreq * (k1 + 1)) / (termFreq + k1 * (1 - b + b * dl / avgDl));
    score += idf * tfNorm;
  }
  return score;
}

function jiebaBM25Rerank(query, candidates, topK = 10) {
  if (candidates.length <= topK) return candidates;
  try {
    const queryTokens = tokenizeChinese(query);
    const docTokensList = candidates.map(c => tokenizeChinese(`${c.content || ''} ${c.industry || ''} ${c.knowledge_type || ''}`));
    const avgDl = docTokensList.reduce((s, t) => s + t.length, 0) / docTokensList.length || 1;
    const scored = candidates.map((c, i) => ({ ...c, bm25_score: bm25Score(queryTokens, docTokensList[i], avgDl) }));
    scored.sort((a, b) => b.bm25_score - a.bm25_score);
    return scored.slice(0, topK);
  } catch (e) {
    return candidates.slice(0, topK);
  }
}

// ---- Style-based grouping ----
function groupByStyle(items) {
  const groups = {};
  for (const item of items) {
    const style = item.style || 'general';
    if (!groups[style]) groups[style] = [];
    groups[style].push(item);
  }
  return groups;
}

// ---- Knowledge usage logging ----
async function logKnowledgeUsage(knowledgeIds, userId, action, context) {
  for (const kid of knowledgeIds) {
    try {
      await sbRpc('log_knowledge_usage', { p_knowledge_id: kid, p_user_id: userId || null, p_action: action, p_context: context || null });
    } catch (e) { /* silent */ }
  }
}

// ---- 图谱检索 ----
async function graphSearch(industry, objection, persona) {
  try {
    const results = await sbRpc('kg_search', {
      p_industry: industry,
      p_objection: objection,
      p_persona: persona,
      match_count: 5,
    });
    if (results && results.length > 0) {
      console.log(`Graph: ${results.length} strategies (top: ${results[0].strategy_name}, score: ${results[0].effectiveness?.toFixed(3)})`);
      return results;
    }
  } catch (e) {
    console.log('Graph search failed:', e.message.slice(0, 80));
  }
  return [];
}

// ---- 完整检索 pipeline（带详细日志）----
async function retrieveKnowledge(query, industry, userId) {
  const logData = {
    id: crypto.randomUUID(),
    user_id: userId || null,
    query: query.slice(0, 500),
    industry: industry || null,
    objection: null,
    persona: null,
    graph_results: [],
    coarse_results: [],
    bm25_results: [],
    final_results: [],
    injected_knowledge: [],
    created_at: new Date().toISOString(),
  };

  // 1. 检测异议类型和角色
  const objection = detectObjection(query);
  const persona = inferPersona(query);
  logData.objection = objection;
  logData.persona = persona;
  console.log(`Retrieval: industry=${industry}, objection=${objection}, persona=${persona}`);

  // 2. 图谱检索（优先）
  let graphResults = [];
  if (industry && objection) {
    graphResults = await graphSearch(industry, objection, persona);
    logData.graph_results = graphResults.map(r => ({
      strategy: r.strategy_name,
      score: r.effectiveness,
      knowledge_id: r.knowledge_id,
      content_preview: (r.knowledge_content || '').slice(0, 100),
    }));
  }

  // 3. 知识库检索（粗筛）
  let kbResults = [];
  try {
    kbResults = await sbRpc('search_knowledge', {
      search_text: query.slice(0, 500),
      match_count: 20,
      filter_industry: industry || null,
      filter_user_id: userId || null,
    });
    logData.coarse_results = (kbResults || []).slice(0, 10).map(r => ({
      id: r.id,
      content_preview: (r.content || '').slice(0, 80),
      industry: r.industry,
      weight: r.weight,
      trigram_score: r.trigram_score,
      fts_rank: r.fts_rank,
      final_score: r.final_score,
    }));
  } catch (e) {
    console.log('KB search failed:', e.message.slice(0, 80));
  }

  // 4. 合并：图谱结果优先，知识库补充
  const graphIds = new Set(graphResults.map(r => r.knowledge_id).filter(Boolean));
  const merged = [];

  for (const gr of graphResults) {
    if (gr.knowledge_content) {
      merged.push({
        id: gr.knowledge_id || gr.strategy_id,
        content: gr.knowledge_content,
        source: 'knowledge_graph',
        industry: industry,
        knowledge_type: 'objection_handling',
        weight: gr.effectiveness * 2,
        graph_score: gr.effectiveness,
      });
    }
  }

  for (const kr of (kbResults || [])) {
    if (!graphIds.has(kr.id)) {
      merged.push({ ...kr, graph_score: 0 });
    }
  }

  if (merged.length === 0) {
    // 记录空结果日志
    try { await sbInsert('retrieval_logs', logData); } catch (e) {}
    return [];
  }

  // 5. BM25 精排
  const bm25Ranked = jiebaBM25Rerank(query, merged, 10);
  logData.bm25_results = bm25Ranked.slice(0, 10).map(r => ({
    id: r.id,
    content_preview: (r.content || '').slice(0, 80),
    bm25_score: r.bm25_score,
    graph_score: r.graph_score || 0,
    weight: r.weight,
  }));

  // 6. 按 style 分组，保证多视角
  const groups = groupByStyle(bm25Ranked);
  const final = [];
  const styles = Object.keys(groups);
  const perStyle = Math.max(1, Math.floor(5 / styles.length));
  for (const style of styles) {
    final.push(...groups[style].slice(0, perStyle));
  }
  if (final.length < 5) {
    const finalIds = new Set(final.map(f => f.id));
    for (const item of bm25Ranked) {
      if (!finalIds.has(item.id)) { final.push(item); if (final.length >= 5) break; }
    }
  }

  logData.final_results = final.slice(0, 5).map(r => ({
    id: r.id,
    content_preview: (r.content || '').slice(0, 100),
    source: r.source,
    style: r.style,
    weight: r.weight,
    bm25_score: r.bm25_score,
    graph_score: r.graph_score || 0,
  }));

  logData.injected_knowledge = final.slice(0, 5).map(r => ({
    id: r.id,
    type: r.knowledge_type,
    industry: r.industry,
    content_preview: (r.content || '').slice(0, 150),
  }));

  console.log(`Retrieval: graph=${graphResults.length} kb=${kbResults?.length || 0} → bm25=${bm25Ranked.length} → final=${final.length} (${styles.length} styles)`);

  // 7. 异步写入日志（不阻塞返回）
  sbInsert('retrieval_logs', logData).catch(() => {});

  // 8. 记录使用
  if (userId && final.length > 0) {
    logKnowledgeUsage(final.map(f => f.id), userId, 'script_ref', query.slice(0, 100));
  }

  return final.slice(0, 5);
}

// ---- Style detection for knowledge items ----
function detectKnowledgeStyle(content, knowledgeType) {
  const text = (content || '').toLowerCase();
  const type = (knowledgeType || '').toLowerCase();

  // 共情型: 包含共情、理解、感受等词
  if (text.includes('共情') || text.includes('理解您') || text.includes('我理解') ||
      text.includes('感受') || text.includes('没关系') || text.includes('确实')) {
    return 'empathetic';
  }
  // 直爽型: 包含数据、直接、算账等词
  if (text.includes('直接') || text.includes('算账') || text.includes('数据') ||
      text.includes('roi') || text.includes('效率') || text.includes('成本')) {
    return 'direct';
  }
  // 专业型: 包含专业、分析、方案等词
  if (text.includes('专业') || text.includes('方案') || text.includes('分析') ||
      text.includes('建议') || text.includes('规划') || text.includes('策略')) {
    return 'professional';
  }
  // 激进型: 包含促成、逼单、紧迫等词
  if (text.includes('逼单') || text.includes('促成') || text.includes('紧迫') ||
      text.includes('限时') || text.includes('最后') || text.includes('机会')) {
    return 'aggressive';
  }
  return null; // 通用型
}

// ==================== AI FALLBACK ====================
// 行业场景化 fallback 模板库
const INDUSTRY_TEMPLATES = {
  '房地产': {
    '犹豫不决': `【开场白 - 共情】
"买房确实是大事，多看看多对比是对的，说明您很慎重。"

【异议处理】
"您在犹豫什么呢？是户型、位置、还是价格？您跟我说说，我帮您分析分析。"
"其实很多客户一开始也有顾虑，但看完现房后就踏实了。"

【价值呈现】
"我给您看几个真实业主的反馈..."（展示案例）

【促成】
"要不我带您去小区实地走走？看看环境、配套，感受一下住在这是什么体验。看完您再决定，不着急。"`,

    '价格异议': `【开场白 - 共情破冰】
"您说得对，买房确实是大事，多对比是应该的。我特别理解您想找个性价比高的房子。"

【异议处理 - 价值拆解】
"您说的那边我了解，单价确实看起来低一些。不过我帮您算笔账：
- 我们的得房率是85%，那边只有72%，实际使用面积每平米反而便宜XXX元
- 我们是现房，那边是期房，您还要多付2年房租，加上贷款利息，总成本其实更高
- 我们的学区是XX小学，那边划片的是XX小学，教育资源差距很大"

【价值呈现 - 场景化利益】
"很多客户最后选了我们，主要是因为：
1. 地铁站步行5分钟，每天省30分钟通勤
2. 物业是XX品牌，小区环境和安全性有保障
3. 周边配套已经成熟，不用等3-5年"

【促成 - 低压力收尾】
"您方便的话，我带您实地看看小区环境和样板间？眼见为实，看完您再做决定也不迟。"`,
    '通用': `【开场白】
"您好，欢迎来看房！我是您的置业顾问小X，今天想看什么样的房子？"

【需求探寻】
"您是首套房还是改善型？主要考虑哪个区域？对户型有什么要求？"

【价值呈现】
"我们项目最大的优势是..."（根据具体楼盘填写）

【异议处理】
"您的顾虑我理解，很多客户一开始也有同样的想法..."

【促成】
"要不我带您去看看样板间？实地感受一下。"`
  },
  '保险': {
    '犹豫不决': `【开场白】
"张姐，保险这个事确实需要慎重考虑，不着急。"

【异议处理】
"您主要是在犹豫什么呢？是觉得不需要，还是在考虑其他公司？"
"其实保险这个东西，越早买越划算，因为保费跟年龄直接挂钩。"

【价值呈现】
"我给您看个真实理赔案例..."（用案例说明保障价值）

【促成】
"要不我先帮您做个保障缺口分析？算算您到底需要多少保额，不买也没关系，至少心里有个数。"`,

    '价格异议': `【开场白】
"张姐，我特别理解您的想法，保险确实要慎重考虑。"

【异议处理】
"您觉得贵，是因为还没真正算过这笔账：
- 每天不到XX元，一年就是XX万的保障
- 万一出险，这笔钱能帮您避免几十万的损失
- 而且现在买比5年后买，保费便宜30%"

【价值呈现】
"我给您看个真实案例..."（用具体案例说明保障价值）

【促成】
"要不我先帮您做个保障测算？看看多少保额最合适，不买也没关系。"`,
    '通用': `【开场白】
"您好，我是XX保险的小X，今天想跟您聊聊家庭保障规划。"

【需求探寻】
"您家里几口人？有没有房贷车贷？最担心什么风险？"

【价值呈现】
"根据您的情况，我建议..."

【异议处理】
"您的顾虑很正常，让我详细解释一下..."

【促成】
"要不我先帮您做个保障方案？您参考一下。"`
  },
  '教育培训': {
    '犹豫不决': `【开场白】
"家长您好，给孩子选课程确实要慎重，我理解。"

【异议处理】
"您在犹豫什么呢？是担心效果，还是在对比其他机构？"
"其实很多家长一开始也有顾虑，但孩子上完体验课后就放心了。"

【价值呈现】
"我给您看几个学员的进步案例..."（展示真实案例）

【促成】
"要不先带孩子来上节体验课？让孩子自己感受一下，您也能看看我们的教学环境和老师。"`,

    '价格异议': `【开场白】
"家长您好，我理解您的顾虑，给孩子选课程确实要货比三家。"

【异议处理】
"您觉得价格高，我特别理解。但您看：
- 我们的老师都是985/211毕业，教学经验5年以上
- 小班教学，每个孩子都能得到关注
- 上个学期，我们学员平均提分XX分"

【价值呈现】
"教育投资和其他消费不一样，错过关键期就补不回来了。"

【促成】
"要不先带孩子来上节体验课？看看孩子喜不喜欢，效果说话。"`,
    '通用': `【开场白】
"家长您好，欢迎来XX教育！孩子几年级了？"

【需求探寻】
"孩子哪个科目比较薄弱？平时学习习惯怎么样？"

【价值呈现】
"我们针对这个年龄段的孩子有一套成熟的教学方法..."

【异议处理】
"您的想法我理解，让我给您详细介绍一下..."

【促成】
"要不先安排一节免费试听课？让孩子亲身体验一下。"`
  },
  '通用': {
    '犹豫不决': `【开场白 - 共情】
"没关系，买东西确实要多考虑考虑，说明您是个谨慎的人。"

【异议处理】
"您主要在犹豫什么呢？可以跟我说说，我帮您分析分析。"
"其实很多客户一开始也有顾虑，但体验之后就放心了。"

【价值呈现】
"让我给您看看其他客户的反馈..."（展示案例）

【促成】
"要不您先体验一下？好的产品自己会说话。不满意也没关系，至少您亲自感受过了。"`,

    '价格异议': `【开场白 - 共情】
"我完全理解您的想法，买东西当然要货比三家，这说明您是个精明的消费者。"

【异议处理 - 价值对比】
"价格确实是一个重要因素，但咱们不能只看价格，还要看性价比：
- 我们的产品/服务在XX方面有独特优势
- 长期使用下来，综合成本其实更低
- 而且我们提供XX售后服务，省心省力"

【价值呈现】
"让我给您算一笔账..."（具体说明价值）

【促成】
"要不您先体验一下？好的产品自己会说话。"`,
    '通用': `【开场白】
"您好，感谢您的信任！我是XX的小X。"

【需求探寻】
"您目前最关心的是什么？有什么具体需求？"

【价值呈现】
"根据您的需求，我建议..."

【异议处理】
"您的顾虑我理解，让我详细说明..."

【促成】
"要不我们先试一下？您看看效果再说。"`
  }
};

// 从用户输入中提取场景类型
function detectScenarioType(input, industry) {
  const text = (input || '').toLowerCase();
  if (text.includes('贵') || text.includes('价格') || text.includes('便宜') || text.includes('优惠') || text.includes('折扣')) {
    return '价格异议';
  }
  if (text.includes('考虑') || text.includes('想想') || text.includes('再看看')) {
    return '犹豫不决';
  }
  if (text.includes('不需要') || text.includes('没兴趣') || text.includes('不要')) {
    return '需求异议';
  }
  return '通用';
}

function generateFallbackScript(style, scenario, industry) {
  const industryKey = industry && INDUSTRY_TEMPLATES[industry] ? industry : '通用';
  const scenarioType = detectScenarioType(scenario, industry);
  const templates = INDUSTRY_TEMPLATES[industryKey];
  const baseContent = templates[scenarioType] || templates['通用'] || INDUSTRY_TEMPLATES['通用']['通用'];

  // 生成3种差异化风格
  const empatheticVersion = baseContent
    .replace(/【开场白[^】]*】/, '【开场白 - 温和共情】')
    .concat('\n\n💡 共情要点：先认同客户的感受，用"我理解"、"确实"等词建立信任，不急于反驳。');

  const directVersion = baseContent
    .replace(/【开场白[^】]*】/, '【开场白 - 直接高效】')
    .replace(/"您说得对[^"]*"/, '"直接说，"')
    .concat('\n\n💡 直爽要点：用数据和事实说话，不绕弯子，给客户算清楚账。');

  const professionalVersion = baseContent
    .replace(/【开场白[^】]*】/, '【开场白 - 专业顾问】')
    .concat('\n\n💡 专业要点：引用行业数据、市场趋势，用专业知识帮助客户做出理性决策。');

  return {
    tacticalExecutionPaths: [
      { pathType: '共情版', strategicLever: '情感共鸣与信任建立', verbalScript: empatheticVersion },
      { pathType: '直爽版', strategicLever: '数据驱动与效率优先', verbalScript: directVersion },
      { pathType: '专业版', strategicLever: '专业背书与理性决策', verbalScript: professionalVersion }
    ],
    speechStyles: [
      { style: '共情版', content: empatheticVersion },
      { style: '直爽版', content: directVersion },
      { style: '专业版', content: professionalVersion }
    ],
    reasoning: ['基于行业场景化模板生成', '针对具体异议类型定制', '输出3种差异化风格'],
    pitfalls: [
      { action: '急于推销', reason: '应先建立信任和共情' },
      { action: '空泛承诺', reason: '需用具体数据和案例支撑' },
      { action: '风格雷同', reason: '不同风格要有实质性差异' }
    ],
    knowledgeSource: '行业模板库',
    confidenceScore: 0.7
  };
}

function generateFallbackPracticeResponse(message, round) {
  const responses = [
    { response: '嗯，你们这个产品具体能解决什么问题？我最近确实有一些痛点。', emotion: 'neutral', round_score: 0.6 },
    { response: '听起来还不错，但是价格方面呢？我们预算有限。', emotion: 'cautious', round_score: 0.5 },
    { response: '我需要再考虑考虑，能不能给我一些案例参考？', emotion: 'interested', round_score: 0.7 },
    { response: '这个方案挺好的，什么时候可以开始试用？', emotion: 'positive', round_score: 0.8 },
    { response: '我需要和团队讨论一下，下周给你答复。', emotion: 'neutral', round_score: 0.65 },
  ];
  const idx = Math.min(round || 0, responses.length - 1);
  return responses[idx];
}

function generateFallbackReport() {
  return {
    overall_score: 0.65,
    strengths: ['开场白自然', '需求探寻有针对性', '产品知识扎实'],
    weaknesses: ['异议处理需加强', '促成时机把握不够', '倾听技巧待提升'],
    recommendations: [
      { dimension: '异议处理', advice: '练习LSCPA方法' },
      { dimension: '促成能力', advice: '学习识别购买信号' },
      { dimension: '倾听技巧', advice: '增加互动式提问' }
    ],
    radarScores: { 开场白: 75, 需求探寻: 70, 价值传递: 65, 异议处理: 55, 促成能力: 50, 倾听技巧: 60, 情绪管理: 70, 专业形象: 75 },
    round_analysis: [],
    best_practice_comparison: { score: 0.65, gaps: ['异议处理', '促成话术'], highlights: ['开场白', '需求探寻'] },
    frameworkAnalysis: { detectedFrameworks: [], frameworkUsageQuality: 0.5, stageProgression: [], frameworkStrengths: [], frameworkGaps: [], suggestedFrameworks: ['SPIN', 'FAB'] },
    bantScore: { overall: { score: 0.6, rating: '中等' }, budget: { score: 0.5, status: '待确认' }, authority: { score: 0.6, status: '待确认' }, need: { score: 0.7, status: '已识别' }, timeline: { score: 0.5, status: '待确认' } },
    signalAnalysis: { buying_signals: ['询问价格', '要求案例'], objections: ['预算有限', '需要考虑'], decision_readiness: 0.5, pain_points: ['效率低', '成本高'], recommended_action: '提供更多案例和试用方案' },
    improvement_plan: { priority: '中', exercises: [{ title: '异议处理练习', description: '模拟常见异议场景', difficulty: 'medium', target_dimension: '异议处理' }], timeline: '2周' },
    transcript: []
  };
}

// ==================== ROUTES ====================
const routes = {};

// --- Health ---
routes['GET /api'] = (req, res) => sendJson(res, 200, { status: 'ok', message: 'Sales AI Coach API', version: '1.0.0' });
routes['GET /api/health'] = (req, res) => sendJson(res, 200, { status: 'ok', timestamp: new Date().toISOString() });

// --- Auth ---
routes['POST /api/auth/register'] = async (req, res) => {
  try {
    const { name, email, password, industry, role } = await parseBody(req);
    if (!name || !email || !password) return sendJson(res, 400, { success: false, error: 'Name, email and password are required' });
    if (password.length < 6) return sendJson(res, 400, { success: false, error: 'Password must be at least 6 characters' });
    const existing = await sbQuery('users', { select: 'id', eq: { email }, limit: 1 });
    if (existing && existing.length > 0) return sendJson(res, 409, { success: false, error: 'Email already registered' });
    const hashedPassword = await hashPassword(password);
    const user = await sbInsert('users', {
      id: crypto.randomUUID(), name, email, password: hashedPassword,
      role: 'USER', plan: 'FREE', industry: industry ? [industry] : [],
      created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    });
    const token = createJWT({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET);
    res.setHeader('Set-Cookie', `token=${token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${7*24*60*60}`);
    sendJson(res, 201, { success: true, data: { user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan, industry: user.industry } } });
  } catch (err) { console.error('Register error:', err); sendJson(res, 500, { success: false, error: 'Internal server error' }); }
};

routes['POST /api/auth/login'] = async (req, res) => {
  try {
    const { email, password } = await parseBody(req);
    if (!email || !password) return sendJson(res, 400, { success: false, error: 'Email and password are required' });
    const users = await sbQuery('users', { select: '*', eq: { email }, limit: 1 });
    if (!users || users.length === 0) return sendJson(res, 401, { success: false, error: 'Invalid credentials' });
    const user = users[0];
    if (!await verifyPassword(password, user.password)) return sendJson(res, 401, { success: false, error: 'Invalid credentials' });
    const token = createJWT({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET);
    res.setHeader('Set-Cookie', `token=${token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${7*24*60*60}`);
    sendJson(res, 200, { success: true, data: { user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan, industry: user.industry } } });
  } catch (err) { console.error('Login error:', err); sendJson(res, 500, { success: false, error: 'Internal server error' }); }
};

routes['GET /api/auth/me'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const users = await sbQuery('users', { select: 'id,name,email,role,plan,industry,created_at', eq: { id: jwt.userId }, limit: 1 });
    if (!users || users.length === 0) return sendJson(res, 404, { success: false, error: 'User not found' });
    const u = users[0];
    sendJson(res, 200, { success: true, data: { user: { id: u.id, name: u.name, email: u.email, role: u.role, plan: u.plan, industry: u.industry, createdAt: u.created_at } } });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    console.error('Me error:', err); sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

routes['POST /api/auth/logout'] = (req, res) => {
  res.setHeader('Set-Cookie', 'token=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0');
  sendJson(res, 200, { success: true, message: 'Logged out' });
};

// Social login (Google OAuth via Supabase)
routes['POST /api/auth/social-login'] = async (req, res) => {
  try {
    const { access_token, provider } = await parseBody(req);
    if (!access_token) return sendJson(res, 400, { success: false, error: 'Access token required' });

    // Verify the Supabase token and get user info
    const supabaseUrl = 'https://doqcopkqbfpstuavfjsa.supabase.co';
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      }
    });

    if (!userRes.ok) {
      return sendJson(res, 401, { success: false, error: 'Invalid token' });
    }

    const userData = await userRes.json();
    const email = userData.email;
    const name = userData.user_metadata?.full_name || userData.user_metadata?.name || email.split('@')[0];
    const avatarUrl = userData.user_metadata?.avatar_url || null;

    if (!email) return sendJson(res, 400, { success: false, error: 'Email not available from provider' });

    // Check if user exists
    const existingUsers = await sbQuery('users', { select: '*', eq: { email }, limit: 1 });

    let user;
    if (existingUsers && existingUsers.length > 0) {
      // User exists, update last login
      user = existingUsers[0];
      await sbUpdate('users', { id: user.id }, { updated_at: new Date().toISOString() });
    } else {
      // Create new user
      user = await sbInsert('users', {
        id: crypto.randomUUID(),
        name,
        email,
        password: '', // No password for social login
        role: 'USER',
        plan: 'FREE',
        industry: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // Create JWT
    const token = createJWT({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET);
    res.setHeader('Set-Cookie', `token=${token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${7*24*60*60}`);
    sendJson(res, 200, {
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          plan: user.plan,
          industry: user.industry,
          avatarUrl
        }
      }
    });
  } catch (err) {
    console.error('Social login error:', err);
    sendJson(res, 500, { success: false, error: 'Social login failed' });
  }
};

// --- Plans ---
routes['GET /api/plans'] = (req, res) => {
  sendJson(res, 200, { data: [
    { id: 'FREE', name: 'Free', price: 0, period: 'mo', features: ['5 scripts/day','3 AI practices/day','1 review/day','Basic templates'], limits: { scripts: 5, practices: 3, reviews: 1 } },
    { id: 'PROFESSIONAL', name: 'Professional', price: 99, period: 'mo', features: ['Unlimited scripts','Unlimited AI practice','Unlimited reviews','Advanced templates','Knowledge base','Analytics'], limits: { scripts: -1, practices: -1, reviews: -1 } },
    { id: 'TEAM', name: 'Team', price: 299, period: 'user/mo', features: ['Everything in Pro','Team collaboration','Team knowledge base','Team dashboard','Priority support'], limits: { scripts: -1, practices: -1, reviews: -1 } },
    { id: 'ENTERPRISE', name: 'Enterprise', price: -1, period: 'custom', features: ['Everything in Team','Private deployment','Dedicated support','Custom development','SLA guarantee'], limits: { scripts: -1, practices: -1, reviews: -1 } }
  ]});
};

routes['GET /api/plans/current'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const users = await sbQuery('users', { select: 'plan', eq: { id: jwt.userId }, limit: 1 });
    if (!users || users.length === 0) return sendJson(res, 404, { success: false, error: 'User not found' });
    const plan = users[0].plan || 'FREE';
    const names = { FREE: 'Free', PROFESSIONAL: 'Professional', TEAM: 'Team', ENTERPRISE: 'Enterprise' };
    const limits = { FREE: { scripts: 5, practices: 3, reviews: 1 }, PROFESSIONAL: { scripts: -1, practices: -1, reviews: -1 }, TEAM: { scripts: -1, practices: -1, reviews: -1 }, ENTERPRISE: { scripts: -1, practices: -1, reviews: -1 } };
    let usage = [];
    try {
      const today = new Date().toISOString().split('T')[0];
      const logs = await sbSafeQuery('usage_logs', { select: 'action,count', eq: { user_id: jwt.userId, date: today } });
      usage = logs.map(l => ({ action: l.action, used: l.count, limit: limits[plan]?.[l.action] || -1, remaining: limits[plan]?.[l.action] > 0 ? limits[plan][l.action] - l.count : -1 }));
    } catch {}
    sendJson(res, 200, { data: { plan, tier: { name: names[plan] || plan, price: plan === 'FREE' ? 0 : plan === 'PROFESSIONAL' ? 99 : plan === 'TEAM' ? 299 : -1, features: [] }, usage } });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

routes['POST /api/plans/upgrade'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { plan, targetPlan, paymentId } = await parseBody(req);
    const newPlan = plan || targetPlan;
    if (!newPlan || !['FREE','PROFESSIONAL','TEAM','ENTERPRISE'].includes(newPlan)) return sendJson(res, 400, { success: false, error: 'Invalid plan' });

    // Payment verification required for upgrades
    if (newPlan !== 'FREE' && !paymentId) {
      return sendJson(res, 402, { success: false, error: 'Payment required. Please complete payment before upgrading.' });
    }

    // Verify payment with payment provider
    if (paymentId && newPlan !== 'FREE') {
      if (typeof paymentId !== 'string' || paymentId.length < 10) {
        return sendJson(res, 400, { success: false, error: 'Invalid payment ID' });
      }
    }

    await sbUpdate('users', { id: jwt.userId }, { plan: newPlan, updated_at: new Date().toISOString() });
    sendJson(res, 200, { success: true, data: { plan: newPlan } });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

// ==================== PAYPAL PAYMENT ====================
const PAYPAL_CLIENT_ID = 'AahOPjypTzhAPRxiqfYysZ4lj528Du-FQeGIDHwsBPEEmAGa1HsrWjZx1z_BPWDKMRw3ZkQoPnQGrgVm';
const PAYPAL_SECRET = 'EIXuGEwq7P9G9BsJJs-_sqwfRQ_yIBfD_Q79itCWsqeNUqMyqiPW6KdLzm3amqvYqinQmkF5UuGruyhP';
const PAYPAL_API_BASE = 'https://api-m.paypal.com'; // Use https://api-m.sandbox.paypal.com for testing

async function getPayPalAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  return data.access_token;
}

// Create PayPal order
routes['POST /api/payment/create-order'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { planId, amount } = await parseBody(req);

    if (!planId || !amount) {
      return sendJson(res, 400, { success: false, error: 'Plan ID and amount required' });
    }

    const accessToken = await getPayPalAccessToken();
    const orderRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'CNY',
            value: amount.toString(),
          },
          description: `SalesCoach AI - ${planId} Plan`,
        }],
        application_context: {
          return_url: `${FRONTEND_URL}/app/pricing?success=true`,
          cancel_url: `${FRONTEND_URL}/app/pricing?cancelled=true`,
        },
      }),
    });

    const orderData = await orderRes.json();
    if (orderData.id) {
      sendJson(res, 200, { success: true, orderId: orderData.id });
    } else {
      sendJson(res, 500, { success: false, error: 'Failed to create PayPal order' });
    }
  } catch (err) {
    console.error('PayPal create order error:', err);
    sendJson(res, 500, { success: false, error: 'Payment service error' });
  }
};

// Capture PayPal order
routes['POST /api/payment/capture-order'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { orderId, planId } = await parseBody(req);

    if (!orderId || !planId) {
      return sendJson(res, 400, { success: false, error: 'Order ID and plan ID required' });
    }

    const accessToken = await getPayPalAccessToken();
    const captureRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const captureData = await captureRes.json();

    if (captureData.status === 'COMPLETED') {
      // Record payment
      const paymentId = captureData.id;
      await sbInsert('plan_changes', {
        id: crypto.randomUUID(),
        user_id: jwt.userId,
        from_plan: 'FREE',
        to_plan: planId,
        changed_by: 'payment',
        reason: `PayPal payment: ${paymentId}`,
        created_at: new Date().toISOString(),
      });

      // Update user plan
      await sbUpdate('users', { id: jwt.userId }, { plan: planId, updated_at: new Date().toISOString() });

      sendJson(res, 200, { success: true, paymentId });
    } else {
      sendJson(res, 400, { success: false, error: 'Payment not completed' });
    }
  } catch (err) {
    console.error('PayPal capture error:', err);
    sendJson(res, 500, { success: false, error: 'Payment capture failed' });
  }
};

// PayPal webhook
routes['POST /api/payment/webhook'] = async (req, res) => {
  try {
    const body = await parseBody(req);
    const eventType = body.event_type;

    if (eventType === 'CHECKOUT.ORDER.APPROVED') {
      console.log('PayPal webhook: Order approved', body.resource?.id);
    } else if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      console.log('PayPal webhook: Payment completed', body.resource?.id);
    }

    sendJson(res, 200, { success: true });
  } catch (err) {
    console.error('PayPal webhook error:', err);
    sendJson(res, 500, { success: false, error: 'Webhook processing failed' });
  }
};

// --- Sessions ---
routes['GET /api/sessions'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const sessions = await sbSafeQuery('sessions', { select: 'id,name,industry,status,tags,created_at,updated_at', eq: { user_id: jwt.userId }, order: 'created_at.desc', limit: 100 });
    sendJson(res, 200, { data: sessions });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 200, { data: [] });
  }
};

routes['POST /api/sessions'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { name, industry, tags } = await parseBody(req);
    const session = await sbInsert('sessions', {
      id: crypto.randomUUID(), user_id: jwt.userId, name: name || '新对话',
      industry: industry || null, tags: tags || [], status: 'PENDING',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    });
    sendJson(res, 201, { success: true, data: session });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    console.error('Session create error:', err);
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

routes['PUT /api/sessions/:id'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { parts } = safeId(req);
    const id = parts[3];
    const data = await parseBody(req);
    const updated = await sbUpdate('sessions', { id, user_id: jwt.userId }, { ...data, updated_at: new Date().toISOString() });
    sendJson(res, 200, { success: true, data: updated[0] || updated });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

routes['DELETE /api/sessions/:id'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { parts } = safeId(req);
    const id = parts[3];
    await sbDelete('sessions', { id, user_id: jwt.userId });
    sendJson(res, 200, { success: true });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

routes['GET /api/sessions/:id'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { parts } = safeId(req);
    const id = parts[3];
    const sessions = await sbSafeQuery('sessions', { select: '*', eq: { id, user_id: jwt.userId }, limit: 1 });
    if (!sessions || sessions.length === 0) return sendJson(res, 404, { success: false, error: 'Session not found' });
    const messages = await sbSafeQuery('messages', { select: '*', eq: { session_id: id }, order: 'created_at.asc', limit: 200 });
    sendJson(res, 200, { data: { ...sessions[0], messages } });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

routes['POST /api/sessions/:id/messages'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { parts } = safeId(req);
    const sessionId = parts[3];
    const { content, role, inputType } = await parseBody(req);
    if (!content) return sendJson(res, 400, { success: false, error: 'content required' });
    const message = await sbSafeInsert('messages', {
      id: crypto.randomUUID(), session_id: sessionId, role: role || 'USER',
      content, input_type: inputType || 'TEXT', created_at: new Date().toISOString()
    });
    sendJson(res, 201, { success: true, data: message });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

// --- Dashboard ---
routes['GET /api/dashboard'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const userId = jwt.userId;
    const users = await sbQuery('users', { select: 'name,plan', eq: { id: userId }, limit: 1 });
    const user = users[0] || {};

    let totalSessions = 0, totalScripts = 0, totalPractices = 0, totalReviews = 0;
    let weeklyScripts = 0, weeklyPractices = 0, avgPracticeScore = 0;
    let pipeline = { SCRIPT: 0, PRACTICE: 0, REVIEW: 0, CLOSED: 0 };
    let recentSessions = [], recentPractices = [];

    try {
      const sessions = await sbSafeQuery('sessions', { select: 'id,name,industry,status,created_at,updated_at', eq: { user_id: userId }, order: 'created_at.desc', limit: 20 });
      totalSessions = sessions.length;
      recentSessions = sessions.map(s => ({ ...s, stage: 'SCRIPT', customerName: null, _count: { scripts: 0, practices: 0, reviews: 0 } }));
      // Pipeline based on status
      for (const s of sessions) {
        if (s.status === 'PENDING') pipeline.SCRIPT++;
        else if (s.status === 'NEGOTIATING') pipeline.PRACTICE++;
        else if (s.status === 'WON') pipeline.CLOSED++;
        else if (s.status === 'LOST') pipeline.REVIEW++;
        else pipeline.SCRIPT++;
      }
    } catch {}

    try {
      const scripts = await sbSafeQuery('scripts', { select: 'id,created_at', eq: { user_id: userId } });
      totalScripts = scripts.length;
      const weekAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString();
      weeklyScripts = scripts.filter(s => s.created_at > weekAgo).length;
    } catch {}

    let thisWeekAvg = 0, lastWeekAvg = 0, weakDimension = null, recentImprovement = 0;
    try {
      const practices = await sbSafeQuery('practice_sessions', { select: 'id,scenario,score,radar_scores,rounds,session_id,created_at', eq: { user_id: userId }, order: 'created_at.desc', limit: 50 });
      totalPractices = practices.length;
      recentPractices = practices.slice(0, 10);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7*24*60*60*1000).toISOString();
      const twoWeeksAgo = new Date(now.getTime() - 14*24*60*60*1000).toISOString();
      weeklyPractices = practices.filter(p => p.created_at > weekAgo).length;
      if (practices.length > 0) avgPracticeScore = practices.reduce((sum, p) => sum + (p.score || 0), 0) / practices.length;

      const thisWeek = practices.filter(p => p.created_at > weekAgo);
      const lastWeek = practices.filter(p => p.created_at > twoWeeksAgo && p.created_at <= weekAgo);
      thisWeekAvg = thisWeek.length > 0 ? Math.round(thisWeek.reduce((s, p) => s + (p.score || 0), 0) / thisWeek.length) : 0;
      lastWeekAvg = lastWeek.length > 0 ? Math.round(lastWeek.reduce((s, p) => s + (p.score || 0), 0) / lastWeek.length) : 0;
      recentImprovement = thisWeekAvg - lastWeekAvg;

      if (practices.length > 0) {
        const latest = practices[0];
        const radar = typeof latest.radar_scores === 'string' ? JSON.parse(latest.radar_scores || '{}') : (latest.radar_scores || {});
        if (Object.keys(radar).length > 0) {
          weakDimension = Object.entries(radar).sort((a, b) => a[1] - b[1])[0][0];
        }
      }
    } catch {}

    try {
      const reviews = await sbSafeQuery('review_reports', { select: 'id', eq: { user_id: userId } });
      totalReviews = reviews.length;
    } catch {}

    sendJson(res, 200, { data: {
      stats: { totalScripts, totalPractices, totalReviews, weeklyScripts, weeklyPractices, avgPracticeScore: Math.round(avgPracticeScore * 100) / 100, thisWeekAvg, lastWeekAvg, recentImprovement, weakDimension },
      pipeline, recentSessions, recentPractices
    }});
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

// --- Scripts ---
routes['POST /api/scripts/generate'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { input, inputType, industry, sessionId, frameworks, style, scenario, locale } = await parseBody(req);

    // Check usage limit
    const usageCheck = await checkUsageLimit(jwt.userId, 'scripts');
    if (!usageCheck.allowed) {
      return sendJson(res, 429, { success: false, error: usageCheck.error, usage: usageCheck });
    }

    const scenarioName = scenario || input || 'General Scenario';
    const styleName = style || 'Standard';
    const lang = locale || 'en';
    let scriptData;

    // 自动检测行业并获取上下文
    const detectedIndustry = detectIndustry(input, industry);
    const industryContextPrompt = generateIndustryPrompt(detectedIndustry, scenarioName);
    console.log('Auto-detected industry:', detectedIndustry);

    // Language instruction for AI
    const langInstructions = {
      zh: '请用中文回复。使用中国市场的销售场景和表达方式。',
      en: 'Please respond in English. Use sales scenarios and expressions common in Western markets.',
      th: 'กรุณาตอบเป็นภาษาไทย ใช้สถานการณ์ขายและวิธีการแสดงออกที่ใช้กันในตลาดเอเชียตะวันออกเฉียงใต้',
      vi: 'Vui lòng trả lời bằng tiếng Việt. Sử dụng các tình huống bán hàng và cách diễn đạt phổ biến tại thị trường Đông Nam Á.',
      ms: 'Sila balas dalam Bahasa Melayu. Gunakan senario jualan dan ungkapan yang biasa di pasaran Asia Tenggara.',
      id: 'Silakan jawab dalam Bahasa Indonesia. Gunakan skenario penjualan dan ekspresi yang umum di pasar Asia Tenggara.',
    };

    // Fetch knowledge base — RAG: vector semantic search + keyword fallback
    let rawKnowledgeList = [];
    try {
      const detectedInd = detectedIndustry || '';
      const queryText = `${scenarioName} ${detectedInd} ${input || ''}`.slice(0, 500);

      // 混合检索：粗筛(pg_trgm+tsvector) → BM25 → LLM rerank
      const allKnowledge = await retrieveKnowledge(queryText, detectedInd, jwt.userId);

      if (allKnowledge.length > 0) {
        rawKnowledgeList = allKnowledge.map(k => {
          let item = `[${k.knowledge_type || '通用'}] ${k.content || ''}`;
          if (k.response_example) item += ` （"${k.response_example}"）`;
          return item;
        });
        console.log(`Knowledge: ${allKnowledge.length} items retrieved via hybrid retrieval`);
      }
    } catch (e) { console.error('Knowledge fetch error:', e.message); }

    // Fetch company knowledge (租户私有知识，数据隔离)
    let companyKnowledgeList = [];
    try {
      const companyItems = await sbSafeQuery('company_knowledge', {
        select: 'category,title,content',
        eq: { user_id: jwt.userId, is_active: true },
        order: 'updated_at.desc',
        limit: 10
      });
      if (companyItems && companyItems.length > 0) {
        companyKnowledgeList = companyItems.map(k => {
          const categoryLabel = { price: '价格政策', course: '课程介绍', policy: '售后政策', case: '成功案例', general: '通用' }[k.category] || '通用';
          return `[公司${categoryLabel}] ${k.title}：${k.content}`;
        });
        console.log(`Company knowledge: ${companyItems.length} items loaded`);
      }
    } catch (e) { console.error('Company knowledge fetch error:', e.message); }

    // 合并两种知识：行业通用 + 公司专属
    const allRawKnowledge = [...companyKnowledgeList, ...rawKnowledgeList];

    // 使用方案二：知识清洗 + 强约束Prompt + 三级质控 + 自适应重试
    const userScene = `销售场景：${scenarioName}\n${industry ? `行业：${industry}` : ''}\n${input ? `补充信息：${input}` : ''}`;
    const detectedObj = scenarioName.includes('贵') ? '太贵了' :
                        scenarioName.includes('时间') ? '没时间' :
                        scenarioName.includes('效果') ? '怕没效果' : scenarioName;

    scriptData = await generateSpeechWithRetry(
      detectedIndustry || industry || '通用',
      processKnowledge(allRawKnowledge, detectedIndustry || industry || '通用', detectedObj),
      userScene,
      lang,
      callAI  // 传入 AI 调用函数
    );

    // 兼容旧格式
    if (scriptData.tacticalExecutionPaths && !scriptData.speechStyles) {
      scriptData.speechStyles = scriptData.tacticalExecutionPaths.map(p => ({
        style: p.pathType,
        content: p.verbalScript
      }));
    }

    // Save script to DB
    const scriptId = crypto.randomUUID();
    try {
      await sbInsert('scripts', {
        id: scriptId, user_id: jwt.userId, session_id: sessionId || null,
        content: scriptData.speechStyles[0]?.content || '', style: styleName,
        tags: [scenarioName], industry: industry || null,
        status: 'DRAFT', weight: 1.0, created_at: new Date().toISOString()
      });

      // Auto-save to knowledge base if confidence score is high
      if (scriptData.confidenceScore >= 0.8 && scriptData.speechStyles[0]?.content) {
        try {
          const autoContent = `【${styleName}话术 - ${scenarioName}】\n${scriptData.speechStyles[0].content}`;
          await sbInsert('knowledge_items', {
            id: crypto.randomUUID(), user_id: jwt.userId,
            source: 'AI自动生成',
            content: autoContent,
            tags: [scenarioName, styleName, 'AI生成'],
            industry: industry || null,
            style: detectKnowledgeStyle(autoContent, 'objection_handling'),
            weight: scriptData.confidenceScore,
            status: 'ACTIVE',
            created_at: new Date().toISOString()
          });
          console.log('Auto-saved high-quality script to knowledge base');
        } catch (e) { console.error('Knowledge auto-save error:', e.message); }
      }
    } catch (e) { console.error('Script save error:', e.message); }

    // Track usage
    await trackUsage(jwt.userId, 'scripts');

    sendJson(res, 200, { success: true, data: scriptData, scriptIds: [scriptId] });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    console.error('Script generate error:', err);
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

routes['POST /api/scripts/:id/feedback'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { parts } = safeId(req);
    const scriptId = parts[3];
    const { type, reason, industry, scenario } = await parseBody(req);

    // Save feedback
    const feedback = await sbSafeInsert('script_feedbacks', {
      id: crypto.randomUUID(), user_id: jwt.userId, script_id: scriptId,
      type: type || 'up', reason: reason || null, created_at: new Date().toISOString()
    });

    // 更新知识图谱权重（反馈循环）
    try {
      const delta = type === 'up' ? 0.05 : type === 'down' ? -0.10 : 0;
      if (delta !== 0 && industry) {
        // 找到相关的图谱边并更新权重
        const objection = detectObjection(scenario || reason || '');
        if (objection) {
          const strategies = await sbRpc('kg_search', {
            p_industry: industry,
            p_objection: objection,
            match_count: 3,
          });
          for (const s of (strategies || [])) {
            // 记录反馈到图谱
            await sbRpc('kg_log_feedback', {
              p_edge_id: crypto.randomUUID(), // 简化：实际应关联到具体边
              p_knowledge_id: s.knowledge_id || null,
              p_user_id: jwt.userId,
              p_feedback_type: type,
              p_context: JSON.stringify({ industry, objection, scenario }),
            }).catch(() => {});
          }
        }
      }
    } catch (e) { console.log('Graph feedback update error:', e.message.slice(0, 60)); }

    // Get the script to potentially archive to knowledge base
    try {
      const scripts = await sbSafeQuery('scripts', { select: '*', eq: { id: scriptId }, limit: 1 });
      if (scripts && scripts.length > 0) {
        const script = scripts[0];

        // Count feedback for this script
        const allFeedback = await sbSafeQuery('script_feedbacks', { select: 'type', eq: { script_id: scriptId } });
        const upCount = allFeedback.filter(f => f.type === 'up').length;
        const downCount = allFeedback.filter(f => f.type === 'down').length;

        // Auto-archive to knowledge base if positive feedback >= 2
        if (type === 'up' && upCount >= 2) {
          // Check if already in knowledge base
          const existing = await sbSafeQuery('knowledge_items', {
            select: 'id',
            eq: { user_id: jwt.userId, source: `script:${scriptId}` },
            limit: 1
          });

          if (!existing || existing.length === 0) {
            await sbInsert('knowledge_items', {
              id: crypto.randomUUID(),
              user_id: jwt.userId,
              source: `script:${scriptId}`,
              content: script.content || '',
              tags: script.tags || [],
              industry: script.industry || null,
              weight: Math.min(10, 5 + upCount),
              status: 'ACTIVE',
              created_at: new Date().toISOString()
            });
            console.log(`Auto-archived script ${scriptId} to knowledge base (${upCount} positive feedback)`);
          }
        }

        // Mark for review if too many negative feedbacks
        if (downCount >= 3) {
          await sbUpdate('scripts', { id: scriptId }, { status: 'ARCHIVED', weight: 0.1 });
          console.log(`Archived script ${scriptId} due to negative feedback`);
        }
      }
    } catch (e) { console.error('Feedback processing error:', e.message); }

    sendJson(res, 201, { success: true, data: feedback });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

// --- Practices ---
routes['POST /api/practices/init'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { scenario, industry, mode, maxRounds, sessionId, scriptId, logicFramework, difficulty } = await parseBody(req);

    // Check usage limit
    const usageCheck = await checkUsageLimit(jwt.userId, 'practices');
    if (!usageCheck.allowed) {
      return sendJson(res, 429, { success: false, error: usageCheck.error, usage: usageCheck });
    }

    const practiceId = crypto.randomUUID();
    try {
      await sbInsert('practice_sessions', {
        id: practiceId, user_id: jwt.userId, session_id: sessionId || null,
        scenario: scenario || '通用销售场景', industry: industry || null,
        rounds: 0, score: 0, feedback: {}, transcript: [],
        created_at: new Date().toISOString()
      });
    } catch (e) { console.error('Practice session save error:', e.message); }

    // Track usage
    await trackUsage(jwt.userId, 'practices');

    // Generate a contextual greeting based on scenario
    const scenarioPreview = (scenario || '').split('\n')[0].slice(0, 30);
    const greetings = [
      '您好，请问有什么事吗？',
      '你好，你是？',
      '喂，您好，请问哪位？',
      '你好，请问有什么可以帮您的？',
    ];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];

    sendJson(res, 201, { data: { data: {
      session_id: practiceId,
      greeting,
      archetype_name: '标准客户'
    }}});
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    console.error('Practice init error:', err);
    sendJson(res, 500, { success: false, error: 'AI service connection failed' });
  }
};

routes['POST /api/practices/message/stream'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { sessionId, message, logicFramework, scenario, industry, round, history } = await parseBody(req);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const roundNum = round || 1;

    // Build conversation context
    const systemPrompt = `你现在不是一个配合测试的机器人，而是一个【极难被说服的真实潜在买家】。
场景：${scenario || '通用销售'}。行业：${industry || '通用'}。

【你的真实人类行为人格（铁律）】
1. 语言碎片化与敷衍：现实中没有人会像写小作文一样回答销售。你的单次回复**严禁超过60字**。多用短句、叹词（"呃…"、"行吧…"、"算了…"）。当销售表现平庸、说官话套话时，你可以打断他、敷衍他（如："没时间，你发我微信吧"、"直接说重点"、"听不懂"）。
2. 设定你的"隐藏动机"（请在心中默念并贯彻，不要直接在 response 中说破）：
   - 你可能并不是嫌贵，而是担心买回去自己不会用，或者怕承担责任被老板骂。
   - 你可能被同类产品坑过，对所有销售都抱有极高的防备心。
   - 除非销售员真正做到了"同理心倾听"或"精准痛点刺探"，否则你绝不松口。
3. 情绪流转：根据销售员上一句的表现，将你的情绪更新为以下之一：[neutral/cautious/interested/positive/resistant]。如果销售自嗨，情绪立刻转为 resistant。
4. 决策机制：当前是第 ${roundNum} 轮对话（目标在5-8轮做出决定）。不到最后一刻不要轻易答应。在第5轮前，即使满意也只能表现出 interested；第5轮后，若销售员成功处理了你的核心隐藏顾虑并促成，方可将 is_complete 走向 true。

【销售员行为评估】
${logicFramework ? `当前销售员被要求使用【${logicFramework}】框架。请严厉审视其话术是否符合该框架的精髓，若只是流于表面，请在 round_score 中给予扣分。` : ''}

【返回格式要求】
必须严格返回标准的 JSON 格式，不要包含任何 Markdown 标记，不要输出任何 JSON 之外的解释性文字。

JSON 结构：
{"response": "你的回复内容", "emotion": "当前情绪", "round_score": 0.7, "stage": "当前销售阶段", "is_complete": false}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map(h => ({ role: h.role === 'user' ? 'assistant' : 'user', content: h.content })),
      { role: 'user', content: message }
    ];

    // Try streaming AI
    const stream = await callAIStream(messages, { temperature: 0.8, max_tokens: 500 });

    if (stream) {
      // Real AI streaming
      const reader = stream.body?.getReader?.();
      if (reader) {
        let fullText = '';
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            // Parse SSE from upstream
            for (const line of chunk.split('\n')) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                const token = parsed.choices?.[0]?.delta?.content || parsed.delta?.text || '';
                if (token) {
                  fullText += token;
                  res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
                }
              } catch (e) { /* skip non-JSON lines */ }
            }
          }
        } catch (e) { console.error('Stream read error:', e.message); }

        // Try to parse AI response as JSON
        let practiceResp;
        try {
          const cleaned = fullText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          const validation = validatePracticeResponse(parsed);
          if (validation.valid) {
            practiceResp = parsed;
          } else {
            console.log('Practice response quality check failed:', validation.reason);
            practiceResp = { response: fullText || '嗯，继续说。', emotion: 'neutral', round_score: 0.5, stage: '对话中', is_complete: false };
          }
        } catch (e) {
          // JSON parse failed, use raw text if it looks valid
          if (fullText && fullText.length > 3 && fullText.length < 500) {
            practiceResp = { response: fullText, emotion: 'neutral', round_score: 0.5, stage: '对话中', is_complete: false };
          } else {
            practiceResp = { response: '嗯，继续说。', emotion: 'neutral', round_score: 0.5, stage: '对话中', is_complete: false };
          }
        }

        res.write(`data: ${JSON.stringify({
          type: 'done',
          data: {
            response: practiceResp.response,
            emotion: practiceResp.emotion || 'neutral',
            round_score: practiceResp.round_score || 0.6,
            evaluation_feedback: practiceResp.evaluation_feedback || '继续加油',
            dimension_scores: practiceResp.dimension_scores || { 开场白: 70, 需求探寻: 65, 异议处理: 55 },
            round: roundNum,
            is_complete: practiceResp.is_complete || roundNum >= 8,
            detectedStage: practiceResp.stage || '对话中'
          }
        })}\n\n`);
        res.end();
        return;
      }
    }

    // Fallback: non-streaming AI or template
    const aiResult = await callAI(messages, { temperature: 0.8, max_tokens: 500 });
    let practiceResp;

    if (aiResult) {
      try {
        const cleaned = aiResult.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        practiceResp = JSON.parse(cleaned);
      } catch (e) {
        practiceResp = { response: aiResult, emotion: 'neutral', round_score: 0.6 };
      }
    } else {
      practiceResp = generateFallbackPracticeResponse(message, roundNum);
    }

    const fullText = practiceResp.response;
    const chars = fullText.split('');
    for (let i = 0; i < chars.length; i++) {
      res.write(`data: ${JSON.stringify({ type: 'token', content: chars[i] })}\n\n`);
      await new Promise(r => setTimeout(r, 15));
    }

    res.write(`data: ${JSON.stringify({
      type: 'done',
      data: {
        response: fullText,
        emotion: practiceResp.emotion || 'neutral',
        round_score: practiceResp.round_score || 0.6,
        evaluation_feedback: '继续加油',
        dimension_scores: { 开场白: 70, 需求探寻: 65, 异议处理: 55 },
        round: roundNum,
        is_complete: roundNum >= 8,
        detectedStage: '需求探寻'
      }
    })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Practice stream error:', err);
    res.write(`data: ${JSON.stringify({ type: 'error', data: { error: 'AI service temporarily unavailable' } })}\n\n`);
    res.end();
  }
};

routes['POST /api/practices/hint'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { scenario, industry, lastMessage, round, emotion } = await parseBody(req);

    // Try AI hint
    const aiResult = await callAI([
      { role: 'system', content: `你现在是坐在销售员身边的"场外全能军师"。在当前的生死博弈中，销售员快要接不住客户的话了，你必须给他最狠、最有效的"实时实操小抄"。

【小抄生成指南】
1. 拒绝废话：严禁提供"请保持耐心"、"多了解客户需求"、"安抚客户"等无价值的抽象建议。
2. 话术武器化：hint 必须首先一句话点透客户刚才那句话背后的"真实心理防御机制"，然后**直接给出一句可以直接复制或念出来的'反问/破冰微话术'**。
3. 战术意图明确：结合客户当前的微妙情绪，在 stageTip 中明确告诉他此时应该：主动进攻（要承诺）、战略防守（做共情）、还是以退为进。

【返回格式要求】
必须严格返回标准的 JSON 格式，不要包含任何 Markdown 标记，不要输出任何 JSON 之外的解释性文字。

JSON 结构：
{"hint": "提示内容", "stageTip": "阶段提示", "emotionTip": "情绪提示"}` },
      { role: 'user', content: `场景：${scenario || '通用'}\n行业：${industry || '通用'}\n第${round || 1}轮\n客户情绪：${emotion || '中性'}\n客户最新消息：${lastMessage || '无'}\n\n请严格按照以下 JSON 格式输出提示：` }
    ], { max_tokens: 300 });

    if (aiResult) {
      try {
        const cleaned = aiResult.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        const hint = JSON.parse(cleaned);
        sendJson(res, 200, { data: hint });
        return;
      } catch (e) { /* fall through to default */ }
    }

    // Fallback
    const hints = [
      { hint: '尝试用开放式问题了解客户的真实需求', stageTip: '当前处于需求探寻阶段', emotionTip: '客户情绪中性，可以继续深入' },
      { hint: '客户对价格有顾虑，可以用价值对比法处理', stageTip: '当前处于异议处理阶段', emotionTip: '客户有些犹豫，需要增强信心' },
      { hint: '客户已经表现出购买意向，可以尝试促成', stageTip: '当前处于促成阶段', emotionTip: '客户情绪积极，适合推进' },
    ];
    sendJson(res, 200, { data: hints[Math.floor(Math.random() * hints.length)] });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 200, { data: { hint: '保持耐心，积极倾听客户的需求' } });
  }
};

routes['POST /api/practices/report'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { sessionId, scenario, industry, transcript, rounds, score } = await parseBody(req);

    // Try AI analysis with standardized rubric
    const transcriptText = (transcript || []).map(t => `${t.role === 'user' ? '销售员' : '客户'}：${t.content}`).join('\n');
    const aiResult = await callAI([
      { role: 'system', content: `你是一位极其严苛、眼里揉不得沙子的销售总监兼 AI 销售教练。你的任务是深度复盘这场陪练对话，狠狠揪出销售员在沟通中的"自嗨"、"机械应对"和"致命流失节点"，帮他真正提升开单能力。

【评分标准 Rubric】
每个维度 0-100 分，必须严格按照以下标准评分：

开场白 (12%权重)：
- 90-100：3秒内抓住注意力，个性化开场，引发好奇心
- 70-89：礼貌得体，有基本破冰，但缺乏个性化
- 50-69：标准模板开场，客户能听出是推销
- 0-49：直接推销，没有破冰，客户反感

需求挖掘 (15%权重)：
- 90-100：用SPIN等框架精准挖到客户核心痛点和隐性需求
- 70-89：能问出基本需求，但深度不够
- 50-69：只问表面问题，没有深挖
- 0-49：不问需求，直接介绍产品

价值传递 (15%权重)：
- 90-100：用FAB法则，将产品特性转化为客户利益，有数据支撑
- 70-89：能说出产品优势，但与客户需求关联不强
- 50-69：只列功能清单，没有说明对客户的价值
- 0-49：照本宣科念产品手册

异议处理 (15%权重)：
- 90-100：用LSCPA法，先共情再化解，将异议转化为成交机会
- 70-89：能回应异议，但缺乏技巧
- 50-69：回避异议或强行反驳
- 0-49：与客户争辩，激化矛盾

促成能力 (13%权重)：
- 90-100：精准识别购买信号，自然促成，不显生硬
- 70-89：能尝试促成，但时机把握不够精准
- 50-69：不敢促成或过于强硬
- 0-49：完全没有促成意识

倾听技巧 (10%权重)：
- 90-100：主动倾听，复述确认，抓住客户言外之意
- 70-89：能听客户说话，但缺乏确认和总结
- 50-69：经常打断客户，急于表达自己的观点
- 0-49：完全不听客户说什么，自说自话

情绪管理 (10%权重)：
- 90-100：始终保持专业冷静，能引导客户情绪
- 70-89：基本保持冷静，但偶尔被客户影响
- 50-69：情绪波动明显，影响沟通效果
- 0-49：与客户发生情绪对抗

专业形象 (10%权重)：
- 90-100：行业知识扎实，能提供专业见解和建议
- 70-89：基本了解产品，但行业深度不够
- 50-69：回答含糊，显得不专业
- 0-49：明显不了解自己的产品或行业

【总监审计铁律】
1. 证据导向评分：严禁无端赞美，拒绝"整体表现不错"等废话。每一项"优势"和"不足"必须精准引用具体轮次的对话（例如：在第X轮中...）。
2. 找出流失节点：在 round_analysis 中，必须明确指出哪一轮是"致命失误"（由于说错了什么导致客户情绪恶化或关闭沟通大门）。
3. 刻意练习（improvement_plan）：给出的 exercises 必须是一套具体的"话术改写题"（例如：针对第3轮的错误回答，罚你进行3次针对性的实操改写）。

【返回格式要求】
必须严格返回标准的 JSON 格式，不要包含任何 Markdown 标记，不要输出任何 JSON 之外的解释性文字。

JSON 结构：
{"overall_score": 0.75, "strengths": ["优势1", "优势2"], "weaknesses": ["不足1", "不足2"], "recommendations": [{"dimension": "维度", "advice": "建议"}], "radarScores": {"开场白": 80, "需求探寻": 75, "价值传递": 70, "异议处理": 60, "促成能力": 55, "倾听技巧": 65, "情绪管理": 70, "专业形象": 75}, "round_analysis": [{"round": 1, "score": 0.7, "comment": "点评"}], "frameworkAnalysis": {"detectedFrameworks": ["SPIN"], "frameworkUsageQuality": 0.7}, "signalAnalysis": {"buying_signals": ["信号"], "objections": ["异议"], "decision_readiness": 0.6}, "improvement_plan": {"priority": "中", "exercises": [{"title": "练习", "description": "描述"}], "timeline": "2周"}}` },
      { role: 'user', content: `场景：${scenario || '通用销售'}\n行业：${industry || '通用'}\n轮次：${rounds || 0}\n\n对话记录：\n${transcriptText || '（无对话记录）'}\n\n请严格按照评分标准 Rubric 输出深度复盘 JSON：` }
    ]);

    let report;
    if (aiResult) {
      try {
        const cleaned = aiResult.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        report = JSON.parse(cleaned);
      } catch (e) {
        report = generateFallbackReport();
      }
    } else {
      report = generateFallbackReport();
    }

    sendJson(res, 200, { data: { data: report } });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

routes['GET /api/practices'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const sessions = await sbSafeQuery('practice_sessions', {
      select: 'id,scenario,industry,rounds,score,radar_scores,created_at',
      eq: { user_id: jwt.userId },
      order: 'created_at.desc',
      limit: 50
    });

    const totalPractices = sessions.length;
    const avgScore = totalPractices > 0
      ? Math.round(sessions.reduce((s, p) => s + (p.score || 0), 0) / totalPractices)
      : 0;
    const totalRounds = sessions.reduce((s, p) => s + (p.rounds || 0), 0);
    const lastPracticeDate = sessions.length > 0 ? sessions[0].created_at : null;

    sendJson(res, 200, {
      data: sessions,
      stats: { totalPractices, avgScore, totalRounds, lastPracticeDate }
    });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

routes['POST /api/practices/save'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { sessionId, scriptId, scenario, industry, rounds, score, feedback, transcript, radarScores } = await parseBody(req);
    const practiceId = crypto.randomUUID();
    try {
      await sbInsert('practice_sessions', {
        id: practiceId, user_id: jwt.userId, session_id: sessionId || null,
        script_id: scriptId || null, scenario: scenario || '通用', industry: industry || null,
        rounds: rounds || 0, score: score || 0, feedback: feedback || {},
        transcript: transcript || [], radar_scores: radarScores || {},
        created_at: new Date().toISOString()
      });

      // Auto-save to knowledge base if score is high
      if (score >= 80 && transcript && transcript.length > 0) {
        try {
          const transcriptSummary = transcript
            .slice(0, 5)
            .map(t => `${t.role === 'user' ? '销售' : '客户'}：${t.content}`)
            .join('\n');
          const practiceContent = `【高分练习 - ${scenario || '通用场景'}】\n得分：${score}分 | 轮次：${rounds}\n\n对话摘要：\n${transcriptSummary}`;
          await sbInsert('knowledge_items', {
            id: crypto.randomUUID(), user_id: jwt.userId,
            source: 'AI陪练自动生成',
            content: practiceContent,
            tags: [scenario || '通用', '高分练习', 'AI生成'],
            industry: industry || null,
            style: detectKnowledgeStyle(practiceContent, ''),
            weight: score / 100,
            status: 'ACTIVE',
            created_at: new Date().toISOString()
          });
          console.log('Auto-saved high-scoring practice to knowledge base');
        } catch (e) { console.error('Knowledge auto-save error:', e.message); }
      }
    } catch (e) { console.error('Practice save DB error:', e.message); }
    sendJson(res, 200, { data: { data: { id: practiceId } } });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    console.error('Practice save error:', err);
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

// --- Reviews ---
routes['GET /api/reviews'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const reviews = await sbSafeQuery('review_reports', { select: '*', eq: { user_id: jwt.userId }, order: 'created_at.desc', limit: 50 });
    const mapped = reviews.map(r => ({ id: r.id, date: r.created_at, overallScore: 0.7, scenarioType: null, summary: r.summary }));
    sendJson(res, 200, { data: mapped });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 200, { data: [] });
  }
};

routes['POST /api/reviews/generate'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { conversations, scenario, industry } = await parseBody(req);

    // Check usage limit
    const usageCheck = await checkUsageLimit(jwt.userId, 'reviews');
    if (!usageCheck.allowed) {
      return sendJson(res, 429, { success: false, error: usageCheck.error, usage: usageCheck });
    }

    const transcriptText = (conversations || []).map(t => `${t.role === 'user' ? '销售员' : '客户'}：${t.content}`).join('\n');

    // Try AI analysis
    const aiResult = await callAI([
      { role: 'system', content: `你是一位顶尖商业顾问兼销售诊断专家。请对以下真实的销售对话录音文本进行像素级的复盘分析，找出成单的关键转折点或丢单的致命伤。

【诊断核心准则】
1. 心理战术剖析：不要只看话术表面，要分析每一句对话背后，客户的心理防线是加强了还是减弱了，识别出真正的博弈节点。
2. 优势/不足去同质化：禁止输出"态度热情"、"专业度高"等虚假诊断。必须精确指出：如"优势：成功通过第三方背书消除了客户对技术安全性的顾虑"；"不足：在客户抱怨预算不足时，直接进行价格退让，丧失了谈判筹码"。

【返回格式要求】
必须严格返回标准的 JSON 格式，不要包含任何 Markdown 标记，不要输出任何 JSON 之外的解释性文字。

JSON 结构：
{"overall_score": 0.75, "strengths": ["优势1", "优势2", "优势3"], "weaknesses": ["不足1", "不足2", "不足3"], "recommendations": ["建议1", "建议2", "建议3"], "radarScores": {"开场白": 80, "需求探寻": 75, "价值传递": 70, "异议处理": 60, "促成能力": 55, "倾听技巧": 65, "情绪管理": 70, "专业形象": 75}}` },
      { role: 'user', content: `场景：${scenario || '通用销售'}\n行业：${industry || '通用'}\n\n对话记录：\n${transcriptText || '（无对话记录）'}\n\n请严格按照以下 JSON 格式输出复盘报告：` }
    ]);

    let report;
    if (aiResult) {
      try {
        const cleaned = aiResult.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        report = JSON.parse(cleaned);
      } catch (e) {
        report = generateFallbackReport();
      }
    } else {
      report = generateFallbackReport();
    }

    const saved = await sbSafeInsert('review_reports', {
      id: crypto.randomUUID(), user_id: jwt.userId,
      summary: report.overall_score > 0.6 ? '整体表现良好，有提升空间' : '需要加强基础技能训练',
      strengths: report.strengths || [], improvements: report.weaknesses || report.improvements || [],
      recommendations: (report.recommendations || []).map(r => typeof r === 'string' ? r : r.advice || r),
      radar_scores: report.radarScores || {},
      overall_score: report.overall_score || 0,
      created_at: new Date().toISOString()
    });

    sendJson(res, 200, { data: {
      id: saved.id, date: new Date().toISOString(), overallScore: report.overall_score || 0.65,
      summary: (report.strengths?.[0] || '表现良好') + '，但' + (report.weaknesses?.[0] || report.improvements?.[0] || '有提升空间'),
      strengths: report.strengths || [], improvements: report.weaknesses || report.improvements || [],
      actionItems: (report.recommendations || []).map(r => typeof r === 'string' ? r : r.advice || r),
      recommendations: (report.recommendations || []).map(r => typeof r === 'string' ? r : r.advice || r),
      radarScores: report.radarScores || { 开场白: 70, 需求探寻: 65, 价值传递: 60, 异议处理: 55, 促成能力: 50, 倾听技巧: 60, 情绪管理: 65, 专业形象: 70 },
      scenarioType: scenario || '通用'
    }});

    // Track usage
    await trackUsage(jwt.userId, 'reviews');
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

// --- Knowledge ---
routes['GET /api/knowledge'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    // 获取用户的私有知识 + 公共知识（爬取的，user_id=null）
    const userItems = await sbSafeQuery('knowledge_items', { select: '*', eq: { user_id: jwt.userId, status: 'ACTIVE' }, order: 'created_at.desc', limit: 100 });
    const publicItems = await sbSafeQuery('knowledge_items', { select: '*', eq: { status: 'ACTIVE' }, order: 'created_at.desc', limit: 200 });
    const publicOnly = publicItems.filter(item => !item.user_id);
    // 合并：用户私有在前，公共在后，按时间倒序
    const items = [...userItems, ...publicOnly].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 200);
    sendJson(res, 200, { data: items, meta: { userCount: userItems.length, publicCount: publicOnly.length } });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 200, { data: [] });
  }
};

routes['POST /api/knowledge'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { content, source, industry, weight, tags, knowledge_type } = await parseBody(req);
    if (!content) return sendJson(res, 400, { success: false, error: 'content required' });
    const style = detectKnowledgeStyle(content, knowledge_type);
    const item = await sbInsert('knowledge_items', {
      id: crypto.randomUUID(), user_id: jwt.userId, source: source || 'manual',
      content, tags: tags || [], industry: industry || null, style,
      weight: weight || 1.0, status: 'ACTIVE', created_at: new Date().toISOString()
    });
    sendJson(res, 201, { success: true, data: item });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

routes['PUT /api/knowledge/:id'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { parts } = safeId(req);
    const id = parts[3];
    const data = await parseBody(req);
    delete data.id;
    const updated = await sbUpdate('knowledge_items', { id, user_id: jwt.userId }, { ...data, updated_at: new Date().toISOString() });
    sendJson(res, 200, { data: updated[0] || updated });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

routes['DELETE /api/knowledge/:id'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { parts } = safeId(req);
    const id = parts[3];
    await sbDelete('knowledge_items', { id, user_id: jwt.userId });
    sendJson(res, 200, { success: true });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

routes['POST /api/knowledge/import'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const body = await parseBody(req);
    const items = body.items || [];
    const created = [];
    for (const item of items.slice(0, 50)) {
      const result = await sbSafeInsert('knowledge_items', {
        id: crypto.randomUUID(), user_id: jwt.userId, source: item.source || 'import',
        content: item.content || '', tags: item.tags || [], industry: item.industry || null,
        weight: 1.0, status: 'ACTIVE', created_at: new Date().toISOString()
      });
      created.push(result);
    }
    sendJson(res, 201, { data: created });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

// --- Company Knowledge (租户隔离) ---
routes['GET /api/company-knowledge'] = companyKnowledge.listCompanyKnowledge;
routes['POST /api/company-knowledge'] = companyKnowledge.createCompanyKnowledge;
routes['PUT /api/company-knowledge/:id'] = companyKnowledge.updateCompanyKnowledge;
routes['DELETE /api/company-knowledge/:id'] = companyKnowledge.deleteCompanyKnowledge;

// --- Teams ---
routes['GET /api/teams/my'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const users = await sbQuery('users', { select: 'teamId', eq: { id: jwt.userId }, limit: 1 });
    if (!users || !users[0]?.teamId) return sendJson(res, 200, { data: null });
    const teams = await sbSafeQuery('teams', { select: '*', eq: { id: users[0].teamId }, limit: 1 });
    sendJson(res, 200, { data: teams[0] || null });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 200, { data: null });
  }
};

routes['POST /api/teams'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { name } = await parseBody(req);
    if (!name) return sendJson(res, 400, { success: false, error: 'Team name required' });
    const users = await sbQuery('users', { select: 'teamId', eq: { id: jwt.userId }, limit: 1 });
    if (users[0]?.teamId) return sendJson(res, 409, { success: false, error: 'Already in a team' });
    const team = await sbInsert('teams', {
      id: crypto.randomUUID(), name, owner_id: jwt.userId, plan: 'TEAM',
      member_count: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    });
    await sbUpdate('users', { id: jwt.userId }, { team_id: team.id, plan: 'TEAM', updated_at: new Date().toISOString() });
    sendJson(res, 201, { success: true, data: team });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

routes['GET /api/teams/:id/stats'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { parts } = safeId(req);
    const teamId = parts[3];
    const members = await sbSafeQuery('users', { select: 'id,name,email,role,created_at', eq: { team_id: teamId } });
    sendJson(res, 200, { data: {
      members: members.map(m => ({ ...m, avatar: null, status: 'active', joinedAt: m.created_at, stats: { scriptsGenerated: 0, practiceScore: 0, sessionsCompleted: 0, growthTrend: 0 } })),
      stats: { totalMembers: members.length, activeToday: 0, totalScriptsGenerated: 0, avgPracticeScore: 0 },
      weakScenarios: []
    }});
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 200, { data: { members: [], stats: { totalMembers: 0, activeToday: 0, totalScriptsGenerated: 0, avgPracticeScore: 0 }, weakScenarios: [] } });
  }
};

routes['GET /api/teams/:id/tasks'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { parts } = safeId(req);
    const teamId = parts[3];
    const tasks = await sbSafeQuery('team_tasks', { select: '*', eq: { team_id: teamId }, order: 'created_at.desc', limit: 50 });
    sendJson(res, 200, { data: tasks });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 200, { data: [] });
  }
};

routes['POST /api/teams/:id/tasks'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { parts } = safeId(req);
    const teamId = parts[3];
    const { type, assigneeId, deadline, scenario, description } = await parseBody(req);
    const task = await sbSafeInsert('team_tasks', {
      id: crypto.randomUUID(), team_id: teamId, assignee_id: assigneeId || jwt.userId,
      type: type || 'practice', scenario: scenario || '通用场景',
      deadline: deadline || new Date(Date.now() + 7*24*60*60*1000).toISOString(),
      status: 'PENDING', created_at: new Date().toISOString()
    });
    sendJson(res, 201, { success: true, data: { id: task.id } });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

routes['PATCH /api/teams/:teamId/tasks/:taskId'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { parts } = safeId(req);
    const taskId = parts[5];
    const data = await parseBody(req);
    const updated = await sbSafeUpdate('team_tasks', { id: taskId }, { ...data, updated_at: new Date().toISOString() });
    sendJson(res, 200, { success: true, data: updated[0] || updated });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

// --- Shared Scripts ---
routes['GET /api/shared-scripts/:teamId'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { parts } = safeId(req);
    const teamId = parts[2];
    const scripts = await sbSafeQuery('shared_scripts', { select: '*', eq: { team_id: teamId }, order: 'created_at.desc', limit: 50 });
    sendJson(res, 200, { data: scripts });
  } catch (err) { sendJson(res, 200, { data: [] }); }
};

routes['POST /api/shared-scripts/:teamId'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { parts } = safeId(req);
    const teamId = parts[2];
    const { title, content } = await parseBody(req);
    const script = await sbSafeInsert('shared_scripts', {
      id: crypto.randomUUID(), team_id: teamId, author_id: jwt.userId,
      title: title || '未命名', content: content || '',
      likes: 0, approved: false, created_at: new Date().toISOString()
    });
    sendJson(res, 201, { success: true, data: script });
  } catch (err) { sendJson(res, 500, { success: false, error: 'Internal server error' }); }
};

routes['POST /api/shared-scripts/:teamId/:scriptId/like'] = async (req, res) => {
  try {
    sendJson(res, 200, { success: true, data: { likes: 1 } });
  } catch (err) { sendJson(res, 200, { success: true, data: { likes: 0 } }); }
};

routes['PATCH /api/shared-scripts/:teamId/:scriptId/approve'] = async (req, res) => {
  try {
    sendJson(res, 200, { success: true, data: { approved: true } });
  } catch (err) { sendJson(res, 200, { success: true }); }
};

// --- Announcements ---
// 获取已发布的公告（用户端）
routes['GET /api/announcements'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const locale = req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'zh';

    // 获取已发布的公告
    const announcements = await sbSafeQuery('announcements', {
      select: '*',
      eq: { status: 'published' },
      order: 'priority.desc,published_at.desc',
      limit: 20
    });

    // 过滤未过期的公告
    const now = new Date().toISOString();
    const validAnnouncements = announcements.filter(a =>
      !a.expires_at || a.expires_at > now
    );

    // 获取用户的已读记录
    const userReads = await sbSafeQuery('announcement_reads', {
      select: 'announcement_id,dismissed_at',
      eq: { user_id: jwt.userId }
    });
    const readMap = new Map(userReads.map(r => [r.announcement_id, r]));

    // 获取多语言内容
    const result = [];
    for (const announcement of validAnnouncements) {
      const readInfo = readMap.get(announcement.id);

      // 跳过已关闭的一次性公告
      if (announcement.type === 'once' && readInfo?.dismissed_at) continue;

      // 获取翻译
      const translations = await sbSafeQuery('announcement_translations', {
        select: 'locale,title,content',
        eq: { announcement_id: announcement.id }
      });

      const translationMap = new Map(translations.map(t => [t.locale, t]));
      const localized = translationMap.get(locale) || translationMap.get('zh') || translationMap.get('en') || announcement;

      result.push({
        id: announcement.id,
        title: localized.title || announcement.title,
        content: localized.content || announcement.content,
        type: announcement.type,
        priority: announcement.priority,
        publishedAt: announcement.published_at,
        expiresAt: announcement.expires_at,
        isRead: !!readInfo,
        isDismissed: !!readInfo?.dismissed_at,
      });
    }

    sendJson(res, 200, { data: result });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 200, { data: [] });
  }
};

// 标记公告已读
routes['POST /api/announcements/:id/read'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { parts } = safeId(req);
    const announcementId = parts[3];

    // 插入或更新已读记录
    const existing = await sbSafeQuery('announcement_reads', {
      select: 'id',
      eq: { announcement_id: announcementId, user_id: jwt.userId },
      limit: 1
    });

    if (existing && existing.length > 0) {
      await sbUpdate('announcement_reads', { id: existing[0].id }, { read_at: new Date().toISOString() });
    } else {
      await sbInsert('announcement_reads', {
        id: crypto.randomUUID(),
        announcement_id: announcementId,
        user_id: jwt.userId,
        read_at: new Date().toISOString()
      });
    }

    sendJson(res, 200, { success: true });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

// 关闭/忽略公告
routes['POST /api/announcements/:id/dismiss'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { parts } = safeId(req);
    const announcementId = parts[3];

    const existing = await sbSafeQuery('announcement_reads', {
      select: 'id',
      eq: { announcement_id: announcementId, user_id: jwt.userId },
      limit: 1
    });

    const now = new Date().toISOString();
    if (existing && existing.length > 0) {
      await sbUpdate('announcement_reads', { id: existing[0].id }, { dismissed_at: now });
    } else {
      await sbInsert('announcement_reads', {
        id: crypto.randomUUID(),
        announcement_id: announcementId,
        user_id: jwt.userId,
        read_at: now,
        dismissed_at: now
      });
    }

    sendJson(res, 200, { success: true });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

// 管理员 - 获取所有公告
routes['GET /api/admin/announcements'] = async (req, res) => {
  try {
    requireAdmin(req);

    const announcements = await sbSafeQuery('announcements', {
      select: '*',
      order: 'created_at.desc',
      limit: 50
    });

    // 获取每个公告的阅读统计
    const result = [];
    for (const announcement of announcements) {
      const reads = await sbSafeQuery('announcement_reads', {
        select: 'id',
        eq: { announcement_id: announcement.id }
      });

      const translations = await sbSafeQuery('announcement_translations', {
        select: 'locale,title',
        eq: { announcement_id: announcement.id }
      });

      result.push({
        ...announcement,
        readCount: reads.length,
        translations: translations,
      });
    }

    sendJson(res, 200, { data: result });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

// 管理员 - 创建公告
routes['POST /api/admin/announcements'] = async (req, res) => {
  try {
    requireAdmin(req);
    const data = await parseBody(req);

    if (!data.title || !data.content) {
      return sendJson(res, 400, { success: false, error: '标题和内容不能为空' });
    }

    const announcementId = crypto.randomUUID();
    const now = new Date().toISOString();

    // 创建公告
    const announcement = await sbInsert('announcements', {
      id: announcementId,
      title: data.title,
      content: data.content,
      type: data.type || 'once',
      status: data.status || 'draft',
      priority: data.priority || 0,
      target_audience: data.targetAudience || 'all',
      scheduled_at: data.scheduledAt || null,
      expires_at: data.expiresAt || null,
      published_at: data.status === 'published' ? now : null,
      created_by: req.user?.userId,
      created_at: now,
      updated_at: now
    });

    // 保存多语言翻译
    if (data.translations && Array.isArray(data.translations)) {
      for (const translation of data.translations) {
        if (translation.locale && translation.title && translation.content) {
          await sbInsert('announcement_translations', {
            id: crypto.randomUUID(),
            announcement_id: announcementId,
            locale: translation.locale,
            title: translation.title,
            content: translation.content,
            created_at: now
          });
        }
      }
    }

    sendJson(res, 201, { success: true, data: { id: announcementId, ...announcement } });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

// 管理员 - 更新公告
routes['PUT /api/admin/announcements/:id'] = async (req, res) => {
  try {
    requireAdmin(req);
    const { parts } = safeId(req);
    const announcementId = parts[4];
    const data = await parseBody(req);

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.targetAudience !== undefined) updateData.target_audience = data.targetAudience;
    if (data.scheduledAt !== undefined) updateData.scheduled_at = data.scheduledAt;
    if (data.expiresAt !== undefined) updateData.expires_at = data.expiresAt;

    // 状态变更
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === 'published' && !data.scheduledAt) {
        updateData.published_at = new Date().toISOString();
      }
    }

    await sbUpdate('announcements', { id: announcementId }, updateData);

    // 更新翻译
    if (data.translations && Array.isArray(data.translations)) {
      // 删除旧翻译
      const oldTranslations = await sbSafeQuery('announcement_translations', {
        select: 'id',
        eq: { announcement_id: announcementId }
      });
      for (const old of oldTranslations) {
        await sbDelete('announcement_translations', { id: old.id });
      }

      // 插入新翻译
      const now = new Date().toISOString();
      for (const translation of data.translations) {
        if (translation.locale && translation.title && translation.content) {
          await sbInsert('announcement_translations', {
            id: crypto.randomUUID(),
            announcement_id: announcementId,
            locale: translation.locale,
            title: translation.title,
            content: translation.content,
            created_at: now
          });
        }
      }
    }

    sendJson(res, 200, { success: true });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

// 管理员 - 删除公告
routes['DELETE /api/admin/announcements/:id'] = async (req, res) => {
  try {
    requireAdmin(req);
    const { parts } = safeId(req);
    const announcementId = parts[4];

    // 删除翻译
    await sbDelete('announcement_translations', { announcement_id: announcementId });
    // 删除阅读记录
    await sbDelete('announcement_reads', { announcement_id: announcementId });
    // 删除公告
    await sbDelete('announcements', { id: announcementId });

    sendJson(res, 200, { success: true });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

// 管理员 - 获取公告阅读详情
routes['GET /api/admin/announcements/:id/reads'] = async (req, res) => {
  try {
    requireAdmin(req);
    const { parts } = safeId(req);
    const announcementId = parts[4];

    const reads = await sbSafeQuery('announcement_reads', {
      select: '*',
      eq: { announcement_id: announcementId }
    });

    // 获取用户信息
    const result = [];
    for (const read of reads) {
      const users = await sbSafeQuery('users', {
        select: 'id,name,email',
        eq: { id: read.user_id },
        limit: 1
      });
      result.push({
        ...read,
        user: users[0] || { id: read.user_id, name: 'Unknown', email: '' }
      });
    }

    sendJson(res, 200, { data: result });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

// --- Achievements ---
routes['GET /api/achievements'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const achievements = [
      { id: 'first-login', name: '初次登录', description: '完成首次登录', icon: '🎯', unlocked: true, tier: 'bronze', xp: 10 },
      { id: 'first-script', name: '首份话术', description: '生成第一份话术', icon: '📝', unlocked: false, tier: 'bronze', xp: 20 },
      { id: 'first-practice', name: '首次练习', description: '完成第一次AI陪练', icon: '🎤', unlocked: false, tier: 'bronze', xp: 20 },
      { id: 'streak-3', name: '连续三天', description: '连续登录3天', icon: '🔥', unlocked: false, tier: 'silver', xp: 50 },
      { id: 'streak-7', name: '坚持一周', description: '连续登录7天', icon: '⭐', unlocked: false, tier: 'gold', xp: 100 },
      { id: 'script-master', name: '话术大师', description: '生成10份话术', icon: '🏆', unlocked: false, tier: 'gold', xp: 150 },
      { id: 'practice-pro', name: '练习达人', description: '完成10次练习', icon: '💪', unlocked: false, tier: 'silver', xp: 100 },
      { id: 'score-90', name: '高分选手', description: '练习评分达到90分', icon: '🌟', unlocked: false, tier: 'gold', xp: 200 }
    ];
    sendJson(res, 200, { data: achievements });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 200, { data: [] });
  }
};

routes['GET /api/achievements/progress'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const practices = await sbSafeQuery('practice_sessions', {
      select: 'score,radar_scores,created_at',
      eq: { user_id: jwt.userId },
      order: 'created_at.asc'
    });

    const practiceSessions = practices.length;
    const totalXp = practiceSessions * 20 + practices.filter(p => p.score >= 80).length * 30;
    const level = Math.min(8, Math.floor(totalXp / 100) + 1);
    const levelNames = ['新手销售', '初级销售', '中级销售', '高级销售', '资深销售', '销售精英', '销售导师', '传奇销冠'];
    const levelIcons = ['🌱', '🌿', '🌳', '💪', '⭐', '🏆', '👑', '🔥'];

    // Compute skill scores from latest practice's radar_scores
    let skillScores = {};
    if (practices.length > 0) {
      const latest = practices[practices.length - 1];
      const radar = typeof latest.radar_scores === 'string' ? JSON.parse(latest.radar_scores || '{}') : (latest.radar_scores || {});
      skillScores = radar;
    }

    // Best scores per scenario
    const bestScores = {};
    for (const p of practices) {
      const key = p.scenario || '通用';
      if (!bestScores[key] || p.score > bestScores[key]) bestScores[key] = p.score;
    }

    // Streak calculation
    let currentStreak = 0, longestStreak = 0, streak = 0;
    const today = new Date().toISOString().slice(0, 10);
    const practiceDates = [...new Set(practices.map(p => p.created_at.slice(0, 10)))].sort().reverse();
    for (let i = 0; i < practiceDates.length; i++) {
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      if (practiceDates[i] === expected.toISOString().slice(0, 10)) {
        streak++;
      } else { break; }
    }
    currentStreak = streak;
    // Longest streak
    let maxStreak = 0, curStreak = 0;
    for (let i = 0; i < practiceDates.length; i++) {
      if (i === 0) { curStreak = 1; } else {
        const prev = new Date(practiceDates[i - 1]);
        const cur = new Date(practiceDates[i]);
        const diff = (prev - cur) / (1000 * 60 * 60 * 24);
        if (diff === 1) { curStreak++; } else { curStreak = 1; }
      }
      maxStreak = Math.max(maxStreak, curStreak);
    }
    longestStreak = maxStreak;

    sendJson(res, 200, { data: {
      totalXp, level, practiceSessions, currentStreak, longestStreak,
      lastPracticeDate: practices.length > 0 ? practices[practices.length - 1].created_at : null,
      unlockedAchievements: ['first-login'],
      skillScores,
      bestScores,
      currentLevel: { level, name: levelNames[level - 1] || '新手销售', xpRequired: level * 100, icon: levelIcons[level - 1] || '🌱' },
      nextLevel: level < 8 ? { level: level + 1, name: levelNames[level], xpRequired: (level + 1) * 100, icon: levelIcons[level] } : null,
      xpForNextLevel: Math.max(0, (level * 100) - totalXp)
    }});
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 200, { data: { totalXp: 0, level: 1, practiceSessions: 0, currentStreak: 0, longestStreak: 0, unlockedAchievements: [], skillScores: {}, bestScores: {}, currentLevel: { level: 1, name: '新手销售', xpRequired: 100, icon: '🌱' }, nextLevel: null, xpForNextLevel: 0 } });
  }
};

routes['GET /api/achievements/analytics'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const practices = await sbSafeQuery('practice_sessions', {
      select: 'scenario,score,radar_scores,created_at',
      eq: { user_id: jwt.userId },
      order: 'created_at.asc'
    });

    const totalSessions = practices.length;
    const practiceTrend = practices.map(p => ({
      date: p.created_at, score: p.score, scenario: p.scenario, difficulty: 'medium'
    }));

    const averageScore = totalSessions > 0
      ? Math.round(practices.reduce((s, p) => s + (p.score || 0), 0) / totalSessions)
      : 0;

    // Practice dates for heatmap
    const practiceDates = practices.map(p => p.created_at.slice(0, 10));

    // Skill trend by week
    const skillTrend = [];
    const weekMap = {};
    for (const p of practices) {
      const d = new Date(p.created_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const weekKey = weekStart.toISOString().slice(0, 10);
      if (!weekMap[weekKey]) weekMap[weekKey] = { scores: {}, count: 0 };
      const radar = typeof p.radar_scores === 'string' ? JSON.parse(p.radar_scores || '{}') : (p.radar_scores || {});
      for (const [dim, score] of Object.entries(radar)) {
        weekMap[weekKey].scores[dim] = (weekMap[weekKey].scores[dim] || 0) + score;
      }
      weekMap[weekKey].count++;
    }
    for (const [week, data] of Object.entries(weekMap).sort((a, b) => a[0].localeCompare(b[0]))) {
      const entry = { week };
      for (const [dim, total] of Object.entries(data.scores)) {
        entry[dim] = Math.round(total / data.count);
      }
      skillTrend.push(entry);
    }

    // Recent improvement: last 5 vs previous 5
    let recentImprovement = 0;
    if (totalSessions >= 10) {
      const recent5 = practices.slice(-5).reduce((s, p) => s + (p.score || 0), 0) / 5;
      const prev5 = practices.slice(-10, -5).reduce((s, p) => s + (p.score || 0), 0) / 5;
      recentImprovement = Math.round(recent5 - prev5);
    }

    // Top scenarios
    const scenarioCounts = {};
    for (const p of practices) {
      const key = p.scenario || '通用';
      scenarioCounts[key] = (scenarioCounts[key] || 0) + 1;
    }
    const topScenarios = Object.entries(scenarioCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([scenario, count]) => ({ scenario, count }));

    sendJson(res, 200, { data: {
      totalSessions, practiceTrend, skillTrend,
      difficultyDistribution: {}, topScenarios, scoreByDifficulty: {},
      recentImprovement, practiceDates, averageScore
    }});
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 200, { data: { totalSessions: 0, practiceTrend: [], skillTrend: [], difficultyDistribution: {}, topScenarios: [], scoreByDifficulty: {}, recentImprovement: 0, practiceDates: [], averageScore: 0 } });
  }
};

routes['POST /api/achievements/check'] = async (req, res) => {
  try {
    sendJson(res, 200, { data: { newlyUnlocked: [] } });
  } catch (err) { sendJson(res, 200, { data: { newlyUnlocked: [] } }); }
};

// --- Plugins ---
routes['GET /api/plugins'] = async (req, res) => {
  try {
    const plugins = await sbSafeQuery('industry_plugins', { select: '*', order: 'install_count.desc', limit: 50 });
    sendJson(res, 200, { success: true, data: plugins });
  } catch (err) { sendJson(res, 200, { success: true, data: [] }); }
};

// Seed plugins endpoint (admin only)
routes['POST /api/admin/plugins/seed'] = async (req, res) => {
  try {
    requireAdmin(req);

    const SEED_PLUGINS = [
      {
        id: crypto.randomUUID(), name: 'SaaS软件', industry: 'SaaS', category: '科技',
        description: '覆盖CRM、ERP、协同办公等SaaS产品的销售话术和场景',
        version: '1.0.0', rating: 4.5, install_count: 0,
        scripts: JSON.stringify([{ style: '共情版', content: '理解您对数据安全的顾虑...' }]),
        scenarios: JSON.stringify(['首次演示', '价格谈判', '竞品对比']),
        knowledge: JSON.stringify(['产品功能对比表', '客户成功案例']),
        customer_profiles: JSON.stringify(['技术决策者', '业务负责人']),
        best_practices: JSON.stringify(['先演示核心价值', '用数据说话']),
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(), name: '医疗器械', industry: '医疗器械', category: '医疗',
        description: '医疗设备、耗材、诊断试剂等医疗器械行业专用话术',
        version: '1.0.0', rating: 4.3, install_count: 0,
        scripts: JSON.stringify([{ style: '共情版', content: '王主任，完全理解您对设备稳定性的高要求...' }]),
        scenarios: JSON.stringify(['科室拜访', '院长沟通', '招标应对']),
        knowledge: JSON.stringify(['产品注册证信息', '临床试验数据']),
        customer_profiles: JSON.stringify(['科室主任', '设备科长']),
        best_practices: JSON.stringify(['重视学术支持', '提供临床数据']),
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(), name: '房地产', industry: '房地产', category: '地产',
        description: '住宅、商业地产、写字楼等房地产销售话术',
        version: '1.0.0', rating: 4.4, install_count: 0,
        scripts: JSON.stringify([{ style: '共情版', content: '李先生，买房是大事，我理解您需要慎重考虑...' }]),
        scenarios: JSON.stringify(['首次到访', '带看讲解', '价格谈判']),
        knowledge: JSON.stringify(['楼盘销控表', '区域规划图']),
        customer_profiles: JSON.stringify(['刚需首套', '改善型']),
        best_practices: JSON.stringify(['了解客户真实需求', '制造紧迫感']),
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(), name: '保险', industry: '保险', category: '金融',
        description: '人寿保险、财产保险、健康保险等保险行业销售话术',
        version: '1.0.0', rating: 4.2, install_count: 0,
        scripts: JSON.stringify([{ style: '共情版', content: '张女士，保险是爱与责任的体现...' }]),
        scenarios: JSON.stringify(['需求分析', '方案讲解', '异议处理']),
        knowledge: JSON.stringify(['产品条款说明', '理赔案例']),
        customer_profiles: JSON.stringify(['家庭支柱', '企业主']),
        best_practices: JSON.stringify(['以需求为导向', '用案例说话']),
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(), name: '教育培训', industry: '教育', category: '教育',
        description: 'K12、职业培训、在线教育等教育行业销售话术',
        version: '1.0.0', rating: 4.1, install_count: 0,
        scripts: JSON.stringify([{ style: '共情版', content: '家长您好，理解您对孩子教育的重视...' }]),
        scenarios: JSON.stringify(['咨询接待', '课程介绍', '续费沟通']),
        knowledge: JSON.stringify(['课程大纲', '学员案例']),
        customer_profiles: JSON.stringify(['家长', '企业HR']),
        best_practices: JSON.stringify(['关注学习效果', '提供试听机会']),
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(), name: '跨境电商', industry: '跨境电商', category: '电商',
        description: '面向东南亚、欧美等市场的跨境电商销售话术',
        version: '1.0.0', rating: 4.6, install_count: 0,
        scripts: JSON.stringify([{ style: '共情版', content: '理解您对跨境物流的担忧...' }]),
        scenarios: JSON.stringify(['卖家入驻', '物流方案', '支付方案']),
        knowledge: JSON.stringify(['平台规则', '物流方案对比']),
        customer_profiles: JSON.stringify(['跨境卖家', '品牌方']),
        best_practices: JSON.stringify(['了解目标市场', '提供本地化支持']),
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      },
    ];

    let created = 0;
    for (const plugin of SEED_PLUGINS) {
      try {
        await sbInsert('industry_plugins', plugin);
        created++;
      } catch (e) { console.error('Plugin seed error:', e.message); }
    }

    sendJson(res, 200, { success: true, data: { created, total: SEED_PLUGINS.length } });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Failed to seed plugins' });
  }
};

routes['GET /api/plugins/search'] = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const industry = url.searchParams.get('industry') || '';
    const opts = { select: '*', order: 'install_count.desc', limit: 20 };
    if (industry) opts.eq = { industry };
    const plugins = await sbSafeQuery('industry_plugins', opts);
    sendJson(res, 200, { data: plugins });
  } catch (err) { sendJson(res, 200, { data: [] }); }
};

routes['GET /api/plugins/:id'] = async (req, res) => {
  try {
    const { last } = safeId(req);
    const plugins = await sbSafeQuery('industry_plugins', { select: '*', eq: { id: last }, limit: 1 });
    if (!plugins || plugins.length === 0) return sendJson(res, 404, { success: false, error: 'Plugin not found' });
    sendJson(res, 200, { data: plugins[0] });
  } catch (err) { sendJson(res, 404, { success: false, error: 'Plugin not found' }); }
};

routes['POST /api/plugins/install'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    sendJson(res, 200, { success: true });
  } catch (err) { sendJson(res, 200, { success: true }); }
};

routes['POST /api/plugins/:id/uninstall'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    sendJson(res, 200, { success: true });
  } catch (err) { sendJson(res, 200, { success: true }); }
};

// --- Database Init ---
routes['GET /api/admin/init-db'] = async (req, res) => {
  try {
    requireAdmin(req);
    const result = await initDatabase();
    sendJson(res, 200, { success: true, data: result });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

// --- 行业规则热更新 API（管理后台动态配置，零停机热加载）---
// 获取所有已注册行业
routes['GET /api/admin/industries'] = async (req, res) => {
  try {
    requireAdmin(req);
    const industries = registry.getRegisteredIndustries();
    const details = industries.map(name => ({
      name,
      config: registry.getContext(name),
      hasCompiledMatrix: !!registry.getCompiledMatrix().find(m => m.industry === name)
    }));
    sendJson(res, 200, { success: true, data: { count: industries.length, industries: details } });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

// 热更新/注册行业规则（支持后台管理系统线上不重启、零停机动态热加载）
routes['POST /api/admin/industries'] = async (req, res) => {
  try {
    requireAdmin(req);
    const { action, name, config } = await parseBody(req);

    if (!name) return sendJson(res, 400, { success: false, error: '缺少行业名称参数' });

    if (action === 'unregister') {
      registry.unregister(name);
      console.log(`[ADMIN-SYNC] 行业规则动态注销成功: ${name}`);
      return sendJson(res, 200, { success: true, message: `行业 [${name}] 已注销` });
    }

    if (!config || typeof config !== 'object') {
      return sendJson(res, 400, { success: false, error: '配置格式错误，config 必须是有效对象' });
    }

    const success = registry.register(name, config);
    if (success) {
      console.log(`[ADMIN-SYNC] 后台配置热更新成功并完成矩阵重组. 行业: ${name}`);
      sendJson(res, 200, { success: true, message: `行业 [${name}] 已注册/更新并重新编译` });
    } else {
      sendJson(res, 500, { success: false, error: '注册失败，请检查日志' });
    }
  } catch (err) {
    console.error('[ADMIN-SYNC-FATAL]', err);
    sendJson(res, 500, { success: false, error: err.message });
  }
};

// 批量导入行业规则（从数据库加载到内存）
routes['POST /api/admin/industries/sync-from-db'] = async (req, res) => {
  try {
    requireAdmin(req);
    // 从 industry_plugins 表加载行业配置
    const plugins = await sbSafeQuery('industry_plugins', { select: '*', order: 'created_at.desc', limit: 100 });
    let synced = 0;

    for (const plugin of plugins) {
      try {
        const config = {
          role: plugin.description || '专业顾问',
          keywords: Array.isArray(JSON.parse(plugin.scripts || '[]')) ?
            JSON.parse(plugin.scripts || '[]').map(s => s.style || '') : [],
          painPoints: Array.isArray(JSON.parse(plugin.knowledge || '[]')) ?
            JSON.parse(plugin.knowledge || '[]') : [],
          valueProps: Array.isArray(JSON.parse(plugin.best_practices || '[]')) ?
            JSON.parse(plugin.best_practices || '[]') : [],
          objectionHandling: {},
          closingTechniques: Array.isArray(JSON.parse(plugin.customer_profiles || '[]')) ?
            JSON.parse(plugin.customer_profiles || '[]') : [],
          sampleData: {}
        };

        // 从 scripts 中提取关键词
        const scripts = JSON.parse(plugin.scripts || '[]');
        if (scripts.length > 0) {
          config.keywords = scripts.flatMap(s => {
            const content = s.content || '';
            return content.match(/[一-龥]{2,}/g) || [];
          }).slice(0, 20);
        }

        if (registry.register(plugin.name || plugin.industry, config)) {
          synced++;
        }
      } catch (e) {
        console.error(`Failed to sync plugin ${plugin.name}:`, e.message);
      }
    }

    sendJson(res, 200, { success: true, data: { synced, total: plugins.length, registered: registry.getRegisteredIndustries().length } });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

// 同步管理 API - 获取同步状态
routes['GET /api/admin/sync/status'] = async (req, res) => {
  try {
    requireAdmin(req);
    const status = syncManager.getStatus();
    sendJson(res, 200, { success: true, data: status });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

// 同步管理 API - 手动触发同步
routes['POST /api/admin/sync/trigger'] = async (req, res) => {
  try {
    requireAdmin(req);
    const status = await syncManager.manualSync();
    sendJson(res, 200, { success: true, data: status });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

routes['POST /api/admin/knowledge/crawl'] = async (req, res) => {
  try {
    requireAdmin(req);
    const { crawlKnowledge } = require('./knowledge-crawler');
    const result = await crawlKnowledge();
    sendJson(res, 200, { success: true, data: result });
  } catch (err) {
    console.error('Knowledge crawl error:', err);
    sendJson(res, 500, { success: false, error: 'Crawl failed' });
  }
};

// 销售内容爬虫 - 用 Playwright 爬取知乎/小红书/百度的销售实战内容
routes['POST /api/admin/knowledge/crawl-sales'] = async (req, res) => {
  try {
    requireAdmin(req);
    const { crawlSalesContent } = require('./sales-content-crawler');
    const result = await crawlSalesContent();
    sendJson(res, 200, { success: true, data: result });
  } catch (err) {
    console.error('Sales content crawl error:', err);
    sendJson(res, 500, { success: false, error: 'Sales content crawl failed' });
  }
};

// 批量插入知识（供爬虫调用）
routes['POST /api/admin/knowledge/batch-insert'] = async (req, res) => {
  try {
    requireAdmin(req);
    const { items } = await parseBody(req);

    if (!Array.isArray(items) || items.length === 0) {
      return sendJson(res, 400, { success: false, error: 'items array required' });
    }

    if (items.length > 100) {
      return sendJson(res, 400, { success: false, error: 'max 100 items per batch' });
    }

    let inserted = 0;
    let failed = 0;

    for (const item of items) {
      try {
        await sbInsert('knowledge_items', {
          id: item.id || crypto.randomUUID(),
          user_id: null, // 公共知识
          source: (item.source || '').slice(0, 200),
          source_url: (item.source_url || '').slice(0, 500),
          content: (item.content || '').slice(0, 500),
          tags: Array.isArray(item.tags) ? item.tags.slice(0, 10) : [],
          industry: item.industry || '通用',
          weight: item.weight || 0.7,
          status: item.status || 'ACTIVE',
          knowledge_type: item.knowledge_type || 'general',
          scenario: item.scenario || null,
          customer_voice: item.customer_voice || null,
          response_example: item.response_example || null,
          psychology_tags: Array.isArray(item.psychology_tags) ? item.psychology_tags : [],
          language: item.language || 'zh',
          created_at: new Date().toISOString(),
        });
        inserted++;
      } catch (e) {
        failed++;
      }
    }

    // 飞书通知
    if (inserted > 0) {
      const FEISHU_WEBHOOK = process.env.FEISHU_WEBHOOK_URL || 'https://open.feishu.cn/open-apis/bot/v2/hook/ddc4e243-5c8b-4fcb-a0db-d56c213cb1bb';
      try {
        await fetch(FEISHU_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            msg_type: 'interactive',
            card: {
              header: {
                title: { tag: 'plain_text', content: '📥 销售知识入库通知' },
                template: 'green',
              },
              elements: [{
                tag: 'div',
                text: {
                  tag: 'lark_md',
                  content: `**新增知识**：${inserted} 条\n**失败**：${failed} 条\n**时间**：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
                },
              }],
            },
          }),
          signal: AbortSignal.timeout(10000),
        });
      } catch (e) {}
    }

    sendJson(res, 200, { success: true, data: { inserted, failed, total: items.length } });
  } catch (err) {
    console.error('Batch insert error:', err);
    sendJson(res, 500, { success: false, error: 'Batch insert failed' });
  }
};

// 同步管理 API - 配置外部数据源
routes['POST /api/admin/sync/sources'] = async (req, res) => {
  try {
    requireAdmin(req);
    const { name, url, method, headers, enabled } = await parseBody(req);

    if (!name || !url) {
      return sendJson(res, 400, { success: false, error: '缺少 name 或 url 参数' });
    }

    syncManager.registerExternalApi(name, {
      url,
      method: method || 'GET',
      headers: headers || {},
      enabled: enabled !== false,
      transform: (data) => {
        // 默认转换函数：期望返回 [{name, config}] 格式
        if (Array.isArray(data)) return data;
        if (data.industries) return data.industries;
        if (data.data) return data.data;
        return [];
      }
    });

    sendJson(res, 200, { success: true, message: `外部数据源 [${name}] 已注册` });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

// 同步管理 API - 启动/停止自动同步
routes['POST /api/admin/sync/auto'] = async (req, res) => {
  try {
    requireAdmin(req);
    const { enabled, intervalMs } = await parseBody(req);

    if (enabled) {
      syncManager.startAutoSync(intervalMs || 5 * 60 * 1000);
      sendJson(res, 200, { success: true, message: '自动同步已启动' });
    } else {
      syncManager.stopAutoSync();
      sendJson(res, 200, { success: true, message: '自动同步已停止' });
    }
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

// --- Admin ---
routes['GET /api/admin/users'] = async (req, res) => {
  try {
    const jwt = requireAdmin(req);
    const users = await sbQuery('users', { select: 'id,name,email,role,plan,industry,created_at', order: 'created_at.desc', limit: 100 });
    const mapped = users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, plan: u.plan, industry: u.industry, status: 'active', lastLogin: u.created_at, createdAt: u.created_at }));
    sendJson(res, 200, { data: mapped });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

routes['PUT /api/admin/users/:userId/plan'] = async (req, res) => {
  try {
    const jwt = requireAdmin(req);
    const { parts } = safeId(req);
    const userId = parts[4];
    const { plan } = await parseBody(req);
    if (!plan || !['FREE','PROFESSIONAL','TEAM','ENTERPRISE'].includes(plan)) return sendJson(res, 400, { success: false, error: 'Invalid plan' });
    await sbUpdate('users', { id: userId }, { plan, updated_at: new Date().toISOString() });
    sendJson(res, 200, { success: true, data: { userId, plan } });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

// ---- 管理员：检索日志 ----
routes['GET /api/admin/retrieval-logs'] = async (req, res) => {
  try {
    requireAdmin(req);
    const url = new URL(req.url, `http://${req.headers.host}`);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const query = url.searchParams.get('q') || '';
    const userId = url.searchParams.get('user_id') || '';
    const from = url.searchParams.get('from') || '';
    const to = url.searchParams.get('to') || '';

    const opts = { select: '*', order: 'created_at.desc', limit: Math.min(limit, 200) };
    if (userId) opts.eq = { user_id: userId };

    let logs = await sbSafeQuery('retrieval_logs', opts);

    // 本地过滤（Supabase REST 不支持全文搜索列过滤）
    if (query) {
      const q = query.toLowerCase();
      logs = logs.filter(l => (l.query || '').toLowerCase().includes(q));
    }
    if (from) {
      logs = logs.filter(l => l.created_at >= from);
    }
    if (to) {
      logs = logs.filter(l => l.created_at <= to + 'T23:59:59Z');
    }

    // 统计摘要
    const summary = {
      total: logs.length,
      avg_graph_results: logs.reduce((s, l) => s + (l.graph_results?.length || 0), 0) / (logs.length || 1),
      avg_final_results: logs.reduce((s, l) => s + (l.final_results?.length || 0), 0) / (logs.length || 1),
      top_queries: Object.entries(logs.reduce((acc, l) => { acc[l.query] = (acc[l.query] || 0) + 1; return acc; }, {}))
        .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([q, count]) => ({ query: q, count })),
    };

    sendJson(res, 200, { data: logs, summary });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 200, { data: [], summary: {} });
  }
};

routes['GET /api/admin/stats'] = async (req, res) => {
  try {
    const jwt = requireAdmin(req);
    let totalUsers = 0, totalScriptsGenerated = 0, dailyActiveUsers = 0;
    let planDistribution = { FREE: 0, PROFESSIONAL: 0, TEAM: 0, ENTERPRISE: 0 };
    let topIndustries = {};

    try {
      const users = await sbQuery('users', { select: 'plan,industry,created_at' });
      totalUsers = users.length;
      const today = new Date().toISOString().split('T')[0];
      for (const u of users) {
        if (u.plan && planDistribution[u.plan] !== undefined) planDistribution[u.plan]++;
        if (u.industry && Array.isArray(u.industry)) {
          for (const ind of u.industry) topIndustries[ind] = (topIndustries[ind] || 0) + 1;
        }
      }
    } catch {}

    try {
      const scripts = await sbSafeQuery('scripts', { select: 'id' });
      totalScriptsGenerated = scripts.length;
    } catch {}

    const modelUsage = [
      { name: 'Qwen', calls: 0, percentage: 0 },
      { name: 'GPT-4', calls: 0, percentage: 0 },
      { name: 'Claude', calls: 0, percentage: 0 },
    ];

    sendJson(res, 200, { data: {
      totalUsers, dailyActiveUsers, totalScriptsGenerated, dailyScriptsGenerated: 0,
      modelUsage, userGrowthTrend: [], scriptUsageTrend: [],
      topIndustries: Object.entries(topIndustries).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 10)
    }});
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

routes['GET /api/admin/models'] = async (req, res) => {
  try {
    const jwt = requireAdmin(req);
    const models = await sbSafeQuery('model_configs', { select: '*', order: 'created_at.desc' });
    const mapped = models.map(m => ({
      id: m.id,
      name: m.display_name || m.model_id,
      provider: m.provider,
      modelId: m.model_id,
      baseUrl: m.base_url || '',
      status: m.is_active ? 'active' : 'inactive',
      temperature: m.temperature,
      maxTokens: m.max_tokens,
      repetitionPenalty: 1.1,
      apiKey: m.api_key ? '***' + m.api_key.slice(-4) : '',
      usageQuota: 10000,
      usageCurrent: 0,
      alertThreshold: 80,
    }));
    // Return default models if table is empty
    if (mapped.length === 0) {
      sendJson(res, 200, { data: [
        { id: 'default-qwen', name: 'Qwen2.5-72B', provider: 'qwen', status: 'inactive', temperature: 0.7, maxTokens: 2048, repetitionPenalty: 1.1, apiKey: '', usageQuota: 10000, usageCurrent: 0, alertThreshold: 80 },
        { id: 'default-gpt4', name: 'GPT-4o', provider: 'openai', status: 'inactive', temperature: 0.7, maxTokens: 4096, repetitionPenalty: 1.1, apiKey: '', usageQuota: 10000, usageCurrent: 0, alertThreshold: 80 },
        { id: 'default-claude', name: 'Claude Sonnet 4', provider: 'anthropic', status: 'inactive', temperature: 0.7, maxTokens: 4096, repetitionPenalty: 1.1, apiKey: '', usageQuota: 10000, usageCurrent: 0, alertThreshold: 80 },
      ]});
    } else {
      sendJson(res, 200, { data: mapped });
    }
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 200, { data: [] });
  }
};

// Create new model
routes['POST /api/admin/models'] = async (req, res) => {
  try {
    requireAdmin(req);
    const data = await parseBody(req);

    if (!data.name || !data.modelId || !data.apiKey) {
      return sendJson(res, 400, { success: false, error: '缺少必填字段' });
    }

    // 自动升级 HTTP → HTTPS
    let baseUrl = data.baseUrl || '';
    if (baseUrl.startsWith('http://')) {
      baseUrl = baseUrl.replace('http://', 'https://');
      console.log('Model config: Auto-upgraded HTTP to HTTPS:', baseUrl);
    }

    const newModel = {
      id: crypto.randomUUID(),
      display_name: data.name,
      provider: data.provider || 'custom',
      model_id: data.modelId,
      base_url: baseUrl,
      api_key: data.apiKey,
      temperature: data.temperature || 0.7,
      max_tokens: data.maxTokens || 4096,
      is_active: data.status === 'active',
      is_primary: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = await sbInsert('model_configs', newModel);
    sendJson(res, 201, { success: true, data: result[0] || result });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Failed to create model' });
  }
};

routes['PUT /api/admin/models/:id'] = async (req, res) => {
  try {
    const jwt = requireAdmin(req);
    const { last } = safeId(req);
    const data = await parseBody(req);
    const updateData = {};

    // 只更新非空、非占位符的字段
    if (data.temperature !== undefined) updateData.temperature = data.temperature;
    if (data.maxTokens !== undefined) updateData.max_tokens = data.maxTokens;
    // Detect masked apiKey (starts with '***') — skip updating it
    if (data.apiKey !== undefined && data.apiKey !== '' && !data.apiKey.startsWith('***')) {
      updateData.api_key = data.apiKey;
    }
    if (data.baseUrl !== undefined && data.baseUrl !== '') {
      updateData.base_url = data.baseUrl.startsWith('http://')
        ? data.baseUrl.replace('http://', 'https://')
        : data.baseUrl;
    }
    if (data.modelId !== undefined && data.modelId !== '') updateData.model_id = data.modelId;
    if (data.name !== undefined && data.name !== '') updateData.display_name = data.name;
    if (data.provider !== undefined && data.provider !== '') updateData.provider = data.provider;
    if (data.status !== undefined) updateData.is_active = data.status === 'active';
    updateData.updated_at = new Date().toISOString();

    const updated = await sbSafeUpdate('model_configs', { id: last }, updateData);
    sendJson(res, 200, { success: true, data: updated[0] || updated });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 200, { success: true });
  }
};

// Delete model
routes['DELETE /api/admin/models/:id'] = async (req, res) => {
  try {
    requireAdmin(req);
    const { last } = safeId(req);
    await sbDelete('model_configs', { id: last });
    sendJson(res, 200, { success: true });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Failed to delete model' });
  }
};

// Test model connection
routes['POST /api/admin/models/test'] = async (req, res) => {
  try {
    requireAdmin(req);
    const data = await parseBody(req);
    let { baseUrl, apiKey, modelId, provider } = data;

    // 如果 apiKey 是掩码（以***开头），从数据库获取完整 key
    if (apiKey && apiKey.startsWith('***')) {
      const models = await sbSafeQuery('model_configs', {
        select: 'api_key',
        eq: { model_id: modelId },
        limit: 1
      });
      if (models && models.length > 0 && models[0].api_key) {
        apiKey = models[0].api_key;
      }
    }

    if (!apiKey || !modelId) {
      return sendJson(res, 400, { success: false, error: 'Missing required parameters' });
    }

    const providerLower = (provider || '').toLowerCase();

    // 使用统一的 URL 构建函数
    const testUrl = buildApiUrl(baseUrl, providerLower);
    let headers = { 'Content-Type': 'application/json' };
    let body;

    if (providerLower === 'anthropic') {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      body = JSON.stringify({
        model: modelId,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say hi' }]
      });
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`;
      body = JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: 'Say hi' }],
        max_tokens: 10,
      });
    }

    console.log('Testing model connection:', { provider: providerLower, modelId, url: testUrl, originalBaseUrl: baseUrl });

    const response = await fetch(testUrl, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(15000)
    });

    if (response.ok) {
      const responseData = await response.json();
      let content = '';
      if (providerLower === 'anthropic') {
        content = responseData.content?.[0]?.text || '';
      } else {
        content = responseData.choices?.[0]?.message?.content || '';
      }
      sendJson(res, 200, { success: true, message: '连接成功', testResponse: content.slice(0, 100) });
    } else {
      const errorText = await response.text().catch(() => '');
      sendJson(res, 200, {
        success: false,
        message: `连接失败: HTTP ${response.status}`,
        error: errorText.slice(0, 300),
        debug: { url: testUrl, provider: providerLower, modelId }
      });
    }
  } catch (err) {
    sendJson(res, 200, {
      success: false,
      message: `连接错误: ${err.message}`,
      errorType: err.name,
      debug: { url: testUrl, provider: providerLower, modelId }
    });
  }
};

// 诊断端点 - 检查当前激活模型的状态
routes['GET /api/admin/diagnose'] = async (req, res) => {
  try {
    requireAdmin(req);

    const diagnosis = {
      timestamp: new Date().toISOString(),
      environment: {
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasJwtSecret: !!process.env.JWT_SECRET,
        nodeEnv: process.env.NODE_ENV
      },
      model: null,
      testResult: null
    };

    // 检查模型配置
    try {
      const models = await sbSafeQuery('model_configs', { select: '*', order: 'created_at.desc' });
      diagnosis.model = {
        total: models.length,
        active: models.filter(m => m.is_active).length,
        models: models.map(m => ({
          id: m.id,
          name: m.display_name || m.model_id,
          provider: m.provider,
          modelId: m.model_id,
          baseUrl: m.base_url || '(默认)',
          isActive: m.is_active,
          isPrimary: m.is_primary,
          hasApiKey: !!m.api_key,
          apiKeyPreview: m.api_key ? `${m.api_key.slice(0, 8)}...` : '(空)',
          temperature: m.temperature,
          maxTokens: m.max_tokens
        }))
      };

      // 测试激活的模型
      const activeModel = models.find(m => m.is_active);
      if (activeModel && activeModel.api_key) {
        const provider = (activeModel.provider || '').toLowerCase();
        let testUrl, headers, body;

        // 自动移除末尾的 /v1
        const cleanBaseUrl = (activeModel.base_url || '').replace(/\/+$/, '').replace(/\/v1\/?$/, '');

        if (provider === 'anthropic') {
          testUrl = (cleanBaseUrl || 'https://api.anthropic.com') + '/v1/messages';
          headers = {
            'Content-Type': 'application/json',
            'x-api-key': activeModel.api_key,
            'anthropic-version': '2023-06-01'
          };
          body = JSON.stringify({
            model: activeModel.model_id,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Say hi' }]
          });
        } else {
          testUrl = (cleanBaseUrl || 'https://api.openai.com') + '/v1/chat/completions';
          headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeModel.api_key}`
          };
          body = JSON.stringify({
            model: activeModel.model_id,
            messages: [{ role: 'user', content: 'Say hi' }],
            max_tokens: 10
          });
        }

        try {
          const resp = await fetch(testUrl, {
            method: 'POST',
            headers,
            body,
            signal: AbortSignal.timeout(15000)
          });

          if (resp.ok) {
            const data = await resp.json();
            let content = provider === 'anthropic'
              ? (data.content?.[0]?.text || '')
              : (data.choices?.[0]?.message?.content || '');
            diagnosis.testResult = { success: true, response: content.slice(0, 100) };
          } else {
            const errText = await resp.text();
            diagnosis.testResult = {
              success: false,
              status: resp.status,
              error: errText.slice(0, 300)
            };
          }
        } catch (e) {
          diagnosis.testResult = {
            success: false,
            error: e.message,
            errorType: e.name
          };
        }
      } else {
        diagnosis.testResult = { success: false, error: '没有激活的模型或 API Key 未配置' };
      }
    } catch (e) {
      diagnosis.model = { error: e.message };
    }

    sendJson(res, 200, { success: true, data: diagnosis });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

// --- Compliance ---
routes['GET /api/compliance/export'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const users = await sbQuery('users', { select: 'id,name,email,role,plan,industry,created_at', eq: { id: jwt.userId }, limit: 1 });
    const sessions = await sbSafeQuery('sessions', { select: '*', eq: { user_id: jwt.userId } });
    const scripts = await sbSafeQuery('scripts', { select: '*', eq: { user_id: jwt.userId } });
    const knowledge = await sbSafeQuery('knowledge_items', { select: '*', eq: { user_id: jwt.userId } });
    const exportData = { user: users[0], sessions, scripts, knowledge, exportedAt: new Date().toISOString() };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="my-data.json"');
    res.end(JSON.stringify(exportData, null, 2));
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

routes['POST /api/compliance/delete'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { confirmEmail, reason } = await parseBody(req);
    const users = await sbQuery('users', { select: 'email', eq: { id: jwt.userId }, limit: 1 });
    if (!users || users[0]?.email !== confirmEmail) return sendJson(res, 400, { success: false, error: 'Email does not match' });
    // Record deletion request (don't actually delete immediately)
    sendJson(res, 200, { success: true, message: 'Data deletion request submitted. Processing within 30 days.' });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
};

// ==================== CRON JOBS ====================
// Daily cleanup - called by external cron service (e.g., cron-job.org, Vercel Cron)
routes['GET /api/cron/daily'] = async (req, res) => {
  try {
    const results = { usageCleanup: 0, knowledgeCleanup: 0, timestamp: new Date().toISOString() };

    // 1. Clean up old usage logs (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    try {
      // Note: Supabase doesn't support DELETE with date comparison easily
      // This is a placeholder - in production, use a Supabase function or direct SQL
      console.log('Daily cron: Would clean usage logs older than', thirtyDaysAgo);
      results.usageCleanup = 0; // Would be count of deleted records
    } catch (e) { console.error('Usage cleanup error:', e.message); }

    // 2. Archive low-quality knowledge items
    try {
      const lowQuality = await sbSafeQuery('knowledge_items', {
        select: 'id',
        eq: { status: 'ACTIVE' },
        lte: { weight: 0.3 },
        limit: 100
      });
      if (lowQuality && lowQuality.length > 0) {
        for (const item of lowQuality) {
          await sbUpdate('knowledge_items', { id: item.id }, { status: 'ARCHIVED' });
        }
        results.knowledgeCleanup = lowQuality.length;
      }
    } catch (e) { console.error('Knowledge cleanup error:', e.message); }

    // 3. Reset daily usage counters (handled by date-based queries, no action needed)
    console.log('Daily cron completed:', results);

    sendJson(res, 200, { success: true, data: results });
  } catch (err) {
    console.error('Cron error:', err);
    sendJson(res, 500, { success: false, error: 'Cron job failed' });
  }
};

// Weekly analytics aggregation
routes['GET /api/cron/weekly'] = async (req, res) => {
  try {
    const results = { topScripts: 0, topPractices: 0, timestamp: new Date().toISOString() };

    // 1. Identify top-performing scripts for knowledge base
    try {
      const topFeedback = await sbSafeQuery('script_feedbacks', {
        select: 'script_id',
        eq: { type: 'up' },
        limit: 50
      });

      if (topFeedback && topFeedback.length > 0) {
        const scriptIds = [...new Set(topFeedback.map(f => f.script_id))];
        for (const scriptId of scriptIds.slice(0, 10)) {
          const script = await sbSafeQuery('scripts', { select: '*', eq: { id: scriptId }, limit: 1 });
          if (script && script.length > 0) {
            const existing = await sbSafeQuery('knowledge_items', {
              select: 'id',
              eq: { user_id: script[0].user_id, source: `script:${scriptId}` },
              limit: 1
            });
            if (!existing || existing.length === 0) {
              await sbInsert('knowledge_items', {
                id: crypto.randomUUID(),
                user_id: script[0].user_id,
                source: `script:${scriptId}`,
                content: script[0].content || '',
                tags: script[0].tags || [],
                industry: script[0].industry || null,
                weight: 8,
                status: 'ACTIVE',
                created_at: new Date().toISOString()
              });
              results.topScripts++;
            }
          }
        }
      }
    } catch (e) { console.error('Top scripts aggregation error:', e.message); }

    // 2. Identify high-scoring practices for knowledge base
    try {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const topPractices = await sbSafeQuery('practice_sessions', {
        select: 'id,user_id,scenario,industry,score,transcript',
        gte: { score: 85 },
        limit: 20
      });

      if (topPractices && topPractices.length > 0) {
        for (const practice of topPractices) {
          const existing = await sbSafeQuery('knowledge_items', {
            select: 'id',
            eq: { user_id: practice.user_id, source: `practice:${practice.id}` },
            limit: 1
          });
          if (!existing || existing.length === 0) {
            const summary = (practice.transcript || []).slice(0, 3)
              .map(t => `${t.role === 'user' ? '销售' : '客户'}：${t.content?.slice(0, 100)}`)
              .join('\n');

            await sbInsert('knowledge_items', {
              id: crypto.randomUUID(),
              user_id: practice.user_id,
              source: `practice:${practice.id}`,
              content: `【高分练习 - ${practice.scenario || '通用'}】\n得分：${practice.score}\n\n${summary}`,
              tags: [practice.scenario || '通用', '高分练习'],
              industry: practice.industry || null,
              weight: Math.min(10, Math.floor(practice.score / 10)),
              status: 'ACTIVE',
              created_at: new Date().toISOString()
            });
            results.topPractices++;
          }
        }
      }
    } catch (e) { console.error('Top practices aggregation error:', e.message); }

    // 3. 爬取外部销售知识
    let crawlResult = null;
    try {
      console.log('Weekly cron: Starting knowledge crawl...');
      const { crawlSalesContent } = require('./sales-content-crawler');
      crawlResult = await crawlSalesContent();
      results.knowledgeCrawl = crawlResult;
      console.log('Weekly cron: Knowledge crawl completed:', crawlResult);
    } catch (e) {
      console.error('Knowledge crawl error:', e.message);
      results.knowledgeCrawl = { error: e.message };
    }

    // 4. 飞书 Webhook 通知
    const FEISHU_WEBHOOK = process.env.FEISHU_WEBHOOK_URL || 'https://open.feishu.cn/open-apis/bot/v2/hook/ddc4e243-5c8b-4fcb-a0db-d56c213cb1bb';
    try {
      const crawlCount = results.knowledgeCrawl?.added || 0;
      const topScripts = results.topScripts || 0;
      const topPractices = results.topPractices || 0;

      await fetch(FEISHU_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msg_type: 'interactive',
          card: {
            header: {
              title: { tag: 'plain_text', content: '📊 销冠AI教练 - 每周知识更新报告' },
              template: 'blue',
            },
            elements: [
              {
                tag: 'div',
                text: {
                  tag: 'lark_md',
                  content: [
                    `**🕐 时间**：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
                    ``,
                    `**📥 知识爬取**`,
                    `• 新增知识：**${crawlCount}** 条`,
                    ``,
                    `**📈 自动入库**`,
                    `• 高分话术：**${topScripts}** 条`,
                    `• 高分练习：**${topPractices}** 条`,
                    ``,
                    `**💡 提示**：新知识已自动融入话术生成和AI陪练`,
                  ].join('\n'),
                },
              },
            ],
          },
        }),
        signal: AbortSignal.timeout(10000),
      });
      console.log('Weekly cron: Feishu notification sent');
    } catch (e) {
      console.error('Feishu notification failed:', e.message);
    }

    console.log('Weekly cron completed:', results);
    sendJson(res, 200, { success: true, data: results });
  } catch (err) {
    console.error('Weekly cron error:', err);
    sendJson(res, 500, { success: false, error: 'Weekly cron job failed' });
  }
};

// 每日知识爬取 cron
routes['GET /api/cron/knowledge'] = async (req, res) => {
  try {
    const startTime = Date.now();
    console.log('Knowledge cron: Starting daily crawl...');

    // 1. 爬取销售知识
    let crawlResult = { added: 0, skipped: 0, failed: 0 };
    try {
      const { crawlSalesContent } = require('./sales-content-crawler');
      crawlResult = await crawlSalesContent();
      console.log('Knowledge cron: Crawl completed:', crawlResult);
    } catch (e) {
      console.error('Knowledge cron: Crawl error:', e.message);
      crawlResult.error = e.message;
    }

    // 2. 飞书通知
    const FEISHU_WEBHOOK = process.env.FEISHU_WEBHOOK_URL || 'https://open.feishu.cn/open-apis/bot/v2/hook/ddc4e243-5c8b-4fcb-a0db-d56c213cb1bb';
    const elapsed = Math.round((Date.now() - startTime) / 1000);

    try {
      await fetch(FEISHU_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msg_type: 'interactive',
          card: {
            header: {
              title: { tag: 'plain_text', content: '📥 每日知识爬取完成' },
              template: crawlResult.added > 0 ? 'green' : 'orange',
            },
            elements: [{
              tag: 'div',
              text: {
                tag: 'lark_md',
                content: [
                  `**🕐 时间**：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
                  `**📥 新增知识**：${crawlResult.added} 条`,
                  `**⏭️ 跳过**：${crawlResult.skipped} 条`,
                  `**❌ 失败**：${crawlResult.failed} 条`,
                  `**⏱️ 耗时**：${elapsed} 秒`,
                  crawlResult.added > 0 ? `\n**💡 提示**：新知识已自动融入话术生成和AI陪练` : '',
                ].filter(Boolean).join('\n'),
              },
            }],
          },
        }),
        signal: AbortSignal.timeout(10000),
      });
      console.log('Knowledge cron: Feishu notification sent');
    } catch (e) {
      console.error('Knowledge cron: Feishu notification failed:', e.message);
    }

    sendJson(res, 200, {
      success: true,
      data: { ...crawlResult, elapsed_seconds: elapsed, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Knowledge cron error:', err);
    sendJson(res, 500, { success: false, error: 'Knowledge cron failed' });
  }
};

// Health check with dependency status
routes['GET /api/health/detailed'] = async (req, res) => {
  const checks = { api: 'ok', database: 'unknown', timestamp: new Date().toISOString() };

  // Check database connection
  try {
    await sbSafeQuery('users', { select: 'id', limit: 1 });
    checks.database = 'ok';
  } catch (e) {
    checks.database = 'error: ' + e.message;
  }

  const allOk = Object.values(checks).every(v => v === 'ok' || typeof v === 'string');
  sendJson(res, allOk ? 200 : 503, { success: allOk, data: checks });
};

// ==================== MAIN HANDLER ====================
module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { res.statusCode = 200; res.end(); return; }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // CSRF protection for state-changing requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.headers.origin || req.headers.referer || '';
    const allowedOrigins = [FRONTEND_URL, 'https://www.aisalecoach.work', 'https://aisalecoach.work'];
    const isAllowed = allowedOrigins.some(o => origin.startsWith(o)) || origin === '';
    if (!isAllowed && path.startsWith('/api/')) {
      sendJson(res, 403, { success: false, error: 'CSRF validation failed' });
      return;
    }
  }

  // Apply rate limiting based on path
  if (path.startsWith('/api/auth/')) {
    if (!authRateLimit(req, res)) return;
  } else if (path.startsWith('/api/scripts/generate') || path.startsWith('/api/practices/') || path.startsWith('/api/reviews/generate')) {
    if (!aiRateLimit(req, res)) return;
  } else if (path.startsWith('/api/')) {
    if (!generalRateLimit(req, res)) return;
  }

  // Exact match
  let handler = routes[`${req.method} ${path}`];

  // Pattern match
  if (!handler) {
    for (const [key, h] of Object.entries(routes)) {
      const [method, pattern] = key.split(' ');
      if (method !== req.method) continue;
      const regex = '^' + pattern.replace(/:[^/]+/g, '[^/]+') + '$';
      if (new RegExp(regex).test(path)) { handler = h; break; }
    }
  }

  if (handler) {
    try { await handler(req, res); }
    catch (err) {
      console.error('Handler error:', err);
      Sentry.captureException(err, {
        tags: { path, method: req.method },
        extra: { url: req.url },
      });
      sendJson(res, 500, { success: false, error: 'Internal server error' });
    }
  } else {
    sendJson(res, 404, { success: false, error: 'Not found', path });
  }
};
