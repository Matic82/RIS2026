import { execute } from '../db.js';

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

export type AuditContext = {
  accountId?: number;
  ip?: string;
  source?: 'ERP_IMPORT' | 'MONTHLY_BILLING' | 'ADMIN';
  periodLabel?: string;
};

export function auditDetails(details: StructuredAuditDetails): string {
  return JSON.stringify(details);
}

export function parseAuditDetails(raw: string | null | undefined): StructuredAuditDetails {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as StructuredAuditDetails;
  } catch {
    return { description: raw };
  }
}

export async function logAudit(params: {
  accountId?: number;
  eventType: string;
  entity?: string;
  entityId?: number;
  details?: string | StructuredAuditDetails;
  ip?: string;
}): Promise<void> {
  const detailsText =
    typeof params.details === 'string'
      ? params.details.slice(0, 2000)
      : params.details
        ? auditDetails(params.details).slice(0, 2000)
        : null;

  await execute(
    `INSERT INTO REVIZIJSKI_DNEVNIK (ID, ID_RACUNA, TIP_DOGODKA, ENTITETA, ID_ENTITETE, PODROBNOSTI, IP_NASLOV)
     VALUES (seq_revizija.NEXTVAL, :accountId, :eventType, :entity, :entityId, :details, :ip)`,
    {
      accountId: params.accountId ?? null,
      eventType: params.eventType,
      entity: params.entity ?? null,
      entityId: params.entityId ?? null,
      details: detailsText,
      ip: params.ip ?? null,
    }
  );
}
