import { describe, expect, it, beforeEach } from 'vitest';
import api from './index';

describe('API client', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('uses an API base URL ending in the API path', () => {
    expect(api.defaults.baseURL).toMatch(/\/api$/);
  });

  it('adds the stored auth token to requests', () => {
    localStorage.setItem('buildwise_token', 'test-token');
    const interceptor = api.interceptors.request.handlers[0].fulfilled;
    const config = interceptor({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer test-token');
  });
});
