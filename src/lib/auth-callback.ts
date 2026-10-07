export type AuthCallbackSnapshot = {
  error: string | null;
  errorCode: string | null;
  errorDescription: string | null;
  type: string | null;
};

export const EMPTY_AUTH_CALLBACK: AuthCallbackSnapshot = {
  error: null,
  errorCode: null,
  errorDescription: null,
  type: null,
};

const EXPIRED_CODES = new Set([
  "otp_expired",
  "flow_state_expired",
  "flow_state_not_found",
]);

export type AuthErrorInput = {
  message?: string;
  code?: string;
  detailsCode?: string;
};

export function friendlyAuthError(input: AuthErrorInput): string {
  const code = input.detailsCode || input.code || "";
  const message = (input.message ?? "").replace(/\+/g, " ").trim();
  const lower = `${code} ${message}`.toLowerCase();

  if (
    EXPIRED_CODES.has(code) ||
    lower.includes("expired") ||
    lower.includes("invalid or has expired") ||
    lower.includes("already been used")
  ) {
    return "This invite or sign-in link expired or was already used. Use Email link to request a new one, or switch to Password if you already set one. Links are one-time.";
  }

  if (code === "invalid_credentials" || lower.includes("invalid login credentials")) {
    return "That email and password did not match. If you have not set a password yet, use Email link instead.";
  }

  if (
    code === "user_not_found" ||
    code === "otp_disabled" ||
    lower.includes("signups not allowed") ||
    lower.includes("user not found")
  ) {
    return "No CMPLX account exists for that email. Invites are sent by CMPLX — there is no public signup. Ask CMPLX to add you as an editor, then send a Supabase Auth invite to the same address.";
  }

  if (
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    lower.includes("rate limit") ||
    lower.includes("only request this after")
  ) {
    return "Too many emails were requested just now. Wait a minute, then try again.";
  }

  if (code === "email_address_invalid" || lower.includes("unable to validate email address")) {
    return "That email address is not valid. Use the address CMPLX invited.";
  }

  if (message) return message;
  return "Something went wrong. Try again, or request a new email link.";
}

export function parseAuthCallback(href: string): AuthCallbackSnapshot {
  const url = new URL(href, "http://localhost");
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const read = (key: string) => hash.get(key) ?? url.searchParams.get(key);

  return {
    error: read("error"),
    errorCode: read("error_code"),
    errorDescription: read("error_description"),
    type: read("type"),
  };
}

export function messageForAuthCallback(snapshot: AuthCallbackSnapshot): string | null {
  if (!snapshot.error && !snapshot.errorCode && !snapshot.errorDescription) return null;
  return friendlyAuthError({
    code: snapshot.errorCode ?? snapshot.error ?? undefined,
    detailsCode: snapshot.errorCode ?? undefined,
    message: snapshot.errorDescription ?? undefined,
  });
}

let captured: AuthCallbackSnapshot | null = null;

export function captureAuthCallback(): AuthCallbackSnapshot {
  if (captured) return captured;
  if (typeof window === "undefined") {
    captured = EMPTY_AUTH_CALLBACK;
    return captured;
  }
  captured = parseAuthCallback(window.location.href);
  stripAuthErrorParams();
  return captured;
}

export function stripAuthErrorParams(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  let changed = false;
  for (const key of ["error", "error_code", "error_description"]) {
    if (hash.has(key)) {
      hash.delete(key);
      changed = true;
    }
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (!changed) return;
  const nextHash = hash.toString();
  url.hash = nextHash ? `#${nextHash}` : "";
  window.history.replaceState(window.history.state, "", url.toString());
}

export function readAuthError(error: unknown): AuthErrorInput {
  if (!error || typeof error !== "object") {
    return { message: "Request failed." };
  }
  const record = error as {
    message?: unknown;
    code?: unknown;
    details?: { code?: unknown };
  };
  return {
    message: typeof record.message === "string" ? record.message : "Request failed.",
    code: typeof record.code === "string" ? record.code : undefined,
    detailsCode:
      record.details && typeof record.details.code === "string"
        ? record.details.code
        : undefined,
  };
}
