import { describe, expect, it } from 'vitest';
import { Request } from '@/src/messaging/protocol';

describe('message protocol', () => {
  it('rejects unknown messages', () => {
    expect(Request.safeParse({ type: 'evil' }).success).toBe(false);
  });
  it('rejects too-short tokens', () => {
    expect(Request.safeParse({ type: 'auth/connect', token: 'x', mode: 'session' }).success).toBe(false);
  });
});
