
import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Plus, Edit2, Trash2, DollarSign, TrendingUp, TrendingDown, X, CreditCard } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { translations } from '../../i18n/translations';
import { Debt } from '../../types';

const Debts: React.FC = () => {
  const { debts, addDebt, updateDebt, deleteDebt, payDebt, language, can } = useApp();
  const t = translations[language];
  const shouldReduce = useReducedMotion();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [name, setName] = useState('');
  const [direction, setDirection] = useState<'given' | 'taken'>('taken');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [showPayBox, setShowPayBox] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [selected, setSelected] = useState<Debt | null>(null);

  const openAdd = () => {
    setEditing(null);
    setName(''); setDirection('taken'); setAmount(''); setNote('');
    setShowModal(true);
  };

  const openEdit = (d: Debt) => {
    setEditing(d);
    setName(d.name);
    setDirection(d.direction);
    setAmount(String(d.amount));
    setNote(d.note || '');
    setShowModal(true);
  };

  const closeShowModal = () => {
    setShowModal(false);
  };
  const closeShowPayBox = () => {
    setShowPayBox(false);
  };

  const submit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name || !amount) return;
    const payload = { name, direction, amount: Number(amount), note };
    if (editing) {
      updateDebt(editing.id, payload);
    } else {
      addDebt(payload);
    }
    closeShowModal();
  };

  const openPay = (d: Debt) => {
    setSelected(d);
    setPayAmount('');
    setShowPayBox(true);
  };

  const confirmPay = () => {
    if (!selected) return;
    const amt = Number(payAmount) || 0;
    if (amt <= 0) return;
    payDebt(selected.id, amt);
    closeShowPayBox();
  };

  const totalTaken = debts.filter(d => d.direction === 'taken').reduce((sum, d) => sum + (d.remaining || 0), 0);
  const totalGiven = debts.filter(d => d.direction === 'given').reduce((sum, d) => sum + (d.remaining || 0), 0);
  const netBalance = totalTaken - totalGiven;

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
          <h1 className="section-title">{t.debts}</h1>
          <p className="section-subtitle">Gestion des créances & dettes</p>
        </div>
        <button
          onClick={openAdd}
          className="btn-gold"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 16, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          <Plus size={18} /> Nouvelle Dette
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <div className="lux-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(52,211,153,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={22} style={{ color: '#34d399' }} />
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>On nous doit</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#34d399', letterSpacing: '-0.03em', margin: 0 }}>{totalTaken.toLocaleString()} <span style={{ fontSize: 11 }}>DZD</span></p>
          </div>
        </div>
        <div className="lux-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingDown size={22} style={{ color: 'var(--danger)' }} />
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>Nous devons</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--danger)', letterSpacing: '-0.03em', margin: 0 }}>{totalGiven.toLocaleString()} <span style={{ fontSize: 11 }}>DZD</span></p>
          </div>
        </div>
        <div className="lux-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(201,168,76,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard size={22} style={{ color: 'var(--gold)' }} />
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>Solde Net</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: netBalance >= 0 ? '#34d399' : 'var(--danger)', letterSpacing: '-0.03em', margin: 0 }}>
              {netBalance.toLocaleString()} <span style={{ fontSize: 11 }}>DZD</span>
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="lux-card" style={{ overflow: 'hidden' }}>
        <table className="lux-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Nom</th>
              <th>Type</th>
              <th>Montant Initial</th>
              <th>Reste</th>
              <th>Note</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {debts.map(d => (
              <tr key={d.id}>
                <td>{new Date(d.date).toLocaleDateString()}</td>
                <td style={{ fontWeight: 700, color: 'var(--silver-100)' }}>{d.name}</td>
                <td>
                  {d.direction === 'taken' ? (
                    <span className="badge badge-success">On nous doit</span>
                  ) : (
                    <span className="badge badge-danger">Nous devons</span>
                  )}
                </td>
                <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{(d.amount || 0).toLocaleString()} DZD</td>
                <td>
                  <span style={{ fontWeight: 700, color: (d.remaining || 0) > 0 ? 'var(--danger)' : '#34d399' }}>
                    {(d.remaining || 0).toLocaleString()} DZD
                  </span>
                </td>
                <td style={{ color: 'var(--silver-300)', fontSize: 12 }}>{d.note || '—'}</td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button onClick={() => openPay(d)} className="btn-icon" title="Payer" style={{ color: '#34d399' }}><DollarSign size={15} /></button>
                    <button onClick={() => openEdit(d)} className="btn-icon" title="Modifier"><Edit2 size={15} /></button>
                    <button onClick={() => { if (confirm(t.delete + ' ?')) deleteDebt(d.id); }} style={can('debts.delete') ? undefined : { display: 'none' }} className="btn-icon danger" title="Supprimer"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {debts.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--silver-400)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Aucune dette enregistrée
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeShowModal}
          >
            <motion.div
              className="modal-box"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: 480, width: '100%' }}
            >
              <div className="modal-header">
                <div>
                  <div className="silver-line" style={{ marginBottom: 6 }} />
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.03em', margin: 0 }}>
                    {editing ? 'Modifier Dette' : 'Nouvelle Dette'}
                  </h2>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>
                    {editing ? 'Mettre à jour les informations' : 'Ajouter une nouvelle dette'}
                  </p>
                </div>
                <button onClick={closeShowModal} className="btn-icon"><X size={18} /></button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <label className="lux-label">Nom</label>
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="lux-input"
                      placeholder="Nom du créancier / débiteur"
                      required
                    />
                  </div>
                  <div>
                    <label className="lux-label">Type</label>
                    <select value={direction} onChange={e => setDirection(e.target.value as any)} className="lux-select">
                      <option value="taken">Prendre (on nous doit)</option>
                      <option value="given">Donner (nous devons)</option>
                    </select>
                  </div>
                  <div>
                    <label className="lux-label">Montant (DZD)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="lux-input"
                      placeholder="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="lux-label">Note (optionnel)</label>
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      className="lux-input"
                      placeholder="Remarques supplémentaires..."
                      rows={3}
                      style={{ resize: 'none' }}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" onClick={closeShowModal} className="btn-outline" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    {t.cancel}
                  </button>
                  <button type="submit" className="btn-gold" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    {editing ? t.save : 'Ajouter'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pay Debt Modal */}
      <AnimatePresence>
        {showPayBox && selected && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeShowPayBox}
          >
            <motion.div
              className="modal-box"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: 400, width: '100%' }}
            >
              <div className="modal-header">
                <div>
                  <div className="silver-line" style={{ marginBottom: 6 }} />
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.03em', margin: 0 }}>
                    Payer Dette
                  </h2>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>
                    {selected.name} &mdash; Reste: {(selected.remaining || 0).toLocaleString()} DZD
                  </p>
                </div>
                <button onClick={closeShowPayBox} className="btn-icon"><X size={18} /></button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label className="lux-label">Montant à payer (DZD)</label>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="lux-input"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button onClick={closeShowPayBox} className="btn-outline" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  Annuler
                </button>
                <button onClick={confirmPay} className="btn-gold" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  Confirmer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Debts;
