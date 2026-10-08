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
    await assertFails(getBytes(ref(context(uid).storage(),medicalFile('patient1','paid').path)));
  }
});

test('private report reads allow owner/admin/matching doctor and deny everyone else', async () => {
  const path=medicalFile('patient1','paid').path;
  for (const uid of ['patient1','admin','doctor1']) await assertSucceeds(getBytes(ref(context(uid).storage(),path)));
  for (const uid of ['patient2','doctor2','doctor3','pending']) await assertFails(getBytes(ref(context(uid).storage(),path)));
  await assertFails(getBytes(ref(env.unauthenticatedContext().storage(),path)));
});

test('upload ownership, content type, immutability and cleanup are enforced', async () => {
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
