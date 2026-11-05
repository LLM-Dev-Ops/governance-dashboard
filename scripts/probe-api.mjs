import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { createServer } from 'node:http';
const root = resolve(process.argv[2] || 'frontend');
const require = createRequire(`${root}/package.json`);
const { build } = require('esbuild');
const compiled = await build({
  entryPoints: [`${root}/src/lib/api/client.ts`], bundle: true, write: false,
  platform: 'node', format: 'esm', plugins: [{ name: 'server-environment', setup(b) {
    b.onResolve({ filter: /^\$app\/environment$/ }, () => ({ path: 'environment', namespace: 'test-env' }));
    b.onLoad({ filter: /.*/, namespace: 'test-env' }, () => ({ contents: 'export const browser = false;' }));
  } }],
});
const { ApiClient } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const fixtures = [
  [204, '', true], [205, '', true], [200, '', true],
  [401, '<html>unauthorized</html>', false], [503, '', false],
  [500, 'null', false], [429, '{invalid', false],
];
const server = createServer(async (req, res) => {
  if (req.url.startsWith('/case/')) {
    const [status, body] = fixtures[Number(req.url.slice(6))];
    res.writeHead(status); res.end(body); return;
  }
  if (req.url === '/error') {
    res.writeHead(400); res.end(JSON.stringify({ detail: 'invalid', error_code: 'VALIDATION' })); return;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ url: req.url, authorization: req.headers.authorization,
    method: req.method, body: Buffer.concat(chunks).toString() }));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const cases = [], anchors = [];
try {
  const client = new ApiClient(`http://127.0.0.1:${server.address().port}`);
  for (let i = 0; i < fixtures.length; i++) {
    const [status, , success] = fixtures[i];
    try {
      const result = await client.get(`/case/${i}`);
      cases.push({ id: i, status, pass: success && result.success && result.data === undefined });
    } catch (e) { cases.push({ id: i, status, pass: !success && e.status_code === status }); }
  }
  const normal = await client.get('/echo');
  anchors.push(normal.success && normal.data.method === 'GET');
  const query = await client.get('/echo', { a: 'hello world', zero: 0, nil: null });
  anchors.push(query.data.url === '/echo?a=hello+world&zero=0');
  client.setToken('public-fixture-token');
  anchors.push(client.getToken() === 'public-fixture-token');
  anchors.push((await client.get('/echo')).data.authorization === 'Bearer public-fixture-token');
  for (const method of ['post', 'put', 'patch']) {
    const result = await client[method]('/echo', { value: 1 });
    anchors.push(result.data.method === method.toUpperCase() && result.data.body === '{"value":1}');
  }
  try { await client.get('/error'); anchors.push(false); }
  catch (e) { anchors.push(e.status_code === 400 && e.detail === 'invalid' && e.error_code === 'VALIDATION'); }
  console.log(JSON.stringify({ cases, passed: cases.filter(c => c.pass).length, anchors,
    anchorsPassed: anchors.filter(Boolean).length }));
  process.exitCode = cases.every(c => c.pass) && anchors.every(Boolean) ? 0 : 1;
} finally { await new Promise(r => server.close(r)); }
