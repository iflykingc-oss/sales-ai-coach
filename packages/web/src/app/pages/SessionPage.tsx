import { useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSessionStore } from '@/stores/sessionStore';
import { useScriptStore } from '@/stores/scriptStore';
import type { InputType, GenerateScriptOutput } from '@sales-ai-coach/shared';
import type { Session as SessionType } from '@sales-ai-coach/shared';
import SessionTabBar from '@/components/session/SessionTabBar';
import MessageList from '@/components/session/MessageList';
import InputBar from '@/components/session/InputBar';
import ScriptDisplay from '@/components/script/ScriptDisplay';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import { useActivityStore } from '@/stores/activityStore';
import { generateScript } from '@/services/scriptService';
import { api } from '@/services/api';

export default function SessionPage() {
  const { setSessions, activeSessionId, setActiveSessionId } = useSessionStore();
  const { setCurrentScript, setGeneratedScriptIds, reset: resetScript } = useScriptStore();
  const { addActivity } = useActivityStore();

  // Fetch sessions on mount
  const { data: sessionsData } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await fetch('/api/sessions', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch sessions');
      const json = await res.json();
      return json.data as SessionType[];
    },
  });

  // Sync sessions from API to store
  useEffect(() => {
    if (sessionsData && sessionsData.length > 0) {
      setSessions(sessionsData);
      // Restore active session from cache or select first
      if (!activeSessionId) {
        setActiveSessionId(sessionsData[0].id);
      }
    }
  }, [sessionsData, setSessions, activeSessionId, setActiveSessionId]);

  // Auto-create first session if none exists
  useEffect(() => {
    if (sessionsData && sessionsData.length === 0 && !activeSessionId) {
      api.post('/sessions', { name: '新对话', industry: null, tags: [] })
        .then((res: any) => {
          if (res.data?.id) {
            setSessions([res.data]);
            setActiveSessionId(res.data.id);
          }
        })
        .catch(console.error);
    }
  }, [sessionsData, activeSessionId, setSessions, setActiveSessionId]);

  // Reset script state when switching sessions
  useEffect(() => {
    resetScript();
  }, [activeSessionId, resetScript]);

  const handleSend = useCallback(
    async (input: string, inputType: InputType, formData?: Record<string, string>) => {
      if (!activeSessionId) return;
      if (useScriptStore.getState().isGenerating) return; // Prevent double-submit

      useScriptStore.setState({ isGenerating: true, error: null });

      try {
        // Add optimistic user message
        const userMsg = {
          id: `opt-${Date.now()}`,
          sessionId: activeSessionId,
          role: 'USER' as const,
          content: input,
          inputType,
          createdAt: new Date().toISOString(),
        };
        (window as any).__messageListAppend?.(userMsg);

        // Use shared script service
        const result = await generateScript({
          sessionId: activeSessionId,
          content: input,
          inputType,
          industry: formData?.industry,
        });

        if (result?.success && result?.data) {
          const data = result.data as GenerateScriptOutput;
          setCurrentScript(data as any);
          setGeneratedScriptIds(result.scriptIds || []);
          addActivity({
            type: 'script_generate',
            title: '话术生成',
            description: input.slice(0, 50) + (input.length > 50 ? '...' : ''),
          });

          // Add assistant message
          const assistantMsg = {
            id: `assistant-${Date.now()}`,
            sessionId: activeSessionId,
            role: 'ASSISTANT' as const,
            content: `已为您生成 3 种风格的话术：\n- ${data.speechStyles.map((s) => s.style).join('\n- ')}`,
            inputType: 'TEXT' as InputType,
            createdAt: new Date().toISOString(),
          };
          (window as any).__messageListAppend?.(assistantMsg);
        }
      } catch (err) {
        useScriptStore.setState({
          error: err instanceof Error ? err.message : '生成失败，请重试',
        });
      } finally {
        useScriptStore.setState({ isGenerating: false });
      }
    },
    [activeSessionId, setCurrentScript, setGeneratedScriptIds],
  );

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* Session Tab Bar */}
      <SessionTabBar />

      {/* Main content: Message list */}
      <div className="min-h-0 flex-1">
        <MessageList onSend={handleSend} />
      </div>

      {/* Script display (shown after generation) */}
      <ScriptDisplay />

      {/* Input bar */}
      <InputBar onSend={handleSend} />

      {/* Activity feed sidebar */}
      <div className="border-t border-gray-200 bg-white p-3">
        <ActivityFeed />
      </div>
    </div>
  );
}
