import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, query, where, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getBytes, deleteObject } from 'firebase/storage';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
  throw new Error('Run this suite through Firebase emulators:exec; it never connects to a live project.');
}
const projectId = 'demo-secondcare';
const now = Timestamp.now();
const authTime = Math.floor(Date.now() / 1000);
let env;
/**
 * storage.rules authorizes medical files by reading Firestore (cross-service
 * rules). The Storage emulator does not evaluate firestore.get/exists and
 * denies every such rule, so those cases are skipped here rather than reported
 * as rule failures. They still apply in production — verify them against a
 * staging bucket. Probed rather than hardcoded, so the suite starts covering
 * them as soon as the emulator supports it.
 */
let crossServiceRules = false;
const user = (uid, role = 'patient', access = null) => ({
  uid, email: `${uid}@example.test`, role, fullName: `Test ${uid}`, phone: '9876543210',
  dob: null, place: null, photoURL: null, photoPath: null, status: 'active', isVerified: true,
  settings: { emailNotifications: true, language: 'en' }, sessionsRevokedAt: null,
  doctorAccess: access, createdAt: now, updatedAt: now, lastLogin: now,
});
const doctor = (uid, status = 'VERIFIED', specialization = 'Cardiology') => ({
  uid, email: `${uid}@example.test`, fullName: `Test ${uid}`, phone: '9876543210', regNumber: 'REG123',
  council: 'State Medical Council', specialization, experience: 5, files: [], status,
  createdAt: now, updatedAt: now, reviewedAt: now,
});
const medicalFile = (uid, id, name = 'report.pdf') => ({name, path: `users/${uid}/cases/${id}/${name}`, size: 8, contentType: 'application/pdf'});
const consultation = (id, ownerId = 'patient1', paid = true) => ({
  ownerId, department: 'Cardiology', chiefComplaint: 'A sufficiently detailed synthetic medical concern.',
  medications: '', files: [medicalFile(ownerId,id)], consentAt: new Date().toISOString(), amount: 1650,
  status: paid ? 'IN_REVIEW' : 'AWAITING_PAYMENT', paymentStatus: paid ? 'PAID' : 'PENDING',
  paymentId: paid ? `pay_${id}` : null, paymentOrderId: paid ? `order_${id}` : null,
  doctorId: paid ? 'doctor1' : null, doctorName: paid ? 'Test doctor1' : null, assignedAt: paid ? now : null, opinion: null, paidAt: paid ? now : null,
  createdAt: now, completedAt: null,
});
const context = (uid, overrides = {}) => env.authenticatedContext(uid, {
  email: `${uid}@example.test`, email_verified: true, auth_time: authTime, ...overrides,
});
before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: { rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') },
    storage: { rules: await readFile(new URL('../storage.rules', import.meta.url), 'utf8') },
  });
  const probe = await initializeTestEnvironment({
    projectId: 'demo-crossservice-probe',
    firestore: { rules: `rules_version='2'; service cloud.firestore { match /databases/{d}/documents { match /{a=**} { allow read, write: if true; } } }` },
    storage: { rules: `rules_version='2'; service firebase.storage { match /b/{b}/o { match /probe/{f} { allow write: if firestore.exists(/databases/(default)/documents/users/$(request.auth.uid)); } } }` },
  });
  try {
    await probe.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'users', 'probe'), { ok: true }));
    await uploadBytes(ref(probe.authenticatedContext('probe', { email_verified: true }).storage(), 'probe/a.pdf'),
      new Uint8Array(4), { contentType: 'application/pdf' });
    crossServiceRules = true;
  } catch {
    crossServiceRules = false;
  } finally {
    await probe.cleanup();
  }
  if (!crossServiceRules) {
    console.log('# storage emulator cannot evaluate cross-service firestore.* rules: Storage cases skipped');
  }
});
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await Promise.all([
      setDoc(doc(db,'users','patient1'),user('patient1')),
      setDoc(doc(db,'users','patient2'),user('patient2')),
      setDoc(doc(db,'users','admin'),user('admin','admin')),
      ...['doctor1','doctor2','doctor3','pending'].flatMap((uid) => {
        const status = uid === 'pending' ? 'PENDING' : 'VERIFIED';
        const specialization = uid === 'doctor2' ? 'Neurology' : 'Cardiology';
        return [setDoc(doc(db,'users',uid),user(uid,'doctor',{status,specialization})),setDoc(doc(db,'doctorProfiles',uid),doctor(uid,status,specialization))];
      }),
      setDoc(doc(db,'cases','paid'),consultation('paid')),
      setDoc(doc(db,'cases','unpaid'),consultation('unpaid','patient1',false)),
    ]);
    await uploadBytes(ref(ctx.storage(),medicalFile('patient1','paid').path),new Uint8Array(8),{contentType:'application/pdf'});
  });
});

test('anonymous, unverified, cross-patient, and non-admin collection reads are denied', async () => {
  for (const ctx of [env.unauthenticatedContext(), context('patient2'), context('patient1',{email_verified:false})]) {
    await assertFails(getDoc(doc(ctx.firestore(),'cases','paid')));
  }
  await assertSucceeds(getDoc(doc(context('patient1').firestore(),'cases','paid')));
  await assertFails(getDocs(collection(context('patient1').firestore(),'users')));
  await assertSucceeds(getDocs(collection(context('admin').firestore(),'users')));
});

test('self registration cannot grant admin, verification, or another identity', async () => {
  const db = context('new').firestore();
  const data = {...user('new'),createdAt:serverTimestamp(),updatedAt:serverTimestamp(),lastLogin:serverTimestamp()};
  await assertFails(setDoc(doc(db,'users','new'),{...data,role:'admin'}));
  await assertFails(setDoc(doc(db,'users','other'),data));
  await assertSucceeds(setDoc(doc(db,'users','new'),data));
  await assertFails(updateDoc(doc(db,'users','new'),{role:'admin'}));
  await assertFails(updateDoc(doc(db,'users','new'),{doctorAccess:{status:'VERIFIED',specialization:'Cardiology'}}));
});

test('doctor registration is atomic and partial existing applications can recover', async () => {
  const db = context('newdoctor').firestore();
  const application = {...doctor('newdoctor','PENDING'),createdAt:serverTimestamp(),updatedAt:serverTimestamp(),reviewedAt:null,
    files:[{name:'license.pdf',path:'users/newdoctor/credentials/license.pdf',size:8,contentType:'application/pdf'}]};
  const profile = {...user('newdoctor','doctor',{status:'PENDING',specialization:'Cardiology'}),createdAt:serverTimestamp(),updatedAt:serverTimestamp(),lastLogin:serverTimestamp()};
  await assertFails(setDoc(doc(db,'doctorProfiles','newdoctor'),application));
  const batch=writeBatch(db); batch.set(doc(db,'users','newdoctor'),profile); batch.set(doc(db,'doctorProfiles','newdoctor'),application);
  await assertSucceeds(batch.commit());
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(),'doctorProfiles','orphan'),doctor('orphan','PENDING')));
  const orphan = {...user('orphan','doctor',{status:'PENDING',specialization:'Cardiology'}),createdAt:serverTimestamp(),updatedAt:serverTimestamp(),lastLogin:serverTimestamp()};
  await assertSucceeds(setDoc(doc(context('orphan').firestore(),'users','orphan'),orphan));
});

test('approval must update the authorization mirror atomically and cannot be self-granted', async () => {
  await assertFails(updateDoc(doc(context('pending').firestore(),'doctorProfiles','pending'),{status:'VERIFIED',reviewedAt:serverTimestamp()}));
  const db=context('admin').firestore();
  await assertFails(updateDoc(doc(db,'doctorProfiles','pending'),{status:'VERIFIED',reviewedAt:serverTimestamp()}));
  const batch=writeBatch(db);
  batch.update(doc(db,'doctorProfiles','pending'),{status:'VERIFIED',reviewedAt:serverTimestamp()});
  batch.update(doc(db,'users','pending'),{doctorAccess:{status:'VERIFIED',specialization:'Cardiology'}});
  await assertSucceeds(batch.commit());
});

test('clients cannot claim payment or alter the amount and reports stay owner scoped', async () => {
  const db=context('patient1').firestore();
  const data={...consultation('new','patient1',false),createdAt:serverTimestamp(),files:[]};
  await assertFails(setDoc(doc(db,'cases','new'),{...data,status:'IN_REVIEW',paymentStatus:'PAID',paidAt:serverTimestamp()}));
  await assertFails(setDoc(doc(db,'cases','new'),{...data,amount:1}));
  await assertSucceeds(setDoc(doc(db,'cases','new'),data));
  await assertFails(updateDoc(doc(db,'cases','new'),{paymentStatus:'PAID'}));
  await assertFails(updateDoc(doc(db,'cases','new'),{files:[medicalFile('patient2','new')]}));
  await assertSucceeds(updateDoc(doc(db,'cases','new'),{files:[medicalFile('patient1','new')]}));
  await assertFails(updateDoc(doc(db,'cases','paid'),{chiefComplaint:'Changing a case after payment should not work.'}));
});

test('only verified matching specialists see paid cases; completion cannot be overwritten', async () => {
  for (const uid of ['pending','doctor2','doctor3']) await assertFails(getDoc(doc(context(uid).firestore(),'cases','paid')));
  const db=context('doctor1').firestore();
  await assertFails(getDoc(doc(db,'cases','unpaid')));
  await assertSucceeds(getDocs(query(collection(db,'cases'),where('doctorId','==','doctor1'),where('department','==','Cardiology'),where('status','==','IN_REVIEW'),where('paymentStatus','==','PAID'))));
  const completion={status:'COMPLETED',doctorId:'doctor1',doctorName:'Test doctor1',opinion:'Synthetic written specialist opinion for testing.',completedAt:serverTimestamp()};
  await assertFails(updateDoc(doc(db,'cases','paid'),{...completion,doctorId:'doctor2'}));
  await assertSucceeds(updateDoc(doc(db,'cases','paid'),completion));
  await assertFails(updateDoc(doc(db,'cases','paid'),{opinion:'A second opinion must not overwrite a completed record.'}));
  assert.equal((await getDoc(doc(context('patient1').firestore(),'cases','paid'))).data().opinion,completion.opinion);
});

test('disabled and revoked sessions cannot read data or files', async () => {
  await env.withSecurityRulesDisabled(async ctx => {
    await updateDoc(doc(ctx.firestore(),'users','patient1'),{sessionsRevokedAt:Timestamp.fromMillis(Date.now()+1000)});
    await updateDoc(doc(ctx.firestore(),'users','doctor1'),{status:'disabled'});
  });
  for (const uid of ['patient1','doctor1']) {
    await assertFails(getDoc(doc(context(uid).firestore(),'cases','paid')));
    if (crossServiceRules) await assertFails(getBytes(ref(context(uid).storage(),medicalFile('patient1','paid').path)));
  }
});

test('private report reads allow owner/admin/matching doctor and deny everyone else', async (t) => {
  if (!crossServiceRules) return t.skip('Storage emulator cannot evaluate cross-service firestore.* rules');
  const path=medicalFile('patient1','paid').path;
  for (const uid of ['patient1','admin','doctor1']) await assertSucceeds(getBytes(ref(context(uid).storage(),path)));
  for (const uid of ['patient2','doctor2','doctor3','pending']) await assertFails(getBytes(ref(context(uid).storage(),path)));
  await assertFails(getBytes(ref(env.unauthenticatedContext().storage(),path)));
});

test('upload ownership, content type, immutability and cleanup are enforced', async (t) => {
  if (!crossServiceRules) return t.skip('Storage emulator cannot evaluate cross-service firestore.* rules');
  const own=context('patient1').storage();
  const path=medicalFile('patient1','unpaid').path;
  const bytes=new Uint8Array(8);
  await assertFails(uploadBytes(ref(context('patient2').storage(),path),bytes,{contentType:'application/pdf'}));
  await assertFails(uploadBytes(ref(own,path),bytes,{contentType:'text/html'}));
  await assertSucceeds(uploadBytes(ref(own,path),bytes,{contentType:'application/pdf'}));
  await assertFails(uploadBytes(ref(own,path),bytes,{contentType:'application/pdf'}));
  await assertSucceeds(deleteObject(ref(own,path)));
  await assertFails(deleteObject(ref(own,medicalFile('patient1','paid').path)));
});

/**
 * Rules evaluation is capped at 1000 expressions per request. Before the
 * per-attachment check was reduced to two references to `files[i]`, attaching
 * three or more reports exceeded that cap and Firestore denied the write — so
 * these cover the budget, not just the authorization logic.
 */
const report = (uid, id, n, ext = 'pdf') => ({
  name: `report${n}.${ext}`, path: `users/${uid}/cases/${id}/report${n}.${ext}`,
  size: 1024, contentType: 'application/pdf',
});
const draft = (id, ownerId = 'patient1') => ({
  ...consultation(id, ownerId, false), files: [], createdAt: serverTimestamp(),
});

test('a patient can attach the full advertised number of reports', async () => {
  const db = context('patient1').firestore();
  for (const count of [1, 2, 3, 10, 20]) {
    const id = `attach${count}`;
    await assertSucceeds(setDoc(doc(db, 'cases', id), draft(id)));
    const files = Array.from({ length: count }, (_, i) => report('patient1', id, i));
    await assertSucceeds(updateDoc(doc(db, 'cases', id), { files }));
    assert.equal((await getDoc(doc(db, 'cases', id))).data().files.length, count);
  }
  const over = Array.from({ length: 21 }, (_, i) => report('patient1', 'attach20', i));
  await assertFails(updateDoc(doc(db, 'cases', 'attach20'), { files: over }));
});

test('a doctor can submit the full number of credential documents', async () => {
  const db = context('bulkdoc').firestore();
  const credential = (n, ext = 'pdf') => ({
    name: `credential${n}.${ext}`, path: `users/bulkdoc/credentials/credential${n}.${ext}`,
    size: 1024, contentType: 'application/pdf',
  });
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', 'bulkdoc'), { ...user('bulkdoc', 'doctor', { status: 'PENDING', specialization: 'Cardiology' }),
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(), lastLogin: serverTimestamp() });
  batch.set(doc(db, 'doctorProfiles', 'bulkdoc'), { ...doctor('bulkdoc', 'PENDING'),
    files: [credential(0), credential(1, 'JPG'), credential(2), credential(3), credential(4)],
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(), reviewedAt: null });
  await assertSucceeds(batch.commit());
});

test('attachment paths stay inside the owner folder and keep an allowed extension', async () => {
  const db = context('patient1').firestore();
  let seq = 0;
  // Each attempt uses its own unpaid consultation: re-creating one would be an
  // update of immutable fields and would fail for an unrelated reason.
  const attach = async (change) => {
    const id = `shape${seq++}`;
    await assertSucceeds(setDoc(doc(db, 'cases', id), draft(id)));
    return updateDoc(doc(db, 'cases', id), { files: [{ ...report('patient1', id, 0), ...change(id) }] });
  };
  // Another patient's folder, another case, a sub-path, traversal, and an
  // unknown key are all rejected.
  await assertFails(attach((id) => ({ path: `users/patient2/cases/${id}/report0.pdf` })));
  await assertFails(attach(() => ({ path: 'users/patient1/cases/othercase/report0.pdf' })));
  await assertFails(attach((id) => ({ path: `users/patient1/cases/${id}/sub/report0.pdf` })));
  await assertFails(attach((id) => ({ path: `users/patient1/cases/${id}/../../patient2/report0.pdf` })));
  await assertFails(attach(() => ({ injected: 'x' })));
  // Executable and markup extensions are rejected; the advertised types, in any
  // letter case, are accepted.
  for (const ext of ['exe', 'html', 'svg', 'js']) {
    await assertFails(attach((id) => ({ path: `users/patient1/cases/${id}/report0.${ext}`, name: `report0.${ext}` })));
  }
  for (const ext of ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'PDF', 'JpG']) {
    await assertSucceeds(attach((id) => ({ path: `users/patient1/cases/${id}/report0.${ext}`, name: `report0.${ext}` })));
  }
  // Reports are attached by a later update, never at create time.
  await assertFails(setDoc(doc(db, 'cases', 'preattached'),
    { ...draft('preattached'), files: [report('patient1', 'preattached', 0)] }));
});
