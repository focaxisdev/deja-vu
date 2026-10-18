// Read-only publication verification. Run on an authorized network-enabled runner.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const expected = JSON.parse(readFileSync(new URL('../release-v0.8.0-fingerprint.json', import.meta.url), 'utf8'));
const { manifest, releaseCommit } = expected;
const spec = `${manifest.name}@${manifest.version}`;
const root = mkdtempSync(join(tmpdir(), 'dejavu-registry-0.8.0-'));
const packCache = join(root, 'pack-cache');
const installCache = join(root, 'install-cache');
const installRoot = join(root, 'install');
mkdirSync(installRoot);
assert.equal(existsSync(packCache), false);
assert.equal(existsSync(installCache), false);
const npmCli = [
  join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
  join(dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js'),
].find(existsSync);
assert.ok(npmCli, 'Use the npm bundled with the selected Node runtime');

function run(file, args, cwd = root) {
  try {
    return execFileSync(file, args, { cwd, encoding: 'utf8', timeout: 120_000, maxBuffer: 8 * 1024 * 1024 });
  } catch (error) {
    // Keep the original execution error and both streams; do not parse failures as JSON.
    console.error({ file, args, status: error.status, signal: error.signal, code: error.code,
      stdout: error.stdout?.toString(), stderr: error.stderr?.toString() });
    throw error;
  }
}
const npm = (args, cache) => run(process.execPath, [npmCli, ...args,
  '--registry=https://registry.npmjs.org', `--cache=${cache}`, '--fetch-retries=0', '--fetch-timeout=30000']);

const metadata = JSON.parse(npm(['view', spec, 'version', 'gitHead', 'dist', '--json'], packCache));
const distTags = JSON.parse(npm(['view', manifest.name, 'dist-tags', '--json'], packCache));
assert.equal(metadata.version, manifest.version);
assert.equal(distTags.latest, manifest.version, 'This closeout checks 0.8.0 as current latest; future releases may supersede it');
assert.equal(metadata.gitHead, releaseCommit);
assert.equal(metadata.dist.integrity, manifest.integrity);
assert.equal(metadata.dist.shasum, manifest.shasum);
assert.equal(metadata.dist.fileCount, manifest.entryCount);
assert.equal(metadata.dist.unpackedSize, manifest.unpackedSize);
assert.equal(metadata.dist.tarball, 'https://registry.npmjs.org/@focaxisdev/deja-vu/-/deja-vu-0.8.0.tgz');
console.log('Verified registry metadata:', JSON.stringify({ metadata, distTags }));

// A registry spec downloads the published archive. It does not pack this checkout.
const packed = JSON.parse(npm(['pack', spec, '--json', '--ignore-scripts', '--pack-destination', root], packCache));
assert.equal(packed.length, 1);
assert.deepEqual(packed[0], manifest, 'Full downloaded manifest must equal the original release CI fingerprint');
const archive = readFileSync(join(root, packed[0].filename));
assert.equal(archive.length, manifest.size);
assert.equal(createHash('sha1').update(archive).digest('hex'), manifest.shasum);
assert.equal(`sha512-${createHash('sha512').update(archive).digest('base64')}`, manifest.integrity);
console.log('Verified actual registry tarball:', JSON.stringify({ files: manifest.entryCount,
  unpackedSize: manifest.unpackedSize, shasum: manifest.shasum, integrity: manifest.integrity }));

// Independent empty cache, exact registry version, normal installation (no script bypass).
assert.equal(existsSync(installCache), false);
writeFileSync(join(installRoot, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
console.log(npm(['install', '--prefix', installRoot, '--save-exact', '--no-audit', '--no-fund', spec], installCache));
const lock = JSON.parse(readFileSync(join(installRoot, 'package-lock.json'), 'utf8'));
const installedEntry = lock.packages['node_modules/@focaxisdev/deja-vu'];
assert.equal(installedEntry.version, manifest.version);
assert.equal(installedEntry.integrity, manifest.integrity);
assert.equal(installedEntry.resolved, metadata.dist.tarball);
const installed = join(installRoot, 'node_modules/@focaxisdev/deja-vu');
const installedManifest = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8'));
assert.equal(installedManifest.version, manifest.version);
const cli = (name, args) => JSON.parse(run(process.execPath, [join(installed, 'scripts', name), ...args], installRoot));
assert.equal(cli('deja-vu.mjs', ['init', '--project-id', 'project:published-smoke', '--json']).ready, true);
assert.equal(cli('deja-vu.mjs', ['doctor', '--json']).ok, true);
const explanation = cli('deja-vu.mjs', ['explain', '--json']).explanation;
for (const text of ['3-file', 'AGENTS.md', 'memory/summary.md', 'memory/impressions.jsonl']) assert.ok(explanation.includes(text));
assert.equal(cli('dejavu-lint-memory.mjs', []).ok, true);
assert.equal(cli('dejavu-scan-memory.mjs', ['project constraints']).ok, true);
assert.equal(cli('dejavu-feedback-report.mjs', []).ok, true);

// Execute the existing installed-package API assertions without duplicating or weakening them.
const packageTest = readFileSync(new URL('../../tests/package-pack.test.ts', import.meta.url), 'utf8');
const smokeStart = 'const smoke = execFileSync(process.execPath, ["--input-type=module", "-e", `';
const start = packageTest.indexOf(smokeStart);
assert.notEqual(start, -1, 'Installed API smoke marker must remain present');
const from = start + smokeStart.length;
const to = packageTest.indexOf('`], { cwd: installRoot, encoding: "utf8" });', from);
assert.ok(to > from, 'Installed API smoke closing marker must remain present');
const smoke = packageTest.slice(from, to);
assert.equal(smoke.includes('${'), false, 'Use a literal standalone smoke body');
const smokePath = join(installRoot, 'installed-api-smoke.mjs');
writeFileSync(smokePath, smoke);
assert.equal(run(process.execPath, [smokePath], installRoot).trim(), 'ok');
console.log('Clean version-pinned installation, CLI init/doctor/explain/lint/scan/feedback and existing installed API smoke: passed');

async function github(path) {
  const response = await fetch(`https://api.github.com/repos/focaxisdev/deja-vu/${path}`, {
    headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(30_000),
  });
  assert.equal(response.status, 200, `Public GitHub read failed: ${path}`);
  return response.json();
}
const tag = await github('git/ref/tags/v0.8.0');
const release = await github('releases/416213665');
assert.equal(tag.object.type, 'commit');
assert.equal(tag.object.sha, releaseCommit);
assert.equal(release.tag_name, 'v0.8.0');
assert.equal(release.target_commitish, releaseCommit);
assert.equal(release.draft, false);
assert.equal(release.prerelease, false);
assert.ok(release.published_at);
const evidence = { node: process.version, npm: run(process.execPath, [npmCli, '--version']).trim(),
  version: manifest.version, latest: distTags.latest, gitHead: metadata.gitHead, tag: tag.object.sha,
  release: release.html_url, releaseId: release.id, publishedAt: release.published_at,
  fingerprintSource: expected.ci, integrity: manifest.integrity, shasum: manifest.shasum,
  files: manifest.entryCount, unpackedSize: manifest.unpackedSize, allGatesPassed: true };
writeFileSync(join(root, 'verification.json'), JSON.stringify(evidence, null, 2));
console.log('Published release verification:', JSON.stringify(evidence));
