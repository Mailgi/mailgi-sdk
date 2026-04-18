import { getClient, getBaseClient, loadConfig, removeAgent, saveAgent, } from '../config.js';
import { table, redactKey } from '../utils/format.js';
import { fail, ok, printJson } from '../utils/output.js';
export function registerAgentCommands(program) {
    // register
    program
        .command('register')
        .description('Register a new agent and save credentials locally')
        .option('--label <label>', 'human-readable label for this agent')
        .action(async (opts) => {
        const client = getBaseClient();
        let result;
        try {
            result = await client.agents.register({ label: opts.label });
        }
        catch (err) {
            fail(err instanceof Error ? err.message : String(err));
        }
        saveAgent(result.emailAddress, {
            apiKey: result.apiKey,
            agentId: result.agentId,
            label: opts.label,
        });
        ok(`Registered: ${result.emailAddress}`);
        ok(`API key:    ${result.apiKey}`);
        ok(`Saved to:   ~/.mailgi/config.json`);
    });
    // agents (list)
    program
        .command('agents')
        .description('List all locally saved agents')
        .action(function () {
        const { json } = this.optsWithGlobals();
        const config = loadConfig();
        const entries = Object.entries(config.agents);
        if (entries.length === 0) {
            ok('No agents registered. Run "mailgi register" to add one.');
            return;
        }
        if (json) {
            printJson(entries.map(([email, e]) => ({ email, agentId: e.agentId, label: e.label ?? '' })));
            return;
        }
        table(['Email', 'Label', 'API Key'], entries.map(([email, e]) => [
            email,
            e.label ?? '',
            redactKey(e.apiKey),
        ]));
    });
    // me
    program
        .command('me')
        .description('Show the current agent profile (fetched from API)')
        .requiredOption('--agent <id>', 'agent email or username')
        .action(async function (opts) {
        const { json } = this.optsWithGlobals();
        const { client } = getClient(opts.agent);
        let profile;
        try {
            profile = await client.agents.me();
        }
        catch (err) {
            fail(err instanceof Error ? err.message : String(err));
        }
        if (json) {
            printJson(profile);
            return;
        }
        ok(`Email:     ${profile.emailAddress}`);
        ok(`Alias:     ${profile.aliasAddress}`);
        ok(`Label:     ${profile.label}`);
        ok(`Agent ID:  ${profile.agentId}`);
        if (profile.did)
            ok(`DID:       ${profile.did}`);
        ok(`Created:   ${new Date(profile.createdAt).toLocaleString()}`);
    });
    // logout
    program
        .command('logout <email>')
        .description('Remove an agent from local config (API key will be lost)')
        .option('-y, --yes', 'skip confirmation')
        .action((emailArg, opts) => {
        const config = loadConfig();
        // Resolve username shorthand
        let resolvedEmail = emailArg;
        if (!config.agents[emailArg]) {
            const match = Object.keys(config.agents).find((e) => e.split('@')[0] === emailArg);
            if (!match)
                fail(`Agent "${emailArg}" not found in local config.`);
            resolvedEmail = match;
        }
        if (!opts.yes) {
            console.error(`Warning: This will remove "${resolvedEmail}" from ~/.mailgi/config.json.`);
            console.error(`The API key will be permanently lost from this machine.`);
            console.error(`Re-run with --yes or -y to confirm.`);
            process.exit(1);
        }
        removeAgent(resolvedEmail);
        ok(`Removed ${resolvedEmail} from local config.`);
    });
}
//# sourceMappingURL=agents.js.map