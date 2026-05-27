import { useState, useCallback } from 'react';
import { Copy, Check, BookOpen, AlertTriangle, Loader2, CheckCircle, Columns, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useScriptStore } from '@/stores/scriptStore';
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
  const [compareMode, setCompareMode] = useState(false);

  const handleStyleSelect = useCallback(
    (key: string) => {
      setActiveStyle(key);
    },
    [setActiveStyle],
  );

  // Find the content for the active style tab
  const getStyleContent = useCallback(
    (styleKey: string): string => {
      if (!currentScript?.speechStyles) return '';
      // Try to find matching style
      for (const s of currentScript.speechStyles) {
        if (normalizeStyle(s.style) === styleKey) return s.content;
      }
      // Fallback: use index-based mapping
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
              {STYLE_TABS.map(({ key, label, icon }) => (
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
                </div>
              ))}
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

          {/* Feedback */}
          <div className="border-t border-gray-100 pt-3">
            <ScriptFeedback
              scriptId={generatedScriptIds[0] || ''}
              previouslySubmitted={!!generatedScriptIds[0]}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
