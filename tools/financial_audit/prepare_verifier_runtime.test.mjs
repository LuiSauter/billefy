import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import net from 'node:net';

const cli = path.resolve('tools/financial_audit/prepare_verifier_runtime.mjs');
const tools = ['typescript', 'vitest', '@types/node', '@types/react', '@types/react-dom'];
function fixture(t) {
  // Canonical, short system-temp path: macOS /var aliases break relative links,
  // and harness TMPDIR paths can exceed the Unix-domain socket limit.
  const project = fs.realpathSync(fs.mkdtempSync(path.join(process.platform === 'win32' ? os.tmpdir() : '/tmp', 'verifier-runtime-')));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  const nm = path.join(project, 'web/node_modules');
  const put = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
  const link = (dir, name, target) => {
    const dest = path.join(dir, name); fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.symlinkSync(path.relative(path.dirname(dest), target), dest);
  };
  const pkg = (name, version = '1', extra = {}, id = `${name.replaceAll('/', '+')}-${version}`) => {
    const dir = path.join(nm, '.pnpm', id, 'node_modules', name);
    put(path.join(dir, 'package.json'), JSON.stringify({ name, version, main: 'index.cjs', ...(['typescript','vitest'].includes(name) ? {bin:{[name==='typescript'?'tsc':name]:'index.cjs'}} : {}), ...extra }));
    put(path.join(dir, 'index.cjs'), `module.exports=${JSON.stringify(version)};`);
    return dir;
  };
  put(path.join(project, 'web/package.json'), JSON.stringify({ dependencies: { alpha: '1', next: '1' }, devDependencies: Object.fromEntries([...tools, 'eslint'].map(n => [n, '1'])) }));
  for (const name of [...tools, 'alpha', 'next']) link(nm, name, pkg(name));
  const vite = pkg('vite', '1', { dependencies: { esbuild: '2' } });
  const esbuild = pkg('esbuild', '2', { bin: { esbuild: 'index.cjs' } });
  link(path.dirname(vite), 'esbuild', esbuild);
  const vitest = fs.realpathSync(path.join(nm, 'vitest'));
  put(path.join(vitest, 'package.json'), JSON.stringify({ name: 'vitest', version: '1', bin:{vitest:'index.cjs'}, dependencies: { vite: '1' } }));
  link(path.dirname(vitest), 'vite', vite);
  fs.chmodSync(path.join(esbuild, 'index.cjs'), 0o755);
  const output = path.join(project, '.verifier-runtime');
  const run = (...args) => spawnSync(process.execPath, [cli, '--project', project, '--base-files', '0', '--base-bytes', '0', ...args], { encoding: 'utf8', timeout: 5000 });
  return { project, nm, pkg, put, link, output, run };
}
function snapshot(dir) {
  const rows = [];
  const walk = p => { for (const e of fs.readdirSync(p, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
    const f = path.join(p, e.name), st = fs.lstatSync(f);
    if (e.isDirectory()) walk(f);
    else rows.push([path.relative(dir, f), st.mode, st.mtimeMs, e.isSymbolicLink() ? fs.readlinkSync(f) : st.isFile() ? createHash('sha256').update(fs.readFileSync(f)).digest('hex') : 'special']);
  } }; walk(dir); return rows;
}
function success(result) { assert.equal(result.status, 0, result.stderr); assert.equal(result.stderr, ''); return JSON.parse(result.stdout); }
function rejected(f, args, message) {
  const before = snapshot(f.nm), result = f.run(...args);
  assert.equal(result.status, 1); assert.equal(result.stdout, ''); assert.match(result.stderr, message);
  assert.deepEqual(snapshot(f.nm), before); assert.equal(fs.existsSync(f.output), false);
}

test('complete regular closure, nested version/peer contexts, cycles, CLI paths and source independence', t => {
  const f = fixture(t), alpha = fs.realpathSync(path.join(f.nm, 'alpha'));
  const beta = f.pkg('beta', '1', { dependencies: { alpha: '1', shared: '2', plugin: '1' } });
  const shared1 = f.pkg('shared', '1'), shared2 = f.pkg('shared', '2');
  const plugin1 = f.pkg('plugin', '1', { peerDependencies: { shared: '*' } }, 'plugin-peer1');
  const plugin2 = f.pkg('plugin', '1', { peerDependencies: { shared: '*' } }, 'plugin-peer2');
  f.put(path.join(alpha, 'package.json'), JSON.stringify({ name: 'alpha', version: '1', main:'index.cjs', dependencies: { beta: '1', shared: '1', plugin: '1' } }));
  for (const [dir, name, target] of [[alpha,'beta',beta],[alpha,'shared',shared1],[alpha,'plugin',plugin1],[beta,'alpha',alpha],[beta,'shared',shared2],[beta,'plugin',plugin2],[plugin1,'shared',shared1],[plugin2,'shared',shared2]]) f.link(path.dirname(dir),name,target);
  // pnpm .bin links are not package payload.
  f.link(path.join(alpha, 'node_modules/.bin'), 'ignored', path.join(alpha, 'index.cjs'));
  const before = snapshot(f.nm), dry = success(f.run('--dry-run'));
  assert.equal(fs.existsSync(f.output), false);
  const result = success(f.run());
  assert.deepEqual(snapshot(f.nm), before);
  assert.equal(result.runtimeBytes, dry.runtimeBytes); assert.equal(result.runtimeFiles, dry.runtimeFiles);
  const manifest = JSON.parse(fs.readFileSync(path.join(f.output, 'manifest.json')));
  assert.equal(manifest.packages.filter(p => p.name === 'plugin').length, 2);
  assert.ok(manifest.packages.some(p => p.name === 'shared' && p.version === '2'));
  for (const p of manifest.packages) for (const file of p.files) {
    const target = path.join(f.output, p.destination, file.path);
    assert.ok(fs.lstatSync(target).isFile());
    assert.equal(createHash('sha256').update(fs.readFileSync(target)).digest('hex'), file.sha256);
  }
  assert.equal(fs.statSync(path.join(f.output, manifest.cli.esbuild)).mode & 0o777, 0o755);
  fs.renameSync(path.join(f.project, 'web'), path.join(f.project, 'original-web-unavailable'));
  const probe = spawnSync(process.execPath, ['-e', `const {createRequire}=require('module');const r=createRequire(${JSON.stringify(path.join(f.output,'node_modules/alpha/index.cjs'))});const b=r.resolve('beta');const br=createRequire(b);if(r('shared')!=='1'||br('shared')!=='2'||br('alpha')!=='1'||createRequire(br.resolve('plugin'))('shared')!=='2')process.exit(9);`], { encoding: 'utf8' });
  assert.equal(probe.status, 0, probe.stderr); assert.equal(probe.stdout, ''); assert.equal(probe.stderr, '');
});
test('required missing dependency rejects before output', t => {
  const f = fixture(t); f.put(path.join(fs.realpathSync(path.join(f.nm,'alpha')), 'package.json'), JSON.stringify({ name:'alpha',version:'1',dependencies:{missing:'1'} }));
  rejected(f, [], /Missing required dependency missing/);
});
test('optional Next build edges alone are omitted; installed optional and peers retained', t => {
  const f = fixture(t), next = fs.realpathSync(path.join(f.nm,'next'));
  f.put(path.join(next,'package.json'), JSON.stringify({name:'next',version:'1',optionalDependencies:{'@next/swc-test':'1',sharp:'1',kept:'1'},peerDependencies:{absent:'*'},peerDependenciesMeta:{absent:{optional:true}}}));
  f.link(path.dirname(next), 'kept', f.pkg('kept'));
  const result = success(f.run());
  const m = JSON.parse(fs.readFileSync(path.join(f.output,'manifest.json')));
  assert.ok(m.packages.some(p=>p.name==='kept'));
  assert.deepEqual(m.omissions.map(o=>o.name).sort(), ['@next/swc-test','absent','sharp']);
  assert.ok(m.omissions.every(o=>o.reason)); assert.ok(result.runtimeBytes > 0);
});
test('unallowlisted missing optional dependency is recorded, not silently dropped', t => {
  const f = fixture(t), a = fs.realpathSync(path.join(f.nm,'alpha'));
  f.put(path.join(a,'package.json'), JSON.stringify({name:'alpha',version:'1',optionalDependencies:{uninstalled:'1'}}));
  success(f.run()); const m = JSON.parse(fs.readFileSync(path.join(f.output,'manifest.json')));
  assert.match(m.omissions.find(o=>o.name==='uninstalled').reason, /not installed/);
});
test('escaping dependency link rejects without touching source or output', t => {
  const f = fixture(t);
  f.put(path.join(fs.realpathSync(path.join(f.nm,'alpha')),'package.json'), JSON.stringify({name:'alpha',version:'1',dependencies:{escape:'1'}}));
  f.link(f.nm,'escape',os.tmpdir()); rejected(f, [], /escapes installed tree/);
});
test('unsupported source file type rejects without partial output', async t => {
  const f = fixture(t), a = fs.realpathSync(path.join(f.nm,'alpha')), server = net.createServer();
  // A short system-temp socket avoids platform Unix socket path limits.
  const socket = path.join(f.nm,'s');
  await new Promise(resolve=>server.listen(socket,resolve)); t.after(()=>server.close());
  f.link(a,'unsupported',socket); rejected(f, [], /Unsupported source file type/);
});
test('preexisting output is never replaced', t => {
  const f=fixture(t); fs.mkdirSync(f.output); f.put(path.join(f.output,'keep'),'original');
  const before=snapshot(f.output), input=snapshot(f.nm), r=f.run();
  assert.equal(r.status,1); assert.equal(r.stdout,''); assert.match(r.stderr,/Output already exists/);
  assert.deepEqual(snapshot(f.output),before); assert.deepEqual(snapshot(f.nm),input);
});
test('file and byte caps include baseline and manifest and fail before output', t => {
  const f=fixture(t), d=success(f.run('--dry-run'));
  rejected(f,['--max-files',String(d.runtimeFiles-1)],/Budget exceeded/);
  rejected(f,['--max-bytes',String(d.runtimeBytes-1)],/Budget exceeded/);
  rejected(f,['--base-files','20000'],/Budget exceeded/);
  rejected(f,['--base-bytes',String(256*1024*1024)],/Budget exceeded/);
  success(f.run('--max-files',String(d.runtimeFiles),'--max-bytes',String(d.runtimeBytes)));
});
test('detects source changes between inventory and freezing before any output', t => {
  const f=fixture(t), input=path.join(fs.realpathSync(path.join(f.nm,'alpha')),'index.cjs');
  const preload=path.join(f.project,'mutator.cjs');
  f.put(preload,`const fs=require('fs');const read=fs.readFileSync;let n=0;fs.readFileSync=function(p,...args){if(String(p)===${JSON.stringify(input)}&&++n===2)fs.writeFileSync(p,'changed');return read.call(this,p,...args)};`);
  const r=spawnSync(process.execPath,['--require',preload,cli,'--project',f.project,'--base-files','0','--base-bytes','0'],{encoding:'utf8',timeout:5000});
  assert.equal(r.status,1); assert.equal(r.stdout,''); assert.match(r.stderr,/Source changed/); assert.equal(fs.existsSync(f.output),false);
});
const mapV3 = {version:3,sources:['source.ts'],names:[],mappings:'AAAA'};
function mapsReport(f) { const before=snapshot(f.nm), result=success(f.run('--dry-run')); assert.deepEqual(snapshot(f.nm),before); assert.equal(fs.existsSync(f.output),false); return result.debugMaps; }
test('debug-map omission candidates are semantic v3 flat/indexed maps, never code or declarations', t => {
  const f=fixture(t), a=fs.realpathSync(path.join(f.nm,'alpha'));
  const flat=JSON.stringify(mapV3), indexed=JSON.stringify({version:3,sections:[{offset:{line:0,column:0},map:mapV3}]});
  f.put(path.join(a,'debug.js.map'),flat); f.put(path.join(a,'indexed.map'),indexed);
  f.put(path.join(a,'debug.js'),'module.exports=1;\n//# sourceMappingURL=debug.js.map\n');
  f.put(path.join(a,'keep.d.ts'),'export declare const amount: string;'); f.put(path.join(a,'keep.js'),flat);
  const report=mapsReport(f);
  assert.deepEqual(report.validated,{files:2,bytes:Buffer.byteLength(flat)+Buffer.byteLength(indexed)});
  assert.deepEqual(report.candidates,report.validated); assert.equal(report.protected.files,0);
  assert.match(report.candidateSha256,/^[a-f0-9]{64}$/);
  // Until a complete real-graph budget fits, this is measurement only: default copies everything.
  success(f.run()); for(const name of ['debug.js.map','indexed.map','debug.js','keep.d.ts','keep.js']) assert.deepEqual(fs.readFileSync(path.join(f.output,'node_modules/alpha',name)),fs.readFileSync(path.join(a,name)));
});
test('invalid or non-source-map .map resources cannot be omission candidates', t => {
  const f=fixture(t), a=fs.realpathSync(path.join(f.nm,'alpha'));
  for(const [name,data] of Object.entries({'text.map':'runtime resource','data.map':'{}','old.map':JSON.stringify({...mapV3,version:2}),'bad.map':JSON.stringify({...mapV3,mappings:12}),'sections.map':JSON.stringify({version:3,sections:[{}]})})) f.put(path.join(a,name),data);
  const report=mapsReport(f); assert.deepEqual(report.validated,{files:0,bytes:0}); assert.deepEqual(report.candidates,report.validated);
  success(f.run()); for(const name of ['text.map','data.map','old.map','bad.map','sections.map']) assert.deepEqual(fs.readFileSync(path.join(f.output,'node_modules/alpha',name)),fs.readFileSync(path.join(a,name)));
});
test('entrypoint/export/import and functional-resource maps are protected from candidate omission', t => {
  const f=fixture(t), a=fs.realpathSync(path.join(f.nm,'alpha'));
  const entries={main:'main.map',module:'module.map',types:'types.map',bin:{alpha:'bin.map'},exports:{'./*':'./public/*'},imports:{'#map':'./import.map'}};
  f.put(path.join(a,'package.json'),JSON.stringify({name:'alpha',version:'1',...entries}));
  const names=['main.map','module.map','types.map','bin.map','public/export.map','import.map','resource.map'];
  for(const name of names) f.put(path.join(a,name),JSON.stringify(mapV3));
  f.put(path.join(a,'consumer.cjs'),`require('fs').readFileSync('./resource.map');`);
  const report=mapsReport(f); assert.equal(report.validated.files,7); assert.deepEqual(report.protected,report.validated); assert.deepEqual(report.candidates,{files:0,bytes:0});
  success(f.run()); for(const name of names) assert.ok(fs.lstatSync(path.join(f.output,'node_modules/alpha',name)).isFile());
});
test('literal-resource scan is bounded for long nonmatching tokens without changing greedy guards', t => {
  const f=fixture(t), a=fs.realpathSync(path.join(f.nm,'alpha'));
  const literals=['folder/first.map/last.map','encoded%2Fresource.map','prefix.map-suffix','ignored.mapx','ignored.map_'];
  const names=['first.map','last.map','resource.map','prefix.map','ignored.map'];
  const flat=JSON.stringify(mapV3);
  for(const name of names) f.put(path.join(a,name),flat);
  const references=literals.join(' '), resource=path.join(a,'long-resource.txt'), size=256*1024;
  const check = () => {
    const before=snapshot(f.nm), result=f.run('--dry-run');
    // A five-second subprocess ceiling is deliberately generous for a 256-KiB
    // fixture; regex-engine backtrack counts are not exposed by Node's API.
    assert.equal(result.error,undefined,`literal scan exceeded bounded subprocess: ${result.error?.code}`);
    const report=success(result); assert.deepEqual(snapshot(f.nm),before); assert.equal(fs.existsSync(f.output),false);
    const protectedNames=new Set([...references.matchAll(/[A-Za-z0-9_@./%+-]+\.map\b/g)].map(m=>path.basename(decodeURIComponent(m[0]))));
    const candidates=names.filter(name=>!protectedNames.has(name)).map(name=>({source:path.relative(f.project,a),path:name,bytes:Buffer.byteLength(flat),sha256:createHash('sha256').update(flat).digest('hex'),reason:'Validated external source-map v3 debugging metadata; no declared entrypoint/export or literal resource reference'}));
    assert.equal(report.debugMaps.protected.files,protectedNames.size);
    assert.equal(report.debugMaps.candidateSha256,createHash('sha256').update(JSON.stringify(candidates)).digest('hex'));
    return report;
  };
  f.put(resource,'A '.repeat(size/2)+' '+references); const split=check();
  f.put(resource,'A'.repeat(size)+' '+references); const long=check();
  assert.deepEqual(long.debugMaps,split.debugMaps); assert.equal(long.runtimeBytes,split.runtimeBytes); assert.equal(long.runtimeFiles,split.runtimeFiles);
});
function roleFixture(t) {
  const f=fixture(t), a=fs.realpathSync(path.join(f.nm,'alpha')), ts=fs.realpathSync(path.join(f.nm,'typescript')), vt=fs.realpathSync(path.join(f.nm,'vitest'));
  f.put(path.join(a,'package.json'),JSON.stringify({name:'alpha',version:'1',main:'index.cjs',types:'index.d.ts',exports:{'.':{types:'./index.d.ts',default:'./index.cjs'},'./resource':'./resource.d.ts','./map':'./resource.map','./source':{types:'./source.ts',default:'./source.ts'}}}));
  for(const [name,text] of Object.entries({'index.d.ts':"export { value } from './needed.js';",'unused.d.ts':'export type Unused = string;','resource.d.ts':'resource bytes','needed.js':'export const value = 1;','private.js':'export const unused = 2;','source.ts':'export const source = 3;','settings.json':'{"version":1}','LICENSE':'license bytes','index.cjs.map':JSON.stringify(mapV3),'resource.map':JSON.stringify(mapV3)})) f.put(path.join(a,name),text);
  f.put(path.join(a,'index.cjs'),"module.exports='1';\n//# sourceMappingURL=index.cjs.map\n");
  f.put(path.join(ts,'lib/compiler.cjs'),'module.exports=1;'); f.put(path.join(ts,'lib/lib.d.ts'),'declare const lib: string;');
  f.put(path.join(vt,'index.d.ts'),'export declare function test(): void;'); f.put(path.join(vt,'package.json'),JSON.stringify({...JSON.parse(fs.readFileSync(path.join(vt,'package.json'))),types:'index.d.ts'}));
  return {...f,a};
}
test('purpose profiles preserve the complete default and retain role entrypoints/resources/licenses intact', t => {
  const f=roleFixture(t), before=snapshot(f.nm), full=success(f.run('--dry-run'));
  assert.equal(full.profile,'complete');
  const tests=success(f.run('--profile','tests')), types=success(f.run('--profile','types'));
  assert.equal(tests.profile,'tests'); assert.equal(types.profile,'types');
  assert.equal(tests.manifest,'.verifier-runtime/tests/manifest.json'); assert.equal(types.manifest,'.verifier-runtime/types/manifest.json');
  const at=(profile,name)=>path.join(f.output,profile,'node_modules/alpha',name);
  for(const profile of ['tests','types']) for(const name of ['resource.d.ts','resource.map','source.ts','settings.json','LICENSE','package.json']) assert.deepEqual(fs.readFileSync(at(profile,name)),fs.readFileSync(path.join(f.a,name)));
  assert.equal(fs.existsSync(at('tests','index.d.ts')),false); assert.equal(fs.existsSync(at('tests','unused.d.ts')),false);
  assert.ok(fs.existsSync(at('tests','private.js'))); assert.equal(fs.existsSync(at('tests','index.cjs.map')),false);
  assert.ok(fs.existsSync(at('types','index.d.ts'))); assert.ok(fs.existsSync(at('types','needed.js'))); assert.equal(fs.existsSync(at('types','private.js')),false);
  assert.equal(fs.existsSync(path.join(f.output,'tests/node_modules/typescript')),false);
  assert.ok(fs.existsSync(path.join(f.output,'types/node_modules/typescript/lib/compiler.cjs'))); assert.ok(fs.existsSync(path.join(f.output,'types/node_modules/typescript/lib/lib.d.ts')));
  assert.equal(fs.existsSync(path.join(f.output,'types/node_modules/vitest/index.cjs')),false);
  assert.deepEqual(Object.keys(tests.cli).sort(),['esbuild','vitest']); assert.deepEqual(Object.keys(types.cli),['tsc']);
  assert.ok(full.runtimeFiles > tests.runtimeFiles); assert.deepEqual(snapshot(f.nm),before);
  for(const profile of ['tests','types']) {
    const m=JSON.parse(fs.readFileSync(path.join(f.output,profile,'manifest.json')));
    assert.ok(m.profileOmissions.length); for(const o of m.profileOmissions) { assert.match(o.sha256,/^[a-f0-9]{64}$/); assert.ok(o.reason); }
    for(const p of m.packages) for(const file of p.files) assert.equal(createHash('sha256').update(fs.readFileSync(path.join(f.output,profile,p.destination,file.path))).digest('hex'),file.sha256);
  }
});
test('profile caps and existing destinations fail before writing and never clobber the sibling', t => {
  const f=roleFixture(t), d=success(f.run('--profile','tests','--dry-run'));
  rejected(f,['--profile','tests','--max-files',String(d.runtimeFiles-1)],/Budget exceeded/);
  rejected(f,['--profile','types','--base-bytes',String(256*1024*1024)],/Budget exceeded/);
  success(f.run('--profile','tests')); const before=snapshot(f.output), input=snapshot(f.nm);
  for(const args of [['--profile','tests'],['--profile','types','--max-files','0']]) { const r=f.run(...args); assert.equal(r.status,1); assert.equal(r.stdout,''); assert.deepEqual(snapshot(f.output),before); assert.deepEqual(snapshot(f.nm),input); }
  assert.equal(fs.existsSync(path.join(f.output,'types')),false);
});
test('profile projection rejects uncertain dynamic resource reads rather than pretending omissions are safe', t => {
  const f=roleFixture(t); f.put(path.join(f.a,'index.cjs'),"require('fs').readFileSync(process.argv[2]);");
  rejected(f,['--profile','tests'],/Uncertain dynamic resource.*index.cjs/);
  success(f.run('--dry-run')); // Complete default needs no omission safety inference.
});
test('profile dependency contexts retain cycles and nested versions independently of the live tree', t => {
  const f=fixture(t), a=fs.realpathSync(path.join(f.nm,'alpha')), b=f.pkg('beta','1',{dependencies:{alpha:'1',shared:'2'}}), s1=f.pkg('shared','1'), s2=f.pkg('shared','2');
  f.put(path.join(a,'package.json'),JSON.stringify({name:'alpha',version:'1',main:'index.cjs',dependencies:{beta:'1',shared:'1'}}));
  for(const [dir,name,target] of [[a,'beta',b],[a,'shared',s1],[b,'alpha',a],[b,'shared',s2]]) f.link(path.dirname(dir),name,target);
  for(const profile of ['tests','types']) success(f.run('--profile',profile));
  fs.renameSync(path.join(f.project,'web'),path.join(f.project,'original-unavailable'));
  for(const profile of ['tests','types']) {
    const m=JSON.parse(fs.readFileSync(path.join(f.output,profile,'manifest.json'))); assert.equal(m.packages.filter(p=>p.name==='shared').length,2);
    const r=spawnSync(process.execPath,['-e',`const {createRequire}=require('module');const r=createRequire(${JSON.stringify(path.join(f.output,profile,'node_modules/alpha/index.cjs'))});const b=createRequire(r.resolve('beta'));if(r('shared')!=='1'||b('shared')!=='2'||b('alpha')!=='1')process.exit(9);`],{encoding:'utf8'});
    assert.equal(r.status,0,r.stderr); assert.equal(r.stdout,''); assert.equal(r.stderr,'');
  }
});
test('profile CLI validates closed choices and help describes independent stage locations', t => {
  const f=fixture(t); rejected(f,['--profile','other'],/Invalid profile: other/); rejected(f,['--profile'],/Invalid option: --profile/);
  const r=f.run('--help'); assert.equal(r.status,0); assert.equal(r.stderr,''); for(const word of ['--profile','tests','types','.verifier-runtime/']) assert.ok(r.stdout.includes(word),word);
});
test('help is passive and describes offline limits and entrypoints', t => {
  const f=fixture(t), r=f.run('--help'); assert.equal(r.status,0); assert.equal(r.stderr,'');
  for(const word of ['--dry-run','--include','--max-files','--max-bytes','node','offline']) assert.ok(r.stdout.includes(word),word);
  assert.equal(fs.existsSync(f.output),false);
});
