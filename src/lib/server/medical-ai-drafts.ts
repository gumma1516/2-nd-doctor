import "server-only";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { SPECIALTIES } from "@/lib/constants";
import { readBody } from "./http";

// Unwired: patient consent, case ownership, quotas, and provider data handling
// must be implemented before these helpers are exposed to any medical workflow.
export async function generateSpecialtySuggestion(req: Request) {
  try {
    const { chiefComplaint, medications } = await readBody(req);

    if (!chiefComplaint || typeof chiefComplaint !== 'string' || chiefComplaint.trim().length < 10 || chiefComplaint.length > 2000 || (medications !== undefined && (typeof medications !== 'string' || medications.length > 1000))) {
      return Response.json({ error: 'Please provide a valid chief complaint.' }, { status: 400 });
    }

    const { object } = await generateObject({
      model: google('gemini-2.5-pro'), // Use a standard model name
      schema: z.object({
        department: z.enum(SPECIALTIES).describe('The most appropriate medical specialty for the patient.'),
        reasoning: z.string().describe('A brief, 1-2 sentence explanation of why this specialty was chosen.'),
      }),
      prompt: `Act as a clinical decision support tool. Your purpose is to assist in routing patients to the correct medical specialty based on their reported symptoms. You do not diagnose conditions.

Analyze the following patient information and determine the most appropriate medical specialty from the provided list.
      
Chief Complaint: ${chiefComplaint}
Medications: ${medications || 'None provided'}

Available Specialties: ${SPECIALTIES.join(', ')}`,
    });

    return Response.json(object);
  } catch (error) {
    console.error('AI Triage Error:', error instanceof Error ? error.name : 'UnknownError');
    return Response.json({ error: 'Failed to analyze consultation.' }, { status: 500 });
  }
}

export async function generateReviewDraft(req: Request) {
  try {
    const { chiefComplaint, medications } = await readBody(req);

    if (typeof chiefComplaint !== 'string' || !chiefComplaint.trim() || chiefComplaint.length > 2000 || (medications !== undefined && (typeof medications !== 'string' || medications.length > 1000))) {
      return Response.json({ error: 'Chief complaint is required.' }, { status: 400 });
    }

    const { object } = await generateObject({
      model: google('gemini-2.5-pro'),
      schema: z.object({
        summary: z.string().describe('A concise, professional 2-3 sentence medical summary of the case.'),
        flags: z.array(z.string()).describe('List of potential red flags, warnings, or urgent observations based on the symptoms and medications.'),
        draftOpinion: z.string().describe('A preliminary draft of a specialist opinion that the doctor can use as a starting point. Provide this in a professional, empathetic tone.'),
      }),
      prompt: `Act as a clinical decision support tool. Your purpose is to assist the doctor's decision-making process by surfacing relevant evidence and structuring data. You do not diagnose, treat, or prescribe.
      
Review the following patient case and generate a clinical summary, red flags (if any), and a preliminary draft opinion that a doctor can use as a starting point. Do not claim diagnostic authority.

Chief Complaint: ${chiefComplaint}
Medications: ${medications || 'None provided'}
`,
    });

    return Response.json(object);
  } catch (error) {
    console.error('AI Summary Error:', error instanceof Error ? error.name : 'UnknownError');
    return Response.json({ error: 'Failed to generate AI summary.' }, { status: 500 });
  }
}
