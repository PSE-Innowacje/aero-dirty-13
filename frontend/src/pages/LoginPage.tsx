import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { PseLogo } from "@/components/ui/pse-logo";
import { Mail, Lock } from "lucide-react";

export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.loginFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-[#001429] md:flex-row">
      {/* ---------- Left Hero Panel ---------- */}
      <section className="relative hidden h-full w-3/5 overflow-hidden md:block">
        {/* Hero image: utility helicopter patrolling power transmission lines */}
        <img
          src="/images/hero-helicopter.png"
          alt="Utility helicopter flying along transmission towers"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* CSS gradient fallback behind image */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#001429] via-[#082139] to-[#152B44]" />

        {/* Depth overlays matching Stitch mockup */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#001429]/40 via-transparent to-[#001429]/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#001429] to-transparent opacity-60" />

        {/* Bottom-left branding over hero */}
        <div className="absolute bottom-12 left-12 max-w-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-1 w-12 bg-[#C00017]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c3c6d1]">
              Misja Krytyczna
            </span>
          </div>
          <h2 className="mb-2 text-3xl font-extrabold leading-tight tracking-tight text-white">
            Zapewniamy ciaglosc przesylu energii.
          </h2>
          <p className="text-sm font-medium leading-relaxed text-[#c3c6d1]">
            Monitoring infrastruktury najwyzszych napiec z wykorzystaniem
            zaawansowanej floty powietrznej PSE.
          </p>
        </div>
      </section>

      {/* ---------- Mobile Hero (stacked above form) ---------- */}
      <div className="relative block h-48 w-full flex-shrink-0 md:hidden">
        <img
          src="/images/hero-helicopter.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#001429] via-[#082139] to-[#152B44]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#001429] to-transparent opacity-60" />
        <div className="absolute bottom-4 left-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tighter text-white">
              AERO
            </span>
            <PseLogo height={20} id="hero-mobile" />
          </div>
        </div>
      </div>

      {/* ---------- Right Login Panel ---------- */}
      <section className="flex min-h-0 w-full flex-1 flex-col justify-between overflow-y-auto bg-[#082139] p-8 md:h-full md:w-2/5 md:flex-none md:overflow-y-auto lg:p-12">
        {/* Brand header */}
        <div className="space-y-1">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black tracking-tighter text-white">
                  AERO
                </h1>
                <PseLogo height={34} id="form" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9BB5CC] [font-variant:small-caps]">
                {t("auth.subtitle")}
              </p>
            </div>
          </div>
          <h3 className="pt-4 text-lg font-semibold text-[#d2e4ff]">
            Autoryzacja Uzytkownika
          </h3>
          <p className="text-xs text-[#c3c6d1]">
            Wprowadz dane dostepowe PSE Innowacje
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="my-8 space-y-5">
          {/* Email field */}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="px-1 text-[10px] font-bold uppercase tracking-widest text-[#c3c6d1]"
            >
              {t("auth.email")}
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#43474f]" />
              <input
                id="email"
                type="email"
                placeholder="nazwisko.i@pse.pl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md border-none bg-[#000F21] py-3.5 pl-12 pr-4 text-sm text-[#d2e4ff] shadow-inner transition-all duration-200 placeholder:text-[#43474f] focus:outline-none focus:ring-2 focus:ring-[#7bd0ff]/40"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="px-1 text-[10px] font-bold uppercase tracking-widest text-[#c3c6d1]"
            >
              {t("auth.password")}
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#43474f]" />
              <input
                id="password"
                type="password"
                placeholder="&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-md border-none bg-[#000F21] py-3.5 pl-12 pr-4 text-sm text-[#d2e4ff] shadow-inner transition-all duration-200 placeholder:text-[#43474f] focus:outline-none focus:ring-2 focus:ring-[#7bd0ff]/40"
              />
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="rounded-md bg-[#93000a]/20 px-4 py-3 text-sm text-[#ffb4ab]">
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting}
            className="group flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-[#C00017] to-[#690008] py-4 font-bold text-white shadow-[0_4px_20px_-5px_rgba(201,0,25,0.4)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-[0_6px_20px_-5px_rgba(201,0,25,0.5)]"
          >
            {submitting ? t("auth.signingIn") : t("auth.signIn")}
          </button>
        </form>

        {/* Footer */}
        <div className="space-y-4">
          <div className="h-px bg-gradient-to-r from-transparent via-[#43474f]/20 to-transparent" />
          <p className="text-[10px] font-medium uppercase leading-relaxed tracking-widest text-[#48a2ce]">
            System zastrzezony dla autoryzowanego personelu PSE Innowacje
          </p>
        </div>
      </section>

      {/* ---------- Status Bar ---------- */}
      <div className="absolute bottom-0 left-0 flex h-8 w-full items-center justify-between border-t border-[#43474f]/10 bg-[#000F21]/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4c8832] shadow-[0_0_8px_#4c8832]" />
          <span className="text-[9px] font-black uppercase tracking-widest text-[#4c8832]">
            Online
          </span>
        </div>
        <span className="text-[9px] font-mono uppercase tracking-widest text-[#8d909a]">
          AERO PSE v0.1.0
        </span>
      </div>
    </div>
  );
}
