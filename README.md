# @agentmailbox/sdk

TypeScript SDK for the [AgentMailbox](https://agentmailbox.io) API — email infrastructure for AI agents.

## Install

```bash
npm install @agentmailbox/sdk
```

Requires Node.js 18 or later (uses the native `fetch` API).

---

## Quick start

### 1. Register an agent and send your first email

```typescript
import { AgentMailboxClient } from '@agentmailbox/sdk';

const client = new AgentMailboxClient({
  baseUrl: 'https://api.agentmailbox.io',
});

// Register an agent with a DID — returns an email address and API key.
// Store the API key securely; it is only shown once.
const registration = await client.agents.register({
  did: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
  label: 'My AI Agent',
});

console.log('Email:', registration.emailAddress);
// => agent-abc123@agentmailbox.io

console.log('API Key:', registration.apiKey);
// => amk_live_xxxxxxxxxxxxxxxxxxxx  (save this!)

// Authenticate subsequent requests with the API key.
client.apiKey = registration.apiKey;
```

### 2. Send an email

```typescript
const { messageId } = await client.mail.send({
  to: ['recipient@example.com'],
  subject: 'Hello from my AI agent',
  textBody: 'This message was sent by an AI agent via AgentMailbox.',
  htmlBody: '<p>This message was sent by an AI agent via <b>AgentMailbox</b>.</p>',
});

console.log('Sent message ID:', messageId);
```

### 3. Read incoming mail

```typescript
// List messages in the inbox
const { messages, total } = await client.mail.list({
  mailboxId: 'inbox',
  limit: 20,
  sort: 'desc',
});

console.log(`${total} messages in inbox`);

// Fetch the full body of the first message
if (messages.length > 0) {
  const email = await client.mail.get(messages[0].id);
  console.log('Subject:', email.subject);
  console.log('From:',    email.from.map(f => f.email).join(', '));
  console.log('Body:\n',  email.textBody ?? email.htmlBody);

  // Mark as read
  await client.mail.setFlags(email.id, { seen: true });
}
```

### 4. Construct a client from a stored API key

```typescript
import { AgentMailboxClient } from '@agentmailbox/sdk';

// Shorthand factory
const client = AgentMailboxClient.withApiKey(
  'https://api.agentmailbox.io',
  process.env.AGENTMAILBOX_API_KEY!,
);

const profile = await client.agents.me();
console.log(profile.emailAddress);
```

---

## API reference

### Constructor

```typescript
const client = new AgentMailboxClient({
  baseUrl: string,   // required — e.g. 'https://api.agentmailbox.io'
  apiKey?: string,   // set now or assign client.apiKey later
  timeout?: number,  // ms, default 30000
});
```

### `client.agents`

| Method | Endpoint | Auth |
|--------|----------|------|
| `agents.register(req)` | `POST /v1/agents/register` | No |
| `agents.me()` | `GET /v1/agents/me` | Yes |
| `agents.delete()` | `DELETE /v1/agents/me` | Yes |

### `client.apiKeys`

| Method | Endpoint | Auth |
|--------|----------|------|
| `apiKeys.list()` | `GET /v1/apikeys` | Yes |
| `apiKeys.create(req?)` | `POST /v1/apikeys` | Yes |
| `apiKeys.revoke(keyId)` | `DELETE /v1/apikeys/:id` | Yes |

### `client.auth`

| Method | Endpoint | Auth |
|--------|----------|------|
| `auth.challenge(did)` | `POST /v1/auth/challenge` | No |
| `auth.verify(req)` | `POST /v1/auth/verify` | No |

### `client.mail`

| Method | Endpoint | Auth |
|--------|----------|------|
| `mail.list(opts?)` | `GET /v1/mail` | Yes |
| `mail.get(id)` | `GET /v1/mail/:id` | Yes |
| `mail.send(req)` | `POST /v1/mail/send` | Yes |
| `mail.delete(id)` | `DELETE /v1/mail/:id` | Yes |
| `mail.move(id, mailboxId)` | `PATCH /v1/mail/:id/move` | Yes |
| `mail.setFlags(id, flags)` | `PATCH /v1/mail/:id/flags` | Yes |

`list` options:

```typescript
interface ListMailOptions {
  mailboxId?: string;       // filter to a specific folder
  limit?: number;
  position?: number;        // cursor for pagination
  sort?: 'asc' | 'desc';
}
```

`setFlags` options:

```typescript
{ seen?: boolean; flagged?: boolean }
```

### `client.mailboxes`

| Method | Endpoint | Auth |
|--------|----------|------|
| `mailboxes.list()` | `GET /v1/mailboxes` | Yes |
| `mailboxes.create(req)` | `POST /v1/mailboxes` | Yes |
| `mailboxes.delete(id)` | `DELETE /v1/mailboxes/:id` | Yes |
| `mailboxes.rename(id, name)` | `PATCH /v1/mailboxes/:id` | Yes |

### `client.health`

| Method | Endpoint | Auth |
|--------|----------|------|
| `health.check()` | `GET /health` | No |
| `health.ready()` | `GET /health/ready` | No |

---

## Error handling

All errors thrown by the SDK extend `AgentMailboxError`, which exposes:

- `message` — human-readable description
- `statusCode` — HTTP status code
- `code` — machine-readable string (e.g. `'NOT_FOUND'`, `'UNAUTHORIZED'`)

```typescript
import {
  AgentMailboxClient,
  AgentMailboxError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
  BadRequestError,
} from '@agentmailbox/sdk';

try {
  const email = await client.mail.get('msg-does-not-exist');
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log('Message not found:', err.message);
  } else if (err instanceof UnauthorizedError) {
    console.log('Check your API key — authentication failed.');
  } else if (err instanceof ConflictError) {
    console.log('Conflict:', err.message);
  } else if (err instanceof BadRequestError) {
    console.log('Bad request:', err.message);
  } else if (err instanceof AgentMailboxError) {
    // Catch-all for any other API error (5xx, etc.)
    console.log(`API error ${err.statusCode} [${err.code}]: ${err.message}`);
  } else {
    throw err; // rethrow unexpected errors
  }
}
```

### Timeout

Requests time out after 30 seconds by default. On timeout the SDK throws an `AgentMailboxError` with `code: 'TIMEOUT'` and `statusCode: 408`. Configure via the `timeout` constructor option:

```typescript
const client = new AgentMailboxClient({
  baseUrl: 'https://api.agentmailbox.io',
  apiKey: process.env.AGENTMAILBOX_API_KEY!,
  timeout: 10_000, // 10 seconds
});
```

---

## Development

```bash
# Build
npm run build

# Run tests (single pass)
npm test

# Watch mode
npm run test:watch
```

---

## License

MIT
