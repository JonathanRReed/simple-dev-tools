import { expect, test, afterAll } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync, symlinkSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { ESLint } from 'eslint';
import { cases, routeFiles } from './cases.mjs';

const repo = fileURLToPath(new URL('../../',import.meta.url));
const root = mkdtempSync(join(tmpdir(),'devtools-lint-'));
for (const file of [...routeFiles, 'app/contact/page.tsx','app/contact/helper.tsx','app/(group)/grouped/page.tsx','app/@slot/parallel/page.tsx','app/_private/page.tsx','app/api/route.ts','pages/api/health.ts',
  'pages/_reports/index.tsx','pages/_reports/detail.tsx','pages/_history/[year].tsx',
  'pages/_status.tsx','pages/_apple.tsx','pages/_error-help.tsx','pages/reports/_summary.tsx',
  'pages/_app.tsx','pages/_document.tsx','pages/_error.tsx']) {
  const path=join(root,file); mkdirSync(dirname(path),{recursive:true});
  writeFileSync(path,'export default function Page() { return null }');
}
const eslint = new ESLint({cwd:root,overrideConfigFile:join(repo,'eslint.config.mjs'),overrideConfig:{settings:{next:{rootDir:root}}}});
const upstream = JSON.parse(readFileSync(new URL('./upstream-diagnostics.json',import.meta.url)));
afterAll(()=>rmSync(root,{recursive:true,force:true}));

async function diagnostics(fixture) {
  const file=join(root,fixture.filename);
  mkdirSync(dirname(file),{recursive:true}); writeFileSync(file,fixture.code);
  const [result]=await eslint.lintText(fixture.code,{filePath:file});
  expect(result.messages.filter(m=>m.fatal),fixture.name).toEqual([]);
  const messages=result.messages.filter(m=>m.ruleId?.endsWith(`/${fixture.rule}`))
    .map(m=>({rule:fixture.rule,severity:m.severity}));
  if (existsSync(join(repo,'.oxlintrc.next.json'))) {
    const ox=spawnSync(join(repo,'node_modules/.bin/oxlint'),['--threads=1','--no-ignore','--disable-nested-config','--config',join(repo,'.oxlintrc.next.json'),'--format=json',file],{cwd:root,encoding:'utf8'});
    if (![0,1].includes(ox.status)) throw new Error(ox.stderr || ox.stdout);
    const report=JSON.parse(ox.stdout);
    messages.push(...report.diagnostics.filter(m=>m.code===`next(${fixture.rule})`).map(m=>({rule:fixture.rule,severity:m.severity==='error'?2:1})));
  }
  return messages;
}

for (const fixture of cases) {
  test(`preserves upstream behavior: ${fixture.name}`, async()=>{
    const expected=upstream.results.find(r=>r.name===fixture.name).diagnostics;
    expect(expected.length,fixture.name).toBe(fixture.expected);
    expect(await diagnostics(fixture)).toEqual(expected);
  });
}

for (const [href,expected] of [['/contact/',1],['/grouped/',1],['/parallel/',1],['/contact/helper/',0],['/file.pdf',0],['/_private/',0],['/api/',0],['/api/health/',0],['/posts/hello.json',1]]) {
  test(`discovers real app routes rather than source files: ${href}`,async()=>{
    const fixture={name:href,filename:'components/links.tsx',rule:'no-html-link-for-pages',code:`const x = <a href=${JSON.stringify(href)}>Link</a>;`};
    expect(await diagnostics(fixture)).toEqual(expected?[{rule:fixture.rule,severity:2}]:[]);
  });
}

test('all non-Next effective rules, settings, parsers and globals survive for all eight extensions',async()=>{
  const old=JSON.parse(readFileSync(new URL('./baseline-config.json',import.meta.url)));
  const projectLint=new ESLint({cwd:repo});
  for (const [ext, profile] of Object.entries(old.extensions)) {
    const baseline=old.profiles[profile];
    const config=await projectLint.calculateConfigForFile(join(repo,`src/components/example.${ext}`));
    for (const [rule,value] of Object.entries(baseline.rules)) {
      if (!rule.startsWith('@next/next/')) expect(config.rules[rule],`${ext}: ${rule}`).toEqual(value);
    }
    expect(config.settings ?? {}).toEqual(baseline.settings ?? {});
    expect(config.languageOptions.parserOptions).toEqual(baseline.languageOptions.parserOptions);
    expect(config.languageOptions.sourceType).toBe(baseline.languageOptions.sourceType);
    const globals=Object.entries(config.languageOptions.globals ?? {}).sort(([a],[b])=>a<b?-1:a>b?1:0);
    expect(createHash('sha256').update(JSON.stringify(globals)).digest('hex')).toBe(baseline.languageOptions.globalsHash);
  }
  expect(JSON.parse(readFileSync(join(repo,'.oxlintrc.json')))).toEqual(old.oxlint);
});

test('all 20 migrated Next rules retain their exact upstream severities',()=>{
  const old=JSON.parse(readFileSync(new URL('./baseline-config.json',import.meta.url)));
  const ox=JSON.parse(readFileSync(join(repo,'.oxlintrc.next.json')));
  expect(Object.keys(ox.rules)).toHaveLength(20);
  for (const [rule,severity] of Object.entries(ox.rules)) {
    expect(severity,rule).toBe(old.rules[rule.replace('nextjs/','@next/next/')][0] === 2 ? 'error' : 'warn');
  }
});

for (const [name,environment] of [
  ['agent',{CODEX_THREAD_ID:'lint-regression',NO_COLOR:'1',FORCE_COLOR:undefined}],
  ['GitHub Actions',{CODEX_THREAD_ID:undefined,CI:'true',GITHUB_ACTIONS:'true',NO_COLOR:'1',FORCE_COLOR:undefined}],
  ['GitHub Actions with colour',{CODEX_THREAD_ID:undefined,CI:'true',GITHUB_ACTIONS:'true',NO_COLOR:undefined,FORCE_COLOR:'1'}],
]) {
  test(`the lint runner preserves file selection, rules and severity under ${name}`,()=>{
    const project=mkdtempSync(join(tmpdir(),'devtools-lint-selection-'));
    try {
      symlinkSync(join(repo,'eslint.config.mjs'),join(project,'eslint.config.mjs'));
      symlinkSync(join(repo,'node_modules'),join(project,'node_modules'),'dir');
      const extensions=['js','jsx','mjs','cjs','ts','tsx','mts','cts'];
      const ignored=['.next','out','dist','build','coverage','playwright-report','test-results','public/sqljs'];
      for (const file of [...extensions.map(ext=>`public/check.${ext}`),...ignored.map(dir=>`${dir}/ignored.js`),'next-env.d.ts']) {
        const path=join(project,file);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,'const module = {};');
      }
      const env={...process.env};
      for (const [key,value] of Object.entries(environment)) {
        if (value === undefined) delete env[key];
        else env[key]=value;
      }
      const result=spawnSync('node',[join(repo,'scripts/lint/lint.mjs')],{cwd:project,encoding:'utf8',timeout:20000,env});
      expect(result.status).toBe(1);
      for (const ext of extensions) expect(result.stdout).toContain(`public/check.${ext}`);
      expect(result.stdout).not.toContain('Parsing error');
      const diagnostics=[...result.stdout.matchAll(/^(.+):\d+:\d+: (error|warning) ([^:]+):/gm)]
        .map(([,file,severity,rule])=>({file,severity,rule}))
        .sort((a,b)=>a.file.localeCompare(b.file));
      expect(diagnostics).toEqual(extensions.map(ext=>({
        file:`public/check.${ext}`,severity:'error',rule:'next(no-assign-module-variable)',
      })).sort((a,b)=>a.file.localeCompare(b.file)));
      expect(result.stdout).not.toContain('ignored.js');
      expect(result.stdout).not.toContain('next-env.d.ts');
    } finally { rmSync(project,{recursive:true,force:true}); }
  },30000);
}

for (const [href,count] of [['/tools/color/',1],['/studio/security/',1],['/mermaid/',1],['/tools/color/ColorClient',0],['/sw.js',0]]) {
  test(`checks DevTools src/app routes: ${href}`,async()=>{
    const projectLint=new ESLint({cwd:repo});
    const [result]=await projectLint.lintText(`const x = <a href=${JSON.stringify(href)}>Go</a>;`,{filePath:join(repo,'src/components/example.tsx')});
    expect(result.messages.filter(m=>m.ruleId==='@next/next/no-html-link-for-pages')).toHaveLength(count);
  });
}

test('existing document-navigation and QR-image lint exemptions retain their scope',async()=>{
  const fixture={name:'document navigation',filename:'components/navigation.tsx',rule:'no-html-link-for-pages',code:'const x = <>\n{/* eslint-disable-next-line @next/next/no-html-link-for-pages */}\n<a href="/about/">Go</a></>;' };
  expect(await diagnostics(fixture)).toEqual([]);
  expect(await diagnostics({name:'QR image',filename:'components/qr.tsx',rule:'no-img-element',code:'const x = (\n// oxlint-disable-next-line nextjs/no-img-element\n<img src="blob:qr" alt="QR" />);'})).toEqual([]);
});

for (const [name,code,rule,severity] of [
  ['conditional hook','import {useState} from "react"; function Example({enabled}) { if(enabled) useState(0); return null; }','react-hooks/rules-of-hooks',2],
  ['effect dependencies','import {useEffect} from "react"; function Example({value}) { useEffect(()=>{console.log(value)},[]); return null; }','react-hooks/exhaustive-deps',1],
  ['compiler purity','function Example() { return <span>{Date.now()}</span>; }','react-hooks/purity',2],
  ['compiler refs','import {useRef} from "react"; function Example() { const ref=useRef(0); return <span>{ref.current}</span>; }','react-hooks/refs',2],
  ['image accessibility','const Example = () => <img src="/image.png" />;','jsx-a11y/alt-text',1],
  ['invalid aria','const Example = () => <button aria-madeup="true">Go</button>;','jsx-a11y/aria-props',1],
  ['React keys','const Example = () => [1,2].map(n=><span>{n}</span>);','react/jsx-key',2],
  ['anonymous export','export default {};','import/no-anonymous-default-export',1],
]) {
  test(`retains real ESLint diagnostics: ${name}`,async()=>{
    const [result]=await eslint.lintText(code,{filePath:join(root,'components/example.tsx')});
    expect(result.messages.filter(m=>m.ruleId===rule).map(m=>m.severity)).toEqual([severity]);
  });
}

test('both supported file families retain parsing and JSX lint coverage',async()=>{
  for(const ext of ['js','jsx','mjs','ts','tsx']) {
    const code=ext==='ts'?'export const value: number = 1;':'const Example = () => <img src="/a.png" />;';
    const [result]=await eslint.lintText(code,{filePath:join(root,`components/example.${ext}`)});
    expect(result.messages.filter(m=>m.fatal)).toEqual([]);
    if(ext!=='ts') expect(result.messages.filter(m=>m.ruleId==='jsx-a11y/alt-text').map(m=>m.severity)).toEqual([1]);
  }
});

test('cyclic destination aliases cannot crash linting or hide another navigation',async()=>{
  const fixture={name:'cyclic aliases',filename:'components/navigation.ts',rule:'no-location-assign-relative-destination',code:'let a = b; let b = a; location.assign(a); location.assign("/about");'};
  expect(await diagnostics(fixture)).toEqual([{rule:fixture.rule,severity:1}]);
});

test('CommonJS files retain Next navigation coverage',async()=>{
  const fixture={name:'CommonJS navigation',filename:'navigation.cjs',rule:'no-location-assign-relative-destination',code:'/* global window */ window.location.assign("/about");'};
  expect(await diagnostics(fixture)).toEqual([{rule:fixture.rule,severity:1}]);
});

test('the moved Next errors still run across all original file extensions',async()=>{
  for(const ext of ['js','jsx','mjs','cjs','ts','tsx','mts','cts']) {
    const fixture={name:`module assignment ${ext}`,filename:`module-check.${ext}`,rule:'no-assign-module-variable',code:'const module = {};'};
    expect(await diagnostics(fixture)).toEqual([{rule:fixture.rule,severity:2}]);
  }
});

for (const [href,expected] of [
  ['/_reports',1], ['/_reports/detail',1], ['/_history/2026',1],
  ['/_status',1], ['/_apple',1], ['/_error-help',1], ['/reports/_summary',1],
  ['/_app',0], ['/_document',0], ['/_error',0],
]) {
  test(`Pages Router underscores preserve ordinary pages and reserved files: ${href}`,async()=>{
    const fixture={name:href,filename:'components/pages-links.tsx',rule:'no-html-link-for-pages',code:`const x = <a href=${JSON.stringify(href)}>Link</a>;`};
    expect(await diagnostics(fixture)).toEqual(expected?[{rule:fixture.rule,severity:2}]:[]);
  });
}

for (const explicitRoot of [false,true]) {
  test(`literal bracketed checkout works with ${explicitRoot?'explicit rootDir':'implicit cwd'}`,async()=>{
    const checkout=join(root,`checkout[review-${explicitRoot}]`);
    mkdirSync(join(checkout,'app/known'),{recursive:true});
    writeFileSync(join(checkout,'app/known/page.tsx'),'export default function Page() { return null }');
    const editor=new ESLint({cwd:checkout,overrideConfigFile:join(repo,'eslint.config.mjs'),
      ...(explicitRoot?{overrideConfig:{settings:{next:{rootDir:checkout}}}}:{}),
    });
    const [result]=await editor.lintText('const x = <a href="/known">Known</a>;',
      {filePath:join(checkout,'components/link.tsx')});
    expect(result.messages.map(({ruleId,severity})=>({ruleId,severity})))
      .toEqual([{ruleId:'@next/next/no-html-link-for-pages',severity:2}]);
  });
}

test('unsupported rootDir glob still fails visibly',async()=>{
  const editor=new ESLint({cwd:root,overrideConfigFile:join(repo,'eslint.config.mjs'),
    overrideConfig:{settings:{next:{rootDir:'packages/*'}}}});
  await expect(editor.lintText('const x = <a href="/about">About</a>;',
    {filePath:join(root,'components/glob-link.tsx')}))
    .rejects.toThrow('next-local requires explicit root directories, not glob rootDir patterns');
});

for (const router of ['app','pages']) {
  test(`long-lived editor sees ${router} route additions, renames and removals`,async()=>{
    const checkout=join(root,`editor-${router}`);
    const pagePath=name=>join(checkout,router,router==='app'?`nested/${name}/page.tsx`:`nested/${name}.tsx`);
    // Prepare parents before the first lint. Later changes only touch nested
    // directories, so caching solely by the route root's mtime would be stale.
    for(const name of ['first','second']) mkdirSync(dirname(pagePath(name)),{recursive:true});
    const editor=new ESLint({cwd:checkout,overrideConfigFile:join(repo,'eslint.config.mjs')});
    const code='const x = <><a href="/nested/first">First</a><a href="/nested/second">Second</a></>;';
    async function lintLinks() {
      const [result]=await editor.lintText(code,{filePath:join(checkout,'components/links.tsx')});
      return result.messages.map(({ruleId,severity,message})=>({ruleId,severity,message}));
    }
    const finding=href=>({ruleId:'@next/next/no-html-link-for-pages',severity:2,
      message:`Do not use an \`<a>\` element to navigate to \`${href}\`. Use \`<Link />\` from \`next/link\` instead.`});
    expect(await lintLinks()).toEqual([]);
    writeFileSync(pagePath('first'),'export default function Page() { return null }');
    expect(await lintLinks()).toEqual([finding('/nested/first')]);
    renameSync(pagePath('first'),pagePath('second'));
    expect(await lintLinks()).toEqual([finding('/nested/second')]);
    rmSync(pagePath('second'));
    expect(await lintLinks()).toEqual([]);
  });
}
