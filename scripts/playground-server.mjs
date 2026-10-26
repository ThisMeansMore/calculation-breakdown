import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const host = process.env.CALCULATION_BREAKDOWN_PLAYGROUND_HOST ?? '0.0.0.0';
const port = Number(process.env.CALCULATION_BREAKDOWN_PLAYGROUND_PORT ?? 4173);
const types = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
};

createServer((request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    const requested = pathname === '/' ? '/playground/' : pathname;
    let file = resolve(root, `.${requested}`);

    if (!file.startsWith(`${root}${sep}`)) {
        response.writeHead(403).end('Forbidden');
        return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) {
        file = resolve(file, 'index.html');
    }
    if (!existsSync(file) || !statSync(file).isFile()) {
        response.writeHead(404).end('Not found');
        return;
    }

    response.writeHead(200, {
        'Content-Type': types[extname(file)] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
    });
    createReadStream(file).pipe(response);
}).listen(port, host, () => {
    console.log('calculation-breakdown playground');
    console.log(`  Local      http://localhost:${port}/playground/`);
    if (host === '0.0.0.0' || host === '::') {
        const addresses = new Set();
        for (const entries of Object.values(networkInterfaces())) {
            for (const entry of entries ?? []) {
                if ((entry.family === 'IPv4' || entry.family === 4) && !entry.internal) addresses.add(entry.address);
            }
        }
        for (const address of [...addresses].sort()) console.log(`  Network    http://${address}:${port}/playground/`);
        console.log('  Serving all interfaces; set CALCULATION_BREAKDOWN_PLAYGROUND_HOST=127.0.0.1 for local-only access.');
    }
});
