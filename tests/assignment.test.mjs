import { after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error('Assignment tests require FIRESTORE_EMULATOR_HOST; they never connect to a live project.');
}
const app = initializeApp({ projectId: 'demo-secondcare-assignment' }, 'assignment-tests');
const database = getFirestore(app);
const require = createRequire(import.meta.url);
const modules = new Map();
// Compile actual server code while replacing only its environment-owned database provider.
function loadModule(path) {
  if (modules.has(path)) return modules.get(path).exports;
  const module = { exports: {} };
  modules.set(path, module);
  const output = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const scopedRequire = (name) => {
    if (name === 'server-only') return {};
    if (name === './firebase-admin') return { adminDb: () => database };
    if (name.startsWith('.')) return loadModule(resolve(dirname(path), `${name}.ts`));
    return require(name);
  };
  // Compiled in this realm, not a vm context: firebase-admin checks the
  // transaction callback's result with `instanceof Promise`, which fails across
  // realms, and application modules legitimately read process.env. Isolation
  // comes from scopedRequire above, which is all this loader needs.
  new Function('require', 'module', 'exports', output)(scopedRequire, module, module.exports);
  return module.exports;
}
const { assignCase, assignPendingCases } = loadModule(fileURLToPath(new URL('../src/lib/server/assignment.ts', import.meta.url)));
const now = Timestamp.now();

beforeEach(async () => {
  for (const collection of await database.listCollections()) {
    const references = await collection.listDocuments();
    if (references.length) {
      const batch = database.batch();
      references.forEach((reference) => batch.delete(reference));
      await batch.commit();
    }
  }
});
after(async () => { await database.terminate(); await deleteApp(app); });

async function doctor(uid, { status = 'VERIFIED', specialization = 'Cardiology', accountStatus = 'active', lastAssignedAt = null } = {}) {
  await database.doc(`doctorProfiles/${uid}`).set({ uid, fullName: `Doctor ${uid}`, status, specialization, lastAssignedAt });
  await database.doc(`users/${uid}`).set({
    uid, role: 'doctor', status: accountStatus, isVerified: true,
    doctorAccess: { status, specialization },
  });
}
async function consultation(id, overrides = {}) {
  await database.doc(`cases/${id}`).set({
    ownerId: 'patient', department: 'Cardiology', status: 'IN_REVIEW', paymentStatus: 'PAID',
    paymentId: `pay_${id}`, paidAt: now, doctorId: null, doctorName: null, assignedAt: null, ...overrides,
  });
}

test('only an active, verified doctor with the matching specialty is assigned', async () => {
  await doctor('a-disabled', { accountStatus: 'disabled' });
  await doctor('b-pending', { status: 'PENDING' });
  await doctor('c-neuro', { specialization: 'Neurology' });
  await doctor('d-eligible');
  await consultation('case-1');
  const result = await assignCase('case-1');
  assert.equal(result.status, 'assigned');
  assert.equal(result.doctorId, 'd-eligible');
  const saved = (await database.doc('cases/case-1').get()).data();
  assert.equal(saved.doctorName, 'Doctor d-eligible');
  assert.ok(saved.assignedAt instanceof Timestamp);
  assert.equal((await database.collection('assignmentAudit').get()).size, 1);
});

test('no available specialist leaves paid cases waiting; a later approval can assign them', async () => {
  await consultation('case-1');
  assert.equal((await assignCase('case-1')).status, 'waiting');
  assert.equal((await database.doc('cases/case-1').get()).data().doctorId, null);
  await doctor('doctor-new');
  const result = await assignPendingCases({ specialization: 'Cardiology', limit: 50 });
  assert.equal(result.assigned, 1);
  assert.equal(result.nextCursor, null);
});

test('concurrent retries assign one doctor once without advancing the rotation twice', async () => {
  await doctor('a-doctor');
  await doctor('b-doctor');
  await consultation('same-case');
  const results = await Promise.all([assignCase('same-case'), assignCase('same-case')]);
  assert.equal(results.filter((result) => result.status === 'assigned').length, 1);
  assert.equal(results.filter((result) => result.status === 'already-assigned').length, 1);
  assert.equal(results[0].doctorId, results[1].doctorId);
  assert.equal((await database.collection('assignmentAudit').get()).size, 1);
});

test('concurrent consultations rotate across equally qualified doctors', async () => {
  await doctor('a-doctor');
  await doctor('b-doctor');
  await consultation('case-a');
  await consultation('case-b');
  const results = await Promise.all([assignCase('case-a'), assignCase('case-b')]);
  assert.equal(new Set(results.map((result) => result.doctorId)).size, 2);
});

test('least recently assigned eligible doctor is selected', async () => {
  await doctor('a-recent', { lastAssignedAt: Timestamp.fromMillis(2000) });
  await doctor('z-older', { lastAssignedAt: Timestamp.fromMillis(1000) });
  await consultation('case-1');
  assert.equal((await assignCase('case-1')).doctorId, 'z-older');
});

test('unpaid and completed cases cannot enter assignment', async () => {
  await doctor('doctor');
  await consultation('unpaid', { status: 'AWAITING_PAYMENT', paymentStatus: 'PENDING', paymentId: null, paidAt: null });
  await consultation('completed', { status: 'COMPLETED' });
  await consultation('no-proof', { paymentId: null });
  for (const id of ['unpaid', 'completed', 'no-proof']) {
    assert.equal((await assignCase(id)).status, 'ineligible');
    assert.equal((await database.doc(`cases/${id}`).get()).data().doctorId, null);
  }
});

test('disabling an assigned doctor transfers an open case to another matching specialist', async () => {
  await doctor('a-original');
  await doctor('b-replacement');
  await consultation('case-1');
  assert.equal((await assignCase('case-1')).doctorId, 'a-original');
  await database.doc('users/a-original').update({ status: 'disabled' });
  const result = await assignPendingCases({ limit: 50 });
  assert.equal(result.assigned, 1);
  assert.equal((await database.doc('cases/case-1').get()).data().doctorId, 'b-replacement');
});

test('an invalid assignment is cleared when no replacement is available', async () => {
  await doctor('doctor');
  await consultation('case-1');
  await assignCase('case-1');
  await database.doc('doctorProfiles/doctor').update({ status: 'REJECTED' });
  assert.equal((await assignCase('case-1')).status, 'waiting');
  const saved = (await database.doc('cases/case-1').get()).data();
  assert.equal(saved.doctorId, null);
  assert.equal(saved.doctorName, null);
  assert.equal(saved.assignedAt, null);
  assert.equal(saved.status, 'IN_REVIEW');
  assert.equal(saved.paymentStatus, 'PAID');
});

test('sweeps expose a cursor so an unavailable specialty cannot starve a later case', async () => {
  await consultation('a-unavailable', { department: 'Neurology' });
  await consultation('b-available');
  await doctor('doctor');
  const first = await assignPendingCases({ limit: 1 });
  assert.equal(first.waiting, 1);
  assert.equal(first.nextCursor, 'a-unavailable');
  const second = await assignPendingCases({ limit: 1, afterCaseId: first.nextCursor });
  assert.equal(second.assigned, 1);
  assert.equal(second.nextCursor, null);
});
