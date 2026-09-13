
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Languages, Database, Shield, Save, User as UserIcon, Lock, Sparkle, X, Globe, Plus, ChevronDown, Store, Mail, KeyRound, RotateCcw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { translations } from '../../i18n/translations';
import { Language, StoreSettings } from '../../types';
import { uploadImage, BUCKETS, supabase } from '../../lib/supabase';

type SettingsTab = 'store' | 'account' | 'website' | 'database';

type WebState = {
  badgeFr: string; badgeAr: string;
  heroLine1Fr: string; heroLine1Ar: string;
  heroLine2Fr: string; heroLine2Ar: string;
  heroDescFr: string; heroDescAr: string;
  cta1Fr: string; cta1Ar: string;
  cta2Fr: string; cta2Ar: string;
  featuredTitleFr: string; featuredTitleAr: string;
  viewAllCtaFr: string; viewAllCtaAr: string;
  storyTagFr: string; storyTagAr: string;
  storyTitleFr: string; storyTitleAr: string;
  storyDescFr: string; storyDescAr: string;
  stat1Val: string; stat2Val: string; stat3Val: string; stat4Val: string;
  stat1LabelFr: string; stat1LabelAr: string;
  stat2LabelFr: string; stat2LabelAr: string;
  stat3LabelFr: string; stat3LabelAr: string;
  stat4LabelFr: string; stat4LabelAr: string;
  ben1TitleFr: string; ben1DescFr: string; ben1TitleAr: string; ben1DescAr: string;
  ben2TitleFr: string; ben2DescFr: string; ben2TitleAr: string; ben2DescAr: string;
  ben3TitleFr: string; ben3DescFr: string; ben3TitleAr: string; ben3DescAr: string;
  ben4TitleFr: string; ben4DescFr: string; ben4TitleAr: string; ben4DescAr: string;
  personalizedTitleFr: string; personalizedTitleAr: string;
  personalizedDescFr: string; personalizedDescAr: string;
  personalizedCtaFr: string; personalizedCtaAr: string;
};

function buildWebState(s: StoreSettings): WebState {
  return {
    badgeFr: s.webBadgeFr || '', badgeAr: s.webBadgeAr || '',
    heroLine1Fr: s.webHeroLine1Fr || '', heroLine1Ar: s.webHeroLine1Ar || '',
    heroLine2Fr: s.webHeroLine2Fr || '', heroLine2Ar: s.webHeroLine2Ar || '',
    heroDescFr: s.webHeroDescFr || '', heroDescAr: s.webHeroDescAr || '',
    cta1Fr: s.webCta1Fr || '', cta1Ar: s.webCta1Ar || '',
    cta2Fr: s.webCta2Fr || '', cta2Ar: s.webCta2Ar || '',
    featuredTitleFr: s.webFeaturedTitleFr || '', featuredTitleAr: s.webFeaturedTitleAr || '',
    viewAllCtaFr: s.webViewAllCtaFr || '', viewAllCtaAr: s.webViewAllCtaAr || '',
    storyTagFr: s.webStoryTagFr || '', storyTagAr: s.webStoryTagAr || '',
    storyTitleFr: s.webStoryTitleFr || '', storyTitleAr: s.webStoryTitleAr || '',
    storyDescFr: s.webStoryDescFr || '', storyDescAr: s.webStoryDescAr || '',
    stat1Val: s.webStat1Val || '', stat2Val: s.webStat2Val || '',
    stat3Val: s.webStat3Val || '', stat4Val: s.webStat4Val || '',
    stat1LabelFr: s.webStat1LabelFr || '', stat1LabelAr: s.webStat1LabelAr || '',
    stat2LabelFr: s.webStat2LabelFr || '', stat2LabelAr: s.webStat2LabelAr || '',
    stat3LabelFr: s.webStat3LabelFr || '', stat3LabelAr: s.webStat3LabelAr || '',
    stat4LabelFr: s.webStat4LabelFr || '', stat4LabelAr: s.webStat4LabelAr || '',
    ben1TitleFr: s.webBenefit1TitleFr || '', ben1DescFr: s.webBenefit1DescFr || '',
    ben1TitleAr: s.webBenefit1TitleAr || '', ben1DescAr: s.webBenefit1DescAr || '',
    ben2TitleFr: s.webBenefit2TitleFr || '', ben2DescFr: s.webBenefit2DescFr || '',
    ben2TitleAr: s.webBenefit2TitleAr || '', ben2DescAr: s.webBenefit2DescAr || '',
    ben3TitleFr: s.webBenefit3TitleFr || '', ben3DescFr: s.webBenefit3DescFr || '',
    ben3TitleAr: s.webBenefit3TitleAr || '', ben3DescAr: s.webBenefit3DescAr || '',
    ben4TitleFr: s.webBenefit4TitleFr || '', ben4DescFr: s.webBenefit4DescFr || '',
    ben4TitleAr: s.webBenefit4TitleAr || '', ben4DescAr: s.webBenefit4DescAr || '',
    personalizedTitleFr: s.webPersonalizedTitleFr || '', personalizedTitleAr: s.webPersonalizedTitleAr || '',
    personalizedDescFr: s.webPersonalizedDescFr || '', personalizedDescAr: s.webPersonalizedDescAr || '',
    personalizedCtaFr: s.webPersonalizedCtaFr || '', personalizedCtaAr: s.webPersonalizedCtaAr || '',
  };
}

function parseMarquee(s: StoreSettings): string[] {
  try {
    const parsed = JSON.parse(s.webMarqueeItems || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

// ---- Sub-components defined outside Settings to prevent focus loss on re-render ----

interface SectionToggleProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  isOpen: boolean;
  onToggle: () => void;
}
const SectionToggle: React.FC<SectionToggleProps> = ({ icon, title, subtitle, isOpen, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
      background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
      paddingBottom: isOpen ? 16 : 0,
      borderBottom: isOpen ? '1px solid var(--border)' : 'none',
      marginBottom: isOpen ? 20 : 0,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 40, height: 40, background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ textAlign: 'left' }}>
        <p style={{ fontWeight: 800, color: 'var(--silver-100)', fontSize: 14, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</p>
        <p style={{ fontSize: 11, color: 'var(--silver-400)', margin: '2px 0 0' }}>{subtitle}</p>
      </div>
    </div>
    <ChevronDown size={16} color="var(--silver-400)" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
  </button>
);

interface BiFieldProps {
  label: string;
  frKey: keyof WebState;
  arKey: keyof WebState;
  placeholder_fr?: string;
  placeholder_ar?: string;
  textarea?: boolean;
  webS: WebState;
  setWF: (key: keyof WebState, value: string) => void;
}
const BiField: React.FC<BiFieldProps> = ({ label, frKey, arKey, placeholder_fr, placeholder_ar, textarea, webS, setWF }) => (
  <div>
    <p style={{ fontSize: 11, color: 'var(--silver-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>{label}</p>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <div>
        <label style={{ fontSize: 10, color: '#C9A84C', fontWeight: 700, letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>🇫🇷 Français</label>
        {textarea
          ? <textarea value={webS[frKey] as string} onChange={e => setWF(frKey, e.target.value)} className="lux-input" placeholder={placeholder_fr} style={{ minHeight: 72, resize: 'vertical', fontSize: 12 }} />
          : <input value={webS[frKey] as string} onChange={e => setWF(frKey, e.target.value)} className="lux-input" placeholder={placeholder_fr} style={{ fontSize: 12 }} />}
      </div>
      <div>
        <label style={{ fontSize: 10, color: '#C9A84C', fontWeight: 700, letterSpacing: '0.06em', display: 'block', marginBottom: 4, textAlign: 'right' }}>عربي 🇩🇿</label>
        {textarea
          ? <textarea value={webS[arKey] as string} onChange={e => setWF(arKey, e.target.value)} className="lux-input" placeholder={placeholder_ar} style={{ minHeight: 72, resize: 'vertical', fontSize: 12, direction: 'rtl', textAlign: 'right' }} />
          : <input value={webS[arKey] as string} onChange={e => setWF(arKey, e.target.value)} className="lux-input" placeholder={placeholder_ar} style={{ fontSize: 12, direction: 'rtl', textAlign: 'right' }} />}
      </div>
    </div>
  </div>
);

// ---- Main component ----

const Settings: React.FC = () => {
  const {
    user, setUser, language, setLanguage, workers, updateWorker, settings, updateSettings,
    exportSnapshot, importSnapshot, resetDemoData,
  } = useApp();
  const shouldReduce = useReducedMotion();
  const t = translations[language];

  const isAdmin = user?.role === 'admin';
  const worker = workers.find(w => w.id === user?.id);

  const [activeTab, setActiveTab] = useState<SettingsTab>('store');

  // ---- Store tab state ----
  const [storeName, setStoreName] = useState(settings.storeName || '');
  const [sloganField, setSloganField] = useState(settings.slogan || '');
  const [contactField, setContactField] = useState(settings.contact || '');
  const [phoneField, setPhoneField] = useState(settings.phone || '');
  const [addressField, setAddressField] = useState(settings.address || '');
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.logo || null);

  // ---- Account tab state ----
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [workerUsername, setWorkerUsername] = useState(user?.username || '');
  const [workerPassword, setWorkerPassword] = useState('');
  const [workerConfirmPassword, setWorkerConfirmPassword] = useState('');

  // ---- Website tab state ----
  const [webS, setWebS] = useState<WebState>(() => buildWebState(settings));
  const setWF = (key: keyof WebState, value: string) => setWebS(prev => ({ ...prev, [key]: value }));
  const [marqueeItems, setMarqueeItems] = useState<string[]>(() => parseMarquee(settings));
  const [newMarqueeItem, setNewMarqueeItem] = useState('');
  const [openSec, setOpenSec] = useState({
    marquee: true, hero: true, featured: false, story: false, benefits: false, personalized: false,
  });
  const toggleSec = (k: keyof typeof openSec) => setOpenSec(p => ({ ...p, [k]: !p[k] }));

  // ---- Shared feedback state ----
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const flash = (msg: string, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(''), 4000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); }
  };

  // Keep the local form fields in sync with the store settings.
  useEffect(() => {
    setStoreName(settings.storeName || '');
    setSloganField(settings.slogan || '');
    setContactField(settings.contact || '');
    setPhoneField(settings.phone || '');
    setAddressField(settings.address || '');
    setLogoPreview(settings.logo || null);
    setWebS(buildWebState(settings));
    setMarqueeItems(parseMarquee(settings));
  }, [settings]);

  // Show the signed-in account's email.
  useEffect(() => {
    if (user?.email) setCurrentEmail(user.email);
  }, [user]);

  const handleLanguageChange = (lang: Language) => setLanguage(lang);

  // ---- Store form ----
  const handleStoreSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      storeName: storeName || settings.storeName,
      slogan: sloganField,
      contact: contactField,
      phone: phoneField,
      address: addressField,
      logo: logoPreview,
    });
    flash('Informations du magasin enregistrées');
  };

  /** The logo is uploaded to the `store-logos` bucket; only its URL is saved. */
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLogoPreview(await uploadImage(BUCKETS.logos, file));
    } catch (err: any) {
      flash(err?.message || "Échec de l'envoi du logo", true);
    }
  };

  // ---- Account form (admin) ----
  const handleAdminAccountSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      flash('Les mots de passe ne correspondent pas', true);
      return;
    }
    const updates: { email?: string; password?: string } = {};
    if (newEmail.trim()) updates.email = newEmail.trim();
    if (newPassword.trim()) updates.password = newPassword.trim();
    if (!updates.email && !updates.password) {
      flash('Aucune modification à enregistrer', true);
      return;
    }

    // These are real credentials on the Supabase account, not local fields.
    const { error } = await supabase.auth.updateUser(updates);
    if (error) {
      flash(error.message, true);
      return;
    }

    if (updates.email) {
      await supabase.from('profiles').update({ email: updates.email }).eq('id', user!.id);
      setCurrentEmail(updates.email);
      if (user) setUser({ ...user, email: updates.email });
    }

    setNewEmail('');
    setNewPassword('');
    setConfirmPassword('');
    flash(updates.email
      ? 'Compte mis à jour. Un email de confirmation a pu être envoyé à la nouvelle adresse.'
      : 'Compte mis à jour avec succès');
  };

  // ---- Account form (worker) ----
  const handleWorkerAccountSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (workerPassword && workerPassword !== workerConfirmPassword) {
      flash('Les mots de passe ne correspondent pas', true);
      return;
    }

    // An employee may change their own password on their own account.
    if (workerPassword) {
      const { error } = await supabase.auth.updateUser({ password: workerPassword });
      if (error) { flash(error.message, true); return; }
    }
    if (worker) {
      updateWorker(worker.id, { username: workerUsername || worker.username });
      setUser({ ...user!, username: workerUsername || user!.username });
    }
    setWorkerPassword('');
    setWorkerConfirmPassword('');
    flash('Profil mis à jour');
  };

  // ---- Website form ----
  const handleWebsiteSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      webBadgeFr: webS.badgeFr || undefined, webBadgeAr: webS.badgeAr || undefined,
      webHeroLine1Fr: webS.heroLine1Fr || undefined, webHeroLine1Ar: webS.heroLine1Ar || undefined,
      webHeroLine2Fr: webS.heroLine2Fr || undefined, webHeroLine2Ar: webS.heroLine2Ar || undefined,
      webHeroDescFr: webS.heroDescFr || undefined, webHeroDescAr: webS.heroDescAr || undefined,
      webCta1Fr: webS.cta1Fr || undefined, webCta1Ar: webS.cta1Ar || undefined,
      webCta2Fr: webS.cta2Fr || undefined, webCta2Ar: webS.cta2Ar || undefined,
      webFeaturedTitleFr: webS.featuredTitleFr || undefined, webFeaturedTitleAr: webS.featuredTitleAr || undefined,
      webViewAllCtaFr: webS.viewAllCtaFr || undefined, webViewAllCtaAr: webS.viewAllCtaAr || undefined,
      webStoryTagFr: webS.storyTagFr || undefined, webStoryTagAr: webS.storyTagAr || undefined,
      webStoryTitleFr: webS.storyTitleFr || undefined, webStoryTitleAr: webS.storyTitleAr || undefined,
      webStoryDescFr: webS.storyDescFr || undefined, webStoryDescAr: webS.storyDescAr || undefined,
      webStat1Val: webS.stat1Val || undefined, webStat2Val: webS.stat2Val || undefined,
      webStat3Val: webS.stat3Val || undefined, webStat4Val: webS.stat4Val || undefined,
      webStat1LabelFr: webS.stat1LabelFr || undefined, webStat1LabelAr: webS.stat1LabelAr || undefined,
      webStat2LabelFr: webS.stat2LabelFr || undefined, webStat2LabelAr: webS.stat2LabelAr || undefined,
      webStat3LabelFr: webS.stat3LabelFr || undefined, webStat3LabelAr: webS.stat3LabelAr || undefined,
      webStat4LabelFr: webS.stat4LabelFr || undefined, webStat4LabelAr: webS.stat4LabelAr || undefined,
      webBenefit1TitleFr: webS.ben1TitleFr || undefined, webBenefit1DescFr: webS.ben1DescFr || undefined,
      webBenefit1TitleAr: webS.ben1TitleAr || undefined, webBenefit1DescAr: webS.ben1DescAr || undefined,
      webBenefit2TitleFr: webS.ben2TitleFr || undefined, webBenefit2DescFr: webS.ben2DescFr || undefined,
      webBenefit2TitleAr: webS.ben2TitleAr || undefined, webBenefit2DescAr: webS.ben2DescAr || undefined,
      webBenefit3TitleFr: webS.ben3TitleFr || undefined, webBenefit3DescFr: webS.ben3DescFr || undefined,
      webBenefit3TitleAr: webS.ben3TitleAr || undefined, webBenefit3DescAr: webS.ben3DescAr || undefined,
      webBenefit4TitleFr: webS.ben4TitleFr || undefined, webBenefit4DescFr: webS.ben4DescFr || undefined,
      webBenefit4TitleAr: webS.ben4TitleAr || undefined, webBenefit4DescAr: webS.ben4DescAr || undefined,
      webPersonalizedTitleFr: webS.personalizedTitleFr || undefined, webPersonalizedTitleAr: webS.personalizedTitleAr || undefined,
      webPersonalizedDescFr: webS.personalizedDescFr || undefined, webPersonalizedDescAr: webS.personalizedDescAr || undefined,
      webPersonalizedCtaFr: webS.personalizedCtaFr || undefined, webPersonalizedCtaAr: webS.personalizedCtaAr || undefined,
      webMarqueeItems: marqueeItems.length > 0 ? JSON.stringify(marqueeItems) : undefined,
    });
    flash('Textes du site enregistrés');
  };

  // ---- Local backup / restore ----
  // There is no database: a backup is a JSON snapshot of the in-memory store.
  const handleBackup = () => {
    if (!isAdmin) return;
    const blob = new Blob([JSON.stringify(exportSnapshot(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `altech-bijouterie_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash('Sauvegarde téléchargée');
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importSnapshot(JSON.parse(reader.result as string));
        flash('Données restaurées avec succès');
      } catch {
        flash('Erreur lors de la restauration du fichier', true);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetDemo = () => {
    if (!isAdmin) return;
    if (!confirm('Réinitialiser toutes les données de démonstration ?')) return;
    resetDemoData();
    flash('Données de démonstration réinitialisées');
  };

  // ---- Shared UI helpers ----
  const SuccessBanner = ({ msg }: { msg: string }) => (
    <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontSize: 12, fontWeight: 700, padding: '10px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
      <Sparkle size={14} /> {msg}
    </div>
  );

  const ErrorBanner = ({ msg }: { msg: string }) => (
    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)', fontSize: 12, fontWeight: 700, padding: '10px 16px', borderRadius: 12 }}>
      {msg}
    </div>
  );

  const CardHeader = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 40, height: 40, background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <p style={{ fontWeight: 800, color: 'var(--silver-100)', fontSize: 14, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</p>
        <p style={{ fontSize: 11, color: 'var(--silver-400)', margin: '2px 0 0' }}>{subtitle}</p>
      </div>
    </div>
  );

  const tabs: { key: SettingsTab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { key: 'store', label: 'Boutique', icon: <Store size={13} /> },
    { key: 'account', label: 'Mon Compte', icon: <UserIcon size={13} /> },
    { key: 'website', label: 'Site Web', icon: <Globe size={13} />, adminOnly: true },
    { key: 'database', label: 'Données', icon: <Database size={13} />, adminOnly: true },
  ];

  return (
    <motion.div
      initial={shouldReduce ? false : { opacity: 0, y: 14, scale: 0.995 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] as any }}
      style={{ display: 'flex', flexDirection: 'column', gap: 32 }}
    >
      {/* Page header */}
      <div>
        <div className="silver-line" />
        <h1 className="section-title">{t.settings}</h1>
        <p className="section-subtitle">Configuration {isAdmin ? 'du système propriétaire' : 'personnelle'}</p>
      </div>

      {/* Tab navigation */}
      <div className="lux-tabs">
        {tabs.filter(tab => !tab.adminOnly || isAdmin).map(tab => (
          <button
            key={tab.key}
            className={`lux-tab${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, verticalAlign: 'middle' }}>
              {tab.icon} {tab.label}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ===== TAB: BOUTIQUE ===== */}
        {activeTab === 'store' && (
          <motion.div
            key="store"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
          >
            {isAdmin ? (
              <div className="lux-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <CardHeader icon={<Store size={18} color="var(--gold)" />} title="Informations du Magasin" subtitle="Logo, nom, slogan et coordonnées" />
                <form onSubmit={handleStoreSave} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {/* Logo */}
                  <div>
                    <label className="lux-label">Logo du magasin</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10 }}>
                      <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '2px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                        {logoPreview
                          ? <img src={logoPreview} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <Store size={32} color="rgba(212,175,55,0.4)" />}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{ cursor: 'pointer' }}>
                          <span className="btn-silver" style={{ display: 'inline-flex', padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Changer le logo</span>
                          <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
                        </label>
                        {logoPreview && (
                          <button type="button" onClick={() => setLogoPreview(null)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                            <X size={12} /> Supprimer
                          </button>
                        )}
                        <p style={{ fontSize: 10, color: 'var(--silver-400)', margin: 0 }}>PNG, JPG recommandé</p>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label className="lux-label">Nom du Magasin</label>
                      <input value={storeName} onChange={e => setStoreName(e.target.value)} className="lux-input" style={{ marginTop: 6 }} />
                    </div>
                    <div>
                      <label className="lux-label">Slogan</label>
                      <input value={sloganField} onChange={e => setSloganField(e.target.value)} className="lux-input" style={{ marginTop: 6 }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label className="lux-label">Téléphone</label>
                      <input value={phoneField} onChange={e => setPhoneField(e.target.value)} className="lux-input" style={{ marginTop: 6 }} />
                    </div>
                    <div>
                      <label className="lux-label">Contact / Réseaux</label>
                      <input value={contactField} onChange={e => setContactField(e.target.value)} className="lux-input" style={{ marginTop: 6 }} />
                    </div>
                  </div>

                  <div>
                    <label className="lux-label">Adresse</label>
                    <input value={addressField} onChange={e => setAddressField(e.target.value)} className="lux-input" style={{ marginTop: 6 }} />
                  </div>

                  {success && <SuccessBanner msg={success} />}
                  {error && <ErrorBanner msg={error} />}

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setStoreName('Bijouterie Lakrouf');
                        setSloganField('Or & Argent d’exception');
                        setContactField('RÉSEAUX SOCIAUX: BIJOUTERIE LAKROUF');
                        setPhoneField('0549904709');
                        setAddressField('NAZLI CHERIF N°30 SEC 21 RDC 11 CHÉRAGA - ALGER');
                        setLogoPreview(null);
                      }}
                      className="btn-outline"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                    >
                      <RotateCcw size={14} /> Réinitialiser
                    </button>
                    <button type="submit" className="btn-gold" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 0', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                      <Save size={15} /> Enregistrer
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="lux-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                <Store size={40} color="rgba(212,175,55,0.3)" style={{ marginBottom: 12 }} />
                <p style={{ color: 'var(--silver-400)', fontSize: 13, fontWeight: 600 }}>
                  Les paramètres du magasin sont réservés à l'administrateur.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* ===== TAB: MON COMPTE ===== */}
        {activeTab === 'account' && (
          <motion.div
            key="account"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
          >
            {/* Language preference */}
            <div className="lux-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Languages size={22} color="var(--gold)" />
                </div>
                <div>
                  <p style={{ fontWeight: 800, color: 'var(--silver-100)', fontSize: 15, margin: 0 }}>Langue de l'interface</p>
                  <p style={{ fontSize: 11, color: 'var(--silver-400)', margin: '2px 0 0' }}>Sélectionnez votre langue de préférence</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.04)', padding: 6, borderRadius: 14, border: '1px solid var(--border)' }}>
                {(['fr', 'ar'] as Language[]).map(l => (
                  <button key={l} onClick={() => handleLanguageChange(l)}
                    style={{ padding: '8px 20px', borderRadius: 10, fontSize: 11, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em', transition: 'all 0.2s', border: 'none', background: language === l ? 'var(--gold)' : 'transparent', color: language === l ? '#1a1200' : 'var(--silver-400)' }}>
                    {l === 'fr' ? 'Français' : 'العربية'}
                  </button>
                ))}
              </div>
            </div>

            {/* Role badge */}
            <div className="lux-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Shield size={18} color="var(--gold)" />
                <span style={{ fontSize: 13, color: 'var(--silver-300)', fontWeight: 600 }}>Rôle du compte</span>
              </div>
              <span className={isAdmin ? 'badge badge-gold' : 'badge badge-platinum'}>
                {isAdmin ? 'Administrateur' : 'Employé'}
              </span>
            </div>

            {/* Admin: email + password (local demo account) */}
            {isAdmin && (
              <div className="lux-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <CardHeader icon={<Shield size={18} color="var(--gold)" />} title="Sécurité du Compte" subtitle="Modifier votre email et mot de passe" />

                {currentEmail && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 10 }}>
                    <Mail size={14} color="var(--gold)" />
                    <span style={{ fontSize: 12, color: 'var(--silver-300)', fontWeight: 600 }}>Email actuel:</span>
                    <span style={{ fontSize: 12, color: 'var(--silver-100)', fontWeight: 700 }}>{currentEmail}</span>
                  </div>
                )}

                <form onSubmit={handleAdminAccountSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label className="lux-label">Nouvel email</label>
                    <div style={{ position: 'relative', marginTop: 6 }}>
                      <Mail style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} size={16} color="var(--silver-400)" />
                      <input
                        type="email"
                        placeholder="nouveau@email.com"
                        className="lux-input"
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        style={{ paddingLeft: 42 }}
                      />
                    </div>
                  </div>

                  <div style={{ height: 1, background: 'var(--border)' }} />

                  <div>
                    <label className="lux-label">Nouveau mot de passe</label>
                    <div style={{ position: 'relative', marginTop: 6 }}>
                      <KeyRound style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} size={16} color="var(--silver-400)" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="lux-input"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        style={{ paddingLeft: 42 }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="lux-label">Confirmer le mot de passe</label>
                    <div style={{ position: 'relative', marginTop: 6 }}>
                      <Lock style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} size={16} color="var(--silver-400)" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="lux-input"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        style={{ paddingLeft: 42 }}
                      />
                    </div>
                  </div>

                  {error && <ErrorBanner msg={error} />}
                  {success && <SuccessBanner msg={success} />}

                  <button type="submit" className="btn-gold" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    <Save size={16} /> Mettre à jour
                  </button>
                </form>
              </div>
            )}

            {/* Worker: username + password in workers table */}
            {!isAdmin && worker && (
              <div className="lux-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <CardHeader icon={<UserIcon size={18} color="var(--gold)" />} title="Profil & Sécurité" subtitle="Modifier vos identifiants de connexion" />
                <form onSubmit={handleWorkerAccountSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label className="lux-label">Nom d'utilisateur</label>
                    <div style={{ position: 'relative', marginTop: 6 }}>
                      <UserIcon style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} size={16} color="var(--silver-400)" />
                      <input className="lux-input" value={workerUsername} onChange={e => setWorkerUsername(e.target.value)} style={{ paddingLeft: 42 }} />
                    </div>
                  </div>
                  <div>
                    <label className="lux-label">Nouveau mot de passe</label>
                    <div style={{ position: 'relative', marginTop: 6 }}>
                      <KeyRound style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} size={16} color="var(--silver-400)" />
                      <input type="password" placeholder="••••••••" className="lux-input" value={workerPassword} onChange={e => setWorkerPassword(e.target.value)} style={{ paddingLeft: 42 }} />
                    </div>
                  </div>
                  <div>
                    <label className="lux-label">Confirmer le mot de passe</label>
                    <div style={{ position: 'relative', marginTop: 6 }}>
                      <Lock style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} size={16} color="var(--silver-400)" />
                      <input type="password" placeholder="••••••••" className="lux-input" value={workerConfirmPassword} onChange={e => setWorkerConfirmPassword(e.target.value)} style={{ paddingLeft: 42 }} />
                    </div>
                  </div>
                  {error && <ErrorBanner msg={error} />}
                  {success && <SuccessBanner msg={success} />}
                  <button type="submit" className="btn-gold" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    <Save size={16} /> Mettre à jour
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        )}

        {/* ===== TAB: SITE WEB ===== */}
        {activeTab === 'website' && isAdmin && (
          <motion.div
            key="website"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            <form onSubmit={handleWebsiteSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* MARQUEE */}
              <div className="lux-card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <SectionToggle icon={<Globe size={18} color="var(--gold)" />} title="Bandeau Défilant" subtitle="Textes du strip animé en haut du site" isOpen={openSec.marquee} onToggle={() => toggleSec('marquee')} />
                {openSec.marquee && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {marqueeItems.length === 0 && (
                      <p style={{ fontSize: 12, color: 'var(--silver-400)', fontStyle: 'italic', margin: '0 0 8px' }}>Aucun élément — textes par défaut utilisés.</p>
                    )}
                    {marqueeItems.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'var(--silver-400)', fontWeight: 700, minWidth: 24, textAlign: 'right', flexShrink: 0 }}>{idx + 1}.</span>
                        <input
                          value={item}
                          onChange={e => { const u = [...marqueeItems]; u[idx] = e.target.value; setMarqueeItems(u); }}
                          className="lux-input"
                          style={{ flex: 1, fontSize: 13 }}
                        />
                        <button type="button" onClick={() => setMarqueeItems(marqueeItems.filter((_, i) => i !== idx))}
                          style={{ width: 32, height: 32, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: 'var(--danger)' }}>
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <input
                        value={newMarqueeItem}
                        onChange={e => setNewMarqueeItem(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newMarqueeItem.trim()) { setMarqueeItems([...marqueeItems, newMarqueeItem.trim()]); setNewMarqueeItem(''); } } }}
                        className="lux-input"
                        placeholder="💎 Or & Argent Certifiés"
                        style={{ flex: 1, fontSize: 13 }}
                      />
                      <button type="button" onClick={() => { if (newMarqueeItem.trim()) { setMarqueeItems([...marqueeItems, newMarqueeItem.trim()]); setNewMarqueeItem(''); } }}
                        className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px', height: 42, borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <Plus size={13} /> Ajouter
                      </button>
                    </div>
                    {marqueeItems.length > 0 && (
                      <button type="button" onClick={() => setMarqueeItems([])} className="btn-outline"
                        style={{ fontSize: 11, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', marginTop: 4, width: 'fit-content', fontWeight: 600 }}>
                        Réinitialiser (défaut)
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* HERO */}
              <div className="lux-card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <SectionToggle icon={<Globe size={18} color="var(--gold)" />} title="Section Héro" subtitle="Textes principaux de la page d'accueil" isOpen={openSec.hero} onToggle={() => toggleSec('hero')} />
                {openSec.hero && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <BiField label="Badge / Étiquette" frKey="badgeFr" arKey="badgeAr" placeholder_fr="Nouvelle Collection" placeholder_ar="مجموعة جديدة" webS={webS} setWF={setWF} />
                    <BiField label="Titre ligne 1" frKey="heroLine1Fr" arKey="heroLine1Ar" placeholder_fr="Élégance" placeholder_ar="الأناقة" webS={webS} setWF={setWF} />
                    <BiField label="Titre ligne 2 (doré / animé)" frKey="heroLine2Fr" arKey="heroLine2Ar" placeholder_fr="Or & Argent" placeholder_ar="بالفضة الخالصة" webS={webS} setWF={setWF} />
                    <BiField label="Description" frKey="heroDescFr" arKey="heroDescAr" placeholder_fr="Découvrez notre collection…" placeholder_ar="اكتشف مجموعتنا…" textarea webS={webS} setWF={setWF} />
                    <BiField label="Bouton principal (CTA 1)" frKey="cta1Fr" arKey="cta1Ar" placeholder_fr="Explorer la Collection" placeholder_ar="استكشف المجموعة" webS={webS} setWF={setWF} />
                    <BiField label="Bouton secondaire (CTA 2)" frKey="cta2Fr" arKey="cta2Ar" placeholder_fr="Créer sur Mesure" placeholder_ar="تصميم خاص" webS={webS} setWF={setWF} />
                  </div>
                )}
              </div>

              {/* COLLECTION VEDETTES */}
              <div className="lux-card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <SectionToggle icon={<Globe size={18} color="var(--gold)" />} title="Collection Vedettes" subtitle="Titre et bouton du carrousel de produits" isOpen={openSec.featured} onToggle={() => toggleSec('featured')} />
                {openSec.featured && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <BiField label="Titre de la section" frKey="featuredTitleFr" arKey="featuredTitleAr" placeholder_fr="Nos Pièces Vedettes" placeholder_ar="منتجاتنا المميزة" webS={webS} setWF={setWF} />
                    <BiField label="Bouton voir tout" frKey="viewAllCtaFr" arKey="viewAllCtaAr" placeholder_fr="Voir toute la collection" placeholder_ar="عرض كل المجموعة" webS={webS} setWF={setWF} />
                  </div>
                )}
              </div>

              {/* NOTRE HISTOIRE */}
              <div className="lux-card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <SectionToggle icon={<Globe size={18} color="var(--gold)" />} title="Notre Histoire" subtitle="Textes et statistiques de la section savoir-faire" isOpen={openSec.story} onToggle={() => toggleSec('story')} />
                {openSec.story && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <BiField label="Tag (ex: Savoir-Faire)" frKey="storyTagFr" arKey="storyTagAr" placeholder_fr="Savoir-Faire" placeholder_ar="الحرفية" webS={webS} setWF={setWF} />
                    <BiField label="Titre" frKey="storyTitleFr" arKey="storyTitleAr" placeholder_fr="Notre Artisanat" placeholder_ar="صنعتنا" webS={webS} setWF={setWF} />
                    <BiField label="Description" frKey="storyDescFr" arKey="storyDescAr" placeholder_fr="Depuis plus d'une décennie…" placeholder_ar="منذ أكثر من عقد…" textarea webS={webS} setWF={setWF} />
                    <p style={{ fontSize: 11, color: 'var(--silver-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '8px 0 0' }}>Valeurs des statistiques</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                      {(['stat1Val', 'stat2Val', 'stat3Val', 'stat4Val'] as (keyof WebState)[]).map((k, i) => (
                        <div key={k}>
                          <label style={{ fontSize: 10, color: '#C9A84C', fontWeight: 700, display: 'block', marginBottom: 4 }}>Stat {i + 1}</label>
                          <input value={webS[k] as string} onChange={e => setWF(k, e.target.value)} className="lux-input" placeholder={['10+', '950', '4.9', '48h'][i]} style={{ fontSize: 13 }} />
                        </div>
                      ))}
                    </div>
                    <BiField label="Label Stat 1" frKey="stat1LabelFr" arKey="stat1LabelAr" placeholder_fr="Années d'expérience" placeholder_ar="سنوات خبرة" webS={webS} setWF={setWF} />
                    <BiField label="Label Stat 2" frKey="stat2LabelFr" arKey="stat2LabelAr" placeholder_fr="Or & Argent certifiés" placeholder_ar="نقاء الفضة" webS={webS} setWF={setWF} />
                    <BiField label="Label Stat 3" frKey="stat3LabelFr" arKey="stat3LabelAr" placeholder_fr="Note clients" placeholder_ar="تقييم العملاء" webS={webS} setWF={setWF} />
                    <BiField label="Label Stat 4" frKey="stat4LabelFr" arKey="stat4LabelAr" placeholder_fr="Délai livraison" placeholder_ar="وقت التسليم" webS={webS} setWF={setWF} />
                  </div>
                )}
              </div>

              {/* AVANTAGES */}
              <div className="lux-card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <SectionToggle icon={<Globe size={18} color="var(--gold)" />} title="Avantages" subtitle="4 arguments de confiance affichés sous les produits" isOpen={openSec.benefits} onToggle={() => toggleSec('benefits')} />
                {openSec.benefits && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {([1, 2, 3, 4] as const).map(n => (
                      <div key={n} style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <p style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Avantage {n}</p>
                        <BiField label="Titre" frKey={`ben${n}TitleFr` as keyof WebState} arKey={`ben${n}TitleAr` as keyof WebState}
                          placeholder_fr={['Métaux Certifiés', 'Livraison Nationale', 'Qualité Premium', 'Support Dédié'][n - 1]}
                          placeholder_ar={['فضة معتمدة', 'التوصيل الوطني', 'جودة ممتازة', 'دعم مخصص'][n - 1]}
                          webS={webS} setWF={setWF} />
                        <BiField label="Description" frKey={`ben${n}DescFr` as keyof WebState} arKey={`ben${n}DescAr` as keyof WebState}
                          placeholder_fr={['Pureté 950 garantie…', 'Express dans toutes les wilayas…', 'Chaque pièce inspectée…', 'Assistance 7j/7…'][n - 1]}
                          placeholder_ar={['نقاء 950 مضمون…', 'سريع إلى جميع ولايات…', 'كل قطعة مفحوصة…', 'مساعدة 7 أيام…'][n - 1]}
                          webS={webS} setWF={setWF} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* APPEL À L'ACTION */}
              <div className="lux-card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <SectionToggle icon={<Globe size={18} color="var(--gold)" />} title="Appel à l'Action" subtitle="Section commande personnalisée en bas de page" isOpen={openSec.personalized} onToggle={() => toggleSec('personalized')} />
                {openSec.personalized && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <BiField label="Titre" frKey="personalizedTitleFr" arKey="personalizedTitleAr" placeholder_fr="Transformez Votre Vision en Réalité" placeholder_ar="حول رؤيتك إلى حقيقة" webS={webS} setWF={setWF} />
                    <BiField label="Description" frKey="personalizedDescFr" arKey="personalizedDescAr" placeholder_fr="Nos artisans créent des pièces uniques…" placeholder_ar="يقوم حرفاؤنا بإنشاء قطع فريدة…" textarea webS={webS} setWF={setWF} />
                    <BiField label="Bouton CTA" frKey="personalizedCtaFr" arKey="personalizedCtaAr" placeholder_fr="Commencer une Création" placeholder_ar="ابدأ الإنشاء" webS={webS} setWF={setWF} />
                  </div>
                )}
              </div>

              {success && <SuccessBanner msg={success} />}
              <button type="submit" className="btn-gold" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                <Save size={16} /> Enregistrer les textes du site
              </button>
            </form>
          </motion.div>
        )}

        {/* ===== TAB: BASE DE DONNÉES ===== */}
        {activeTab === 'database' && isAdmin && (
          <motion.div
            key="database"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
          >
            <div className="lux-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <CardHeader icon={<Database size={18} color="var(--gold)" />} title="Sauvegarde & Restauration" subtitle="Exportez, importez ou réinitialisez les données" />

              <div style={{ padding: '16px', background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 12 }}>
                <p style={{ fontSize: 12, color: 'var(--silver-400)', fontWeight: 600, margin: 0, lineHeight: 1.6 }}>
                  Cette version fonctionne entièrement hors ligne : les données vivent dans le
                  navigateur, sans base de données. Exportez un instantané (.JSON) pour le
                  conserver, réimportez-le à tout moment, ou revenez au jeu de démonstration.
                </p>
              </div>

              {error && <ErrorBanner msg={error} />}
              {success && <SuccessBanner msg={success} />}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                  onClick={handleBackup}
                  className="btn-silver"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', borderRadius: 14, fontSize: 13, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em' }}
                >
                  <Database size={15} /> Télécharger la sauvegarde (.JSON)
                </button>
                <label style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', borderRadius: 14, fontSize: 13, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}>
                  <RotateCcw size={15} /> Restaurer depuis un fichier
                  <input type="file" accept=".json" onChange={handleRestore} style={{ display: 'none' }} />
                </label>
                <button
                  onClick={handleResetDemo}
                  className="btn-outline"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', borderRadius: 14, fontSize: 13, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em' }}
                >
                  <RotateCcw size={15} /> Réinitialiser les données de démonstration
                </button>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
};

export default Settings;
