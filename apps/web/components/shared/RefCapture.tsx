"use client";

import { useEffect } from "react";
import { captureReferral } from "@/lib/affiliate/referral";

/**
 * Invisible client component that captures an affiliate `?ref=` code on landing
 * and stores it for later attribution at checkout (H3). Mounted in the public
 * layout so any entry point (e.g. `/?ref=CODE`) is covered.
 */
export function RefCapture() {
  useEffect(() => {
    captureReferral(window.location.search);
  }, []);
  return null;
}
