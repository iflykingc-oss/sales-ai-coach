import { useState, useRef, useCallback } from 'react';
import {
  Send,
  Image,
  Mic,
  FileText,
  Clipboard,
  MessageSquare,
  Loader2,
  X,
  Camera,
  MicOff,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { useSessionStore } from '@/stores/sessionStore';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useScriptStore } from '@/stores/scriptStore';
import type { InputType } from '@sales-ai-coach/shared';

type InputMode = 'TEXT' | 'IMAGE' | 'VOICE' | 'FORM' | 'PASTE';

interface QuickFormField {
  label: string;
  key: string;
  placeholder: string;
  type: 'input' | 'select';
  options?: string[];
}

const QUICK_FORM_FIELDS: QuickFormField[] = [
  { label: '客户名称', key: 'customerName', placeholder: '请输入客户名称', type: 'input' },
  {
    label: '行业',
    key: 'industry',
    placeholder: '选择行业',
    type: 'select',
    options: ['互联网', '制造业', '金融', '零售', '医疗', '教育', '其他'],
  },
  {
    label: '预算',
    key: 'budget',
    placeholder: '选择预算范围',
    type: 'select',
    options: ['< 5万', '5-20万', '20-50万', '50-100万', '> 100万', '未确定'],
  },
  { label: '异议', key: 'objection', placeholder: '客户提出的异议/顾虑', type: 'input' },
];

const INPUT_MODES: { key: InputMode; icon: React.ReactNode; label: string }[] = [
  { key: 'TEXT', icon: <MessageSquare className="h-4 w-4" />, label: '文本' },
  { key: 'IMAGE', icon: <Camera className="h-4 w-4" />, label: '截图' },
  { key: 'VOICE', icon: <Mic className="h-4 w-4" />, label: '语音' },
  { key: 'FORM', icon: <FileText className="h-4 w-4" />, label: '快速填表' },
  { key: 'PASTE', icon: <Clipboard className="h-4 w-4" />, label: '粘贴' },
];

interface InputBarProps {
  onSend?: (input: string, inputType: InputMode, formData?: Record<string, string>) => void;
}

export default function InputBar({ onSend }: InputBarProps) {
  const { activeSessionId } = useSessionStore();
  const { isGenerating, error: scriptError, setCurrentScript } = useScriptStore();
  const [mode, setMode] = useState<InputMode>('TEXT');
  const [textValue, setValue] = useState('');
  const [pasteValue, setPasteValue] = useState('');
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const {
    isListening,
    isSupported,
    transcript: voiceTranscript,
    interimTranscript,
    error: voiceError,
    startListening,
    stopListening,
    resetTranscript: resetVoiceTranscript,
  } = useVoiceInput();
  const [pasteError, setPasteError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteAreaRef = useRef<HTMLDivElement>(null);

  const handleSubmit = useCallback(async () => {
    let input = '';
    let inputType: InputMode = mode;
    let formData: Record<string, string> | undefined;

    switch (mode) {
      case 'TEXT':
        input = textValue.trim();
        break;
      case 'IMAGE':
        if (!imageUrl) return;
        input = `[图片已上传]`;
        break;
      case 'VOICE':
        input = voiceTranscript.trim() || (interimTranscript ? interimTranscript.trim() : '');
        if (!input) return;
        break;
      case 'FORM':
        formData = { ...formValues };
        input = Object.entries(formData)
          .filter(([, v]) => v.trim())
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n');
        if (!input.trim()) return;
        break;
      case 'PASTE':
        input = pasteValue.trim();
        if (!input) return;
        break;
    }

    if (!input) return;

    // Optimistically clear input
    if (mode === 'TEXT') setValue('');
    if (mode === 'PASTE') setPasteValue('');
    if (mode === 'FORM') setFormValues({});
    if (mode === 'IMAGE') setImageUrl(null);
    if (mode === 'VOICE') resetVoiceTranscript();

    if (onSend) {
      onSend(input, inputType, formData);
    } else {
      // Default: call the API directly
      await generateScript(input, inputType);
    }
  }, [mode, textValue, imageUrl, formValues, pasteValue, onSend]);

  const generateScript = useCallback(
    async (input: string, inputType: InputMode) => {
      if (!activeSessionId) return;

      useScriptStore.setState({ isGenerating: true, error: null });

      try {
        // First, save the user message to the session
        await fetch(`/api/sessions/${activeSessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            role: 'USER',
            content: input,
            inputType,
          }),
        });

        // Dispatch event to add message to MessageList
        const userMsg = {
          id: `optimistic-${Date.now()}`,
          sessionId: activeSessionId,
          role: 'USER' as const,
          content: input,
          inputType,
          createdAt: new Date().toISOString(),
        };
        window.dispatchEvent(
          new CustomEvent('append-message', { detail: userMsg }),
        );

        // Call script generation API
        const res = await fetch('/api/scripts/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            sessionId: activeSessionId,
            input,
            inputType,
          }),
        });

        if (!res.ok) throw new Error('话术生成失败');
        const json = await res.json();

        if (json.success && json.data) {
          setCurrentScript(json.data);

          // Add assistant message
          const assistantMsg = {
            id: `assistant-${Date.now()}`,
            sessionId: activeSessionId,
            role: 'ASSISTANT' as const,
            content: json.data.speech_styles[0]?.content || '话术已生成',
            inputType: 'TEXT' as InputType,
            createdAt: new Date().toISOString(),
          };
          window.dispatchEvent(
            new CustomEvent('append-message', { detail: assistantMsg }),
          );
        }
      } catch (err) {
        useScriptStore.setState({
          error: err instanceof Error ? err.message : '生成失败，请重试',
        });
      } finally {
        useScriptStore.setState({ isGenerating: false });
      }
    },
    [activeSessionId, setCurrentScript],
  );

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        setImageUrl(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setPasteValue(text);
      setPasteError(null);
    } catch {
      setPasteError('无法读取剪贴板内容，请检查浏览器权限');
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleRecordingToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* Error display */}
      {scriptError && (
        <div className="mx-4 mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {scriptError}
          <button
            onClick={() => useScriptStore.setState({ error: null })}
            className="ml-2 text-red-400 hover:text-red-600"
          >
            关闭
          </button>
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex border-b border-gray-100 px-2">
        {INPUT_MODES.map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={cn(
              'flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              mode === key
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="flex items-end gap-2 p-3">
        {/* TEXT mode */}
        {mode === 'TEXT' && (
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={textValue}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入客户对话场景、异议、或需要应对的情况... (Ctrl+Enter 发送)"
              rows={2}
              className="resize-none"
            />
          </div>
        )}

        {/* IMAGE mode */}
        {mode === 'IMAGE' && (
          <div className="flex-1">
            <div
              className={cn(
                'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors',
                imageUrl
                  ? 'border-primary-300 bg-primary-50'
                  : 'border-gray-300 hover:border-primary-300 hover:bg-gray-50',
              )}
            >
              {imageUrl ? (
                <div className="relative">
                  <img
                    src={imageUrl}
                    alt="Uploaded screenshot"
                    className="max-h-[120px] rounded-lg object-contain"
                  />
                  <button
                    onClick={() => setImageUrl(null)}
                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-800 text-white hover:bg-gray-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <>
                  <Image className="mb-2 h-8 w-8 text-gray-400" />
                  <p className="mb-1 text-sm text-gray-500">粘贴或上传截图</p>
                  <p className="mb-2 text-xs text-gray-400">支持 PNG, JPG, WebP</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    选择文件
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* VOICE mode */}
        {mode === 'VOICE' && (
          <div className="flex-1">
            <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-6">
              {!isSupported ? (
                <>
                  <MicOff className="mb-2 h-8 w-8 text-gray-400" />
                  <p className="text-sm text-gray-500">当前浏览器不支持语音输入</p>
                  <p className="mt-1 text-xs text-gray-400">请使用 Chrome 或 Edge 浏览器</p>
                </>
              ) : (
                <>
                  <button
                    onClick={handleRecordingToggle}
                    className={cn(
                      'flex h-16 w-16 items-center justify-center rounded-full transition-all',
                      isListening
                        ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200'
                        : 'bg-gray-200 text-gray-500 hover:bg-gray-300',
                    )}
                  >
                    {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                  </button>
                  {voiceError ? (
                    <p className="mt-3 text-sm text-red-500">{voiceError}</p>
                  ) : (
                    <>
                      <p className="mt-3 text-sm text-gray-500">
                        {isListening ? '录音中...点击停止' : '点击开始录音'}
                      </p>
                      {interimTranscript && (
                        <p className="mt-2 max-w-xs text-center text-xs italic text-gray-400">
                          {interimTranscript}
                        </p>
                      )}
                      {voiceTranscript && (
                        <div className="mt-3 w-full max-w-md rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700">
                          {voiceTranscript}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* FORM mode */}
        {mode === 'FORM' && (
          <div className="flex-1">
            <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              {QUICK_FORM_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-2">
                  <label className="w-16 flex-shrink-0 text-sm font-medium text-gray-600">
                    {field.label}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      value={formValues[field.key] || ''}
                      onChange={(e) =>
                        setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="">请选择</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={formValues[field.key] || ''}
                      onChange={(e) =>
                        setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PASTE mode */}
        {mode === 'PASTE' && (
          <div className="flex-1">
            <div
              ref={pasteAreaRef}
              className="relative"
            >
              {pasteValue ? (
                <div className="relative">
                  <Textarea
                    value={pasteValue}
                    onChange={(e) => setPasteValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={3}
                    className="resize-none pr-8"
                    placeholder="粘贴的内容..."
                  />
                  <button
                    onClick={() => setPasteValue('')}
                    className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6">
                  <Clipboard className="mb-2 h-8 w-8 text-gray-400" />
                  <p className="mb-1 text-sm text-gray-500">粘贴剪贴板内容</p>
                  <Button variant="secondary" size="sm" onClick={handlePaste}>
                    读取剪贴板
                  </Button>
                </div>
              )}
              {pasteError && <p className="mt-1 text-xs text-red-500">{pasteError}</p>}
            </div>
          </div>
        )}

        {/* Send button */}
        <Button
          onClick={handleSubmit}
          disabled={isGenerating || !activeSessionId}
          className="flex-shrink-0"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              生成中
            </>
          ) : (
            <>
              <Send className="mr-1 h-4 w-4" />
              发送
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
