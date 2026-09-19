import { Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Landing } from "./Landing";
import { Layout } from "./Layout";
import { NotEditor } from "./NotEditor";

export function Gate() {
  const { loading, user, isEditor } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <p className="font-serif text-3xl text-ink">Loading_</p>
      </div>
    );
  }

  if (!user) return <Landing />;
  if (!isEditor) return <NotEditor />;

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
