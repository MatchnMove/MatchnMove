"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  MailCheck,
  ShieldCheck,
} from "lucide-react";
import { cx } from "@/lib/utils";

type SecurityMover = {
  email: string;
  emailVerified: boolean;
  documentsCount: number;
  readiness: {
    completion: number;
    checks: Array<{
      key: string;
      complete: boolean;
      label: string;
    }>;
  };
};

type BillingSnapshot = {
  paymentMethod: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
  stripeEnabled: boolean;
};

type AsyncActionState = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
};

type Props = {
  mover: SecurityMover;
  onOpenDestination: (destination: "profile" | "documents" | "payments") => void;
};

function formatCardBrand(brand: string) {
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

function createAsyncState(): AsyncActionState {
  return { status: "idle", message: "" };
}

export function MoverSecurityPanel({ mover, onOpenDestination }: Props) {
  const router = useRouter();
  const [billing, setBilling] = useState<BillingSnapshot | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [verifyState, setVerifyState] = useState<AsyncActionState>(createAsyncState);
  const [resetState, setResetState] = useState<AsyncActionState>(createAsyncState);
  const [navigationState, setNavigationState] = useState<"profile" | "documents" | "payments" | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    password: "",
    confirmPassword: "",
  });
  const [passwordState, setPasswordState] = useState<{ loading: boolean; message: string; error: string }>({
    loading: false,
    message: "",
    error: "",
  });

  useEffect(() => {
    let active = true;

    async function loadBilling() {
      setBillingLoading(true);
      setBillingError(null);

      const response = await fetch("/api/mover/billing", { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as (BillingSnapshot & { error?: string }) | null;

      if (!active) return;

      if (!response.ok) {
        setBilling(null);
        setBillingError(data?.error ?? "Could not load billing security details.");
        setBillingLoading(false);
        return;
      }

      setBilling({
        paymentMethod: data?.paymentMethod ?? null,
        stripeEnabled: Boolean(data?.stripeEnabled),
      });
      setBillingLoading(false);
    }

    loadBilling();

    return () => {
      active = false;
    };
  }, []);

  const readinessMap = useMemo(() => new Map(mover.readiness.checks.map((check) => [check.key, check])), [mover.readiness.checks]);
  const documentsReady = readinessMap.get("docs")?.complete ?? mover.documentsCount > 0;
  const profileReady = ["contact", "business", "serviceAreas", "logo"].every((key) => readinessMap.get(key)?.complete);
  const paymentMethodReady = Boolean(billing?.paymentMethod);
  const checklistCompletion = Math.round(([
    mover.emailVerified,
    paymentMethodReady,
    documentsReady,
    profileReady,
  ].filter(Boolean).length / 4) * 100);

  const checklistItems = [
    {
      key: "email",
      title: "Email verified",
      complete: mover.emailVerified,
      description: mover.emailVerified ? "Your recovery email is confirmed." : "Verify your email to secure your account and keep full access protected.",
      action: (
        <FeedbackButton
          kind="secondary"
          state={verifyState.status}
          defaultLabel="Resend verification email"
          loadingLabel="Sending..."
          successLabel="Sent"
          onClick={resendVerification}
          disabled={mover.emailVerified}
          iconIdle={<MailCheck className="h-4 w-4" />}
        />
      ),
    },
    {
      key: "payment",
      title: "Billing method ready",
      complete: paymentMethodReady,
      description: billingLoading
        ? "Checking your billing setup..."
        : billing?.stripeEnabled === false
          ? "Billing setup is temporarily unavailable."
          : paymentMethodReady
            ? `Card ending in ${billing?.paymentMethod?.last4} is available for invoice payments if needed.`
            : "Adding a card is optional. You can still access leads and receive a month-end invoice.",
      action: (
        <NavigationButton
          label={paymentMethodReady ? "Manage billing" : "Add billing card"}
          active={navigationState === "payments"}
          onClick={() => openDestination("payments")}
        />
      ),
    },
    {
      key: "documents",
      title: "Documents uploaded",
      complete: documentsReady,
      description: documentsReady ? "Required business documents are on file." : "Upload your business documents to strengthen trust and readiness.",
      action: (
        <NavigationButton
          label={documentsReady ? "Review documents" : "Upload documents"}
          active={navigationState === "documents"}
          onClick={() => openDestination("documents")}
        />
      ),
    },
    {
      key: "profile",
      title: "Profile completed",
      complete: profileReady,
      description: profileReady ? "Your business details are complete and ready." : "Finish your business details, service areas, and logo to complete your profile.",
      action: (
        <NavigationButton
          label={profileReady ? "View profile" : "Complete profile"}
          active={navigationState === "profile"}
          onClick={() => openDestination("profile")}
        />
      ),
    },
  ];

  async function resendVerification() {
    setVerifyState({ status: "loading", message: "" });

    try {
      const response = await fetch("/api/mover/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mover.email }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;

      if (!response.ok) {
        setVerifyState({ status: "error", message: data?.error ?? "Could not resend verification email." });
        return;
      }

      setVerifyState({
        status: "success",
        message: data?.message ?? "If your account still needs verification, a fresh email is on the way.",
      });
    } catch {
      setVerifyState({ status: "error", message: "Could not resend verification email." });
    }
  }

  async function sendResetLink() {
    setResetState({ status: "loading", message: "" });

    try {
      const response = await fetch("/api/mover/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mover.email }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;

      if (!response.ok) {
        setResetState({ status: "error", message: data?.error ?? "Could not send a password reset email." });
        return;
      }

      setResetState({
        status: "success",
        message: data?.message ?? "If your account is eligible, a reset link has been sent to your email.",
      });
    } catch {
      setResetState({ status: "error", message: "Could not send a password reset email." });
    }
  }

  function openDestination(destination: "profile" | "documents" | "payments") {
    setNavigationState(destination);
    onOpenDestination(destination);
    window.setTimeout(() => setNavigationState((current) => (current === destination ? null : current)), 900);
  }

  async function changePassword() {
    setPasswordState({ loading: true, message: "", error: "" });

    try {
      const response = await fetch("/api/mover/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;

      if (!response.ok) {
        setPasswordState({ loading: false, message: "", error: data?.error ?? "Could not change your password." });
        return;
      }

      setPasswordForm({
        currentPassword: "",
        password: "",
        confirmPassword: "",
      });
      setPasswordState({
        loading: false,
        message: data?.message ?? "Password updated successfully.",
        error: "",
      });
    } catch {
      setPasswordState({ loading: false, message: "", error: "Could not change your password." });
    }
  }

  async function logout() {
    setLogoutLoading(true);

    try {
      await fetch("/api/mover/logout", { method: "POST" });
      router.push("/mover/login");
      router.refresh();
    } finally {
      setLogoutLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {!mover.emailVerified ? (
        <section className="rounded-[24px] border border-amber-200 bg-[linear-gradient(135deg,#fff8e8,#fffef8)] p-4 shadow-sm sm:rounded-[30px] sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                Action needed
              </div>
              <h2 className="mt-3 text-xl font-black tracking-[-0.05em] text-slate-950 sm:text-2xl">Verify your email to secure your account and keep full access protected</h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Confirm <span className="font-semibold text-slate-950">{mover.email}</span> so you can recover access easily and use your account with confidence.
              </p>
            </div>
            <div className="w-full max-w-[280px]">
              <FeedbackButton
                kind="primary"
                fullWidth
                state={verifyState.status}
                defaultLabel="Resend verification email"
                loadingLabel="Sending..."
                successLabel="Sent"
                onClick={resendVerification}
                iconIdle={<MailCheck className="h-4 w-4" />}
              />
            </div>
          </div>
          <StatusMessage state={verifyState} />
        </section>
      ) : (
        <section className="rounded-[24px] border border-emerald-200 bg-[linear-gradient(135deg,#ecfdf5,#ffffff)] p-4 shadow-sm sm:rounded-[30px] sm:p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">Account protected</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.05em] text-slate-950 sm:text-2xl">Your email is verified</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Your email is used to recover access to your account, and it is already confirmed.</p>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-3 sm:gap-4 2xl:grid-cols-[minmax(0,0.95fr)_minmax(340px,1.05fr)]">
        <div className="order-2 space-y-3 sm:space-y-4 2xl:order-1">
          <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[30px] sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">Account status</p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.05em] text-slate-950 sm:text-2xl">Security at a glance</h2>
              </div>
              <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:mt-4 sm:gap-3 md:grid-cols-2">
              <StatusCard
                title="Email verification"
                value={mover.emailVerified ? "Verified" : "Pending"}
                description={mover.emailVerified ? "Your recovery email is confirmed." : "Verify your email to secure your account and keep full access protected."}
                good={mover.emailVerified}
              />
              <StatusCard
                title="Account recovery"
                value="Email-based recovery"
                description="Your email is used to recover access to your account."
                good={mover.emailVerified}
              />
              <StatusCard
                title="Lead access"
                value="Restricted to your company"
                description="Only your company can access the leads assigned to this account."
                good
              />
              <StatusCard
                title="Payment security"
                value={paymentMethodReady ? "Billing card ready" : "Invoice billing available"}
                description={
                  billingLoading
                    ? "Checking your billing setup..."
                    : paymentMethodReady
                      ? `Card ending in ${billing?.paymentMethod?.last4} is available for invoice payments.`
                      : "A card is optional. Leads can still be opened and billed later by invoice."
                }
                good={paymentMethodReady}
              />
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[30px] sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">Account security</p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.05em] text-slate-950 sm:text-2xl">Manage access</h2>
              </div>
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <LockKeyhole className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:mt-5 sm:gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(290px,0.9fr)]">
              <div className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff,#ffffff)] p-4 sm:rounded-[26px] sm:p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Change password</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Use a strong password with at least 8 characters, including uppercase, lowercase, and a number.</p>

                <div className="mt-4 grid gap-2 sm:mt-5 sm:gap-3">
                  <PasswordField
                    label="Current password"
                    value={passwordForm.currentPassword}
                    onChange={(value) => setPasswordForm((current) => ({ ...current, currentPassword: value }))}
                  />
                  <PasswordField
                    label="New password"
                    value={passwordForm.password}
                    onChange={(value) => setPasswordForm((current) => ({ ...current, password: value }))}
                  />
                  <PasswordField
                    label="Confirm new password"
                    value={passwordForm.confirmPassword}
                    onChange={(value) => setPasswordForm((current) => ({ ...current, confirmPassword: value }))}
                  />
                </div>

                <button
                  type="button"
                  onClick={changePassword}
                  disabled={passwordState.loading}
                  className="mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:translate-y-[-1px] hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 sm:mt-5 sm:min-h-[52px] sm:px-5"
                >
                  {passwordState.loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
                  {passwordState.loading ? "Updating..." : "Change password"}
                </button>

                {passwordState.message ? <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{passwordState.message}</p> : null}
                {passwordState.error ? <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{passwordState.error}</p> : null}
              </div>

              <div className="space-y-3">
                <ActionCard
                  title="Password reset"
                  description="If you ever lose access, we can send a secure reset link to your email."
                  action={
                    <FeedbackButton
                      kind="secondary"
                      state={resetState.status}
                      defaultLabel="Send password reset"
                      loadingLabel="Sending..."
                      successLabel="Sent"
                      onClick={sendResetLink}
                      iconIdle={<MailCheck className="h-4 w-4" />}
                    />
                  }
                  icon={<MailCheck className="h-4 w-4" />}
                />
                <ActionCard
                  title="Payment security"
                  description={
                    billingLoading
                      ? "Checking your Stripe billing setup."
                      : paymentMethodReady
                        ? `Stripe is ready with your ${formatCardBrand(billing?.paymentMethod?.brand ?? "card")} card ending in ${billing?.paymentMethod?.last4} for invoice payments.`
                        : "Invoices can still be issued without a card on file. Add or update a card anytime."
                  }
                  action={
                    <NavigationButton
                      label="Manage billing"
                      active={navigationState === "payments"}
                      onClick={() => openDestination("payments")}
                    />
                  }
                  icon={<CreditCard className="h-4 w-4" />}
                />
                <ActionCard
                  title="Log out"
                  description="Sign out of this device when you finish managing your account."
                  action={
                    <button
                      type="button"
                      onClick={logout}
                      disabled={logoutLoading}
                      className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {logoutLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                      {logoutLoading ? "Signing out..." : "Log out"}
                    </button>
                  }
                  icon={<LogOut className="h-4 w-4" />}
                />
              </div>
            </div>

            <StatusMessage state={resetState} className="mt-4" />
          </section>
        </div>

        <aside className="order-1 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff,#ffffff)] p-4 shadow-sm sm:rounded-[30px] sm:p-5 2xl:order-2">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">Secure your account</p>
          <h2 className="mt-1 text-xl font-black tracking-[-0.05em] text-slate-950 sm:text-2xl">Complete your checklist</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Work through the remaining items to improve trust, recovery, and account readiness.</p>

          <div className="mt-4 h-3 rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-[linear-gradient(90deg,#0f172a,#0ea5e9)] transition-all duration-300" style={{ width: `${checklistCompletion}%` }} />
          </div>

          <div className="mt-4 space-y-2 sm:mt-5 sm:space-y-3">
            {checklistItems.map((item) => (
              <div key={item.key} className={cx("rounded-[20px] border p-3 transition-colors sm:rounded-[24px] sm:p-4", item.complete ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                    <p className={cx("mt-2 text-sm leading-6", item.complete ? "text-emerald-800" : "text-slate-600")}>{item.description}</p>
                  </div>
                  <span className={cx("inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]", item.complete ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800")}>
                    {item.complete ? <Check className="h-3.5 w-3.5" /> : null}
                    {item.complete ? "Complete" : "Incomplete"}
                  </span>
                </div>
                <div className="mt-4">{item.action}</div>
              </div>
            ))}
          </div>

          {billingError ? <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{billingError}</p> : null}
        </aside>
      </div>
    </div>
  );
}

function StatusCard({
  title,
  value,
  description,
  good,
}: {
  title: string;
  value: string;
  description: string;
  good?: boolean;
}) {
  return (
    <div className={cx("rounded-[20px] border p-3 sm:rounded-[24px] sm:p-4", good ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50")}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <p className="mt-2 text-lg font-black tracking-[-0.04em] text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-500 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
      />
    </label>
  );
}

function ActionCard({ title, description, action, icon }: { title: string; description: string; action: ReactNode; icon: ReactNode }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,#f8fafc,#ffffff)] p-3 shadow-sm transition hover:shadow-md sm:rounded-[24px] sm:p-4">
      <div className="inline-flex rounded-2xl bg-white p-3 text-slate-700 shadow-sm">{icon}</div>
      <p className="mt-3 text-sm font-semibold text-slate-950 sm:mt-4">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-4">{action}</div>
    </div>
  );
}

function FeedbackButton({
  kind,
  state,
  defaultLabel,
  loadingLabel,
  successLabel,
  onClick,
  disabled,
  fullWidth,
  iconIdle,
}: {
  kind: "primary" | "secondary";
  state: AsyncActionState["status"];
  defaultLabel: string;
  loadingLabel: string;
  successLabel: string;
  onClick: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  iconIdle: ReactNode;
}) {
  const isBusy = state === "loading";
  const isSuccess = state === "success";
  const buttonDisabled = disabled || isBusy || isSuccess;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={buttonDisabled}
      aria-disabled={buttonDisabled}
      className={cx(
        "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed",
        fullWidth ? "w-full" : "",
        kind === "primary"
          ? isSuccess
            ? "bg-emerald-600 text-white shadow-sm focus-visible:ring-emerald-600"
            : "bg-amber-500 text-white shadow-sm hover:bg-amber-600 focus-visible:ring-amber-500 disabled:opacity-90"
          : isSuccess
            ? "border border-emerald-200 bg-emerald-50 text-emerald-800 focus-visible:ring-emerald-500"
            : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 focus-visible:ring-slate-900 disabled:opacity-70",
      )}
    >
      <span className="transition-transform duration-200">
        {isBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : isSuccess ? <Check className="h-4 w-4" /> : iconIdle}
      </span>
      <span aria-live="polite">{isBusy ? loadingLabel : isSuccess ? successLabel : defaultLabel}</span>
    </button>
  );
}

function NavigationButton({ label, onClick, active }: { label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex min-h-[48px] items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2",
        active ? "border-sky-200 bg-sky-50 text-sky-800 shadow-sm" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50",
      )}
    >
      <span>{active ? "Opening..." : label}</span>
      <ArrowRight className={cx("h-4 w-4 transition-transform duration-200", active ? "translate-x-0.5" : "")} />
    </button>
  );
}

function StatusMessage({ state, className }: { state: AsyncActionState; className?: string }) {
  if (state.status === "idle" || !state.message) return null;

  return (
    <p
      aria-live="polite"
      className={cx(
        "rounded-2xl px-4 py-3 text-sm font-semibold",
        state.status === "error" ? "border border-rose-200 bg-rose-50 text-rose-700" : "border border-emerald-200 bg-emerald-50 text-emerald-700",
        className,
      )}
    >
      {state.message}
    </p>
  );
}
