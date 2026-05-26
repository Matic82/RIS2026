export type StructuredAuditDetails = {
  descriptionKey?: string;
  description?: string;
  affectedMember?: string;
  oldValue?: string;
  newValue?: string;
  performedBy?: string;
  fieldKey?: string;
  ruleType?: string;
  tier?: string;
};

export function parseAuditDetails(raw: string | null | undefined): StructuredAuditDetails {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as StructuredAuditDetails;
  } catch {
    return { description: raw };
  }
}
