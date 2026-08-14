"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/logo";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  const router = useRouter();

  return (
    <section className="py-20">
      <Container className="max-w-lg">
        <div className="text-center">
          <Link href="/" className="inline-flex">
            <Logo />
          </Link>
          <h1 className="font-display mt-8 text-3xl font-semibold tracking-tight">Create your account</h1>
          <p className="mt-2 text-sm text-muted">Register to book screens, track events and manage invoices.</p>
        </div>

        <div className="mt-10">
          <RegisterForm
            onSuccess={() => {
              router.push("/portal");
              router.refresh();
            }}
          />
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </Container>
    </section>
  );
}
