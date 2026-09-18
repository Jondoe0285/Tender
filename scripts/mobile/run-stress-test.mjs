import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const output = process.env.MOBILE_STRESS_RESULTS_DIR ?? 'mobile-stress-test-results';
const evidenceDirectory = process.env.MOBILE_STRESS_EVIDENCE_DIR ?? 'mobile-stress-test-evidence';
const targets = [
  ['Android', process.env.ANDROID_STAGING_BASE_URL],
  ['iOS', process.env.IOS_STAGING_BASE_URL],
];
const findings = [];

function add(severity, category, detail, recommendation) {
  findings.push({ severity, category, detail, recommendation });
}

function inspectMobileContract() {
  const app = JSON.parse(readFileSync('mobile/app.json', 'utf8'));
  const appSource = readFileSync('mobile/App.tsx', 'utf8');
  const session = readFileSync('mobile/src/auth/session.ts', 'utf8');
  const client = readFileSync('mobile/src/api/client.ts', 'utf8');
  if (!app.expo.android?.package || !app.expo.ios?.bundleIdentifier) add('CRITICAL', 'security', 'Android or iOS package identity is missing.', 'Configure package identities before creating test artifacts.');
  if (!session.includes('SecureStore')) add('CRITICAL', 'security', 'Mobile credentials are not stored in secure device storage.', 'Use Expo SecureStore for every device credential.');
  if (!client.includes('Authorization: `Bearer')) add('CRITICAL', 'security', 'Protected mobile calls do not send a bearer credential.', 'Use the server-issued mobile bearer token for protected calls.');
  if (!appSource.includes('ExpoLinking.parse') || !appSource.includes('loadMobileReleaseStatus')) add('HIGH', 'security', 'Payment return does not refresh a server-confirmed state.', 'Refresh unlock and contact-release status after a payment return.');
  if (!appSource.includes('termsAccepted')) add('HIGH', 'security', 'Mobile registration lacks explicit terms consent.', 'Require a user-driven terms acknowledgement.');
}

async function probe(platform, configuredUrl) {
  if (!configuredUrl?.startsWith('https://')) {
    add('CRITICAL', 'network', `${platform} staging URL is missing or does not use HTTPS.`, `Set ${platform === 'Android' ? 'ANDROID' : 'IOS'}_STAGING_BASE_URL to the approved HTTPS staging origin.`);
    return;
  }
  const baseUrl = configuredUrl.replace(/\/$/, '');
  try {
    const started = performance.now();
    const health = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(15_000) });
    const body = await health.json().catch(() => null);
    if (!health.ok || body?.status !== 'ok' || body?.database !== 'ok') add('CRITICAL', 'network', `${platform} staging health/database check failed.`, 'Restore the staging application and database before mobile testing.');
    else findings.push({ severity: 'INFO', category: 'performance', detail: `${platform} health response ${Math.round(performance.now() - started)}ms.` });
  } catch {
    add('CRITICAL', 'network', `${platform} staging is unreachable.`, 'Provide a reachable HTTPS staging service.');
  }
  for (const route of ['/api/client/profile', '/api/tenders', '/api/mobile/opportunities', '/api/mobile/auth/logout']) {
    try {
      const response = await fetch(`${baseUrl}${route}`, { method: route.endsWith('logout') ? 'POST' : 'GET', signal: AbortSignal.timeout(15_000) });
      if (![401, 403].includes(response.status)) add('CRITICAL', 'security', `${platform} protected endpoint ${route} returned ${response.status} without credentials.`, 'Require server authentication before endpoint processing.');
    } catch {
      add('HIGH', 'network', `${platform} could not probe ${route}.`, 'Investigate endpoint reachability.');
    }
  }
}

function assessDeviceEvidence() {
  const evidencePath = path.join(evidenceDirectory, 'device-evidence.json');
  let evidenceText = process.env.MOBILE_STRESS_DEVICE_EVIDENCE;
  if (!evidenceText && existsSync(evidencePath)) evidenceText = readFileSync(evidencePath, 'utf8');
  if (!evidenceText) {
    add('CRITICAL', 'performance', 'No Android/iOS device evidence covers launch, lifecycle, memory, battery, ANR/crashes, frame rate, or 1/4/8-hour soak tests.', 'Run physical-device or device-farm tests and save evidence to mobile-stress-test-evidence/device-evidence.json.');
    add('CRITICAL', 'network', 'No device evidence covers offline, network handover, latency, packet loss, outage recovery, or notification delivery.', 'Run the network, offline, failure, and notification test matrices on Android and iOS.');
    return;
  }
  try {
    const evidence = JSON.parse(evidenceText);
    for (const platform of ['android', 'ios']) {
      const result = evidence[platform];
      if (!result?.deviceClasses?.includes('small-phone') || !result.deviceClasses.includes('standard-phone') || !result.deviceClasses.includes('large-phone')) add('HIGH', 'performance', `${platform} evidence lacks required phone-size coverage.`, 'Cover small, standard, and large phones; add tablets where supported.');
      if ((result?.soakHours ?? 0) < 8) add('HIGH', 'battery', `${platform} evidence lacks an 8-hour soak test.`, 'Run 1, 4, and 8-hour continuous workflow simulations.');
      if ((result?.criticalFindings ?? 0) > 0) add('CRITICAL', 'crash', `${platform} evidence records critical findings.`, 'Resolve all critical findings before release.');
    }
  } catch {
    add('CRITICAL', 'security', 'Device evidence is not valid JSON.', 'Regenerate the evidence from the mobile test runner.');
  }
}

mkdirSync(output, { recursive: true });
inspectMobileContract();
for (const [platform, url] of targets) await probe(platform, url);
assessDeviceEvidence();
const grouped = Object.fromEntries(['crash', 'performance', 'battery', 'security', 'network'].map((category) => [category, findings.filter((finding) => finding.category === category)]));
for (const [category, entries] of Object.entries(grouped)) {
  const name = category === 'network' ? 'network-resilience-report' : `${category}-report`;
  writeFileSync(path.join(output, `${name}.json`), `${JSON.stringify(entries, null, 2)}\n`);
}
const recommendations = findings.map(({ severity, recommendation }) => ({ severity, recommendation })).filter((entry) => entry.recommendation);
writeFileSync(path.join(output, 'recommendations.json'), `${JSON.stringify(recommendations, null, 2)}\n`);
const critical = findings.filter((finding) => finding.severity === 'CRITICAL').length;
const high = findings.filter((finding) => finding.severity === 'HIGH').length;
const score = Math.max(0, 100 - critical * 25 - high * 10);
const verdict = critical ? 'FAIL' : high ? 'PASS WITH RISKS' : 'PASS';
writeFileSync(path.join(output, 'launch-readiness.json'), `${JSON.stringify({ verdict, score, findings, generatedAt: new Date().toISOString() }, null, 2)}\n`);
writeFileSync(path.join(output, 'launch-readiness.md'), `# Mobile Stress Test\n\n## Verdict\n\n${verdict}\n\n## Launch Readiness Score\n\n${score}/100\n\n## Findings\n\n${findings.map((finding) => `- **${finding.severity}** ${finding.category}: ${finding.detail}`).join('\n') || '- None'}\n`);
console.log(`Mobile release readiness: ${verdict} (${score}/100)`);
console.log(`Reports: ${output}`);
if (critical) process.exit(1);