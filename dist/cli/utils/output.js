export function printJson(data) {
    console.log(JSON.stringify(data, null, 2));
}
export function fail(msg) {
    console.error(`error: ${msg}`);
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
    throw new Error('unreachable'); // satisfy TypeScript never
}
export function ok(msg) {
    console.log(msg);
}
//# sourceMappingURL=output.js.map