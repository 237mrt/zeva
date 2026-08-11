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
});
