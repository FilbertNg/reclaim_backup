"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  CheckCircle2,
  HelpCircle,
  FileText,
  Receipt,
  MapPin,
  Calendar,
  DollarSign,
  Tag,
  User,
  MessageSquare,
  ShieldCheck,
  ShieldX,
  ChevronDown,
  ExternalLink,
  Pencil,
  ImageIcon,
  ZoomIn,
} from "lucide-react";

// ─── Types (mirrors backend schema — ready for API integration) ───────────────

type AiStatus = "Policy Flagged" | "Awaiting Review" | "Auto-Approved" | "Low Confidence";
type ReviewDecision = "force_approve" | "adjust" | "reject" | null;

interface PolicyFlag {
  id: string;
  rule: string;
  description: string;
  severity: "high" | "medium" | "low";
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
}

interface ClaimDetail {
  id: string;
  employee: { name: string; initials: string; department: string; email: string };
  submittedAt: string;
  amount: string;
  currency: string;
  category: string;
  status: AiStatus;
  vendor: string;
  location: string;
  description: string;
  receiptUrls: string[];
  aiConfidence: number;
  aiSummary: string;
  /** AI-proposed adjusted amount when claimed amount exceeds policy. null = no adjustment suggested. */
  aiSuggestedAmount: string | null;
  policyFlags: PolicyFlag[];
  auditLog: AuditLogEntry[];
}

// ─── Mock Data (replace with API fetch) ───────────────────────────────────────

const MOCK_CLAIMS: Record<string, ClaimDetail> = {
  "clm-001": {
    id: "clm-001",
    employee: { name: "Sarah Jenkins", initials: "SJ", department: "Marketing", email: "s.jenkins@company.com" },
    submittedAt: "Oct 24, 2023 · 2:34 PM",
    amount: "$1,450.00",
    currency: "USD",
    category: "Travel",
    status: "Policy Flagged",
    vendor: "Delta Airlines",
    location: "New York, NY → San Francisco, CA",
    description: "Round-trip flight for Q4 client presentation at Salesforce HQ.",
    receiptUrls: [
      "https://images.unsplash.com/photo-1572883454114-1cf0031ede2a?w=600&h=800&fit=crop",
    ],
    aiConfidence: 92,
    aiSummary: "Receipt matches airline booking. Amount exceeds the $1,000 domestic travel cap by $450. No pre-approval found on file.",
    aiSuggestedAmount: "$1,000.00",
    policyFlags: [
      { id: "pf-1", rule: "TRAVEL-CAP-001", description: "Domestic travel expenses must not exceed $1,000 without VP pre-approval.", severity: "high" },
      { id: "pf-2", rule: "PRE-APPROVE-002", description: "No matching pre-approval request found in the system.", severity: "medium" },
    ],
    auditLog: [
      { id: "al-1", timestamp: "Oct 24, 2:34 PM", actor: "Sarah Jenkins", action: "Submitted claim" },
      { id: "al-2", timestamp: "Oct 24, 2:35 PM", actor: "Reclaim AI", action: "Auto-extracted receipt data" },
      { id: "al-3", timestamp: "Oct 24, 2:35 PM", actor: "Reclaim AI", action: "Flagged: exceeds travel cap" },
      { id: "al-4", timestamp: "Oct 24, 2:36 PM", actor: "System", action: "Escalated to HR queue" },
    ],
  },
  "clm-002": {
    id: "clm-002",
    employee: { name: "Michael Chen", initials: "MC", department: "Engineering", email: "m.chen@company.com" },
    submittedAt: "Oct 23, 2023 · 10:15 AM",
    amount: "$325.50",
    currency: "USD",
    category: "Office Supplies",
    status: "Awaiting Review",
    vendor: "Staples",
    location: "Austin, TX",
    description: "Ergonomic keyboard and monitor stand for home office setup.",
    receiptUrls: [],
    aiConfidence: 78,
    aiSummary: "No receipt image attached. Item descriptions match typical office supply purchases. Amount is within policy limits.",
    aiSuggestedAmount: null,
    policyFlags: [
      { id: "pf-3", rule: "RECEIPT-REQ-001", description: "All claims over $50 require a receipt attachment.", severity: "high" },
    ],
    auditLog: [
      { id: "al-5", timestamp: "Oct 23, 10:15 AM", actor: "Michael Chen", action: "Submitted claim" },
      { id: "al-6", timestamp: "Oct 23, 10:16 AM", actor: "Reclaim AI", action: "Flagged: missing receipt" },
      { id: "al-7", timestamp: "Oct 23, 10:16 AM", actor: "System", action: "Escalated to HR queue" },
    ],
  },
  "clm-003": {
    id: "clm-003",
    employee: { name: "Emma Larson", initials: "EL", department: "Product", email: "e.larson@company.com" },
    submittedAt: "Oct 22, 2023 · 4:50 PM",
    amount: "$890.00",
    currency: "USD",
    category: "Software Subscriptions",
    status: "Policy Flagged",
    vendor: "Figma Inc.",
    location: "Online",
    description: "Annual Figma Enterprise license renewal.",
    receiptUrls: [
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&h=800&fit=crop",
    ],
    aiConfidence: 95,
    aiSummary: "Duplicate detected — an identical Figma subscription was renewed by the Design team on Oct 15. Possible double-billing.",
    aiSuggestedAmount: null,
    policyFlags: [
      { id: "pf-4", rule: "DUP-CHECK-001", description: "A matching subscription renewal was already processed this billing cycle.", severity: "high" },
    ],
    auditLog: [
      { id: "al-8", timestamp: "Oct 22, 4:50 PM", actor: "Emma Larson", action: "Submitted claim" },
      { id: "al-9", timestamp: "Oct 22, 4:51 PM", actor: "Reclaim AI", action: "Duplicate subscription detected" },
      { id: "al-10", timestamp: "Oct 22, 4:51 PM", actor: "System", action: "Escalated to HR queue" },
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<AiStatus, string> = {
  "Policy Flagged": "bg-error/10 text-error-dim",
  "Awaiting Review": "bg-amber-100 text-amber-800",
  "Auto-Approved": "bg-emerald-50 text-emerald-700",
  "Low Confidence": "bg-tertiary/10 text-tertiary-dim",
};

const STATUS_ICON: Record<AiStatus, React.ReactNode> = {
  "Policy Flagged": <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.5} />,
  "Awaiting Review": <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />,
  "Auto-Approved": <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />,
  "Low Confidence": <HelpCircle className="w-3.5 h-3.5" strokeWidth={2.5} />,
};

const SEVERITY_STYLE: Record<string, string> = {
  high: "bg-error/10 text-error-dim border-error/20",
  medium: "bg-amber-50 text-amber-800 border-amber-200/50",
  low: "bg-surface-container text-on-surface-variant border-outline-variant/20",
};

// ─── Page Component ───────────────────────────────────────────────────────────

export default function ClaimReviewPage() {
  const params = useParams();
  const router = useRouter();
  const claimId = params.id as string;

  // TODO: Replace with `useSWR` / `useQuery` fetching from backend
  const claim: ClaimDetail | undefined = MOCK_CLAIMS[claimId];

  const [decision, setDecision] = useState<ReviewDecision>(null);
  const [note, setNote] = useState("");
  const [adjustedAmount, setAdjustedAmount] = useState(claim?.aiSuggestedAmount ?? "");
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // ── 404 state ──────────────────────────────────────────────────────────
  if (!claim) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <FileText className="w-12 h-12 text-outline-variant" strokeWidth={1.5} />
        <h2 className="font-headline font-bold text-xl text-on-surface">Claim not found</h2>
        <p className="text-sm text-on-surface-variant">
          No claim with ID <span className="font-mono font-semibold">{claimId}</span> exists.
        </p>
        <button
          onClick={() => router.push("/hr/dashboard")}
          className="mt-2 px-5 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold
                     font-headline hover:bg-primary-dim active:scale-95 transition-all"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const confidenceColor =
    claim.aiConfidence >= 85 ? "text-emerald-600" : claim.aiConfidence >= 60 ? "text-amber-600" : "text-error-dim";

  // TODO: Wire to backend POST /api/hr/claims/{id}/review
  function handleSubmit() {
    if (!decision) return;
    const payload = {
      claimId,
      decision,
      note,
      ...(decision === "adjust" ? { adjustedAmount } : {}),
    };
    console.log("Submitting review:", payload);
    router.push("/hr/dashboard");
  }

  return (
    <div className="relative min-h-full p-6 md:p-10 lg:p-12 pb-32 lg:pb-12">

      {/* ── Ambient gradient ─────────────────────────────────────────────── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-[420px] h-[420px] rounded-full bg-primary opacity-[0.05] blur-[80px]" />
        <div className="absolute top-40 right-32 w-[260px] h-[260px] rounded-full bg-tertiary opacity-[0.04] blur-[64px]" />
      </div>

      {/* ── Back button + title ──────────────────────────────────────────── */}
      <div className="relative z-10 mb-8">
        <button
          id="back-to-dashboard"
          onClick={() => router.push("/hr/dashboard")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant
                     hover:text-primary transition-colors mb-4 active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
          Back to Dashboard
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <h2 className="font-headline font-extrabold text-on-background tracking-tight"
              style={{ fontSize: "2rem", letterSpacing: "-0.02em" }}>
            Review Claim
          </h2>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold w-fit ${STATUS_STYLE[claim.status]}`}>
            {STATUS_ICON[claim.status]}
            {claim.status}
          </span>
        </div>
        <p className="text-on-surface-variant text-sm mt-1 font-body">
          Claim <span className="font-mono font-semibold">{claim.id}</span> · Submitted {claim.submittedAt}
        </p>
      </div>

      {/* ── Main content: 2-column on lg ─────────────────────────────────── */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

        {/* ═══ LEFT COLUMN ═══ */}
        <div className="flex flex-col gap-6">

          {/* ── Claim Details Card ──────────────────────────────────────── */}
          <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-xl
                          shadow-[0_8px_40px_-12px_rgba(44,47,49,0.06)] overflow-hidden">
            <div className="px-6 py-5 border-b border-outline-variant/15">
              <h3 className="font-headline font-bold text-base text-on-surface">Claim Details</h3>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8">
              <DetailRow icon={<User className="w-4 h-4" />} label="Employee" value={claim.employee.name} sub={`${claim.employee.department} · ${claim.employee.email}`} />
              <DetailRow icon={<DollarSign className="w-4 h-4" />} label="Amount" value={claim.amount} sub={claim.currency} />
              <DetailRow icon={<Tag className="w-4 h-4" />} label="Category" value={claim.category} />
              <DetailRow icon={<Receipt className="w-4 h-4" />} label="Vendor" value={claim.vendor} />
              <DetailRow icon={<MapPin className="w-4 h-4" />} label="Location" value={claim.location} />
              <DetailRow icon={<Calendar className="w-4 h-4" />} label="Submitted" value={claim.submittedAt} />
            </div>
            {claim.description && (
              <div className="px-6 pb-6">
                <p className="text-[11px] font-semibold font-headline text-on-surface-variant uppercase tracking-widest mb-1.5">
                  Description
                </p>
                <p className="text-sm text-on-surface leading-relaxed">{claim.description}</p>
              </div>
            )}
          </div>

          {/* ── Uploaded Evidence ───────────────────────────────────────── */}
          <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-xl
                          shadow-[0_8px_40px_-12px_rgba(44,47,49,0.06)] overflow-hidden">
            <div className="px-6 py-5 border-b border-outline-variant/15 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-on-surface-variant" strokeWidth={2} />
              <h3 className="font-headline font-bold text-base text-on-surface">
                Uploaded Evidence
                <span className="ml-2 text-xs font-label text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                  {claim.receiptUrls.length}
                </span>
              </h3>
            </div>
            {claim.receiptUrls.length > 0 ? (
              <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {claim.receiptUrls.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setLightboxUrl(url)}
                    className="group/img relative aspect-[3/4] rounded-xl overflow-hidden
                               bg-surface-container ring-1 ring-outline-variant/20
                               hover:ring-primary/40 transition-all cursor-pointer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Receipt ${i + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300
                                 group-hover/img:scale-105"
                    />
                    <div className="absolute inset-0 bg-inverse-surface/0 group-hover/img:bg-inverse-surface/20
                                    flex items-center justify-center transition-all">
                      <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover/img:opacity-100
                                        transition-opacity drop-shadow-lg" strokeWidth={2} />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 flex flex-col items-center gap-2 text-center">
                <ImageIcon className="w-8 h-8 text-outline-variant" strokeWidth={1.5} />
                <p className="text-sm text-on-surface-variant font-medium">No receipt images uploaded</p>
                <p className="text-xs text-on-surface-variant/70">The employee did not attach any evidence to this claim.</p>
              </div>
            )}
          </div>

          {/* ── Policy Flags ────────────────────────────────────────────── */}
          {claim.policyFlags.length > 0 && (
            <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-xl
                            shadow-[0_8px_40px_-12px_rgba(44,47,49,0.06)] overflow-hidden">
              <div className="px-6 py-5 border-b border-outline-variant/15 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-error-dim" strokeWidth={2.5} />
                <h3 className="font-headline font-bold text-base text-on-surface">
                  Policy Flags
                  <span className="ml-2 text-xs font-label text-error-dim bg-error/10 px-2 py-0.5 rounded-full">
                    {claim.policyFlags.length}
                  </span>
                </h3>
              </div>
              <div className="p-6 flex flex-col gap-3">
                {claim.policyFlags.map((flag) => (
                  <div key={flag.id} className={`rounded-xl p-4 border ${SEVERITY_STYLE[flag.severity]}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider opacity-70">
                        {flag.rule}
                      </span>
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-current/10">
                        {flag.severity}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">{flag.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Audit Log (collapsible) ─────────────────────────────────── */}
          <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-xl
                          shadow-[0_8px_40px_-12px_rgba(44,47,49,0.06)] overflow-hidden">
            <button
              id="toggle-audit-log"
              onClick={() => setShowAuditLog((o) => !o)}
              className="w-full px-6 py-5 flex items-center justify-between cursor-pointer
                         hover:bg-surface-container-low/30 transition-colors"
            >
              <h3 className="font-headline font-bold text-base text-on-surface flex items-center gap-2">
                <Clock className="w-4 h-4 text-on-surface-variant" strokeWidth={2} />
                Audit Trail
                <span className="text-xs font-label text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                  {claim.auditLog.length}
                </span>
              </h3>
              <ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform duration-200 ${showAuditLog ? "rotate-180" : ""}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showAuditLog ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}`}>
              <div className="px-6 pb-6">
                <div className="relative pl-6 border-l-2 border-outline-variant/20 flex flex-col gap-4">
                  {claim.auditLog.map((entry) => (
                    <div key={entry.id} className="relative">
                      <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-surface-container-lowest border-2 border-primary/40" />
                      <p className="text-xs text-on-surface-variant mb-0.5">{entry.timestamp}</p>
                      <p className="text-sm text-on-surface">
                        <span className="font-semibold">{entry.actor}</span> — {entry.action}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT COLUMN — AI Summary + Decision ═══ */}
        <div className="flex flex-col gap-6">

          {/* ── AI Analysis Card ───────────────────────────────────────── */}
          <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-xl
                          shadow-[0_8px_40px_-12px_rgba(44,47,49,0.06)] overflow-hidden">
            <div className="px-6 py-5 border-b border-outline-variant/15">
              <h3 className="font-headline font-bold text-base text-on-surface">AI Analysis</h3>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[11px] font-semibold font-headline text-on-surface-variant uppercase tracking-widest">
                  Confidence
                </span>
                <span className={`text-lg font-extrabold font-headline tabular-nums ${confidenceColor}`}>
                  {claim.aiConfidence}%
                </span>
              </div>
              {/* Confidence bar */}
              <div className="w-full h-2 rounded-full bg-surface-container mb-5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    claim.aiConfidence >= 85 ? "bg-emerald-500" : claim.aiConfidence >= 60 ? "bg-amber-500" : "bg-error"
                  }`}
                  style={{ width: `${claim.aiConfidence}%` }}
                />
              </div>
              <p className="text-[11px] font-semibold font-headline text-on-surface-variant uppercase tracking-widest mb-2">
                Summary
              </p>
              <p className="text-sm text-on-surface leading-relaxed">{claim.aiSummary}</p>
            </div>
          </div>

          {/* ── Decision Card ──────────────────────────────────────────── */}
          <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-xl
                          shadow-[0_12px_60px_-15px_rgba(44,47,49,0.08)] overflow-hidden
                          lg:sticky lg:top-6">
            <div className="px-6 py-5 border-b border-outline-variant/15">
              <h3 className="font-headline font-bold text-base text-on-surface">Your Decision</h3>
            </div>
            <div className="p-6 flex flex-col gap-4">

              {/* ── 3 decision options ─────────────────────────────────── */}
              <div className="flex flex-col gap-2.5">

                {/* Force Full Approval */}
                <button
                  id="decision-force-approve"
                  onClick={() => setDecision("force_approve")}
                  className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-semibold
                              font-headline transition-all duration-200 active:scale-[0.98] cursor-pointer border text-left ${
                                decision === "force_approve"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm ring-1 ring-emerald-200"
                                  : "bg-surface-container-lowest text-on-surface-variant border-outline-variant/20 hover:border-emerald-300 hover:text-emerald-700"
                              }`}
                >
                  <ShieldCheck className="w-5 h-5 shrink-0" strokeWidth={2} />
                  <div>
                    <p>Force Full Approval</p>
                    <p className="text-[11px] font-normal mt-0.5 opacity-70">
                      Approve the full claimed amount of {claim.amount}
                    </p>
                  </div>
                </button>

                {/* Approve Adjusted Amount — only if AI suggests one */}
                {claim.aiSuggestedAmount && (
                  <button
                    id="decision-adjust"
                    onClick={() => setDecision("adjust")}
                    className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-semibold
                                font-headline transition-all duration-200 active:scale-[0.98] cursor-pointer border text-left ${
                                  decision === "adjust"
                                    ? "bg-amber-50 text-amber-800 border-amber-300 shadow-sm ring-1 ring-amber-200"
                                    : "bg-surface-container-lowest text-on-surface-variant border-outline-variant/20 hover:border-amber-300 hover:text-amber-800"
                                }`}
                  >
                    <Pencil className="w-5 h-5 shrink-0" strokeWidth={2} />
                    <div>
                      <p>Approve Adjusted Amount</p>
                      <p className="text-[11px] font-normal mt-0.5 opacity-70">
                        AI suggests {claim.aiSuggestedAmount} (policy-compliant cap)
                      </p>
                    </div>
                  </button>
                )}

                {/* Confirm Rejection */}
                <button
                  id="decision-reject"
                  onClick={() => setDecision("reject")}
                  className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-semibold
                              font-headline transition-all duration-200 active:scale-[0.98] cursor-pointer border text-left ${
                                decision === "reject"
                                  ? "bg-error/10 text-error-dim border-error/30 shadow-sm ring-1 ring-error/20"
                                  : "bg-surface-container-lowest text-on-surface-variant border-outline-variant/20 hover:border-error/30 hover:text-error-dim"
                              }`}
                >
                  <ShieldX className="w-5 h-5 shrink-0" strokeWidth={2} />
                  <div>
                    <p>Confirm Rejection</p>
                    <p className="text-[11px] font-normal mt-0.5 opacity-70">
                      Deny claim and notify the employee
                    </p>
                  </div>
                </button>
              </div>

              {/* ── Editable adjusted amount (visible when "adjust" is selected) */}
              {decision === "adjust" && (
                <div className="rounded-xl bg-amber-50/60 border border-amber-200/50 p-4">
                  <label htmlFor="adjusted-amount"
                    className="text-[11px] font-semibold font-headline text-amber-800 uppercase tracking-widest mb-2 block">
                    Approved Amount
                  </label>
                  <div className="flex items-center bg-surface-container-lowest rounded-lg ring-1 ring-amber-300
                                  focus-within:ring-primary/40 px-3 py-2.5 transition-all">
                    <span className="text-sm text-on-surface-variant mr-1 font-semibold">$</span>
                    <input
                      id="adjusted-amount"
                      type="text"
                      value={adjustedAmount.replace(/^\$/, "")}
                      onChange={(e) => setAdjustedAmount(e.target.value)}
                      className="w-full bg-transparent text-sm font-semibold text-on-surface outline-none font-body tabular-nums"
                    />
                  </div>
                  <p className="text-[11px] text-amber-700 mt-2">
                    Original: {claim.amount} · AI recommended: {claim.aiSuggestedAmount}
                  </p>
                </div>
              )}

              {/* Note */}
              <div>
                <label htmlFor="review-note" className="text-[11px] font-semibold font-headline text-on-surface-variant uppercase tracking-widest mb-2 block">
                  Note <span className="normal-case tracking-normal font-normal">(optional)</span>
                </label>
                <textarea
                  id="review-note"
                  rows={3}
                  placeholder="Add a note for the employee…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-surface-container-low rounded-xl px-4 py-3 text-sm text-on-surface
                             placeholder:text-on-surface-variant/50 font-body outline-none
                             ring-1 ring-outline-variant/20 focus:ring-primary/40
                             resize-none transition-all"
                />
              </div>

              {/* Submit */}
              <button
                id="submit-review"
                onClick={handleSubmit}
                disabled={!decision}
                className={`w-full py-3 rounded-xl text-sm font-semibold font-headline transition-all
                            duration-200 active:scale-[0.97] ${
                              decision
                                ? "bg-primary text-on-primary shadow-[0_4px_16px_rgba(70,71,211,0.25)] hover:bg-primary-dim cursor-pointer"
                                : "bg-surface-container text-on-surface-variant/50 cursor-not-allowed"
                            }`}
              >
                {decision === "force_approve"
                  ? "Submit Full Approval"
                  : decision === "adjust"
                    ? `Submit Adjusted Approval`
                    : decision === "reject"
                      ? "Submit Rejection"
                      : "Select a decision"}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ── Image Lightbox ─────────────────────────────────────────────── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/60 backdrop-blur-sm p-6"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxUrl}
              alt="Receipt full view"
              className="w-full h-full object-contain"
            />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-inverse-surface/70 text-white
                         flex items-center justify-center hover:bg-inverse-surface transition-colors"
              aria-label="Close lightbox"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Detail row sub-component ─────────────────────────────────────────────────

function DetailRow({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 text-on-surface-variant shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold font-headline text-on-surface-variant uppercase tracking-widest mb-0.5">
          {label}
        </p>
        <p className="text-sm font-medium text-on-surface truncate">{value}</p>
        {sub && <p className="text-[11px] text-on-surface-variant truncate">{sub}</p>}
      </div>
    </div>
  );
}
