import { describe, it, expect, beforeEach } from 'vitest';
import { useUserStore } from './userStore';

describe('userStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useUserStore.setState({ user: null });
  });

  it('starts with null user', () => {
    expect(useUserStore.getState().user).toBeNull();
  });

  it('setUser stores user in state and localStorage', () => {
    const user = { id: '1', name: 'Test', email: 'test@test.com', role: 'USER', plan: 'FREE' };
    useUserStore.getState().setUser(user);
    expect(useUserStore.getState().user).toEqual(user);
    expect(JSON.parse(localStorage.getItem('user')!)).toEqual(user);
  });

  it('clearUser removes user from state and localStorage', () => {
    const user = { id: '1', name: 'Test', email: 'test@test.com', role: 'USER', plan: 'FREE' };
    useUserStore.getState().setUser(user);
    useUserStore.getState().clearUser();
    expect(useUserStore.getState().user).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});
