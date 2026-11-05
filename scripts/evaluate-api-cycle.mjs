import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
const [baseline, candidate, modulePath, output] = process.argv.slice(2);
const fw = await import(pathToFileURL(modulePath));
const parent = '477bc172c94d7852a4fb4d5f0a5cf1d7f0085a4a';
const head = 'dc3373d4df9a72e4fe5c62ededf47413824b4167';
function measure(root) {
  const start = performance.now();
  const command = ['node', `${candidate}/scripts/probe-api.mjs`, `${root}/frontend`];
  const r = spawnSync(command[0], command.slice(1), { encoding: 'utf8', timeout: 15000 });
  if (![0, 1].includes(r.status)) throw Error(r.stderr || 'Incomplete native probe');
  return { command, exit: r.status, elapsedMs: performance.now() - start,
    ...JSON.parse(r.stdout.trim().split('\n').at(-1)) };
}
const trials = [];
for (let i = 0; i < 5; i++) {
  for (const revision of (i % 2 ? [head, parent] : [parent, head])) {
    trials.push({ trial: i, revision, ...measure(revision === head ? candidate : baseline) });
  }
}
const blocked = ['Full npm audit and unchanged80% coverage gate fail',
  'Rust validation incomplete after bounded compilation', 'Required broad CI/approvals not all green',
  'Ruflo worker agent_execute: No LLM provider configured'];
const inverse = { path: 'frontend/src/lib/api/client.ts',
  parentBytes: readFileSync(`${baseline}/frontend/src/lib/api/client.ts`, 'utf8') };
inverse.hash = createHash('sha256').update(inverse.parentBytes).digest('hex');
const evaluations = [];
const result = await fw.runFlywheelGenerations({
  rootPolicy: { revision: parent },
  proposer: async () => ({ value: head, summary: 'Correct empty and non-JSON HTTP responses', inverse }),
  evaluator: async (policy, suite) => {
    const value = measure(policy.revision === head ? candidate : baseline);
    evaluations.push({ revision: policy.revision, suite: suite.id, ...value });
    const itemWins = suite.id === 'holdouts' ? value.cases.map(x => x.pass) : value.anchors;
    return { primary: itemWins.filter(Boolean).length / itemWins.length,
      noopRate: 0, costPerWin: 0, itemWins,
      // Fail-closed complete acceptance flag, not a claim of new source regression.
      regressed: blocked.length > 0 };
  }, promotionRule: fw.meetsPromotionRule,
  holdout: { id: 'holdouts', items: [204, 205, 200, 401, 503, 500, 429] },
  anchor: { id: 'anchors', items: [0, 1, 2, 3, 4, 5, 6, 7] },
  maxGenerations: 1, signer: fw.makeSigner(), dataSource: 'LIVE_NATIVE_HTTP',
});
const gateFingerprint = fw.gateFingerprint(fw.meetsPromotionRule);
const replay = fw.verifyReplayBundle(result.replayBundle, { pinnedGateFingerprint: gateFingerprint });
writeFileSync(output, JSON.stringify({ parent, head, blocked, inverse, trials, evaluations,
  gateFingerprint, replay, promotions: result.promotions, replayBundle: result.replayBundle,
  notes: ['No speedup or cost improvement claimed; retain all trial samples',
    'noopRate/costPerWin zero are neutral unmeasured axes, not savings',
    'Root-only replay; no candidate promotion or production acceptance'] }, null, 2) + '\n');
console.log(JSON.stringify({ trials: trials.length, replay, promotions: result.promotions.length }));
