import { logger } from '@/utils/logger';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useSessionStore } from '@/stores/sessionStore';
import { useScriptStore } from '@/stores/scriptStore';
import { localDb } from '@/lib/db';
import type { SessionStatus } from '@sales-ai-coach/shared';

const STATUS_CONFIG: Record<SessionStatus, { color: string; label: string }> = {
  PENDING: { color: 'bg-red-500', label: 'PENDING' },
  NEGOTIATING: { color: 'bg-yellow-500', label: 'NEGOTIATING' },
  WON: { color: 'bg-green-500', label: 'WON' },
  LOST: { color: 'bg-gray-400', label: 'LOST' },
  ARCHIVED: { color: 'bg-gray-300', label: 'ARCHIVED' },
};

const MAX_SESSIONS = 50;

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  sessionId: string;
}

export default function SessionTabBar() {
  const { sessions, activeSessionId, setActiveSessionId, addSession, removeSession, setSessions } =
    useSessionStore();
  const { setSessionId } = useScriptStore();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    sessionId: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Focus rename input when entering rename mode
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = () => setContextMenu((prev) => ({ ...prev, visible: false }));
    if (contextMenu.visible) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu.visible]);

  const handleSelectSession = useCallback(
    (id: string) => {
      setActiveSessionId(id);
      setSessionId(id);
      setContextMenu((prev) => ({ ...prev, visible: false }));
    },
    [setActiveSessionId, setSessionId],
  );

  const handleStartRename = useCallback((id: string, currentName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRenamingId(id);
    setRenameValue(currentName);
  }, []);

  const handleFinishRename = useCallback(async () => {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      const res = await fetch(`/api/sessions/${renamingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          const updatedSessions = sessions.map((s) =>
            s.id === renamingId ? { ...s, name: renameValue.trim() } : s,
          );
          setSessions(updatedSessions);
          await localDb.cacheSession(renamingId, { name: renameValue.trim() });
        }
      }
    } catch (err) {
      logger.error('Failed to rename session:', err);
    }
    setRenamingId(null);
  }, [renamingId, renameValue, sessions, setSessions]);

  const handleContextMenu = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, sessionId: id });
  }, []);

  const handleDeleteSession = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/sessions/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (res.ok) {
          removeSession(id);
          await localDb.removeItem(`session:${id}`);
        }
      } catch (err) {
        logger.error('Failed to delete session:', err);
      }
      setContextMenu((prev) => ({ ...prev, visible: false }));
    },
    [removeSession],
  );

  const handleCreateSession = useCallback(async () => {
    if (sessions.length >= MAX_SESSIONS) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: `新会话 ${sessions.length + 1}` }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          addSession(json.data);
          handleSelectSession(json.data.id);
        }
      }
    } catch (err) {
      logger.error('Failed to create session:', err);
    }
    setIsCreating(false);
  }, [sessions.length, addSession, handleSelectSession]);

  const visibleSessions = sessions.slice(0, MAX_SESSIONS);

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="flex items-center">
        <div
          ref={scrollContainerRef}
          className="flex flex-1 overflow-x-auto scrollbar-thin"
          style={{ scrollbarWidth: 'thin' }}
        >
          {visibleSessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const statusConfig = STATUS_CONFIG[session.status as SessionStatus] || STATUS_CONFIG.PENDING;
            const isRenaming = renamingId === session.id;

            return (
              <div
                key={session.id}
                className={cn(
                  'group flex items-center gap-2 border-r border-gray-100 px-4 py-2.5 text-sm cursor-pointer transition-colors select-none min-w-0 max-w-[200px]',
                  isActive
                    ? 'bg-primary-50 text-primary-700 border-b-2 border-b-primary-500'
                    : 'text-gray-600 hover:bg-gray-50',
                )}
                onClick={() => handleSelectSession(session.id)}
                onDoubleClick={(e) => handleStartRename(session.id, session.name, e)}
                onContextMenu={(e) => handleContextMenu(session.id, e)}
              >
                <span
                  className={cn('h-2.5 w-2.5 flex-shrink-0 rounded-full', statusConfig.color)}
                  title={statusConfig.label}
                />
                {isRenaming ? (
                  <input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={handleFinishRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFinishRename();
                      if (e.key === 'Escape') {
                        setRenamingId(null);
                        setRenameValue('');
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full rounded border border-primary-300 bg-white px-1 py-0.5 text-sm text-gray-800 focus:border-primary-500 focus:outline-none"
                  />
                ) : (
                  <span className="truncate">{session.name}</span>
                )}
              </div>
            );
          })}

          {visibleSessions.length === 0 && (
            <div className="px-4 py-2.5 text-sm text-gray-400">暂无会话，点击 + 创建</div>
          )}
        </div>

        <button
          onClick={handleCreateSession}
          disabled={isCreating || sessions.length >= MAX_SESSIONS}
          className={cn(
            'flex items-center justify-center border-l border-gray-200 px-3 py-2.5 text-gray-500 transition-colors hover:bg-gray-50 hover:text-primary-600 disabled:opacity-50 disabled:cursor-not-allowed',
            sessions.length >= MAX_SESSIONS && 'cursor-not-allowed opacity-50',
          )}
          title={sessions.length >= MAX_SESSIONS ? '已达会话上限 (50)' : '新建会话'}
        >
          {isCreating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed z-50 min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            onClick={() => handleDeleteSession(contextMenu.sessionId)}
          >
            <X className="h-4 w-4" />
            删除会话
          </button>
        </div>
      )}
    </div>
  );
}
