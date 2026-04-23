import { FileText, Shield, Archive } from "lucide-react";
import { LucideIcon } from "lucide-react";

// ─── Policy Types ─────────────────────────────────────────────────────────────

export type PolicyStatus = "Active" | "Impending" | "Expired";

export interface Policy {
  id: string;
  name: string;
  version: string;
  department: string;
  lastModified: string;
  status: PolicyStatus;
  icon: LucideIcon;
}

// ─── Claim Status Types ───────────────────────────────────────────────────────

/** Drives which dashboard tab a bundle appears in. */
export type AiStatus =
  | "Policy Flagged"
  | "Awaiting Review"
  | "Passed AI Review"
  | "Low Confidence";

/** Per-receipt AI judgment — mirrors backend LineItemStatus. */
export type LineItemStatus = "APPROVED" | "REJECTED" | "PARTIAL_APPROVE" | "PENDING";

// ─── Audit Types ──────────────────────────────────────────────────────────────

export interface AuditNote {
  tag: string;    // e.g. "[OVER_LIMIT]", "[LATE_SUBMISSION]", "[HUMAN_EDITED]"
  message: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
}

// ─── Line Item (per receipt/document) ────────────────────────────────────────
// Mirrors backend schema — do not rename fields.

export interface LineItem {
  document_id: string;
  date: string;
  category: "meals" | "transportation" | "accommodation" | "others";
  description: string;
  status: LineItemStatus;
  requested_amount: number;
  approved_amount: number;
  deduction_amount: number;
  audit_notes: AuditNote[];
  /** True if the employee manually edited the AI-extracted amount — Fraud Trap. */
  human_edited?: boolean;
  /** Original OCR-extracted amount before employee edit. */
  ocr_amount?: number;
  /** URL to the uploaded receipt image. */
  receipt_url?: string;
}

// ─── Claim Bundle (top-level — contains all receipts for one claim) ───────────
// Mirrors backend JSON schema exactly.

export interface ClaimBundle {
  id: string;
  // Employee Identity (read-only)
  employee: {
    name: string;
    initials: string;
    employee_no: string;
    position: string;
    department: string;
    location: string;
    entity: string;
    email: string;
  };
  submitted_at: string;
  // Claim Context (filled by employee during submission)
  travel_destination: string;
  travel_purpose: string;
  departure_date: string;
  arrival_date: string;
  is_overseas: boolean;
  // AI Result — mirrors backend response
  line_items: LineItem[];
  totals: {
    total_requested: number;
    total_deduction: number;
    net_approved: number;
  };
  overall_judgment: LineItemStatus;
  /** 0–1 AI confidence score */
  confidence: number;
  summary: string;
  // System fields
  overall_status: AiStatus;
  audit_log: AuditLogEntry[];
}

// ─── Dashboard List Row ───────────────────────────────────────────────────────

export interface Claim {
  id: string;
  employee: { name: string; initials: string };
  date: string;
  amount: string;
  category: string;
  status: AiStatus;
  note?: string;
}

// ─── Dashboard Data ───────────────────────────────────────────────────────────

export const ATTENTION_CLAIMS: Claim[] = [
  {
    id: "clm-001",
    employee: { name: "Sarah Jenkins", initials: "SJ" },
    date: "Apr 18, 2026",
    amount: "MYR 1,430.00",
    category: "Business Travel",
    status: "Policy Flagged",
    note: "Accommodation over limit · Late submission",
  },
  {
    id: "clm-003",
    employee: { name: "Emma Larson", initials: "EL" },
    date: "Apr 20, 2026",
    amount: "MYR 2,640.00",
    category: "Client Entertainment",
    status: "Low Confidence",
    note: "Alcohol detected · Amount edited 10× by employee",
  },
  {
    id: "clm-002",
    employee: { name: "Michael Chen", initials: "MC" },
    date: "Apr 15, 2026",
    amount: "MYR 325.50",
    category: "Office Supplies",
    status: "Awaiting Review",
    note: "Missing receipt attachment",
  },
  {
    id: "clm-004",
    employee: { name: "Daniel Reyes", initials: "DR" },
    date: "Apr 12, 2026",
    amount: "MYR 2,100.00",
    category: "Client Entertainment",
    status: "Low Confidence",
    note: "AI confidence below 60%",
  },
  {
    id: "clm-005",
    employee: { name: "Priya Nair", initials: "PN" },
    date: "Apr 10, 2026",
    amount: "MYR 640.75",
    category: "Training & Development",
    status: "Awaiting Review",
    note: "Department code mismatch",
  },
  {
    id: "clm-009",
    employee: { name: "Carlos Mendez", initials: "CM" },
    date: "Apr 8, 2026",
    amount: "MYR 3,200.00",
    category: "Equipment",
    status: "Policy Flagged",
    note: "Exceeds equipment purchase limit",
  },
  {
    id: "clm-010",
    employee: { name: "Yuki Tanaka", initials: "YT" },
    date: "Apr 6, 2026",
    amount: "MYR 175.00",
    category: "Meals & Entertainment",
    status: "Low Confidence",
    note: "Vendor unrecognised",
  },
  {
    id: "clm-011",
    employee: { name: "Fatima Al-Rashid", initials: "FA" },
    date: "Apr 4, 2026",
    amount: "MYR 950.00",
    category: "Business Travel",
    status: "Awaiting Review",
    note: "No pre-approval on file",
  },
];

export const APPROVED_CLAIMS: Claim[] = [
  {
    id: "clm-006",
    employee: { name: "James Okafor", initials: "JO" },
    date: "Apr 24, 2026",
    amount: "MYR 1,150.00",
    category: "Business Travel",
    status: "Passed AI Review",
  },
  {
    id: "clm-007",
    employee: { name: "Liu Wei", initials: "LW" },
    date: "Apr 23, 2026",
    amount: "MYR 210.50",
    category: "Meals & Entertainment",
    status: "Passed AI Review",
  },
  {
    id: "clm-008",
    employee: { name: "Aisha Patel", initials: "AP" },
    date: "Apr 22, 2026",
    amount: "MYR 55.00",
    category: "Transportation",
    status: "Passed AI Review",
  },
  {
    id: "clm-012",
    employee: { name: "Noah Williams", initials: "NW" },
    date: "Apr 22, 2026",
    amount: "MYR 340.00",
    category: "Software Subscriptions",
    status: "Passed AI Review",
  },
  {
    id: "clm-013",
    employee: { name: "Mei Lin", initials: "ML" },
    date: "Apr 21, 2026",
    amount: "MYR 78.25",
    category: "Office Supplies",
    status: "Passed AI Review",
  },
  {
    id: "clm-014",
    employee: { name: "Samuel Adeyemi", initials: "SA" },
    date: "Apr 20, 2026",
    amount: "MYR 120.00",
    category: "Training & Development",
    status: "Passed AI Review",
  },
  {
    id: "clm-015",
    employee: { name: "Clara Hoffmann", initials: "CH" },
    date: "Apr 19, 2026",
    amount: "MYR 495.00",
    category: "Business Travel",
    status: "Passed AI Review",
  },
];

// ─── Bundle Detail Data ───────────────────────────────────────────────────────
// TODO: Replace with useSWR → GET /api/hr/bundles/{id}

export const MOCK_BUNDLES: Record<string, ClaimBundle> = {
  "clm-001": {
    id: "clm-001",
    employee: {
      name: "Sarah Jenkins",
      initials: "SJ",
      employee_no: "EMP-2041",
      position: "Senior Marketing Manager",
      department: "Marketing",
      location: "Kuala Lumpur, MY",
      entity: "Reclaim Sdn. Bhd.",
      email: "s.jenkins@reclaim.my",
    },
    submitted_at: "2026-04-18T14:34:00+08:00",
    travel_destination: "Singapore",
    travel_purpose: "Q2 Client Pitch — Acme Corp Singapore",
    departure_date: "2026-04-16",
    arrival_date: "2026-04-18",
    is_overseas: true,
    line_items: [
      {
        document_id: "550e8400-e29b-41d4-a716-446655440000",
        date: "2026-04-18",
        category: "meals",
        description: "Client dinner at Sushi Zanmai, Orchard Road",
        status: "APPROVED",
        requested_amount: 150.00,
        approved_amount: 150.00,
        deduction_amount: 0.00,
        audit_notes: [],
        receipt_url: "https://images.unsplash.com/photo-1572883454114-1cf0031ede2a?w=600&h=800&fit=crop",
      },
      {
        document_id: "660e8400-e29b-41d4-a716-446655441111",
        date: "2025-10-12",
        category: "transportation",
        description: "Taxi to KLIA",
        status: "REJECTED",
        requested_amount: 80.00,
        approved_amount: 0.00,
        deduction_amount: 80.00,
        audit_notes: [
          { tag: "[LATE_SUBMISSION]", message: "Receipt date is over 6 months old. Policy requires submission within 90 days." },
        ],
        receipt_url: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=800&fit=crop",
      },
      {
        document_id: "770e8400-e29b-41d4-a716-446655442222",
        date: "2026-04-17",
        category: "accommodation",
        description: "Hilton Hotel Singapore (2 nights)",
        status: "PARTIAL_APPROVE",
        requested_amount: 1200.00,
        approved_amount: 1000.00,
        deduction_amount: 200.00,
        audit_notes: [
          { tag: "[OVER_LIMIT]", message: "Policy caps accommodation for Rank 2 employees at MYR 500/night. Capped at MYR 1,000 for 2 nights." },
        ],
        receipt_url: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&h=800&fit=crop",
      },
    ],
    totals: { total_requested: 1430.00, total_deduction: 280.00, net_approved: 1150.00 },
    overall_judgment: "PARTIAL_APPROVE",
    confidence: 0.92,
    summary: "Bundle partially approved. Accommodation exceeded rank limit; one transportation receipt rejected for late submission.",
    overall_status: "Policy Flagged",
    audit_log: [
      { id: "al-1", timestamp: "Apr 18, 2:34 PM", actor: "Sarah Jenkins", action: "Submitted claim bundle (3 receipts)" },
      { id: "al-2", timestamp: "Apr 18, 2:35 PM", actor: "Reclaim AI", action: "OCR completed — extracted 3 line items" },
      { id: "al-3", timestamp: "Apr 18, 2:35 PM", actor: "Reclaim AI", action: "Flagged: receipt 660 — late submission (>90 days)" },
      { id: "al-4", timestamp: "Apr 18, 2:35 PM", actor: "Reclaim AI", action: "Flagged: receipt 770 — accommodation over rank limit" },
      { id: "al-5", timestamp: "Apr 18, 2:36 PM", actor: "System", action: "Escalated to HR queue — PARTIAL_APPROVE" },
    ],
  },

  "clm-003": {
    id: "clm-003",
    employee: {
      name: "Emma Larson",
      initials: "EL",
      employee_no: "EMP-1887",
      position: "Account Executive",
      department: "Sales",
      location: "Petaling Jaya, MY",
      entity: "Reclaim Sdn. Bhd.",
      email: "e.larson@reclaim.my",
    },
    submitted_at: "2026-04-20T16:50:00+08:00",
    travel_destination: "Penang",
    travel_purpose: "Regional Sales Conference & Client Entertainment",
    departure_date: "2026-04-19",
    arrival_date: "2026-04-20",
    is_overseas: false,
    line_items: [
      {
        document_id: "aa0e8400-e29b-41d4-a716-446655440001",
        date: "2026-04-19",
        category: "meals",
        description: "Client dinner at Ferringhi Garden Restaurant",
        status: "REJECTED",
        requested_amount: 2200.00,
        approved_amount: 0.00,
        deduction_amount: 2200.00,
        audit_notes: [
          { tag: "[ALCOHOL_DETECTED]", message: "Receipt contains alcohol charges (MYR 480). Policy prohibits alcohol reimbursement." },
          { tag: "[HUMAN_EDITED]", message: "Amount edited by employee: AI extracted MYR 220.00, employee submitted MYR 2,200.00 (10× discrepancy)." },
        ],
        human_edited: true,
        ocr_amount: 220.00,
        receipt_url: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=800&fit=crop",
      },
      {
        document_id: "bb0e8400-e29b-41d4-a716-446655440002",
        date: "2026-04-19",
        category: "accommodation",
        description: "Hard Rock Hotel Penang (1 night)",
        status: "APPROVED",
        requested_amount: 380.00,
        approved_amount: 380.00,
        deduction_amount: 0.00,
        audit_notes: [],
        receipt_url: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&h=800&fit=crop",
      },
      {
        document_id: "cc0e8400-e29b-41d4-a716-446655440003",
        date: "2026-04-20",
        category: "transportation",
        description: "Grab car KL to Penang (inter-city)",
        status: "REJECTED",
        requested_amount: 60.00,
        approved_amount: 0.00,
        deduction_amount: 60.00,
        audit_notes: [
          { tag: "[POLICY_VIOLATION]", message: "Inter-city travel must use approved vendor or company vehicle. Grab not approved for this route." },
        ],
        receipt_url: "https://images.unsplash.com/photo-1572883454114-1cf0031ede2a?w=600&h=800&fit=crop",
      },
    ],
    totals: { total_requested: 2640.00, total_deduction: 2260.00, net_approved: 380.00 },
    overall_judgment: "PARTIAL_APPROVE",
    confidence: 0.31,
    summary: "High fraud risk: one receipt amount is 10× higher than AI extraction. Alcohol detected on the same receipt. Two line items rejected.",
    overall_status: "Low Confidence",
    audit_log: [
      { id: "al-6", timestamp: "Apr 20, 4:50 PM", actor: "Emma Larson", action: "Submitted claim bundle (3 receipts)" },
      { id: "al-7", timestamp: "Apr 20, 4:51 PM", actor: "Reclaim AI", action: "OCR completed — extracted 3 line items" },
      { id: "al-8", timestamp: "Apr 20, 4:51 PM", actor: "Reclaim AI", action: "⚠️ FRAUD TRAP: receipt aa0 edited 10× (MYR 220 → MYR 2,200)" },
      { id: "al-9", timestamp: "Apr 20, 4:51 PM", actor: "Reclaim AI", action: "Flagged: alcohol detected in receipt aa0" },
      { id: "al-10", timestamp: "Apr 20, 4:51 PM", actor: "Reclaim AI", action: "Flagged: inter-city Grab not policy-compliant (receipt cc0)" },
      { id: "al-11", timestamp: "Apr 20, 4:52 PM", actor: "System", action: "Escalated to HR queue — Low Confidence (31%)" },
    ],
  },

  "clm-006": {
    id: "clm-006",
    employee: {
      name: "James Okafor",
      initials: "JO",
      employee_no: "EMP-3012",
      position: "Operations Manager",
      department: "Operations",
      location: "Kuala Lumpur, MY",
      entity: "Reclaim Sdn. Bhd.",
      email: "j.okafor@reclaim.my",
    },
    submitted_at: "2026-04-24T09:11:00+08:00",
    travel_destination: "Johor Bahru",
    travel_purpose: "Site inspection — Q2 logistics audit",
    departure_date: "2026-04-23",
    arrival_date: "2026-04-24",
    is_overseas: false,
    line_items: [
      {
        document_id: "dd0e8400-e29b-41d4-a716-446655440004",
        date: "2026-04-23",
        category: "meals",
        description: "Team lunch at R&R Seremban",
        status: "APPROVED",
        requested_amount: 89.00,
        approved_amount: 89.00,
        deduction_amount: 0.00,
        audit_notes: [],
        receipt_url: "https://images.unsplash.com/photo-1572883454114-1cf0031ede2a?w=600&h=800&fit=crop",
      },
      {
        document_id: "ee0e8400-e29b-41d4-a716-446655440005",
        date: "2026-04-23",
        category: "transportation",
        description: "Petronas petrol — company vehicle",
        status: "APPROVED",
        requested_amount: 120.00,
        approved_amount: 120.00,
        deduction_amount: 0.00,
        audit_notes: [],
        receipt_url: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=800&fit=crop",
      },
      {
        document_id: "ff0e8400-e29b-41d4-a716-446655440006",
        date: "2026-04-24",
        category: "accommodation",
        description: "Hotel Seri Malaysia JB (1 night)",
        status: "APPROVED",
        requested_amount: 941.00,
        approved_amount: 941.00,
        deduction_amount: 0.00,
        audit_notes: [],
        receipt_url: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&h=800&fit=crop",
      },
    ],
    totals: { total_requested: 1150.00, total_deduction: 0.00, net_approved: 1150.00 },
    overall_judgment: "APPROVED",
    confidence: 0.98,
    summary: "All 3 receipts verified and within policy limits. No edits detected. AI recommends full approval.",
    overall_status: "Passed AI Review",
    audit_log: [
      { id: "al-12", timestamp: "Apr 24, 9:11 AM", actor: "James Okafor", action: "Submitted claim bundle (3 receipts)" },
      { id: "al-13", timestamp: "Apr 24, 9:12 AM", actor: "Reclaim AI", action: "OCR completed — all 3 receipts verified" },
      { id: "al-14", timestamp: "Apr 24, 9:12 AM", actor: "Reclaim AI", action: "All policy checks passed — Passed AI Review" },
    ],
  },

  "clm-007": {
    id: "clm-007",
    employee: {
      name: "Liu Wei",
      initials: "LW",
      employee_no: "EMP-2788",
      position: "Senior Sales Executive",
      department: "Sales",
      location: "Kuala Lumpur, MY",
      entity: "Reclaim Sdn. Bhd.",
      email: "l.wei@reclaim.my",
    },
    submitted_at: "2026-04-23T13:45:00+08:00",
    travel_destination: "Kuala Lumpur (Local)",
    travel_purpose: "Client lunch — TechCorp Malaysia",
    departure_date: "2026-04-23",
    arrival_date: "2026-04-23",
    is_overseas: false,
    line_items: [
      {
        document_id: "gg0e8400-e29b-41d4-a716-446655440007",
        date: "2026-04-23",
        category: "meals",
        description: "Business lunch at Nobu KLCC",
        status: "APPROVED",
        requested_amount: 168.00,
        approved_amount: 168.00,
        deduction_amount: 0.00,
        audit_notes: [],
        receipt_url: "https://images.unsplash.com/photo-1572883454114-1cf0031ede2a?w=600&h=800&fit=crop",
      },
      {
        document_id: "hh0e8400-e29b-41d4-a716-446655440008",
        date: "2026-04-23",
        category: "transportation",
        description: "Grab — KLCC to office",
        status: "APPROVED",
        requested_amount: 42.50,
        approved_amount: 42.50,
        deduction_amount: 0.00,
        audit_notes: [],
      },
    ],
    totals: { total_requested: 210.50, total_deduction: 0.00, net_approved: 210.50 },
    overall_judgment: "APPROVED",
    confidence: 0.96,
    summary: "Both receipts verified. Amounts within daily meal and transport limits. Passed all policy checks.",
    overall_status: "Passed AI Review",
    audit_log: [
      { id: "al-15", timestamp: "Apr 23, 1:45 PM", actor: "Liu Wei", action: "Submitted claim bundle (2 receipts)" },
      { id: "al-16", timestamp: "Apr 23, 1:46 PM", actor: "Reclaim AI", action: "OCR completed — 2 receipts verified" },
      { id: "al-17", timestamp: "Apr 23, 1:46 PM", actor: "Reclaim AI", action: "All policy checks passed — Passed AI Review" },
    ],
  },
};

// ─── Policy Data ──────────────────────────────────────────────────────────────

export const MOCK_POLICIES: Policy[] = [
  {
    id: "remote-work",
    name: "Remote Work Guidelines",
    version: "V2.4",
    department: "IT & HR",
    lastModified: "Oct 24, 2023",
    status: "Active",
    icon: FileText,
  },
  {
    id: "data-privacy",
    name: "Data Privacy Addendum",
    version: "V1.1",
    department: "Legal",
    lastModified: "Nov 02, 2023",
    status: "Impending",
    icon: Shield,
  },
  {
    id: "office-reentry",
    name: "2022 Office Re-entry Plan",
    version: "V1.0",
    department: "Operations",
    lastModified: "Jan 15, 2022",
    status: "Expired",
    icon: Archive,
  },
  {
    id: "travel-policy",
    name: "Global Travel & Expense Policy",
    version: "V3.0",
    department: "Finance",
    lastModified: "Dec 01, 2023",
    status: "Active",
    icon: FileText,
  },
  {
    id: "it-security",
    name: "IT Security & Asset Management",
    version: "V2.1",
    department: "IT",
    lastModified: "Nov 15, 2023",
    status: "Active",
    icon: Shield,
  },
  {
    id: "employee-handbook",
    name: "2024 Employee Handbook",
    version: "V4.2",
    department: "HR",
    lastModified: "Jan 02, 2024",
    status: "Impending",
    icon: FileText,
  },
];

export const POLICY_STATUS_STYLE: Record<PolicyStatus, string> = {
  "Active": "bg-[#e6f4ea] text-[#137333]",
  "Impending": "bg-[#fef7e0] text-[#b06000]",
  "Expired": "bg-surface-container-high text-on-surface-variant",
};
