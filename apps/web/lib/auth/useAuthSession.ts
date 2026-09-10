"use client";

import { useEffect, useState } from "react";
import { fetchAuthSession, type AuthSessionResult } from "./session";

const INITIAL: AuthSessionResult = { isLoggedIn: false, user: null };

/**
 * React wrapper around fetchAuthSession() for UI chrome that needs to know
 * "is anyone logged in" on mount — e.g. Navbar. See lib/auth/session.ts for
 * why this must go through the refresh-aware check rather than a bare token
 * read.
 */
export function useAuthSession(): AuthSessionResult {
  const [state, setState] = useState<AuthSessionResult>(INITIAL);

  useEffect(() => {
    let cancelled = false;
    fetchAuthSession().then((result) => {
      if (!cancelled) setState(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
