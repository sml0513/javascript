import { access, readFile, writeFile, mkdir } from 'node:fs/promises';

const sourceFiles = [
  'index.html', 'regions.js', 'app.js', 'map.js', 'atlas.css', 'style.css', 'data.js',
  'salt.svg', 'pizza.svg', 'cookie.svg',
  'vendor/leaflet.min.js', 'vendor/leaflet.css', 'vendor/LICENSE.txt'
];
const sourceRoot = await access('dist/data.js').then(()=> 'dist/',()=> '');
const entries = await Promise.all(sourceFiles.map(async file => [
  '/' + file, await readFile(sourceRoot + file, 'utf8')
]));
const seed = JSON.parse(Object.fromEntries(entries)['/data.js'].trim().replace(/^const catalog = /, '').replace(/;$/, ''));
if (seed.shops.length < 297) throw Error('기존 판매처가 누락되었습니다.');
await mkdir('dist/server', { recursive: true });
const discovery = await readFile('worker/discovery.js', 'utf8');
const server = await readFile('worker/server.js', 'utf8');
await writeFile('dist/server/index.js', [
  'const assets = ' + JSON.stringify(Object.fromEntries(entries)) + ';',
  'const seed = ' + JSON.stringify(seed) + ';',
  Object.fromEntries(entries)['/regions.js'],
  discovery,
  server
].join('\n'));
