import { readFileSync, writeFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
writeFileSync('./public/version.json', JSON.stringify({ version: pkg.version }, null, 2) + '\n');
console.log(`version.json updated: ${pkg.version}`);
