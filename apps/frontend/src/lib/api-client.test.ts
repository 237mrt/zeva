import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from './api-client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('ApiClient', () => {
  let fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    apiClient.setAccessToken(null);
    vi.unstubAllGlobals();
  });

  it('geçersiz JSON cevabını kontrollü API hatasına çevirir', async () => {
    fetchMock.mockResolvedValue(new Response('{invalid-json', { status: 502 }));

    await expect(apiClient.request('/health')).rejects.toMatchObject({
      name: 'ApiError',
      code: 'INVALID_API_RESPONSE',
      statusCode: 502,
    });
  });

  it('API sözleşmesine uymayan cevabı kontrollü API hatasına çevirir', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: 'ok' }));

    await expect(apiClient.request('/health')).rejects.toMatchObject({
      name: 'ApiError',
      code: 'INVALID_API_RESPONSE',
      statusCode: 200,
    });
  });

  it('body bulunmayan isteğe Content-Type eklemez', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: { status: 'ok' } }));

    await apiClient.request('/health');

    const requestOptions = fetchMock.mock.calls[0]?.[1];
    const headers = new Headers(requestOptions?.headers);

    expect(headers.get('Accept')).toBe('application/json');
    expect(headers.has('Content-Type')).toBe(false);
    expect(requestOptions?.credentials).toBe('include');
  });

  it('JSON body bulunan isteğe Content-Type ekler', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: { id: '1' } }));

    await apiClient.request('/items', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    });

    const requestOptions = fetchMock.mock.calls[0]?.[1];
    const headers = new Headers(requestOptions?.headers);

    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('memory içindeki access tokenı Bearer header olarak gönderir', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: { id: '1' } }));
    apiClient.setAccessToken('access-token');

    await apiClient.request('/auth/me');

    const requestOptions = fetchMock.mock.calls[0]?.[1];
    const headers = new Headers(requestOptions?.headers);

    expect(headers.get('Authorization')).toBe('Bearer access-token');
  });
});
