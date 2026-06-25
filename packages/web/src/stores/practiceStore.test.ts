import { describe, it, expect, beforeEach } from 'vitest';
import { usePracticeStore } from './practiceStore';

describe('practiceStore', () => {
  beforeEach(() => {
    usePracticeStore.setState({ session: null, summary: null, error: null });
  });

  it('starts with null session', () => {
    expect(usePracticeStore.getState().session).toBeNull();
  });

  it('setSession stores session', () => {
    const session = {
      id: 'test-1',
      mode: 'scenario' as const,
      messages: [],
      round: 1,
      maxRounds: 5,
      customerEmotion: 'interest' as const,
      state: 'practicing' as const,
      startedAt: Date.now(),
    };
    usePracticeStore.getState().setSession(session);
    expect(usePracticeStore.getState().session?.id).toBe('test-1');
  });

  it('addMessage appends to session messages', () => {
    const session = {
      id: 'test-1',
      mode: 'scenario' as const,
      messages: [],
      round: 1,
      maxRounds: 5,
      customerEmotion: 'interest' as const,
      state: 'practicing' as const,
      startedAt: Date.now(),
    };
    usePracticeStore.getState().setSession(session);
    usePracticeStore.getState().addMessage({
      id: 'msg-1',
      role: 'user',
      content: 'Hello',
      timestamp: Date.now(),
    });
    expect(usePracticeStore.getState().session?.messages).toHaveLength(1);
    expect(usePracticeStore.getState().session?.messages[0].content).toBe('Hello');
  });

  it('incrementRound increases round', () => {
    const session = {
      id: 'test-1',
      mode: 'scenario' as const,
      messages: [],
      round: 1,
      maxRounds: 5,
      customerEmotion: 'interest' as const,
      state: 'practicing' as const,
      startedAt: Date.now(),
    };
    usePracticeStore.getState().setSession(session);
    usePracticeStore.getState().incrementRound();
    expect(usePracticeStore.getState().session?.round).toBe(2);
  });

  it('resetPractice clears all state', () => {
    usePracticeStore.getState().setSummary({
      sessionId: 'test-1',
      totalScore: 85,
      strengths: ['Good'],
      improvements: ['Better'],
      recommendations: ['Practice'],
      radarScores: {},
    });
    usePracticeStore.getState().resetPractice();
    expect(usePracticeStore.getState().session).toBeNull();
    expect(usePracticeStore.getState().summary).toBeNull();
  });
});
