import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Copy, Check, BookOpen, AlertTriangle, Loader2, CheckCircle, Columns, X,
  Target, MessageCircleQuestion, Shield, TrendingUp, Lightbulb, ChevronRight,
  Swords, Network, ChevronDown, ChevronUp, Gauge,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useScriptStore } from '@/stores/scriptStore';
import { useSessionStore } from '@/stores/sessionStore';
import ScriptFeedback from './ScriptFeedback';
import { Skeleton } from '@/components/ui/Skeleton';

const STYLE_TABS = [
  { key: 'empathy', label: '共情版', icon: '\u{1F91D}' },
  { key: 'straightforward', label: '直爽版', icon: '\u{26A1}' },
  { key: 'professional', label: '专业版', icon: '\u{1F4BC}' },
];

// Map the AI service style names to our tab keys
function normalizeStyle(style: string): string {
  const s = style.toLowerCase();
  if (s.includes('empath') || s.includes('共情') || s.includes('温和')) return 'empathy';
  if (s.includes('straight') || s.includes('直爽') || s.includes('直接'))
    return 'straightforward';
  if (s.includes('profess') || s.includes('专业') || s.includes('严谨')) return 'professional';
  // Default mapping by index
  return style;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Copy failed');
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors',
        copied
          ? 'bg-green-100 text-green-600'
          : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600',
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? '已复制' : '复制'}
    </button>
  );
}

export default function ScriptDisplay() {
  const { activeStyle, setActiveStyle, currentScript, isGenerating, generatedScriptIds } =
    useScriptStore();
  const { activeSessionId } = useSessionStore();
  const navigate = useNavigate();
  const [compareMode, setCompareMode] = useState(false);
  const [showFrameworkDetails, setShowFrameworkDetails] = useState(false);

  const handlePractice = useCallback(() => {
    // Navigate to practice page with session context
    navigate('/app/practice', {
      state: {
        sessionId: activeSessionId,
        scenario: currentScript?.scenarioBreakdown?.objective || '',
        industry: currentScript?.scenarioBreakdown?.stage || '',
        fromScript: true,
      },
    });
  }, [navigate, activeSessionId, currentScript]);

  const handleStyleSelect = useCallback(
    (key: string) => {
      setActiveStyle(key);
    },
    [setActiveStyle],
  );

  // Find the content for the active style tab
  const getStyleContent = useCallback(
    (styleKey: string): string => {
      // 支持新的 tacticalExecutionPaths 结构
      const paths = currentScript?.tacticalExecutionPaths;
      if (paths && paths.length > 0) {
        const pathMap: Record<string, string> = {
          'empathy': '共情版',
          'straightforward': '直爽版',
          'professional': '专业版'
        };
        const targetPath = paths.find(p => p.pathType === pathMap[styleKey]);
        return targetPath?.verbalScript || paths[0]?.verbalScript || '';
      }

      // 兼容旧的 speechStyles 结构
      if (!currentScript?.speechStyles) return '';
      for (const s of currentScript.speechStyles) {
        if (normalizeStyle(s.style) === styleKey) return s.content;
      }
      const styleIndex = STYLE_TABS.findIndex((t) => t.key === styleKey);
      if (styleIndex >= 0 && currentScript.speechStyles[styleIndex]) {
        return currentScript.speechStyles[styleIndex].content;
      }
      return currentScript.speechStyles[0]?.content || '';
    },
    [currentScript],
  );

  if (!currentScript && !isGenerating) {
    return null;
  }

  return (
    <div className="mx-4 mb-4 rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Style tabs */}
      <div className="flex items-center border-b border-gray-100">
        {STYLE_TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => handleStyleSelect(key)}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-all',
              activeStyle === key && !compareMode
                ? 'border-b-2 border-primary-500 bg-primary-50 text-primary-700'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
              compareMode && 'text-gray-400',
            )}
          >
            <span className="mr-1.5">{icon}</span>
            {label}
          </button>
        ))}
        {currentScript && !isGenerating && (
          <>
            <button
              onClick={handlePractice}
              className="mr-1 rounded-lg p-2 text-gray-400 transition-colors hover:bg-orange-50 hover:text-orange-600"
              title="用这段话术练习"
            >
              <Swords className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCompareMode(!compareMode)}
              className={cn(
                'mr-2 rounded-lg p-2 transition-colors',
                compareMode
                  ? 'bg-primary-100 text-primary-600'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600',
              )}
              title={compareMode ? '退出对比' : '三版对比'}
            >
              {compareMode ? <X className="h-4 w-4" /> : <Columns className="h-4 w-4" />}
            </button>
          </>
        )}
      </div>

      {/* Content area */}
      {isGenerating ? (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
            <span className="text-sm text-gray-500">AI 正在生成话术...</span>
          </div>
          <Skeleton.Line className="h-4 w-3/4" />
          <Skeleton.Line className="h-4 w-full" />
          <Skeleton.Line className="h-4 w-2/3" />
          <Skeleton.Line className="h-4 w-1/2" />
          <div className="mt-4 pt-3 border-t border-gray-100">
            <Skeleton.Line className="h-3 w-1/4 mb-2" />
            <Skeleton.Line className="h-4 w-full" />
            <Skeleton.Line className="h-4 w-4/5" />
          </div>
        </div>
      ) : currentScript ? (
        <div className="p-4">
          {/* Compare mode: all 3 styles side by side */}
          {compareMode ? (
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              {STYLE_TABS.map(({ key, label, icon }) => {
                // 支持新结构
                const pathMap: Record<string, string> = { 'empathy': '共情版', 'straightforward': '直爽版', 'professional': '专业版' };
                const tacticalPath = currentScript.tacticalExecutionPaths?.find(p => p.pathType === pathMap[key]);
                const legacyVariant = currentScript.speechStyles?.find(s => normalizeStyle(s.style) === key)
                  || currentScript.speechStyles?.[STYLE_TABS.findIndex((t) => t.key === key)];
                return (
                  <div key={key} className="rounded-lg bg-gray-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600">
                        {icon} {label}
                      </span>
                      <CopyButton text={getStyleContent(key)} />
                    </div>
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700 line-clamp-8">
                      {getStyleContent(key)}
                    </p>
                    {tacticalPath?.strategicLever && (
                      <p className="mt-2 border-t border-gray-200 pt-2 text-xs text-violet-600 italic">
                        <Lightbulb className="mr-1 inline h-3 w-3" />
                        {tacticalPath.strategicLever}
                      </p>
                    )}
                    {legacyVariant?.logic && (
                      <p className="mt-2 border-t border-gray-200 pt-2 text-xs text-violet-600 italic">
                        <Lightbulb className="mr-1 inline h-3 w-3" />
                        {legacyVariant.logic}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Single style view */
            <div className="mb-4 rounded-lg bg-gray-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">
                  {STYLE_TABS.find((t) => t.key === activeStyle)?.label} 话术
                </span>
                <CopyButton text={getStyleContent(activeStyle)} />
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                {getStyleContent(activeStyle)}
              </p>
            </div>
          )}

          {/* 买家画像分析 (新结构) */}
          {currentScript.buyerPersonaAnalysis && (
            <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
              <h4 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-purple-700">
                <Target className="h-4 w-4" />
                买家画像分析
              </h4>
              <div className="space-y-2">
                {currentScript.buyerPersonaAnalysis.targetStakeholder && (
                  <div>
                    <p className="text-xs font-medium text-purple-500">目标角色</p>
                    <p className="text-sm text-purple-800">{currentScript.buyerPersonaAnalysis.targetStakeholder}</p>
                  </div>
                )}
                {currentScript.buyerPersonaAnalysis.hiddenDriver && (
                  <div>
                    <p className="text-xs font-medium text-purple-500">隐藏动机</p>
                    <p className="text-sm text-purple-800">{currentScript.buyerPersonaAnalysis.hiddenDriver}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 多阶段模拟 (新结构) */}
          {currentScript.multiStageSimulation && (
            <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-4">
              <h4 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-orange-700">
                <Shield className="h-4 w-4" />
                博弈推演
              </h4>
              <div className="space-y-3">
                {currentScript.multiStageSimulation.expectedPushback && (
                  <div className="rounded-lg bg-white/60 p-3">
                    <p className="text-xs font-medium text-orange-500">客户可能反弹</p>
                    <p className="text-sm text-orange-800">{currentScript.multiStageSimulation.expectedPushback}</p>
                  </div>
                )}
                {currentScript.multiStageSimulation.counterStrategy && (
                  <div className="rounded-lg bg-white/60 p-3">
                    <p className="text-xs font-medium text-orange-500">二次反击策略</p>
                    <p className="text-sm text-orange-800">{currentScript.multiStageSimulation.counterStrategy}</p>
                  </div>
                )}
                {currentScript.multiStageSimulation.nextProgressiveMove && (
                  <div className="rounded-lg bg-white/60 p-3">
                    <p className="text-xs font-medium text-orange-500">下一步推进</p>
                    <p className="text-sm text-orange-800">{currentScript.multiStageSimulation.nextProgressiveMove}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 教练指令 (新结构 - 单风格视图) */}
          {!compareMode && (() => {
            const pathMap: Record<string, string> = { 'empathy': '共情版', 'straightforward': '直爽版', 'professional': '专业版' };
            const activePath = currentScript.tacticalExecutionPaths?.find(p => p.pathType === pathMap[activeStyle]);
            if (!activePath?.coachingDirectives) return null;
            return (
              <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 p-4">
                <h4 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-teal-700">
                  <Lightbulb className="h-4 w-4" />
                  执行教练指令
                </h4>
                <div className="space-y-2">
                  {activePath.coachingDirectives.pacingAndTone && (
                    <div>
                      <p className="text-xs font-medium text-teal-500">语速语调</p>
                      <p className="text-sm text-teal-800">{activePath.coachingDirectives.pacingAndTone}</p>
                    </div>
                  )}
                  {activePath.coachingDirectives.microBehaviors && (
                    <div>
                      <p className="text-xs font-medium text-teal-500">微行为</p>
                      <p className="text-sm text-teal-800">{activePath.coachingDirectives.microBehaviors}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Pain Analysis */}
          {currentScript.painAnalysis && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-4">
              <h4 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-rose-700">
                <Target className="h-4 w-4" />
                客户痛点分析
              </h4>
              <div className="space-y-3">
                {currentScript.painAnalysis.likely_pains?.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-rose-600">可能的核心痛点</p>
                    <ul className="space-y-1">
                      {currentScript.painAnalysis.likely_pains.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-rose-800">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {currentScript.painAnalysis.hidden_needs?.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-rose-600">隐藏需求</p>
                    <ul className="space-y-1">
                      {currentScript.painAnalysis.hidden_needs.map((n, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-rose-800">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-300" />
                          {n}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {currentScript.painAnalysis.decision_factors?.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-rose-600">决策关键因素</p>
                    <div className="flex flex-wrap gap-1.5">
                      {currentScript.painAnalysis.decision_factors.map((f, i) => (
                        <span key={i} className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs text-rose-700">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scenario Breakdown */}
          {currentScript.scenarioBreakdown && (
            <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
              <h4 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-indigo-700">
                <TrendingUp className="h-4 w-4" />
                场景拆解
              </h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-white/60 p-3">
                  <p className="text-xs font-medium text-indigo-500">当前阶段</p>
                  <p className="mt-1 text-sm font-semibold text-indigo-800">{currentScript.scenarioBreakdown.stage}</p>
                </div>
                <div className="rounded-lg bg-white/60 p-3">
                  <p className="text-xs font-medium text-indigo-500">核心目标</p>
                  <p className="mt-1 text-sm text-indigo-800">{currentScript.scenarioBreakdown.objective}</p>
                </div>
                <div className="rounded-lg bg-white/60 p-3">
                  <p className="text-xs font-medium text-indigo-500">下一步行动</p>
                  <p className="mt-1 text-sm text-indigo-800">{currentScript.scenarioBreakdown.next_step}</p>
                </div>
              </div>
            </div>
          )}

          {/* Follow-up Questions */}
          {currentScript.followUpQuestions && currentScript.followUpQuestions.length > 0 && (
            <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 p-4">
              <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-teal-700">
                <MessageCircleQuestion className="h-4 w-4" />
                跟进提问建议
              </h4>
              <ul className="space-y-2">
                {currentScript.followUpQuestions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-teal-800">
                    <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-400" />
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Speech style logic (shown below each style in single view) */}
          {!compareMode && currentScript.speechStyles && (() => {
            const activeVariant = currentScript.speechStyles.find(
              (s) => normalizeStyle(s.style) === activeStyle,
            ) || currentScript.speechStyles[STYLE_TABS.findIndex((t) => t.key === activeStyle)];
            return activeVariant?.logic ? (
              <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50 p-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-violet-600">
                  <Lightbulb className="h-3.5 w-3.5" />
                  为什么这样说有效
                </p>
                <p className="mt-1 text-sm text-violet-800">{activeVariant.logic}</p>
              </div>
            ) : null;
          })()}

          {/* Objection Handling */}
          {currentScript.objectionHandling && currentScript.objectionHandling.length > 0 && (
            <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-4">
              <h4 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-orange-700">
                <Shield className="h-4 w-4" />
                异议应对预案
              </h4>
              <div className="space-y-3">
                {currentScript.objectionHandling.map((obj, i) => (
                  <div key={i} className="rounded-lg bg-white/60 p-3">
                    <p className="text-xs font-medium text-orange-500">客户可能说</p>
                    <p className="mt-0.5 text-sm font-medium text-orange-800">"{obj.likely_objection}"</p>
                    <p className="mt-2 text-xs font-medium text-orange-500">应对话术</p>
                    <p className="mt-0.5 text-sm text-orange-800">{obj.response}</p>
                    <p className="mt-2 text-xs text-orange-400 italic">原则: {obj.principle}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Closing Strategy */}
          {currentScript.closingStrategy && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <h4 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                <CheckCircle className="h-4 w-4" />
                促成成交策略
              </h4>
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium text-emerald-500">成交信号</p>
                  <p className="mt-0.5 text-sm text-emerald-800">{currentScript.closingStrategy.signal}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-emerald-500">推荐方法</p>
                  <p className="mt-0.5 text-sm text-emerald-800">{currentScript.closingStrategy.method}</p>
                </div>
                <div className="rounded-lg bg-white/60 p-3">
                  <p className="text-xs font-medium text-emerald-500">促成话术</p>
                  <p className="mt-0.5 text-sm font-medium text-emerald-800">{currentScript.closingStrategy.script}</p>
                </div>
              </div>
            </div>
          )}

          {/* Framework Analysis */}
          {currentScript.frameworkAnalysis && (
            <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50 p-4">
              <h4 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-violet-700">
                <Network className="h-4 w-4" />
                框架分析
              </h4>
              <div className="space-y-3">
                {(currentScript.frameworkAnalysis.detectedFrameworks?.length ?? 0) > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-violet-600">识别到的框架</p>
                    <div className="flex flex-wrap gap-1.5">
                      {currentScript.frameworkAnalysis.detectedFrameworks?.map((fw, i) => (
                        <span key={i} className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-violet-300">
                          {fw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {typeof currentScript.frameworkAnalysis.frameworkUsageQuality === 'number' && (
                  <div>
                    <div className="flex items-center justify-between text-xs text-violet-600">
                      <span>框架运用质量</span>
                      <span className="font-medium">{currentScript.frameworkAnalysis.frameworkUsageQuality}/100</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-violet-100">
                      <div
                        className="h-full rounded-full bg-violet-500 transition-all"
                        style={{ width: `${currentScript.frameworkAnalysis.frameworkUsageQuality}%` }}
                      />
                    </div>
                  </div>
                )}
                {currentScript.frameworkAnalysis.stageProgression && (
                  <div>
                    <p className="text-xs font-medium text-violet-600">阶段推进</p>
                    <p className="mt-0.5 text-sm text-violet-800">{currentScript.frameworkAnalysis.stageProgression}</p>
                  </div>
                )}
                {(currentScript.frameworkAnalysis.frameworkStrengths?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-medium text-violet-600">框架运用亮点</p>
                    <ul className="mt-1 space-y-1">
                      {currentScript.frameworkAnalysis.frameworkStrengths?.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-violet-800">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(currentScript.frameworkAnalysis.frameworkGaps?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-medium text-violet-600">框架运用不足</p>
                    <ul className="mt-1 space-y-1">
                      {currentScript.frameworkAnalysis.frameworkGaps?.map((g, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-violet-800">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(currentScript.frameworkAnalysis.suggestedFrameworks?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-medium text-violet-600">建议使用的框架</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {currentScript.frameworkAnalysis.suggestedFrameworks?.map((fw, i) => (
                        <span key={i} className="rounded-full bg-violet-100/60 px-2.5 py-0.5 text-xs text-violet-600">
                          {fw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Individual Framework Analyses (collapsible) */}
          {(() => {
            const frameworkCards: { key: string; label: string; color: string; data: Record<string, unknown> }[] = [];
            if (currentScript.swotAnalysis && Object.keys(currentScript.swotAnalysis).length > 0)
              frameworkCards.push({ key: 'swot', label: 'SWOT 分析', color: 'blue', data: currentScript.swotAnalysis });
            if (currentScript.scenario5w2h && Object.keys(currentScript.scenario5w2h).length > 0)
              frameworkCards.push({ key: '5w2h', label: '5W2H 场景分析', color: 'cyan', data: currentScript.scenario5w2h });
            if (currentScript.aidaFlow && Object.keys(currentScript.aidaFlow).length > 0)
              frameworkCards.push({ key: 'aida', label: 'AIDA 营销漏斗', color: 'pink', data: currentScript.aidaFlow });
            if (currentScript.fabMapping && Object.keys(currentScript.fabMapping).length > 0)
              frameworkCards.push({ key: 'fab', label: 'FAB 映射', color: 'amber', data: currentScript.fabMapping });
            if (currentScript.bantQualification && Object.keys(currentScript.bantQualification).length > 0)
              frameworkCards.push({ key: 'bant', label: 'BANT 资格认证', color: 'sky', data: currentScript.bantQualification });
            if (currentScript.meddicAnalysis && Object.keys(currentScript.meddicAnalysis).length > 0)
              frameworkCards.push({ key: 'meddic', label: 'MEDDIC 分析', color: 'emerald', data: currentScript.meddicAnalysis });
            if (currentScript.porterForces && Object.keys(currentScript.porterForces).length > 0)
              frameworkCards.push({ key: 'porter', label: '波特五力', color: 'red', data: currentScript.porterForces });
            if (currentScript.journeyStage && Object.keys(currentScript.journeyStage).length > 0)
              frameworkCards.push({ key: 'journey', label: '客户旅程', color: 'orange', data: currentScript.journeyStage });
            if (currentScript.scqaNarrative && Object.keys(currentScript.scqaNarrative).length > 0)
              frameworkCards.push({ key: 'scqa', label: 'SCQA 叙事', color: 'teal', data: currentScript.scqaNarrative });
            if (currentScript.challengerInsight && Object.keys(currentScript.challengerInsight).length > 0)
              frameworkCards.push({ key: 'challenger', label: 'Challenger 洞察', color: 'purple', data: currentScript.challengerInsight });

            if (frameworkCards.length === 0) return null;

            const colorMap: Record<string, { border: string; bg: string; text: string; badge: string }> = {
              blue: { border: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
              cyan: { border: 'border-cyan-200', bg: 'bg-cyan-50', text: 'text-cyan-700', badge: 'bg-cyan-100 text-cyan-700' },
              pink: { border: 'border-pink-200', bg: 'bg-pink-50', text: 'text-pink-700', badge: 'bg-pink-100 text-pink-700' },
              amber: { border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
              sky: { border: 'border-sky-200', bg: 'bg-sky-50', text: 'text-sky-700', badge: 'bg-sky-100 text-sky-700' },
              emerald: { border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
              red: { border: 'border-red-200', bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
              orange: { border: 'border-orange-200', bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' },
              teal: { border: 'border-teal-200', bg: 'bg-teal-50', text: 'text-teal-700', badge: 'bg-teal-100 text-teal-700' },
              purple: { border: 'border-purple-200', bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' },
            };

            return (
              <div className="mb-4">
                <button
                  onClick={() => setShowFrameworkDetails(!showFrameworkDetails)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  <span className="flex items-center gap-1.5">
                    <Gauge className="h-4 w-4 text-violet-500" />
                    详细框架分析 ({frameworkCards.length})
                  </span>
                  {showFrameworkDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {showFrameworkDetails && (
                  <div className="mt-2 space-y-2">
                    {frameworkCards.map(({ key, label, color, data }) => {
                      const c = colorMap[color] || colorMap.blue;
                      return (
                        <div key={key} className={cn('rounded-lg border p-3', c.border, c.bg)}>
                          <h5 className={cn('mb-2 text-xs font-semibold', c.text)}>{label}</h5>
                          <div className="space-y-1.5">
                            {Object.entries(data).map(([field, value]) => {
                              if (value == null || (Array.isArray(value) && value.length === 0)) return null;
                              const displayKey = field.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
                              return (
                                <div key={field}>
                                  <p className={cn('text-[10px] font-medium uppercase tracking-wide', c.text, 'opacity-70')}>
                                    {displayKey}
                                  </p>
                                  {Array.isArray(value) ? (
                                    <ul className="mt-0.5 space-y-0.5">
                                      {value.map((item, i) => (
                                        <li key={i} className={cn('text-xs', c.text)}>
                                          {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : typeof value === 'object' ? (
                                    <pre className={cn('mt-0.5 whitespace-pre-wrap text-xs', c.text)}>
                                      {JSON.stringify(value, null, 2)}
                                    </pre>
                                  ) : (
                                    <p className={cn('text-xs font-medium', c.text)}>{String(value)}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Reason for this approach */}
          {currentScript.reasoning.length > 0 && (
            <div className="mb-4">
              <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <BookOpen className="h-4 w-4" />
                推荐理由
              </h4>
              <ul className="space-y-1">
                {currentScript.reasoning.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-400" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Confidence score */}
          {currentScript.confidenceScore > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>AI 信心指数</span>
                <span>{Math.round(currentScript.confidenceScore * 100)}%</span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    currentScript.confidenceScore >= 0.7
                      ? 'bg-green-500'
                      : currentScript.confidenceScore >= 0.4
                        ? 'bg-yellow-500'
                        : 'bg-red-500',
                  )}
                  style={{ width: `${currentScript.confidenceScore * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Quality report from Harness Evaluator */}
          {(currentScript as any).quality_report && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-blue-700">
                <CheckCircle className="h-4 w-4" />
                质量评估报告
              </h4>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-blue-600">评分: </span>
                <span className="font-medium text-blue-800">
                  {Math.round((currentScript as any).quality_report.score * 100)}%
                </span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs',
                    (currentScript as any).quality_report.passed
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700',
                  )}
                >
                  {(currentScript as any).quality_report.passed ? '质量通过' : '质量待改进'}
                </span>
              </div>
              {(currentScript as any).quality_report.feedback && (
                <p className="mt-2 text-xs text-blue-600">
                  {(currentScript as any).quality_report.feedback}
                </p>
              )}
            </div>
          )}

          {/* Pitfalls */}
          {currentScript.pitfalls.length > 0 && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                避坑提醒
              </h4>
              <ul className="space-y-2">
                {currentScript.pitfalls.map((pitfall, idx) => (
                  <li key={idx} className="text-sm text-amber-800">
                    <span className="font-medium">
                      ❌ {pitfall.action}
                    </span>
                    <span className="ml-1 text-amber-600">— {pitfall.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Knowledge source */}
          {currentScript.knowledgeSource && (
            <div className="mb-4 border-t border-gray-100 pt-3">
              <h4 className="mb-1 text-xs font-medium text-gray-400">引用来源</h4>
              <p className="text-xs text-gray-500">{currentScript.knowledgeSource}</p>
            </div>
          )}

          {/* Feedback — use the script ID matching the active style */}
          <div className="border-t border-gray-100 pt-3">
            {(() => {
              const activeIdx = STYLE_TABS.findIndex((t) => t.key === activeStyle);
              const scriptId = generatedScriptIds[activeIdx] || generatedScriptIds[0] || '';
              return (
                <ScriptFeedback
                  scriptId={scriptId}
                  previouslySubmitted={!!scriptId}
                />
              );
            })()}
          </div>
        </div>
      ) : null}
    </div>
  );
}
