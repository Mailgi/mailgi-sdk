import { getClient } from '../config.js';
import { table } from '../utils/format.js';
import { fail, ok, printJson } from '../utils/output.js';
export function registerMailboxCommands(program) {
    const mb = program
        .command('mailboxes')
        .description('Manage mailboxes (folders)')
        .requiredOption('--agent <id>', 'agent email or username')
        .action(async function (opts) {
        const { json } = this.optsWithGlobals();
        const { client } = getClient(opts.agent);
        let boxes;
        try {
            boxes = await client.mailboxes.list();
        }
        catch (err) {
            fail(err instanceof Error ? err.message : String(err));
        }
        if (json) {
            printJson(boxes);
            return;
        }
        if (boxes.length === 0) {
            ok('No mailboxes found.');
            return;
        }
        table(['ID', 'Name', 'Role', 'Total', 'Unread'], boxes.map((b) => [b.id, b.name, b.role ?? '', b.totalEmails, b.unreadEmails]));
    });
    mb.command('create <name>')
        .description('Create a new mailbox folder')
        .requiredOption('--agent <id>', 'agent email or username')
        .option('--parent <id>', 'parent mailbox ID')
        .action(async function (name, opts) {
        const { json } = this.optsWithGlobals();
        const { client } = getClient(opts.agent);
        let box;
        try {
            box = await client.mailboxes.create({ name, parentId: opts.parent });
        }
        catch (err) {
            fail(err instanceof Error ? err.message : String(err));
        }
        if (json) {
            printJson(box);
            return;
        }
        ok(`Created mailbox "${box.name}" (ID: ${box.id})`);
    });
    mb.command('delete <id>')
        .description('Delete a mailbox and all its messages')
        .requiredOption('--agent <id>', 'agent email or username')
        .action(async function (boxId, opts) {
        const { json } = this.optsWithGlobals();
        const { client } = getClient(opts.agent);
        try {
            await client.mailboxes.delete(boxId);
        }
        catch (err) {
            fail(err instanceof Error ? err.message : String(err));
        }
        if (json) {
            printJson({ deleted: boxId });
            return;
        }
        ok(`Deleted mailbox: ${boxId}`);
    });
}
//# sourceMappingURL=mailboxes.js.map