import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentMailboxClient } from '../src/client.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../src/errors.js';
import type {
  Agent,
  Email,
  ListMailResponse,
  RegisterAgentResponse,
} from '../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFetch(status: number, body: unknown): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: () => Promise.resolve(body),
  } as unknown as Response);
}

function makeClient(apiKey = 'test-api-key'): AgentMailboxClient {
  return new AgentMailboxClient({
    baseUrl: 'https://api.agentmailbox.io',
    apiKey,
    timeout: 5_000,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AgentMailboxClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // -------------------------------------------------------------------------
  // 1. agents.register — sends correct request and returns response
  // -------------------------------------------------------------------------

  describe('agents.register', () => {
    it('sends a POST to /v1/agents/register without an auth header and returns the parsed response', async () => {
      const expected: RegisterAgentResponse = {
        agentId: 'agent-123',
        did: 'did:key:z6Mk',
        emailAddress: 'agent-123@agentmailbox.io',
        apiKey: 'sk_raw_once',
        apiKeyId: 'key-abc',
        imapHost: 'imap.agentmailbox.io',
        imapPort: 993,
        smtpHost: 'smtp.agentmailbox.io',
        smtpPort: 587,
      };

      vi.stubGlobal('fetch', makeFetch(201, expected));

      const client = makeClient('');
      const result = await client.agents.register({
        did: 'did:key:z6Mk',
        label: 'My Agent',
      });

      expect(result).toEqual(expected);

      const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
        string,
        RequestInit,
      ];

      expect(url).toBe('https://api.agentmailbox.io/v1/agents/register');
      expect(init.method).toBe('POST');

      const body = JSON.parse(init.body as string);
      expect(body).toEqual({ did: 'did:key:z6Mk', label: 'My Agent' });

      // Register is unauthenticated — no Authorization header expected
      const headers = init.headers as Record<string, string>;
      expect(headers['Authorization']).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 2. mail.list — sends Authorization header
  // -------------------------------------------------------------------------

  describe('mail.list', () => {
    it('includes the Authorization header and maps query params', async () => {
      const responseBody: ListMailResponse = {
        messages: [] as Email[],
        total: 0,
        position: 0,
      };

      vi.stubGlobal('fetch', makeFetch(200, responseBody));

      const client = makeClient('my-api-key');
      const result = await client.mail.list({
        mailboxId: 'inbox',
        limit: 10,
        sort: 'desc',
      });

      expect(result).toEqual(responseBody);

      const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
        string,
        RequestInit,
      ];

      expect(url).toBe(
        'https://api.agentmailbox.io/v1/mail?mailboxId=inbox&limit=10&sort=desc',
      );
      expect(init.method).toBe('GET');

      const headers = init.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer my-api-key');
    });

    it('omits query string when no options are provided', async () => {
      vi.stubGlobal(
        'fetch',
        makeFetch(200, { messages: [], total: 0, position: 0 }),
      );

      const client = makeClient();
      await client.mail.list();

      const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
      expect(url).toBe('https://api.agentmailbox.io/v1/mail');
    });
  });

  // -------------------------------------------------------------------------
  // 3a. Error handling — 404 throws NotFoundError
  // -------------------------------------------------------------------------

  describe('error handling', () => {
    it('throws NotFoundError for a 404 response', async () => {
      vi.stubGlobal(
        'fetch',
        makeFetch(404, { message: 'Message not found', code: 'NOT_FOUND' }),
      );

      const client = makeClient();
      await expect(client.mail.get('non-existent-id')).rejects.toThrow(
        NotFoundError,
      );

      await expect(client.mail.get('non-existent-id')).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });

    // -----------------------------------------------------------------------
    // 3b. Error handling — 401 throws UnauthorizedError
    // -----------------------------------------------------------------------

    it('throws UnauthorizedError for a 401 response', async () => {
      vi.stubGlobal(
        'fetch',
        makeFetch(401, { message: 'Invalid API key', code: 'UNAUTHORIZED' }),
      );

      const client = makeClient('bad-key');
      await expect(client.agents.me()).rejects.toThrow(UnauthorizedError);

      await expect(client.agents.me()).rejects.toMatchObject({
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });
    });

    it('throws BadRequestError for a 400 response', async () => {
      vi.stubGlobal(
        'fetch',
        makeFetch(400, { message: 'Missing required field: did' }),
      );

      const client = makeClient();
      // @ts-expect-error — intentionally passing invalid request to test error path
      await expect(client.agents.register({})).rejects.toThrow(BadRequestError);
    });

    it('throws ConflictError for a 409 response', async () => {
      vi.stubGlobal(
        'fetch',
        makeFetch(409, { message: 'DID already registered' }),
      );

      const client = makeClient();
      await expect(
        client.agents.register({ did: 'did:key:duplicate' }),
      ).rejects.toThrow(ConflictError);
    });

    it('includes the server error message in the thrown error', async () => {
      vi.stubGlobal(
        'fetch',
        makeFetch(404, { message: 'Mailbox "archive" does not exist' }),
      );

      const client = makeClient();
      await expect(client.mailboxes.delete('archive')).rejects.toThrow(
        'Mailbox "archive" does not exist',
      );
    });

    it('falls back to statusText when response body is not valid JSON', async () => {
      vi.stubGlobal('fetch', () =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.reject(new SyntaxError('Unexpected token')),
        } as unknown as Response),
      );

      const client = makeClient();
      await expect(client.agents.me()).rejects.toMatchObject({
        statusCode: 500,
        message: 'Internal Server Error',
      });
    });
  });

  // -------------------------------------------------------------------------
  // 4. Timeout — AbortController is invoked
  // -------------------------------------------------------------------------

  describe('timeout', () => {
    it('throws an AgentMailboxError with code TIMEOUT when the request exceeds the timeout', async () => {
      // Simulate a fetch that never resolves until the signal is aborted
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((_url: string, init: RequestInit) => {
          return new Promise<Response>((_resolve, reject) => {
            init.signal!.addEventListener('abort', () => {
              const err = new DOMException('The operation was aborted.', 'AbortError');
              reject(err);
            });
          });
        }),
      );

      // Use a 1 ms timeout so the abort fires immediately
      const client = new AgentMailboxClient({
        baseUrl: 'https://api.agentmailbox.io',
        apiKey: 'key',
        timeout: 1,
      });

      await expect(client.agents.me()).rejects.toMatchObject({
        code: 'TIMEOUT',
        statusCode: 408,
      });
    });
  });

  // -------------------------------------------------------------------------
  // AgentMailboxClient.withApiKey factory
  // -------------------------------------------------------------------------

  describe('AgentMailboxClient.withApiKey', () => {
    it('constructs a client with the given apiKey set', async () => {
      const agentProfile: Agent = {
        agentId: 'agent-42',
        did: 'did:key:z6Mk42',
        emailAddress: 'agent-42@agentmailbox.io',
        label: 'Test Agent',
        imapHost: 'imap.agentmailbox.io',
        imapPort: 993,
        smtpHost: 'smtp.agentmailbox.io',
        smtpPort: 587,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      vi.stubGlobal('fetch', makeFetch(200, agentProfile));

      const client = AgentMailboxClient.withApiKey(
        'https://api.agentmailbox.io',
        'factory-key',
      );

      const result = await client.agents.me();
      expect(result).toEqual(agentProfile);

      const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
        string,
        RequestInit,
      ];
      const headers = init.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer factory-key');
    });
  });

  // -------------------------------------------------------------------------
  // 204 No Content
  // -------------------------------------------------------------------------

  describe('204 No Content responses', () => {
    it('returns undefined for DELETE /v1/agents/me', async () => {
      vi.stubGlobal('fetch', () =>
        Promise.resolve({
          ok: true,
          status: 204,
          statusText: 'No Content',
          json: () => Promise.reject(new Error('No body')),
        } as unknown as Response),
      );

      const client = makeClient();
      const result = await client.agents.delete();
      expect(result).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Trailing slash normalization
  // -------------------------------------------------------------------------

  describe('baseUrl normalization', () => {
    it('strips a trailing slash from baseUrl', async () => {
      vi.stubGlobal('fetch', makeFetch(200, { status: 'ok' }));

      const client = new AgentMailboxClient({
        baseUrl: 'https://api.agentmailbox.io/',
        timeout: 5_000,
      });

      await client.health.check();

      const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
      expect(url).toBe('https://api.agentmailbox.io/health');
    });
  });
});
