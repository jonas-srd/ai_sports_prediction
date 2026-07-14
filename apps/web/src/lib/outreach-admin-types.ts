export type OutreachContactView = {
  id: string;
  kind: "generic_email" | "contact_form";
  value: string;
  role: string | null;
  sourceUrl: string;
  isRoleAddress: boolean;
};

export type OutreachDraftView = {
  id: string;
  contactId: string | null;
  subject: string;
  textBody: string;
  status: "pending_review" | "approved" | "rejected" | "sending" | "sent" | "failed";
  modelId: string | null;
  approvedBy: string | null;
  approvedAtUtc: string | null;
  sentAtUtc: string | null;
  providerMessageId: string | null;
  errorMessage: string | null;
  createdAtUtc: string;
};

export type OutreachProspectView = {
  id: string;
  publicationName: string;
  domain: string;
  websiteUrl: string;
  country: string | null;
  language: string | null;
  sourceQuery: string | null;
  sourceUrl: string | null;
  summary: string | null;
  fitScore: number;
  fitReasons: string[];
  status: "discovered" | "pending_review" | "qualified" | "rejected";
  consentStatus: "unknown" | "explicit_consent" | "existing_customer_exception" | "declined";
  consentEvidence: string | null;
  suppressedAtUtc: string | null;
  discoveredAtUtc: string;
  researchedAtUtc: string | null;
  contacts: OutreachContactView[];
  drafts: OutreachDraftView[];
};

export type OutreachAdminResponse = {
  ok: true;
  prospects: OutreachProspectView[];
  sendConfigured: boolean;
  generatedAtUtc: string;
};
