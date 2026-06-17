"use client";

import { create } from "zustand";
import { tryCreateSupabaseBrowserClient } from "@/lib/supabase/optional";

export type WalletPackId = "starter" | "premium" | "max";

export type WalletState = {
  balanceCredits: number | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

export const useWalletStore = create<WalletState>((set) => ({
  balanceCredits: null,
  loading: false,
  refresh: async () => {
    const supabase = tryCreateSupabaseBrowserClient();
    if (!supabase) return;

    set({ loading: true });
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        set({ balanceCredits: 0 });
        return;
      }

      const { data } = await supabase.from("wallets").select("balance_credits").eq("customer_id", userData.user.id).maybeSingle();
      set({ balanceCredits: data?.balance_credits ?? 0 });
    } finally {
      set({ loading: false });
    }
  }
}));

export function estimateMinutesFromCredits(credits: number) {
  return Math.max(0, Math.floor(credits));
}
