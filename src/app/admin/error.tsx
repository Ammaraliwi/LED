"use client";

import { AlertTriangle } from "lucide-react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.04] p-8 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-red-300" /><h2 className="mt-4 font-display text-xl font-semibold">Admin view could not be loaded</h2><p className="mt-2 text-sm text-muted">{error.message === "Multi-factor authentication is required for this staff account" ? "Complete MFA enrollment in Settings before using this module." : "The request was stopped safely. Retry, or review the server logs using the request digest."}</p>{error.digest && <p className="mt-2 font-mono text-xs text-muted">Digest: {error.digest}</p>}<button onClick={reset} className="mt-5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black">Try again</button></div>;
}
