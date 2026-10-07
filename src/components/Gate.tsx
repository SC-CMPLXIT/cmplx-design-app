import { Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { EditorCheckFailed } from "./EditorCheckFailed";
import { Landing } from "./Landing";
import { Layout } from "./Layout";
import { NotEditor } from "./NotEditor";
import { SetPassword } from "./SetPassword";

export function Gate() {
  const { loading, mode, user, isEditor, editorCheckFailed, passwordRecovery } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <p className="font-serif text-3xl text-ink">Loading_</p>
      </div>
    );
  }

  if (!user) return <Landing />;
  if (editorCheckFailed) return <EditorCheckFailed />;
  if (!isEditor) return <NotEditor />;
  if (mode === "supabase" && passwordRecovery) return <SetPassword />;

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
