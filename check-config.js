#!/usr/bin/env node
// 配置诊断脚本 - 检查模型调用失败的原因

const https = require('https');

const SUPABASE_URL = 'https://doqcopkqbfpstuavfjsa.supabase.co';

console.log('🔍 Sales AI Coach 配置诊断\n');

// 1. 检查环境变量
console.log('📋 1. 检查环境变量:');
const requiredEnvVars = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET'
];

let envOk = true;
for (const envVar of requiredEnvVars) {
  const value = process.env[envVar];
  if (value) {
    console.log(`  ✅ ${envVar}: 已配置 (${value.slice(0, 10)}...)`);
  } else {
    console.log(`  ❌ ${envVar}: 未配置`);
    envOk = false;
  }
}

if (!envOk) {
  console.log('\n⚠️  缺少必要的环境变量！请在 Vercel 中配置。');
  console.log('   进入 Vercel Dashboard → Settings → Environment Variables');
}

// 2. 测试 Supabase 连接
console.log('\n📋 2. 测试 Supabase 连接:');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (supabaseKey) {
  const testUrl = `${SUPABASE_URL}/rest/v1/model_configs?select=*&limit=5`;

  const options = {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  };

  https.get(testUrl, options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        try {
          const models = JSON.parse(data);
          console.log(`  ✅ Supabase 连接成功`);

          // 3. 检查模型配置
          console.log('\n📋 3. 检查模型配置:');
          if (models.length === 0) {
            console.log('  ❌ 没有配置任何模型！');
            console.log('   请进入管理后台 → 模型管理，添加并激活一个模型。');
          } else {
            const activeModel = models.find(m => m.is_active);
            if (activeModel) {
              console.log(`  ✅ 找到激活的模型: ${activeModel.display_name || activeModel.model_id}`);
              console.log(`     Provider: ${activeModel.provider}`);
              console.log(`     Model ID: ${activeModel.model_id}`);
              console.log(`     Base URL: ${activeModel.base_url || '(默认)'}`);
              console.log(`     API Key: ${activeModel.api_key ? '已配置' : '❌ 未配置'}`);
              console.log(`     Temperature: ${activeModel.temperature}`);
              console.log(`     Max Tokens: ${activeModel.max_tokens}`);

              if (!activeModel.api_key) {
                console.log('\n  ❌ 模型的 API Key 未配置！请在管理后台编辑模型，填入 API Key。');
              }
            } else {
              console.log('  ❌ 没有激活的模型！');
              console.log('   已配置的模型:');
              models.forEach(m => {
                console.log(`   - ${m.display_name || m.model_id} (is_active: ${m.is_active})`);
              });
              console.log('\n   请在管理后台激活一个模型。');
            }
          }
        } catch (e) {
          console.log('  ❌ 解析响应失败:', e.message);
        }
      } else {
        console.log(`  ❌ Supabase 查询失败: HTTP ${res.statusCode}`);
        console.log('   响应:', data.slice(0, 200));
      }
    });
  }).on('error', (e) => {
    console.log(`  ❌ 连接失败: ${e.message}`);
  });
} else {
  console.log('  ⏭️  跳过（SUPABASE_SERVICE_ROLE_KEY 未配置）');
}

// 4. 给出修复建议
console.log('\n📋 4. 修复建议:');
console.log('  1. 在 Vercel Dashboard 配置环境变量:');
console.log('     - SUPABASE_SERVICE_ROLE_KEY: Supabase 的 service_role key');
console.log('     - JWT_SECRET: JWT 密钥');
console.log('');
console.log('  2. 在管理后台配置模型:');
console.log('     - 访问 https://www.aisalecoach.work/app/admin');
console.log('     - 进入「模型管理」标签');
console.log('     - 添加模型（如 Qwen、GPT-4、Claude）');
console.log('     - 填入 API Key 并激活');
console.log('');
console.log('  3. 常见模型配置:');
console.log('     - Qwen: https://dashscope.aliyuncs.com/compatible-mode/v1');
console.log('     - OpenAI: https://api.openai.com/v1');
console.log('     - Claude: https://api.anthropic.com');
