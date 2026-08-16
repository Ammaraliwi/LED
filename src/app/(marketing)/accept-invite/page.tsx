"use client";
import { Suspense } from "react";
import { SecureAccountForm } from "@/components/auth/secure-account-form";
export default function AcceptInvitePage() { return <Suspense><SecureAccountForm mode="invite" /></Suspense>; }
