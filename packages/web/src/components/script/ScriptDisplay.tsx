import { logger } from '@/utils/logger';
import { useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Copy, Check, BookOpen, AlertTriangle, Loader2, CheckCircle, Columns, X,
  Target, MessageCircleQuestion, Shield, TrendingUp, Lightbulb, ChevronRight,
  Swords, Network, ChevronDown, ChevronUp, Gauge, Star,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useScriptStore } from '@/stores/scriptStore';
import { useSessionStore } from '@/stores/sessionStore';
import ScriptFeedback from './ScriptFeedback';
import { Skeleton } from '@/components/ui/Skeleton';
import { BuyerPersonaCard } from './cards/BuyerPersonaCard';
import { PitfallsCard } from './cards/PitfallsCard';
import { MultiStageCard } from './cards/MultiStageCard';
import { PainAnalysisCard } from './cards/PainAnalysisCard';
import { ScenarioCard } from './cards/ScenarioCard';
import { FollowUpCard } from './cards/FollowUpCard';
import { ObjectionCard } from './cards/ObjectionCard';
import { ClosingCard } from './cards/ClosingCard';
import { FrameworkCard } from './cards/FrameworkCard';
import { QualityCard } from './cards/QualityCard';

const STYLE_TABS = [
  { key: 'empathy', label: '共情版', icon: '\u{1F91D}' },
  { key: 'straightforward', label: '直爽版', icon: '\u{26A1}' },
  { key: 'professional', label: '专业版', icon: '\u{1F4BC}' },
];

function normalizeStyle(style: string): string {
  const s = style.toLowerCase();
  if (s.includes('empath') || s.includes('共情') || s.includes('温和')) return 'empathy';
  if (s.includes('straight') || s.includes('直爽') || s.includes('直接')) return 'straightforward';
  if (s.includes('profess') || s.includes('专业') || s.includes('严谨')) return 'professional';
  return style;
}

const CopyButton = memo(function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      logger.error('Copy failed');
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors',
        copied ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600',
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? '已复制' : '复制'}
    </button>
  );
});

export default function ScriptDisplay() {
  const { activeStyle, setActiveStyle, currentScript, isGenerating, generatedScriptIds } = useScriptStore();
  const { sessions, activeSessionId } = useSessionStore();
  const navigate = useNavigate();
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const [compareMode, setCompareMode] = useState(false);

  const getStyleContent = useCallback(
    (styleKey: string): string => {
      const paths = currentScript?.tacticalExecutionPaths;
      if (paths && paths.length > 0) {
        const pathMap: Record<string, string> = { 'empathy': '共情版', 'straightforward': '直爽版', 'professional': '专业版' };
        const targetPath = paths.find(p => p.pathType === pathMap[styleKey]);
        return targetPath?.verbalScript || paths[0]?.verbalScript || '';
      }
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

  const handlePractice = useCallback(() => {
    const scriptContent = getStyleContent(activeStyle);
    const scenario = currentScript?.scenarioBreakdown?.objective || currentScript?.buyerPersonaAnalysis?.targetStakeholder || '';
    const activePath = currentScript?.tacticalExecutionPaths?.find(
      p => p.pathType === STYLE_TABS.find(t => t.key === activeStyle)?.label
    );
    navigate('/app/practice', {
      state: {
        fromScript: true, scenario, scriptContent,
        industry: activeSession?.industry || currentScript?.detectedBusinessMode || '',
        style: activeStyle,
        coachingDirectives: activePath?.coachingDirectives || null,
      },
    });
  }, [navigate, activeStyle, currentScript, getStyleContent, activeSession]);

  const handleStyleSelect = useCallback((key: string) => setActiveStyle(key), [setActiveStyle]);

  if (!currentScript && !isGenerating) return null;

  return (
    <div className="mx-4 mb-4 rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Style tabs */}
      <div className="flex items-center border-b border-gray-100">
        {STYLE_TABS.map(({ key, label, icon }) => (
          <button key={key} onClick={() => handleStyleSelect(key)}
            className={cn('flex-1 px-4 py-3 text-sm font-medium transition-all',
              activeStyle === key && !compareMode ? 'border-b-2 border-primary-500 bg-primary-50 text-primary-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
              compareMode && 'text-gray-400',
            )}>
            <span className="mr-1.5">{icon}</span>{label}
          </button>
        ))}
        {currentScript && !isGenerating && (
          <>
            <button onClick={handlePractice} className="mr-1 rounded-lg p-2 text-gray-400 transition-colors hover:bg-orange-50 hover:text-orange-600" title="用这段话术练习">
              <Swords className="h-4 w-4" />
            </button>
            <button onClick={() => setCompareMode(!compareMode)}
              className={cn('mr-2 rounded-lg p-2 transition-colors', compareMode ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600')}
              title={compareMode ? '退出对比' : '三版对比'}>
              {compareMode ? <X className="h-4 w-4" /> : <Columns className="h-4 w-4" />}
            </button>
          </>
        )}
      </div>

      {/* Content */}
      {isGenerating ? (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin text-primary-500" /><span className="text-sm text-gray-500">AI 正在生成话术...</span></div>
          <Skeleton.Line className="h-4 w-3/4" /><Skeleton.Line className="h-4 w-full" /><Skeleton.Line className="h-4 w-2/3" />
        </div>
      ) : currentScript ? (
        <div className="p-4">
          {/* Compare / Single style */}
          {compareMode ? (
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              {STYLE_TABS.map(({ key, label, icon }) => (
                <div key={key} className="rounded-lg bg-gray-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600">{icon} {label}</span>
                    <CopyButton text={getStyleContent(key)} />
                  </div>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700 line-clamp-8">{getStyleContent(key)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-4">
              <div className="rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 p-4 border border-gray-200">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">{STYLE_TABS.find(t => t.key === activeStyle)?.icon} {STYLE_TABS.find(t => t.key === activeStyle)?.label}</span>
                  <CopyButton text={getStyleContent(activeStyle)} />
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 mb-3">{getStyleContent(activeStyle)}</p>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                  <button onClick={handlePractice} className="flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600 transition-colors"><Swords className="h-3 w-3" />练一下</button>
                  <button onClick={() => setCompareMode(true)} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 hover:border-gray-400 transition-colors"><Columns className="h-3 w-3" />三版对比</button>
                </div>
              </div>
            </div>
          )}

          {/* Analysis cards */}
          <BuyerPersonaCard data={currentScript.buyerPersonaAnalysis} />
          <PitfallsCard pitfalls={currentScript.pitfalls} reasoning={currentScript.reasoning} />
          <MultiStageCard data={currentScript.multiStageSimulation} />
          {!compareMode && <CoachingDirectivesCard paths={currentScript.tacticalExecutionPaths} activeStyle={activeStyle} />}
          <PainAnalysisCard data={currentScript.painAnalysis} />
          <ScenarioCard data={currentScript.scenarioBreakdown} />
          <FollowUpCard questions={currentScript.followUpQuestions} />
          <SpeechLogicCard styles={currentScript.speechStyles} activeStyle={activeStyle} compareMode={compareMode} />
          <ObjectionCard data={currentScript.objectionHandling} />
          <ClosingCard data={currentScript.closingStrategy} />
          <FrameworkCard analysis={currentScript.frameworkAnalysis} />
          <FrameworkDetailsCard script={currentScript} />

          {/* Reasoning */}
          {currentScript.reasoning?.length > 0 && (
            <div className="mb-4">
              <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-700"><BookOpen className="h-4 w-4" />推荐理由</h4>
              <ul className="space-y-1">{currentScript.reasoning.map((r, i) => <li key={i} className="flex items-start gap-2 text-sm text-gray-600"><span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-400" />{r}</li>)}</ul>
            </div>
          )}

          {/* Confidence */}
          {currentScript.confidenceScore > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-gray-500"><span>AI 信心指数</span><span>{Math.round(currentScript.confidenceScore * 100)}%</span></div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                <div className={cn('h-full rounded-full transition-all', currentScript.confidenceScore >= 0.7 ? 'bg-green-500' : currentScript.confidenceScore >= 0.4 ? 'bg-yellow-500' : 'bg-red-500')} style={{ width: `${currentScript.confidenceScore * 100}%` }} />
              </div>
            </div>
          )}

          <QualityCard data={currentScript.quality_report} />

          {/* Pitfalls (legacy) */}
          {currentScript.pitfalls?.length > 0 && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-amber-700"><AlertTriangle className="h-4 w-4" />避坑提醒</h4>
              <ul className="space-y-2">{currentScript.pitfalls.map((p, i) => <li key={i} className="text-sm text-amber-800"><span className="font-medium">❌ {p.action}</span><span className="ml-1 text-amber-600">— {p.reason}</span></li>)}</ul>
            </div>
          )}

          {/* Knowledge source */}
          {currentScript.knowledgeSource && (
            <div className="mb-4 border-t border-gray-100 pt-3"><h4 className="mb-1 text-xs font-medium text-gray-400">引用来源</h4><p className="text-xs text-gray-500">{currentScript.knowledgeSource}</p></div>
          )}

          {/* Feedback */}
          <div className="border-t border-gray-100 pt-3">
            {(() => {
              const activeIdx = STYLE_TABS.findIndex(t => t.key === activeStyle);
              const scriptId = generatedScriptIds[activeIdx] || generatedScriptIds[0] || '';
              return <ScriptFeedback scriptId={scriptId} previouslySubmitted={!!scriptId} />;
            })()}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// --- Sub-components (kept in same file to avoid circular deps) ---

const CoachingDirectivesCard = memo(function CoachingDirectivesCard({ paths, activeStyle }: { paths: any[]; activeStyle: string }) {
  const pathMap: Record<string, string> = { 'empathy': '共情版', 'straightforward': '直爽版', 'professional': '专业版' };
  const activePath = paths?.find(p => p.pathType === pathMap[activeStyle]);
  if (!activePath?.coachingDirectives) return null;
  return (
    <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 p-4">
      <h4 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-teal-700"><Lightbulb className="h-4 w-4" />执行教练指令</h4>
      <div className="space-y-2">
        {activePath.coachingDirectives.pacingAndTone && <div><p className="text-xs font-medium text-teal-500">语速语调</p><p className="text-sm text-teal-800">{activePath.coachingDirectives.pacingAndTone}</p></div>}
        {activePath.coachingDirectives.microBehaviors && <div><p className="text-xs font-medium text-teal-500">微行为</p><p className="text-sm text-teal-800">{activePath.coachingDirectives.microBehaviors}</p></div>}
      </div>
    </div>
  );
});

const SpeechLogicCard = memo(function SpeechLogicCard({ styles, activeStyle, compareMode }: { styles: any[]; activeStyle: string; compareMode: boolean }) {
  if (compareMode || !styles) return null;
  const activeVariant = styles.find(s => normalizeStyle(s.style) === activeStyle) || styles[STYLE_TABS.findIndex(t => t.key === activeStyle)];
  if (!activeVariant?.logic) return null;
  return (
    <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-violet-600"><Lightbulb className="h-3.5 w-3.5" />为什么这样说有效</p>
      <p className="mt-1 text-sm text-violet-800">{activeVariant.logic}</p>
    </div>
  );
});

const FrameworkDetailsCard = memo(function FrameworkDetailsCard({ script }: { script: any }) {
  const [show, setShow] = useState(false);
  const frameworkCards: { key: string; label: string; color: string; data: Record<string, unknown> }[] = [];
  if (script.swotAnalysis && Object.keys(script.swotAnalysis).length > 0) frameworkCards.push({ key: 'swot', label: 'SWOT 分析', color: 'blue', data: script.swotAnalysis });
  if (script.scenario5w2h && Object.keys(script.scenario5w2h).length > 0) frameworkCards.push({ key: '5w2h', label: '5W2H 场景分析', color: 'cyan', data: script.scenario5w2h });
  if (script.aidaFlow && Object.keys(script.aidaFlow).length > 0) frameworkCards.push({ key: 'aida', label: 'AIDA 营销漏斗', color: 'pink', data: script.aidaFlow });
  if (script.fabMapping && Object.keys(script.fabMapping).length > 0) frameworkCards.push({ key: 'fab', label: 'FAB 映射', color: 'amber', data: script.fabMapping });
  if (script.bantQualification && Object.keys(script.bantQualification).length > 0) frameworkCards.push({ key: 'bant', label: 'BANT 资格认证', color: 'sky', data: script.bantQualification });
  if (script.meddicAnalysis && Object.keys(script.meddicAnalysis).length > 0) frameworkCards.push({ key: 'meddic', label: 'MEDDIC 分析', color: 'emerald', data: script.meddicAnalysis });
  if (script.porterForces && Object.keys(script.porterForces).length > 0) frameworkCards.push({ key: 'porter', label: '波特五力', color: 'red', data: script.porterForces });
  if (script.journeyStage && Object.keys(script.journeyStage).length > 0) frameworkCards.push({ key: 'journey', label: '客户旅程', color: 'orange', data: script.journeyStage });
  if (script.scqaNarrative && Object.keys(script.scqaNarrative).length > 0) frameworkCards.push({ key: 'scqa', label: 'SCQA 叙事', color: 'teal', data: script.scqaNarrative });
  if (script.challengerInsight && Object.keys(script.challengerInsight).length > 0) frameworkCards.push({ key: 'challenger', label: 'Challenger 洞察', color: 'purple', data: script.challengerInsight });
  if (frameworkCards.length === 0) return null;

  const colorMap: Record<string, { border: string; bg: string; text: string }> = {
    blue: { border: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-700' },
    cyan: { border: 'border-cyan-200', bg: 'bg-cyan-50', text: 'text-cyan-700' },
    pink: { border: 'border-pink-200', bg: 'bg-pink-50', text: 'text-pink-700' },
    amber: { border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-700' },
    sky: { border: 'border-sky-200', bg: 'bg-sky-50', text: 'text-sky-700' },
    emerald: { border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    red: { border: 'border-red-200', bg: 'bg-red-50', text: 'text-red-700' },
    orange: { border: 'border-orange-200', bg: 'bg-orange-50', text: 'text-orange-700' },
    teal: { border: 'border-teal-200', bg: 'bg-teal-50', text: 'text-teal-700' },
    purple: { border: 'border-purple-200', bg: 'bg-purple-50', text: 'text-purple-700' },
  };

  return (
    <div className="mb-4">
      <button onClick={() => setShow(!show)} className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
        <span className="flex items-center gap-1.5"><Gauge className="h-4 w-4 text-violet-500" />详细框架分析 ({frameworkCards.length})</span>
        {show ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {show && (
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
                        <p className={cn('text-[10px] font-medium uppercase tracking-wide', c.text, 'opacity-70')}>{displayKey}</p>
                        {Array.isArray(value) ? (
                          <ul className="mt-0.5 space-y-0.5">{value.map((item, i) => <li key={i} className={cn('text-xs', c.text)}>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</li>)}</ul>
                        ) : typeof value === 'object' ? (
                          <pre className={cn('mt-0.5 whitespace-pre-wrap text-xs', c.text)}>{JSON.stringify(value, null, 2)}</pre>
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
});
