import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('package exports', () => {
    it('loads the ESM entry point', async () => {
        const module = await import('../dist/index.js');
        assert.equal(typeof module.CalculationBreakdownBuilder, 'function');
    });

    it('loads the CommonJS entry point', () => {
        const require = createRequire(import.meta.url);
        const module = require('../dist/cjs/index.js');
        assert.equal(typeof module.CalculationBreakdownBuilder, 'function');
    });

    it('packs the public artifacts', () => {
        const output = execFileSync(
            'npm',
            [
                'pack',
                '--ignore-scripts',
                '--dry-run',
                '--json',
                '--cache',
                resolve(root, 'node_modules', '.cache', 'npm'),
            ],
            {
                cwd: root,
                encoding: 'utf8',
            },
        );
        const parsed: unknown = JSON.parse(output);
        if (!parsed || typeof parsed !== 'object') {
            assert.fail('npm pack returned an unexpected response');
        }
        const pack = Array.isArray(parsed)
            ? parsed[0]
            : Reflect.get(parsed, 'calculation-breakdown');
        assert.ok(pack);
        const paths = (pack as { files: Array<{ path: string }> }).files.map(
            (file) => file.path,
        );

        assert.ok(paths.includes('dist/index.js'));
        assert.ok(paths.includes('dist/index.d.ts'));
        assert.ok(paths.includes('dist/cjs/index.js'));
        assert.ok(paths.includes('README.md'));
        assert.ok(paths.includes('LICENSE'));
    });
});
