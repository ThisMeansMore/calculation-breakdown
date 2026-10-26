import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tsc = resolve(root, 'node_modules', '.bin', 'tsc');

rmSync(resolve(root, 'dist'), { force: true, recursive: true });
execFileSync(tsc, ['-p', 'tsconfig.json'], { cwd: root, stdio: 'inherit' });
execFileSync(tsc, ['-p', 'tsconfig.cjs.json'], {
    cwd: root,
    stdio: 'inherit',
});

mkdirSync(resolve(root, 'dist', 'cjs'), { recursive: true });
writeFileSync(
    resolve(root, 'dist', 'cjs', 'package.json'),
    `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`,
);
