export class AgentMailboxError extends Error {
    statusCode;
    code;
    constructor(message, statusCode, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AgentMailboxError';
    }
}
export class NotFoundError extends AgentMailboxError {
    constructor(message = 'Not found') {
        super(message, 404, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}
export class UnauthorizedError extends AgentMailboxError {
    constructor(message = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
        this.name = 'UnauthorizedError';
    }
}
export class ConflictError extends AgentMailboxError {
    constructor(message = 'Conflict') {
        super(message, 409, 'CONFLICT');
        this.name = 'ConflictError';
    }
}
export class BadRequestError extends AgentMailboxError {
    constructor(message = 'Bad request') {
        super(message, 400, 'BAD_REQUEST');
        this.name = 'BadRequestError';
    }
}
//# sourceMappingURL=errors.js.map