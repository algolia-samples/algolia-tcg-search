import { vi, describe, test, expect, beforeEach } from 'vitest';
import { createRequest, createResponse } from 'node-mocks-http';

const mockCreate = vi.hoisted(() => vi.fn());
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: (...args) => mockCreate(...args) },
  })),
}));

const { default: handler } = await import('./extract.js');

function makeReqRes(body, method = 'POST') {
  return { req: createRequest({ method, body }), res: createResponse() };
}

function mockClaudeSuccess(name, number, set = null) {
  mockCreate.mockResolvedValue({
    content: [{ text: JSON.stringify({ name, number, set }) }],
  });
}

describe('POST /api/ocr/extract', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockReset();
  });

  test('returns 405 for non-POST', async () => {
    const { req, res } = makeReqRes({}, 'GET');
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  test('returns 400 when image is missing', async () => {
    const { req, res } = makeReqRes({});
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res._getJSONData()).toEqual({ error: 'Missing required field: image' });
  });

  test('returns 413 when image too large', async () => {
    const { req, res } = makeReqRes({ image: 'x'.repeat(10 * 1024 * 1024 + 1) });
    await handler(req, res);
    expect(res.statusCode).toBe(413);
    expect(res._getJSONData()).toEqual({ error: 'Image too large' });
  });

  test('returns 500 when API key not configured', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { req, res } = makeReqRes({ image: 'base64data' });
    await handler(req, res);
    expect(res.statusCode).toBe(500);
    expect(res._getJSONData()).toEqual({ error: 'OCR service not configured' });
  });

  test('returns name, number, set on success', async () => {
    mockClaudeSuccess('Pikachu', '25/102', 'Base Set');
    const { req, res } = makeReqRes({ image: 'base64data' });
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res._getJSONData()).toEqual({ name: 'Pikachu', number: '25/102', set: 'Base Set' });
  });

  test('returns null fields when Claude cannot identify card', async () => {
    mockClaudeSuccess(null, null, null);
    const { req, res } = makeReqRes({ image: 'base64data' });
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res._getJSONData()).toEqual({ name: null, number: null, set: null });
  });

  test('returns 500 when Claude returns non-JSON', async () => {
    mockCreate.mockResolvedValue({ content: [{ text: 'sorry, I cannot identify this card' }] });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { req, res } = makeReqRes({ image: 'base64data' });
    await handler(req, res);
    expect(res.statusCode).toBe(500);
    expect(res._getJSONData()).toEqual({ error: 'Card identification failed' });
    consoleSpy.mockRestore();
  });

  test('returns 500 on unexpected API error', async () => {
    mockCreate.mockRejectedValue(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { req, res } = makeReqRes({ image: 'base64data' });
    await handler(req, res);
    expect(res.statusCode).toBe(500);
    expect(res._getJSONData()).toEqual({ error: 'Internal server error' });
    consoleSpy.mockRestore();
  });

  test('sends image to Claude with correct model and media type', async () => {
    mockClaudeSuccess('Charizard', '4/102', 'Base Set');
    const { req, res } = makeReqRes({ image: 'abc123' });
    await handler(req, res);
    const call = mockCreate.mock.calls[0][0];
    expect(call.model).toBe('claude-haiku-4-5-20251001');
    const imageBlock = call.messages[0].content[0];
    expect(imageBlock.type).toBe('image');
    expect(imageBlock.source.type).toBe('base64');
    expect(imageBlock.source.media_type).toBe('image/jpeg');
    expect(imageBlock.source.data).toBe('abc123');
  });

  test('strips markdown fences from Claude response', async () => {
    mockCreate.mockResolvedValue({
      content: [{ text: '```json\n{"name":"Pikachu","number":"25/102","set":"Base Set"}\n```' }],
    });
    const { req, res } = makeReqRes({ image: 'base64data' });
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res._getJSONData()).toEqual({ name: 'Pikachu', number: '25/102', set: 'Base Set' });
  });
});
