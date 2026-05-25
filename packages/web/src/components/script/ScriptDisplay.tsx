import { useState, useCallback } from 'react';
import { Copy, Check, BookOpen, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useScriptStore } from '@/stores/scriptStore';
import ScriptFeedback from './ScriptFeedback';

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

  const handleStyleSelect = useCallback(
    (key: string) => {
      setActiveStyle(key);
    },
    [setActiveStyle],
  );

  // Find the content for the active style tab
  const getStyleContent = useCallback(
    (styleKey: string): string => {
      if (!currentScript?.speech_styles) return '';
      // Try to find matching style
      for (const s of currentScript.speech_styles) {
        if (normalizeStyle(s.style) === styleKey) return s.content;
      }
      // Fallback: use index-based mapping
      const styleIndex = STYLE_TABS.findIndex((t) => t.key === styleKey);
      if (styleIndex >= 0 && currentScript.speech_styles[styleIndex]) {
        return currentScript.speech_styles[styleIndex].content;
      }
      return currentScript.speech_styles[0]?.content || '';
    },
    [currentScript],
  );

  if (!currentScript && !isGenerating) {
    return null;
  }

  return (
    <div className="mx-4 mb-4 rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Style tabs */}
      <div className="flex border-b border-gray-100">
        {STYLE_TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => handleStyleSelect(key)}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors',
              activeStyle === key
                ? 'border-b-2 border-primary-500 bg-primary-50 text-primary-700'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
            )}
          >
            <span className="mr-1.5">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Content area */}
      {isGenerating ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary-500" />
            <p className="text-sm text-gray-500">AI 正在生成话术...</p>
            <p className="mt-1 text-xs text-gray-400">分析场景，匹配知识库，生成三种风格</p>
          </div>
        </div>
      ) : currentScript ? (
        <div className="p-4">
          {/* Script content */}
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
          {currentScript.confidence_score > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>AI 信心指数</span>
                <span>{Math.round(currentScript.confidence_score * 100)}%</span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    currentScript.confidence_score >= 0.7
                      ? 'bg-green-500'
                      : currentScript.confidence_score >= 0.4
                        ? 'bg-yellow-500'
                        : 'bg-red-500',
                  )}
                  style={{ width: `${currentScript.confidence_score * 100}%` }}
                />
              </div>
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
          {currentScript.knowledge_source && (
            <div className="mb-4 border-t border-gray-100 pt-3">
              <h4 className="mb-1 text-xs font-medium text-gray-400">引用来源</h4>
              <p className="text-xs text-gray-500">{currentScript.knowledge_source}</p>
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
