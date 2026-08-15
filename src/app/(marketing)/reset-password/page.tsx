"use client";
import { Suspense } from "react";
import { SecureAccountForm } from "@/components/auth/secure-account-form";
export default function ResetPasswordPage() { return <Suspense><SecureAccountForm mode="reset" /></Suspense>; }
