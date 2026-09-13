
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Plus, Users, Wallet, Calendar, History, Trash2, Edit2,
  MinusCircle, PlusCircle, X, TrendingUp, CreditCard,
  Calculator, User, Phone, DollarSign, Lock, Mail, ShieldCheck, AlertCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { translations } from '../../i18n/translations';
import { Worker } from '../../types';
import PermissionEditor from './PermissionEditor';
import { DEFAULT_WORKER_PERMISSIONS } from '../../lib/permissions';
import {
  listStaff, createWorkerAccount, setUserPermissions,
  setWorkerPassword, deleteWorkerAccount, authErrorMessage,
  type StaffRow,
} from '../../lib/auth';

const Workers: React.FC = () => {
  const {
    workers, workerAdvances, workerAbsences, workerPayments,
    updateWorker, deleteWorker,
    addAdvance, addAbsence, addWorkerPayment, language, can, reloadWorkers,
  } = useApp();

  const t = translations[language];
  const shouldReduce = useReducedMotion();
  const isAr = language === 'ar';

  // UI State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [activeWorker, setActiveWorker] = useState<Worker | null>(null);
  const [modalType, setModalType] = useState<'advance' | 'absence' | 'payment' | 'history' | null>(null);

  // Form State for Modals
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // ── Accounts & permissions ───────────────────────────────────────────────
  // The payroll row lives in `workers`; the login behind it lives in auth.users.
  // `staff` joins the two so the card can show an employee's email and rights.
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [permissions, setPermissions] = useState<string[]>([...DEFAULT_WORKER_PERMISSIONS]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const reloadStaff = useCallback(async () => {
    try { setStaff(await listStaff()); }
    catch (e) { console.error('[staff]', e); }
  }, []);

  /** Accounts are created and deleted by RPCs, so pull both lists back after. */
  const refreshAll = useCallback(async () => {
    await Promise.all([reloadStaff(), reloadWorkers()]);
  }, [reloadStaff, reloadWorkers]);

  useEffect(() => { void reloadStaff(); }, [reloadStaff]);

  const staffFor = (workerId: string) => staff.find(s => s.workerId === workerId);

  // When the admin opens a worker for editing, start from that worker's
  // current rights rather than from the defaults.
  useEffect(() => {
    if (!showAddModal && !editingWorker) return;
    if (editingWorker) {
      const row = staffFor(editingWorker.id);
      setPermissions(row ? [...row.permissions] : [...DEFAULT_WORKER_PERMISSIONS]);
    } else {
      setPermissions([...DEFAULT_WORKER_PERMISSIONS]);
    }
    setFormError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddModal, editingWorker, staff]);

  const getWorkerStats = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return { advances: 0, absences: 0, payments: 0, remaining: 0 };

    const advances = workerAdvances.filter(a => a.workerId === workerId).reduce((sum, a) => sum + a.amount, 0);
    const absences = workerAbsences.filter(a => a.workerId === workerId).reduce((sum, a) => sum + a.deduction, 0);
    const payments = workerPayments.filter(p => p.workerId === workerId).reduce((sum, p) => sum + p.amount, 0);

    return {
      advances,
      absences,
      payments,
      remaining: worker.salary - advances - absences - payments
    };
  };

  /**
   * Creating an employee provisions a real Supabase auth account, so they sign
   * in with the same email/password flow as the administrator. Editing one
   * updates the payroll row, optionally resets the password, and always
   * rewrites the permission set from the tick-list.
   */
  const handleWorkerSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const fullName = String(fd.get('fullName') || '').trim();
    const email = String(fd.get('email') || '').trim().toLowerCase();
    const password = String(fd.get('password') || '');
    const phone = String(fd.get('phone') || '');
    const address = String(fd.get('address') || '');
    const paymentType = fd.get('paymentType') as 'monthly' | 'daily';
    const salary = parseFloat(String(fd.get('salary') || '0')) || 0;
    const username = String(fd.get('username') || '').trim() || email.split('@')[0];
    const createdAtStr = String(fd.get('createdAt') || '');

    setFormError('');
    setSaving(true);
    try {
      if (editingWorker) {
        const patch: any = { fullName, phone, address, paymentType, salary, username };
        if (createdAtStr) patch.createdAt = new Date(createdAtStr).toISOString();
        await updateWorker(editingWorker.id, patch);

        const row = staffFor(editingWorker.id);
        if (row) {
          if (password) await setWorkerPassword(row.userId, password);
          await setUserPermissions(row.userId, permissions);
        }
      } else {
        if (password.length < 6) {
          setFormError(isAr ? 'كلمة السر يجب أن تكون 6 أحرف على الأقل.' : 'Le mot de passe doit contenir au moins 6 caractères.');
          return;
        }
        await createWorkerAccount({
          email, password, fullName, phone, address, paymentType, salary, username, permissions,
        });
      }

      await refreshAll();
      closeMainModals();
    } catch (err) {
      setFormError(authErrorMessage(err, language));
    } finally {
      setSaving(false);
    }
  };

  /** Removes the payroll row and the login behind it in one go. */
  const handleDeleteWorker = async (w: Worker) => {
    if (!confirm(
      isAr
        ? `حذف ${w.fullName} وحسابه نهائياً؟`
        : `Supprimer définitivement ${w.fullName} et son compte de connexion ?`
    )) return;

    try {
      // Drop the auth user first (that also removes the payroll row server
      // side), then clear it locally so the card disappears straight away.
      if (staffFor(w.id)) await deleteWorkerAccount(w.id);
      await deleteWorker(w.id);
      await refreshAll();
    } catch (err) {
      alert(authErrorMessage(err, language));
    }
  };

  const handleActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorker || !amount) return;

    const val = parseFloat(amount);
    const recordDate = new Date(date).toISOString();

    if (modalType === 'advance') {
      addAdvance({ workerId: activeWorker.id, amount: val, date: recordDate });
    } else if (modalType === 'absence') {
      addAbsence({ workerId: activeWorker.id, deduction: val, date: recordDate });
    } else if (modalType === 'payment') {
      if (activeWorker.paymentType === 'monthly') {
        const ok = confirm(`Confirmer le paiement mensuel pour ${activeWorker.fullName} ?`);
        if (!ok) return;
      }
      addWorkerPayment({ workerId: activeWorker.id, amount: val, date: recordDate });
    }

    closeActionModal();
  };

  const closeMainModals = () => {
    setShowAddModal(false); setEditingWorker(null);
  };

  const closeActionModal = () => {
    setModalType(null); setActiveWorker(null); setAmount(''); setDate(new Date().toISOString().split('T')[0]);
  };

  const totalSalaries = workers.reduce((sum, w) => sum + w.salary, 0);
  const totalWorkers = workers.length;

  return (
    <motion.div
      initial={shouldReduce ? false : { opacity: 0, y: 14, scale: 0.995 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] as any }}
      style={{ display: 'flex', flexDirection: 'column', gap: 32 }}
    >
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="silver-line" />
          <h1 className="section-title">{t.workers}</h1>
          <p className="section-subtitle">Gestion de l'équipe & paie</p>
        </div>
        {can('workers.create') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-gold"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 16, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            <Plus size={18} /> {t.newWorker}
          </button>
        )}
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div className="lux-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(201,168,76,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={24} style={{ color: 'var(--gold)' }} />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>Employés</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.03em', margin: 0 }}>{totalWorkers}</p>
          </div>
        </div>
        <div className="lux-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(201,168,76,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={24} style={{ color: 'var(--gold)' }} />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>Masse Salariale</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.03em', margin: 0 }}>{totalSalaries.toLocaleString()} <span style={{ fontSize: 12, color: 'var(--gold)' }}>DZD</span></p>
          </div>
        </div>
      </div>

      {/* Worker Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {workers.map(w => {
          const stats = getWorkerStats(w.id);
          return (
            <div key={w.id} className="lux-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 16,
                    background: 'linear-gradient(135deg, var(--gold) 0%, #b8922a 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, fontWeight: 800, color: 'var(--deep-bg)'
                  }}>
                    {w.fullName.charAt(0)}
                  </div>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--silver-100)', margin: 0, letterSpacing: '-0.02em' }}>{w.fullName}</p>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '3px 0 0' }}>
                      {t[w.paymentType]} &bull; {w.salary.toLocaleString()} DZD
                    </p>
                    {staffFor(w.id)?.email && (
                      <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--gold)', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Mail size={10} /> {staffFor(w.id)!.email}
                      </p>
                    )}
                    {staffFor(w.id) && (
                      <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--silver-400)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ShieldCheck size={10} /> {staffFor(w.id)!.permissions.length} permissions
                      </p>
                    )}
                    {w.createdAt && (
                      <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--silver-400)', margin: '2px 0 0' }}>
                        Depuis le {new Date(w.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {can('workers.edit') && (
                    <button onClick={() => setEditingWorker(w)} className="btn-icon" title="Modifier"><Edit2 size={15} /></button>
                  )}
                  {can('workers.delete') && (
                    <button onClick={() => handleDeleteWorker(w)} className="btn-icon danger" title="Supprimer"><Trash2 size={15} /></button>
                  )}
                </div>
              </div>

              {/* Mini Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--silver-400)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>{t.totalAdvances}</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#818cf8', margin: 0 }}>{stats.advances.toLocaleString()} <span style={{ fontSize: 9 }}>DZD</span></p>
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--silver-400)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>{t.totalAbsences}</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--danger)', margin: 0 }}>{stats.absences.toLocaleString()} <span style={{ fontSize: 9 }}>DZD</span></p>
                </div>
              </div>

              {/* Net Pay Banner */}
              <div style={{ padding: '16px 20px', borderRadius: 14, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 4px' }}>{t.netPay}</p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.03em', margin: 0 }}>
                    {stats.remaining.toLocaleString()} <span style={{ fontSize: 12, color: 'var(--gold)' }}>DZD</span>
                  </p>
                </div>
                <Wallet size={22} style={{ color: 'var(--gold)' }} />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  onClick={() => { setActiveWorker(w); setModalType('advance'); }}
                  style={{ padding: '10px 8px', borderRadius: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.18s' }}
                >
                  <PlusCircle size={13} /> {t.advance}
                </button>
                <button
                  onClick={() => { setActiveWorker(w); setModalType('absence'); }}
                  style={{ padding: '10px 8px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.18s' }}
                >
                  <MinusCircle size={13} /> {t.absence}
                </button>
                <button
                  onClick={() => { setActiveWorker(w); setModalType('payment'); setAmount(stats.remaining.toString()); }}
                  style={{ padding: '10px 8px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.18s' }}
                >
                  <CreditCard size={13} /> {t.paid}
                </button>
                <button
                  onClick={() => { setActiveWorker(w); setModalType('history'); }}
                  style={{ padding: '10px 8px', borderRadius: 10, background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.15)', color: 'var(--silver-300)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.18s' }}
                >
                  <History size={13} /> {t.history}
                </button>
              </div>
            </div>
          );
        })}

        {workers.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '64px 0', color: 'var(--silver-400)', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Aucun employé enregistré
          </div>
        )}
      </div>

      {/* Add / Edit Worker Modal */}
      <AnimatePresence>
        {(showAddModal || editingWorker) && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMainModals}
          >
            <motion.div
              className="modal-box"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: 520, width: '100%' }}
            >
              <div className="modal-header">
                <div>
                  <div className="silver-line" style={{ marginBottom: 6 }} />
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.03em', margin: 0 }}>
                    {editingWorker ? t.edit : t.newWorker}
                  </h2>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>
                    Informations de l'employé
                  </p>
                </div>
                <button onClick={closeMainModals} className="btn-icon"><X size={18} /></button>
              </div>

              <form onSubmit={handleWorkerSubmit}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {/* Full Name */}
                  <div>
                    <label className="lux-label">Nom Complet</label>
                    <div style={{ position: 'relative' }}>
                      <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--silver-400)', pointerEvents: 'none' }} />
                      <input
                        name="fullName"
                        required
                        defaultValue={editingWorker?.fullName}
                        placeholder="Ex: Mohamed Ali"
                        className="lux-input"
                        style={{ paddingLeft: 40 }}
                      />
                    </div>
                  </div>

                  {/* Payment Type + Salary */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label className="lux-label">Type Paiement</label>
                      <select name="paymentType" defaultValue={editingWorker?.paymentType} className="lux-select">
                        <option value="monthly">Mensuel</option>
                        <option value="daily">Journalier</option>
                      </select>
                    </div>
                    <div>
                      <label className="lux-label">Salaire (DZD)</label>
                      <div style={{ position: 'relative' }}>
                        <DollarSign size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--silver-400)', pointerEvents: 'none' }} />
                        <input
                          name="salary"
                          type="number"
                          required
                          defaultValue={editingWorker?.salary}
                          placeholder="60000"
                          className="lux-input"
                          style={{ paddingLeft: 40 }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Login — a real Supabase account, so the address must be
                      one the employee can actually be identified by. */}
                  <div>
                    <label className="lux-label">Email de connexion</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--silver-400)', pointerEvents: 'none' }} />
                      <input
                        name="email"
                        type="email"
                        required={!editingWorker}
                        disabled={!!editingWorker}
                        defaultValue={editingWorker ? (staffFor(editingWorker.id)?.email || '') : ''}
                        placeholder="employe@exemple.com"
                        className="lux-input"
                        style={{ paddingLeft: 40, opacity: editingWorker ? 0.65 : 1 }}
                      />
                    </div>
                    {editingWorker && (
                      <p style={{ fontSize: 11, color: 'var(--silver-400)', margin: '6px 0 0' }}>
                        {isAr ? 'لا يمكن تغيير البريد بعد الإنشاء.' : "L'email ne peut pas être modifié après la création."}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label className="lux-label">Identifiant affiché</label>
                      <input
                        name="username"
                        defaultValue={editingWorker?.username}
                        placeholder="nom_utilisateur"
                        className="lux-input"
                      />
                    </div>
                    <div>
                      <label className="lux-label">
                        {editingWorker ? 'Nouveau mot de passe' : 'Mot de passe'}
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--silver-400)', pointerEvents: 'none' }} />
                        <input
                          name="password"
                          type="text"
                          required={!editingWorker}
                          minLength={editingWorker ? undefined : 6}
                          placeholder={editingWorker ? 'Laisser vide pour conserver' : '6 caractères minimum'}
                          className="lux-input"
                          style={{ paddingLeft: 40 }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="lux-label">Téléphone</label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--silver-400)', pointerEvents: 'none' }} />
                      <input
                        name="phone"
                        defaultValue={editingWorker?.phone}
                        placeholder="05XX..."
                        className="lux-input"
                        style={{ paddingLeft: 40 }}
                      />
                    </div>
                  </div>

                  {/* Date Creation */}
                  <div>
                    <label className="lux-label">Date Création</label>
                    <input
                      name="createdAt"
                      type="date"
                      defaultValue={editingWorker?.createdAt ? new Date(editingWorker.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                      className="lux-input"
                    />
                  </div>

                  {/* ── Permissions ──
                      What this employee may open and press. Everything not
                      ticked here is hidden in their sidebar and refused by the
                      database, so the two can never disagree. */}
                  {can('workers.permissions.manage') && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 18 }}>
                      <label className="lux-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <ShieldCheck size={15} style={{ color: 'var(--gold)' }} />
                        Permissions — interfaces & actions
                      </label>
                      <PermissionEditor value={permissions} onChange={setPermissions} language={language} />
                    </div>
                  )}

                  {formError && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                      borderRadius: 10, padding: '10px 14px',
                    }}>
                      <AlertCircle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                      <p style={{ fontSize: 13, color: 'var(--danger)', margin: 0, fontWeight: 500 }}>{formError}</p>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button type="button" onClick={closeMainModals} className="btn-outline" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    Annuler
                  </button>
                  <button type="submit" disabled={saving} className="btn-gold" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Modal: Advance / Absence / Payment */}
      <AnimatePresence>
        {modalType && modalType !== 'history' && activeWorker && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeActionModal}
          >
            <motion.div
              className="modal-box"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: 440, width: '100%' }}
            >
              <div className="modal-header">
                <div>
                  <div className="silver-line" style={{ marginBottom: 6 }} />
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.03em', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                    {modalType === 'advance' && <PlusCircle size={20} style={{ color: '#818cf8' }} />}
                    {modalType === 'absence' && <MinusCircle size={20} style={{ color: 'var(--danger)' }} />}
                    {modalType === 'payment' && <Calculator size={20} style={{ color: '#34d399' }} />}
                    {t[modalType] || (modalType === 'payment' ? 'Paiement' : modalType)}
                  </h2>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>
                    {activeWorker.fullName}
                  </p>
                </div>
                <button onClick={closeActionModal} className="btn-icon"><X size={18} /></button>
              </div>

              <form onSubmit={handleActionSubmit}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {/* Employee Summary */}
                  {modalType === 'payment' && (
                    <div style={{ padding: '16px 18px', borderRadius: 12, background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.18)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: 'var(--silver-300)', fontWeight: 600 }}>
                        <span>Salaire de base</span>
                        <span style={{ color: 'var(--silver-100)', fontWeight: 700 }}>{activeWorker.salary.toLocaleString()} DZD</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>
                        <span>Avances & Absences</span>
                        <span>-{(getWorkerStats(activeWorker.id).advances + getWorkerStats(activeWorker.id).absences).toLocaleString()} DZD</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#34d399', fontWeight: 800, paddingTop: 8, borderTop: '1px solid rgba(201,168,76,0.15)' }}>
                        <span>Dû restant</span>
                        <span>{getWorkerStats(activeWorker.id).remaining.toLocaleString()} DZD</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="lux-label">Montant (DZD)</label>
                    <input
                      type="number"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="lux-input"
                    />
                  </div>
                  <div>
                    <label className="lux-label">Date</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="lux-input"
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" onClick={closeActionModal} className="btn-outline" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    Annuler
                  </button>
                  <button type="submit" className="btn-gold" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    Confirmer
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {modalType === 'history' && activeWorker && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeActionModal}
          >
            <motion.div
              className="modal-box"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: 600, width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
            >
              <div className="modal-header">
                <div>
                  <div className="silver-line" style={{ marginBottom: 6 }} />
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.03em', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <History size={20} style={{ color: 'var(--gold)' }} />
                    Historique Financier
                  </h2>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>
                    {activeWorker.fullName}
                  </p>
                </div>
                <button onClick={closeActionModal} className="btn-icon"><X size={18} /></button>
              </div>

              <div className="modal-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Advances */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 4, height: 20, borderRadius: 4, background: '#818cf8' }} />
                    <p style={{ fontSize: 10, fontWeight: 800, color: '#818cf8', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>Avances</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {workerAdvances.filter(a => a.workerId === activeWorker.id).map(a => (
                      <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 12, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <PlusCircle size={16} style={{ color: '#818cf8' }} />
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--silver-100)', margin: 0 }}>{new Date(a.date).toLocaleDateString()}</p>
                            <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--silver-400)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Versement anticipé</p>
                          </div>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#818cf8' }}>-{a.amount.toLocaleString()} DZD</span>
                      </div>
                    ))}
                    {workerAdvances.filter(a => a.workerId === activeWorker.id).length === 0 && (
                      <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--silver-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '12px 0' }}>Aucune avance enregistrée</p>
                    )}
                  </div>
                </div>

                {/* Absences */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 4, height: 20, borderRadius: 4, background: 'var(--danger)' }} />
                    <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--danger)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>Absences</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {workerAbsences.filter(a => a.workerId === activeWorker.id).map(a => (
                      <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <MinusCircle size={16} style={{ color: 'var(--danger)' }} />
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--silver-100)', margin: 0 }}>{new Date(a.date).toLocaleDateString()}</p>
                            <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--silver-400)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Déduction absence</p>
                          </div>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--danger)' }}>-{a.deduction.toLocaleString()} DZD</span>
                      </div>
                    ))}
                    {workerAbsences.filter(a => a.workerId === activeWorker.id).length === 0 && (
                      <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--silver-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '12px 0' }}>Aucune absence enregistrée</p>
                    )}
                  </div>
                </div>

                {/* Payments */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 4, height: 20, borderRadius: 4, background: '#34d399' }} />
                    <p style={{ fontSize: 10, fontWeight: 800, color: '#34d399', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>Paiements Mensuels</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {workerPayments.filter(p => p.workerId === activeWorker.id).map(p => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 12, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <TrendingUp size={16} style={{ color: '#34d399' }} />
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--silver-100)', margin: 0 }}>{new Date(p.date).toLocaleDateString()}</p>
                            <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--silver-400)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Règlement salaire</p>
                          </div>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#34d399' }}>+{p.amount.toLocaleString()} DZD</span>
                      </div>
                    ))}
                    {workerPayments.filter(p => p.workerId === activeWorker.id).length === 0 && (
                      <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--silver-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '12px 0' }}>Aucun paiement effectué</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer summary */}
              <div className="modal-footer" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--silver-400)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>Dû Final</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--gold)', letterSpacing: '-0.03em', margin: 0 }}>
                    {getWorkerStats(activeWorker.id).remaining.toLocaleString()} DZD
                  </p>
                </div>
                <button onClick={closeActionModal} className="btn-outline" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Workers;
