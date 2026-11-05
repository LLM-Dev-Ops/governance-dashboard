import { beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

let result: { cases: { status: number; pass: boolean }[]; anchors: boolean[] };
beforeAll(() => {
  // Real client and native fetch against a loopback server; no mocked fetch.
  result = JSON.parse(execFileSync(process.execPath,
    [resolve('../scripts/probe-api.mjs'), process.cwd()],
    { encoding: 'utf8', timeout: 15000 }).trim());
});

describe('API HTTP response semantics', () => {
  for (const [index, status] of [204, 205, 200, 401, 503, 500, 429].entries()) {
    it(`handles HTTP ${status} case ${index}`, () => {
      expect(result.cases[index].pass).toBe(true);
    });
  }
  for (const [index, name] of ['GET', 'query', 'token', 'authorization', 'POST', 'PUT', 'PATCH', 'JSON error'].entries()) {
    it(`preserves ${name}`, () => {
      expect(result.anchors[index]).toBe(true);
    });
  }
});
