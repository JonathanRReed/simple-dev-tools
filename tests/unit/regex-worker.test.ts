import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const script = readFileSync(new URL('../../public/regex-worker.js', import.meta.url), 'utf8');
function evaluate(pattern: string, flags: string, text: string, replacement = '$&', json = JSON) {
  let result: any;
  const self = { onmessage: undefined, postMessage: (value: unknown) => { result = value; } };
  runInNewContext(`${script}\nself.onmessage({ data });`, { self, JSON: json, data: { pattern, flags, text, replacement } }, { timeout: 1000 });
  return result;
}
test('returns named groups, replacement and splitting in one worker result', () => {
  const result = evaluate('(?<word>fox)', 'gi', 'fox FOX', '$<word>!');
  expect(result.list).toHaveLength(2);
  expect(result.captureGroups).toBe(1);
  expect(result.list[1].named.word).toBe('FOX');
  expect(result.replaced.value).toBe('fox! FOX!');
  expect(result.split.parts).toEqual(['', 'fox', ' ', 'FOX', '']);
});
test('sticky-only evaluation respects the non-global flag', () => {
  expect(evaluate('a', 'y', 'aaa').list).toHaveLength(1);
});
test('unicode zero-length matches advance safely', () => {
  expect(evaluate('(?:)', 'gu', '😀').list.map((match: any) => match.index)).toEqual([0, 2]);
});
test('distinguishes empty output from an invalid pattern', () => {
  expect(evaluate('.*', 'g', 'abc', '').replaced.value).toBe('');
  expect(evaluate('[', 'g', 'abc').error).toBeTruthy();
});
test('bounds large input and match lists', () => {
  expect(evaluate('.', 'g', 'a'.repeat(100001)).error).toContain('100,000');
  const result = evaluate('a', 'g', 'a'.repeat(6000));
  expect(result.list).toHaveLength(5000);
  expect(result.truncated).toBe(true);
});

test('bounds expanded replacement output before sending it to the page', () => {
  const result = evaluate('a', 'g', 'a'.repeat(1000), 'x'.repeat(2000));
  expect(result.replaced.error).toContain('1,000,000');
  expect(result.replaced.value).toBe('');
});
test('bounded replacement preserves native substitution semantics', () => {
  for (const [pattern, flags, input, replacement] of [
    ['(a)(b)', 'g', 'ab ab', '$$-$&-$`-$\'-${x}-$1-$2-$12-$99'],
    ['(?<letter>a)(b)?', 'g', 'a ab', '$<letter>:$<missing>:$2'],
    ['(?:)', 'gu', '😀', '_'],
  ]) expect(evaluate(pattern, flags, input, replacement).replaced.value).toBe(input.replace(new RegExp(pattern, flags), replacement));
});
test('bounds serialized named-group keys and capture values, not just matched text', () => {
  const result = evaluate(`(?<${'x'.repeat(9000)}>a)`, 'g', 'a'.repeat(5000));
  expect(JSON.stringify(result).length).toBeLessThan(1100000);
  expect(result.truncated).toBe(true);
});
test('dollar substitution inside a literal named-group placeholder stays native', () => {
  const replacement = '$<label:$&>';
  expect(evaluate('a', 'g', 'a', replacement).replaced.value).toBe('a'.replace(/a/g, replacement));
});
test('oversized individual capture records are flagged rather than reported as no matches', () => {
  const result = evaluate('((((((((((((a+))))))))))))', 'g', 'a'.repeat(100000));
  expect(result.list).toHaveLength(0);
  expect(result.truncated).toBe(true);
  expect(result.replaced.value.length).toBe(100000);
});

test('rejects amplified captures before allocating their serialized JSON', () => {
  let attemptedOversize = false;
  const guardedJson = { ...JSON, stringify(value: any) {
    if (value?.groups?.reduce((size: number, group: string | undefined) => size + (group?.length ?? 0), 0) > 1000000) {
      attemptedOversize = true;
      throw new Error('Oversized serialization intercepted');
    }
    return JSON.stringify(value);
  } } as JSON;
  const result = evaluate('(?=(a+))'.repeat(13) + 'a+', '', 'a'.repeat(100000), '$&', guardedJson);
  expect(attemptedOversize).toBe(false);
  expect(result.list).toHaveLength(0);
  expect(result.truncated).toBe(true);
  expect(result.error).toBeNull();
});

test('bounds unmatched named keys in the same representation used by the UI', () => {
  const key='x'.repeat(9900);
  const result=evaluate(`(?<${key}>z)?.`,'g','a'.repeat(5000));
  expect(result.truncated).toBe(true);
  expect(result.list.reduce((size:number,match:any)=>size+Object.keys(match.named).reduce((sum:number,name:string)=>sum+name.length,0),0)).toBeLessThan(1000000);
  expect(result.list[0].named[key]).toBeNull();
});

test('preflight accounts for JSON escaping before any oversized serialization', () => {
  let oversized=false;
  const guardedJson={...JSON,stringify(value:any){const serialized=JSON.stringify(value);if(serialized.length>1000000){oversized=true;throw new Error('Oversized JSON allocation');}return serialized;}} as JSON;
  const result=evaluate('(?=([\\s\\S]+))'.repeat(3)+'[\\s\\S]+','','\u0001'.repeat(100000),'$&',guardedJson);
  expect(oversized).toBe(false);
  expect(result.list).toHaveLength(0);
  expect(result.truncated).toBe(true);
});

test('bounds aggregate capture fields even when every capture is unmatched',()=>{
  const result=evaluate('(z)?'.repeat(1000)+'.','g','a'.repeat(5000));
  expect(result.truncated).toBe(true);
  expect(result.list.reduce((n:number,row:any)=>n+row.groups.length+Object.keys(row.named).length,0)).toBeLessThanOrEqual(10000);
});

test('size preflight matches normalized JSON for escapes, Unicode and absent captures',()=>{
  const pieces=['a','"','\\','\n','\u0001','😀','\ud800','\udfff','\u2028',''];
  for(const value of pieces){
    const match:any=[value,undefined,'',value];match.index=123;match.groups={word:value,missing:undefined};
    let actual=0;
    runInNewContext(`${script}\nresult(captureRecordSize(match,Object.keys(match.groups),1000000));`,{self:{},match,result:(n:number)=>actual=n});
    const entry={match:value,index:123,length:value.length,groups:[null,'',value],named:{word:value,missing:null}};
    expect(actual).toBe(JSON.stringify(entry).length);
  }
});

test('ordinary large captures that fit are retained without a worst-case multiplier',()=>{
  const result=evaluate('(?=(a+))'.repeat(3)+'a+','','a'.repeat(100000));
  expect(result.list).toHaveLength(1);
  expect(result.truncated).toBe(false);
});
