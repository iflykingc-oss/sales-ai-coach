import { memo } from 'react';
import { Save, Download, AlertTriangle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SavePromptProps {
  visible: boolean;
  onDismiss: () => void;
  onSave?: () => void;
  saveLabel?: string;
  message?: string;
}

/**
 * Banner shown when user has unsaved session data.
 * Privacy: reminds user that data is ephemeral unless explicitly saved.
 */
export const SavePrompt = memo(function SavePrompt({
  visible,
  onDismiss,
  onSave,
  saveLabel = '保存到账号',
  message = '您有未保存的数据，关闭页面后将丢失。',
}: SavePromptProps) {
  const navigate = useNavigate();

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-xl animate-slide-up">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">{message}</p>
            <p className="text-xs text-amber-600 mt-1">
              数据仅在当前会话有效。保存到账号后可在历史记录中查看。
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {onSave && (
                <button
                  onClick={onSave}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saveLabel}
                </button>
              )}
              <button
                onClick={() => navigate('/app/data-rights')}
                className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-amber-700 border border-amber-300 hover:bg-amber-100 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                导出数据
              </button>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg text-amber-400 hover:text-amber-600 hover:bg-amber-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
});
