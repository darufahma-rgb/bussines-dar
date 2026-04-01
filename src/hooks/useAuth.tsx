import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth.me()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { user } = await api.auth.signIn(email, password);
      setUser(user);
      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message } };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { user } = await api.auth.signUp(email, password);
      setUser(user);
      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message } };
    }
  };

  const signOut = async () => {
    await api.auth.signOut();
    setUser(null);
  };

  return { user, loading, signIn, signUp, signOut };
}
