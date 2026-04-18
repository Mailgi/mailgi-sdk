export declare class AgentMailboxError extends Error {
    readonly statusCode: number;
    readonly code: string;
    constructor(message: string, statusCode: number, code: string);
}
export declare class NotFoundError extends AgentMailboxError {
    constructor(message?: string);
}
export declare class UnauthorizedError extends AgentMailboxError {
    constructor(message?: string);
}
export declare class ConflictError extends AgentMailboxError {
    constructor(message?: string);
}
export declare class BadRequestError extends AgentMailboxError {
    constructor(message?: string);
}
//# sourceMappingURL=errors.d.ts.map