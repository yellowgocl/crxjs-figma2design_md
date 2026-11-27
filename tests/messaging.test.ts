import { describe, expect, it } from 'vitest';
import { AuthStatus, Request } from '@/src/messaging/protocol';

describe('message protocol', () => {
  it('rejects unknown messages', () => {
    expect(Request.safeParse({ type: 'evil' }).success).toBe(false);
  });
  it('rejects too-short tokens', () => {
    expect(Request.safeParse({ type: 'auth/connect', token: 'x', mode: 'session' }).success).toBe(false);
  });
  it('defaults unreachable to false', () => {
    expect(AuthStatus.parse({ connected: true, mode: 'remember', user: null }).unreachable).toBe(false);
  });
});
