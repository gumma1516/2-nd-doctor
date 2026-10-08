const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
function loader(stubs = {}, globals = {}) {
  const cache = new Map();
  return function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename);
    const source = fs.readFileSync(filename, "utf8");
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const module = { exports: {} };
    cache.set(filename, module.exports);
    const resolve = (id) => {
      if (id in stubs) return stubs[id];
      if (id.startsWith("@/")) return load(`src/${id.slice(2)}.ts`);
      if (id.startsWith(".")) return load(path.relative(root, path.resolve(path.dirname(filename), `${id}.ts`)));
      return require(id);
    };
    vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { URL, Date, console, process, ...globals }, { filename })(resolve, module, module.exports);
    return module.exports;
  };
}
const plain = (value) => JSON.parse(JSON.stringify(value));

test("email links round-trip patient/doctor intent on another device and cannot select admin", () => {
  const { authContinuationUrl, intentFromUrl, parseAuthIntent } = loader()("src/lib/auth/intent.ts");
  for (const role of ["patient", "doctor"]) {
    for (const remember of [true, false]) {
      const url = authContinuationUrl("https://secondcare.example", { role, remember });
      assert.deepEqual(plain(intentFromUrl(url)), { role, remember });
    }
  }
  assert.equal(intentFromUrl("https://secondcare.example/auth/finish?role=admin&remember=1"), null);
  assert.equal(intentFromUrl("https://secondcare.example/auth/finish"), null);
  assert.equal(parseAuthIntent({ role: "ADMIN" }), null);
  assert.throws(() => authContinuationUrl("https://secondcare.example", { role: "admin" }));
});

test("profile validation rejects future/impossible DOB, missing patient fields, invalid contact and long names", () => {
  const { normalizeProfile, validBirthDate } = loader()("src/lib/auth/profile-input.ts");
  const patient = { fullName: "  Test Patient  ", phone: "98765 43210", dob: "2000-02-29", place: " Mumbai " };
  assert.deepEqual(plain(normalizeProfile(patient, true)), { fullName: "Test Patient", phone: "9876543210", dob: "2000-02-29", place: "Mumbai" });
  assert.equal(validBirthDate("2001-02-29"), false);
  assert.equal(validBirthDate("2999-01-01"), false);
  assert.equal(validBirthDate("1899-12-31"), false);
  assert.throws(() => normalizeProfile({ ...patient, dob: null }, true));
  assert.throws(() => normalizeProfile({ ...patient, phone: "12345" }, true));
  assert.throws(() => normalizeProfile({ ...patient, fullName: "x".repeat(121) }, true));
  assert.throws(() => normalizeProfile({ ...patient, place: "A" }, true));
  assert.equal(normalizeProfile({ ...patient, dob: null, place: null }, false).dob, null);
});

function storage(entries) {
  const object = { ...entries };
  Object.defineProperties(object, {
    getItem: { value: (key) => object[key] ?? null },
    setItem: { value: (key, value) => { object[key] = value; } },
    removeItem: { value: (key) => { delete object[key]; } },
  });
  return object;
}
test("link role ignores stale browser intent; logout clears draft blobs and user data", async () => {
  let clearCount = 0;
  const localStorage = storage({ "sc:auth:intent": JSON.stringify({ role: "patient", remember: true }), "sc:private": "medical data", unrelated: "keep" });
  const sessionStorage = storage({ "sc:draft": "medical data" });
  const auth = loader({ "firebase/auth": {}, "@/lib/firebase": { auth: {} }, "@/lib/draft-store": { draftStore: { clearAll: async () => { clearCount += 1; } } } }, { localStorage, window: { localStorage, sessionStorage } })("src/lib/auth/email-link.ts");
  assert.equal(auth.getPendingIntent("https://secondcare.example/auth/finish"), null);
  assert.equal(auth.getPendingIntent("https://secondcare.example/auth/finish?role=doctor").role, "doctor");
  await auth.clearUserScopedStorage();
  assert.equal(clearCount, 1);
  assert.equal(localStorage.getItem("sc:private"), null);
  assert.equal(sessionStorage.getItem("sc:draft"), null);
  assert.equal(localStorage.getItem("unrelated"), "keep");
});

function dataHarness(records = {}, failWrites = false, currentUid = "administrator") {
  const writes = [];
  const deleted = [];
  let uploads = 0;
  const sentinel = { timestamp: "server" };
  const firestore = {
    doc: (_db, collection, uid) => `${collection}/${uid}`,
    collection: () => "audit",
    addDoc: async () => undefined,
    serverTimestamp: () => sentinel,
    runTransaction: async (_db, callback) => callback({
      get: async (key) => ({ exists: () => key in records, data: () => records[key] }),
      set: (key, value) => { if (failWrites) throw new Error("write denied"); writes.push({ method: "set", key, value }); },
      update: (key, value) => { if (failWrites) throw new Error("write denied"); writes.push({ method: "update", key, value }); },
    }),
  };
  const files = [{ name: "degree.pdf", path: "users/doctor/credentials/degree.pdf", contentType: "application/pdf", size: 100 }];
  const load = loader({
    "firebase/firestore": firestore,
    "@/lib/firebase": { db: {}, auth: { currentUser: { uid: currentUid } } },
    "./files": { uploadUserFiles: async () => { uploads += 1; return files; }, deleteUserFile: async (name) => { deleted.push(name); } },
  });
  return { doctors: load("src/lib/data/doctors.ts"), users: load("src/lib/data/users.ts"), writes, deleted, get uploads() { return uploads; } };
}
const signedInDoctor = { uid: "doctor", email: "doctor@example.test", emailVerified: true };
const application = { fullName: "Test Doctor", phone: "9876543210", regNumber: "REG123", council: "State Medical Council", specialization: "Cardiology", experience: 5, files: [{}] };

test("doctor signup writes pending credentials and matching account mirror together", async () => {
  const harness = dataHarness();
  await harness.doctors.submitDoctorApplication(signedInDoctor, application);
  assert.equal(harness.uploads, 1);
  assert.equal(harness.writes.length, 2);
  const doctor = harness.writes.find((write) => write.key === "doctorProfiles/doctor").value;
  const account = harness.writes.find((write) => write.key === "users/doctor").value;
  assert.equal(doctor.status, "PENDING");
  assert.equal(doctor.reviewedAt, null);
  assert.deepEqual(plain(account.doctorAccess), { status: "PENDING", specialization: "Cardiology" });
  assert.equal(account.role, "doctor");
});

test("failed doctor signup cleans uploaded credentials; invalid applications never upload", async () => {
  const harness = dataHarness({}, true);
  await assert.rejects(harness.doctors.submitDoctorApplication(signedInDoctor, application), /write denied/);
  assert.deepEqual(harness.deleted, ["users/doctor/credentials/degree.pdf"]);
  const invalid = dataHarness();
  await assert.rejects(invalid.doctors.submitDoctorApplication(signedInDoctor, { ...application, experience: 1.5 }), /whole years/);
  await assert.rejects(invalid.doctors.submitDoctorApplication({ ...signedInDoctor, emailVerified: false }, application), /Verify your email/);
  assert.equal(invalid.uploads, 0);
});

test("orphan doctor applications recover the user profile without overwriting review status", async () => {
  const harness = dataHarness({ "doctorProfiles/doctor": { ...application, uid: "doctor", status: "VERIFIED" } });
  await harness.doctors.recoverDoctorApplication(signedInDoctor);
  assert.equal(harness.writes.length, 1);
  assert.equal(harness.writes[0].key, "users/doctor");
  assert.equal(harness.writes[0].value.doctorAccess.status, "VERIFIED");
  assert.equal(harness.uploads, 0);
});

test("admin reviews synchronize credential status and access mirror including re-verification", async () => {
  const harness = dataHarness({ "doctorProfiles/doctor": { ...application, uid: "doctor", status: "VERIFIED" }, "users/doctor": { role: "doctor" } });
  await harness.doctors.adminSetDoctorStatus("doctor", "VERIFIED");
  assert.equal(harness.writes.length, 2);
  assert.equal(harness.writes[0].value.status, "VERIFIED");
  assert.equal(harness.writes[1].value.doctorAccess.status, "VERIFIED");
});

test("admin account management supports patient/doctor only and rejects self/admin targets", async () => {
  const harness = dataHarness({ "users/patient": { role: "patient" }, "users/admin2": { role: "admin" } });
  await harness.users.adminSetUserStatus("patient", "disabled");
  assert.equal(harness.writes[0].value.status, "disabled");
  await assert.rejects(harness.users.adminSetUserStatus("administrator", "disabled"), /own account/);
  await assert.rejects(harness.users.adminSetUserStatus("admin2", "disabled"), /Admin accounts/);
  await assert.rejects(harness.users.adminSetUserStatus("patient", "admin"), /valid account status/);
  assert.equal(harness.writes.length, 1);
});
