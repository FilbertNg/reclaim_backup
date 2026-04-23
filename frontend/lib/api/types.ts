// ─── Shared API Types ─────────────────────────────────────────────────────────
// Central TypeScript type definitions matching docs/api_spec.md.
// These types are used by both server actions and UI components.
// ──────────────────────────────────────────────────────────────────────────────

// ─── Generic API Result ──────────────────────────────────────────────────────

/** Standardised wrapper for all API client responses. */
export interface ApiResult<T> {
  data: T | null;
  error: string | null;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  name: string;
  role: "HR" | "Employee";
  department?: string;
  privilege_level?: string;
}

// ─── Dashboard & Statistics ──────────────────────────────────────────────────

export interface DashboardStats {
  awaitingReview: {
    amount: string;
    count: number;
  };
  reimbursedThisMonth: {
    amount: string;
    count: number;
  };
  alreadyPaid: {
    amount: string;
    count: number;
  };
}

// ─── Claims ──────────────────────────────────────────────────────────────────

export type ClaimStatus = "Pending" | "Approved" | "Paid" | "Rejected";

export interface ClaimSummary {
  id: string;
  date: string;
  category: string;
  subCategory: string;
  merchant: string;
  amount: string;
  amountNumeric: number;
  status: ClaimStatus;
}

/** Raw shape returned by the FastAPI `GET /reimbursements/` endpoint. */
export interface ReimbursementRaw {
  reim_id: string;
  user_id: string;
  policy_id: string | null;
  main_category: string;
  sub_category: string;
  currency: string;
  amount: number;
  judgment: string;
  status: string;
  summary: string;
  chain_of_thought: Record<string, unknown>;
  created_at: string | null;
}

/** Map a backend ReimbursementRaw into the frontend ClaimSummary shape. */
export function mapReimbursementToClaim(r: ReimbursementRaw): ClaimSummary {
  // Format currency + amount → "$850.00"
  const currencySymbol: Record<string, string> = { USD: "$", MYR: "RM", EUR: "€", GBP: "£" };
  const symbol = currencySymbol[r.currency] ?? `${r.currency} `;
  const formattedAmount = `${symbol}${r.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Format ISO date → "Oct 24, 2023"
  let displayDate = "";
  if (r.created_at) {
    const d = new Date(r.created_at);
    displayDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  // Normalise status to ClaimStatus union
  const statusMap: Record<string, ClaimStatus> = {
    Approved: "Approved",
    APPROVED: "Approved",
    Pending: "Pending",
    REVIEW: "Pending",
    Paid: "Paid",
    PAID: "Paid",
    Rejected: "Rejected",
    REJECTED: "Rejected",
  };

  return {
    id: r.reim_id,
    date: displayDate,
    category: r.main_category,
    subCategory: r.sub_category,
    merchant: r.summary?.split(".")[0] ?? "",   // first sentence of summary
    amount: formattedAmount,
    amountNumeric: r.amount,
    status: statusMap[r.status] ?? "Pending",
  };
}

export interface TimelineEvent {
  type: "Submitted" | "AI_Validation" | "HR_Review" | "Paid";
  status: "Completed" | "Pending" | "Failed";
  timestamp: string;
  description: string;
}

export interface DetailedClaim extends ClaimSummary {
  timeline: TimelineEvent[];
  receipts: {
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
  clientName: string;
  purpose: string;
}

export interface HistorySummary {
  totalReimbursed: string;
  pendingAmount: string;
}

// ─── Reimbursement & Policy ──────────────────────────────────────────────────

export interface SubCategoryConfig {
  required_documents: string[];
  condition: string[];
}

export interface Policy {
  main_category: string;
  reimbursable_categories: string[];
  mandatory_conditions: Record<string, SubCategoryConfig>;
}

export interface ExtractedData {
  merchant: string;
  amount: string;
  date: string;
}

export interface ClaimSubmissionPayload {
  mainCategory: string;
  subCategory: string;
  clientName: string;
  purpose: string;
  extractedData: ExtractedData;
  files: string[];
}

// ─── Notifications ───────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  link?: string;
}

// ─── Settings & Banking ──────────────────────────────────────────────────────

export interface BankingDetails {
  id: string;
  institutionName: string;
  accountLastFour: string;
  routingType: string;
  updatedAt: string;
}

export interface UserProfileUpdate {
  name: string;
  email: string;
}
