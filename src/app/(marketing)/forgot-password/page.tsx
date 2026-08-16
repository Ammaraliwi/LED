"use client";
import { Suspense } from "react";
import { SecureAccountForm } from "@/components/auth/secure-account-form";
export default function ForgotPasswordPage() { return <Suspense><SecureAccountForm mode="forgot" /></Suspense>; }
