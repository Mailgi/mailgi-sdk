import { AgentMailboxClient } from '../client.js';
export interface AgentEntry {
    apiKey: string;
    agentId: string;
    label?: string;
}
export interface Config {
    baseUrl: string;
    agents: Record<string, AgentEntry>;
}
export declare function loadConfig(): Config;
export declare function saveConfig(config: Config): void;
export declare function saveAgent(email: string, entry: AgentEntry): void;
export declare function removeAgent(email: string): void;
/**
 * Resolve an agent identifier (full email OR username before @) to its entry.
 * Exits with a friendly error if not found.
 */
export declare function resolveAgent(identifier: string): {
    email: string;
    entry: AgentEntry;
};
/**
 * Return an authenticated client for the given agent identifier.
 */
export declare function getClient(agentIdentifier: string): {
    client: AgentMailboxClient;
    email: string;
    entry: AgentEntry;
};
/**
 * Return an unauthenticated client using the configured base URL.
 */
export declare function getBaseClient(): AgentMailboxClient;
//# sourceMappingURL=config.d.ts.map