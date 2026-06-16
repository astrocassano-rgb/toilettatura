"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tryCreateSupabaseBrowserClient } from "@/lib/supabase/optional";
import { safeGetSession } from "@/lib/supabase/safe-session";

export function LogoutButton() {
  const router = useRouter();
  const supabase = useMemo(() => tryCreateSupabaseBrowserClient(), []);
  const [isLogged, setIsLogged] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;
    const loadSession = async () => {
      const { data } = await safeGetSession(supabase);
      if (mounted) setIsLogged(Boolean(data.session));
    };

    void loadSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLogged(Boolean(session));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    if (!supabase) return;
    setLoading(true);
    await supabase.auth.signOut();
    setIsLogged(false);
    router.replace("/login");
    router.refresh();
    setLoading(false);
  };

  if (!isLogged) return null;

  return (
    <Button type="button" variant="ghost" size="md" onClick={() => void handleLogout()} disabled={loading}>
      <LogOut className="h-4 w-4" />
      {loading ? "Uscita..." : "Logout"}
    </Button>
  );
}
