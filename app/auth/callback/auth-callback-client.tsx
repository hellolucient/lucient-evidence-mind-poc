"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  buildAuthCallbackFailureRedirect,
  buildAuthCallbackSuccessRedirect,
  parseAuthCallbackParams,
  resolveAuthRedirectOrigin,
  sanitizeAuthNextPath,
} from "@/lib/supabase/auth-callback";
import { createSupabaseAuthBrowserClient } from "@/lib/supabase/auth-browser";
import { completeAuthCallback } from "@/lib/supabase/complete-auth-callback";
import { isSupabaseAuthConfigured } from "@/lib/supabase/auth-server";

export function AuthCallbackClient() {
  const router = useRouter();
  const message = "Completing sign-in…";

  useEffect(() => {
    let cancelled = false;

    async function finishAuthCallback() {
      if (!isSupabaseAuthConfigured()) {
        router.replace(buildAuthCallbackFailureRedirect(window.location.origin));
        return;
      }

      const callbackUrl = new URL(window.location.href);
      const params = parseAuthCallbackParams(callbackUrl);
      const origin = resolveAuthRedirectOrigin(new Request(window.location.href));
      const nextPath = sanitizeAuthNextPath(params.next);

      try {
        const supabase = createSupabaseAuthBrowserClient();
        const result = await completeAuthCallback(supabase, params);

        if (cancelled) {
          return;
        }

        if (!result.ok) {
          router.replace(buildAuthCallbackFailureRedirect(origin));
          return;
        }

        router.replace(buildAuthCallbackSuccessRedirect(origin, nextPath));
      } catch {
        if (!cancelled) {
          router.replace(buildAuthCallbackFailureRedirect(origin));
        }
      }
    }

    void finishAuthCallback();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: "2rem",
        maxWidth: "480px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ marginTop: 0 }}>Signing you in</h1>
      <p style={{ color: "#444" }}>{message}</p>
    </main>
  );
}
