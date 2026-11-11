import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Role } from '../../types/index.ts';
import {
  IconEye,
  IconEyeOff,
  IconAlertCircle,
  IconLoader2,
  IconFolderOpen,
  IconArrowRight,
  IconShieldCheck,
  IconStar,
  IconX,
  IconMail,
  IconLock,
  IconUser,
  IconBriefcase,
  IconCheck,
} from '@tabler/icons-react';

function NexusStitchLogo({ className = "size-7" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill="none" className={className}>
      <path d="M280 274 H480 V514 C369.543 514 280 424.457 280 314 V274 Z" fill="#6366F1"/>
      <path d="M514 274 H744 V514 C633.543 514 544 424.457 544 314 V274 H514 Z" fill="#818CF8"/>
      <path d="M280 514 C280 624.457 369.543 714 480 714 H514 V744 H280 V514 Z" fill="#818CF8"/>
      <path d="M544 514 C544 624.457 633.543 714 744 714 V744 H514 V514 H544 Z" fill="#6366F1"/>
    </svg>
  );
}

interface AuthScreenProps {
  isDark?: boolean;
  onToggleTheme?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ isDark = true, onToggleTheme }) => {
  const { login, signup, loginWithOAuth, resetPassword } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('MEMBER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotFeedback, setForgotFeedback] = useState<{ success?: boolean; text: string } | null>(null);

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };
  const pwdStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        const res = await login(email, password);
        if (!res.success) {
          setErrorMsg(res.error || 'Failed to sign in. Please check your credentials.');
        }
      } else {
        if (password.length < 8) {
          setErrorMsg('Password must be at least 8 characters long.');
          setIsSubmitting(false);
          return;
        }

        const res = await signup(name.trim() || 'Devon Vance', email, password, role);
        if (!res.success) {
          setErrorMsg(res.error || 'Failed to create account.');
        } else {
          setSuccessMsg('Account created successfully! Welcome to NEXUS.');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuth = async (provider: 'google') => {
    setErrorMsg('');
    setOauthLoading(provider);
    try {
      const res = await loginWithOAuth(provider);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to authenticate with Google.');
      }
    } finally {
      setOauthLoading(null);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotFeedback(null);
    try {
      const res = await resetPassword(forgotEmail);
      if (res.success) {
        setForgotFeedback({
          success: true,
          text: res.message || 'Password reset link sent to your email.',
        });
      } else {
        setForgotFeedback({
          success: false,
          text: res.error || 'Unable to process password reset.',
        });
      }
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-background h-screen max-h-screen w-screen overflow-hidden flex flex-col justify-between font-body select-none relative">
      {/* ── Ambient Glow Background Accents (Stitch M3 Design) ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -left-[10%] w-[450px] h-[350px] bg-secondary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-[5%] w-[550px] h-[300px] bg-tertiary-container/15 rounded-full blur-[130px]" />
      </div>

      {/* ── Header Bar ── */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="size-7 sm:size-8 rounded-lg bg-surface-container-high flex items-center justify-center p-1 border border-outline-variant/30 shadow-xs">
            <NexusStitchLogo className="size-full" />
          </div>
          <span className="font-display font-bold text-xs sm:text-sm tracking-tight text-on-surface uppercase">
            NEXUS
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high/80 border border-outline-variant/30 text-[10.5px] font-mono text-outline">
            <span className="hidden sm:inline">Auth Gateway v2.4</span>
            <span className="sm:hidden">v2.4</span>
            <span className="size-1.5 rounded-full bg-tertiary animate-pulse" />
          </div>
        </div>
      </header>

      {/* ── Main Viewport Container (Sized to fit 100vh with Zero Scrolling) ── */}
      <main className="relative z-10 w-full flex-1 flex items-center justify-center px-3 sm:px-6 py-1 min-h-0 overflow-hidden">
        <div className="w-full max-w-6xl mx-auto h-full max-h-[580px] xl:max-h-[620px] flex items-center justify-center">

          {/* ═══════════════════════════════════════════════════════════
              DESKTOP VIEW (lg:grid - Stitch Screen 002cf0ec68784244ba)
              ═══════════════════════════════════════════════════════════ */}
          <div className="hidden lg:grid lg:grid-cols-12 gap-5 xl:gap-6 items-stretch w-full h-full">

            {/* ── LEFT SHOWCASE PANEL (Agile Kanban & Live Sync) ── */}
            <div className="lg:col-span-6 flex flex-col justify-between relative rounded-[28px] bg-surface-container-low border border-outline-variant/20 p-5 xl:p-6 shadow-xl overflow-hidden">
              {/* Radial gradient glow */}
              <div className="pointer-events-none absolute -top-16 -left-16 w-64 h-64 bg-primary/10 rounded-full blur-[80px]" />
              <div className="pointer-events-none absolute -bottom-16 -right-16 w-64 h-64 bg-secondary/10 rounded-full blur-[80px]" />

              <div className="relative z-10 flex flex-col gap-3.5">
                {/* Live Telemetry Tag */}
                <div className="flex items-center gap-2 w-fit px-3 py-1 rounded-full bg-surface-container-high text-primary font-semibold text-[10.5px] tracking-wide border border-outline-variant/20">
                  <span className="size-1.5 rounded-full bg-tertiary animate-ping" />
                  <span>AGILE KANBAN &bull; LIVE SYNC ACTIVE</span>
                </div>

                {/* Headline & High-Impact Typography */}
                <div>
                  <h1 className="font-display text-2xl xl:text-3xl font-extrabold text-on-surface tracking-tight leading-snug">
                    Plan together.<br />
                    Work smarter.<br />
                    <span className="text-primary">Track everything.</span>
                  </h1>
                  <p className="text-xs text-on-surface-variant max-w-sm mt-1 leading-relaxed">
                    Built for agile teams and fast-moving software squads. Manage tasks, collaborate in real-time, and track sprint velocity effortlessly.
                  </p>
                </div>

                {/* PRD Spotlight: Micro-Preview Floating Card */}
                <div className="relative rounded-2xl bg-surface-container/90 border border-outline-variant/20 p-3.5 shadow-md hover:-translate-y-0.5 transition-transform duration-200">
                  <div className="flex items-center justify-between pb-2">
                    <div className="flex items-center gap-2">
                      <IconFolderOpen className="size-4 text-primary" />
                      <span className="text-xs font-semibold text-on-surface">College Website Project</span>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-tertiary/15 text-tertiary">
                      Sprint #04
                    </span>
                  </div>

                  {/* Task metric bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
                      <span>7 Tasks &bull; Sprint Velocity</span>
                      <span className="text-on-surface font-semibold">29% Done</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden flex gap-0.5 p-0.5">
                      <div className="h-full rounded-full bg-tertiary transition-all duration-500" style={{ width: '29%' }} title="Done (2)" />
                      <div className="h-full rounded-full bg-secondary transition-all duration-500" style={{ width: '28%' }} title="In Progress (2)" />
                      <div className="h-full rounded-full bg-outline-variant transition-all duration-500" style={{ width: '43%' }} title="To Do (3)" />
                    </div>
                  </div>

                  {/* Detailed Breakout Metrics */}
                  <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                    <div className="rounded-xl bg-surface-container-high/60 border border-outline-variant/15 p-1.5">
                      <div className="text-[9.5px] text-outline uppercase font-semibold">TO DO</div>
                      <div className="text-sm font-bold text-on-surface">3</div>
                    </div>
                    <div className="rounded-xl bg-secondary/10 border border-secondary/20 p-1.5">
                      <div className="text-[9.5px] text-secondary uppercase font-semibold">IN PROGRESS</div>
                      <div className="text-sm font-bold text-secondary">2</div>
                    </div>
                    <div className="rounded-xl bg-tertiary/10 border border-tertiary/20 p-1.5">
                      <div className="text-[9.5px] text-tertiary uppercase font-semibold">DONE</div>
                      <div className="text-sm font-bold text-tertiary">2</div>
                    </div>
                  </div>

                  {/* Presence avatars badge */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center -space-x-1.5">
                      <img
                        className="size-6 rounded-full object-cover ring-2 ring-surface-container shadow-xs"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBiOjh8NQxvrE9I_1qKydHRxu_g-WXTwUt1U0M0yFakSqFmtTtMhArJ7X5DOR_4o3Y8TtCjS0SowOptTc1bdLi3rsSpQDNE-foswlHHCfk9IQqHutW_U57uCviOD1eeqP6_HcwTVs3MfPY7G8P65vyBu4kqR0vWLl_s0hlpxGe7evMMtes15FAe5ZpNvVR7X2oEtIWKlWunFdRP5vIWG1w_5b81XhsMha5kb2whA2s"
                        alt="Devon"
                      />
                      <img
                        className="size-6 rounded-full object-cover ring-2 ring-surface-container shadow-xs"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9eGyjsJiww87whHDEh5IayAz8LReyBDZJ7qo6hNSiv7UAG-jqk8-oXWvAKKgVrLZnF_7C-JjO1_mg6VvmlSxGqS_G5FjE3MPA9LQVgog9oREYEnMAqTGdn2GsVwZJbikoxU0PSkLoN71djLWMfiTMgzwdiKJya7mm8g8I7qriDctjuhOlf5Ihoo5rQQsoHvTFbgwzklA20o-zTQsmABETn3VryJAKuGN8PSzzRo"
                        alt="Lead"
                      />
                      <img
                        className="size-6 rounded-full object-cover ring-2 ring-surface-container shadow-xs"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAol50Ufo4f-JInONdWKV-jID_d6F8asNJgO_O2hzbEvjLO4-6B4uiSLuAcstJltnh1Eoh8MfcTrGZtPsAX4lRHhgoc-nxXi5dOi9lLlZX2iz2fIUmxIMWxodmWsqQ23OIqJjeCbH3X6eRZtpSJYreU6zC_gwjHmi9rLSf3LgIDILcLW29nGhHDJ8FoAEs_bJ-UrNzqAneus0orO5qcc7fhRJxyLKgjjWyM10hCoqk"
                        alt="Designer"
                      />
                      <div className="size-6 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-[9px] font-bold ring-2 ring-surface-container">
                        +1
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-tertiary font-medium">
                      <span className="size-1.5 rounded-full bg-tertiary animate-pulse" />
                      <span>3 active now</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Enterprise Sync Footnote */}
              <div className="relative z-10 flex items-center justify-between text-[11px] text-outline pt-2 border-t border-outline-variant/15">
                <div className="flex items-center gap-1.5 text-tertiary font-medium">
                  <IconShieldCheck className="size-3.5" />
                  <span>Enterprise Sprint Protocol</span>
                </div>
                <span className="font-mono text-[10px] text-outline">v2.4 Live</span>
              </div>
            </div>

            {/* ── RIGHT AUTHENTICATION CONTROLLER CARD ── */}
            <div className="lg:col-span-6 flex flex-col justify-between rounded-[28px] bg-surface-container border border-outline-variant/20 p-5 xl:p-6 shadow-xl relative overflow-hidden">
              {/* Segmented Navigation Switcher */}
              <div className="w-full bg-surface-container-lowest p-1 rounded-full flex items-center justify-between border border-outline-variant/20 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'signin'
                      ? 'bg-surface-container-high text-on-surface shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'signup'
                      ? 'bg-surface-container-high text-on-surface shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Card Header Area */}
              <div className="my-1.5 shrink-0">
                <h2 className="font-display text-lg sm:text-xl font-bold text-on-surface">
                  {mode === 'signin' ? 'Welcome back' : 'Start building with NEXUS'}
                </h2>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  {mode === 'signin'
                    ? 'Enter your credentials to access your active workspace sprints.'
                    : 'Setup your developer profile to collaborate with your team today.'}
                </p>
              </div>

              {/* Social Login: Full Width Google Sign In (GitHub Removed) */}
              <div className="w-full shrink-0">
                <button
                  type="button"
                  onClick={() => handleOAuth('google')}
                  disabled={oauthLoading !== null || isSubmitting}
                  className="w-full flex items-center justify-center gap-2.5 py-2 px-3 rounded-2xl bg-surface-container-highest hover:bg-surface-bright text-on-surface text-xs font-semibold border border-outline-variant/20 transition-all duration-150 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {oauthLoading === 'google' ? (
                    <IconLoader2 className="size-4 animate-spin text-primary" />
                  ) : (
                    <svg className="size-4" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.5s.7 4.8 1.9 7.2l3.7-2.9z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 17c1.8 3.7 5.6 6.5 10.1 6.5z"
                      />
                    </svg>
                  )}
                  <span>Continue with Google Workspace</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-1.5 shrink-0">
                <div className="w-full border-t border-outline-variant/30" />
                <span className="bg-surface-container px-3 text-[9.5px] font-semibold text-outline uppercase tracking-wider absolute">
                  or continue with email
                </span>
              </div>

              {/* Feedback Alerts */}
              {errorMsg && (
                <div className="p-2 rounded-xl bg-error-container/20 border border-error/30 text-error text-[11px] flex items-start gap-2 shrink-0">
                  <IconAlertCircle className="size-3.5 shrink-0 mt-0.5 text-error" />
                  <span className="flex-1 font-medium">{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-2 rounded-xl bg-tertiary-container/20 border border-tertiary/30 text-tertiary text-[11px] flex items-start gap-2 shrink-0">
                  <IconCheck className="size-3.5 shrink-0 mt-0.5 text-tertiary" />
                  <span className="flex-1 font-medium">{successMsg}</span>
                </div>
              )}

              {/* Compact Form */}
              <form onSubmit={handleSubmit} className="space-y-2.5 flex-1 flex flex-col justify-center">
                {mode === 'signup' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <label className="text-[10.5px] font-medium text-on-surface">Full Name</label>
                      <div className="relative flex items-center">
                        <IconUser className="size-3.5 absolute left-3 text-outline pointer-events-none" />
                        <input
                          type="text"
                          required
                          placeholder="Devon Vance"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-surface-container-lowest text-on-surface text-xs pl-8 pr-2.5 py-1.5 rounded-xl border border-outline-variant/20 outline-none focus:bg-surface-container-high transition-colors"
                        />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[10.5px] font-medium text-on-surface">Role</label>
                      <div className="relative flex items-center">
                        <IconBriefcase className="size-3.5 absolute left-3 text-outline pointer-events-none" />
                        <select
                          value={role}
                          onChange={(e) => setRole(e.target.value as Role)}
                          className="w-full bg-surface-container-lowest text-on-surface text-xs pl-8 pr-2.5 py-1.5 rounded-xl border border-outline-variant/20 outline-none focus:bg-surface-container-high transition-colors cursor-pointer"
                        >
                          <option value="MEMBER">Developer</option>
                          <option value="OWNER">Workspace Lead</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Email */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10.5px]">
                    <label className="font-medium text-on-surface">Work / Student Email</label>
                    <span className="text-[9.5px] text-outline">e.g. dev@nexus.internal</span>
                  </div>
                  <div className="relative flex items-center">
                    <IconMail className="size-3.5 absolute left-3 text-outline pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="alex@campus.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-surface-container-lowest text-on-surface text-xs pl-8 pr-3 py-1.5 rounded-xl border border-outline-variant/20 outline-none focus:bg-surface-container-high transition-colors"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10.5px]">
                    <label className="font-medium text-on-surface">
                      {mode === 'signup' ? 'Create Password' : 'Password'}
                    </label>
                    {mode === 'signin' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(email);
                          setForgotFeedback(null);
                          setShowForgotModal(true);
                        }}
                        className="text-primary hover:underline text-[10px] cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    ) : (
                      <span className="text-tertiary text-[9.5px] font-medium">8+ chars recommended</span>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <IconLock className="size-3.5 absolute left-3 text-outline pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder={mode === 'signin' ? '••••••••' : 'At least 8+ characters'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-surface-container-lowest text-on-surface text-xs pl-8 pr-8 py-1.5 rounded-xl border border-outline-variant/20 outline-none focus:bg-surface-container-high transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 text-outline hover:text-on-surface transition-colors cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <IconEyeOff className="size-3.5" /> : <IconEye className="size-3.5" />}
                    </button>
                  </div>

                  {/* Password strength indicators for signup */}
                  {mode === 'signup' && password.length > 0 && (
                    <div className="flex items-center gap-1 pt-0.5">
                      <div className={`h-1 flex-1 rounded-full ${pwdStrength >= 1 ? 'bg-primary' : 'bg-surface-container-highest'}`} />
                      <div className={`h-1 flex-1 rounded-full ${pwdStrength >= 2 ? 'bg-primary' : 'bg-surface-container-highest'}`} />
                      <div className={`h-1 flex-1 rounded-full ${pwdStrength >= 3 ? 'bg-primary' : 'bg-surface-container-highest'}`} />
                      <div className={`h-1 flex-1 rounded-full ${pwdStrength >= 4 ? 'bg-tertiary' : 'bg-surface-container-highest'}`} />
                      <span className="text-[9.5px] text-outline pl-1">
                        {pwdStrength >= 3 ? 'Strong' : 'Moderate'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Remember me */}
                {mode === 'signin' && (
                  <div className="flex items-center justify-between pt-0.5">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="size-3 rounded bg-surface-container-lowest accent-primary cursor-pointer"
                      />
                      <span className="text-[10.5px] text-on-surface-variant">Remember this device for 30 days</span>
                    </label>
                  </div>
                )}

                {/* Submit Action CTA Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-full bg-primary hover:bg-primary-fixed-dim text-on-primary font-semibold text-xs transition-all duration-150 shadow-md active:scale-[0.99] flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer mt-1"
                >
                  {isSubmitting ? (
                    <>
                      <IconLoader2 className="size-3.5 animate-spin text-on-primary" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>{mode === 'signin' ? 'Sign in to NEXUS' : 'Create NEXUS Account'}</span>
                      <IconArrowRight className="size-3.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Security Audit Footnote */}
              <div className="pt-2 flex items-center justify-center gap-1.5 text-outline text-[10px] shrink-0 border-t border-outline-variant/15">
                <IconShieldCheck className="size-3.5 text-secondary" />
                <span>Secured with end-to-end token encryption &amp; Supabase Auth standard.</span>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              MOBILE VIEW (lg:hidden - Stitch Screen 8f2020d4f57045e3a4)
              ═══════════════════════════════════════════════════════════ */}
          <div className="flex lg:hidden flex-col w-full max-w-sm mx-auto h-full max-h-[580px] justify-between py-1">
            {/* Ambient status capsule & Header */}
            <div className="flex flex-col items-center text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-high/80 border border-outline-variant/20 shadow-xs">
                <span className="size-1.5 rounded-full bg-tertiary animate-ping" />
                <span className="text-[10px] text-on-surface-variant font-medium tracking-wide">
                  Agile Kanban &bull; Live Sync Active
                </span>
              </div>

              <div className="size-11 rounded-2xl p-2 flex items-center justify-center bg-surface-container-high border border-outline-variant/20 shadow-sm mt-0.5">
                <NexusStitchLogo className="size-full" />
              </div>
              <h1 className="font-display text-xl font-bold tracking-tight text-on-surface">NEXUS</h1>
              <p className="text-[11px] text-on-surface-variant max-w-[260px]">
                Plan together. Work smarter. Track everything.
              </p>
            </div>

            {/* Segmented Auth Switcher */}
            <div className="w-full bg-surface-container-lowest/80 p-0.5 rounded-full flex border border-outline-variant/20 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 text-center cursor-pointer ${
                  mode === 'signin'
                    ? 'text-on-primary bg-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 text-center cursor-pointer ${
                  mode === 'signup'
                    ? 'text-on-primary bg-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Mobile Auth Card Container */}
            <div className="w-full bg-surface-container-low rounded-[24px] border border-outline-variant/20 p-4 shadow-xl flex flex-col space-y-2.5">
              <div className="space-y-0.5">
                <h2 className="font-display text-base font-semibold text-on-surface">
                  {mode === 'signin' ? 'Welcome back' : 'Create your account'}
                </h2>
                <p className="text-[10.5px] text-on-surface-variant">
                  {mode === 'signin'
                    ? 'Enter credentials to access active workspace sprints'
                    : 'Join your engineering team on NEXUS in seconds'}
                </p>
              </div>

              {/* Mobile Google Sign-in: Full Width */}
              <button
                type="button"
                onClick={() => handleOAuth('google')}
                disabled={oauthLoading !== null || isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-2xl bg-surface-container-high hover:bg-surface-bright text-on-surface text-xs font-semibold border border-outline-variant/20 transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {oauthLoading === 'google' ? (
                  <IconLoader2 className="size-3.5 animate-spin text-primary" />
                ) : (
                  <svg className="size-3.5" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.5s.7 4.8 1.9 7.2l3.7-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 17c1.8 3.7 5.6 6.5 10.1 6.5z"
                    />
                  </svg>
                )}
                <span>Continue with Google Workspace</span>
              </button>

              {/* Divider */}
              <div className="flex items-center space-x-2 py-0.5">
                <div className="flex-1 h-px bg-outline-variant/30" />
                <span className="text-[9.5px] text-outline tracking-wider uppercase font-medium">
                  Or Continue With Email
                </span>
                <div className="flex-1 h-px bg-outline-variant/30" />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
                {mode === 'signup' && (
                  <div className="flex items-center bg-surface-container-highest px-3 py-1.5 rounded-xl border border-outline-variant/20 focus-within:ring-1 focus-within:ring-primary">
                    <IconUser className="size-3.5 text-outline mr-2" />
                    <input
                      type="text"
                      required
                      placeholder="Alex Chen"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-transparent text-xs text-on-surface placeholder:text-outline focus:outline-none"
                    />
                  </div>
                )}

                <div className="flex items-center bg-surface-container-highest px-3 py-1.5 rounded-xl border border-outline-variant/20 focus-within:ring-1 focus-within:ring-primary">
                  <IconMail className="size-3.5 text-outline mr-2" />
                  <input
                    type="email"
                    required
                    placeholder="dev@nexus.internal"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent text-xs text-on-surface placeholder:text-outline focus:outline-none"
                  />
                </div>

                <div className="flex items-center bg-surface-container-highest px-3 py-1.5 rounded-xl border border-outline-variant/20 focus-within:ring-1 focus-within:ring-primary">
                  <IconLock className="size-3.5 text-outline mr-2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent text-xs text-on-surface placeholder:text-outline focus:outline-none tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-outline hover:text-on-surface p-1 transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <IconEyeOff className="size-3.5" /> : <IconEye className="size-3.5" />}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10.5px]">
                  <label className="flex items-center space-x-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="size-3 rounded bg-surface-container-highest accent-primary"
                    />
                    <span className="text-on-surface-variant">Remember device</span>
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setForgotFeedback(null);
                        setShowForgotModal(true);
                      }}
                      className="text-primary hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2 rounded-full bg-primary hover:bg-primary-fixed-dim text-on-primary font-semibold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-primary/20 transition-all active:scale-[0.98] mt-1 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <IconLoader2 className="size-3.5 animate-spin text-on-primary" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>{mode === 'signin' ? 'Sign in to NEXUS' : 'Create NEXUS Account'}</span>
                      <IconArrowRight className="size-3.5" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Mobile Footer Footnote */}
            <div className="flex items-center justify-center gap-1.5 text-outline text-[10px] pb-1">
              <IconShieldCheck className="size-3 text-secondary" />
              <span>End-to-end token encryption &bull; Supabase Auth</span>
            </div>
          </div>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-outline shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 cursor-pointer hover:text-on-surface transition-colors">
            <span>English (US)</span>
          </div>
          <span>&bull;</span>
          <div className="flex items-center gap-1 text-tertiary">
            <IconShieldCheck className="size-3.5" />
            <span>256-bit Encrypted</span>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <a href="#privacy" className="hover:text-on-surface transition-colors">Privacy Policy</a>
          <a href="#terms" className="hover:text-on-surface transition-colors">Terms of Service</a>
          <a href="#status" className="hover:text-on-surface transition-colors">System Status</a>
          <a href="mailto:support@nexus.team" className="hover:text-on-surface transition-colors">Contact Support</a>
        </div>
      </footer>

      {/* ── Forgot Password Modal ── */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-surface-container border border-outline-variant/30 text-on-surface rounded-2xl max-w-sm w-full p-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 p-1 rounded-md text-outline hover:text-on-surface transition-colors cursor-pointer"
            >
              <IconX className="size-4" />
            </button>

            <h3 className="font-display text-sm font-bold text-on-surface mb-1">Reset your password</h3>
            <p className="text-xs text-on-surface-variant mb-3">
              Enter your verified email address and we will send you a password recovery link.
            </p>

            {forgotFeedback && (
              <div
                className={`mb-3 p-2.5 rounded-md text-xs flex items-start gap-2 ${
                  forgotFeedback.success
                    ? 'bg-tertiary-container/20 border border-tertiary/30 text-tertiary'
                    : 'bg-error-container/20 border border-error/30 text-error'
                }`}
              >
                {forgotFeedback.success ? (
                  <IconCheck className="size-3.5 text-tertiary shrink-0 mt-0.5" />
                ) : (
                  <IconAlertCircle className="size-3.5 text-error shrink-0 mt-0.5" />
                )}
                <div className="flex-1 font-medium text-[11px]">{forgotFeedback.text}</div>
              </div>
            )}

            <form onSubmit={handleForgotSubmit} className="space-y-3">
              <div className="relative flex items-center bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2 focus-within:border-primary">
                <IconMail className="size-4 text-outline mr-2 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full bg-transparent text-xs text-on-surface placeholder:text-outline outline-none font-medium"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="flex-1 py-2 rounded-xl border border-outline-variant/30 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="flex-1 py-2 rounded-xl bg-primary hover:bg-primary-fixed-dim text-on-primary text-xs font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {forgotLoading ? (
                    <>
                      <IconLoader2 className="size-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Send link</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
