/**
 * @file industry-sync.js
 * @description 多渠道行业数据聚合器 - 自动从外部数据源获取并同步行业配置
 * @version 1.0.0
 */

const registry = require('./industry-context');

// 数据源优先级：数据库 > API > 配置文件 > 内置种子
const DATA_SOURCES = {
  DATABASE: 'database',
  API: 'api',
  CONFIG: 'config',
  SEED: 'seed'
};

class IndustrySyncManager {
  constructor() {
    this.syncInterval = null;
    this.lastSyncTime = null;
    this.syncStatus = 'idle'; // idle | syncing | success | error
    this.externalApis = new Map(); // 外部 API 数据源配置
    this.syncHistory = []; // 同步历史记录
  }

  /**
   * 启动自动同步（定时任务）
   * @param {number} intervalMs 同步间隔（毫秒），默认 5 分钟
   */
  startAutoSync(intervalMs = 5 * 60 * 1000) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // 立即执行一次同步
    this.syncAll();

    // 设置定时同步
    this.syncInterval = setInterval(() => {
      this.syncAll();
    }, intervalMs);

    console.log(`[IndustrySync] 自动同步已启动，间隔: ${intervalMs / 1000}s`);
  }

  /**
   * 停止自动同步
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('[IndustrySync] 自动同步已停止');
    }
  }

  /**
   * 注册外部 API 数据源
   * @param {string} name 数据源名称
   * @param {Object} config API 配置
   */
  registerExternalApi(name, config) {
    this.externalApis.set(name, {
      url: config.url,
      method: config.method || 'GET',
      headers: config.headers || {},
      transform: config.transform || ((data) => data), // 数据转换函数
      interval: config.interval || 300000, // 默认 5 分钟
      enabled: config.enabled !== false,
      lastFetch: null,
      errorCount: 0
    });
    console.log(`[IndustrySync] 注册外部 API: ${name}`);
  }

  /**
   * 从所有数据源同步行业数据
   */
  async syncAll() {
    if (this.syncStatus === 'syncing') {
      console.log('[IndustrySync] 同步正在进行中，跳过...');
      return;
    }

    this.syncStatus = 'syncing';
    const startTime = Date.now();
    const results = {};

    try {
      // 1. 从数据库同步
      results.database = await this.syncFromDatabase();

      // 2. 从外部 API 同步
      results.api = await this.syncFromExternalApis();

      // 3. 记录同步结果
      this.lastSyncTime = new Date();
      this.syncStatus = 'success';
      this.syncHistory.push({
        time: this.lastSyncTime,
        duration: Date.now() - startTime,
        results
      });

      // 只保留最近 100 条记录
      if (this.syncHistory.length > 100) {
        this.syncHistory = this.syncHistory.slice(-100);
      }

      console.log(`[IndustrySync] 同步完成，耗时: ${Date.now() - startTime}ms`, results);
    } catch (error) {
      this.syncStatus = 'error';
      console.error('[IndustrySync] 同步失败:', error.message);
    }
  }

  /**
   * 从数据库同步行业数据
   */
  async syncFromDatabase() {
    try {
      // 动态引入 Supabase 查询函数（避免循环依赖）
      const https = require('https');
      const SUPABASE_URL = process.env.SUPABASE_URL || 'https://doqcopkqbfpstuavfjsa.supabase.co';
      const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!SUPABASE_KEY) {
        return { source: DATA_SOURCES.DATABASE, status: 'skipped', reason: 'no_key' };
      }

      // 从 industry_plugins 表获取数据
      const plugins = await this.fetchFromSupabase(SUPABASE_URL, SUPABASE_KEY, 'industry_plugins', {
        select: '*',
        order: 'install_count.desc',
        limit: 100
      });

      let synced = 0;
      for (const plugin of plugins) {
        try {
          const config = this.parsePluginConfig(plugin);
          if (registry.register(plugin.name || plugin.industry, config)) {
            synced++;
          }
        } catch (e) {
          console.error(`[IndustrySync] 解析插件 ${plugin.name} 失败:`, e.message);
        }
      }

      return { source: DATA_SOURCES.DATABASE, status: 'success', synced, total: plugins.length };
    } catch (error) {
      return { source: DATA_SOURCES.DATABASE, status: 'error', error: error.message };
    }
  }

  /**
   * 从外部 API 同步行业数据
   */
  async syncFromExternalApis() {
    const results = [];

    for (const [name, apiConfig] of this.externalApis) {
      if (!apiConfig.enabled) continue;

      try {
        const data = await this.fetchFromExternalApi(name, apiConfig);
        const transformed = apiConfig.transform(data);

        let synced = 0;
        if (Array.isArray(transformed)) {
          for (const item of transformed) {
            if (item.name && item.config) {
              if (registry.register(item.name, item.config)) {
                synced++;
              }
            }
          }
        } else if (typeof transformed === 'object') {
          for (const [name, config] of Object.entries(transformed)) {
            if (registry.register(name, config)) {
              synced++;
            }
          }
        }

        apiConfig.lastFetch = new Date();
        apiConfig.errorCount = 0;
        results.push({ source: name, status: 'success', synced });
      } catch (error) {
        apiConfig.errorCount++;
        results.push({ source: name, status: 'error', error: error.message });
        console.error(`[IndustrySync] 外部 API ${name} 同步失败:`, error.message);
      }
    }

    return results;
  }

  /**
   * 从 Supabase 获取数据
   */
  async fetchFromSupabase(url, key, table, opts = {}) {
    return new Promise((resolve, reject) => {
      const https = require('https');
      let queryUrl = `${url}/rest/v1/${table}`;
      const params = new URLSearchParams();

      if (opts.select) params.append('select', opts.select);
      if (opts.limit) params.append('limit', opts.limit);
      if (opts.order) params.append('order', opts.order);

      const qs = params.toString();
      if (qs) queryUrl += `?${qs}`;

      https.get(queryUrl, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`Supabase error: ${res.statusCode}`));
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * 从外部 API 获取数据
   */
  async fetchFromExternalApi(name, config) {
    return new Promise((resolve, reject) => {
      const https = require('https');
      const http = require('http');
      const url = new URL(config.url);
      const client = url.protocol === 'https:' ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: config.method,
        headers: config.headers,
        timeout: 10000
      };

      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              resolve(data);
            }
          } else {
            reject(new Error(`API error: ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  /**
   * 解析插件配置
   */
  parsePluginConfig(plugin) {
    const parseJson = (str, fallback = []) => {
      try { return JSON.parse(str || '[]'); } catch { return fallback; }
    };

    const scripts = parseJson(plugin.scripts);
    const scenarios = parseJson(plugin.scenarios);
    const knowledge = parseJson(plugin.knowledge);
    const bestPractices = parseJson(plugin.best_practices);
    const customerProfiles = parseJson(plugin.customer_profiles);

    // 从 scripts 中提取关键词
    const keywords = scripts.flatMap(s => {
      const content = s.content || '';
      const matches = content.match(/[一-龥]{2,}/g) || [];
      return matches.slice(0, 10);
    }).slice(0, 20);

    // 从 knowledge 中提取痛点
    const painPoints = knowledge.map(k => {
      const content = typeof k === 'string' ? k : k.content || '';
      return content.substring(0, 50);
    }).slice(0, 5);

    return {
      role: plugin.description || '专业顾问',
      keywords: keywords.length > 0 ? keywords : [plugin.name || ''],
      colloquialPhrases: [],
      painPoints,
      valueProps: bestPractices.map(bp => typeof bp === 'string' ? bp : bp.content || '').slice(0, 5),
      objectionHandling: {},
      closingTechniques: customerProfiles.slice(0, 5),
      sampleData: {}
    };
  }

  /**
   * 获取同步状态
   */
  getStatus() {
    return {
      status: this.syncStatus,
      lastSyncTime: this.lastSyncTime,
      registeredIndustries: registry.getRegisteredIndustries().length,
      externalApis: Array.from(this.externalApis.entries()).map(([name, config]) => ({
        name,
        enabled: config.enabled,
        lastFetch: config.lastFetch,
        errorCount: config.errorCount
      })),
      recentSyncs: this.syncHistory.slice(-5)
    };
  }

  /**
   * 手动触发同步
   */
  async manualSync() {
    await this.syncAll();
    return this.getStatus();
  }
}

// 创建全局单例
const syncManager = new IndustrySyncManager();

// 注册默认的外部 API 数据源示例
// syncManager.registerExternalApi('industry-api-1', {
//   url: 'https://api.example.com/industries',
//   method: 'GET',
//   headers: { 'Authorization': 'Bearer xxx' },
//   transform: (data) => data.industries.map(i => ({ name: i.name, config: i }))
// });

module.exports = syncManager;
