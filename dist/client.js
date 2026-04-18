import { AgentMailboxError, BadRequestError, ConflictError, NotFoundError, UnauthorizedError, } from './errors.js';
export class AgentMailboxClient {
    /** The API key used for authenticated requests. Can be updated at any time. */
    apiKey;
    baseUrl;
    timeout;
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/$/, '');
        this.apiKey = options.apiKey;
        this.timeout = options.timeout ?? 30_000;
    }
    /** Convenience factory for constructing an authenticated client in one call. */
    static withApiKey(baseUrl, apiKey) {
        return new AgentMailboxClient({ baseUrl, apiKey });
    }
    // ---------------------------------------------------------------------------
    // Core HTTP plumbing
    // ---------------------------------------------------------------------------
    async request(method, path, body, authenticated = true) {
        const url = `${this.baseUrl}${path}`;
        const headers = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        };
        if (authenticated && this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        let response;
        try {
            response = await fetch(url, {
                method,
                headers,
                body: body !== undefined ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });
        }
        catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                throw new AgentMailboxError(`Request timed out after ${this.timeout}ms`, 408, 'TIMEOUT');
            }
            throw err;
        }
        finally {
            clearTimeout(timeoutId);
        }
        if (!response.ok) {
            let errorMessage;
            let errorCode;
            try {
                const errorBody = (await response.json());
                // API sends { error: { code, message } }; fall back to flat shapes
                const nested = typeof errorBody.error === 'object' ? errorBody.error : null;
                errorMessage =
                    errorBody.message ??
                        nested?.message ??
                        (typeof errorBody.error === 'string' ? errorBody.error : undefined) ??
                        response.statusText;
                errorCode = errorBody.code ?? nested?.code;
            }
            catch {
                errorMessage = response.statusText;
            }
            switch (response.status) {
                case 400:
                    throw new BadRequestError(errorMessage);
                case 401:
                    throw new UnauthorizedError(errorMessage);
                case 404:
                    throw new NotFoundError(errorMessage);
                case 409:
                    throw new ConflictError(errorMessage);
                default:
                    throw new AgentMailboxError(errorMessage, response.status, errorCode ?? 'SERVER_ERROR');
            }
        }
        // 204 No Content — return void-compatible empty value
        if (response.status === 204) {
            return undefined;
        }
        return response.json();
    }
    // ---------------------------------------------------------------------------
    // agents namespace
    // ---------------------------------------------------------------------------
    agents = {
        /**
         * Register a new agent with a DID.
         * Returns the email address and API key (shown once — store it securely).
         */
        register: (req) => this.request('POST', '/v1/agents/register', req, false),
        /** Fetch the authenticated agent's profile. */
        me: () => this.request('GET', '/v1/agents/me'),
        /** Deregister the authenticated agent and permanently delete all data. */
        delete: () => this.request('DELETE', '/v1/agents/me'),
    };
    // ---------------------------------------------------------------------------
    // apiKeys namespace
    // ---------------------------------------------------------------------------
    apiKeys = {
        /** List all API keys for the authenticated agent. */
        list: () => this.request('GET', '/v1/apikeys'),
        /** Create a new API key. Returns the raw key once — store it securely. */
        create: (req) => this.request('POST', '/v1/apikeys', req ?? {}),
        /** Revoke an API key by ID. */
        revoke: (keyId) => this.request('DELETE', `/v1/apikeys/${encodeURIComponent(keyId)}`),
    };
    // ---------------------------------------------------------------------------
    // auth namespace
    // ---------------------------------------------------------------------------
    auth = {
        /**
         * Request a challenge nonce for DID-based authentication.
         * Unauthenticated — does not require an API key.
         */
        challenge: (did) => this.request('POST', '/v1/auth/challenge', { did }, false),
        /**
         * Verify a signed challenge nonce and receive a bearer token.
         * Unauthenticated — does not require an API key.
         */
        verify: (req) => this.request('POST', '/v1/auth/verify', req, false),
    };
    // ---------------------------------------------------------------------------
    // mail namespace
    // ---------------------------------------------------------------------------
    mail = {
        /**
         * List messages in the agent's mailbox.
         * Supports optional filtering by mailboxId, limit, position cursor, and sort order.
         */
        list: (opts) => {
            const params = new URLSearchParams();
            if (opts?.mailboxId !== undefined)
                params.set('mailboxId', opts.mailboxId);
            if (opts?.limit !== undefined)
                params.set('limit', String(opts.limit));
            if (opts?.position !== undefined)
                params.set('position', String(opts.position));
            if (opts?.sort !== undefined)
                params.set('sort', opts.sort);
            const qs = params.toString();
            return this.request('GET', `/v1/mail${qs ? `?${qs}` : ''}`);
        },
        /** Fetch a single message including its full HTML/text body. */
        get: (id) => this.request('GET', `/v1/mail/${encodeURIComponent(id)}`),
        /** Send an email from the authenticated agent's address. */
        send: (req) => this.request('POST', '/v1/mail/send', req),
        /** Delete a message (moves it to Trash). */
        delete: (id) => this.request('DELETE', `/v1/mail/${encodeURIComponent(id)}`),
        /** Move a message to a different mailbox. */
        move: (id, mailboxId) => this.request('PATCH', `/v1/mail/${encodeURIComponent(id)}/move`, {
            mailboxId,
        }),
        /**
         * Update flags on a message.
         * Pass `seen: true` to mark as read, `flagged: true` to star, etc.
         */
        setFlags: (id, flags) => this.request('PATCH', `/v1/mail/${encodeURIComponent(id)}/flags`, flags),
    };
    // ---------------------------------------------------------------------------
    // mailboxes namespace
    // ---------------------------------------------------------------------------
    mailboxes = {
        /** List all mailboxes (folders) for the authenticated agent. */
        list: () => this.request('GET', '/v1/mailboxes'),
        /** Create a new mailbox (folder), optionally nested under a parent. */
        create: (req) => this.request('POST', '/v1/mailboxes', req),
        /** Permanently delete a mailbox and all messages it contains. */
        delete: (id) => this.request('DELETE', `/v1/mailboxes/${encodeURIComponent(id)}`),
        /** Rename an existing mailbox. */
        rename: (id, name) => this.request('PATCH', `/v1/mailboxes/${encodeURIComponent(id)}`, {
            name,
        }),
    };
    // ---------------------------------------------------------------------------
    // billing namespace
    // ---------------------------------------------------------------------------
    billing = {
        /**
         * Get the agent's balance, deposit addresses, and pricing.
         * Creates deposit addresses on first call if billing is configured.
         */
        get: () => this.request('GET', '/v1/billing'),
        /**
         * List balance transactions (deposits and deductions), newest first.
         */
        transactions: (opts) => {
            const params = new URLSearchParams();
            if (opts?.limit !== undefined)
                params.set('limit', String(opts.limit));
            if (opts?.offset !== undefined)
                params.set('offset', String(opts.offset));
            const qs = params.toString();
            return this.request('GET', `/v1/billing/transactions${qs ? `?${qs}` : ''}`);
        },
    };
    // ---------------------------------------------------------------------------
    // health namespace
    // ---------------------------------------------------------------------------
    health = {
        /**
         * Liveness check — returns 200 when the service is running.
         * Does not require authentication.
         */
        check: () => this.request('GET', '/health', undefined, false),
        /**
         * Readiness check — returns 200 when all dependencies are healthy.
         * Does not require authentication.
         */
        ready: () => this.request('GET', '/health/ready', undefined, false),
    };
}
//# sourceMappingURL=client.js.map