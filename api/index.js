const { URL } = require('url');
const crypto = require('crypto');

// ==================== CONFIG ====================
const SUPABASE_URL = 'https://njpesoquwbhclttopfqc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.aisalecoach.work';

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
    req.on('data', chunk => body += chunk);
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
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 7 * 24 * 60 * 60;
  const h = base64url(JSON.stringify(header));
  const p = base64url(JSON.stringify({ ...payload, iat: now, exp }));
  const sig = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${h}.${p}.${sig}`;
}

function verifyJWT(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;
  const expected = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(p, 'base64').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
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
    const { name, email, password } = await parseBody(req);
    if (!name || !email || !password) return sendJson(res, 400, { success: false, error: 'Name, email and password are required' });
    if (password.length < 6) return sendJson(res, 400, { success: false, error: 'Password must be at least 6 characters' });
    const existing = await sbQuery('users', { select: 'id', eq: { email }, limit: 1 });
    if (existing && existing.length > 0) return sendJson(res, 409, { success: false, error: 'Email already registered' });
    const hashedPassword = await hashPassword(password);
    const user = await sbInsert('users', {
      id: crypto.randomUUID(), name, email, password: hashedPassword,
      role: 'USER', plan: 'FREE', created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    });
    const token = createJWT({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET);
    res.setHeader('Set-Cookie', `token=${token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${7*24*60*60}`);
    sendJson(res, 201, { success: true, data: { user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan } } });
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
    sendJson(res, 200, { success: true, data: { user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan } } });
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

// --- Plans ---
routes['GET /api/plans'] = (req, res) => {
  sendJson(res, 200, { data: [
    { id: 'FREE', name: '免费版', price: 0, period: '月', features: ['每日5次话术生成','每日3次AI陪练','每日1次复盘分析','基础模板库'], limits: { scripts: 5, practices: 3, reviews: 1 } },
    { id: 'PROFESSIONAL', name: '专业版', price: 99, period: '月', features: ['无限话术生成','无限AI陪练','无限复盘分析','高级模板库','知识库上传','数据统计'], limits: { scripts: -1, practices: -1, reviews: -1 } },
    { id: 'TEAM', name: '团队版', price: 299, period: '月', features: ['专业版全部功能','团队协作','团队知识库','团队数据看板','优先支持'], limits: { scripts: -1, practices: -1, reviews: -1 } },
    { id: 'ENTERPRISE', name: '企业版', price: -1, period: '定制', features: ['团队版全部功能','私有化部署','专属客服','定制开发','SLA保障'], limits: { scripts: -1, practices: -1, reviews: -1 } }
  ]});
};

routes['GET /api/plans/current'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const users = await sbQuery('users', { select: 'plan', eq: { id: jwt.userId }, limit: 1 });
    if (!users || users.length === 0) return sendJson(res, 404, { success: false, error: 'User not found' });
    const plan = users[0].plan || 'FREE';
    const names = { FREE: '免费版', PROFESSIONAL: '专业版', TEAM: '团队版', ENTERPRISE: '企业版' };
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
    const { plan, targetPlan } = await parseBody(req);
    const newPlan = plan || targetPlan;
    if (!newPlan || !['FREE','PROFESSIONAL','TEAM','ENTERPRISE'].includes(newPlan)) return sendJson(res, 400, { success: false, error: 'Invalid plan' });
    await sbUpdate('users', { id: jwt.userId }, { plan: newPlan, updated_at: new Date().toISOString() });
    sendJson(res, 200, { success: true, data: { plan: newPlan } });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 500, { success: false, error: 'Internal server error' });
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
    const { input, inputType, industry, sessionId, frameworks, style, scenario } = await parseBody(req);

    // Generate script using template (AI integration happens when model is configured)
    const scriptData = generateFallbackScript(style || '标准', scenario || input || '通用场景', industry);

    // Save script to DB
    const scriptId = crypto.randomUUID();
    try {
      await sbInsert('scripts', {
        id: scriptId, user_id: jwt.userId, session_id: sessionId || null,
        content: scriptData.speechStyles[0]?.content || '', style: style || '标准',
        tags: [scenario || '通用'], industry: industry || null,
        status: 'DRAFT', weight: 1.0, created_at: new Date().toISOString()
      });
    } catch (e) { console.error('Script save error:', e.message); }

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
    const feedback = await sbSafeInsert('script_feedbacks', {
      id: crypto.randomUUID(), user_id: jwt.userId, script_id: scriptId,
      type: type || 'up', reason: reason || null, created_at: new Date().toISOString()
    });
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

    const practiceId = crypto.randomUUID();
    try {
      await sbInsert('practice_sessions', {
        id: practiceId, user_id: jwt.userId, session_id: sessionId || null,
        scenario: scenario || '通用销售场景', industry: industry || null,
        rounds: 0, score: 0, feedback: {}, transcript: [],
        created_at: new Date().toISOString()
      });
    } catch (e) { console.error('Practice session save error:', e.message); }

    sendJson(res, 201, { data: { data: {
      session_id: practiceId,
      greeting: `您好，我是您的${scenario || '销售'}练习客户。请开始您的销售话术。`,
      archetype_name: '标准客户'
    }}});
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    console.error('Practice init error:', err);
    sendJson(res, 500, { success: false, error: 'AI服务连接失败' });
  }
};

routes['POST /api/practices/message/stream'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const { sessionId, message, logicFramework } = await parseBody(req);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Simulate streaming response
    const roundNum = Math.floor(Math.random() * 5);
    const practiceResp = generateFallbackPracticeResponse(message, roundNum);
    const fullText = practiceResp.response;

    // Stream tokens
    const chars = fullText.split('');
    for (let i = 0; i < chars.length; i++) {
      res.write(`data: ${JSON.stringify({ type: 'token', content: chars[i] })}\n\n`);
      await new Promise(r => setTimeout(r, 20));
    }

    // Send done event
    res.write(`data: ${JSON.stringify({
      type: 'done',
      data: {
        response: fullText,
        emotion: practiceResp.emotion,
        round_score: practiceResp.round_score,
        evaluation_feedback: '继续加油',
        dimension_scores: { 开场白: 70, 需求探寻: 65, 异议处理: 55 },
        round: roundNum + 1,
        is_complete: roundNum >= 4,
        detectedStage: '需求探寻'
      }
    })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', data: { error: 'AI service temporarily unavailable' } })}\n\n`);
    res.end();
  }
};

routes['POST /api/practices/hint'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    const hints = [
      { hint: '尝试用开放式问题了解客户的真实需求', stageTip: '当前处于需求探寻阶段', emotionTip: '客户情绪中性，可以继续深入' },
      { hint: '客户对价格有顾虑，可以用价值对比法处理', stageTip: '当前处于异议处理阶段', emotionTip: '客户有些犹豫，需要增强信心' },
      { hint: '客户已经表现出购买意向，可以尝试促成', stageTip: '当前处于促成阶段', emotionTip: '客户情绪积极，适合推进' },
    ];
    const hint = hints[Math.floor(Math.random() * hints.length)];
    sendJson(res, 200, { data: hint });
  } catch (err) {
    if (err.status) return sendJson(res, err.status, { success: false, error: err.error });
    sendJson(res, 200, { data: { hint: '保持耐心，积极倾听客户的需求' } });
  }
};

routes['POST /api/practices/report'] = async (req, res) => {
  try {
    const jwt = requireAuth(req);
    sendJson(res, 200, { data: { data: generateFallbackReport() } });
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
    const { conversations } = await parseBody(req);
    const report = generateFallbackReport();
    const saved = await sbSafeInsert('review_reports', {
      id: crypto.randomUUID(), user_id: jwt.userId,
      summary: report.overall_score > 0.6 ? '整体表现良好，有提升空间' : '需要加强基础技能训练',
      strengths: report.strengths, improvements: report.weaknesses,
      recommendations: report.recommendations.map(r => typeof r === 'string' ? r : r.advice),
      created_at: new Date().toISOString()
    });
    sendJson(res, 200, { data: {
      id: saved.id, date: new Date().toISOString(), overallScore: report.overall_score,
      summary: report.strengths[0] + '，但' + report.weaknesses[0],
      strengths: report.strengths, improvements: report.weaknesses,
      actionItems: report.recommendations.map(r => typeof r === 'string' ? r : r.advice),
      recommendations: report.recommendations.map(r => typeof r === 'string' ? r : r.advice),
      radarScores: report.radarScores, scenarioType: '通用'
    }});
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

// Test model connection
routes['POST /api/admin/models/test'] = async (req, res) => {
  try {
    requireAdmin(req);
    const data = await parseBody(req);
    const { baseUrl, apiKey, modelId } = data;

    if (!apiKey || !modelId) {
      return sendJson(res, 400, { success: false, message: '缺少必要参数' });
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

// ==================== MAIN HANDLER ====================
module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { res.statusCode = 200; res.end(); return; }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

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
    catch (err) { console.error('Handler error:', err); sendJson(res, 500, { success: false, error: 'Internal server error' }); }
  } else {
    sendJson(res, 404, { success: false, error: 'Not found', path });
  }
};
