import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { signUp } from "../../lib/auth-client";
import { AuthShell } from "../../components/AuthShell";
import { FormError } from "../../components/form/FormError";

export const Route = createFileRoute("/_unauth/signup")({ component: Signup });

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: signUpError } = await signUp.email({ name, email, password });
    setBusy(false);
    if (signUpError) return setError(signUpError.message ?? "Sign up failed");
    // Full reload so the server beforeLoad re-resolves the new session and SSRs
    // the app shell (mirrors login).
    window.location.href = "/assistant";
  }

  return (
    <AuthShell title="Create your account" subtitle="Start version-controlled legal review.">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={submit} className="flex flex-col gap-stack">
            <div className="flex flex-col gap-field">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-field">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-field">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
            <FormError>{error}</FormError>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Creating…" : "Sign up"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="text-center text-sm text-muted-foreground">
        Have an account?{" "}
        <Link to="/login" className="text-foreground underline underline-offset-4">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
