import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const digest = contents => createHash('sha256').update(contents).digest('hex').slice(0, 12);

export const stripReviewMarkers = markdown => markdown
    .replace(/^[ \t]*<!-- (?:reviewed|requires-review) -->[ \t]*\r?\n?/gm, '')
    .replace(/<!-- (?:reviewed|requires-review) -->/g, '')
    .replace(/\n{3,}/g, '\n\n');

export function syncDocs({ check = false } = {}) {
    const docs = new URL('docs/', root);
    const playground = new URL('docs/playground/', root);
    const browserPackage = new URL('docs/assets/calculation-breakdown/', root);
    const playgroundCss = read('playground/playground.css');
    const browserSource = read('playground/playground.js')
        .replace("from '../dist/index.js'", "from '../assets/calculation-breakdown/index.js'");
    const playgroundHtml = read('playground/index.html')
        .replace('./playground.css', `./playground.css?v=${digest(playgroundCss)}`)
        .replace('./playground.js', `./playground.js?v=${digest(browserSource)}`);
    const playgroundPage = `---\ntitle: Playground\nlayout: null\n---\n${playgroundHtml}`;
    const files = new Map([
        ['docs/index.md', `---\ntitle: calculation-breakdown\n---\n\n<!-- Generated from README.md. Do not edit directly. -->\n\n${read('README.md').trimEnd()}\n`],
        ['docs/changelog.md', `---\ntitle: Changelog\n---\n\n<!-- Generated from CHANGELOG.md. Do not edit directly. -->\n\n${stripReviewMarkers(read('CHANGELOG.md')).trimEnd()}\n`],
        ['docs/changelog-archive.md', `---\ntitle: Changelog archive\n---\n\n<!-- Generated from CHANGELOG-ARCHIVE.md. Do not edit directly. -->\n\n${stripReviewMarkers(read('CHANGELOG-ARCHIVE.md')).trimEnd()}\n`],
    ]);
    if (check) {
        for (const [path, contents] of files) if (read(path) !== contents) throw new Error(`${path} is stale. Run npm run docs:sync.`);
        if (playgroundPage !== read('docs/playground/index.html')) throw new Error('docs/playground/index.html is stale.');
        if (playgroundCss !== read('docs/playground/playground.css')) throw new Error('docs/playground/playground.css is stale.');
        if (browserSource !== read('docs/playground/playground.js')) throw new Error('docs/playground/playground.js is stale.');
        for (const file of readdirSync(new URL('dist/', root)).filter(file => file.endsWith('.js'))) {
            if (read(`dist/${file}`) !== read(`docs/assets/calculation-breakdown/${file}`)) {
                throw new Error(`deployed package module ${file} is stale.`);
            }
        }
        return;
    }
    mkdirSync(docs, { recursive: true });
    for (const [path, contents] of files) writeFileSync(new URL(path, root), contents);
    rmSync(playground, { recursive: true, force: true });
    rmSync(browserPackage, { recursive: true, force: true });
    cpSync(new URL('playground/', root), playground, { recursive: true });
    writeFileSync(new URL('docs/playground/index.html', root), playgroundPage);
    writeFileSync(new URL('docs/playground/playground.js', root), browserSource);
    mkdirSync(browserPackage, { recursive: true });
    for (const file of readdirSync(new URL('dist/', root)).filter(file => file.endsWith('.js'))) {
        cpSync(new URL(`dist/${file}`, root), new URL(`docs/assets/calculation-breakdown/${file}`, root));
    }
}
