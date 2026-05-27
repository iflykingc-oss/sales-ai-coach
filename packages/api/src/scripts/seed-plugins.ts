import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const INDUSTRY_PLUGINS = [
  {
    name: 'SaaS软件',
    industry: 'SaaS',
    category: '科技',
    description: '覆盖CRM、ERP、协同办公等SaaS产品的销售话术和场景',
    scripts: [
      { style: '共情版', content: '理解您对数据安全的顾虑，我们的方案通过了SOC2认证...' },
      { style: '直爽版', content: '直接说，你们现在用的系统每月浪费多少人工？' },
      { style: '专业版', content: '根据Gartner报告，同类产品平均ROI在6个月内...' },
    ],
    scenarios: ['首次演示', '价格谈判', '竞品对比', '续费沟通', '异议处理'],
    knowledge: ['产品功能对比表', '客户成功案例', '定价策略指南'],
    customerProfiles: ['技术决策者', '业务负责人', '采购经理'],
    bestPractices: ['先演示核心价值', '用数据说话', '提供试用期'],
  },
  {
    name: '医疗器械',
    industry: '医疗器械',
    category: '医疗',
    description: '医疗设备、耗材、诊断试剂等医疗器械行业专用话术',
    scripts: [
      { style: '共情版', content: '王主任，完全理解您对设备稳定性的高要求...' },
      { style: '直爽版', content: '这款设备的故障率低于0.1%，远低于行业平均...' },
      { style: '专业版', content: '该设备已获得NMPA三类注册证，临床数据表明...' },
    ],
    scenarios: ['科室拜访', '院长沟通', '招标应对', '售后回访', '学术推广'],
    knowledge: ['产品注册证信息', '临床试验数据', '招标参数模板'],
    customerProfiles: ['科室主任', '设备科长', '院长', '采购主任'],
    bestPractices: ['重视学术支持', '提供临床数据', '建立长期关系'],
  },
  {
    name: '房地产',
    industry: '房地产',
    category: '地产',
    description: '住宅、商业地产、写字楼等房地产销售话术',
    scripts: [
      { style: '共情版', content: '李先生，买房是大事，我理解您需要慎重考虑...' },
      { style: '直爽版', content: '这个户型目前只剩3套，上周已经卖出5套了...' },
      { style: '专业版', content: '从区域规划来看，地铁3号线明年通车，预计增值...' },
    ],
    scenarios: ['首次到访', '带看讲解', '价格谈判', '签约促成', '老带新'],
    knowledge: ['楼盘销控表', '区域规划图', '户型图册', '竞品分析'],
    customerProfiles: ['刚需首套', '改善型', '投资客', '企业购房'],
    bestPractices: ['了解客户真实需求', '制造紧迫感', '提供专业分析'],
  },
  {
    name: '教育培训',
    industry: '教育',
    category: '教育',
    description: 'K12、职业培训、语言培训等教育行业招生话术',
    scripts: [
      { style: '共情版', content: '张妈妈，理解您对孩子学习的重视...' },
      { style: '直爽版', content: '孩子现在成绩中等，通过我们的系统训练...' },
      { style: '专业版', content: '我们的教研团队来自985高校，课程体系经过...' },
    ],
    scenarios: ['电话邀约', '到访咨询', '试听跟进', '续费沟通', '转介绍'],
    knowledge: ['课程大纲', '学员提分案例', '师资介绍', '价格体系'],
    customerProfiles: ['焦虑型家长', '理性型家长', '跟风型家长'],
    bestPractices: ['先诊断问题', '用案例说话', '提供试听体验'],
  },
  {
    name: '金融保险',
    industry: '金融',
    category: '金融',
    description: '银行理财、保险、基金等金融产品销售话术',
    scripts: [
      { style: '共情版', content: '王女士，理财确实需要谨慎，我理解您的顾虑...' },
      { style: '直爽版', content: '这款产品年化收益4.5%，在同类产品中排名前10%' },
      { style: '专业版', content: '根据您的风险测评结果，建议配置60%稳健型...' },
    ],
    scenarios: ['首次面谈', '需求分析', '产品推荐', '异议处理', '售后服务'],
    knowledge: ['产品说明书', '风险测评表', '市场分析报告', '合规指南'],
    customerProfiles: ['保守型投资者', '稳健型投资者', '激进型投资者'],
    bestPractices: ['做好风险评估', '合规销售', '持续跟进'],
  },
  {
    name: '汽车销售',
    industry: '汽车',
    category: '汽车',
    description: '乘用车、商用车、新能源汽车销售话术',
    scripts: [
      { style: '共情版', content: '张先生，选车确实需要多比较，我完全理解...' },
      { style: '直爽版', content: '这款车目前优惠2万，月底活动结束就恢复原价了' },
      { style: '专业版', content: '这款车搭载了最新的L2+辅助驾驶系统，百公里加速...' },
    ],
    scenarios: ['到店接待', '试驾邀约', '价格谈判', '金融方案', '交车仪式'],
    knowledge: ['车型配置表', '竞品对比', '金融方案', '保养手册'],
    customerProfiles: ['首次购车', '换车升级', '家庭用车', '商务用车'],
    bestPractices: ['了解用车场景', '提供试驾体验', '透明报价'],
  },
  {
    name: '快消品',
    industry: '快消',
    category: '零售',
    description: '食品饮料、日化用品等快消品渠道销售话术',
    scripts: [
      { style: '共情版', content: '老板，理解您货架位置紧张，我来帮您分析下...' },
      { style: '直爽版', content: '这款产品在周边社区卖得很好，利润能达到30%' },
      { style: '专业版', content: '根据我们的市场调研，这个区域的消费力...' },
    ],
    scenarios: ['渠道开发', '终端拜访', '促销谈判', '库存管理', '账款催收'],
    knowledge: ['产品价格表', '促销方案', '渠道政策', '市场分析'],
    customerProfiles: ['便利店老板', '超市采购', '经销商'],
    bestPractices: ['建立客情关系', '提供动销支持', '及时回款'],
  },
  {
    name: '电商运营',
    industry: '电商',
    category: '互联网',
    description: '电商平台运营、直播带货、社交电商话术',
    scripts: [
      { style: '共情版', content: '亲，这款是我们店铺的爆款，很多老客户都回购...' },
      { style: '直爽版', content: '今天下单直接减50，还送价值99元的赠品' },
      { style: '专业版', content: '这款产品采用了XX技术，解决了市面上同类产品的痛点...' },
    ],
    scenarios: ['客服接待', '售后处理', '直播话术', '社群运营', '复购引导'],
    knowledge: ['产品详情页', '售后政策', '活动方案', '用户评价'],
    customerProfiles: ['价格敏感型', '品质追求型', '冲动消费型'],
    bestPractices: ['快速响应', '专业解答', '引导好评'],
  },
];

async function seed() {
  console.log('Seeding industry plugins...');

  for (const plugin of INDUSTRY_PLUGINS) {
    await prisma.industryPlugin.upsert({
      where: { industry: plugin.industry },
      update: {
        name: plugin.name,
        category: plugin.category,
        description: plugin.description,
        scripts: plugin.scripts,
        scenarios: plugin.scenarios,
        knowledge: plugin.knowledge,
        customerProfiles: plugin.customerProfiles,
        bestPractices: plugin.bestPractices,
      },
      create: {
        name: plugin.name,
        industry: plugin.industry,
        category: plugin.category,
        description: plugin.description,
        scripts: plugin.scripts,
        scenarios: plugin.scenarios,
        knowledge: plugin.knowledge,
        customerProfiles: plugin.customerProfiles,
        bestPractices: plugin.bestPractices,
        rating: 4.0 + Math.random() * 0.8,
        installCount: Math.floor(Math.random() * 500) + 100,
      },
    });
    console.log(`  Seeded: ${plugin.name}`);
  }

  console.log('Seeding complete!');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
