import type { Agent, ApiKey, BillingInfo, ListTransactionsOptions, ListTransactionsResponse, ChallengeResponse, CreateApiKeyRequest, CreateApiKeyResponse, CreateMailboxRequest, Email, EmailWithBody, HealthResponse, ListMailOptions, ListMailResponse, Mailbox, RegisterAgentRequest, RegisterAgentResponse, SendMailRequest, SendMailResponse, VerifyRequest, VerifyResponse } from './types.js';
export interface ClientOptions {
    baseUrl: string;
    /** Optional at construction; can be set later via `client.apiKey`. */
    apiKey?: string;
    /** Request timeout in milliseconds. Defaults to 30000 (30s). */
    timeout?: number;
}
export declare class AgentMailboxClient {
    /** The API key used for authenticated requests. Can be updated at any time. */
    apiKey: string | undefined;
    private readonly baseUrl;
    private readonly timeout;
    constructor(options: ClientOptions);
    /** Convenience factory for constructing an authenticated client in one call. */
    static withApiKey(baseUrl: string, apiKey: string): AgentMailboxClient;
    private request;
    readonly agents: {
        /**
         * Register a new agent with a DID.
         * Returns the email address and API key (shown once — store it securely).
         */
        register: (req: RegisterAgentRequest) => Promise<RegisterAgentResponse>;
        /** Fetch the authenticated agent's profile. */
        me: () => Promise<Agent>;
        /** Deregister the authenticated agent and permanently delete all data. */
        delete: () => Promise<void>;
    };
    readonly apiKeys: {
        /** List all API keys for the authenticated agent. */
        list: () => Promise<ApiKey[]>;
        /** Create a new API key. Returns the raw key once — store it securely. */
        create: (req?: CreateApiKeyRequest) => Promise<CreateApiKeyResponse>;
        /** Revoke an API key by ID. */
        revoke: (keyId: string) => Promise<void>;
    };
    readonly auth: {
        /**
         * Request a challenge nonce for DID-based authentication.
         * Unauthenticated — does not require an API key.
         */
        challenge: (did: string) => Promise<ChallengeResponse>;
        /**
         * Verify a signed challenge nonce and receive a bearer token.
         * Unauthenticated — does not require an API key.
         */
        verify: (req: VerifyRequest) => Promise<VerifyResponse>;
    };
    readonly mail: {
        /**
         * List messages in the agent's mailbox.
         * Supports optional filtering by mailboxId, limit, position cursor, and sort order.
         */
        list: (opts?: ListMailOptions) => Promise<ListMailResponse>;
        /** Fetch a single message including its full HTML/text body. */
        get: (id: string) => Promise<EmailWithBody>;
        /** Send an email from the authenticated agent's address. */
        send: (req: SendMailRequest) => Promise<SendMailResponse>;
        /** Delete a message (moves it to Trash). */
        delete: (id: string) => Promise<void>;
        /** Move a message to a different mailbox. */
        move: (id: string, mailboxId: string) => Promise<void>;
        /**
         * Update flags on a message.
         * Pass `seen: true` to mark as read, `flagged: true` to star, etc.
         */
        setFlags: (id: string, flags: {
            seen?: boolean;
            flagged?: boolean;
        }) => Promise<void>;
    };
    readonly mailboxes: {
        /** List all mailboxes (folders) for the authenticated agent. */
        list: () => Promise<Mailbox[]>;
        /** Create a new mailbox (folder), optionally nested under a parent. */
        create: (req: CreateMailboxRequest) => Promise<Mailbox>;
        /** Permanently delete a mailbox and all messages it contains. */
        delete: (id: string) => Promise<void>;
        /** Rename an existing mailbox. */
        rename: (id: string, name: string) => Promise<void>;
    };
    readonly billing: {
        /**
         * Get the agent's balance, deposit addresses, and pricing.
         * Creates deposit addresses on first call if billing is configured.
         */
        get: () => Promise<BillingInfo>;
        /**
         * List balance transactions (deposits and deductions), newest first.
         */
        transactions: (opts?: ListTransactionsOptions) => Promise<ListTransactionsResponse>;
    };
    readonly health: {
        /**
         * Liveness check — returns 200 when the service is running.
         * Does not require authentication.
         */
        check: () => Promise<HealthResponse>;
        /**
         * Readiness check — returns 200 when all dependencies are healthy.
         * Does not require authentication.
         */
        ready: () => Promise<HealthResponse>;
    };
    readonly _types: {
        Agent: Agent;
        ApiKey: ApiKey;
        Email: Email;
        EmailWithBody: EmailWithBody;
        Mailbox: Mailbox;
    };
}
//# sourceMappingURL=client.d.ts.map