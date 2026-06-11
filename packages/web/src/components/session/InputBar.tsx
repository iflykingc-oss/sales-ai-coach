import { useState, useRef, useCallback } from 'react';
import {
  Send,
  Image,
  Mic,
  FileText,
  Clipboard,
  Loader2,
  X,
  Paperclip,
  MicOff,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { useSessionStore } from '@/stores/sessionStore';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useScriptStore } from '@/stores/scriptStore';
import { generateScript } from '@/services/scriptService';
import type { InputType } from '@sales-ai-coach/shared';

type InputMode = 'TEXT' | 'IMAGE' | 'VOICE' | 'PASTE';

interface InputBarProps {
  onSend?: (input: string, inputType: InputMode, formData?: Record<string, string>) => void;
}

export default function InputBar({ onSend }: InputBarProps) {
  const { activeSessionId } = useSessionStore();
  const { isGenerating, error: scriptError, setCurrentScript } = useScriptStore();
  const [textValue, setValue] = useState('');
  const [showAttachments, setShowAttachments] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<Array<{ type: InputMode; name: string; data: string }>>([]);
  const [pasteValue, setPasteValue] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);
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
  const [showVoiceArea, setShowVoiceArea] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerateScript = useCallback(
    async (input: string, inputType: InputMode) => {
      if (!activeSessionId) return;

      useScriptStore.setState({ isGenerating: true, error: null });

      try {
        // Dispatch event to add user message to MessageList
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

        // Use shared script service
        const result = await generateScript({
          sessionId: activeSessionId,
          content: input,
          inputType,
          frameworks: [], // AI auto-selects frameworks
        });

        if (result?.success && result?.data) {
          setCurrentScript(result.data);

          // Add assistant message
          const assistantMsg = {
            id: `assistant-${Date.now()}`,
            sessionId: activeSessionId,
            role: 'ASSISTANT' as const,
            content: result.data.speechStyles[0]?.content || '话术已生成',
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

  const handleSubmit = useCallback(async () => {
    let input = textValue.trim();

    // 附加文件信息
    if (attachedFiles.length > 0) {
      const fileInfo = attachedFiles.map(f => `[${f.type === 'IMAGE' ? '图片' : '附件'}]${f.name}`).join('\n');
      input = input ? `${input}\n\n${fileInfo}` : fileInfo;
    }

    // 语音输入
    if (showVoiceArea && voiceTranscript) {
      input = voiceTranscript.trim();
    }

    // 粘贴内容
    if (showPasteArea && pasteValue) {
      input = pasteValue.trim();
    }

    if (!input) return;

    // Determine input type
    let inputType: InputMode = 'TEXT';
    if (attachedFiles.some(f => f.type === 'IMAGE')) inputType = 'IMAGE';
    if (showVoiceArea && voiceTranscript) inputType = 'VOICE';
    if (showPasteArea && pasteValue) inputType = 'PASTE';

    // Clear inputs
    setValue('');
    setAttachedFiles([]);
    setPasteValue('');
    setShowPasteArea(false);
    setShowVoiceArea(false);
    resetVoiceTranscript();

    if (onSend) {
      onSend(input, inputType);
    } else {
      await handleGenerateScript(input, inputType);
    }
  }, [textValue, attachedFiles, showVoiceArea, voiceTranscript, showPasteArea, pasteValue, onSend, handleGenerateScript, resetVoiceTranscript]);

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        setAttachedFiles(prev => [...prev, { type: 'IMAGE', name: file.name, data: ev.target?.result as string }]);
        setShowAttachments(false);
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setPasteValue(text);
      setShowPasteArea(true);
      setShowAttachments(false);
    } catch {
      // Fallback: show paste area for manual paste
      setShowPasteArea(true);
      setShowAttachments(false);
    }
  }, []);

  const handleVoiceToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
      setShowVoiceArea(true);
      setShowAttachments(false);
    }
  }, [isListening, startListening, stopListening]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

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

      {/* Attached files preview */}
      {attachedFiles.length > 0 && (
        <div className="flex gap-2 px-4 pt-2">
          {attachedFiles.map((file, index) => (
            <div key={index} className="relative flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm">
              {file.type === 'IMAGE' ? (
                <Image className="h-4 w-4 text-blue-500" />
              ) : (
                <FileText className="h-4 w-4 text-green-500" />
              )}
              <span className="text-gray-700">{file.name}</span>
              <button
                onClick={() => removeAttachedFile(index)}
                className="ml-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Voice input area */}
      {showVoiceArea && (
        <div className="mx-4 mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">语音输入</span>
            <button
              onClick={() => {
                setShowVoiceArea(false);
                resetVoiceTranscript();
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {!isSupported ? (
            <p className="text-sm text-gray-500">当前浏览器不支持语音输入</p>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleVoiceToggle}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full transition-all',
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-gray-200 text-gray-500 hover:bg-gray-300',
                )}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <div className="flex-1">
                {voiceError ? (
                  <p className="text-sm text-red-500">{voiceError}</p>
                ) : isListening ? (
                  <p className="text-sm text-gray-500">{interimTranscript || '录音中...'}</p>
                ) : voiceTranscript ? (
                  <p className="text-sm text-gray-700">{voiceTranscript}</p>
                ) : (
                  <p className="text-sm text-gray-400">点击麦克风开始录音</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Paste area */}
      {showPasteArea && (
        <div className="mx-4 mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">粘贴内容</span>
            <button
              onClick={() => {
                setShowPasteArea(false);
                setPasteValue('');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <Textarea
            value={pasteValue}
            onChange={(e) => setPasteValue(e.target.value)}
            rows={3}
            className="resize-none"
            placeholder="粘贴对话内容..."
          />
        </div>
      )}

      {/* Main input area */}
      <div className="flex items-end gap-2 p-3">
        {/* Text input */}
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={textValue}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="描述你的销售场景、客户异议、或需要应对的情况... (Ctrl+Enter 发送)"
            rows={2}
            className="resize-none"
          />
        </div>

        {/* Attachment button */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAttachments(!showAttachments)}
            className="flex-shrink-0"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* Attachment dropdown */}
          {showAttachments && (
            <div className="absolute bottom-full right-0 mb-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg">
              <div className="py-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Image className="h-4 w-4 text-blue-500" />
                  上传截图
                </button>
                <button
                  onClick={handleVoiceToggle}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Mic className="h-4 w-4 text-green-500" />
                  语音输入
                </button>
                <button
                  onClick={handlePasteFromClipboard}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Clipboard className="h-4 w-4 text-purple-500" />
                  粘贴内容
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Send button */}
        <Button
          onClick={handleSubmit}
          disabled={isGenerating || !activeSessionId || (!textValue.trim() && attachedFiles.length === 0 && !voiceTranscript && !pasteValue)}
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  );
}
