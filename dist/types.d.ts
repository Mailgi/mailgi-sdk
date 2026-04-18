export interface RegisterAgentRequest {
    did?: string;
    label?: string;
}
export interface RegisterAgentResponse {
    agentId: string;
    did?: string;
    emailAddress: string;
    aliasAddress: string;
    apiKey: string;
    apiKeyId: string;
}
export interface Agent {
    agentId: string;
    did?: string;
    emailAddress: string;
    aliasAddress: string;
    label: string;
    createdAt: string;
}
export interface ApiKey {
    id: string;
    keyPrefix: string;
    label: string;
    createdAt: string;
    lastUsedAt: string | null;
    expiresAt: string | null;
    revokedAt: string | null;
}
export interface CreateApiKeyRequest {
    label?: string;
    expiresAt?: string;
}
export interface CreateApiKeyResponse extends ApiKey {
    apiKey: string;
    apiKeyId: string;
}
export interface ChallengeResponse {
    nonce: string;
    expiresAt: string;
}
export interface VerifyRequest {
    did: string;
    nonce: string;
    signature: string;
}
export interface VerifyResponse {
    token: string;
    expiresIn: number;
}
export interface EmailAddress {
    name?: string;
    email: string;
}
export interface Email {
    id: string;
    subject: string;
    from: EmailAddress[];
    to: EmailAddress[];
    cc: EmailAddress[];
    bcc: EmailAddress[];
    receivedAt: string;
    size: number;
    preview: string;
    seen: boolean;
    mailboxIds: Record<string, boolean>;
    keywords: Record<string, boolean>;
}
export interface JmapBodyPart {
    partId?: string;
    blobId?: string;
    size?: number;
    type?: string;
    charset?: string;
}
export interface JmapBodyValue {
    value: string;
    isEncodingProblem?: boolean;
    isTruncated?: boolean;
}
export interface EmailWithBody extends Email {
    htmlBody?: string | JmapBodyPart[];
    textBody?: string | JmapBodyPart[];
    /** JMAP body part map: partId → body value */
    bodyValues?: Record<string, JmapBodyValue>;
}
export interface ListMailOptions {
    mailboxId?: string;
    limit?: number;
    position?: number;
    sort?: 'asc' | 'desc';
}
export interface ListMailResponse {
    messages: Email[];
    total: number;
    position: number;
}
export interface SendMailRequest {
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    textBody?: string;
    htmlBody?: string;
    replyTo?: string;
}
export interface SendMailResponse {
    messageId: string;
}
export interface Mailbox {
    id: string;
    name: string;
    parentId: string | null;
    role: string | null;
    totalEmails: number;
    unreadEmails: number;
}
export interface CreateMailboxRequest {
    name: string;
    parentId?: string;
}
export interface DepositAddresses {
    evm: string;
    solana: string;
}
export interface BillingInfo {
    balanceUsd: number;
    depositAddresses: DepositAddresses | null;
    pricePerExternalEmail: number;
    acceptedToken: string;
    networks: {
        evm: string[];
        solana: string[];
    };
}
export interface BalanceTransaction {
    id: string;
    type: 'deposit' | 'deduction';
    amountUsd: number;
    txHash: string | null;
    chain: string | null;
    emailCount: number | null;
    createdAt: string;
}
export interface ListTransactionsOptions {
    limit?: number;
    offset?: number;
}
export interface ListTransactionsResponse {
    transactions: BalanceTransaction[];
    total: number;
    limit: number;
    offset: number;
}
export interface HealthResponse {
    status: 'ok' | 'degraded';
    checks?: {
        database: 'ok' | 'error';
        stalwart: 'ok' | 'error';
    };
}
//# sourceMappingURL=types.d.ts.map