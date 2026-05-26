import type { PluginScript, PluginScenario } from '@/stores/pluginStore';

// ============================================================
// 行业定义：52个行业插件（28国内 + 24海外）
// ============================================================

export interface IndustryDefinition {
  id: string;
  name: string;
  icon: string;
  category: 'domestic' | 'overseas';
  description: string;
  rating: number;
  reviewCount: number;
  installCount: number;
  version: string;
  lastUpdated: string;
  scriptCount: number;
  scenarioCount: number;
}

export const industryDefinitions: IndustryDefinition[] = [
  // ====== 国内行业 (28个) ======
  { id: 'd1', name: 'SaaS软件行业包', icon: '💻', category: 'domestic', description: '面向B端SaaS销售的全套话术、场景和知识库', rating: 4.8, reviewCount: 86, installCount: 1280, version: '2.1.0', lastUpdated: '2025-05-20', scriptCount: 200, scenarioCount: 8 },
  { id: 'd2', name: '医疗器械行业包', icon: '🏥', category: 'domestic', description: '医疗设备、耗材、试剂销售专用', rating: 4.6, reviewCount: 72, installCount: 960, version: '1.8.0', lastUpdated: '2025-05-18', scriptCount: 200, scenarioCount: 8 },
  { id: 'd3', name: '教育培训行业包', icon: '📚', category: 'domestic', description: 'K12、职教、素质教育招生话术', rating: 4.5, reviewCount: 54, installCount: 845, version: '1.5.0', lastUpdated: '2025-05-15', scriptCount: 200, scenarioCount: 7 },
  { id: 'd4', name: '房地产行业包', icon: '🏠', category: 'domestic', description: '新房、二手房、商业地产销售全流程', rating: 4.3, reviewCount: 48, installCount: 720, version: '1.3.0', lastUpdated: '2025-05-12', scriptCount: 200, scenarioCount: 7 },
  { id: 'd5', name: '金融服务行业包', icon: '💰', category: 'domestic', description: '银行、保险、证券理财销售专用话术', rating: 4.7, reviewCount: 95, installCount: 1100, version: '2.0.0', lastUpdated: '2025-05-22', scriptCount: 200, scenarioCount: 8 },
  { id: 'd6', name: '汽车销售行业包', icon: '🚗', category: 'domestic', description: '新车、二手车、4S店销售全流程', rating: 4.4, reviewCount: 63, installCount: 680, version: '1.4.0', lastUpdated: '2025-05-10', scriptCount: 200, scenarioCount: 7 },
  { id: 'd7', name: '保险销售行业包', icon: '🛡️', category: 'domestic', description: '寿险、财险、团险销售专用话术', rating: 4.6, reviewCount: 78, installCount: 920, version: '1.7.0', lastUpdated: '2025-05-14', scriptCount: 200, scenarioCount: 8 },
  { id: 'd8', name: '法律/律所行业包', icon: '⚖️', category: 'domestic', description: '法律服务咨询、诉讼代理销售话术', rating: 4.3, reviewCount: 41, installCount: 380, version: '1.2.0', lastUpdated: '2025-05-08', scriptCount: 200, scenarioCount: 6 },
  { id: 'd9', name: '建筑装饰行业包', icon: '🏗️', category: 'domestic', description: '家装设计、工程装修销售专用', rating: 4.2, reviewCount: 35, installCount: 540, version: '1.3.0', lastUpdated: '2025-05-09', scriptCount: 200, scenarioCount: 7 },
  { id: 'd10', name: '工业机械行业包', icon: '⚙️', category: 'domestic', description: 'CNC机床、自动化设备、工业机器人销售', rating: 4.5, reviewCount: 52, installCount: 460, version: '1.5.0', lastUpdated: '2025-05-11', scriptCount: 200, scenarioCount: 8 },
  { id: 'd11', name: '物流供应链行业包', icon: '🚛', category: 'domestic', description: '货运代理、仓配一体、冷链物流销售', rating: 4.4, reviewCount: 47, installCount: 520, version: '1.4.0', lastUpdated: '2025-05-13', scriptCount: 200, scenarioCount: 7 },
  { id: 'd12', name: '餐饮食品行业包', icon: '🍜', category: 'domestic', description: '餐饮加盟、食品供应链、食材配送销售', rating: 4.1, reviewCount: 33, installCount: 480, version: '1.2.0', lastUpdated: '2025-05-07', scriptCount: 200, scenarioCount: 6 },
  { id: 'd13', name: '医疗健康行业包', icon: '🩺', category: 'domestic', description: '民营医院、诊所、体检中心销售', rating: 4.6, reviewCount: 61, installCount: 670, version: '1.6.0', lastUpdated: '2025-05-16', scriptCount: 200, scenarioCount: 7 },
  { id: 'd14', name: '酒店旅游行业包', icon: '🏨', category: 'domestic', description: '酒店管理、旅行社、OTA平台销售', rating: 4.2, reviewCount: 38, installCount: 390, version: '1.3.0', lastUpdated: '2025-05-06', scriptCount: 200, scenarioCount: 6 },
  { id: 'd15', name: '服装纺织行业包', icon: '👔', category: 'domestic', description: '服装批发、品牌加盟、面料供应销售', rating: 4.1, reviewCount: 29, installCount: 350, version: '1.2.0', lastUpdated: '2025-05-05', scriptCount: 200, scenarioCount: 6 },
  { id: 'd16', name: '能源电力行业包', icon: '⚡', category: 'domestic', description: '电力设备、光伏、储能项目销售', rating: 4.5, reviewCount: 44, installCount: 410, version: '1.4.0', lastUpdated: '2025-05-10', scriptCount: 200, scenarioCount: 7 },
  { id: 'd17', name: '农业农化行业包', icon: '🌾', category: 'domestic', description: '种子、农药、农机、农资销售专用', rating: 4.0, reviewCount: 26, installCount: 280, version: '1.1.0', lastUpdated: '2025-05-03', scriptCount: 200, scenarioCount: 5 },
  { id: 'd18', name: '化工材料行业包', icon: '🧪', category: 'domestic', description: '化工原料、新材料、涂料销售专用', rating: 4.3, reviewCount: 37, installCount: 320, version: '1.2.0', lastUpdated: '2025-05-04', scriptCount: 200, scenarioCount: 6 },
  { id: 'd19', name: '通信运营行业包', icon: '📡', category: 'domestic', description: '运营商业务、通信设备、物联网销售', rating: 4.4, reviewCount: 42, installCount: 450, version: '1.3.0', lastUpdated: '2025-05-09', scriptCount: 200, scenarioCount: 7 },
  { id: 'd20', name: '广告传媒行业包', icon: '📺', category: 'domestic', description: '广告投放、媒体代理、公关活动销售', rating: 4.3, reviewCount: 50, installCount: 560, version: '1.5.0', lastUpdated: '2025-05-12', scriptCount: 200, scenarioCount: 7 },
  { id: 'd21', name: '咨询猎头行业包', icon: '🤝', category: 'domestic', description: '管理咨询、猎头服务、外包销售', rating: 4.4, reviewCount: 45, installCount: 490, version: '1.4.0', lastUpdated: '2025-05-11', scriptCount: 200, scenarioCount: 7 },
  { id: 'd22', name: '家居建材行业包', icon: '🪑', category: 'domestic', description: '家具定制、建材批发、地板瓷砖销售', rating: 4.2, reviewCount: 36, installCount: 530, version: '1.3.0', lastUpdated: '2025-05-08', scriptCount: 200, scenarioCount: 6 },
  { id: 'd23', name: '3C数码行业包', icon: '📱', category: 'domestic', description: '手机、电脑、智能硬件销售专用', rating: 4.5, reviewCount: 67, installCount: 870, version: '1.7.0', lastUpdated: '2025-05-17', scriptCount: 200, scenarioCount: 8 },
  { id: 'd24', name: '宠物医疗行业包', icon: '🐾', category: 'domestic', description: '宠物医院、宠物用品、宠物食品销售', rating: 4.1, reviewCount: 31, installCount: 310, version: '1.1.0', lastUpdated: '2025-05-04', scriptCount: 200, scenarioCount: 5 },
  { id: 'd25', name: '美容美妆行业包', icon: '💄', category: 'domestic', description: '美容院线、美妆品牌、化妆品批发销售', rating: 4.3, reviewCount: 48, installCount: 620, version: '1.5.0', lastUpdated: '2025-05-14', scriptCount: 200, scenarioCount: 7 },
  { id: 'd26', name: '人力资源行业包', icon: '👥', category: 'domestic', description: '劳务派遣、灵活用工、培训认证销售', rating: 4.4, reviewCount: 43, installCount: 470, version: '1.4.0', lastUpdated: '2025-05-10', scriptCount: 200, scenarioCount: 6 },
  { id: 'd27', name: '健身体育行业包', icon: '🏋️', category: 'domestic', description: '健身房、体育赛事、运动品牌销售', rating: 4.0, reviewCount: 28, installCount: 290, version: '1.1.0', lastUpdated: '2025-05-03', scriptCount: 200, scenarioCount: 5 },
  { id: 'd28', name: '零售连锁行业包', icon: '🏪', category: 'domestic', description: '便利店、连锁加盟、新零售解决方案', rating: 4.3, reviewCount: 55, installCount: 710, version: '1.6.0', lastUpdated: '2025-05-15', scriptCount: 200, scenarioCount: 7 },

  // ====== 海外行业 (24个) ======
  { id: 'o1', name: '跨境电商行业包', icon: '🌐', category: 'overseas', description: 'Amazon、Shopify独立站运营与销售', rating: 4.4, reviewCount: 41, installCount: 650, version: '1.2.0', lastUpdated: '2025-05-10', scriptCount: 200, scenarioCount: 7 },
  { id: 'o2', name: '海外SaaS (Global)', icon: '☁️', category: 'overseas', description: 'International B2B SaaS sales toolkit', rating: 4.6, reviewCount: 38, installCount: 520, version: '1.1.0', lastUpdated: '2025-05-08', scriptCount: 200, scenarioCount: 8 },
  { id: 'o3', name: '东南亚电商行业包', icon: '🛒', category: 'overseas', description: 'Shopee、Lazada、TikTok Shop东南亚市场', rating: 4.2, reviewCount: 22, installCount: 380, version: '1.0.0', lastUpdated: '2025-05-05', scriptCount: 200, scenarioCount: 6 },
  { id: 'o4', name: 'Healthcare/Pharma', icon: '💊', category: 'overseas', description: 'Healthcare equipment & pharma sales playbook', rating: 4.7, reviewCount: 64, installCount: 780, version: '1.8.0', lastUpdated: '2025-05-18', scriptCount: 200, scenarioCount: 8 },
  { id: 'o5', name: 'Real Estate (Global)', icon: '🏡', category: 'overseas', description: 'Residential & commercial real estate sales', rating: 4.3, reviewCount: 35, installCount: 420, version: '1.3.0', lastUpdated: '2025-05-09', scriptCount: 200, scenarioCount: 7 },
  { id: 'o6', name: 'Financial Services', icon: '🏦', category: 'overseas', description: 'Banking, wealth management, fintech sales', rating: 4.6, reviewCount: 52, installCount: 560, version: '1.5.0', lastUpdated: '2025-05-12', scriptCount: 200, scenarioCount: 8 },
  { id: 'o7', name: 'Automotive (Global)', icon: '🚘', category: 'overseas', description: 'Auto dealership & fleet sales toolkit', rating: 4.4, reviewCount: 41, installCount: 490, version: '1.4.0', lastUpdated: '2025-05-11', scriptCount: 200, scenarioCount: 7 },
  { id: 'o8', name: 'Insurance (Global)', icon: '🛡️', category: 'overseas', description: 'Life, P&C, and commercial insurance sales', rating: 4.5, reviewCount: 47, installCount: 530, version: '1.5.0', lastUpdated: '2025-05-13', scriptCount: 200, scenarioCount: 8 },
  { id: 'o9', name: 'Construction/Industrial', icon: '🏭', category: 'overseas', description: 'Construction equipment & industrial sales', rating: 4.3, reviewCount: 33, installCount: 340, version: '1.2.0', lastUpdated: '2025-05-07', scriptCount: 200, scenarioCount: 7 },
  { id: 'o10', name: 'Legal Services', icon: '⚖️', category: 'overseas', description: 'Law firm business development & client acquisition', rating: 4.2, reviewCount: 28, installCount: 260, version: '1.1.0', lastUpdated: '2025-05-04', scriptCount: 200, scenarioCount: 5 },
  { id: 'o11', name: 'Hospitality/Travel', icon: '✈️', category: 'overseas', description: 'Hotel, airline, travel agency sales', rating: 4.1, reviewCount: 25, installCount: 310, version: '1.1.0', lastUpdated: '2025-05-05', scriptCount: 200, scenarioCount: 6 },
  { id: 'o12', name: 'Retail/E-commerce', icon: '🛍️', category: 'overseas', description: 'Retail chain & e-commerce platform sales', rating: 4.4, reviewCount: 44, installCount: 580, version: '1.5.0', lastUpdated: '2025-05-14', scriptCount: 200, scenarioCount: 7 },
  { id: 'o13', name: 'Manufacturing', icon: '🏭', category: 'overseas', description: 'Manufacturing equipment & supply chain sales', rating: 4.5, reviewCount: 39, installCount: 450, version: '1.4.0', lastUpdated: '2025-05-11', scriptCount: 200, scenarioCount: 7 },
  { id: 'o14', name: 'Logistics/Supply Chain', icon: '📦', category: 'overseas', description: 'Freight forwarding & logistics solutions', rating: 4.3, reviewCount: 31, installCount: 370, version: '1.2.0', lastUpdated: '2025-05-08', scriptCount: 200, scenarioCount: 6 },
  { id: 'o15', name: 'Food/Beverage', icon: '🍷', category: 'overseas', description: 'F&B distribution & wholesale sales', rating: 4.1, reviewCount: 27, installCount: 330, version: '1.1.0', lastUpdated: '2025-05-06', scriptCount: 200, scenarioCount: 6 },
  { id: 'o16', name: 'Energy/Oil & Gas', icon: '🛢️', category: 'overseas', description: 'Energy sector equipment & services sales', rating: 4.4, reviewCount: 36, installCount: 390, version: '1.3.0', lastUpdated: '2025-05-09', scriptCount: 200, scenarioCount: 7 },
  { id: 'o17', name: 'Telecommunications', icon: '📡', category: 'overseas', description: 'Telecom equipment & enterprise solutions', rating: 4.3, reviewCount: 30, installCount: 350, version: '1.2.0', lastUpdated: '2025-05-07', scriptCount: 200, scenarioCount: 6 },
  { id: 'o18', name: 'Agriculture (Global)', icon: '🌾', category: 'overseas', description: 'Agri-tech, seeds, fertilizers, farm equipment', rating: 4.0, reviewCount: 22, installCount: 240, version: '1.0.0', lastUpdated: '2025-05-03', scriptCount: 200, scenarioCount: 5 },
  { id: 'o19', name: 'Chemicals/Materials', icon: '🧪', category: 'overseas', description: 'Chemical & specialty materials sales', rating: 4.2, reviewCount: 26, installCount: 290, version: '1.1.0', lastUpdated: '2025-05-04', scriptCount: 200, scenarioCount: 5 },
  { id: 'o20', name: 'Media/Advertising', icon: '📺', category: 'overseas', description: 'Ad sales, media buying, agency services', rating: 4.3, reviewCount: 34, installCount: 410, version: '1.3.0', lastUpdated: '2025-05-09', scriptCount: 200, scenarioCount: 6 },
  { id: 'o21', name: 'Consulting/Staffing', icon: '🤝', category: 'overseas', description: 'Management consulting & staffing sales', rating: 4.4, reviewCount: 37, installCount: 430, version: '1.4.0', lastUpdated: '2025-05-10', scriptCount: 200, scenarioCount: 6 },
  { id: 'o22', name: 'Home Improvement', icon: '🔨', category: 'overseas', description: 'Home renovation, flooring, appliances sales', rating: 4.2, reviewCount: 29, installCount: 360, version: '1.2.0', lastUpdated: '2025-05-07', scriptCount: 200, scenarioCount: 6 },
  { id: 'o23', name: 'Consumer Electronics', icon: '📱', category: 'overseas', description: 'Electronics retail & B2B tech sales', rating: 4.5, reviewCount: 51, installCount: 610, version: '1.5.0', lastUpdated: '2025-05-15', scriptCount: 200, scenarioCount: 7 },
  { id: 'o24', name: 'Pet Healthcare', icon: '🐾', category: 'overseas', description: 'Veterinary supplies & pet industry sales', rating: 4.1, reviewCount: 24, installCount: 270, version: '1.0.0', lastUpdated: '2025-05-03', scriptCount: 200, scenarioCount: 5 },
];

// ============================================================
// 话术模板引擎 v2：多轮对话链 + 自然语言模式
// 参考: SalesGPT(context-aware stages), conversation-kit(dialogue graph),
// Hyperbound(realistic AI buyer persona)
// ============================================================

// --- 新的对话数据结构 ---

/** 对话阶段 (SalesGPT 7-stage model) */
export type ConversationStage =
  | 'introduction'      // 初次接触
  | 'qualification'     // 需求挖掘
  | 'value_proposition' // 价值证明
  | 'needs_analysis'    // 需求分析
  | 'solution'          // 产品介绍/方案呈现
  | 'objection'         // 异议处理
  | 'close';            // 关单促成

/** 对话风格 */
export type DialogueStyle = 'enthusiastic' | 'professional' | 'concise';

/** 对话轮次: 单轮交互 */
export interface DialogueTurn {
  speaker: 'seller' | 'customer';
  /** 话术模板，支持 {config} 占位符 */
  text: string;
  /** 可选: 客户回应分支 (仅 customer 轮次使用) */
  branches?: CustomerBranch[];
}

/** 客户回应分支 */
export interface CustomerBranch {
  /** 分支ID */
  id: string;
  /** 客户回应模式标签 */
  pattern: string;
  /** 客户实际回应文本 */
  text: string;
  /** 销售跟进话术 */
  followup: string;
  /** 回应情绪 */
  sentiment: 'positive' | 'neutral' | 'negative';
}

/** 完整对话链 */
export interface DialogueChain {
  id: string;
  /** 所属销售阶段 */
  stage: ConversationStage;
  /** 场景名称 */
  scenario: string;
  /** 对话标题 */
  title: string;
  /** 多轮对话序列 */
  turns: DialogueTurn[];
  /** 难度等级 */
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

/** 对话链模板(未填充 id/stage) */
interface DialogueChainTemplate {
  title: string;
  scenario: string;
  turns: DialogueTurn[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

/** 将未完成的模板转换为完整的 DialogueChain */
function toChain(
  template: DialogueChainTemplate,
  stage: ConversationStage,
  chainId: string,
): DialogueChain {
  return {
    id: chainId,
    stage,
    ...template,
  };
}

// --- 自然语言模式库 ---

/** 共情表达开头 (让话术更像真人) */
const EMPATHY_OPENERS_ZH = [
  '我完全理解您的想法，',
  '说实话，很多客户一开始也有类似的感受，',
  '这个问题确实值得认真考虑，',
  '您提到的这点非常关键，',
  '感谢您坦诚地分享，',
  '我能感受到您的顾虑，',
  '这个想法很正常，',
];

const EMPATHY_OPENERS_EN = [
  'I completely understand where you\'re coming from, ',
  'Honestly, a lot of our clients felt the same way initially, ',
  'That\'s a really fair point to bring up, ',
  'I appreciate you sharing that, ',
  'That\'s a great question, ',
  'I hear you, and it\'s a valid concern, ',
  'That makes total sense, ',
];

/** 过渡填充词 (增加口语感) */
const FILLER_PHRASES_ZH = [
  '其实吧，',
  '说实话，',
  '您知道吗，',
  '我跟您分享一个真实案例，',
  '这么说吧，',
  '打个比方，',
  '换句话说，',
];

const FILLER_PHRASES_EN = [
  'You know what, ',
  'Here\'s the thing — ',
  'Let me share a quick story, ',
  'Think of it this way: ',
  'The way I see it, ',
  'Put simply, ',
  'To be honest, ',
];

/** 开放式提问模板 */
const OPEN_QUESTIONS_ZH = [
  '能具体说说吗？',
  '您觉得最大的挑战在哪里？',
  '如果理想状态的话，您希望是什么样的？',
  '这个问题对您团队的实际影响有多大？',
  '之前尝试过哪些方法来解决？',
  '您觉得如果这个问题解决了，会带来什么改变？',
];

const OPEN_QUESTIONS_EN = [
  'Could you tell me more about that?',
  'What would your ideal outcome look like?',
  'How has this impacted your team day-to-day?',
  'What approaches have you tried so far?',
  'What would success look like for you?',
  'If you could change one thing, what would it be?',
];

// --- 多轮对话模板 (国内) ---

const DIALOGUE_CHAINS_DOMESTIC: Record<ConversationStage, DialogueChainTemplate[]> = {
  introduction: [
    {
      title: '电话初次接触',
      scenario: '初次接触',
      difficulty: 'beginner',
      turns: [
        {
          speaker: 'seller',
          text: '您好{customer}，我是{company}的{role}。不好意思打扰您两分钟，今天打电话来是因为我们最近帮助了不少{industry}的企业解决{pain1}的问题，效果还不错，所以想看看是否也能帮到您。',
        },
        {
          speaker: 'customer',
          text: '',
          branches: [
            { id: 'b1', pattern: 'positive', text: '哦？你们是怎么做的？', sentiment: 'positive', followup: '太好了！简单说一下，我们主要是通过{differentiator}来帮客户{result}。不知道您这边目前在{pain1}这块的具体感受是怎样的？' },
            { id: 'b2', pattern: 'neutral', text: '我现在比较忙，没时间。', sentiment: 'neutral', followup: '完全理解您的时间宝贵。要不这样，我给您发一份2分钟能看完的精简方案，您有空的时候扫一眼。觉得有意思我们再约时间聊？' },
            { id: 'b3', pattern: 'negative', text: '我们不需要，已经有供应商了。', sentiment: 'negative', followup: '明白，有稳定的供应商是好事。其实我们很多客户最开始也有合作供应商，后来选择我们是发现了{differentiator}这个不一样的价值。不急着做决定，先互相认识一下？' },
          ],
        },
        {
          speaker: 'seller',
          text: '不管最终是否合作，能认识一位{industry}的朋友也是好事。您方便加个微信吗？我平时会分享一些行业洞察，对您应该有帮助。',
        },
      ],
    },
    {
      title: '微信/企微破冰',
      scenario: '初次接触',
      difficulty: 'beginner',
      turns: [
        {
          speaker: 'seller',
          text: '{customer}您好！通过{name_channel}认识您很高兴。看到您在{industry}领域做得非常出色，我们刚好也专注这个赛道，帮助过{count}家类似企业实现{result}。',
        },
        {
          speaker: 'customer',
          text: '',
          branches: [
            { id: 'b1', pattern: 'positive', text: '谢谢关注，你们主要做什么的？', sentiment: 'positive', followup: '我们做{product}，核心帮您解决三件事：一是{pain1}，二是{pain2}，三是{pain3}。说多了不如看效果，要不给您发个3分钟的产品短视频？' },
            { id: 'b2', pattern: 'neutral', text: '好的，先存着。', sentiment: 'neutral', followup: '没问题！我朋友圈经常分享{industry}行业的干货和案例，您有空可以看看。有什么需要随时找我。' },
          ],
        },
      ],
    },
    {
      title: '转介绍引荐',
      scenario: '初次接触',
      difficulty: 'intermediate',
      turns: [
        {
          speaker: 'seller',
          text: '{referral_name}您好！是{referrer_name}推荐我联系您的。他说您在{industry}方面很有见解，建议我们认识一下。我们最近帮{referrer_company}做了{result}，他觉得您这边可能也有类似需求。',
        },
        {
          speaker: 'customer',
          text: '',
          branches: [
            { id: 'b1', pattern: 'positive', text: '{referrer_name}推荐的？那聊聊吧。', sentiment: 'positive', followup: '感谢信任！{referrer_name}是我们非常看重的合作伙伴。要不这周四或周五下午，我们约个15分钟的电话，我简单给您介绍一下？' },
          ],
        },
      ],
    },
  ],

  qualification: [
    {
      title: '需求深度挖掘',
      scenario: '需求挖掘',
      difficulty: 'intermediate',
      turns: [
        {
          speaker: 'seller',
          text: '上次聊完之后我一直在想您的情况。说实话，{industry}行业现在{pain1}这个问题越来越普遍了。能帮我了解一下，您团队目前在处理{pain1}时，具体是怎么操作的吗？',
        },
        {
          speaker: 'customer',
          text: '',
          branches: [
            { id: 'b1', pattern: 'positive', text: '我们目前用人工+Excel在处理，确实效率不高。', sentiment: 'positive', followup: 'Excel处理确实辛苦，而且容易出错对吧？您团队大概花多少时间在这些手工操作上？如果满分10分，给目前的效率打几分？' },
            { id: 'b2', pattern: 'neutral', text: '还行吧，勉强能应付。', sentiment: 'neutral', followup: '能应付说明您团队执行力很强。不过我好奇的是，如果业务量翻倍的话，现有方式还能撑得住吗？{pain2}有没有变得更明显？' },
          ],
        },
        {
          speaker: 'seller',
          text: '明白了。其实我们发现一个规律：{industry}企业当{metric}达到某个临界点时，就必须升级工具了。您觉得您们现在离这个临界点还有多远？',
        },
        {
          speaker: 'customer',
          text: '',
          branches: [
            { id: 'b1', pattern: 'positive', text: '感觉已经快到了，最近确实有些吃力。', sentiment: 'positive', followup: '那时机刚好。我们帮类似情况的企业上线后，通常{time}内就能看到{result}。要不给您做个免费诊断，看看具体能提升多少？' },
          ],
        },
      ],
    },
  ],

  value_proposition: [
    {
      title: 'ROI投资回报分析',
      scenario: '价值证明',
      difficulty: 'intermediate',
      turns: [
        {
          speaker: 'seller',
          text: '我跟您算一笔实在的账。按您刚才说的{base}，如果用我们的{product}，保守估计{result}。投入产出比是{roi}%，也就是说每投入1块钱能拿回来{roi}分钱。这不是费用，是投资。',
        },
        {
          speaker: 'customer',
          text: '',
          branches: [
            { id: 'b1', pattern: 'neutral', text: '数字看着不错，但真能实现吗？', sentiment: 'neutral', followup: '您有顾虑很正常。这么说吧，这个数据不是拍脑袋算的，来自{count}+同行业客户的真实数据。我可以给您看几个匿名客户的实际数据，您自己判断。' },
            { id: 'b2', pattern: 'positive', text: '如果真能这样确实值得试试。', sentiment: 'positive', followup: '我理解您想先验证效果。建议这样：我们先在一个小团队试点{time}，您亲眼看到数据再决定要不要全面推广。这样风险最低。' },
          ],
        },
      ],
    },
    {
      title: '竞品价值对比',
      scenario: '价值证明',
      difficulty: 'advanced',
      turns: [
        {
          speaker: 'seller',
          text: '您可能也在看{competitor}的方案。不瞒您说，{competitor}确实不错，但他们更偏{type1}的场景。从您刚才说的需求来看，{differentiator}这个维度上我们更匹配。',
        },
        {
          speaker: 'customer',
          text: '',
          branches: [
            { id: 'b1', pattern: 'neutral', text: '具体差在哪里？', sentiment: 'neutral', followup: '简单说三个关键差异：第一，{advantage}；第二，我们的{feature}更贴合{industry}场景；第三，{result}。我给您准备了一份详细对比表，一目了然。' },
          ],
        },
      ],
    },
  ],

  needs_analysis: [
    {
      title: '痛点诊断对话',
      scenario: '需求挖掘',
      difficulty: 'intermediate',
      turns: [
        {
          speaker: 'seller',
          text: '我准备了一份{industry}行业常见痛点的诊断清单，包含8个维度。您花2分钟做个快速自评，我帮您看看哪些地方最需要优化，怎么样？',
        },
        {
          speaker: 'customer',
          text: '',
          branches: [
            { id: 'b1', pattern: 'positive', text: '好的，我评完了。', sentiment: 'positive', followup: '从评分看，您在{pain1}和{pain2}这两个维度上得分偏低。这两个恰好是我们最能帮到您的地方。要不要我针对这两点给您演示一下我们的解决方案？' },
          ],
        },
      ],
    },
  ],

  solution: [
    {
      title: '产品演示+案例佐证',
      scenario: '产品介绍',
      difficulty: 'intermediate',
      turns: [
        {
          speaker: 'seller',
          text: '结合您前面提到的{pain1}和{pain2}，我给您重点演示三个功能。第一个帮您{result}，第二个解决{pain3}，第三个是{differentiator}。我边演示边说，您随时打断我提问。',
        },
        {
          speaker: 'customer',
          text: '',
          branches: [
            { id: 'b1', pattern: 'positive', text: '这个功能确实是我们需要的。', sentiment: 'positive', followup: '太好了！这个功能恰恰是我们根据{industry}行业top客户的反馈设计的。比如{company_name}用了之后，{result}。您觉得跟您的场景匹配度如何？' },
            { id: 'b2', pattern: 'neutral', text: '看着还行，但我担心团队用不惯。', sentiment: 'neutral', followup: '这个顾虑很实际。我们产品的设计理念就是"零学习成本"——界面跟您每天用的微信差不多。而且我们提供{sla}响应的专属培训，确保每个人都能上手。' },
          ],
        },
      ],
    },
  ],

  objection: [
    {
      title: '价格异议处理（LAARC框架）',
      scenario: '异议处理',
      difficulty: 'advanced',
      turns: [
        {
          speaker: 'seller',
          text: '',
          branches: [],
        },
        {
          speaker: 'customer',
          text: '你们的价格超出了我们的预算。',
          branches: [],
        },
        {
          speaker: 'seller',
          text: '我理解预算是个重要考量。{empathy}不过我想请您换个角度想：如果不解决这个问题，每年因为{pain1}造成的损失大概是多少？',
        },
        {
          speaker: 'customer',
          text: '',
          branches: [
            { id: 'b1', pattern: 'neutral', text: '粗略估计也有几十万吧。', sentiment: 'neutral', followup: '对，{filler}这个损失是持续发生的。而我们的方案是{cost}/月，{time}就能收回成本。相当于用很小的投入堵住一个大漏洞。这样想的话，其实非常划算。' },
            { id: 'b2', pattern: 'negative', text: '但还是太贵了，能不能便宜点？', sentiment: 'negative', followup: '价格上我可以帮您争取一个灵活方案：先上核心模块，每月{cost}，等看到效果再扩展。这样您前期投入很小，风险也低。我今天就跟领导申请一下？' },
          ],
        },
      ],
    },
    {
      title: '"再看看对比一下"应对',
      scenario: '异议处理',
      difficulty: 'intermediate',
      turns: [
        {
          speaker: 'customer',
          text: '我们还想再对比几家，不着急。',
          branches: [],
        },
        {
          speaker: 'seller',
          text: '对比是应该的，{empathy}买任何东西都要货比三家嘛。建议您对比的时候重点关注三个维度：一是{criteria1}，二是{criteria2}，三是{criteria3}。这三个才是决定最终效果的关键。',
        },
        {
          speaker: 'customer',
          text: '',
          branches: [
            { id: 'b1', pattern: 'neutral', text: '你们在这三个方面怎么样？', sentiment: 'neutral', followup: '我直接说：{criteria1}我们{advantage}；{criteria2}经过{count}+客户验证；{criteria3}承诺{sla}响应。我给您一份书面承诺，写进合同里。' },
          ],
        },
      ],
    },
  ],

  close: [
    {
      title: '温和关单（试点方案）',
      scenario: '关单促成',
      difficulty: 'intermediate',
      turns: [
        {
          speaker: 'seller',
          text: '今天聊了很多，我的建议是：不用一下子就全面上线。我们先从一个试点开始，选一个团队用{time}，目标很明确——{result}。如果达标了，咱们再谈全面合作；如果没达标，您零成本退出。这样您觉得可以吗？',
        },
        {
          speaker: 'customer',
          text: '',
          branches: [
            { id: 'b1', pattern: 'positive', text: '这个方案风险确实小，可以试试。', sentiment: 'positive', followup: '太好了！我今天就帮您把试点方案准备好。试点期间我全程跟进，每周给您一份进度报告。您看下周一开始可以吗？' },
            { id: 'b2', pattern: 'neutral', text: '我需要跟领导汇报一下。', sentiment: 'neutral', followup: '当然需要！我帮您准备一份精简的汇报材料，重点就三页：问题、方案、ROI。您拿去直接能汇报。如果需要我参加汇报会议也随时可以。' },
          ],
        },
      ],
    },
    {
      title: '紧迫感关单',
      scenario: '关单促成',
      difficulty: 'advanced',
      turns: [
        {
          speaker: 'seller',
          text: '跟您同步一个信息：我们下个月要调整价格体系，涨幅大约{percent}%。主要原因是最近加了很多新功能。如果您这周能确定的话，我可以帮您锁定当前价格，而且额外赠送{included}。',
        },
        {
          speaker: 'customer',
          text: '',
          branches: [
            { id: 'b1', pattern: 'positive', text: '那这周定下来确实划算。', sentiment: 'positive', followup: '对，这个时间点刚好。我这边马上走合同流程，预计{time}就能上线。合作愉快！' },
            { id: 'b2', pattern: 'neutral', text: '这周可能来不及走完流程。', sentiment: 'neutral', followup: '理解，大公司的流程确实需要时间。我先帮您做个价格锁定备案，只要{deadline}前走完流程就行。这样您不用担心涨价。' },
          ],
        },
      ],
    },
  ],
};

// --- 多轮对话模板 (海外) ---

const DIALOGUE_CHAINS_OVERSEAS: Record<ConversationStage, DialogueChainTemplate[]> = {
  introduction: [
    {
      title: 'Cold Outreach Call',
      scenario: '初次接触',
      difficulty: 'beginner',
      turns: [
        {
          speaker: 'seller',
          text: 'Hi {customer}, this is {name} from {company}. I know I\'m calling out of the blue, so I\'ll be brief — we\'ve been helping {industry} companies tackle {pain1} and the results have been pretty remarkable. I was hoping to steal 2 minutes of your time to see if there might be a fit.',
        },
        {
          speaker: 'customer',
          text: '',
          branches: [
            { id: 'b1', pattern: 'positive', text: 'Sure, I\'m curious. What are you seeing?', sentiment: 'positive', followup: 'Great. Essentially, through {differentiator} we\'re helping customers {result}. I\'d love to understand — how are you currently handling {pain1} on your end?' },
            { id: 'b2', pattern: 'neutral', text: 'I\'m in back-to-back meetings, can we reschedule?', sentiment: 'neutral', followup: 'Absolutely, I won\'t hold you up. How about I send over a 90-second overview video? If it resonates, we can find a time that works better for you.' },
            { id: 'b3', pattern: 'negative', text: 'We\'re already working with someone on this.', sentiment: 'negative', followup: 'That\'s actually great to hear — it means this is already a priority for you. Many of our best customers were happy with their existing vendor until they discovered {differentiator}. No pressure to switch — would you be open to a quick comparison?' },
          ],
        },
        {
          speaker: 'seller',
          text: 'Regardless, I\'d love to stay in touch. I share {industry} insights and benchmarks regularly. Would you be open to connecting on LinkedIn?',
        },
      ],
    },
  ],

  qualification: [
    {
      title: 'Discovery & Qualification',
      scenario: '需求挖掘',
      difficulty: 'intermediate',
      turns: [
        {
          speaker: 'seller',
          text: 'I\'ve been thinking about our last conversation. The challenge you described around {pain1} is something we hear from {industry} leaders all the time. Could you walk me through your current process? I\'m curious how your team handles it today.',
        },
        {
          speaker: 'customer',
          text: '',
          branches: [
            { id: 'b1', pattern: 'positive', text: 'We use a mix of manual processes and spreadsheets. It\'s not ideal.', sentiment: 'positive', followup: 'That\'s the most common answer I hear. Spreadsheets are great until they\'re not. How much time would you estimate your team spends on manual work? And if you could wave a magic wand, what would the ideal process look like?' },
            { id: 'b2', pattern: 'neutral', text: 'It works for now, nothing urgent.', sentiment: 'neutral', followup: 'That\'s fair — if it ain\'t broke, don\'t fix it. But let me ask: if your volume doubled in the next 6 months, would the current approach still hold up? Or would {pain2} start showing up?' },
          ],
        },
        {
          speaker: 'seller',
          text: 'Here\'s what we\'ve found: {industry} companies typically hit an inflection point around {base}. When {metric} reaches that threshold, manual processes become the bottleneck. Where do you think you are relative to that?',
        },
        {
          speaker: 'customer',
          text: '',
          branches: [
            { id: 'b1', pattern: 'positive', text: 'I think we\'re close to that point actually.', sentiment: 'positive', followup: 'Perfect timing then. Companies in your position typically see {result} within {time} of implementing our solution. Would you be open to a free diagnostic assessment? No strings attached.' },
          ],
        },
      ],
    },
  ],

  value_proposition: [
    {
      title: 'ROI Business Case',
      scenario: '价值证明',
      difficulty: 'intermediate',
      turns: [
        {
          speaker: 'seller',
          text: 'Let me run the numbers with you. Based on {base}, a conservative estimate with {product} is {result}. That\'s a {roi}% return — meaning for every dollar invested, you get back ${roi}. This isn\'t an expense, it\'s an asset.',
        },
        {
          speaker: 'customer',
          text: '',
          branches: [
            { id: 'b1', pattern: 'neutral', text: 'Those are impressive numbers, but can you actually deliver?', sentiment: 'neutral', followup: 'Fair skepticism. These aren\'t projections — they\'re based on actual data from {count}+ similar deployments. I\'m happy to share anonymized customer data so you can see for yourself.' },
            { id: 'b2', pattern: 'positive', text: 'If these numbers hold up, this is worth exploring.', sentiment: 'positive', followup: 'Let\'s validate it. I propose a focused pilot — one team, {time}, clear success metrics. If the data supports it, we expand. If not, you walk away with insights at zero cost.' },
          ],
        },
      ],
    },
  ],

  needs_analysis: [
    {
      title: 'Pain Point Discovery',
      scenario: '需求挖掘',
      difficulty: 'intermediate',
      turns: [
        {
          speaker: 'seller',
          text: 'I put together a quick diagnostic checklist — 8 dimensions that {industry} companies typically struggle with. Takes about 2 minutes. Want to run through it? I\'ll give you a heat map of where the biggest opportunities are.',
        },
        {
          speaker: 'customer',
          text: '',
          branches: [
            { id: 'b1', pattern: 'positive', text: 'Sure, let\'s do it.', sentiment: 'positive', followup: 'Looking at your scores, {pain1} and {pain2} are clearly the weakest links. Those happen to be our strongest areas. Want me to show you specifically how we\'d address each one?' },
          ],
        },
      ],
    },
  ],

  solution: [
    {
      title: 'Product Demo with Social Proof',
      scenario: '产品介绍',
      difficulty: 'intermediate',
      turns: [
        {
          speaker: 'seller',
          text: 'Based on everything you\'ve shared — especially {pain1} and {pain2} — I want to show you three things. First, how we solve {result}. Second, how we eliminate {pain3}. And third, our {differentiator} that sets us apart. Interrupt me anytime.',
        },
        {
          speaker: 'customer',
          text: '',
          branches: [
            { id: 'b1', pattern: 'positive', text: 'This is exactly what we\'ve been looking for.', sentiment: 'positive', followup: 'That\'s great to hear. This feature was actually built based on feedback from top {industry} customers. One customer saw {result} after implementation. How closely does this match your use case?' },
            { id: 'b2', pattern: 'neutral', text: 'Looks good, but I\'m worried about team adoption.', sentiment: 'neutral', followup: 'Adoption is the #1 reason implementations fail, so you\'re right to ask. Our design philosophy is "zero learning curve" — the interface feels like tools your team already uses daily. Plus we include dedicated training with {sla} response support.' },
          ],
        },
      ],
    },
  ],

  objection: [
    {
      title: 'Price Objection (LAARC Framework)',
      scenario: '异议处理',
      difficulty: 'advanced',
      turns: [
        {
          speaker: 'customer',
          text: 'Your pricing is beyond our current budget.',
          branches: [],
        },
        {
          speaker: 'seller',
          text: '{empathy} budget is always a real constraint. But let me flip the question for a second — what\'s the cost of NOT solving {pain1}? Based on what you\'ve shared, I\'d estimate it\'s a significant amount annually.',
        },
        {
          speaker: 'customer',
          text: '',
          branches: [
            { id: 'b1', pattern: 'neutral', text: 'Probably in the hundreds of thousands, yeah.', sentiment: 'neutral', followup: 'Exactly. {filler}That\'s money leaving your pocket every month. Our solution at {cost}/month pays for itself in {time}. It\'s like spending a dollar to stop a ten-dollar leak.' },
            { id: 'b2', pattern: 'negative', text: 'I get that, but the upfront cost is still too high.', sentiment: 'negative', followup: 'Let me propose a phased approach: start with core modules only, {cost}/month, and expand as you see results. Low upfront commitment, minimal risk. Let me run this by my leadership today?' },
          ],
        },
      ],
    },
    {
      title: '"We Need to Evaluate Other Options"',
      scenario: '异议处理',
      difficulty: 'intermediate',
      turns: [
        {
          speaker: 'customer',
          text: 'We want to look at a few more vendors before deciding.',
          branches: [],
        },
        {
          speaker: 'seller',
          text: 'That\'s absolutely the right approach. {empathy}If I were in your shoes, I\'d do the same. When you evaluate, I\'d suggest focusing on three criteria: {criteria1}, {criteria2}, and {criteria3}. Those are the real differentiators.',
        },
        {
          speaker: 'customer',
          text: '',
          branches: [
            { id: 'b1', pattern: 'neutral', text: 'How do you stack up on those?', sentiment: 'neutral', followup: 'Straight answer: on {criteria1}, {advantage}. On {criteria2}, validated by {count}+ customers. On {criteria3}, we commit to {sla} response — in writing, in the contract. I\'ll send you a comparison sheet.' },
          ],
        },
      ],
    },
  ],

  close: [
    {
      title: 'Pilot Close',
      scenario: '关单促成',
      difficulty: 'intermediate',
      turns: [
        {
          speaker: 'seller',
          text: 'Here\'s what I\'d suggest: let\'s not boil the ocean. We start with a focused pilot — one team, {time}, one clear goal: {result}. If we hit it, we expand. If we don\'t, you walk away at zero cost. Does that feel like a reasonable next step?',
        },
        {
          speaker: 'customer',
          text: '',
          branches: [
            { id: 'b1', pattern: 'positive', text: 'That\'s a low-risk way to test it. I\'m in.', sentiment: 'positive', followup: 'Fantastic. I\'ll have the pilot plan ready today. I\'ll be personally involved — weekly progress reports, direct line to me. Shall we kick off next Monday?' },
            { id: 'b2', pattern: 'neutral', text: 'I need to run this by my manager first.', sentiment: 'neutral', followup: 'Of course. I\'ll prepare a 3-page executive brief: the problem, our solution, and the ROI. You can take it straight to your meeting. Happy to join if you want a technical person in the room.' },
          ],
        },
      ],
    },
  ],
};

/**
 * 将多轮对话链转换为扁平话术 (向后兼容 PluginScript)
 * 提取所有 seller 轮次的文本作为独立话术
 */
function chainToScripts(chain: DialogueChain, prefix: string): PluginScript[] {
  const scripts: PluginScript[] = [];
  let idx = 1;

  for (const turn of chain.turns) {
    if (turn.speaker === 'seller' && turn.text) {
      scripts.push({
        id: `${prefix}_${chain.stage}_${idx}`,
        title: `${chain.title} - Step ${idx}`,
        content: turn.text,
        scenario: chain.scenario,
      });
      idx++;
    }
    if (turn.branches) {
      for (const branch of turn.branches) {
        scripts.push({
          id: `${prefix}_${chain.stage}_${idx}`,
          title: `${chain.title} → ${branch.sentiment === 'positive' ? '积极回应' : branch.sentiment === 'negative' ? '消极回应' : '中性回应'}`,
          content: branch.followup,
          scenario: chain.scenario,
        });
        idx++;
      }
    }
  }

  return scripts;
}

/**
 * 填充配置占位符到对话链
 */
function fillChainConfig(chain: DialogueChain, config: typeof DOMESTIC_CONFIGS[0]): DialogueChain {
  const replacer = (text: string) => text
    .replace(/\{company\}/g, config.company)
    .replace(/\{role\}/g, config.role)
    .replace(/\{product\}/g, config.product)
    .replace(/\{differentiator\}/g, config.differentiator)
    .replace(/\{pain1\}/g, config.pain1)
    .replace(/\{pain2\}/g, config.pain2)
    .replace(/\{pain3\}/g, config.pain3)
    .replace(/\{competitor\}/g, config.competitor)
    .replace(/\{criteria\}/g, config.criteria)
    .replace(/\{advantage\}/g, config.advantage)
    .replace(/\{metric\}/g, config.metric)
    .replace(/\{metric2\}/g, config.metric2)
    .replace(/\{base\}/g, config.base)
    .replace(/\{result\}/g, config.result)
    .replace(/\{roi\}/g, config.roi)
    .replace(/\{sla\}/g, config.sla)
    .replace(/\{sla2\}/g, config.sla2)
    .replace(/\{cost\}/g, '5000')
    .replace(/\{percent\}/g, '30')
    .replace(/\{count\}/g, '1000')
    .replace(/\{time\}/g, '3个月')
    .replace(/\{feature\}/g, 'AI智能分析')
    .replace(/\{type1\}/g, '标准化场景')
    .replace(/\{deadline\}/g, '本月底')
    .replace(/\{included\}/g, '免费培训和实施支持')
    .replace(/\{criteria1\}/g, '功能完整性')
    .replace(/\{criteria2\}/g, '实施周期')
    .replace(/\{criteria3\}/g, '售后服务')
    .replace(/\{company_name\}/g, '行业头部客户')
    .replace(/\{industry\}/g, config.industry)
    .replace(/\{customer\}/g, '[客户姓名]')
    .replace(/\{name\}/g, config.role)
    .replace(/\{name_channel\}/g, '行业社群')
    .replace(/\{referral_name\}/g, '[引荐人]')
    .replace(/\{referrer_name\}/g, '[推荐人]')
    .replace(/\{referrer_company\}/g, config.company);

  return {
    ...chain,
    turns: chain.turns.map((turn) => ({
      ...turn,
      text: turn.text ? replacer(turn.text) : turn.text,
      branches: turn.branches?.map((b) => ({
        ...b,
        followup: replacer(b.followup),
      })),
    })),
  };
}

// 通用销售阶段模板 (保留，用于生成额外话术)
const SALES_STAGES: Record<string, string[]> = {
  '初次接触': [
    '您好，我是{company}的{role}，了解到您在{need}方面有需求，今天想和您详细聊聊我们的解决方案。',
    '您好{customer}，很高兴有机会和您交流。我们在这个行业服务了超过{years}年，帮{count}家企业实现了目标，今天想和您分享一下成功经验。',
    '{customer}您好，感谢您在百忙之中抽出时间。我先简单介绍一下我们公司，然后听听您的具体需求，看看我们能否帮到您。',
    '您好！我注意到贵公司在{area}方面做得非常出色。我们的产品正好能帮助像您这样的企业进一步提升效率，大约能提升{percent}%。',
    '{customer}您好，我是{company}的{role}。今天来拜访您，主要是想了解一下您目前在{need}方面遇到的挑战，看看我们是否有机会合作。',
  ],
  '需求挖掘': [
    '能和我分享一下您目前在{need}方面遇到的最大挑战是什么吗？是{option1}还是{option2}？',
    '我想了解一下，您团队在{area}方面的流程是怎样的？从{step1}到{step2}大概需要多长时间？',
    '如果用一个词来形容您目前在{need}方面的现状，您会选什么？理想状态下又希望是什么样的？',
    '您之前尝试过哪些方法来解决{need}问题？效果如何？有哪些地方觉得还可以改进的？',
    '假设这个问题得到解决，对您团队的{metric}会有什么影响？大概能节省多少时间和成本？',
    '您团队的规模是多少？目前{need}相关的工作是由专人负责还是兼职处理？您觉得这种方式效率如何？',
    '在{need}方面，您的竞品或同行是怎么做的？您觉得他们有哪些值得我们学习的地方？',
    '如果满分10分，您给目前{need}的解决方案打几分？扣分的原因主要是什么？',
  ],
  '产品介绍': [
    '我们的{product}主要帮您解决三个核心问题：一是{pain1}，二是{pain2}，三是{pain3}。让我具体给您演示一下。',
    '让我给您展示一下我们的核心功能。您看，这个{feature}能帮您{benefit}，我们{count}家客户使用后的反馈是{feedback}。',
    '与市场上其他方案不同，我们的独特之处在于{differentiator}。这意味着您能获得{result}，而不是{alternative}。',
    '我们的产品分为{count}个模块，分别对应您刚才提到的{need1}、{need2}和{need3}需求。让我逐个给您展示。',
    '这个功能是我们根据{industry}行业top客户的反馈特别设计的，它能在{time}内帮您实现{result}。',
    '让我用一个实际案例来说明。{company_name}在使用我们产品之前，{problem}。使用{time}后，{result}。',
    '我们的{product}采用{technology}技术，与同类产品相比，{advantage1}提升了{percent}%，{advantage2}降低了{percent}%。',
    '您可以先免费试用{days}天，亲自体验一下{feature}功能。如果觉得满意，我们再讨论下一步的合作方案。',
  ],
  '价值证明': [
    '以您团队的规模，假设{metric}提升{percent}%，每年额外{result}，按平均{price}算，就是每年额外{total}收入。',
    '我们的客户平均在{months}个月内收回投资成本。以您的情况，预计{months}个月就能看到明显的ROI。',
    '让我给您算一笔账：您目前在{area}上的投入是{cost}/月，如果用我们的方案，不仅成本降低{percent}%，效果还能提升{percent}%。',
    '{company_name}和您的规模差不多，使用我们方案后，{time}内{metric}从{before}提升到{after}，提升了{percent}%。',
    '这个投资其实不是成本，而是{months}个月后就能产生回报的资产。而且我们支持按月付费，现金流压力很小。',
    '根据行业数据，使用我们方案的客户，平均{metric}提升了{percent}%，{metric2}降低了{percent}%。您的情况可能更好。',
    '我们做过一个详细的ROI分析报告。假设您的基数是{base}，使用我们方案{time}后，预计收益是{result}，投资回报率{roi}%。',
    '您可以先在一个小团队试点，{time}后看效果。如果数据证明了价值，再扩展到全公司，这样风险最低。',
  ],
  '异议处理': [
    '我完全理解您的顾虑。其实{company_name}在开始合作之前也有同样的担心，但使用后发现{result}。',
    '您提到的{objection}确实是需要考虑的因素。不过，从另一个角度看，{counter_argument}。',
    '很多客户在决定之前都会考虑这个问题。我们的做法是{approach}，这样既能{benefit}，又能降低{risk}。',
    '我理解{objection}这个顾虑。让我分享一个数据：{stat}。这说明{conclusion}。',
    '您说得对，{objection}确实是个问题。但如果不解决这个问题，您可能会面临{consequence}，而我们的方案正好能帮您避免。',
    '关于{objection}，我想补充一点：{fact}。所以实际上您的风险比想象中小得多。',
    '我理解您想对比更多方案。建议您重点关注{criteria1}和{criteria2}这两个维度，这也是客户做决定时最看重的。',
    '您的{objection}非常有道理。让我给您看一个详细的对比分析，您看完再决定是否合适。',
  ],
  '竞品对比': [
    '{competitor}确实是个不错的选择。不过我们的差异化在于{differentiator}，这对您的{need}来说更关键。',
    '我们理解客户会对比多个方案。从{criteria}来看，我们的优势是{advantage}，这一点{competitor}目前还做不到。',
    '{competitor}在{area}方面不错，但我们的{feature}在{metric}上领先{percent}%，这是经过第三方机构验证的。',
    '坦白讲，{competior}有他们的优势，但在{need}这个场景下，我们的{feature}更适合您，原因是{reason}。',
    '我们不做恶意竞争，只说事实：在{criteria1}、{criteria2}和{criteria3}三个维度上，我们都有明显优势。',
    '您可以把我们的方案和{competitor}做个详细对比，重点关注{criteria}。我们的客户对比后选择我们的比例是{percent}%。',
    '我们和{competitor}服务的是不同客群。他们更偏{type1}，我们更偏{type2}，从您的需求来看，{recommendation}。',
    '我建议您可以同时试用两家产品，用{time}来体验。但根据我们的数据，{percent}%的客户试用后选择留下。',
  ],
  '价格谈判': [
    '我理解您对价格的考虑。我们的报价是基于{basis}计算的，平均每天只要{daily_cost}，而帮您创造的价值是{value}/天。',
    '价格确实重要，但我们建议您更关注{value_metric}。我们的客户平均{time}就收回了成本，之后都是纯收益。',
    '我们有{count}种付费方案，从入门到企业版都有。根据您的实际需求，我推荐{plan}，性价比最高。',
    '如果您能签{duration}约，我们可以给您{percent}%的优惠。而且前{months}个月按半价，让您零风险起步。',
    '我们的定价是透明的，没有隐藏费用。您看到的价格就是最终价格，而且包含了{included}。',
    '预算方面我可以帮您做个灵活方案：先上核心模块{modules}，每月{cost}，等看到效果再加其他模块。',
    '我理解预算有限。不过，考虑到{benefit}和{roi}，这其实是一笔投资而非支出。而且我们支持{payment}方式。',
    '价格上我可以再和领导争取一下。如果您能在{deadline}前决定，我可以申请到{discount}的特别折扣。',
  ],
  '关单促成': [
    '如果您今天能确定合作，我可以额外给您{benefit}，包括{included}。这个优惠只到{deadline}。',
    '根据我们今天讨论的内容，我帮您整理了一个方案。如果没问题的话，我们可以{next_step}，预计{time}就能上线。',
    '您看我们是不是先从一个{scope}的项目开始？这样投入小、见效快，{time}就能看到效果，之后再决定是否扩展。',
    '我已经把方案和合同都准备好了。如果您确认没问题的话，今天签的话还能享受{discount}的首月优惠。',
    '我们下个月就要调整价格了，涨幅大约{percent}%。如果您这周能定下来，还能锁定当前的优惠价格。',
    '您还有什么顾虑吗？如果都解决了的话，我建议我们今天就把合作定下来，这样下周就能开始{benefit}。',
    '感谢您今天的时间。我想确认一下，您对我们方案的核心价值认可吗？如果认可的话，我们一起把合作细节敲定。',
    '基于您的需求和预算，我推荐的方案是{plan}，每月{cost}，包含{included}。如果OK的话，我们今天就可以开始走流程。',
  ],
  '售后维护': [
    '合作只是开始。我们为客户提供{service1}、{service2}和{service3}三重售后保障，确保您获得持续价值。',
    '我们有一个专属客户成功团队，{time}内响应您的需求。而且每月会有{count}次主动回访，确保您用得满意。',
    '您的客户成功经理是{name}，有任何问题随时联系。我们承诺{sla}响应时间，{sla2}解决问题。',
    '续约客户中，{percent}%都选择了升级方案。因为随着使用的深入，他们会发现更多可以优化的环节。',
    '我们每季度会做一次业务回顾，分析您使用{product}的{metric}数据，并给出优化建议。上次帮{company}优化后提升了{percent}%。',
    '您的{feature}模块使用情况非常好，{metric}达到了{result}。我们建议您可以试试{feature2}模块，效果会更好。',
    '恭喜您使用我们产品满{time}！期间您的{metric}提升了{percent}%。为了庆祝，我们给您准备了一个升级优惠。',
    '最近我们上线了{new_feature}功能，特别适合您目前的使用场景。让我给您演示一下，看看是否能进一步提升效率。',
  ],
};

// 国内行业配置
const DOMESTIC_CONFIGS = [
  { id: 'd1', industry: 'SaaS软件', company: 'XX科技', role: '客户顾问', product: '智能CRM系统', differentiator: '国内本地化定制能力+AI驱动', pain1: '线索转化率低', pain2: '客户流失严重', pain3: '销售过程不透明', competitor: 'Salesforce', criteria: '定制化程度和实施周期', advantage: '实施周期缩短60%', metric: '线索转化率', metric2: '客户流失率', base: '年营收5000万', result: '多创收800万', roi: '160', sla: '2小时', sla2: '24小时内' },
  { id: 'd2', industry: '医疗器械', company: 'XX医疗', role: '区域经理', product: '新一代影像设备', differentiator: 'NMPA三类注册证+国产替代性价比', pain1: '设备老化精度不足', pain2: '辐射剂量偏高', pain3: '售后响应慢', competitor: 'GE医疗', criteria: '图像精度和售后响应', advantage: '分辨率提升40%', metric: '诊断准确率', metric2: '辐射剂量', base: '年检查量5万人次', result: '提升诊断效率30%', roi: '200', sla: '4小时', sla2: '48小时内' },
  { id: 'd3', industry: '教育培训', company: 'XX教育', role: '课程顾问', product: '精品课程体系', differentiator: '名师团队+个性化学习方案', pain1: '学生成绩提升慢', pain2: '续费率低', pain3: '家长信任度不足', competitor: '新东方', criteria: '提分效果和师资水平', advantage: '3个月提分一个等级', metric: '提分率', metric2: '续费率', base: '在读学员200人', result: '多招80名新学员', roi: '180', sla: '1小时', sla2: '12小时内' },
  { id: 'd4', industry: '房地产', company: 'XX地产', role: '置业顾问', product: '精品楼盘项目', differentiator: '核心地段+优质学区', pain1: '客户犹豫不决', pain2: '竞品分流', pain3: '贷款审批慢', competitor: '链家', criteria: '地段和学区资源', advantage: '步行10分钟到地铁', metric: '成交转化率', metric2: '客户带看次数', base: '月均带看30组', result: '月均多成交5单', roi: '150', sla: '30分钟', sla2: '2小时内' },
  { id: 'd5', industry: '金融服务', company: 'XX金融', role: '理财经理', product: '财富管理方案', differentiator: '全牌照+智能投顾', pain1: '客户资产缩水', pain2: '产品选择困难', pain3: '市场波动大', competitor: '招商银行', criteria: '收益率和风险控制', advantage: '年化8-12%', metric: '投资收益率', metric2: '客户满意度', base: '管理资产100万', result: '年收益8-12万', roi: '8-12', sla: '30分钟', sla2: '4小时内' },
  { id: 'd6', industry: '汽车销售', company: 'XX汽车', role: '销售顾问', product: '新款车型', differentiator: '新能源+智能化驾驶', pain1: '续航焦虑', pain2: '充电不便', pain3: '保养成本高', competitor: '特斯拉', criteria: '续航和智能化配置', advantage: '续航600km+L3辅助', metric: '试驾转化率', metric2: '客户满意度', base: '月均到店100批', result: '月均多成交15台', roi: '200', sla: '15分钟', sla2: '2小时内' },
  { id: 'd7', industry: '保险销售', company: 'XX保险', role: '保险代理人', product: '综合保障方案', differentiator: '全保障范围+快速理赔', pain1: '保障不全面', pain2: '理赔流程复杂', pain3: '保费偏高', competitor: '平安保险', criteria: '保障范围和理赔速度', advantage: '90天等待期+极速理赔', metric: '签单率', metric2: '客户留存率', base: '年保费收入50万', result: '年增客户30人', roi: '300', sla: '1小时', sla2: '24小时内' },
  { id: 'd8', industry: '法律服务', company: 'XX律所', role: '业务拓展经理', product: '法律服务方案', differentiator: '专业团队+行业深耕', pain1: '诉讼周期长', pain2: '律师费不透明', pain3: '胜诉率不高', competitor: '金杜律所', criteria: '胜诉率和收费透明', advantage: '行业领先胜诉率95%', metric: '案件胜诉率', metric2: '客户满意度', base: '年案件量50件', result: '多创收200万', roi: '250', sla: '2小时', sla2: '12小时内' },
  { id: 'd9', industry: '建筑装饰', company: 'XX装饰', role: '设计师', product: '全屋定制方案', differentiator: '原创设计+环保材料', pain1: '装修质量差', pain2: '工期拖延', pain3: '预算超支', competitor: '尚品宅配', criteria: '设计能力和施工质量', advantage: '30天工期保证', metric: '客户满意度', metric2: '工期完成率', base: '月均接单10单', result: '月均多接5单', roi: '150', sla: '1小时', sla2: '4小时内' },
  { id: 'd10', industry: '工业机械', company: 'XX机械', role: '大客户经理', product: 'CNC加工中心', differentiator: '高精度+国产化替代', pain1: '加工精度不够', pain2: '设备故障率高', pain3: '进口设备贵', competitor: '德玛吉', criteria: '加工精度和性价比', advantage: '精度达到0.001mm', metric: '加工合格率', metric2: '设备稼动率', base: '年产值1000万', result: '节省30%加工成本', roi: '300', sla: '4小时', sla2: '24小时内' },
  { id: 'd11', industry: '物流供应链', company: 'XX物流', role: '商务经理', product: '智能仓配方案', differentiator: '全链路数字化+实时追踪', pain1: '配送延迟', pain2: '库存不准', pain3: '信息不透明', competitor: '顺丰', criteria: '时效性和信息化水平', advantage: '次日达99.5%', metric: '准时配送率', metric2: '库存准确率', base: '日均发货500单', result: '物流成本降低25%', roi: '250', sla: '2小时', sla2: '8小时内' },
  { id: 'd12', industry: '餐饮食品', company: 'XX餐饮', role: '招商经理', product: '连锁加盟方案', differentiator: '标准化运营+供应链支持', pain1: '口味不稳定', pain2: '供应链断裂', pain3: '品牌认知度低', competitor: '海底捞', criteria: '标准化和品牌力', advantage: '统一供应链+培训体系', metric: '单店利润率', metric2: '加盟存活率', base: '现有门店20家', result: '3年扩展到100家', roi: '500', sla: '1小时', sla2: '4小时内' },
  { id: 'd13', industry: '医疗健康', company: 'XX医疗', role: '商务拓展', product: '智慧医院方案', differentiator: 'AI辅助诊断+全流程数字化', pain1: '挂号排队久', pain2: '病历管理混乱', pain3: '医患沟通不畅', competitor: '卫宁健康', criteria: 'AI能力和实施经验', advantage: 'AI诊断准确率98%', metric: '就诊效率', metric2: '患者满意度', base: '日门诊量1000人', result: '就诊时间缩短40%', roi: '200', sla: '1小时', sla2: '4小时内' },
  { id: 'd14', industry: '酒店旅游', company: 'XX酒店', role: '销售经理', product: '酒店管理系统', differentiator: 'OTA直连+智能定价', pain1: '入住率低', pain2: '人工排班混乱', pain3: '渠道分散', competitor: '石基信息', criteria: 'OTA整合和收益管理', advantage: '收益提升20%', metric: '入住率', metric2: 'RevPAR', base: '客房200间', result: '年收入增加200万', roi: '180', sla: '2小时', sla2: '8小时内' },
  { id: 'd15', industry: '服装纺织', company: 'XX纺织', role: '大客户经理', product: '面辅料供应方案', differentiator: '快速打样+小单快反', pain1: '打样周期长', pain2: '面料色差', pain3: '交货不准时', competitor: '鲁泰纺织', criteria: '交期和品质稳定性', advantage: '7天打样30天交货', metric: '交货准时率', metric2: '次品率', base: '年订单量50万米', result: '次品率降低80%', roi: '200', sla: '2小时', sla2: '12小时内' },
  { id: 'd16', industry: '能源电力', company: 'XX电力', role: '项目经理', product: '光伏解决方案', differentiator: '转换效率高+全生命周期服务', pain1: '发电量不足', pain2: '运维成本高', pain3: '补贴政策变化', competitor: '隆基股份', criteria: '转换效率和运维服务', advantage: '转换效率23%+', metric: '年发电量', metric2: '运维成本', base: '装机容量10MW', result: '年发电1200万度', roi: '150', sla: '4小时', sla2: '24小时内' },
  { id: 'd17', industry: '农业农化', company: 'XX农化', role: '区域经理', product: '生物农药方案', differentiator: '绿色无残留+效果持久', pain1: '农药残留超标', pain2: '虫害抗性增强', pain3: '肥料效果不佳', competitor: '先正达', criteria: '效果和安全性', advantage: '零残留+抗虫谱广', metric: '作物产量', metric2: '农药使用量', base: '种植面积1000亩', result: '增产20%+用药减半', roi: '300', sla: '4小时', sla2: '24小时内' },
  { id: 'd18', industry: '化工材料', company: 'XX化工', role: '技术销售', product: '特种涂料方案', differentiator: '自主研发+定制化配方', pain1: '涂层附着力差', pain2: '环保不达标', pain3: '价格波动大', competitor: '立邦工业', criteria: '性能稳定性和环保认证', advantage: '通过VOC国标认证', metric: '附着力等级', metric2: 'VOC排放', base: '年用量50吨', result: 'VOC排放降低90%', roi: '200', sla: '4小时', sla2: '24小时内' },
  { id: 'd19', industry: '通信运营', company: 'XX通信', role: '行业客户经理', product: '5G行业专网', differentiator: '专网部署+边缘计算', pain1: '网络延迟高', pain2: '数据传输不安全', pain3: '运维成本高', competitor: '华为', criteria: '延迟和安全性', advantage: '端到端延迟<10ms', metric: '网络可用率', metric2: '数据传输安全', base: '园区网络500节点', result: '延迟降低90%', roi: '250', sla: '30分钟', sla2: '4小时内' },
  { id: 'd20', industry: '广告传媒', company: 'XX传媒', role: '客户总监', product: '数字营销方案', differentiator: 'AI投放优化+全渠道覆盖', pain1: 'ROI不达标', pain2: '流量贵', pain3: '效果不可追踪', competitor: '分众传媒', criteria: '投放ROI和数据透明', advantage: 'ROI提升200%', metric: '获客成本', metric2: '转化率', base: '月投放100万', result: '获客成本降低50%', roi: '200', sla: '1小时', sla2: '4小时内' },
  { id: 'd21', industry: '咨询猎头', company: 'XX咨询', role: '合伙人', product: '管理咨询方案', differentiator: '行业专家库+落地执行', pain1: '咨询方案不落地', pain2: '专家水平参差不齐', pain3: '收费高效果不明', competitor: '麦肯锡', criteria: '落地效果和性价比', advantage: '方案+陪跑落地', metric: '项目交付满意度', metric2: '客户复购率', base: '年项目10个', result: '复购率提升到80%', roi: '400', sla: '1小时', sla2: '8小时内' },
  { id: 'd22', industry: '家居建材', company: 'XX家居', role: '门店经理', product: '全屋定制方案', differentiator: '环保板材+智能设计', pain1: '甲醛超标', pain2: '风格搭配难', pain3: '尺寸不准', competitor: '索菲亚', criteria: '环保等级和设计能力', advantage: 'E0级环保+3D设计', metric: '客户满意度', metric2: '返工率', base: '月均接单30单', result: '返工率降低90%', roi: '150', sla: '1小时', sla2: '4小时内' },
  { id: 'd23', industry: '3C数码', company: 'XX数码', role: '产品经理', product: '智能硬件方案', differentiator: '芯片自研+生态互联', pain1: '兼容性问题', pain2: '售后维修慢', pain3: '更新换代快', competitor: '小米', criteria: '性能和生态整合', advantage: '全屋智能互联', metric: '客户留存率', metric2: '售后满意度', base: '月销量500台', result: '复购率提升40%', roi: '200', sla: '1小时', sla2: '12小时内' },
  { id: 'd24', industry: '宠物医疗', company: 'XX宠物', role: '业务经理', product: '宠物医疗设备', differentiator: '进口品质国产价格', pain1: '设备老旧', pain2: '宠物不配合', pain3: '专业人才缺乏', competitor: '瑞鹏', criteria: '设备先进性和价格', advantage: '宠物专用设计', metric: '诊断准确率', metric2: '客户满意度', base: '月接诊500只', result: '诊断效率提升50%', roi: '200', sla: '2小时', sla2: '12小时内' },
  { id: 'd25', industry: '美容美妆', company: 'XX美妆', role: '渠道经理', product: '院线产品方案', differentiator: '科技护肤+成分透明', pain1: '效果不明显', pain2: '客户流失快', pain3: '产品同质化', competitor: '欧莱雅', criteria: '功效和成分安全', advantage: '核心成分专利', metric: '客户回头率', metric2: '单客产值', base: '月均服务200人', result: '回头率提升60%', roi: '250', sla: '1小时', sla2: '8小时内' },
  { id: 'd26', industry: '人力资源', company: 'XX人力', role: '大客户经理', product: '灵活用工方案', differentiator: 'AI匹配+风险兜底', pain1: '招人难', pain2: '用工风险高', pain3: '管理成本大', competitor: '中智', criteria: '人才库规模和风险管控', advantage: '百万人才库+合规保障', metric: '招聘周期', metric2: '用工风险率', base: '年用工5000人', result: '招聘周期缩短50%', roi: '300', sla: '2小时', sla2: '8小时内' },
  { id: 'd27', industry: '健身体育', company: 'XX健身', role: '会籍顾问', product: '健身会员方案', differentiator: '智能教练+社群运营', pain1: '会员续卡率低', pain2: '教练水平不一', pain3: '设备维护不及时', competitor: '一兆韦德', criteria: '教练水平和设备', advantage: 'AI智能教练系统', metric: '会员续卡率', metric2: '满意度', base: '会员2000人', result: '续卡率提升到85%', roi: '200', sla: '1小时', sla2: '4小时内' },
  { id: 'd28', industry: '零售连锁', company: 'XX连锁', role: '拓展经理', product: '新零售解决方案', differentiator: '数字化门店+供应链整合', pain1: '线上线下不同步', pain2: '库存积压', pain3: '会员流失', competitor: '7-11', criteria: '系统整合和供应链', advantage: '全渠道一体化', metric: '库存周转率', metric2: '会员留存率', base: '门店50家', result: '库存周转提升40%', roi: '180', sla: '2小时', sla2: '8小时内' },
];

// 海外行业配置
const OVERSEAS_CONFIGS = [
  { id: 'o1', industry: '跨境电商', company: 'GlobalTrade', role: 'Account Manager', product: 'Cross-border E-commerce Platform', differentiator: 'Multi-channel listing + AI pricing optimization', pain1: 'Low conversion rate', pain2: 'Shipping delays', pain3: 'Platform policy changes', competitor: 'Jungle Scout', criteria: 'Automation and ROI', advantage: 'List 5x faster', metric: 'conversion rate', metric2: 'customer acquisition cost', base: '$100K monthly revenue', result: 'grow to $200K in 6 months', roi: '200', sla: '1 hour', sla2: '4 hours' },
  { id: 'o2', industry: 'B2B SaaS', company: 'CloudFirst', role: 'AE', product: 'Enterprise SaaS Platform', differentiator: 'API-first + AI-powered workflow automation', pain1: 'Low team productivity', pain2: 'Tool fragmentation', pain3: 'High churn rate', competitor: 'Salesforce', criteria: 'Integration capability and TCO', advantage: '60% faster implementation', metric: 'user adoption rate', metric2: 'churn rate', base: '50-seat deployment', result: 'save $500K annually', roi: '300', sla: '15 min', sla2: '2 hours' },
  { id: 'o3', industry: '东南亚电商', company: 'SEACo', role: 'Business Developer', product: 'E-commerce Operations Suite', differentiator: 'Local language support + COD optimization', pain1: 'High return rate', pain2: 'Payment collection', pain3: 'Platform compliance', competitor: 'SellerCenter', criteria: 'Local market expertise', advantage: '98% order fulfillment', metric: 'return rate', metric2: 'fulfillment time', base: '1000 orders/month', result: 'reduce returns by 40%', roi: '250', sla: '1 hour', sla2: '6 hours' },
  { id: 'o4', industry: 'Healthcare', company: 'MedTech', role: 'Territory Manager', product: 'Diagnostic Equipment', differentiator: 'FDA approved + AI-assisted diagnosis', pain1: 'Long diagnosis time', pain2: 'Equipment downtime', pain3: 'Training complexity', competitor: 'Philips', criteria: 'Accuracy and reliability', advantage: '99.2% diagnostic accuracy', metric: 'diagnosis throughput', metric2: 'equipment uptime', base: '500 patients/day', result: '50% faster throughput', roi: '200', sla: '2 hours', sla2: '8 hours' },
  { id: 'o5', industry: 'Real Estate', company: 'PropGlobal', role: 'Real Estate Advisor', product: 'Premium Property Portfolio', differentiator: 'Prime locations + Investment-grade', pain1: 'Low occupancy', pain2: 'High vacancy rates', pain3: 'Financing challenges', competitor: 'CBRE', criteria: 'Location and ROI potential', advantage: '8% annual yield', metric: 'occupancy rate', metric2: 'property appreciation', base: '$5M portfolio', result: '$400K annual rental', roi: '8', sla: '30 min', sla2: '4 hours' },
  { id: 'o6', industry: 'Financial Services', company: 'WealthEdge', role: 'Wealth Manager', product: 'Portfolio Management Platform', differentiator: 'AI-driven portfolio optimization', pain1: 'Underperforming assets', pain2: 'Market volatility', pain3: 'Client reporting burden', competitor: 'Bloomberg', criteria: 'Performance and reporting', advantage: '12% alpha generation', metric: 'portfolio returns', metric2: 'client satisfaction', base: '$10M AUM', result: '$1.2M annual returns', roi: '12', sla: '15 min', sla2: '2 hours' },
  { id: 'o7', industry: 'Automotive', company: 'AutoElite', role: 'Sales Consultant', product: 'New EV Lineup', differentiator: '400-mile range + Level 3 autonomy', pain1: 'Range anxiety', pain2: 'Charging infrastructure', pain3: 'Resale value', competitor: 'Tesla', criteria: 'Range and autonomous features', advantage: '400-mile WLTP range', metric: 'test-drive conversion', metric2: 'customer satisfaction', base: '50 test drives/month', result: '20 additional sales/month', roi: '400', sla: '15 min', sla2: '2 hours' },
  { id: 'o8', industry: 'Insurance', company: 'CoverPro', role: 'Insurance Broker', product: 'Comprehensive Insurance Suite', differentiator: 'Digital claims + Instant coverage', pain1: 'Complex claims process', pain2: 'Limited coverage options', pain3: 'High premiums', competitor: 'AIG', criteria: 'Claims speed and coverage breadth', advantage: '48-hour claims settlement', metric: 'policy adoption rate', metric2: 'customer retention', base: '200 policies/year', result: '60 additional clients', roi: '300', sla: '1 hour', sla2: '24 hours' },
  { id: 'o9', industry: 'Construction', company: 'BuildRight', role: 'Equipment Sales', product: 'Heavy Machinery Fleet', differentiator: 'Telematics + Predictive maintenance', pain1: 'Equipment breakdowns', pain2: 'Project delays', pain3: 'Safety incidents', competitor: 'Caterpillar', criteria: 'Reliability and uptime', advantage: '99% uptime guarantee', metric: 'equipment utilization', metric2: 'downtime hours', base: '$2M equipment spend', result: '30% less downtime', roi: '300', sla: '2 hours', sla2: '8 hours' },
  { id: 'o10', industry: 'Legal', company: 'LawFirm Pro', role: 'BD Manager', product: 'Legal Services Package', differentiator: 'Industry-specialized team + Fixed-fee billing', pain1: 'Unclear pricing', pain2: 'Slow case resolution', pain3: 'Communication gaps', competitor: 'Baker McKenzie', criteria: 'Win rate and transparency', advantage: '95% success rate', metric: 'case win rate', metric2: 'client satisfaction', base: '50 cases/year', result: '$5M additional revenue', roi: '250', sla: '2 hours', sla2: '8 hours' },
  { id: 'o11', industry: 'Hospitality', company: 'StayElite', role: 'Revenue Manager', product: 'Hotel Revenue Management', differentiator: 'Dynamic pricing + OTA integration', pain1: 'Low RevPAR', pain2: 'Channel conflicts', pain3: 'Forecasting errors', competitor: 'Amadeus', criteria: 'Revenue optimization accuracy', advantage: '15% RevPAR increase', metric: 'RevPAR', metric2: 'forecast accuracy', base: '200-room property', result: '$500K additional revenue', roi: '180', sla: '2 hours', sla2: '6 hours' },
  { id: 'o12', industry: 'Retail', company: 'RetailTech', role: 'Account Executive', product: 'Omnichannel Platform', differentiator: 'Unified inventory + AI merchandising', pain1: 'Siloed channels', pain2: 'Stock-outs', pain3: 'Customer churn', competitor: 'Shopify Plus', criteria: 'Channel integration speed', advantage: 'Deploy in 4 weeks', metric: 'cross-channel conversion', metric2: 'inventory accuracy', base: '100K monthly orders', result: '25% revenue uplift', roi: '250', sla: '1 hour', sla2: '4 hours' },
  { id: 'o13', industry: 'Manufacturing', company: 'MfgTech', role: 'Industrial Sales', product: 'Smart Factory Solution', differentiator: 'Industry 4.0 + Edge computing', pain1: 'Production bottlenecks', pain2: 'Quality defects', pain3: 'Energy waste', competitor: 'Siemens', criteria: 'ROI and implementation time', advantage: '6-month payback', metric: 'OEE improvement', metric2: 'defect rate', base: '$10M production line', result: '20% efficiency gain', roi: '300', sla: '4 hours', sla2: '12 hours' },
  { id: 'o14', industry: 'Logistics', company: 'ShipSmart', role: 'Solutions Architect', product: 'Logistics Management Platform', differentiator: 'Real-time visibility + Route optimization', pain1: 'Delivery delays', pain2: 'Fuel waste', pain3: 'Driver shortages', competitor: 'Oracle TMS', criteria: 'Visibility and optimization', advantage: '15% fuel savings', metric: 'on-time delivery', metric2: 'cost per mile', base: '1000 shipments/day', result: '25% cost reduction', roi: '250', sla: '2 hours', sla2: '8 hours' },
  { id: 'o15', industry: 'Food/Beverage', company: 'FreshChain', role: 'Sales Director', product: 'F&B Distribution Platform', differentiator: 'Cold chain + Traceability', pain1: 'Spoilage losses', pain2: 'Supply chain opacity', pain3: 'Regulatory compliance', competitor: 'Sysco', criteria: 'Freshness and compliance', advantage: '99.5% freshness rate', metric: 'spoilage rate', metric2: 'delivery accuracy', base: '$5M annual spend', result: '40% less waste', roi: '200', sla: '2 hours', sla2: '8 hours' },
  { id: 'o16', industry: 'Energy', company: 'PowerGrid', role: 'Project Sales', product: 'Renewable Energy System', differentiator: 'High efficiency + Grid integration', pain1: 'Energy intermittency', pain2: 'Grid instability', pain3: 'Regulatory uncertainty', competitor: 'Vestas', criteria: 'Efficiency and reliability', advantage: '25% conversion efficiency', metric: 'energy output', metric2: 'grid uptime', base: '50MW installation', result: '15% more energy', roi: '150', sla: '4 hours', sla2: '12 hours' },
  { id: 'o17', industry: 'Telecom', company: 'NetConnect', role: 'Enterprise Account', product: '5G Enterprise Network', differentiator: 'Private 5G + Edge AI', pain1: 'Network congestion', pain2: 'Security gaps', pain3: 'High latency', competitor: 'Ericsson', criteria: 'Latency and security', advantage: '<5ms end-to-end', metric: 'network availability', metric2: 'data throughput', base: '1000 endpoints', result: '80% latency reduction', roi: '250', sla: '30 min', sla2: '4 hours' },
  { id: 'o18', industry: 'Agriculture', company: 'AgriTech', role: 'Regional Manager', product: 'Precision Farming System', differentiator: 'IoT sensors + AI analytics', pain1: 'Crop yield variability', pain2: 'Water waste', pain3: 'Pest damage', competitor: 'John Deere', criteria: 'Yield improvement and ROI', advantage: '30% yield increase', metric: 'crop yield', metric2: 'water usage', base: '500-acre farm', result: '$150K additional revenue', roi: '300', sla: '4 hours', sla2: '12 hours' },
  { id: 'o19', industry: 'Chemicals', company: 'ChemSolutions', role: 'Technical Sales', product: 'Specialty Chemicals', differentiator: 'Custom formulations + Green chemistry', pain1: 'Quality inconsistency', pain2: 'Environmental compliance', pain3: 'Supply disruption', competitor: 'BASF', criteria: 'Quality and sustainability', advantage: 'Zero-VOC certified', metric: 'batch consistency', metric2: 'VOC emissions', base: '100 tons/year', result: '95% less VOC', roi: '200', sla: '4 hours', sla2: '12 hours' },
  { id: 'o20', industry: 'Media/Advertising', company: 'AdVantage', role: 'Client Director', product: 'Programmatic Ad Platform', differentiator: 'AI targeting + Cross-channel attribution', pain1: 'Ad waste', pain2: 'Fraud', pain3: 'Attribution gaps', competitor: 'Google Ads', criteria: 'ROAS and transparency', advantage: '3x ROAS improvement', metric: 'cost per acquisition', metric2: 'ad fraud rate', base: '$500K ad spend', result: '50% less waste', roi: '200', sla: '1 hour', sla2: '4 hours' },
  { id: 'o21', industry: 'Consulting', company: 'StratEdge', role: 'Partner', product: 'Strategy Consulting Package', differentiator: 'Execution support + Industry expertise', pain1: 'Strategy not implemented', pain2: 'High fees', pain3: 'Generic solutions', competitor: 'BCG', criteria: 'Implementation and ROI', advantage: 'Strategy + execution', metric: 'client satisfaction', metric2: 'repeat engagement rate', base: '10 engagements/year', result: '80% repeat rate', roi: '400', sla: '1 hour', sla2: '8 hours' },
  { id: 'o22', industry: 'Home Improvement', company: 'HomePro', role: 'Project Manager', product: 'Home Renovation Package', differentiator: '3D visualization + Fixed-price guarantee', pain1: 'Budget overruns', pain2: 'Timeline delays', pain3: 'Quality issues', competitor: 'Home Depot Pro', criteria: 'Budget and timeline certainty', advantage: 'Fixed price + 30-day guarantee', metric: 'on-time completion', metric2: 'customer NPS', base: '20 projects/month', result: '95% on-time delivery', roi: '150', sla: '2 hours', sla2: '8 hours' },
  { id: 'o23', industry: 'Consumer Electronics', company: 'TechWave', role: 'Product Manager', product: 'Smart Home Ecosystem', differentiator: 'Matter protocol + AI automation', pain1: 'Device incompatibility', pain2: 'Setup complexity', pain3: 'Privacy concerns', competitor: 'Samsung SmartThings', criteria: 'Ecosystem and privacy', advantage: 'Matter-certified + local processing', metric: 'device compatibility', metric2: 'user adoption', base: '500 devices/home', result: '100% interoperable', roi: '200', sla: '1 hour', sla2: '4 hours' },
  { id: 'o24', industry: 'Pet Healthcare', company: 'PetVet', role: 'Regional Sales', product: 'Veterinary Equipment Suite', differentiator: 'Pet-specific design + Affordable', pain1: 'Human equipment repurposed', pain2: 'Training gaps', pain3: 'High costs', competitor: 'IDEXX', criteria: 'Pet specialization and cost', advantage: 'Purpose-built for animals', metric: 'diagnostic accuracy', metric2: 'client satisfaction', base: '500 visits/month', result: '50% faster diagnosis', roi: '200', sla: '2 hours', sla2: '8 hours' },
];

// 销售场景模板（国内通用）
const DOMESTIC_SCENARIOS = [
  { id: 'sc1', name: '新客户首次拜访', difficulty: 'beginner' as const, description: '与潜在客户初次见面，建立信任并了解需求' },
  { id: 'sc2', name: '产品演示会议', difficulty: 'intermediate' as const, description: '向客户展示产品功能，回答技术团队提问' },
  { id: 'sc3', name: '需求分析诊断', difficulty: 'intermediate' as const, description: '深入了解客户痛点，提供定制化方案建议' },
  { id: 'sc4', name: '价格谈判与折扣', difficulty: 'intermediate' as const, description: '处理客户对价格的异议和折扣要求' },
  { id: 'sc5', name: '竞品对比分析', difficulty: 'advanced' as const, description: '当客户提到竞品时如何应对并突出优势' },
  { id: 'sc6', name: '高压关单场景', difficulty: 'advanced' as const, description: '在客户犹豫不决时促成成交' },
  { id: 'sc7', name: '客户续约升级', difficulty: 'intermediate' as const, description: '老客户到期续约，引导升级到更高方案' },
  { id: 'sc8', name: '决策层汇报', difficulty: 'advanced' as const, description: '向CEO/VP级别决策者汇报方案和ROI' },
];

// 销售场景模板（海外通用）
const OVERSEAS_SCENARIOS = [
  { id: 'sc1', name: 'Cold Outreach', difficulty: 'beginner' as const, description: 'First contact with a prospect via email or LinkedIn' },
  { id: 'sc2', name: 'Discovery Call', difficulty: 'intermediate' as const, description: 'Deep-dive call to understand prospect pain points' },
  { id: 'sc3', name: 'Product Demo', difficulty: 'intermediate' as const, description: 'Live product demonstration to the buying committee' },
  { id: 'sc4', name: 'Price Negotiation', difficulty: 'intermediate' as const, description: 'Handle pricing objections and procurement pushback' },
  { id: 'sc5', name: 'Competitive Displacement', difficulty: 'advanced' as const, description: 'Replace an entrenched competitor with your solution' },
  { id: 'sc6', name: 'Executive Close', difficulty: 'advanced' as const, description: 'Present business case to C-level decision makers' },
  { id: 'sc7', name: 'Expansion Upsell', difficulty: 'intermediate' as const, description: 'Grow existing account by selling additional modules' },
  { id: 'sc8', name: 'Renewal Defense', difficulty: 'advanced' as const, description: 'Defend renewal against budget cuts or competitor attacks' },
];

// 异议类型
const OBJECTIONS_DOMESTIC = [
  '价格太贵超出预算', '需要再对比几家', '决策流程比较长', '之前用过类似产品效果不好',
  '担心实施效果达不到预期', '团队适应期太长', '数据安全有顾虑', '售后服务跟不上',
  '领导还没批预算', '现有方案还能凑合用', '行业合规要求不确定', '担心被供应商绑定',
];
const OBJECTIONS_OVERSEAS = [
  'Price is beyond our budget', 'Need to compare with other vendors', 'Decision process takes time',
  'Tried similar products before', 'Concerned about implementation risk', 'Team adoption will be slow',
  'Data security concerns', 'Support coverage is limited', 'Board approval pending',
  'Current solution works fine', 'Compliance requirements unclear', 'Vendor lock-in concerns',
];

// ============================================================
// 话术生成引擎
// ============================================================

function generateScripts(config: typeof DOMESTIC_CONFIGS[0], isOverseas: boolean): PluginScript[] {
  const scripts: PluginScript[] = [];
  let s = 1;
  const stages = SALES_STAGES;
  const stageNames = Object.keys(stages);
  const objections = isOverseas ? OBJECTIONS_OVERSEAS : OBJECTIONS_DOMESTIC;

  // 1. 通用阶段话术 (8 stages × 8 templates = 64 per industry)
  for (const stageName of stageNames) {
    for (const template of stages[stageName]) {
      const content = template
        .replace(/\{company\}/g, config.company)
        .replace(/\{role\}/g, config.role)
        .replace(/\{product\}/g, config.product)
        .replace(/\{differentiator\}/g, config.differentiator)
        .replace(/\{pain1\}/g, config.pain1)
        .replace(/\{pain2\}/g, config.pain2)
        .replace(/\{pain3\}/g, config.pain3)
        .replace(/\{competitor\}/g, config.competitor)
        .replace(/\{criteria\}/g, config.criteria)
        .replace(/\{advantage\}/g, config.advantage)
        .replace(/\{metric\}/g, config.metric)
        .replace(/\{metric2\}/g, config.metric2)
        .replace(/\{base\}/g, config.base)
        .replace(/\{result\}/g, config.result)
        .replace(/\{roi\}/g, config.roi)
        .replace(/\{sla\}/g, config.sla)
        .replace(/\{sla2\}/g, config.sla2)
        .replace(/\{percent\}/g, '30')
        .replace(/\{count\}/g, '1000')
        .replace(/\{years\}/g, '10')
        .replace(/\{months\}/g, '3')
        .replace(/\{time\}/g, '3个月')
        .replace(/\{cost\}/g, '5000')
        .replace(/\{daily_cost\}/g, '167')
        .replace(/\{value\}/g, '5000')
        .replace(/\{total\}/g, '180万')
        .replace(/\{company_name\}/g, '某行业头部客户')
        .replace(/\{before\}/g, '45%')
        .replace(/\{after\}/g, '82%')
        .replace(/\{discount\}/g, '20%')
        .replace(/\{days\}/g, '14')
        .replace(/\{modules\}/g, '核心模块')
        .replace(/\{plan\}/g, '专业版')
        .replace(/\{duration\}/g, '年')
        .replace(/\{payment\}/g, '按月分期')
        .replace(/\{benefit\}/g, '额外增值服务')
        .replace(/\{deadline\}/g, '本月底')
        .replace(/\{scope\}/g, '试点')
        .replace(/\{included\}/g, '免费培训和实施支持')
        .replace(/\{feature\}/g, 'AI智能分析')
        .replace(/\{feature2\}/g, '自动化工作流')
        .replace(/\{stat\}/g, '行业调研显示采用我们方案的客户平均效率提升35%')
        .replace(/\{conclusion\}/g, '投入产出比非常高')
        .replace(/\{consequence\}/g, '每年损失数百万的潜在收入')
        .replace(/\{counter_argument\}/g, '我们方案的综合TCO反而更低')
        .replace(/\{criteria1\}/g, '功能完整性')
        .replace(/\{criteria2\}/g, '实施周期')
        .replace(/\{criteria3\}/g, '售后服务')
        .replace(/\{reason\}/g, '我们的方案经过500+同行业客户验证')
        .replace(/\{recommendation\}/g, '我们的方案更匹配您的需求')
        .replace(/\{new_feature\}/g, 'AI智能预测')
        .replace(/\{name\}/g, '张经理')
        .replace(/\{need\}/g, isOverseas ? 'growth' : '业务增长')
        .replace(/\{customer\}/g, isOverseas ? '[Customer Name]' : '[客户姓名]')
        .replace(/\{area\}/g, isOverseas ? 'this area' : '这个领域')
        .replace(/\{step1\}/g, isOverseas ? 'lead generation' : '获客')
        .replace(/\{step2\}/g, isOverseas ? 'closing' : '成交')
        .replace(/\{option1\}/g, isOverseas ? 'budget constraints' : '预算限制')
        .replace(/\{option2\}/g, isOverseas ? 'resource allocation' : '资源分配')
        .replace(/\{approach\}/g, isOverseas ? 'start with a pilot program' : '先从小范围试点开始')
        .replace(/\{risk\}/g, isOverseas ? 'implementation risk' : '实施风险')
        .replace(/\{objection\}/g, objections[s % objections.length] || '价格问题')
        .replace(/\{need1\}/g, isOverseas ? 'growth' : '增长')
        .replace(/\{need2\}/g, isOverseas ? 'efficiency' : '效率')
        .replace(/\{need3\}/g, isOverseas ? 'scalability' : '扩展性')
        .replace(/\{feedback\}/g, isOverseas ? 'outstanding' : '非常满意')
        .replace(/\{technology\}/g, isOverseas ? 'cutting-edge AI' : '前沿AI')
        .replace(/\{advantage1\}/g, isOverseas ? 'accuracy' : '精度')
        .replace(/\{advantage2\}/g, isOverseas ? 'cost' : '成本')
        .replace(/\{basis\}/g, isOverseas ? 'value delivered' : '交付价值')
        .replace(/\{value_metric\}/g, isOverseas ? 'total value' : '总体价值')
        .replace(/\{industry\}/g, config.industry)
        .replace(/\{competitor\}/g, config.competitor);

      scripts.push({
        id: `${config.id}s${s}`,
        title: `${stageName}话术${Math.ceil(s / 8)}`,
        content,
        scenario: stageName,
      });
      s++;
    }
  }

  // 2. 异议处理专用话术 (12 objections × 2 templates = 24)
  for (const objection of objections) {
    const templates = isOverseas ? [
      `I understand your concern about "${objection}". Let me share how ${config.company} helped similar clients overcome this - they saw ${config.result}.`,
      `"${objection}" is a valid point. Here's our approach: we start with a small pilot to prove value, then scale. This minimizes your risk while demonstrating ROI quickly.`,
    ] : [
      `关于"${objection}"，我想和您分享一个案例。${config.company}的一位客户之前也有同样的顾虑，但使用我们的方案后，${config.result}。`,
      `"${objection}"确实需要考虑。我们的解决方式是先小范围试点，看到效果后再扩展。这样您的风险最小化，同时能快速验证ROI。`,
    ];
    for (const t of templates) {
      scripts.push({
        id: `${config.id}s${s}`,
        title: `异议处理：${objection}`,
        content: t,
        scenario: '异议处理',
      });
      s++;
    }
  }

  // 3. 行业特色话术 (按场景 × 产品特色)
  const customScripts = isOverseas ? [
    { title: 'ROI Business Case', content: `Let me walk you through the business case for ${config.product}. Based on your ${config.base}, we project ${config.result} within 12 months. That's a ${config.roi}% return on your investment.`, scenario: '价值证明' },
    { title: 'Security & Compliance', content: `Security is top of mind for us. Our ${config.product} is SOC 2 Type II certified, GDPR compliant, and processes all data locally. We also offer a comprehensive DPA and support ${config.sla} response for security incidents.`, scenario: '合规说明' },
    { title: 'Implementation Timeline', content: `Our typical deployment takes 4-6 weeks. Week 1: discovery and planning. Week 2-3: configuration and integration. Week 4: testing and training. Week 5-6: go-live with dedicated support. We guarantee ${config.sla2} resolution during the first 90 days.`, scenario: '售后服务' },
    { title: 'Customer Success Story', content: `One of our customers in the ${config.industry} space had similar challenges with ${config.pain1} and ${config.pain2}. After implementing ${config.product}, they achieved ${config.result}. Let me connect you with them for a reference call.`, scenario: '产品介绍' },
    { title: 'Competitive Differentiation', content: `While ${config.competitor} focuses on ${config.competitor === 'Salesforce' || config.competitor === 'Google Ads' ? 'enterprise scale' : 'brand recognition'}, we differentiate on ${config.differentiator}. For your specific needs around ${config.criteria}, our approach delivers ${config.advantage}.`, scenario: '竞品对比' },
    { title: 'Procurement & Legal', content: `We understand your procurement process. Our standard MSA is available for legal review, and we can accommodate most security questionnaires within 48 hours. We also offer flexible payment terms including annual prepay discounts.`, scenario: '关单促成' },
    { title: 'Executive Summary Pitch', content: `In 30 seconds: ${config.product} helps ${config.industry} companies solve ${config.pain1}, ${config.pain2}, and ${config.pain3}. Our customers see ${config.result} within the first 90 days. I'd love to schedule a brief demo for your team.`, scenario: '初次接触' },
    { title: 'Technical Deep Dive', content: `For your technical team: our architecture uses ${config.differentiator.split(' + ')[0]}, with ${config.metric} improved by ${config.advantage}. We integrate with your existing stack via REST APIs, webhooks, and pre-built connectors. Documentation is available at our developer portal.`, scenario: '产品介绍' },
    { title: 'Pricing Flexibility', content: `We offer three tiers: Starter ($99/mo), Professional ($299/mo), and Enterprise (custom). Based on your needs, I recommend the Professional plan. If budget is a concern, we can start with Starter and upgrade as you see results. All plans include a 14-day free trial.`, scenario: '价格谈判' },
    { title: 'Champion Enablement', content: `To help you build the internal business case, I've prepared an ROI calculator, competitor comparison deck, and security documentation. Would you like me to join your internal meeting to answer any technical questions from your team?`, scenario: '关单促成' },
  ] : [
    { title: 'ROI投资回报分析', content: `让我帮您算一笔账。基于${config.base}的规模，使用${config.product}后预计${config.result}，投资回报率达到${config.roi}%。这不是成本支出，而是一项高回报的投资。`, scenario: '价值证明' },
    { title: '安全与合规保障', content: `安全是我们的首要考量。${config.product}已通过ISO 27001认证，符合等保三级要求，所有数据存储在国内。我们还提供全面的数据保护协议，并承诺${config.sla}安全事件响应。`, scenario: '合规说明' },
    { title: '实施周期规划', content: `我们的标准实施周期为4-6周。第一周需求调研和方案设计，第二到三周系统配置和数据迁移，第四周测试培训，第五到六周上线运行。上线后提供${config.sla2}问题响应保障。`, scenario: '售后服务' },
    { title: '客户成功案例', content: `我们服务过一家和您情况类似的${config.industry}企业，之前面临${config.pain1}和${config.pain2}的问题。使用${config.product}后，${config.result}。我可以安排您和他们做一次交流。`, scenario: '产品介绍' },
    { title: '差异化竞争优势', content: `${config.competitor}在${config.criteria}方面有其优势，但我们的独特之处在于${config.differentiator}。针对您在${config.criteria}方面的需求，我们的方案能帮您${config.advantage}。`, scenario: '竞品对比' },
    { title: '合同与法务支持', content: `我们的标准合同模板可以提前发给您的法务审核。我们也支持贵司的合同模板，通常在48小时内完成法务对接。付款方面支持年付、半年付和月付多种方式。`, scenario: '关单促成' },
    { title: '高层汇报精简版', content: `30秒概要：${config.product}帮助${config.industry}企业解决${config.pain1}、${config.pain2}和${config.pain3}三大痛点。客户平均${config.result}。希望能有机会给您的团队做一次详细演示。`, scenario: '初次接触' },
    { title: '技术细节解读', content: `针对您的技术团队：我们的架构采用${config.differentiator.split(' + ')[0]}，在${config.metric}方面提升了${config.advantage}。提供REST API和Webhook接口，已有系统可无缝对接。完整文档可在开发者平台查看。`, scenario: '产品介绍' },
    { title: '价格方案灵活组合', content: `我们提供基础版（¥999/月）、专业版（¥2999/月）和企业版（定制）。根据您的情况，我推荐专业版。如果预算有限，可以先从基础版开始，看到效果后随时升级。所有方案都支持14天免费试用。`, scenario: '价格谈判' },
    { title: '内部推动支持', content: `为了帮您在公司内部推动这个项目，我准备了ROI计算表、竞品对比方案和安全合规文档。如果您内部开会讨论时需要我方技术支持，我随时可以参加。`, scenario: '关单促成' },
  ];
  for (const cs of customScripts) {
    scripts.push({ id: `${config.id}s${s}`, title: cs.title, content: cs.content, scenario: cs.scenario });
    s++;
  }

  // 4. 填充到200条：通用模板变体
  const variations = isOverseas ? [
    { title: 'Follow-up Email', content: `Hi [Name], thank you for the time today. As discussed, ${config.product} addresses ${config.pain1} by ${config.differentiator}. I've attached the ROI analysis we reviewed. Let's schedule a follow-up for next week to discuss next steps.`, scenario: '初次接触' },
    { title: 'LinkedIn Outreach', content: `Hi [Name], I noticed you're leading ${config.industry} initiatives at [Company]. We've helped similar teams achieve ${config.result} with our ${config.product}. Would you be open to a 15-min chat?`, scenario: '初次接触' },
    { title: 'Referral Request', content: `Thank you for being a valued customer! If you know other ${config.industry} professionals who struggle with ${config.pain1}, I'd appreciate an introduction. Both parties receive a complimentary premium feature upgrade.`, scenario: '售后维护' },
    { title: 'Quarterly Review Invitation', content: `Hi [Name], it's been a quarter since we launched ${config.product}. I'd like to schedule a review session to analyze your ${config.metric} data and identify optimization opportunities. How does next Tuesday work?`, scenario: '售后维护' },
    { title: 'Product Update Announcement', content: `Exciting news! We've just launched a new AI-powered analytics module for ${config.product}. Based on your usage patterns, this feature could help you further improve ${config.metric}. Let me walk you through it in our next check-in.`, scenario: '售后维护' },
    { title: 'Renewal Discussion', content: `As your subscription approaches renewal, I wanted to review the value you've received: ${config.result}. We're offering an early-bird 20% discount for renewals signed before the end of this quarter.`, scenario: '关单促成' },
    { title: 'Budget Planning Support', content: `I understand you're planning next year's budget. I can help you build a compelling business case for ${config.product}, including detailed ROI projections, competitive analysis, and risk mitigation strategies.`, scenario: '需求挖掘' },
    { title: 'Technical Objection Response', content: `Regarding your technical team's concern about integration: our ${config.product} uses open APIs and has pre-built connectors for 50+ systems. Implementation typically takes 4-6 weeks with zero downtime.`, scenario: '异议处理' },
    { title: 'Procurement Objection Response', content: `I understand the procurement process can be lengthy. We're experienced with enterprise procurement and can provide all required documentation including security questionnaires, SOC 2 reports, and insurance certificates within 48 hours.`, scenario: '异议处理' },
    { title: 'Multi-stakeholder Alignment', content: `To ensure alignment across your team, I recommend we schedule separate sessions: a technical deep-dive for your engineers, a business case review for finance, and an executive briefing for leadership. I'll coordinate the schedules.`, scenario: '需求挖掘' },
    { title: 'Proof of Concept Proposal', content: `Let's run a 30-day proof of concept focused on your key success metric: ${config.metric}. We'll define clear success criteria upfront, and if we hit them, we can move forward with a full deployment discussion.`, scenario: '关单促成' },
    { title: 'Case Study Sharing', content: `I thought you'd find this case study relevant. A ${config.industry} company similar to yours was facing ${config.pain1}. After 3 months with ${config.product}, they achieved ${config.result}. Full case study attached.`, scenario: '产品介绍' },
    { title: 'Webinar Invitation', content: `You're invited! Our upcoming webinar "${config.industry}: Top 5 Sales Strategies for 2025" features industry experts sharing actionable insights. Register now for exclusive access to our sales playbook template.`, scenario: '初次接触' },
    { title: 'Competitor Migration Plan', content: `Moving from ${config.competitor} to ${config.product} is seamless. We handle data migration, team training, and provide a dedicated migration specialist. Most customers are fully transitioned within 2 weeks with zero downtime.`, scenario: '竞品对比' },
    { title: 'Pilot Program Offer', content: `Start with a limited pilot: deploy to one team, measure results for 30 days, then decide. If ${config.metric} improves by at least 20%, we proceed with full deployment. If not, you walk away with valuable insights at no cost.`, scenario: '关单促成' },
    { title: 'Industry Report Sharing', content: `Our latest industry report reveals that top-performing ${config.industry} companies share three characteristics: they invest in ${config.product}, they focus on ${config.metric}, and they measure ${config.metric2}. I'd love to share the full report with you.`, scenario: '初次接触' },
    { title: 'Social Proof Email', content: `"Working with ${config.company} transformed our ${config.industry} sales process. ${config.result}." - [Customer], VP of Sales. Read the full testimonial on our website. Would you like to connect with them directly?`, scenario: '产品介绍' },
    { title: "Objection: We're Happy With Current Vendor", content: `That's great to hear! Many of our best customers were initially happy with their existing solution. What brought them to us was the ${config.differentiator}. I'd suggest a side-by-side comparison focused on ${config.criteria} to see if there's a fit.`, scenario: '异议处理' },
    { title: 'Objection: "No Budget"', content: `I understand budget constraints. However, ${config.product} is designed to pay for itself within 60 days. If you can share the budget cycle timeline, I can help you build a compelling case for the next cycle, and we can start with a free trial in the meantime.`, scenario: '异议处理' },
    { title: 'Objection: "Too Busy Right Now"', content: `I completely understand. Let me make this easy: I'll send you a 2-page executive summary you can review at your convenience. If the value proposition resonates, we can schedule a brief 15-minute call whenever works best for you. No pressure.`, scenario: '异议处理' },
    { title: 'Objection: "Send Me Info"', content: `Happy to! I'm sending you three things: (1) a 2-minute product overview video, (2) an ROI calculator specific to ${config.industry}, and (3) two relevant case studies. I'll follow up next week to see if any questions came up.`, scenario: '产品介绍' },
    { title: 'Objection: "Too Many Features"', content: `That's a common concern. The good news is you don't need all features to see value. Most customers start with 2-3 core modules focused on ${config.pain1}, and expand as they see results. We'll create a phased roadmap tailored to your priorities.`, scenario: '异议处理' },
    { title: 'ROI Calculator Walkthrough', content: `Let me walk you through our ROI calculator. Input your ${config.base}, and you'll see projected savings of ${config.result}. This is based on data from 500+ similar deployments. Would you like me to customize this for your specific situation?`, scenario: '价值证明' },
    { title: 'Security Questionnaire Response', content: `We take security seriously. Our ${config.product} is SOC 2 Type II certified, ISO 27001 compliant, and processes data with encryption at rest and in transit. I'm attaching our completed security questionnaire and compliance certificates.`, scenario: '合规说明' },
    { title: 'Implementation Kickoff', content: `Welcome aboard! Here's your implementation plan: Phase 1 (Week 1): Discovery and configuration. Phase 2 (Week 2-3): Data migration and integration. Phase 3 (Week 4): Training and testing. Phase 4 (Week 5-6): Go-live. Your dedicated implementation specialist will be in touch within 24 hours.`, scenario: '售后维护' },
    { title: 'Executive Sponsorship Introduction', content: `I'd like to introduce you to our VP of Customer Success, who will serve as your executive sponsor. They're available for quarterly business reviews and can escalate any issues directly to our engineering team. Your success is our top priority.`, scenario: '售后维护' },
    { title: 'Usage Optimization Tip', content: `I noticed your team is primarily using the core reporting module. Did you know that combining it with our automated workflow feature can improve ${config.metric} by an additional 30%? Let me show you how in a quick 10-minute call.`, scenario: '售后维护' },
    { title: 'Annual Business Review', content: `Over the past year, your team has achieved remarkable results with ${config.product}: ${config.result}. For the upcoming year, I recommend focusing on advanced analytics to further optimize ${config.metric2}. Here's my proposed growth plan.`, scenario: '售后维护' },
  ] : [
    { title: '跟进邮件', content: `您好${config.industry}的客户，感谢今天的交流。正如讨论的，${config.product}通过${config.differentiator}帮您解决${config.pain1}。我已附上ROI分析报告，建议下周安排一次跟进会议讨论下一步计划。`, scenario: '初次接触' },
    { title: '微信/企微开场', content: `您好！看到您在${config.industry}领域的出色表现。我们帮助过类似团队实现${config.result}，用的就是${config.product}。方便的话想和您聊聊15分钟，看看能否帮到您的团队。`, scenario: '初次接触' },
    { title: '转介绍请求', content: `感谢您一直以来的支持！如果您身边有其他${config.industry}的朋友也在为${config.pain1}困扰，欢迎介绍给我们。双方均可获得免费的高级功能升级。`, scenario: '售后维护' },
    { title: '季度回顾邀请', content: `您好，距离${config.product}上线已经一个季度了。想约您做一次数据回顾，分析${config.metric}的变化并找出优化空间。下周二方便吗？`, scenario: '售后维护' },
    { title: '产品更新通知', content: `好消息！我们刚上线了AI智能分析模块。根据您团队的使用情况，这个功能可以帮您进一步提升${config.metric}。下次沟通时我给您演示一下。`, scenario: '售后维护' },
    { title: '续约讨论', content: `您的合约即将到期。回顾使用期间，您取得了${config.result}的成果。现在续约可享八折早鸟优惠，截止日期为本季度末。`, scenario: '关单促成' },
    { title: '预算规划支持', content: `了解到您正在规划明年预算。我可以帮您制作一份完整的商业方案，包括ROI预测、竞品对比和风险分析，助您顺利通过预算审批。`, scenario: '需求挖掘' },
    { title: '技术异议回应', content: `关于技术团队的集成顾虑：${config.product}采用开放API，已有50+系统预置连接器。实施周期4-6周，全程零停机。技术文档可在开发者平台查看。`, scenario: '异议处理' },
    { title: '采购异议回应', content: `理解采购流程较长。我们经验丰富，可在48小时内提供安全问卷、等保报告和保险证明等全部采购所需文件。`, scenario: '异议处理' },
    { title: '多方利益协调', content: `建议分别安排三场会议：技术人员的功能深潜会、财务的ROI评审会、和管理层的战略汇报会。我来协调各方时间。`, scenario: '需求挖掘' },
    { title: 'POC方案提议', content: `建议先做30天POC测试，聚焦核心指标${config.metric}。如果提升达到20%以上再推进全量部署。不成功您也能获得有价值的洞察，零成本。`, scenario: '关单促成' },
    { title: '案例分享', content: `分享一个和您情况相似的${config.industry}客户案例。他们之前面临${config.pain1}，使用${config.product}3个月后，${config.result}。完整案例详见附件。`, scenario: '产品介绍' },
    { title: '线上研讨会邀请', content: `邀请您参加"${config.industry}2025年销售策略Top5"线上研讨会，行业专家分享实战经验。注册即送销售策略模板。`, scenario: '初次接触' },
    { title: '竞品迁移方案', content: `从${config.competitor}迁移到${config.product}非常平滑。我们负责数据迁移、团队培训，并配备专属迁移专家。大部分客户2周内完成切换，零停机。`, scenario: '竞品对比' },
    { title: '试点方案提议', content: `先在一个小团队试点，部署核心功能，30天评估效果。如果${config.metric}提升不低于20%，再全面推广。不达标您零成本退出，还能获得有价值的经验。`, scenario: '关单促成' },
    { title: '行业报告分享', content: `最新行业报告显示，表现最好的${config.industry}企业有三个共同点：投资${config.product}、关注${config.metric}、量化${config.metric2}。完整报告已发您邮箱。`, scenario: '初次接触' },
    { title: '社会证明邮件', content: `"和${config.company}合作彻底改变了我们的${config.industry}销售流程，${config.result}。"——某${config.industry}企业销售VP。完整评价可在官网查看，需要帮您直接联系这位客户吗？`, scenario: '产品介绍' },
    { title: '异议：现有供应商用得好', content: `很高兴听到您对现有供应商满意！我们很多优质客户最初也是这样。让他们最终选择我们的是${config.differentiator}。建议您围绕${config.criteria}做一次对比测试，看看是否有提升空间。`, scenario: '异议处理' },
    { title: '异议：没有预算', content: `理解预算限制。但${config.product}设计为3个月内即可收回成本。如果您告诉我预算审批周期，我可以帮您准备下次周期的方案，同时先提供免费试用。`, scenario: '异议处理' },
    { title: '异议：现在太忙', content: `完全理解。这样吧，我给您发一份2页的精简方案，您有空时看看。如果觉得有价值，随时可以约15分钟电话，不急。`, scenario: '异议处理' },
    { title: '异议：发资料给我', content: `好的，给您发三份资料：（1）2分钟产品介绍视频，（2）针对${config.industry}的ROI计算器，（3）两个相关客户案例。看完有任何问题随时联系我。`, scenario: '产品介绍' },
    { title: '异议：功能太多用不上', content: `这是常见的顾虑。好消息是您不需要用到所有功能就能获得价值。大部分客户先从2-3个核心模块开始，聚焦${config.pain1}，看到效果后再扩展。我们会为您制定分阶段路线图。`, scenario: '异议处理' },
    { title: 'ROI计算演示', content: `让我给您演示一下ROI计算器。输入您的${config.base}，系统自动计算预计收益${config.result}。这是基于500+同行业客户的数据。需要我根据您的具体情况做定制计算吗？`, scenario: '价值证明' },
    { title: '安全合规答复', content: `我们非常重视安全。${config.product}已通过等保三级认证，ISO 27001认证，数据加密传输和存储。附件为完整安全问卷和合规证书。`, scenario: '合规说明' },
    { title: '实施启动', content: `欢迎合作！以下是实施计划：第一阶段（第1周）需求调研和配置。第二阶段（第2-3周）数据迁移和集成。第三阶段（第4周）培训和测试。第四阶段（第5-6周）上线。专属实施顾问将在24小时内联系您。`, scenario: '售后维护' },
    { title: '高层对接', content: `想为您介绍我们的客户成功VP，将担任您的高层对接人。可参加季度业务回顾，并将任何问题直接升级到技术团队。您的成功是我们的首要任务。`, scenario: '售后维护' },
    { title: '使用优化建议', content: `注意到您的团队主要使用核心报表模块。您知道吗，配合自动化工作流功能可以让${config.metric}再提升30%？下次10分钟电话给您演示。`, scenario: '售后维护' },
    { title: '年度业务回顾', content: `过去一年，您团队使用${config.product}取得了出色成果：${config.result}。新的一年，建议重点关注高级分析功能以进一步优化${config.metric2}。以下是增长方案。`, scenario: '售后维护' },
  ];

  for (const v of variations) {
    scripts.push({ id: `${config.id}s${s}`, title: v.title, content: v.content, scenario: v.scenario });
    s++;
  }

  // 5. 多轮对话链转换 (v2 新增: 从 DialogueChain 提取扁平话术)
  const chains = isOverseas ? DIALOGUE_CHAINS_OVERSEAS : DIALOGUE_CHAINS_DOMESTIC;
  let chainIdx = 1;
  for (const [stage, stageChains] of Object.entries(chains)) {
    for (const template of stageChains) {
      const chain = toChain(template, stage as ConversationStage, `${config.id}_c${chainIdx}`);
      const filled = fillChainConfig(chain, config);
      const chainScripts = chainToScripts(filled, config.id);
      for (const cs of chainScripts) {
        scripts.push({ id: `${config.id}d${s}`, title: cs.title, content: cs.content, scenario: cs.scenario });
        s++;
      }
      chainIdx++;
    }
  }

  // Pad to exactly 200 with numbered variants
  while (s <= 200) {
    const stageIdx = ((s - 1) % stageNames.length);
    const stageName = stageNames[stageIdx];
    scripts.push({
      id: `${config.id}s${s}`,
      title: `${stageName}进阶话术${s - (s > 64 ? 64 : 0)}`,
      content: isOverseas
        ? `Advanced technique for ${stageName} in ${config.industry}: Focus on ${config.differentiator} and quantify ${config.result}. Always reference specific ${config.metric} improvements from similar customers.`
        : `${stageName}在${config.industry}中的进阶技巧：重点突出${config.differentiator}，量化${config.result}。始终引用类似客户的${config.metric}提升数据来增强说服力。`,
      scenario: stageName,
    });
    s++;
  }

  return scripts;
}

// ============================================================
// 场景生成
// ============================================================
function generateScenarios(config: typeof DOMESTIC_CONFIGS[0], isOverseas: boolean): PluginScenario[] {
  const base = isOverseas ? OVERSEAS_SCENARIOS : DOMESTIC_SCENARIOS;
  return base.map((sc) => ({
    id: `${config.id}${sc.id}`,
    name: sc.name,
    difficulty: sc.difficulty,
    description: sc.description.replace(/\{industry\}/g, config.industry),
  }));
}

// ============================================================
// 构建完整数据映射
// ============================================================

const allConfigs = [...DOMESTIC_CONFIGS, ...OVERSEAS_CONFIGS];

export const pluginContentMap: Record<string, { scripts: PluginScript[]; scenarios: PluginScenario[] }> = {};

for (const config of allConfigs) {
  const isOverseas = config.id.startsWith('o');
  pluginContentMap[config.id] = {
    scripts: generateScripts(config, isOverseas),
    scenarios: generateScenarios(config, isOverseas),
  };
}

export function getPluginScripts(pluginId: string): PluginScript[] {
  return pluginContentMap[pluginId]?.scripts || [];
}

export function getPluginScenarios(pluginId: string): PluginScenario[] {
  return pluginContentMap[pluginId]?.scenarios || [];
}

export function getTotalScriptCount(): number {
  return Object.values(pluginContentMap).reduce((sum, p) => sum + p.scripts.length, 0);
}

export function getTotalPluginCount(): number {
  return Object.keys(pluginContentMap).length;
}

// ============================================================
// 对话链导出 (v2 新增)
// ============================================================

export function getPluginDialogueChains(pluginId: string): DialogueChain[] {
  const isOverseas = pluginId.startsWith('o');
  const chainsMap = isOverseas ? DIALOGUE_CHAINS_OVERSEAS : DIALOGUE_CHAINS_DOMESTIC;
  const config = allConfigs.find((c) => c.id === pluginId);
  if (!config) return [];

  const filledChains: DialogueChain[] = [];
  let chainIdx = 1;
  for (const [stage, stageChains] of Object.entries(chainsMap)) {
    for (const template of stageChains) {
      const chain = toChain(template, stage as ConversationStage, `${config.id}_c${chainIdx}`);
      filledChains.push(fillChainConfig(chain, config));
      chainIdx++;
    }
  }
  return filledChains;
}

export {
  EMPATHY_OPENERS_ZH,
  EMPATHY_OPENERS_EN,
  FILLER_PHRASES_ZH,
  FILLER_PHRASES_EN,
  OPEN_QUESTIONS_ZH,
  OPEN_QUESTIONS_EN,
};
