// Maps an accepted enquiry to the service tenant it belongs to, and builds the
// query params used to pre-fill that tenant's "Add" onboarding form.
//
// `resolveVertical` inspects the free-text category/organization/message that
// arrives from the public websites. The superAdmin can always override the
// guess in the Accept dialog before routing.

export type TenantVertical = 'SCHOOL' | 'MEDICAL' | 'OTHER';

// Minimal shape — the enquiry row from the CRM list carries a few extra,
// loosely-typed fields (organization) beyond the declared EnquiryRow.
export interface RoutableEnquiry {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  category?: string | null;
  organization?: string | null;
  notes?: string | null;
  message?: string | null;
  address?: string | null;
}

const SCHOOL_HINTS = ['school', 'erp', 'education', 'college', 'academy', 'institute', 'campus', 'student'];
const MEDICAL_HINTS = ['medical', 'pharma', 'pharmacy', 'chemist', 'shop', 'clinic', 'hospital', 'drug', 'health'];

export function resolveVertical(enquiry: RoutableEnquiry | null | undefined): TenantVertical {
  if (!enquiry) return 'OTHER';
  const haystack = [enquiry.category, enquiry.organization, enquiry.notes, enquiry.message]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (SCHOOL_HINTS.some((h) => haystack.includes(h))) return 'SCHOOL';
  if (MEDICAL_HINTS.some((h) => haystack.includes(h))) return 'MEDICAL';
  return 'OTHER';
}

export const VERTICAL_LABELS: Record<TenantVertical, string> = {
  SCHOOL: 'School ERP',
  MEDICAL: 'Medical Shop',
  OTHER: 'CRM Customer',
};

// The Expo Router path for each vertical's onboarding form.
export const VERTICAL_ROUTE: Record<Exclude<TenantVertical, 'OTHER'>, string> = {
  SCHOOL: '/(app)/schools/add',
  MEDICAL: '/(app)/medical/add',
};

// Query params consumed by the Add screens (schools/add.tsx, medical/add.tsx)
// and echoed back so we can link + close the enquiry after creation.
export function buildPrefillParams(
  enquiry: RoutableEnquiry,
  accountId: string | null,
): Record<string, string> {
  const params: Record<string, string> = { enquiryId: enquiry.id };
  if (accountId) params.accountId = accountId;
  if (enquiry.name) params.name = enquiry.name;
  if (enquiry.email) params.email = enquiry.email;
  if (enquiry.phone) params.phone = enquiry.phone;
  if (enquiry.organization) params.organization = enquiry.organization;
  if (enquiry.address) params.address = enquiry.address;
  return params;
}
