const handler = require('../api/proxy-audio.js');

describe('proxy-audio handler', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      delete global.fetch;
    }
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  function createResponse() {
    const res = {
      statusCode: null,
      headers: {},
      setHeader: jest.fn((key, value) => {
        res.headers[key] = value;
      }),
      end: jest.fn()
    };
    return res;
  }

  test('handles HEAD checks by retrying with GET when upstream blocks the method', async () => {
    const headResponse = {
      ok: false,
      status: 405,
      headers: { get: () => null },
      body: null
    };

    const getResponse = {
      ok: true,
      status: 200,
      headers: { get: key => (key === 'content-type' ? 'audio/mpeg' : null) },
      arrayBuffer: () => Promise.resolve(Buffer.alloc(0)),
      body: null
    };

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(headResponse)
      .mockResolvedValueOnce(getResponse);

    const res = createResponse();

    await handler(
      {
        method: 'HEAD',
        query: { url: 'https://cdn1.suno.ai/example.mp3' },
        headers: {}
      },
      res
    );

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        method: 'HEAD',
        headers: {},
        signal: expect.any(AbortSignal)
      })
    );
    expect(global.fetch.mock.calls[1][1]).toEqual(
      expect.objectContaining({ headers: {}, signal: expect.any(AbortSignal) })
    );
    expect(res.statusCode).toBe(200);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'audio/mpeg');
    expect(res.end).toHaveBeenCalled();
    // No audio body should be streamed for HEAD requests.
    expect(res.end).toHaveBeenCalledWith();
  });
});
