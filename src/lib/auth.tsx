import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  captureAuthCallback,
  friendlyAuthError,
  messageForAuthCallback,
  parseAuthCallback,
  readAuthError,
  stripAuthErrorParams,
  type AuthCallbackSnapshot,
} from "./auth-callback";
import { demoAuth } from "./demo-store";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import type { AuthUser, DataMode } from "./types";

const RECOVERY_KEY = "cmplx-password-recovery";

type AuthContextValue = {
  loading: boolean;
  mode: DataMode;
  user: AuthUser | null;
  isEditor: boolean;
  editorCheckFailed: boolean;
  passwordRecovery: boolean;
  error: string | null;
  notice: string | null;
  linkError: string | null;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  setPassword: (password: string) => Promise<void>;
  retryEditorCheck: () => Promise<void>;
  clearNotice: () => void;
  enterDemo: () => void;
  signOut: () => Promise<void>;
  resetDemo: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const initialCallback: AuthCallbackSnapshot = captureAuthCallback();

if (isSupabaseConfigured && typeof sessionStorage !== "undefined") {
  if (initialCallback.type === "recovery") {
    sessionStorage.setItem(RECOVERY_KEY, "1");
  } else if (initialCallback.type) {
    sessionStorage.removeItem(RECOVERY_KEY);
  }
}

function recoveryPending() {
  if (!isSupabaseConfigured || typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(RECOVERY_KEY) === "1";
}

function clearRecoveryFlag() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(RECOVERY_KEY);
}

async function resolveEditor(email: string): Promise<AuthUser | null> {
  const { data, error } = await getSupabase()
    .from("editors")
    .select("email, display_name")
    .ilike("email", email)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    email: data.email,
    displayName: data.display_name || data.email,
  };
}

function authRedirectTo() {
  return window.location.origin;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isEditor, setIsEditor] = useState(false);
  const [editorCheckFailed, setEditorCheckFailed] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(recoveryPending);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(() =>
    messageForAuthCallback(initialCallback),
  );
  const mode: DataMode = isSupabaseConfigured ? "supabase" : "demo";
  const generation = useRef(0);
  const mounted = useRef(true);

  const settle = useCallback(async (email: string | null) => {
    const id = ++generation.current;
    if (!email) {
      if (!mounted.current || id !== generation.current) return;
      setUser(null);
      setIsEditor(false);
      setEditorCheckFailed(false);
      return;
    }
    try {
      const editor = await resolveEditor(email);
      if (!mounted.current || id !== generation.current) return;
      setUser({
        email,
        displayName: editor?.displayName ?? email,
      });
      setIsEditor(Boolean(editor));
      setEditorCheckFailed(false);
      setError(null);
    } catch (err) {
      if (!mounted.current || id !== generation.current) return;
      setUser({ email, displayName: email });
      setIsEditor(false);
      setEditorCheckFailed(true);
      setError(err instanceof Error ? err.message : "Could not verify editor.");
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    if (!isSupabaseConfigured) {
      const demoUser = demoAuth.getUser();
      setUser(demoUser);
      setIsEditor(Boolean(demoUser));
      setEditorCheckFailed(false);
      setPasswordRecovery(false);
      setLoading(false);
      return () => {
        mounted.current = false;
      };
    }

    const supabase = getSupabase();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        sessionStorage.setItem(RECOVERY_KEY, "1");
        setPasswordRecovery(true);
      }
      if (event === "SIGNED_OUT") {
        clearRecoveryFlag();
        setPasswordRecovery(false);
      }
      const email = session?.user?.email ?? null;
      // The editors query must run after the auth callback returns. Awaiting it
      // inside onAuthStateChange can deadlock the Supabase auth lock.
      window.setTimeout(() => {
        if (!mounted.current) return;
        void settle(email);
      }, 0);
    });

    void (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        await settle(session?.user?.email ?? null);
      } catch (err) {
        if (!mounted.current) return;
        setError(err instanceof Error ? err.message : "Could not restore session.");
      } finally {
        if (mounted.current) setLoading(false);
      }
    })();

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, [settle]);

  useEffect(() => {
    function applyCallbackFromLocation() {
      const snapshot = parseAuthCallback(window.location.href);
      const message = messageForAuthCallback(snapshot);
      if (message) {
        setLinkError(message);
        stripAuthErrorParams();
      }
      if (!isSupabaseConfigured) return;
      if (snapshot.type === "recovery") {
        sessionStorage.setItem(RECOVERY_KEY, "1");
        setPasswordRecovery(true);
      } else if (snapshot.type) {
        clearRecoveryFlag();
        setPasswordRecovery(false);
      }
    }

    // Email clients redirect onto the current tab with only a hash change.
    // The module-level capture already ran for the first URL, so listen here too.
    window.addEventListener("hashchange", applyCallbackFromLocation);
    return () => window.removeEventListener("hashchange", applyCallbackFromLocation);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      mode,
      user,
      isEditor,
      editorCheckFailed,
      passwordRecovery,
      error,
      notice,
      linkError,
      async signInWithPassword(email, password) {
        setError(null);
        setNotice(null);
        if (!isSupabaseConfigured) {
          throw new Error("Password sign-in requires Supabase env vars.");
        }
        const { error: signInError } = await getSupabase().auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw new Error(friendlyAuthError(readAuthError(signInError)));
        clearRecoveryFlag();
        setPasswordRecovery(false);
      },
      async sendMagicLink(email) {
        setError(null);
        setNotice(null);
        if (!isSupabaseConfigured) {
          throw new Error("Magic link requires Supabase env vars.");
        }
        const trimmed = email.trim();
        const { error: otpError } = await getSupabase().auth.signInWithOtp({
          email: trimmed,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: authRedirectTo(),
          },
        });
        if (otpError) throw new Error(friendlyAuthError(readAuthError(otpError)));
        setLinkError(null);
        setNotice(
          `Check ${trimmed} for a sign-in link. It works once. If it expires, request another from this page.`,
        );
      },
      async sendPasswordReset(email) {
        setError(null);
        setNotice(null);
        if (!isSupabaseConfigured) {
          throw new Error("Password reset requires Supabase env vars.");
        }
        const trimmed = email.trim();
        const { error: resetError } = await getSupabase().auth.resetPasswordForEmail(trimmed, {
          redirectTo: authRedirectTo(),
        });
        if (resetError) throw new Error(friendlyAuthError(readAuthError(resetError)));
        setLinkError(null);
        setNotice(
          `Check ${trimmed} for a password reset link. Open it here to choose a new password. If it expires, request another.`,
        );
      },
      async setPassword(password) {
        setError(null);
        if (!isSupabaseConfigured) {
          throw new Error("Setting a password requires Supabase env vars.");
        }
        const { error: updateError } = await getSupabase().auth.updateUser({ password });
        if (updateError) throw new Error(friendlyAuthError(readAuthError(updateError)));
        clearRecoveryFlag();
        setPasswordRecovery(false);
        setNotice("Password saved.");
      },
      async retryEditorCheck() {
        if (!isSupabaseConfigured) return;
        setError(null);
        const {
          data: { session },
        } = await getSupabase().auth.getSession();
        await settle(session?.user?.email ?? null);
      },
      clearNotice() {
        setNotice(null);
      },
      enterDemo() {
        const demoUser = demoAuth.signIn();
        setUser(demoUser);
        setIsEditor(true);
        setEditorCheckFailed(false);
        setPasswordRecovery(false);
        setError(null);
        setNotice(null);
      },
      async signOut() {
        setError(null);
        setNotice(null);
        setLinkError(null);
        setPasswordRecovery(false);
        setEditorCheckFailed(false);
        clearRecoveryFlag();
        if (isSupabaseConfigured) {
          await getSupabase().auth.signOut();
        } else {
          demoAuth.signOut();
        }
        setUser(null);
        setIsEditor(false);
      },
      resetDemo() {
        demoAuth.reset();
        setUser(null);
        setIsEditor(false);
        setNotice("Demo data reset. Enter the workspace again to reload seed projects.");
      },
    }),
    [
      editorCheckFailed,
      error,
      isEditor,
      linkError,
      loading,
      mode,
      notice,
      passwordRecovery,
      settle,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
