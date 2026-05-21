import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const JS_DIR = path.join(ROOT, 'js');
const OUT = path.join(JS_DIR, 'bundle.js');

const ORDER = [
    'utils.js',
    'config.js',
    'spriteData.js',
    'audio.js',
    'particles.js',
    'bloodStains.js',
    'renderer.js',
    'player.js',
    'monster.js',
    'projectile.js',
    'groundEffects.js',
    'upgrades.js',
    'buffOrbs.js',
    'abilities.js',
    'sakura.js',
    'failDeath.js',
    'grass.js',
    'levelManager.js',
    'experience.js',
    'pixelUi.js',
    'ui.js',
    'combat.js',
    'monsterSpawner.js',
    'input.js',
    'main.js',
];

function stripModules(code) {
    return code
        .replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"];\s*\n?/gm, '')
        .replace(/^\s*export\s+default\s+/gm, '')
        .replace(/^\s*export\s+(const|let|var|function|class)\s+/gm, '$1 ')
        .replace(/^\s*export\s+\{[^}]+\};?\s*\n?/gm, '')
        .replace(/^\s*export\s+/gm, '');
}

let bundle = `/* Ninja Slash bundle - supports file:// */\n(function () {\n'use strict';\n`;

for (const file of ORDER) {
    const filePath = path.join(JS_DIR, file);
    const code = fs.readFileSync(filePath, 'utf8');
    bundle += `\n// ---- ${file} ----\n`;
    bundle += stripModules(code);
    bundle += '\n';
}

bundle += `})();\n`;

fs.writeFileSync(OUT, bundle, 'utf8');
console.log('Wrote', OUT, `(${bundle.length} bytes)`);
