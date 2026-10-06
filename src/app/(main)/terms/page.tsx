import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing the use of the SecondCare second-opinion platform.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="3 October 2026">
      <section>
        <h2>1. Nature of the service</h2>
        <p>
          SecondCare connects patients with independent, registered medical practitioners for a second opinion based
          on records the patient provides. It is not an emergency service and does not replace an in-person
          examination. In an emergency, call 112.
        </p>
      </section>
      <section>
        <h2>2. Patient responsibilities</h2>
        <ul>
          <li>Provide accurate and complete medical information.</li>
          <li>Only upload records you are entitled to share.</li>
          <li>Consult your treating doctor before changing any treatment.</li>
        </ul>
      </section>
      <section>
        <h2>3. Specialist obligations</h2>
        <ul>
          <li>Hold a valid NMC / State Medical Council registration.</li>
          <li>Follow the Telemedicine Practice Guidelines and maintain patient confidentiality.</li>
        </ul>
      </section>
      <section>
        <h2>4. Fees and refunds</h2>
        <p>
          Fees are shown before payment. If no specialist accepts your case within the stated time, you will receive a
          full refund.
        </p>
      </section>
      <section>
        <h2>5. Limitation of liability</h2>
        <p>
          Opinions are provided by independent practitioners. SecondCare is not liable for clinical decisions made on
          the basis of an opinion, to the extent permitted by law.
        </p>
      </section>
    </LegalPage>
  );
}
