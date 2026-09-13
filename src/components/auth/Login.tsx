import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { authErrorMessage } from '../../lib/auth';
import {
  Lock, Mail, Gem, Globe, Eye, EyeOff, AlertCircle, ShieldCheck,
  UserPlus, ArrowLeft, CheckCircle2, User as UserIcon,
} from 'lucide-react';

type Mode = 'login' | 'create-admin';

const Login: React.FC = () => {
  const {
    language, settings, theme,
    signIn, createAdminAccount, hasAdmin, refreshAdminExists, isAuthReady,
    syncError,
  } = useApp();

  const shouldReduce = useReducedMotion();
  const isDark = theme !== 'light';
  const isAr = language === 'ar';

  const [mode, setMode] = useState<Mode>('login');

  // Sign in
  const [loginId, setLoginId] = useState('');
  const [loginPwd, setLoginPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  // First administrator
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPwd, setAdminPwd] = useState('');
  const [adminPwd2, setAdminPwd2] = useState('');

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  // Ask the server once whether this shop already has an administrator. The
  // creation button is offered only while the answer is "no".
  useEffect(() => { void refreshAdminExists(); }, [refreshAdminExists]);

  // If the admin appears while this screen is open, fall back to signing in.
  useEffect(() => {
    if (hasAdmin && mode === 'create-admin' && !loading) setMode('login');
  }, [hasAdmin, mode, loading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signIn(loginId, loginPwd);
    } catch (err) {
      setError(authErrorMessage(err, language));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (adminPwd !== adminPwd2) {
      setError(isAr ? 'كلمتا السر غير متطابقتين.' : 'Les deux mots de passe ne correspondent pas.');
      return;
    }
    if (adminPwd.length < 6) {
      setError(isAr ? 'كلمة السر يجب أن تكون 6 أحرف على الأقل.' : 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setLoading(true);
    try {
      // On success the account is created AND signed in, so the app moves on by
      // itself. hasAdmin flips to true, which retires the button for good.
      await createAdminAccount(adminEmail, adminPwd, adminName);
      setNotice(isAr ? 'تم إنشاء حساب المدير بنجاح.' : 'Compte administrateur créé avec succès.');
    } catch (err) {
      setError(authErrorMessage(err, language));
      // A duplicate means somebody got there first — re-check and hide the button.
      void refreshAdminExists();
    } finally {
      setLoading(false);
    }
  };

  const storeLogo = settings.logo;
  const storeName = settings.storeName || 'Bijouterie';
  const storeSlogan = settings.slogan || 'Or & Argent d’exception';

  const panelBg = 'linear-gradient(145deg, #0A0F1A 0%, #0F1722 60%, #111827 100%)';
  const formBg = isDark ? 'rgba(20,27,38,0.75)' : '#FFFFFF';
  const formBorder = isDark ? '1px solid rgba(148,163,184,0.12)' : '1px solid rgba(100,116,139,0.14)';
  const fieldBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const fieldBorder = isDark ? '1px solid rgba(148,163,184,0.15)' : '1px solid rgba(100,116,139,0.18)';
  const textPrimary = isDark ? '#E2E8F0' : '#0F172A';
  const textMuted = isDark ? 'rgba(148,163,184,0.55)' : 'rgba(71,85,105,0.6)';
  const gold = '#C9A84C';

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px 11px 40px',
    fontFamily: 'inherit', fontSize: 14,
    background: fieldBg, border: fieldBorder,
    borderRadius: 10, color: textPrimary,
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: textMuted,
    letterSpacing: '0.1em', textTransform: 'uppercase',
    display: 'block', marginBottom: 6,
  };
  const focusOn = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = gold; };
  const focusOff = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.18)';
  };

  const Field: React.FC<{
    label: string; icon: React.ReactNode; children: React.ReactNode;
  }> = ({ label, icon, children }) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
          color: textMuted, pointerEvents: 'none', display: 'flex',
        }}>{icon}</span>
        {children}
      </div>
    </div>
  );

  const primaryButton = (label: string, busyLabel: string): React.ReactNode => (
    <motion.button
      type="submit"
      disabled={loading}
      whileHover={shouldReduce || loading ? {} : { scale: 1.015 }}
      whileTap={shouldReduce || loading ? {} : { scale: 0.975 }}
      style={{
        height: 48, borderRadius: 11, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
        background: `linear-gradient(135deg, ${gold} 0%, #B8952E 100%)`,
        color: '#0A0A0A', fontSize: 14, fontWeight: 800,
        letterSpacing: '0.06em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        opacity: loading ? 0.75 : 1, transition: 'opacity 0.2s',
      }}
    >
      {loading ? (
        <>
          <div style={{
            width: 16, height: 16, border: '2px solid rgba(0,0,0,0.25)',
            borderTopColor: '#0A0A0A', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          {busyLabel}
        </>
      ) : label}
    </motion.button>
  );

  // A connection or setup failure has to be visible right here — otherwise a
  // shop whose SQL has not been run yet sees a login form that simply does
  // nothing, with no clue why.
  const connectionBanner = !error && syncError ? (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      background: 'rgba(245,158,11,0.09)', border: '1px solid rgba(245,158,11,0.3)',
      borderRadius: 10, padding: '11px 14px', marginBottom: 18,
    }}>
      <AlertCircle size={15} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
      <p style={{ fontSize: 12.5, color: '#f59e0b', margin: 0, fontWeight: 500, lineHeight: 1.6 }}>
        {syncError}
      </p>
    </div>
  ) : null;

  const banner = (
    <AnimatePresence>
      {(error || notice) && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          style={{
            background: error ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.10)',
            border: `1px solid ${error ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.3)'}`,
            borderRadius: 10, padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          {error
            ? <AlertCircle size={15} style={{ color: '#ef4444', flexShrink: 0 }} />
            : <CheckCircle2 size={15} style={{ color: '#22c55e', flexShrink: 0 }} />}
          <p style={{ fontSize: 13, color: error ? '#ef4444' : '#22c55e', margin: 0, fontWeight: 500 }}>
            {error || notice}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      style={{ minHeight: '100vh', display: 'flex', background: isDark ? '#080C12' : '#F1F5F9' }}
    >
      {/* ── Left brand panel ── */}
      <motion.div
        initial={shouldReduce ? false : { opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="hidden md:flex flex-col items-center justify-center"
        style={{ width: '44%', background: panelBg, position: 'relative', overflow: 'hidden' }}
      >
        <div style={{ position: 'absolute', top: '-8%', left: '-8%', width: 320, height: 320, background: 'rgba(201,168,76,0.05)', borderRadius: '50%', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '-8%', right: '-8%', width: 280, height: 280, background: 'rgba(90,107,125,0.06)', borderRadius: '50%', filter: 'blur(70px)' }} />

        <div className="relative z-10 flex flex-col items-center text-center px-10" style={{ gap: 0 }}>
          <motion.div
            animate={shouldReduce ? {} : { y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ position: 'relative', marginBottom: 28 }}
          >
            <div style={{
              position: 'absolute', inset: -3, borderRadius: '50%',
              background: `conic-gradient(${gold}, rgba(201,168,76,0.2), ${gold})`, opacity: 0.5,
            }} />
            <div style={{
              width: 96, height: 96, borderRadius: '50%',
              border: `2px solid ${gold}`,
              background: storeLogo ? 'transparent' : 'rgba(201,168,76,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', position: 'relative',
              boxShadow: '0 0 0 4px rgba(201,168,76,0.12)',
            }}>
              {storeLogo
                ? <img src={storeLogo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                : <Gem size={38} style={{ color: gold }} />}
            </div>
          </motion.div>

          <motion.h1
            initial={shouldReduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            style={{
              fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em', margin: 0, lineHeight: 1.1,
              background: 'linear-gradient(135deg, #FFFFFF 0%, #CBD5E1 50%, #94A3B8 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}
          >
            {storeName}
          </motion.h1>

          <motion.p
            initial={shouldReduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            style={{ fontSize: 10, fontWeight: 700, color: gold, textTransform: 'uppercase', letterSpacing: '0.22em', margin: '10px 0 24px' }}
          >
            {storeSlogan}
          </motion.p>

          <motion.div
            initial={shouldReduce ? false : { width: 0 }}
            animate={{ width: 48 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            style={{ height: 2, background: `linear-gradient(90deg, ${gold}, rgba(201,168,76,0.3))`, borderRadius: 99, marginBottom: 28 }}
          />

          <motion.p
            initial={shouldReduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            style={{ fontSize: 13, color: 'rgba(192,200,212,0.45)', fontStyle: 'italic', maxWidth: 220, lineHeight: 1.7, marginBottom: 36 }}
          >
            Gérez votre bijouterie — or, argent et tout autre métal — avec précision
          </motion.p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 220 }}>
            {['Stock Or & Argent', 'Ventes & Facturation', 'Site Web Intégré'].map((f, i) => (
              <motion.div
                key={f}
                initial={shouldReduce ? false : { opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.65 + i * 0.08 }}
                style={{
                  background: 'rgba(201,168,76,0.06)', borderRadius: 99,
                  padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8,
                  border: '1px solid rgba(201,168,76,0.15)',
                }}
              >
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: gold, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'rgba(192,200,212,0.65)', fontWeight: 600 }}>{f}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Right form panel ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 24px',
        background: isDark ? '#080C12' : '#F1F5F9',
        position: 'relative',
      }}>
        {/* Mobile logo */}
        <div className="md:hidden flex flex-col items-center mb-8">
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            border: `2px solid ${gold}`, overflow: 'hidden',
            background: storeLogo ? 'transparent' : 'rgba(201,168,76,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
          }}>
            {storeLogo
              ? <img src={storeLogo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <Gem size={28} style={{ color: gold }} />}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>{storeName}</h1>
        </div>

        <AnimatePresence mode="wait">
          {/* ══════════════════ SIGN IN ══════════════════ */}
          {mode === 'login' && (
            <motion.div
              key="login"
              initial={shouldReduce ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduce ? undefined : { opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              style={{ width: '100%', maxWidth: 420 }}
            >
              <div style={{
                background: formBg, border: formBorder, borderRadius: 22,
                padding: 40, backdropFilter: isDark ? 'blur(20px)' : undefined,
                boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.07)',
              }}>
                <div style={{ marginBottom: 28 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: gold, letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 6px' }}>
                    ESPACE ADMINISTRATION
                  </p>
                  <h2 style={{ fontSize: 26, fontWeight: 800, color: textPrimary, letterSpacing: '-0.03em', margin: 0 }}>
                    {isAr ? 'تسجيل الدخول' : 'Connexion'}
                  </h2>
                  <div style={{ marginTop: 10, width: 32, height: 3, background: `linear-gradient(90deg, ${gold}, rgba(201,168,76,0.3))`, borderRadius: 99 }} />
                </div>

                {connectionBanner}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <Field label={isAr ? 'البريد الإلكتروني' : 'Adresse email'} icon={<Mail size={15} />}>
                    <input
                      type="email" value={loginId} onChange={e => setLoginId(e.target.value)}
                      placeholder="vous@exemple.com" style={inputStyle}
                      autoComplete="username" required
                      onFocus={focusOn} onBlur={focusOff}
                    />
                  </Field>

                  <Field label={isAr ? 'كلمة السر' : 'Mot de passe'} icon={<Lock size={15} />}>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={loginPwd} onChange={e => setLoginPwd(e.target.value)}
                      placeholder="••••••••" style={{ ...inputStyle, paddingRight: 44 }}
                      autoComplete="current-password" required
                      onFocus={focusOn} onBlur={focusOff}
                    />
                    <button
                      type="button" onClick={() => setShowPwd(!showPwd)}
                      style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: textMuted,
                        cursor: 'pointer', padding: 4, display: 'flex',
                      }}
                    >
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </Field>

                  {banner}
                  {primaryButton(
                    isAr ? 'دخول' : 'Se connecter',
                    isAr ? 'جارٍ الدخول...' : 'Connexion...'
                  )}
                </form>

                {/* ── First-run: create the administrator ──
                    Shown only while the shop has no admin yet. The moment one
                    exists this block disappears permanently, and the server
                    refuses bootstrap_admin regardless. */}
                {isAuthReady && !hasAdmin && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0 16px' }}>
                      <div style={{ flex: 1, height: 1, background: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(100,116,139,0.18)' }} />
                      <span style={{ fontSize: 10, fontWeight: 800, color: textMuted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                        {isAr ? 'أول مرة' : 'Première utilisation'}
                      </span>
                      <div style={{ flex: 1, height: 1, background: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(100,116,139,0.18)' }} />
                    </div>

                    <motion.button
                      type="button"
                      onClick={() => { setMode('create-admin'); setError(''); setNotice(''); }}
                      whileHover={shouldReduce ? {} : { scale: 1.015 }}
                      whileTap={shouldReduce ? {} : { scale: 0.975 }}
                      style={{
                        width: '100%', height: 50, borderRadius: 11, cursor: 'pointer',
                        border: `1.5px solid ${gold}`,
                        background: isDark ? 'rgba(201,168,76,0.10)' : 'rgba(201,168,76,0.12)',
                        color: isDark ? '#E6D9A8' : '#8A6D18',
                        fontSize: 14, fontWeight: 800, letterSpacing: '0.02em',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      }}
                    >
                      <UserPlus size={16} />
                      {isAr ? 'إنشاء حساب مدير' : 'Créer un compte administrateur'}
                    </motion.button>

                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <ShieldCheck size={12} style={{ color: textMuted }} />
                      <span style={{ fontSize: 11, color: textMuted, fontWeight: 600, textAlign: 'center' }}>
                        {isAr
                          ? 'يُنشأ مرة واحدة فقط — ثم يختفي هذا الزر نهائياً'
                          : 'Création unique — ce bouton disparaît ensuite définitivement'}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => { window.location.href = '?view=shop'; }}
                style={{
                  marginTop: 12, width: '100%', height: 44, borderRadius: 11,
                  border: isDark ? '1px solid rgba(148,163,184,0.18)' : '1px solid rgba(100,116,139,0.2)',
                  background: 'transparent', color: isDark ? 'rgba(192,200,212,0.7)' : 'rgba(71,85,105,0.75)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.2s',
                }}
              >
                <Globe size={15} /> {isAr ? 'عرض الموقع' : 'Voir le site web'}
              </button>
            </motion.div>
          )}

          {/* ══════════════════ CREATE FIRST ADMIN ══════════════════ */}
          {mode === 'create-admin' && (
            <motion.div
              key="create-admin"
              initial={shouldReduce ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduce ? undefined : { opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              style={{ width: '100%', maxWidth: 420 }}
            >
              <div style={{
                background: formBg, border: formBorder, borderRadius: 22,
                padding: 40, backdropFilter: isDark ? 'blur(20px)' : undefined,
                boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.07)',
              }}>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); setNotice(''); }}
                  style={{
                    background: 'none', border: 'none', color: textMuted, cursor: 'pointer',
                    padding: 0, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                  }}
                >
                  <ArrowLeft size={14} style={{ transform: isAr ? 'scaleX(-1)' : undefined }} />
                  {isAr ? 'رجوع' : 'Retour'}
                </button>

                <div style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: gold, letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 6px' }}>
                    {isAr ? 'الإعداد الأولي' : 'CONFIGURATION INITIALE'}
                  </p>
                  <h2 style={{ fontSize: 24, fontWeight: 800, color: textPrimary, letterSpacing: '-0.03em', margin: 0 }}>
                    {isAr ? 'حساب المدير' : 'Compte administrateur'}
                  </h2>
                  <p style={{ fontSize: 12.5, color: textMuted, margin: '10px 0 0', lineHeight: 1.6 }}>
                    {isAr
                      ? 'هذا الحساب يملك كل الصلاحيات، وهو الوحيد الذي يمكنه إنشاء حسابات الموظفين وتحديد صلاحياتهم.'
                      : 'Ce compte détient toutes les permissions. Lui seul pourra créer les comptes employés et choisir ce que chacun peut voir et faire.'}
                  </p>
                </div>

                <form onSubmit={handleCreateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <Field label={isAr ? 'الاسم الكامل' : 'Nom complet'} icon={<UserIcon size={15} />}>
                    <input
                      type="text" value={adminName} onChange={e => setAdminName(e.target.value)}
                      placeholder={isAr ? 'المدير' : 'Administrateur'} style={inputStyle}
                      autoComplete="name" required onFocus={focusOn} onBlur={focusOff}
                    />
                  </Field>

                  <Field label={isAr ? 'البريد الإلكتروني' : 'Adresse email'} icon={<Mail size={15} />}>
                    <input
                      type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)}
                      placeholder="vous@exemple.com" style={inputStyle}
                      autoComplete="email" required onFocus={focusOn} onBlur={focusOff}
                    />
                  </Field>

                  <Field label={isAr ? 'كلمة السر' : 'Mot de passe'} icon={<Lock size={15} />}>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={adminPwd} onChange={e => setAdminPwd(e.target.value)}
                      placeholder={isAr ? '6 أحرف على الأقل' : '6 caractères minimum'}
                      style={{ ...inputStyle, paddingRight: 44 }}
                      autoComplete="new-password" required minLength={6}
                      onFocus={focusOn} onBlur={focusOff}
                    />
                    <button
                      type="button" onClick={() => setShowPwd(!showPwd)}
                      style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: textMuted,
                        cursor: 'pointer', padding: 4, display: 'flex',
                      }}
                    >
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </Field>

                  <Field label={isAr ? 'تأكيد كلمة السر' : 'Confirmer le mot de passe'} icon={<Lock size={15} />}>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={adminPwd2} onChange={e => setAdminPwd2(e.target.value)}
                      placeholder="••••••••" style={inputStyle}
                      autoComplete="new-password" required minLength={6}
                      onFocus={focusOn} onBlur={focusOff}
                    />
                  </Field>

                  {banner}
                  {primaryButton(
                    isAr ? 'إنشاء الحساب' : 'Créer le compte',
                    isAr ? 'جارٍ الإنشاء...' : 'Création...'
                  )}
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p style={{ marginTop: 28, fontSize: 10, fontWeight: 700, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center' }}>
          Système de Gestion Propriétaire © {new Date().getFullYear()}
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Login;
