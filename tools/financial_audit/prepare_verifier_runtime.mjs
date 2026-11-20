#!/usr/bin/env node
// Offline, regular-file projection of the *installed* graph; never an installer.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const fail = message => { throw new Error(message); };
const inside = (base, p) => p === base || p.startsWith(base + path.sep);
const exists = p => { try { fs.lstatSync(p); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } };
const hash = b => createHash('sha256').update(b).digest('hex');
const json = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const ordered = o => Object.keys(o ?? {}).sort();
const toolRoots = ['typescript', 'vitest', '@types/node', '@types/react', '@types/react-dom'];
const declaration = p => /\.d\.(?:ts|mts|cts)$/.test(p);
const typeSource = p => /\.(?:ts|tsx|mts|cts)$/.test(p);
const code = p => /\.(?:js|jsx|mjs|cjs|node)$/.test(p);
const legal = p => /(^|\/)(?:licen[cs]e|copying|notice)(?:\.|$)/i.test(p);
const runtimeValues = value => typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.entries(value).filter(([k])=>k!=='types').flatMap(([,v])=>runtimeValues(v)) : [];
const typeValues = value => typeof value === 'string' ? [value] : value && typeof value === 'object' ? 'types' in value ? typeValues(value.types) : Object.values(value).flatMap(typeValues) : [];
const strings = value => typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [];
function sourceMapV3(m, depth=0) {
  if (!m || typeof m !== 'object' || Array.isArray(m) || m.version !== 3 || depth > 100) return false;
  if ('sections' in m) return !('sources' in m || 'mappings' in m) && Array.isArray(m.sections) && m.sections.every(s=>s && Number.isSafeInteger(s.offset?.line) && s.offset.line>=0 && Number.isSafeInteger(s.offset?.column) && s.offset.column>=0 && (typeof s.url === 'string' ? !('map' in s) : sourceMapV3(s.map,depth+1)));
  return Array.isArray(m.sources) && m.sources.every(s=>typeof s==='string') && typeof m.mappings==='string' && /^[A-Za-z0-9+/,;]*$/.test(m.mappings) && (!('names' in m) || Array.isArray(m.names) && m.names.every(s=>typeof s==='string')) && (!('sourcesContent' in m) || Array.isArray(m.sourcesContent) && m.sourcesContent.every(s=>s===null || typeof s==='string'));
}
const parseMap = bytes => { try { return sourceMapV3(JSON.parse(bytes)); } catch { return false; } };
const entryFields = ['main','module','types','typings','bin','exports','imports','browser','style','typesVersions'];
const wildcard = value => new RegExp('^'+value.split('*').map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*')+'(?:/.*)?$');
// Ignore only a final standalone debugging directive, never alter copied code.
const withoutDebugURL = text => text.replace(/(?:^|\n)[ \t]*(?:\/\/[#@][ \t]*sourceMappingURL=[^\r\n]*|\/\*[#@][ \t]*sourceMappingURL=[^*\r\n]*\*\/)[ \t]*\r?\n?$/,'\n');
const help = `Prepare an offline regular-file runtime from web/node_modules (no installs/network).
Usage: node tools/financial_audit/prepare_verifier_runtime.mjs [--dry-run]
  --project PATH       Project root (default cwd)
  --output PATH        Fresh project-relative output (default .verifier-runtime)
  --profile tests|types  Purpose payload in .verifier-runtime/<profile>; default complete
  --include PATH       Additional intended helper payload; repeat for untracked paths
  --base-files N --base-bytes N  Explicit baseline instead of git tracked inventory
  --max-files N        Lower the fixed 20000-file helper ceiling
  --max-bytes N        Lower the fixed 268435456-byte helper ceiling
  --help               Print help without reading dependencies
Counts include baseline, --include, runtime and manifest. Dry-run never writes.
Debug-map diagnostics tally validated v3 candidates and exact proposed omission
budgets; default retains every file. Profiles record role-based omissions and fail
on uncertain runtime resource use. Tests includes the full suite/browser runtime;
types includes compiler and project type resolution, never a narrower tsc project.
Run JS tools as node <manifest.cli path>; use api.esbuild for bundling, not native
.bin links. See VERIFIER_RUNTIME.md.
`;
function main() {
  const args = process.argv.slice(2), opts = {}, includes = [];
  for (let i = 0; i < args.length; i++) {
    const k = args[i];
    if (k === '--help') { process.stdout.write(help); return; }
    if (k === '--dry-run') { opts.dry = true; continue; }
    if (!['--project','--output','--include','--base-files','--base-bytes','--max-files','--max-bytes','--profile'].includes(k) || !args[i+1] || args[i+1].startsWith('--')) fail(`Invalid option: ${k}`);
    const value = args[++i]; if (k === '--include') includes.push(value); else opts[k.slice(2)] = value;
  }
  const profile = opts.profile ?? 'complete';
  if (!['complete','tests','types'].includes(profile) || opts.profile === 'complete') fail(`Invalid profile: ${opts.profile}`);
  const project = fs.realpathSync(opts.project ?? process.cwd());
  const local = p => { const abs = path.resolve(project, p); if (!inside(project, abs) || abs === project) fail(`Not project-relative: ${p}`); return abs; };
  const stage = path.join(project,'.verifier-runtime');
  const output = local(opts.output ?? (profile === 'complete' ? '.verifier-runtime' : `.verifier-runtime/${profile}`)), installed = path.join(project, 'web/node_modules');
  if (exists(output)) fail(`Output already exists: ${path.relative(project, output)}`);
  if (exists(stage) && fs.lstatSync(stage).isSymbolicLink()) fail('Unsafe staging link');
  const createStage = profile !== 'complete' && !opts.output && !exists(stage);
  const parent = fs.realpathSync(createStage ? project : path.dirname(output));
  if (!inside(project,parent) || inside(installed,parent) || inside(installed,output)) fail('Unsafe output parent');
  const number = (key, fallback) => { const n = Number(opts[key] ?? fallback); if (!Number.isSafeInteger(n) || n < 0) fail(`Invalid number: ${key}`); return n; };
  const maxFiles = number('max-files',20000), maxBytes = number('max-bytes',268435456);
  if (maxFiles > 20000 || maxBytes > 268435456) fail('Cannot increase helper ceilings');
  if (('base-files' in opts) !== ('base-bytes' in opts)) fail('Both baseline counts are required');
  const baseline = { files: number('base-files',0), bytes: number('base-bytes',0) }, counted = new Set();
  const count = p => {
    if (counted.has(p)) return; counted.add(p);
    if (inside(output,p) || inside(installed,p)) fail('Baseline cannot include output or installed dependencies');
    const st = fs.lstatSync(p);
    if (st.isDirectory()) for (const n of fs.readdirSync(p).sort()) count(path.join(p,n));
    else if (st.isFile()) { baseline.files++; baseline.bytes += st.size; }
    else fail(`Unsupported baseline file: ${path.relative(project,p)}`);
  };
  if (!('base-files' in opts)) {
    const tracked = execFileSync('git',['ls-files','-z'],{cwd:project,encoding:'utf8'}).split('\0').filter(Boolean);
    for (const p of tracked) count(local(p));
  }
  for (const p of includes) count(local(p));
  const checked = p => { const real = fs.realpathSync(p); if (!inside(installed,real)) fail(`Source escapes installed tree: ${path.relative(project,p)}`); return real; };
  const lookups = [];
  const search = function* (from, name) {
    if (!/^(@[\w.-]+\/)?[\w.-]+$/.test(name) || name === '..') fail(`Invalid package name: ${name}`);
    for (let dir = from; inside(project,dir); dir = path.dirname(dir)) if (path.basename(dir) !== 'node_modules') yield path.join(dir,'node_modules',name);
  };
  const resolve = (from, name, optional = false) => {
    for (const p of search(from,name)) if (exists(p)) {
      const real = checked(p); if (!fs.statSync(real).isDirectory()) fail(`Not a package directory: ${p}`);
      lookups.push({from,name,target:real}); return real;
    }
    lookups.push({from,name,target:null});
    if (!optional) fail(`Missing required dependency ${name} from ${path.relative(project,from)}`);
    return null;
  };
  const web = json(path.join(project,'web/package.json')), nodes = new Map(), omissions = [];
  const get = src => {
    if (nodes.has(src)) return nodes.get(src);
    const manifestPath = checked(path.join(src,'package.json')), raw = fs.readFileSync(manifestPath);
    const m = JSON.parse(raw), node = {src,m,edges:new Map(),absent:[],manifestHash:hash(raw)};
    if (!/^(@[\w.-]+\/)?[\w.-]+$/.test(m.name) || m.name === '..') fail('Invalid package manifest name');
    nodes.set(src,node);
    const deps = new Set([...ordered(m.dependencies),...ordered(m.optionalDependencies),...ordered(m.peerDependencies)]);
    for (const name of deps) {
      const optional = name in (m.optionalDependencies ?? {}) || (!(name in (m.dependencies ?? {})) && m.peerDependenciesMeta?.[name]?.optional === true);
      if (m.name === 'next' && name in (m.optionalDependencies ?? {}) && (name.startsWith('@next/swc-') || name === 'sharp')) {
        omissions.push({source:path.relative(project,src),name,reason:'Next optional build/server image processing; not test/compiler/browser bundling'}); continue;
      }
      const target = resolve(src,name,optional);
      if (target) node.edges.set(name,get(target));
      else { node.absent.push(name); omissions.push({source:path.relative(project,src),name,reason:'Optional dependency/peer not installed'}); }
    }
    return node;
  };
  const roots = new Map();
  for (const name of [...ordered(web.dependencies),...(profile === 'tests' ? ['vitest'] : toolRoots)]) roots.set(name,get(resolve(path.join(project,'web'),name)));
  if (profile !== 'types') {
    const vite = get(resolve(roots.get('vitest').src,'vite'));
    roots.set('esbuild',get(resolve(vite.src,'esbuild')));
  }
  const omittedRoots = ordered(web.devDependencies).filter(n=>!roots.has(n)).map(name=>({name,requested:web.devDependencies[name],reason:toolRoots.includes(name) ? 'Not a root for this profile; retained if required by selected graph' : 'Lint/build-only root; retained if required by selected graph'}));
  // Reserve all root names first, then hoist other first identities. Conflicts nest.
  const placements = new Map(), queue = [];
  const place = (destination,node) => { placements.set(destination,node); queue.push({destination,node}); };
  for (const [name,node] of roots) place(path.join(output,'node_modules',name),node);
  for (const node of nodes.values()) {
    const dest = path.join(output,'node_modules',node.m.name);
    if (!placements.has(dest)) place(dest,node);
  }
  const at = (dir,name) => { for (const p of search(dir,name)) { if (!inside(output,p)) break; if (placements.has(p)) return placements.get(p); } return null; };
  for (let i=0; i<queue.length; i++) {
    const {destination,node} = queue[i];
    for (const [name,target] of node.edges) if (at(destination,name) !== target) {
      const dest = path.join(destination,'node_modules',name);
      if (placements.has(dest)) fail('Unrepresentable dependency context');
      place(dest,target);
      if (queue.length > maxFiles) fail('Budget exceeded: cyclic/conflicting package layout');
    }
  }
  for (const {destination,node} of queue) {
    for (const [name,target] of node.edges) if (at(destination,name) !== target) fail(`Resolution changed: ${name}`);
    for (const name of node.absent) if (at(destination,name)) fail(`Absent optional context changed: ${name}`);
  }
  // Inventory intact package bytes, excluding only nested node_modules (graph-owned).
  const inventory = (node, retain = false) => {
    const files = [], buffers = new Map(), stamps = [], maps = [], mapPaths = new Set(), references = new Set(), targets = [], runtimeTargets = [], info = new Map();
    const walk = (dir, prefix='', ancestors=[]) => {
      const real = checked(dir); if (ancestors.includes(real)) fail('Cyclic package file link');
      for (const name of fs.readdirSync(real).sort()) {
        if (name === 'node_modules') continue;
        const rel = path.join(prefix,name), input = path.join(dir,name), actual = checked(input), st = fs.statSync(actual), lst = fs.lstatSync(input);
        stamps.push([rel,actual,st.ino,st.mtimeMs,st.ctimeMs,lst.ino,lst.mtimeMs,lst.ctimeMs]);
        if (st.isDirectory()) walk(input,rel,[...ancestors,real]);
        else if (st.isFile()) {
          const bytes = fs.readFileSync(actual);
          const file = {path:rel,bytes:bytes.length,mode:st.mode & 0o7777,sha256:hash(bytes)}; files.push(file);
          if (name.endsWith('.map') && parseMap(bytes)) { maps.push(file); mapPaths.add(rel); }
          else {
            const text = withoutDebugURL(bytes.toString('utf8'));
            if (profile !== 'complete') {
              const literals = [...text.matchAll(/["']([^"'\\\r\n]+)["']/g)].map(m=>m[1]);
              const dynamic = (code(rel) || typeSource(rel)) && !declaration(rel) && [...text.matchAll(/\b(?:readFile(?:Sync)?|createReadStream|readdir(?:Sync)?|opendir(?:Sync)?|glob(?:Sync)?|require)\b/g)].some(m=>!/^\s*(?:\.resolve\s*)?\(\s*(["'])[^"'\\\r\n]*\1\s*(?:,|\))/.test(text.slice(m.index+m[0].length)));
              const opaqueModule = /\b(?:from|import|require(?:\.resolve)?)\s*(?:\(\s*)?["'][^"'\r\n]*\\/.test(text) || /\b(?:import|require)\s*\(\s*`/.test(text);
              const magic = bytes.subarray(0,4).toString('hex');
              info.set(rel,{literals,dynamic,opaqueModule,native:['7f454c46','cffaedfe','feedfacf','cefaedfe','feedface','cafebabe'].includes(magic) || bytes.subarray(0,2).toString()==='MZ'});
            }
            // A greedy match ends at the last valid .map boundary in its maximal
            // token, so retrying inside that same token cannot yield another match.
            // Guard the start to prevent quadratic retries on long nonmatches.
            for (const match of text.matchAll(/(?<![A-Za-z0-9_@./%+-])[A-Za-z0-9_@./%+-]+\.map\b/g)) { try { references.add(path.basename(decodeURIComponent(match[0]))); } catch { references.add(path.basename(match[0])); } }
            if (name === 'package.json') {
              try {
                const m = JSON.parse(text);
                for (const field of entryFields) for (const target of strings(m[field])) targets.push(wildcard(path.posix.join(path.dirname(rel),target)));
                if (profile !== 'complete') for (const field of ['main','module','bin','exports','imports','browser','style']) for (const target of runtimeValues(m[field])) runtimeTargets.push(wildcard(path.posix.join(path.dirname(rel),target)));
              }
              catch { targets.push(/.*/); runtimeTargets.push(/.*/); } // Unknown manifest: conservatively protect.
            }
          }
          if (retain) buffers.set(rel,bytes);
        } else fail(`Unsupported source file type: ${path.relative(project,input)}`);
      }
    }; walk(node.src);
    if (files.find(f=>f.path==='package.json')?.sha256 !== node.manifestHash) fail('Source changed: package manifest');
    return {files,buffers,stamps,maps,mapPaths,references,targets,runtimeTargets,info};
  };
  for (const node of nodes.values()) node.inventory = inventory(node);
  let packages = queue.map(({destination,node})=>({name:node.m.name,version:node.m.version,source:path.relative(project,node.src),destination:path.relative(output,destination),files:node.inventory.files,edges:Object.fromEntries([...node.edges].map(([name,target])=>[name,path.relative(project,target.src)]))}));
  const cli = {};
  for (const [name,command] of [['vitest','vitest'],['typescript','tsc'],['esbuild','esbuild']]) {
    if (profile === 'tests' && name === 'typescript' || profile === 'types' && name !== 'typescript') continue;
    const node = roots.get(name), bin = typeof node.m.bin === 'string' ? node.m.bin : node.m.bin?.[command];
    if (!bin || !node.inventory.files.some(f=>f.path===path.normalize(bin))) fail(`Missing CLI: ${command}`);
    cli[command] = path.join('node_modules',name,bin);
  }
  const inputRows = [...nodes.values()].map(n=>[path.relative(project,n.src),n.inventory.files]);
  const api = profile === 'types' ? {} : {esbuild:path.join('node_modules/esbuild',roots.get('esbuild').m.main ?? 'lib/main.js')};
  let payload = {files:packages.reduce((n,p)=>n+p.files.length,0),bytes:packages.reduce((n,p)=>n+p.files.reduce((s,f)=>s+f.bytes,0),0)};
  const manifest = {schema:1,roots:[...roots.keys()],omittedRoots,omissions,cli,api,inputSha256:hash(JSON.stringify(inputRows)),baseline,payload,packages};
  let text = JSON.stringify(manifest) + '\n';
  let runtimeFiles = 1 + payload.files, runtimeBytes = Buffer.byteLength(text) + payload.bytes;
  const references = new Set([...nodes.values()].flatMap(n=>[...n.inventory.references]));
  const candidates = [], validated = [], candidateFiles = new Map();
  for (const p of packages) {
    const node = nodes.get(path.join(project,p.source)), selected = new Set(); candidateFiles.set(p.destination,selected);
    for (const file of node.inventory.maps) {
      validated.push(file);
      if (references.has(path.basename(file.path)) || node.inventory.targets.some(re=>re.test(file.path))) continue;
      selected.add(file.path); candidates.push({source:p.source,path:file.path,bytes:file.bytes,sha256:file.sha256,reason:'Validated external source-map v3 debugging metadata; no declared entrypoint/export or literal resource reference'});
    }
  }
  const stats = rows => ({files:rows.length,bytes:rows.reduce((n,f)=>n+f.bytes,0)}), debugCounts = stats(candidates), validatedCounts = stats(validated);
  const proposed = {...manifest,payload:{files:payload.files-debugCounts.files,bytes:payload.bytes-debugCounts.bytes},debugMapPolicy:'omit-validated-unreferenced-v3',debugMapOmissions:candidates,packages:packages.map(p=>({...p,files:p.files.filter(f=>!candidateFiles.get(p.destination).has(f.path))}))};
  const proposedFiles = 1+proposed.payload.files, proposedBytes = proposed.payload.bytes+Buffer.byteLength(JSON.stringify(proposed)+'\n');
  const debugMaps = {validated:validatedCounts,protected:{files:validatedCounts.files-debugCounts.files,bytes:validatedCounts.bytes-debugCounts.bytes},candidates:debugCounts,candidateSha256:hash(JSON.stringify(candidates)),proposed:{runtimeFiles:proposedFiles,runtimeBytes:proposedBytes,totalFiles:baseline.files+proposedFiles,totalBytes:baseline.bytes+proposedBytes},absoluteMinimumFiles:baseline.files+runtimeFiles-validatedCounts.files,policy:'Measurement only; candidates are an upper bound, not proof against dynamic resource use; nothing omitted'};
  const profileOmissions = [];
  if (profile !== 'complete') {
    const selected = new Map(), byFile = new Map(), pending = [], debugBySource = new Map();
    for (const o of candidates) { if (!debugBySource.has(o.source)) debugBySource.set(o.source,new Set()); debugBySource.get(o.source).add(o.path); }
    const add = (node,rel) => { const set=selected.get(node); if (set && !set.has(rel) && byFile.has(path.join(node.src,rel))) { set.add(rel); pending.push([node,rel]); } };
    for (const node of nodes.values()) {
      selected.set(node,new Set());
      for (const file of node.inventory.files) byFile.set(path.join(node.src,file.path),[node,file.path]);
    }
    const literalNames = new Set([...nodes.values()].flatMap(n=>[...n.inventory.info].filter(([p])=>!declaration(p) && path.basename(p)!=='package.json').flatMap(([,i])=>i.literals.map(s=>path.basename(s)))));
    for (const node of nodes.values()) {
      const hasTypes=node.inventory.files.some(f=>typeSource(f.path));
      for (const file of node.inventory.files) {
      const p=file.path, info=node.inventory.info.get(p), compiler=node.m.name==='typescript', debug=debugBySource.get(path.relative(project,node.src))?.has(p);
      if (compiler || path.basename(p)==='package.json' || legal(p)) { add(node,p); continue; }
      if (profile==='tests') {
        if (!debug && (!declaration(p) || literalNames.has(path.basename(p)) || node.inventory.runtimeTargets.some(re=>re.test(p)))) add(node,p);
      } else if (!debug && (typeSource(p) || !code(p) && !info?.native || !hasTypes && code(p) && !info?.native)) add(node,p);
      }
    }
    // tsc does not execute dependency JS: preserve its type-resolution closure,
    // substituting declarations for JS exactly at the file/conditional entry level.
    const within = (node,rel) => {
      const ext=path.extname(rel), base=rel.slice(0,-ext.length), substitutes=ext==='.js' || ext==='.jsx' ? [base+'.ts',base+'.tsx',base+'.d.ts'] : ext==='.mjs' ? [base+'.mts',base+'.d.mts'] : ext==='.cjs' ? [base+'.cts',base+'.d.cts'] : [];
      const paths=[...substitutes,rel,...(!ext ? ['.ts','.tsx','.d.ts','.mts','.d.mts','.cts','.d.cts','.js','.mjs','.cjs','.json'].map(e=>rel+e) : []),...['index.ts','index.d.ts','index.d.mts','index.d.cts','index.js','index.mjs','index.cjs'].map(p=>path.join(rel,p))];
      for (const p of paths) { const found=byFile.get(path.resolve(node.src,p)); if (found) { add(...found); return; } }
    };
    const target = (node,value) => { for (const p of typeValues(value)) {
      if (p.includes('*')) { const match=wildcard(path.posix.normalize(p)); for (const f of node.inventory.files) if (match.test(f.path)) within(node,f.path); }
      else within(node,path.posix.normalize(p));
    } };
    if (profile==='types') {
      for (const node of nodes.values()) {
        if (node.m.types || node.m.typings) target(node,node.m.types ?? node.m.typings);
        else target(node,node.m.main ?? 'index.js');
        if (node.m.exports) for (const v of typeof node.m.exports==='object' && ordered(node.m.exports).some(k=>k.startsWith('.')) ? Object.values(node.m.exports) : [node.m.exports]) target(node,v);
        target(node,node.m.typesVersions); target(node,node.m.imports);
      }
      for (let i=0;i<pending.length;i++) {
        const [node,rel]=pending[i]; if (!code(rel) && !typeSource(rel)) continue;
        for (const value of node.inventory.info.get(rel)?.literals ?? []) {
          if (value.startsWith('.')) within(node,path.join(path.dirname(rel),value));
          else {
            const parts=value.split('/'), name=parts[0]?.startsWith('@') ? parts.slice(0,2).join('/') : parts[0], dep=node.edges.get(name) ?? roots.get(name);
            if (dep) { const sub=parts.slice(name.startsWith('@')?2:1).join('/'); if (sub) within(dep,sub); else target(dep,dep.m.types ?? dep.m.typings ?? dep.m.main ?? 'index.js'); }
          }
        }
      }
    }
    for (const p of packages) {
      const node=nodes.get(path.join(project,p.source));
      for (const file of p.files) if (!selected.get(node).has(file.path)) profileOmissions.push({source:p.source,destination:p.destination,...file,reason:node.inventory.mapPaths.has(file.path) ? 'Unexported validated debug map; profile role excludes debug mapping' : profile==='tests' ? 'Declaration-only file outside runtime entrypoints and literal resources' : 'Execution artifact outside compiler and type-resolution closure'});
      p.files=p.files.filter(f=>selected.get(node).has(f.path));
    }
    if (profileOmissions.length) for (const node of nodes.values()) for (const [p,info] of node.inventory.info) {
      if (profile==='tests' && info.dynamic) fail(`Uncertain dynamic resource prevents profile omissions: ${path.relative(project,path.join(node.src,p))}`);
      if (node.m.name!=='typescript' && (code(p) || typeSource(p)) && selected.get(node).has(p) && info.opaqueModule) fail(`Uncertain encoded/template module prevents profile omissions: ${path.relative(project,path.join(node.src,p))}`);
    }
    payload={files:packages.reduce((n,p)=>n+p.files.length,0),bytes:packages.reduce((n,p)=>n+p.files.reduce((s,f)=>s+f.bytes,0),0)};
    Object.assign(manifest,{profile,profileOmissions,payload,packages});
    text=JSON.stringify(manifest)+'\n'; runtimeFiles=1+payload.files; runtimeBytes=Buffer.byteLength(text)+payload.bytes;
    debugMaps.policy='Profile role policy applied; debug diagnostics describe the unprojected selected graph';
  }
  const largestPackages = packages.map(p=>({name:p.name,version:p.version,files:p.files.length,bytes:p.files.reduce((n,f)=>n+f.bytes,0)})).sort((a,b)=>b.bytes-a.bytes).slice(0,10);
  const report = {profile,profileOmissions:stats(profileOmissions),dryRun:!!opts.dry,packages:packages.length,sourcePackages:nodes.size,runtimeFiles,runtimeBytes,baseline,totalFiles:baseline.files+runtimeFiles,totalBytes:baseline.bytes+runtimeBytes,maxFiles,maxBytes,debugMaps,manifest:path.relative(project,path.join(output,'manifest.json')),cli,api,inputSha256:manifest.inputSha256,largestPackages,omittedRoots,omissions:omissions.map(o=>({...o,source:nodes.get(path.join(project,o.source)).m.name}))};
  const overBudget = report.totalFiles > maxFiles || report.totalBytes > maxBytes;
  // Freeze bytes after a second full inventory and resolution check, before mkdir.
  // At no point are installed files opened for writing or dependency code executed.
  for (const node of nodes.values()) {
    const current = inventory(node,!opts.dry && !overBudget);
    if (JSON.stringify(current.files) !== JSON.stringify(node.inventory.files) || JSON.stringify(current.stamps) !== JSON.stringify(node.inventory.stamps)) fail(`Source changed: ${path.relative(project,node.src)}`);
    node.inventory = current;
  }
  for (const {from,name,target} of [...lookups]) if (resolve(from,name,true) !== target) fail(`Source changed: dependency ${name}`);
  report.inputPreserved = true;
  if (overBudget) fail(`Budget exceeded: ${JSON.stringify(report)}`);
  if (!opts.dry) {
    if (createStage) fs.mkdirSync(stage);
    fs.mkdirSync(output); // exclusive: never reuse a user's preexisting directory
    for (const p of packages) for (const file of p.files) {
      const node=nodes.get(path.join(project,p.source));
      const dest = path.join(output,p.destination,file.path); fs.mkdirSync(path.dirname(dest),{recursive:true});
      fs.writeFileSync(dest,node.inventory.buffers.get(file.path),{flag:'wx',mode:file.mode}); fs.chmodSync(dest,file.mode);
    }
    fs.writeFileSync(path.join(output,'manifest.json'),text,{flag:'wx'});
  }
  process.stdout.write(JSON.stringify(report) + '\n');
}
try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
