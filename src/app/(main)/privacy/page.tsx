import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How SecondCare collects, uses, stores and protects your personal and health data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="3 October 2026">
      <section>
        <h2>1. Data we collect</h2>
        <ul>
          <li>Identity and contact details: name, mobile number, email.</li>
          <li>Health data you choose to share: medical reports, scans, prescriptions and history.</li>
          <li>Payment metadata (transaction ID, amount). Card details are handled solely by our payment gateway.</li>
        </ul>
      </section>
      <section>
        <h2>2. Why we use it</h2>
        <p>
          Solely to deliver your second opinion: assigning a verified specialist, enabling them to review your
          records, processing payment and communicating with you about your case.
        </p>
      </section>
      <section>
        <h2>3. Consent and sharing</h2>
        <p>
          Your records are shared only with the specialist assigned to your case, and only after you give explicit
          consent. We do not sell your data or share it for advertising.
        </p>
      </section>
      <section>
        <h2>4. Storage and security</h2>
        <p>
          Data is encrypted in transit and at rest and is stored in India. Access is role-restricted and logged.
        </p>
      </section>
      <section>
        <h2>5. Your rights</h2>
        <p>
          You may access, correct or request deletion of your data, and withdraw consent at any time, by contacting
          our Grievance Officer at privacy@secondcare.example.
        </p>
      </section>
    </LegalPage>
  );
}
