import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const RECOVERY_TOKENS_KEY = "pw_recovery_tokens";

function capturePasswordRecoveryTokensEarly() {
  // IMPORTANT: This runs BEFORE we import any module that might import the Supabase client.
  // Supabase-js can auto-create a session from URL hash tokens; we prevent that by moving
  // recovery tokens out of the hash and clearing it before app bootstrap.
  const hash = window.location.hash;
  if (!hash || hash.length < 2) return;

  const hashParams = new URLSearchParams(hash.slice(1));
  const type = hashParams.get("type");
  const access_token = hashParams.get("access_token");
  const refresh_token = hashParams.get("refresh_token");

  // Only intercept password recovery implicit hash links.
  if (type !== "recovery" || !access_token || !refresh_token) return;

  // Store tokens temporarily for the reset page to use on submit.
  sessionStorage.setItem(
    RECOVERY_TOKENS_KEY,
    JSON.stringify({
      type,
      access_token,
      refresh_token,
    })
  );

  // Ensure we start on the reset page, with NO hash present.
  // This prevents auto-session creation during client init.
  const search = window.location.search || "";
  const nextPath = `/reset-password${search}`;
  window.history.replaceState(null, "", nextPath);
}

capturePasswordRecoveryTokensEarly();

// Dynamically import AppBootstrap AFTER recovery tokens are captured and hash is cleared.
import("@/components/AppBootstrap").then(({ AppBootstrap }) => {
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <AppBootstrap />
    </React.StrictMode>
  );
});

