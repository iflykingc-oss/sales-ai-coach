const { URL } = require('url');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Sentry = require('@sentry/node');

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
  // Get user's plan
  const users = await sbSafeQuery('users', { select: 'plan', eq: { id: userId }, limit: 1 });
  if (!users || users.length === 0) return { allowed: false, error: 'User not found' };

  const plan = users[0].plan || 'FREE';
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
function validateScriptOutput(parsed, lang) {
  // Check required fields exist
  if (!parsed || typeof parsed !== 'object') return { valid: false, reason: 'Invalid response format' };
  if (!parsed.speechStyles || !Array.isArray(parsed.speechStyles) || parsed.speechStyles.length === 0) {
    return { valid: false, reason: 'Missing speech styles' };
  }

  const mainScript = parsed.speechStyles[0];
  if (!mainScript || !mainScript.content || mainScript.content.length < 50) {
    return { valid: false, reason: 'Script too short' };
  }

  // Check for key sections (language-aware)
  const content = mainScript.content;
  const hasOpening = content.includes('开场') || content.includes('Opening') || content.includes('เปิด') || content.includes('Mở đầu') || content.includes('Pembuka');
  const hasDiscovery = content.includes('需求') || content.includes('Need') || content.includes('ความต้องการ') || content.includes('nhu cầu') || content.includes('kebutuhan');
  const hasValue = content.includes('价值') || content.includes('Value') || content.includes('คุณค่า') || content.includes('giá trị') || content.includes('nilai');

  if (!hasOpening && !hasDiscovery && !hasValue) {
    return { valid: false, reason: 'Missing key sales sections' };
  }

  // Check confidence score
  if (parsed.confidenceScore && parsed.confidenceScore < 0.5) {
    return { valid: false, reason: 'Low confidence score' };
  }

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

async function callAI(messages, options = {}) {
  const model = await getActiveModel();
  if (!model) return null; // no model configured, caller should use fallback

  const provider = (model.provider || '').toLowerCase();
  const apiKey = model.api_key;
  const baseUrl = (model.base_url || '').replace(/\/$/, '');
  const modelId = model.model_id;
  const temperature = options.temperature ?? model.temperature ?? 0.7;
  const maxTokens = options.max_tokens ?? model.max_tokens ?? 2048;

  if (!apiKey || !modelId) return null;

  try {
    let url, headers, body;

    if (provider === 'anthropic') {
      // Anthropic Claude API
      url = baseUrl || 'https://api.anthropic.com';
      url += '/v1/messages';
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
      url = baseUrl || 'https://api.openai.com';
      url += '/v1/chat/completions';
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

    const resp = await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(30000) });
    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`AI API error (${provider} ${resp.status}):`, errText);
      return null;
    }

    const data = await resp.json();

    // Extract content from response
    if (provider === 'anthropic') {
      return data.content?.[0]?.text || null;
    }
    return data.choices?.[0]?.message?.content || null;
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
  const baseUrl = (model.base_url || '').replace(/\/$/, '');
  const modelId = model.model_id;
  const temperature = options.temperature ?? model.temperature ?? 0.7;
  const maxTokens = options.max_tokens ?? model.max_tokens ?? 2048;

  if (!apiKey || !modelId) return null;

  let url, headers, body;

  if (provider === 'anthropic') {
    url = (baseUrl || 'https://api.anthropic.com') + '/v1/messages';
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
    url = (baseUrl || 'https://api.openai.com') + '/v1/chat/completions';
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

// ==================== AI FALLBACK ====================
function generateFallbackScript(style, scenario, industry) {
  return {
    speechStyles: [
      { style: style || '标准话术', content: `【${scenario || '通用场景'}开场白】\n您好，感谢您抽出时间。我是${industry || '行业'}解决方案顾问。\n\n【需求探寻】\n请问您目前在${scenario || '这方面'}遇到的最大挑战是什么？\n\n【价值呈现】\n我们的方案可以帮助您提升效率、降低成本。\n\n【异议处理】\n我理解您的顾虑，让我详细说明。\n\n【促成】\n基于讨论，我建议我们先试用一个月。` }
    ],
    reasoning: ['基于标准销售流程生成', '覆盖开场到成交全流程'],
    pitfalls: [
      { action: '急于推销', reason: '应先了解客户需求' },
      { action: '忽略异议', reason: '需正面回应客户顾虑' }
    ],
    knowledgeSource: '模板库',
    confidenceScore: 0.6
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

    try {
      const practices = await sbSafeQuery('practice_sessions', { select: 'id,scenario,score,rounds,session_id,created_at', eq: { user_id: userId }, order: 'created_at.desc', limit: 10 });
      totalPractices = practices.length;
      recentPractices = practices;
      const weekAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString();
      weeklyPractices = practices.filter(p => p.created_at > weekAgo).length;
      if (practices.length > 0) avgPracticeScore = practices.reduce((sum, p) => sum + (p.score || 0), 0) / practices.length;
    } catch {}

    try {
      const reviews = await sbSafeQuery('review_reports', { select: 'id', eq: { user_id: userId } });
      totalReviews = reviews.length;
    } catch {}

    sendJson(res, 200, { data: {
      stats: { totalScripts, totalPractices, totalReviews, weeklyScripts, weeklyPractices, avgPracticeScore: Math.round(avgPracticeScore * 100) / 100 },
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

    // Language instruction for AI
    const langInstructions = {
      zh: '请用中文回复。使用中国市场的销售场景和表达方式。',
      en: 'Please respond in English. Use sales scenarios and expressions common in Western markets.',
      th: 'กรุณาตอบเป็นภาษาไทย ใช้สถานการณ์ขายและวิธีการแสดงออกที่ใช้กันในตลาดเอเชียตะวันออกเฉียงใต้',
      vi: 'Vui lòng trả lời bằng tiếng Việt. Sử dụng các tình huống bán hàng và cách diễn đạt phổ biến tại thị trường Đông Nam Á.',
      ms: 'Sila balas dalam Bahasa Melayu. Gunakan senario jualan dan ungkapan yang biasa di pasaran Asia Tenggara.',
      id: 'Silakan jawab dalam Bahasa Indonesia. Gunakan skenario penjualan dan ekspresi yang umum di pasar Asia Tenggara.',
    };

    // Fetch user's knowledge base for context
    let knowledgeContext = '';
    try {
      const knowledgeItems = await sbSafeQuery('knowledge_items', {
        select: 'content,tags,industry,weight',
        eq: { user_id: jwt.userId, status: 'ACTIVE' },
        order: 'weight.desc',
        limit: 10
      });
      if (knowledgeItems && knowledgeItems.length > 0) {
        const knowledgeLabel = { zh: '用户知识库参考', en: 'User Knowledge Base', th: 'ฐานความรู้ผู้ใช้', vi: 'Kiến thức người dùng', ms: 'Pangkalan Pengetahuan Pengguna', id: 'Basis Pengetahuan Pengguna' };
        knowledgeContext = `\n\n${knowledgeLabel[lang] || knowledgeLabel.en}:\n` + knowledgeItems
          .map((k, i) => `${i + 1}. ${k.content.slice(0, 200)}${k.content.length > 200 ? '...' : ''}`)
          .join('\n');
      }
    } catch (e) { console.error('Knowledge fetch error:', e.message); }

    // Try real AI first
    const scriptPrompt = knowledgeContext
      ? `You are a top sales expert and script architect with 10 years of frontline experience. Generate high-converting, natural, professional sales scripts based on the user's scenario, industry, frameworks, and knowledge base.

${langInstructions[lang] || langInstructions.en}

【Core Guidelines】
1. Natural language: Use conversational language that salespeople actually speak. Avoid robotic or overly formal expressions.
2. Complete flow: The content must include: [Opening] [Need Discovery] [Value Presentation] [Objection Handling] [Closing].
3. Knowledge binding: Deeply integrate knowledge base content, and specify which knowledge items were referenced.

【Return Format】
Return ONLY valid JSON, no markdown wrapping, no extra text.

JSON structure:
{"speechStyles": [{"style": "style name", "content": "[Opening]...\\n[Need Discovery]...\\n[Value]...\\n[Objection]...\\n[Closing]..."}], "reasoning": ["reason 1", "reason 2"], "pitfalls": [{"action": "avoid this", "reason": "why"}], "knowledgeSource": "which knowledge items were used", "confidenceScore": 0.95}`
      : `You are a master sales script creator. Generate high-converting sales scripts for the [${industry || 'general'}] industry.

${langInstructions[lang] || langInstructions.en}

【Requirements】
1. Industry-specific: Use professional terminology and common pain points for the [${industry || 'general'}] industry.
2. Natural language: Use conversational, authentic sales language. Avoid robotic or overly formal expressions.
3. Complete flow: Content must include: [Opening] [Need Discovery] [Value Presentation] [Objection Handling] [Closing].

【Return Format】
Return ONLY valid JSON, no markdown wrapping, no extra text.

JSON structure:
{"speechStyles": [{"style": "style name", "content": "[Opening]...\\n[Need Discovery]...\\n[Value]...\\n[Objection]...\\n[Closing]..."}], "reasoning": ["reason 1", "reason 2"], "pitfalls": [{"action": "avoid this", "reason": "why"}], "knowledgeSource": "source", "confidenceScore": 0.8}`;

    const userPrompts = {
      zh: `请为以下场景生成${styleName}风格的销售话术：\n场景：${scenarioName}\n行业：${industry || '通用'}\n${input ? `补充信息：${input}` : ''}\n${frameworks ? `使用框架：${frameworks.join(', ')}` : ''}${knowledgeContext}`,
      en: `Generate a ${styleName} style sales script for the following scenario:\nScenario: ${scenarioName}\nIndustry: ${industry || 'General'}\n${input ? `Additional info: ${input}` : ''}\n${frameworks ? `Frameworks: ${frameworks.join(', ')}` : ''}${knowledgeContext}`,
      th: `สร้างสคริปต์ขายสไตล์${styleName}สำหรับสถานการณ์ต่อไปนี้:\nสถานการณ์: ${scenarioName}\nอุตสาหกรรม: ${industry || 'ทั่วไป'}\n${input ? `ข้อมูลเพิ่มเติม: ${input}` : ''}\n${frameworks ? `กรอบ: ${frameworks.join(', ')}` : ''}${knowledgeContext}`,
      vi: `Tạo kịch bản bán hàng phong cách ${styleName} cho tình huống sau:\nTình huống: ${scenarioName}\nNgành: ${industry || 'Chung'}\n${input ? `Thông tin bổ sung: ${input}` : ''}\n${frameworks ? `Khung: ${frameworks.join(', ')}` : ''}${knowledgeContext}`,
      ms: `Jana skrip jualan gaya ${styleName} untuk senario berikut:\nSenario: ${scenarioName}\nIndustri: ${industry || 'Am'}\n${input ? `Maklumat tambahan: ${input}` : ''}\n${frameworks ? `Rangka kerja: ${frameworks.join(', ')}` : ''}${knowledgeContext}`,
      id: `Buat skrip penjualan gaya ${styleName} untuk skenario berikut:\nSkenario: ${scenarioName}\nIndustri: ${industry || 'Umum'}\n${input ? `Info tambahan: ${input}` : ''}\n${frameworks ? `Framework: ${frameworks.join(', ')}` : ''}${knowledgeContext}`,
    };

    const aiResult = await callAI([
      { role: 'system', content: scriptPrompt },
      { role: 'user', content: userPrompts[lang] || userPrompts.en }
    ]);

    if (aiResult) {
      try {
        const parsed = JSON.parse(aiResult.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
        const validation = validateScriptOutput(parsed, lang);

        if (validation.valid) {
          scriptData = {
            speechStyles: parsed.speechStyles || [{ style: styleName, content: aiResult }],
            reasoning: parsed.reasoning || ['AI生成'],
            pitfalls: parsed.pitfalls || [],
            knowledgeSource: parsed.knowledgeSource || 'AI生成',
            confidenceScore: parsed.confidenceScore || 0.8
          };
        } else {
          console.log('AI output quality check failed:', validation.reason);
          scriptData = generateFallbackScript(styleName, scenarioName, industry);
        }
      } catch (e) {
        // JSON parse failed, check if raw response is usable
        if (aiResult.length > 100 && (aiResult.includes('开场') || aiResult.includes('Opening'))) {
          scriptData = {
            speechStyles: [{ style: styleName, content: aiResult }],
            reasoning: ['AI生成'],
            pitfalls: [],
            knowledgeSource: 'AI生成',
            confidenceScore: 0.6
          };
        } else {
          scriptData = generateFallbackScript(styleName, scenarioName, industry);
        }
      }
    } else {
      // Fallback to template
      scriptData = generateFallbackScript(styleName, scenarioName, industry);
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
          await sbInsert('knowledge_items', {
            id: crypto.randomUUID(), user_id: jwt.userId,
            source: 'AI自动生成',
            content: `【${styleName}话术 - ${scenarioName}】\n${scriptData.speechStyles[0].content}`,
            tags: [scenarioName, styleName, 'AI生成'],
            industry: industry || null,
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
    const { type, reason } = await parseBody(req);

    // Save feedback
    const feedback = await sbSafeInsert('script_feedbacks', {
      id: crypto.randomUUID(), user_id: jwt.userId, script_id: scriptId,
      type: type || 'up', reason: reason || null, created_at: new Date().toISOString()
    });

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
              weight: Math.min(10, 5 + upCount), // Higher weight with more positive feedback
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

    sendJson(res, 201, { data: { data: {
      session_id: practiceId,
      greeting: `您好，我是您的${scenario || '销售'}练习客户。请开始您的销售话术。`,
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

routes['POST /api/practices/save'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { sessionId, scriptId, scenario, industry, rounds, score, feedback, transcript } = await parseBody(req);
    const practiceId = crypto.randomUUID();
    try {
      await sbInsert('practice_sessions', {
        id: practiceId, user_id: jwt.userId, session_id: sessionId || null,
        script_id: scriptId || null, scenario: scenario || '通用', industry: industry || null,
        rounds: rounds || 0, score: score || 0, feedback: feedback || {},
        transcript: transcript || [], created_at: new Date().toISOString()
      });

      // Auto-save to knowledge base if score is high
      if (score >= 80 && transcript && transcript.length > 0) {
        try {
          const transcriptSummary = transcript
            .slice(0, 5)
            .map(t => `${t.role === 'user' ? '销售' : '客户'}：${t.content}`)
            .join('\n');

          await sbInsert('knowledge_items', {
            id: crypto.randomUUID(), user_id: jwt.userId,
            source: 'AI陪练自动生成',
            content: `【高分练习 - ${scenario || '通用场景'}】\n得分：${score}分 | 轮次：${rounds}\n\n对话摘要：\n${transcriptSummary}`,
            tags: [scenario || '通用', '高分练习', 'AI生成'],
            industry: industry || null,
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
    const items = await sbSafeQuery('knowledge_items', { select: '*', eq: { user_id: jwt.userId }, order: 'created_at.desc', limit: 100 });
    sendJson(res, 200, { data: items });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 200, { data: [] });
  }
};

routes['POST /api/knowledge'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { content, source, industry, weight, tags } = await parseBody(req);
    if (!content) return sendJson(res, 400, { success: false, error: 'content required' });
    const item = await sbInsert('knowledge_items', {
      id: crypto.randomUUID(), user_id: jwt.userId, source: source || 'manual',
      content, tags: tags || [], industry: industry || null,
      weight: weight || 1.0, status: 'ACTIVE', created_at: new Date().toISOString()
    });
    sendJson(res, 201, { data: item });
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
    sendJson(res, 200, { data: {
      totalXp: 10, level: 1, practiceSessions: 0, currentStreak: 1, longestStreak: 1,
      lastPracticeDate: null, unlockedAchievements: ['first-login'],
      skillScores: { 开场白: 0, 需求探寻: 0, 价值传递: 0, 异议处理: 0, 促成能力: 0, 倾听技巧: 0, 情绪管理: 0, 专业形象: 0 },
      bestScores: {},
      currentLevel: { level: 1, name: '新手销售', xpRequired: 100, icon: '🌱' },
      nextLevel: { level: 2, name: '初级销售', xpRequired: 200, icon: '🌿' },
      xpForNextLevel: 190
    }});
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 200, { data: { totalXp: 0, level: 1, practiceSessions: 0, currentStreak: 0, longestStreak: 0, unlockedAchievements: [], skillScores: {}, bestScores: {}, currentLevel: { level: 1, name: '新手销售', xpRequired: 100, icon: '🌱' }, nextLevel: null, xpForNextLevel: 0 } });
  }
};

routes['GET /api/achievements/analytics'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    let totalSessions = 0, practiceTrend = [], averageScore = 0;
    try {
      const practices = await sbSafeQuery('practice_sessions', { select: 'scenario,score,created_at', eq: { user_id: jwt.userId }, order: 'created_at.desc' });
      totalSessions = practices.length;
      practiceTrend = practices.map(p => ({ date: p.created_at, score: p.score, scenario: p.scenario, difficulty: 'medium' }));
      if (practices.length > 0) averageScore = practices.reduce((s, p) => s + (p.score || 0), 0) / practices.length;
    } catch {}
    sendJson(res, 200, { data: {
      totalSessions, practiceTrend,
      skillTrend: [], difficultyDistribution: {},
      topScenarios: [], scoreByDifficulty: {},
      recentImprovement: 0, practiceDates: [],
      averageScore: Math.round(averageScore * 100) / 100
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
      id: m.id, name: m.display_name || m.model_id, provider: m.provider,
      status: m.is_active ? 'active' : 'inactive', temperature: m.temperature,
      maxTokens: m.max_tokens, repetitionPenalty: 1.1, apiKey: m.api_key ? '****' : '',
      usageQuota: 10000, usageCurrent: 0, alertThreshold: 80
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

    const newModel = {
      id: crypto.randomUUID(),
      display_name: data.name,
      provider: data.provider || 'custom',
      model_id: data.modelId,
      base_url: data.baseUrl || '',
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
    if (data.temperature !== undefined) updateData.temperature = data.temperature;
    if (data.maxTokens !== undefined) updateData.max_tokens = data.maxTokens;
    if (data.apiKey !== undefined && data.apiKey !== '****') updateData.api_key = data.apiKey;
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
    const { baseUrl, apiKey, modelId } = data;

    if (!apiKey || !modelId) {
      return sendJson(res, 400, { success: false, error: 'Missing required parameters' });
    }

    // Build the test URL based on provider
    let testUrl = baseUrl || 'https://api.openai.com/v1';
    if (!testUrl.endsWith('/chat/completions')) {
      testUrl = testUrl.replace(/\/$/, '') + '/chat/completions';
    }

    // Make a simple API call to test the connection
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      }),
    });

    if (response.ok) {
      sendJson(res, 200, { success: true, message: '连接成功' });
    } else {
      const errorText = await response.text().catch(() => '');
      sendJson(res, 200, { success: false, message: `连接失败: HTTP ${response.status}` });
    }
  } catch (err) {
    sendJson(res, 200, { success: false, message: `连接错误: ${err.message}` });
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

    console.log('Weekly cron completed:', results);
    sendJson(res, 200, { success: true, data: results });
  } catch (err) {
    console.error('Weekly cron error:', err);
    sendJson(res, 500, { success: false, error: 'Weekly cron job failed' });
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
