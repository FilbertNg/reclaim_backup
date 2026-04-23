"use server";

// ─── Settings Server Actions ──────────────────────────────────────────────────
// Provides user profile updates and banking/payout details.
// Falls back to mock data until the backend endpoints are built.
// ──────────────────────────────────────────────────────────────────────────────

import { apiGet, apiPut, API_PREFIX } from "@/lib/api/client";
import type { BankingDetails, User, UserProfileUpdate } from "@/lib/api/types";

// ─── Mock Fallback ───────────────────────────────────────────────────────────

const MOCK_BANKING: BankingDetails = {
  id: "bank-1",
  institutionName: "Chase Checking",
  accountLastFour: "4092",
  routingType: "Primary routing",
  updatedAt: "2 months ago",
};

// ─── Actions ─────────────────────────────────────────────────────────────────

/** Fetch user banking/payout details. */
export async function getBankingDetails(): Promise<BankingDetails> {
  const result = await apiGet<BankingDetails>(`${API_PREFIX}/employee/banking`);
  return result.data ?? MOCK_BANKING;
}

/** Update the user's profile information. */
export async function updateProfile(
  data: UserProfileUpdate
): Promise<{ user: User | null; error: string | null }> {
  const result = await apiPut<User>(`${API_PREFIX}/auth/me`, data);
  return { user: result.data, error: result.error };
}
