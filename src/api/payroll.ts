import { superAdminClient } from "./superAdminClient";

const BASE = "/api/super-admin/payroll";

export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN";
export type EmployeeStatus = "ACTIVE" | "ON_LEAVE" | "EXITED";
export type PayrollStatus = "DRAFT" | "PROCESSED" | "PAID" | "FAILED";
export type HrDocumentType =
  | "PAYSLIP"
  | "EMPLOYMENT_CERTIFICATE"
  | "EXPERIENCE_CERTIFICATE"
  | "INTERNSHIP_CERTIFICATE"
  | "OFFER_LETTER"
  | "RELIEVING_LETTER";

export interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  designation: string;
  department: string;
  employment_type: EmploymentType;
  status: EmployeeStatus;
  joining_date: string;
  exit_date: string | null;
  date_of_birth: string | null;
  pan_number: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  basic_salary: number | string;
  hra: number | string;
  allowances: number | string;
  fixed_deductions: number | string;
  gross_salary: number | string;
  pf_enabled: boolean;
  esi_enabled: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollRun {
  id: string;
  employee_id: string;
  employee_code: string;
  full_name: string;
  designation: string;
  department: string;
  payroll_month: number;
  payroll_year: number;
  working_days: number | string;
  paid_days: number | string;
  basic_pay: number | string;
  hra_pay: number | string;
  allowance_pay: number | string;
  gross_pay: number | string;
  pf_deduction: number | string;
  esi_deduction: number | string;
  other_deductions: number | string;
  total_deductions: number | string;
  net_pay: number | string;
  status: PayrollStatus;
  processed_at: string;
  paid_at: string | null;
}

export interface HrDocument {
  id: string;
  employee_id: string;
  payroll_run_id: string | null;
  document_type: HrDocumentType;
  document_number: string;
  title: string;
  generated_at: string;
  full_name: string;
  employee_code: string;
  designation: string;
}

export interface PayrollSummary {
  year: number;
  month: number;
  active_count: number;
  processed_count: number;
  paid_count: number;
  document_count: number;
  monthly_gross: number | string;
  net_payroll: number | string;
}

export interface PayrollConfig {
  organisation_name: string;
  organisation_address: string | null;
  authorised_signatory: string | null;
  authorised_signatory_title: string | null;
  authorised_signatory_image: string | null;
  salary_day: number;
  auto_process_enabled: boolean;
  pf_rate: number | string;
  esi_rate: number | string;
  esi_gross_limit: number | string;
}

export interface EmployeeInput {
  employee_code?: string;
  full_name: string;
  email?: string;
  phone?: string;
  designation: string;
  department: string;
  employment_type: EmploymentType;
  status?: EmployeeStatus;
  joining_date: string;
  exit_date?: string | null;
  basic_salary: number;
  hra: number;
  allowances: number;
  fixed_deductions: number;
  pf_enabled: boolean;
  esi_enabled: boolean;
  bank_account_number?: string;
  bank_ifsc?: string;
  pan_number?: string;
  notes?: string;
}

export async function getSummary(
  year: number,
  month: number,
): Promise<PayrollSummary> {
  return (
    await superAdminClient.get(`${BASE}/summary`, { params: { year, month } })
  ).data;
}
export async function getConfig(): Promise<PayrollConfig> {
  return (await superAdminClient.get(`${BASE}/config`)).data;
}
export async function updateConfig(
  patch: Partial<PayrollConfig>,
): Promise<PayrollConfig> {
  return (await superAdminClient.put(`${BASE}/config`, patch)).data;
}
export async function listEmployees(
  q = "",
  status = "ALL",
): Promise<Employee[]> {
  return (
    await superAdminClient.get(`${BASE}/employees`, { params: { q, status } })
  ).data;
}
export async function createEmployee(input: EmployeeInput): Promise<Employee> {
  return (await superAdminClient.post(`${BASE}/employees`, input)).data;
}
export async function updateEmployee(
  id: string,
  patch: Partial<EmployeeInput & { status: EmployeeStatus }>,
): Promise<Employee> {
  return (await superAdminClient.patch(`${BASE}/employees/${id}`, patch)).data;
}
export async function listRuns(
  year: number,
  month: number,
): Promise<PayrollRun[]> {
  return (
    await superAdminClient.get(`${BASE}/runs`, { params: { year, month } })
  ).data;
}
export async function processPayroll(
  year: number,
  month: number,
): Promise<{ processed: number }> {
  return (await superAdminClient.post(`${BASE}/runs/process`, { year, month }))
    .data;
}
export async function markPaid(id: string): Promise<PayrollRun> {
  return (await superAdminClient.post(`${BASE}/runs/${id}/paid`)).data;
}
export async function listDocuments(
  employeeId?: string,
): Promise<HrDocument[]> {
  return (
    await superAdminClient.get(`${BASE}/documents`, {
      params: employeeId ? { employee_id: employeeId } : {},
    })
  ).data;
}
export async function generateDocument(
  employeeId: string,
  documentType: Exclude<HrDocumentType, "PAYSLIP">,
  dates?: { startDate?: string; endDate?: string },
): Promise<HrDocument> {
  return (
    await superAdminClient.post(`${BASE}/employees/${employeeId}/documents`, {
      document_type: documentType,
      start_date: dates?.startDate || null,
      end_date: dates?.endDate || null,
    })
  ).data;
}
export async function fetchDocumentHtml(id: string): Promise<string> {
  const response = await superAdminClient.get(
    `${BASE}/documents/${id}/document.html`,
    { responseType: "text", transformResponse: (d) => d },
  );
  return response.data as string;
}

export function errorMessage(error: any): string {
  return (
    error?.response?.data?.details ||
    error?.response?.data?.error ||
    error?.message ||
    "Something went wrong"
  );
}
