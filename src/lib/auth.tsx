import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { demoAuth } from "./demo-store";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import type { AuthUser, DataMode } from "./types";

type AuthContextValue = {
  loading: boolean;
  mode: DataMode;
  user: AuthUser | null;
  isEditor: boolean;
  error: string | null;
  notice: string | null;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  enterDemo: () => void;
  signOut: () => Promise<void>;
  resetDemo: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isEditor, setIsEditor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const mode: DataMode = isSupabaseConfigured ? "supabase" : "demo";

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        if (!isSupabaseConfigured) {
          const demoUser = demoAuth.getUser();
          if (!cancelled) {
            setUser(demoUser);
            setIsEditor(Boolean(demoUser));
          }
          return;
        }

        const supabase = getSupabase();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user?.email) {
          if (!cancelled) {
            setUser(null);
            setIsEditor(false);
          }
          return;
        }

        const editor = await resolveEditor(session.user.email);
        if (!cancelled) {
          setUser({
            email: session.user.email,
            displayName: editor?.displayName ?? session.user.email,
          });
          setIsEditor(Boolean(editor));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not restore session.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void hydrate();

    if (!isSupabaseConfigured) return () => {
      cancelled = true;
    };

    const supabase = getSupabase();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        if (!session?.user?.email) {
          setUser(null);
          setIsEditor(false);
          return;
        }
        try {
          const editor = await resolveEditor(session.user.email);
          setUser({
            email: session.user.email,
            displayName: editor?.displayName ?? session.user.email,
          });
          setIsEditor(Boolean(editor));
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not verify editor.");
        }
      })();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      mode,
      user,
      isEditor,
      error,
      notice,
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
        if (signInError) throw new Error(signInError.message);
      },
      async sendMagicLink(email) {
        setError(null);
        setNotice(null);
        if (!isSupabaseConfigured) {
          throw new Error("Magic link requires Supabase env vars.");
        }
        const { error: otpError } = await getSupabase().auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: window.location.origin },
        });
        if (otpError) throw new Error(otpError.message);
        setNotice("Check your email for the magic link.");
      },
      enterDemo() {
        const demoUser = demoAuth.signIn();
        setUser(demoUser);
        setIsEditor(true);
        setError(null);
        setNotice(null);
      },
      async signOut() {
        setError(null);
        setNotice(null);
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
    [isEditor, loading, mode, notice, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
