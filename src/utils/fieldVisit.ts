export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number | null {
  if ([aLat, aLng, bLat, bLng].some((v) => v == null || Number.isNaN(Number(v)))) return null;
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)) * 100) / 100;
}

export function verifyProximity(m: number | null): 'VERIFIED' | 'WARNING' | 'OUTSIDE' | 'NO_SCHOOL_GPS' {
  if (m == null) return 'NO_SCHOOL_GPS';
  if (m <= 150) return 'VERIFIED';
  if (m <= 500) return 'WARNING';
  return 'OUTSIDE';
}

export const VISIT_STAGES = ['Arrive', 'School', 'Contact', 'Discover', 'Demo', 'Outcome', 'Next Step', 'Complete'] as const;

export const OUTCOMES = [
  'INTERESTED', 'DEMO_COMPLETED', 'FOLLOW_UP_REQUIRED', 'PROPOSAL_REQUESTED',
  'PILOT_REQUESTED', 'NEGOTIATION', 'NOT_INTERESTED', 'DM_UNAVAILABLE',
  'REVISIT_REQUIRED', 'CLOSED_WON', 'CLOSED_LOST',
] as const;

export const NEX_PRODUCTS = [
  'SchoolIMS', 'NEX MAXX AI', 'Curriculum', 'Academic Pilot Engine', 'Teacher Copilot',
  'Mastery Intelligence', 'Assessment Intelligence', 'Transport', 'Fees', 'Attendance',
  'Biometric Integration', 'Parent App', 'Staff App',
];

export const CONTACT_ROLES = ['Owner', 'Chairman', 'Correspondent', 'Principal', 'Director', 'Administrator', 'Accountant', 'IT Coordinator', 'Academic Coordinator', 'Other'];

export function suggestNextAction(outcome: string): string {
  if (outcome === 'PROPOSAL_REQUESTED') return 'Send Proposal';
  if (outcome === 'DM_UNAVAILABLE') return 'Schedule Decision-Maker Meeting';
  if (outcome === 'DEMO_COMPLETED') return 'Send Proposal';
  if (outcome === 'INTERESTED') return 'Schedule Demo';
  return 'Visit Again';
}
