"use client";

import type { ConsultationDraft } from "./draft-store";
import { db } from "./firebase";
import { collection, addDoc, getDocs, updateDoc, doc, query, where } from "firebase/firestore";

export type Doctor = {
  id: string;
  name: string;
  spec: string;
  reg: string;
  email: string;
  phone: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  createdAt: string;
  files: string[];
};

export type Patient = {
  id: string;
  phone: string;
  name: string;
  createdAt: string;
};

export type Case = ConsultationDraft & {
  caseId: string;
  paidAt: string;
  amount: number;
  status: "IN_REVIEW" | "TRANSFERRED" | "COMPLETED";
  patientPhone: string;
};

export const mockDb = {
  // Doctors
  getDoctors: async (): Promise<Doctor[]> => {
    const snap = await getDocs(collection(db, "doctors"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Doctor)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  addDoctor: async (docData: Omit<Doctor, "id" | "status" | "createdAt" | "files"> & { files?: string[] }) => {
    const newDoc = {
      ...docData,
      files: docData.files || [],
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    const ref = await addDoc(collection(db, "doctors"), newDoc);
    return { id: ref.id, ...newDoc } as Doctor;
  },
  updateDoctorStatus: async (id: string, status: Doctor["status"]) => {
    const ref = doc(db, "doctors", id);
    await updateDoc(ref, { status });
  },

  // Patients
  getPatients: async (): Promise<Patient[]> => {
    const snap = await getDocs(collection(db, "patients"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Patient));
  },
  ensurePatient: async (phone: string, name: string) => {
    const q = query(collection(db, "patients"), where("phone", "==", phone));
    const snap = await getDocs(q);
    if (snap.empty) {
      await addDoc(collection(db, "patients"), {
        phone,
        name,
        createdAt: new Date().toISOString(),
      });
    }
  },

  // Cases
  getCases: async (): Promise<Case[]> => {
    const snap = await getDocs(collection(db, "cases"));
    return snap.docs.map((d) => ({ ...d.data() } as Case)).sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
  },
  addCase: async (c: Case) => {
    await addDoc(collection(db, "cases"), c);
  },
  updateCaseStatus: async (caseId: string, status: Case["status"]) => {
    const q = query(collection(db, "cases"), where("caseId", "==", caseId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const ref = doc(db, "cases", snap.docs[0].id);
      await updateDoc(ref, { status });
    }
  },
};
