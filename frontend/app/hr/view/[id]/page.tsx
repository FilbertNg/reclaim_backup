"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Receipt,
  MapPin,
  Calendar,
  DollarSign,
  Tag,
  User,
  Clock,
  ChevronDown,
  ImageIcon,
  ZoomIn,
  Sparkles,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
} from "lucide-react";

// ─── Types (mirrors backend schema) ──────────────────────────────────────────

type AiStatus = "Auto-Approved" | "Policy Flagged" | "Awaiting Review" | "Low Confidence";

interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
}

interface ApprovedClaimDetail {
  id: string;
  employee: { name: string; initials: string; department: string; email: string };
  submittedAt: string;
  approvedAt: string;
  approvedBy: string;
  amount: string;
  approvedAmount: string;
  currency: string;
  category: string;
  status: AiStatus;
  vendor: string;
  location: string;
  description: string;
  receiptUrls: string[];
  aiConfidence: number;
  aiSummary: string;
  auditLog: AuditLogEntry[];
}

// ─── Mock Data (replace with API fetch: GET /api/hr/claims/{id}) ──────────────

const MOCK_APPROVED: Record<string, ApprovedClaimDetail> = {
  "clm-006": {
    id: "clm-006",
    employee: { name: "James Okafor", initials: "JO", department: "Operations", email: "j.okafor@company.com" },
    submittedAt: "Oct 24, 2023 · 9:11 AM",
    approvedAt: "Oct 24, 2023 · 9:12 AM",
    approvedBy: "Reclaim AI",
    amount: "$89.00",
    approvedAmount: "$89.00",
    currency: "USD",
    category: "Office Supplies",
    status: "Auto-Approved",
    vendor: "Amazon Business",
    location: "Online",
    description: "Replacement USB-C hub and desk cable management kit.",
    receiptUrls: ["https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=800&fit=crop"],
    aiConfidence: 98,
    aiSummary: "Receipt matches vendor, amount is within the $150 office supplies limit, and category coding is correct. Auto-approved with high confidence.",
    auditLog: [
      { id: "al-1", timestamp: "Oct 24, 9:11 AM", actor: "James Okafor", action: "Submitted claim" },
      { id: "al-2", timestamp: "Oct 24, 9:12 AM", actor: "Reclaim AI", action: "Extracted receipt data (98% confidence)" },
      { id: "al-3", timestamp: "Oct 24, 9:12 AM", actor: "Reclaim AI", action: "All policy checks passed — auto-approved" },
    ],
  },
  "clm-007": {
    id: "clm-007",
    employee: { name: "Liu Wei", initials: "LW", department: "Sales", email: "l.wei@company.com" },
    submittedAt: "Oct 23, 2023 · 1:45 PM",
    approvedAt: "Oct 23, 2023 · 1:46 PM",
    approvedBy: "Reclaim AI",
    amount: "$210.50",
    approvedAmount: "$210.50",
    currency: "USD",
    category: "Meals & Entertainment",
    status: "Auto-Approved",
    vendor: "The Capital Grille",
    location: "Chicago, IL",
    description: "Client dinner for Q4 renewal discussion with Acme Corp.",
    receiptUrls: [
      "https://images.unsplash.com/photo-1572883454114-1cf0031ede2a?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&h=800&fit=crop",
    ],
    aiConfidence: 96,
    aiSummary: "Receipt and vendor match. Amount is within the $250 client entertainment limit. Guest count and business purpose noted. Auto-approved.",
    auditLog: [
      { id: "al-4", timestamp: "Oct 23, 1:45 PM", actor: "Liu Wei", action: "Submitted claim" },
      { id: "al-5", timestamp: "Oct 23, 1:46 PM", actor: "Reclaim AI", action: "Extracted receipt data (96% confidence)" },
      { id: "al-6", timestamp: "Oct 23, 1:46 PM", actor: "Reclaim AI", action: "All policy checks passed — auto-approved" },
    ],
  },
  "clm-008": {
    id: "clm-008",
    employee: { name: "Aisha Patel", initials: "AP", department: "HR", email: "a.patel@company.com" },
    submittedAt: "Oct 22, 2023 · 8:30 AM",
    approvedAt: "Oct 22, 2023 · 8:31 AM",
    approvedBy: "Reclaim AI",
    amount: "$55.00",
    approvedAmount: "$55.00",
    currency: "USD",
    category: "Transportation",
    status: "Auto-Approved",
    vendor: "Uber Business",
    location: "San Francisco, CA",
    description: "Rideshare to San Francisco office for all-hands meeting.",
    receiptUrls: [],
    aiConfidence: 94,
    aiSummary: "Rideshare receipt verified via Uber Business integration. Amount within $75 local transport policy. Auto-approved.",
    auditLog: [
      { id: "al-7", timestamp: "Oct 22, 8:30 AM", actor: "Aisha Patel", action: "Submitted claim" },
      { id: "al-8", timestamp: "Oct 22, 8:31 AM", actor: "Reclaim AI", action: "Verified via Uber Business API (94% confidence)" },
      { id: "al-9", timestamp: "Oct 22, 8:31 AM", actor: "Reclaim AI", action: "All policy checks passed — auto-approved" },
    ],
  },
};

// ─── Page Component ───────────────────────────────────────────────────────────

export default function ClaimViewPage() {
  const params = useParams();
  const router = useRouter();
  const claimId = params.id as string;

  // TODO: Replace with useSWR / useQuery → GET /api/hr/claims/{id}
  const claim: ApprovedClaimDetail | undefined = MOCK_APPROVED[claimId];

  const [showAuditLog, setShowAuditLog] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [hrDecision, setHrDecision] = useState<"confirm" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // ── 404 ────────────────────────────────────────────────────────────────
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

  const confidenceColor = claim.aiConfidence >= 90 ? "text-emerald-600" : "text-amber-600";

  // TODO: Wire to backend POST /api/hr/claims/{id}/confirm
  function handleConfirm() {
    const payload = { claimId, action: "confirm", note };
    console.log("HR confirmed approval:", payload);
    setSubmitted(true);
    router.push("/hr/dashboard");
  }

  // TODO: Wire to backend POST /api/hr/claims/{id}/reject-approval
  // This moves the claim back to the attention queue with status "Awaiting Review"
  function handleReject() {
    const payload = { claimId, action: "reject_approval", note };
    console.log("HR rejected AI approval:", payload);
    setSubmitted(true);
    router.push("/hr/dashboard");
  }

  return (
    <div className="relative min-h-full p-6 md:p-10 lg:p-12">

      {/* Ambient gradient */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-[420px] h-[420px] rounded-full bg-emerald-500 opacity-[0.04] blur-[80px]" />
        <div className="absolute top-40 right-32 w-[260px] h-[260px] rounded-full bg-primary opacity-[0.04] blur-[64px]" />
      </div>

      {/* Back + title */}
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
            Review AI Approval
          </h2>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs
                           font-semibold w-fit bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />
            Pending HR Confirmation
          </span>
        </div>
        <p className="text-on-surface-variant text-sm mt-1 font-body">
          Claim <span className="font-mono font-semibold">{claim.id}</span> · Submitted {claim.submittedAt}
        </p>
      </div>

      {/* 2-column layout */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">

        {/* ═══ LEFT COLUMN ═══ */}
        <div className="flex flex-col gap-6">

          {/* Claim Details */}
          <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-xl
                          shadow-[0_8px_40px_-12px_rgba(44,47,49,0.06)] overflow-hidden">
            <div className="px-6 py-5 border-b border-outline-variant/15">
              <h3 className="font-headline font-bold text-base text-on-surface">Claim Details</h3>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8">
              <DetailRow icon={<User className="w-4 h-4" />} label="Employee" value={claim.employee.name} sub={`${claim.employee.department} · ${claim.employee.email}`} />
              <DetailRow icon={<DollarSign className="w-4 h-4" />} label="Amount Claimed" value={claim.amount} sub={claim.currency} />
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

          {/* Uploaded Evidence */}
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
                    <img src={url} alt={`Receipt ${i + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105" />
                    <div className="absolute inset-0 bg-inverse-surface/0 group-hover/img:bg-inverse-surface/20
                                    flex items-center justify-center transition-all">
                      <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover/img:opacity-100 transition-opacity drop-shadow-lg" strokeWidth={2} />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 flex flex-col items-center gap-2 text-center">
                <ImageIcon className="w-8 h-8 text-outline-variant" strokeWidth={1.5} />
                <p className="text-sm text-on-surface-variant font-medium">No receipt images uploaded</p>
                <p className="text-xs text-on-surface-variant/70">This claim was verified via a direct integration or API.</p>
              </div>
            )}
          </div>

          {/* Audit Trail */}
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
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showAuditLog ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"}`}>
              <div className="px-6 pb-6">
                <div className="relative pl-6 border-l-2 border-outline-variant/20 flex flex-col gap-4">
                  {claim.auditLog.map((entry) => (
                    <div key={entry.id} className="relative">
                      <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-surface-container-lowest border-2 border-emerald-400/60" />
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

        {/* ═══ RIGHT COLUMN ═══ */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-6 lg:h-fit">

          {/* Approval Summary */}
          <div className="bg-emerald-50/80 backdrop-blur-xl rounded-xl border border-emerald-200/50
                          shadow-[0_8px_40px_-12px_rgba(16,185,129,0.12)] overflow-hidden">
            <div className="px-6 py-5 border-b border-emerald-200/40 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
              <h3 className="font-headline font-bold text-base text-emerald-800">Approval Summary</h3>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-semibold font-headline text-emerald-700 uppercase tracking-widest mb-1">
                    Approved By
                  </p>
                  <p className="text-sm font-semibold text-emerald-900">{claim.approvedBy}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold font-headline text-emerald-700 uppercase tracking-widest mb-1">
                    Approved At
                  </p>
                  <p className="text-sm font-medium text-emerald-900">{claim.approvedAt}</p>
                </div>
              </div>
              <div className="rounded-xl bg-emerald-100/60 border border-emerald-200/50 p-4">
                <p className="text-[11px] font-semibold font-headline text-emerald-700 uppercase tracking-widest mb-1">
                  Amount Approved
                </p>
                <p className="text-2xl font-extrabold font-headline text-emerald-800 tabular-nums">
                  {claim.approvedAmount}
                </p>
                {claim.approvedAmount !== claim.amount && (
                  <p className="text-xs text-emerald-600 mt-1">Original claim: {claim.amount}</p>
                )}
              </div>
            </div>
          </div>

          {/* AI Analysis */}
          <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-xl
                          shadow-[0_8px_40px_-12px_rgba(44,47,49,0.06)] overflow-hidden">
            <div className="px-6 py-5 border-b border-outline-variant/15 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" strokeWidth={2} />
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
              <div className="w-full h-2 rounded-full bg-surface-container mb-5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${claim.aiConfidence}%` }}
                />
              </div>
              <p className="text-[11px] font-semibold font-headline text-on-surface-variant uppercase tracking-widest mb-2">
                Summary
              </p>
              <p className="text-sm text-on-surface leading-relaxed">{claim.aiSummary}</p>
            </div>
          </div>

          {/* ── HR Action Card ──────────────────────────────────────────── */}
          <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-xl
                          shadow-[0_12px_60px_-15px_rgba(44,47,49,0.08)] overflow-hidden">
            <div className="px-6 py-5 border-b border-outline-variant/15">
              <h3 className="font-headline font-bold text-base text-on-surface">HR Confirmation</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Verify the AI decision before finalising.
              </p>
            </div>
            <div className="p-6 flex flex-col gap-4">

              {/* Decision buttons */}
              <div className="flex flex-col gap-2.5">
                <button
                  id="decision-confirm"
                  onClick={() => setHrDecision("confirm")}
                  className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-semibold
                              font-headline transition-all duration-200 active:scale-[0.98] cursor-pointer border text-left ${
                                hrDecision === "confirm"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm ring-1 ring-emerald-200"
                                  : "bg-surface-container-lowest text-on-surface-variant border-outline-variant/20 hover:border-emerald-300 hover:text-emerald-700"
                              }`}
                >
                  <ShieldCheck className="w-5 h-5 shrink-0" strokeWidth={2} />
                  <div>
                    <p>Confirm Approval</p>
                    <p className="text-[11px] font-normal mt-0.5 opacity-70">
                      Finalise AI decision — approve {claim.approvedAmount}
                    </p>
                  </div>
                </button>

                <button
                  id="decision-reject-approval"
                  onClick={() => setHrDecision("reject")}
                  className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-semibold
                              font-headline transition-all duration-200 active:scale-[0.98] cursor-pointer border text-left ${
                                hrDecision === "reject"
                                  ? "bg-amber-50 text-amber-800 border-amber-300 shadow-sm ring-1 ring-amber-200"
                                  : "bg-surface-container-lowest text-on-surface-variant border-outline-variant/20 hover:border-amber-300 hover:text-amber-800"
                              }`}
                >
                  <ShieldX className="w-5 h-5 shrink-0" strokeWidth={2} />
                  <div>
                    <p>Reject AI Approval</p>
                    <p className="text-[11px] font-normal mt-0.5 opacity-70">
                      Flag as Awaiting Review — move to Requires Attention
                    </p>
                  </div>
                </button>
              </div>

              {/* Rejection warning banner */}
              {hrDecision === "reject" && (
                <div className="flex items-start gap-3 rounded-xl bg-amber-50/80 border border-amber-200/60 px-4 py-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    This claim will be moved to the <span className="font-semibold">Requires Attention</span> queue
                    with status <span className="font-semibold">Awaiting Review</span> for manual HR investigation.
                  </p>
                </div>
              )}

              {/* Note */}
              <div>
                <label htmlFor="hr-note"
                  className="text-[11px] font-semibold font-headline text-on-surface-variant uppercase tracking-widest mb-2 block">
                  Note <span className="normal-case tracking-normal font-normal">(optional)</span>
                </label>
                <textarea
                  id="hr-note"
                  rows={3}
                  placeholder="Add a note for the record…"
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
                id="submit-hr-decision"
                onClick={hrDecision === "confirm" ? handleConfirm : handleReject}
                disabled={!hrDecision}
                className={`w-full py-3 rounded-xl text-sm font-semibold font-headline transition-all
                            duration-200 active:scale-[0.97] ${
                              hrDecision === "confirm"
                                ? "bg-emerald-600 text-white shadow-[0_4px_16px_rgba(16,185,129,0.3)] hover:bg-emerald-700 cursor-pointer"
                                : hrDecision === "reject"
                                  ? "bg-amber-500 text-white shadow-[0_4px_16px_rgba(245,158,11,0.3)] hover:bg-amber-600 cursor-pointer"
                                  : "bg-surface-container text-on-surface-variant/50 cursor-not-allowed"
                            }`}
              >
                {hrDecision === "confirm"
                  ? "Confirm & Finalise Approval"
                  : hrDecision === "reject"
                    ? "Reject & Send for Review"
                    : "Select a decision"}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/60 backdrop-blur-sm p-6"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightboxUrl} alt="Receipt full view" className="w-full h-full object-contain" />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-inverse-surface/70 text-white
                         flex items-center justify-center hover:bg-inverse-surface transition-colors"
              aria-label="Close lightbox"
            >✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function DetailRow({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 text-on-surface-variant shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold font-headline text-on-surface-variant uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-sm font-medium text-on-surface truncate">{value}</p>
        {sub && <p className="text-[11px] text-on-surface-variant truncate">{sub}</p>}
      </div>
    </div>
  );
}
