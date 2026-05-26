import type { PluginScript, PluginScenario } from '@/stores/pluginStore';

export const pluginContentMap: Record<string, { scripts: PluginScript[]; scenarios: PluginScenario[] }> = {
  p1: {
    scripts: [
      { id: 'p1s1', title: '首访开场白', content: '您好，我是XX公司的顾问。我们注意到贵司最近在推进数字化转型，今天想和您聊聊我们如何帮助类似企业提升了30%的销售效率。', scenario: '初次拜访' },
      { id: 'p1s2', title: '产品价值演示', content: '让我给您展示一下我们的核心功能——智能线索评分。它能帮您识别哪些客户最可能成交，让您的团队把精力放在正确的机会上。', scenario: '产品演示' },
      { id: 'p1s3', title: '价格异议处理', content: '我理解您的顾虑。不过，我们的客户平均在3个月内收回了投资成本。我们可以按模块逐步实施，降低初期投入。', scenario: '价格谈判' },
      { id: 'p1s4', title: '竞品对比回应', content: 'Salesforce确实是个好产品，但我们的优势在于更贴合国内企业的审批流程和使用习惯，而且实施周期只需要对方的1/3。', scenario: '竞品分析' },
      { id: 'p1s5', title: '需求挖掘提问', content: '目前团队在客户跟进过程中，您觉得最大的痛点是什么？是线索分配不均，还是跟进记录不透明？', scenario: '需求挖掘' },
      { id: 'p1s6', title: 'ROI计算话术', content: '以您团队的规模，假设转化率提升15%，每季度额外成交5个客户，按平均客单价20万算，就是每季度额外100万营收。', scenario: '价值证明' },
    ],
    scenarios: [
      { id: 'p1sc1', name: '新客户首次拜访', difficulty: 'beginner', description: '模拟与IT总监的初次见面，介绍SaaS产品核心价值' },
      { id: 'p1sc2', name: '产品演示与试用', difficulty: 'intermediate', description: '在演示会议上展示产品功能，回答技术团队提问' },
      { id: 'p1sc3', name: '采购部门价格谈判', difficulty: 'intermediate', description: '与采购负责人讨论合同条款和价格方案' },
      { id: 'p1sc4', name: 'CXO决策层汇报', difficulty: 'advanced', description: '向CEO/VP级别决策者汇报ROI和实施计划' },
      { id: 'p1sc5', name: '竞品替换方案', difficulty: 'advanced', description: '说服正在使用竞品的客户切换到你的方案' },
    ],
  },
  p2: {
    scripts: [
      { id: 'p2s1', title: '科室主任拜访', content: '主任您好，我们的新一代影像设备在分辨率上提升了40%，同时降低了30%的辐射剂量，对患者和医生都有很大好处。', scenario: '初次拜访' },
      { id: 'p2s2', title: '招标回应策略', content: '我们完全响应招标文件的26项技术要求，其中有8项指标优于招标要求。这是第三方检测报告。', scenario: '投标回应' },
      { id: 'p2s3', title: '合规与资质说明', content: '我们的产品已取得NMPA三类医疗器械注册证，并通过ISO 13485质量管理体系认证。', scenario: '合规说明' },
      { id: 'p2s4', title: '售后服务承诺', content: '我们提供2年质保、4小时响应、24小时到场的服务承诺，并在全国设有15个服务网点。', scenario: '售后服务' },
      { id: 'p2s5', title: '耗材续约谈判', content: '考虑到贵院的用量，我们建议签订年度耗材供应协议，可以享受阶梯折扣，年采购量达50万可优惠15%。', scenario: '续约谈判' },
    ],
    scenarios: [
      { id: 'p2sc1', name: '科室设备推介', difficulty: 'beginner', description: '向科室主任推介新设备，介绍技术参数和临床优势' },
      { id: 'p2sc2', name: '招标采购应对', difficulty: 'intermediate', description: '准备和响应医院招标文件，制作投标方案' },
      { id: 'p2sc3', name: '经销商管理', difficulty: 'intermediate', description: '与区域经销商合作，管理渠道和价格体系' },
      { id: 'p2sc4', name: '学术会议营销', difficulty: 'advanced', description: '在医学会议上展示产品并建立专家关系' },
    ],
  },
  p3: {
    scripts: [
      { id: 'p3s1', title: '家长咨询回应', content: '家长您好，我们的课程基于国家课程标准，同时融入了启发式教学方法。孩子在这里不仅能提高成绩，还能培养独立思考能力。', scenario: '家长咨询' },
      { id: 'p3s2', title: '试听转化话术', content: '今天孩子在试听课上表现非常积极，特别是在互动环节。根据我们的评估，他在逻辑思维方面有很大潜力。', scenario: '试听转化' },
      { id: 'p3s3', title: '学费异议处理', content: '我理解您的考虑。我们提供分期付款方式，每月仅需XXX元。而且，我们保证如果第一个月不满意可全额退款。', scenario: '价格谈判' },
      { id: 'p3s4', title: '效果承诺说明', content: '我们承诺学员在3个月内成绩提升至少一个等级，如果未达到目标，可免费延长学习时间。', scenario: '效果保证' },
    ],
    scenarios: [
      { id: 'p3sc1', name: '家长咨询接待', difficulty: 'beginner', description: '接待来访家长，了解孩子情况并推荐合适课程' },
      { id: 'p3sc2', name: '试听课转化', difficulty: 'intermediate', description: '在试听课后促成家长报名' },
      { id: 'p3sc3', name: '续费挽留', difficulty: 'advanced', description: '处理学员到期续费，应对转校威胁' },
    ],
  },
  p4: {
    scripts: [
      { id: 'p4s1', title: '客户需求分析', content: '请问您购房的主要目的是自住还是投资？对区域有什么偏好吗？通勤时间要求呢？', scenario: '需求分析' },
      { id: 'p4s2', title: '房源推荐话术', content: '这套房子的亮点是：南北通透、采光好、学区对口重点小学。而且小区配套齐全，步行10分钟就是地铁站。', scenario: '房源推荐' },
      { id: 'p4s3', title: '价格谈判策略', content: '房东的心理底价是XXX万，我建议我们以XXX万报价，留出谈判空间。我可以帮您争取额外赠送家电。', scenario: '价格谈判' },
      { id: 'p4s4', title: '按揭贷款指导', content: '根据您目前的收入情况，建议首付比例为30%，贷款年限20年。我可以帮您联系合作银行，享受利率优惠。', scenario: '按揭指导' },
    ],
    scenarios: [
      { id: 'p4sc1', name: '带看房源', difficulty: 'beginner', description: '陪同客户看房，介绍房源特点和周边配套' },
      { id: 'p4sc2', name: '价格博弈', difficulty: 'intermediate', description: '在买卖双方之间协调价格，促成交易' },
      { id: 'p4sc3', name: '签约流程', difficulty: 'intermediate', description: '处理合同签署、贷款审批等后续流程' },
      { id: 'p4sc4', name: '竞品楼盘对比', difficulty: 'advanced', description: '应对客户对比其他楼盘的情况，突出优势' },
    ],
  },
  p5: {
    scripts: [
      { id: 'p5s1', title: '理财需求分析', content: '您目前的资产配置是怎样的？对风险和收益有什么期望？我们有保守型、平衡型和进取型三种方案可选。', scenario: '需求分析' },
      { id: 'p5s2', title: '保险产品介绍', content: '这款重疾险覆盖120种重大疾病，等待期仅90天。30岁男性每年保费约XXX元，保障额度50万。', scenario: '产品介绍' },
      { id: 'p5s3', title: '风险评估合规', content: '根据监管要求，我需要对您进行风险承受能力评估。这是问卷，请根据您的实际情况如实填写。', scenario: '风险评估' },
      { id: 'p5s4', title: '基金定投推荐', content: '建议您每月定投2000元，选择沪深300指数基金，长期来看年化收益率在8-12%左右。', scenario: '投资建议' },
      { id: 'p5s5', title: '客户异议处理', content: '我理解您对市场的担忧。但历史数据显示，坚持定投3年以上的客户中，90%都获得了正收益。', scenario: '异议处理' },
    ],
    scenarios: [
      { id: 'p5sc1', name: '理财客户开发', difficulty: 'beginner', description: '识别和开发有理财需求的潜在客户' },
      { id: 'p5sc2', name: '保险方案定制', difficulty: 'intermediate', description: '根据客户家庭情况定制保险方案' },
      { id: 'p5sc3', name: '市场波动应对', difficulty: 'advanced', description: '在市场下跌时安抚客户并调整策略' },
      { id: 'p5sc4', name: '高净值客户维护', difficulty: 'advanced', description: '为高净值客户提供专属财富管理方案' },
    ],
  },
  p6: {
    scripts: [
      { id: 'p6s1', title: 'Supplier Outreach', content: 'Hi, I found your product on 1688. We are interested in bulk purchasing. Could you share your MOQ and pricing for 1000+ units?', scenario: 'Supplier Contact' },
      { id: 'p6s2', title: 'Price Negotiation', content: 'Thank you for the quote. However, we found similar products at $2.50/unit. Could you match this price for a long-term partnership?', scenario: 'Price Negotiation' },
      { id: 'p6s3', title: 'Quality Assurance', content: 'Before placing a large order, we need to verify product quality. Can you provide samples and quality inspection reports?', scenario: 'Quality Check' },
      { id: 'p6s4', title: 'Listing Optimization', content: 'Your product title needs to include more keywords. I suggest: "Portable Wireless Bluetooth Speaker - Waterproof IPX7, 24H Battery, Deep Bass"', scenario: 'Listing Optimization' },
    ],
    scenarios: [
      { id: 'p6sc1', name: '供应商开发', difficulty: 'beginner', description: '在1688/阿里巴巴上寻找和联系供应商' },
      { id: 'p6sc2', name: '价格谈判', difficulty: 'intermediate', description: '与供应商就MOQ、价格和交期进行谈判' },
      { id: 'p6sc3', name: 'Listing优化', difficulty: 'intermediate', description: '优化Amazon/Shopee产品Listing提高转化' },
      { id: 'p6sc4', name: '品牌出海策略', difficulty: 'advanced', description: '制定DTC品牌出海和独立站运营策略' },
    ],
  },
  p7: {
    scripts: [
      { id: 'p7s1', title: 'Cold Email Outreach', content: 'Hi [Name], I noticed [Company] is scaling your engineering team. Our platform helps reduce onboarding time by 60%. Would you be open to a 15-min demo?', scenario: 'Cold Outreach' },
      { id: 'p7s2', title: 'Product Demo', content: 'Let me show you how our API integrates with your existing stack in under 5 minutes. No code changes required on your end.', scenario: 'Product Demo' },
      { id: 'p7s3', title: 'Objection Handling', content: "I understand you're happy with your current solution. Many of our customers felt the same before seeing a 3x improvement in conversion rates.", scenario: 'Objection Handling' },
      { id: 'p7s4', title: 'Closing the Deal', content: "Based on your team size, the Pro plan at $499/month would save you approximately 120 engineering hours per month. Shall we start with a 30-day pilot?", scenario: 'Closing' },
      { id: 'p7s5', title: 'Expansion Upsell', content: "Your team has seen great results with the core product. Adding the Analytics module would give you even deeper insights into user behavior.", scenario: 'Upsell' },
    ],
    scenarios: [
      { id: 'p7sc1', name: 'Cold Email Campaign', difficulty: 'beginner', description: 'Write and send effective cold emails to prospects' },
      { id: 'p7sc2', name: 'Discovery Call', difficulty: 'intermediate', description: 'Conduct a discovery call to understand prospect needs' },
      { id: 'p7sc3', name: 'Enterprise Negotiation', difficulty: 'advanced', description: 'Negotiate multi-stakeholder enterprise deals' },
      { id: 'p7sc4', name: 'Competitive Displacement', difficulty: 'advanced', description: 'Replace an entrenched competitor with your solution' },
    ],
  },
  p8: {
    scripts: [
      { id: 'p8s1', title: 'TikTok直播带货话术', content: '大家好！今天给大家带来的是XXX爆款产品，原价XXX，今天直播间只要XXX！只有100件，手慢就没了！', scenario: '直播带货' },
      { id: 'p8s2', title: 'Shopee店铺客服', content: '你好！这款产品支持7天无理由退换，满100元免运费。现在下单还享受新人9折优惠哦。', scenario: '店铺客服' },
      { id: 'p8s3', title: 'Lazada促销活动', content: '本月参加Lazada 9.9大促，报名参与Cross Voucher活动，满50减10，可以显著提升转化率。', scenario: '促销活动' },
      { id: 'p8s4', title: '本地化沟通', content: 'สวัสดีครับ/ค่ะ！我们支持COD货到付款，3-5天送达。如果有任何问题请随时联系我们。', scenario: '本地化沟通' },
    ],
    scenarios: [
      { id: 'p8sc1', name: 'TikTok直播销售', difficulty: 'beginner', description: '在TikTok Shop直播间进行产品销售' },
      { id: 'p8sc2', name: 'Shopee店铺运营', difficulty: 'intermediate', description: '管理Shopee店铺、优化Listing和处理客服' },
      { id: 'p8sc3', name: '大促活动策划', difficulty: 'advanced', description: '策划和执行平台大促活动（9.9、11.11）' },
    ],
  },
};

export function getPluginScripts(pluginId: string): PluginScript[] {
  return pluginContentMap[pluginId]?.scripts || [];
}

export function getPluginScenarios(pluginId: string): PluginScenario[] {
  return pluginContentMap[pluginId]?.scenarios || [];
}
