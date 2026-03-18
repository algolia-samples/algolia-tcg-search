import { vi, describe, test, expect, beforeEach } from 'vitest';
import { createRequest, createResponse } from 'node-mocks-http';
import { parseCardNumber, parsePokemonName, default as handler } from './extract.js';

// --- parseCardNumber ---

describe('parseCardNumber', () => {
  test('parses standard format', () => {
    expect(parseCardNumber('Pikachu\n25/102\n')).toBe('25/102');
  });

  test('parses three-digit set number', () => {
    expect(parseCardNumber('Charizard\n4/106\nSome text\n156/167\n')).toBe('156/167');
  });

  test('takes the last match (card number is at the bottom)', () => {
    // HP "120" could be confused with a number early in the text
    expect(parseCardNumber('Revavroom ex\n280\n155/182\nillus.\n')).toBe('155/182');
  });

  test('parses trainer gallery format TG##/TG##', () => {
    expect(parseCardNumber('Pikachu\nTG01/TG30\n')).toBe('TG01/TG30');
  });

  test('returns null when no card number present', () => {
    expect(parseCardNumber('Some text without a card number')).toBeNull();
  });

  test('returns null for empty string', () => {
    expect(parseCardNumber('')).toBeNull();
  });

  test('handles number embedded in surrounding noise (takes up to 3 digits before slash)', () => {
    // regex matches \d{1,3} before the slash — "3104" yields "104/182"
    expect(parseCardNumber('VX3104/182\n')).toBe('104/182');
  });
});

// --- parsePokemonName ---

describe('parsePokemonName', () => {
  test('returns the first valid name line', () => {
    expect(parsePokemonName('Pikachu\n70HP\n25/102\n')).toBe('Pikachu');
  });

  test('strips STAGE prefix inline (e.g. "STAGE1 Parasect")', () => {
    expect(parsePokemonName('STAGE1 Parasect\n80HP\n')).toBe('Parasect');
  });

  test('strips VMAX prefix', () => {
    expect(parsePokemonName('VMAX Regieleki\n320HP\n')).toBe('Regieleki');
  });

  test('strips trailing HP digits', () => {
    // OCR sometimes concatenates name and HP: "Revavroom ex280"
    expect(parsePokemonName('Revavroom ex280\n')).toBe('Revavroom ex');
  });

  test('skips "Evolves from" lines', () => {
    expect(parsePokemonName('Evolves from Paras\nParasect\n')).toBe('Parasect');
  });

  test('skips "Ability" lines', () => {
    expect(parsePokemonName('Ability: Static\nAmpharos\n')).toBe('Ampharos');
  });

  test('rejects short tokens (< 4 chars)', () => {
    // "TM" appears in Ampharos OCR — must be skipped
    expect(parsePokemonName('TM\nAmpharos\n')).toBe('Ampharos');
  });

  test('rejects lines that still contain digits after stripping', () => {
    expect(parsePokemonName('L60\nPikachu\n')).toBe('Pikachu');
  });

  test('returns null when no valid name found', () => {
    expect(parsePokemonName('120\n80\n25/102\n')).toBeNull();
  });

  test('returns null for empty string', () => {
    expect(parsePokemonName('')).toBeNull();
  });

  test('handles Regieleki VMAX with VX noise before card number', () => {
    const ocr = 'VMAX Regieleki\n320HP\nVX3104\nVSTAR\n60/172\n';
    expect(parsePokemonName(ocr)).toBe('Regieleki');
  });
});

// --- handler ---

describe('POST /api/ocr/extract', () => {
  beforeEach(() => {
    process.env.GOOGLE_CLOUD_VISION_API_KEY = 'test-gcv-key';
    vi.stubGlobal('fetch', vi.fn());
  });

  function makeReqRes(body, method = 'POST') {
    return { req: createRequest({ method, body }), res: createResponse() };
  }

  function mockGcvSuccess(text) {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        responses: [{ fullTextAnnotation: { text } }],
      }),
    });
  }

  test('returns 405 for non-POST requests', async () => {
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

  test('returns 500 when API key is not configured', async () => {
    delete process.env.GOOGLE_CLOUD_VISION_API_KEY;
    const { req, res } = makeReqRes({ image: 'base64data' });
    await handler(req, res);
    expect(res.statusCode).toBe(500);
    expect(res._getJSONData()).toEqual({ error: 'OCR service not configured' });
  });

  test('returns 500 when GCV responds with an error', async () => {
    fetch.mockResolvedValue({ ok: false, status: 403, text: async () => 'Forbidden' });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { req, res } = makeReqRes({ image: 'base64data' });
    await handler(req, res);
    expect(res.statusCode).toBe(500);
    expect(res._getJSONData()).toEqual({ error: 'OCR request failed' });
    consoleSpy.mockRestore();
  });

  test('returns 500 on unexpected fetch error', async () => {
    fetch.mockRejectedValue(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { req, res } = makeReqRes({ image: 'base64data' });
    await handler(req, res);
    expect(res.statusCode).toBe(500);
    expect(res._getJSONData()).toEqual({ error: 'Internal server error' });
    consoleSpy.mockRestore();
  });

  test('returns parsed name and number on success', async () => {
    mockGcvSuccess('Pikachu\n70HP\n25/102\n');
    const { req, res } = makeReqRes({ image: 'base64data' });
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    const data = res._getJSONData();
    expect(data.parsed_name).toBe('Pikachu');
    expect(data.parsed_number).toBe('25/102');
    expect(data.text).toBe('Pikachu\n70HP\n25/102\n');
  });

  test('returns null fields when OCR text has no recognizable card data', async () => {
    mockGcvSuccess('');
    const { req, res } = makeReqRes({ image: 'base64data' });
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    const data = res._getJSONData();
    expect(data.parsed_name).toBeNull();
    expect(data.parsed_number).toBeNull();
  });

  test('sends image to GCV as DOCUMENT_TEXT_DETECTION', async () => {
    mockGcvSuccess('Pikachu\n25/102\n');
    const { req, res } = makeReqRes({ image: 'abc123' });
    await handler(req, res);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain('vision.googleapis.com');
    const body = JSON.parse(options.body);
    expect(body.requests[0].features[0].type).toBe('DOCUMENT_TEXT_DETECTION');
    expect(body.requests[0].image.content).toBe('abc123');
  });
});
