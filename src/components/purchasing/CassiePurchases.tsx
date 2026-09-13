import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Plus, Trash2, Edit2, Box, Flame, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { translations } from '../../i18n/translations';
import { CassiePurchase, MeltingRecord } from '../../types';

const CassiePurchases: React.FC = () => {
  const { cassiePurchases, addCassiePurchase, updateCassiePurchase, deleteCassiePurchase, meltCassiePurchases, metalTypes, language, meltings, deleteMeltingRecord, updateMeltingRecord, categoryLabel, can } = useApp();
  const t = translations[language];
  const shouldReduce = useReducedMotion();

  // UI state
  const [viewMode, setViewMode] = useState<'purchase' | 'melting'>('purchase');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showMeltingModal, setShowMeltingModal] = useState(false);

  // add form
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [metalTypeId, setMetalTypeId] = useState('');
  const [weight, setWeight] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [editing, setEditing] = useState<CassiePurchase | null>(null);

  // melting
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [postWeight, setPostWeight] = useState('');
  const [targetMetalTypeId, setTargetMetalTypeId] = useState('');
  const [editingMelting, setEditingMelting] = useState<MeltingRecord | null>(null);

  // date filtering
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const [showLastMonthOnly, setShowLastMonthOnly] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const cassieTypes = metalTypes.filter(st => st.isCassie);

  // Date filtering logic
  const todayFiltered = cassiePurchases.filter(p => {
    const pDate = new Date(p.date);
    const today = new Date();
    return pDate.toDateString() === today.toDateString();
  });

  const lastMonthFiltered = cassiePurchases.filter(p => {
    const pDate = new Date(p.date);
    const today = new Date();
    const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    return pDate >= lastMonthDate && pDate <= today;
  });

  const customRangeFiltered = cassiePurchases.filter(p => {
    if (!startDate || !endDate) return false;
    const pDate = new Date(p.date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return pDate >= start && pDate <= end;
  });

  const getDisplayedPurchases = () => {
    if (showTodayOnly) return todayFiltered;
    if (showLastMonthOnly) return lastMonthFiltered;
    if (startDate && endDate) return customRangeFiltered;
    return cassiePurchases;
  };

  const displayedPurchases = getDisplayedPurchases();
  const totalWeightDisplay = displayedPurchases.reduce((sum, p) => sum + p.weight, 0);
  const totalPriceDisplay = displayedPurchases.reduce((sum, p) => sum + p.totalPrice, 0);

  const pricePerGram = useMemo(() => {
    const w = parseFloat(weight) || 0;
    const p = parseFloat(totalPrice) || 0;
    return w > 0 ? p / w : 0;
  }, [weight, totalPrice]);

  const closeShowPurchaseModal = () => {
    setShowPurchaseModal(false); setEditing(null);
  };
  const closeShowMeltingModal = () => {
    setShowMeltingModal(false); setEditingMelting(null); setSelectedIds([]);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!clientName || !metalTypeId || !(parseFloat(weight) > 0) || !(parseFloat(totalPrice) >= 0)) return;
    const payload = { clientName, clientPhone, metalTypeId, weight: parseFloat(weight), totalPrice: parseFloat(totalPrice) };
    if (editing) {
      updateCassiePurchase(editing.id, payload);
    } else {
      addCassiePurchase(payload);
    }
    resetForm();
    closeShowPurchaseModal();
  };

  const resetForm = () => {
    setClientName(''); setClientPhone(''); setMetalTypeId(''); setWeight(''); setTotalPrice('');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const totalPreWeight = selectedIds.reduce((s, id) => s + (cassiePurchases.find(p => p.id === id)?.weight || 0), 0);
  const totalPrePrice = selectedIds.reduce((s, id) => s + (cassiePurchases.find(p => p.id === id)?.totalPrice || 0), 0);
  const loss = totalPreWeight - (parseFloat(postWeight) || 0);
  const priceAfter = (parseFloat(postWeight) || 0) > 0 ? totalPrePrice / (parseFloat(postWeight) || 0) : 0;

  const handleMelt = () => {
    if (selectedIds.length === 0) return;
    if (!targetMetalTypeId) return alert('Choisissez un type cassie pour déposer le résultat');
    const pw = parseFloat(postWeight) || 0;
    if (pw <= 0) return alert('Poids après fusion invalide');
    if (editingMelting) {
      updateMeltingRecord(editingMelting.id, pw, targetMetalTypeId);
      setEditingMelting(null);
    } else {
      meltCassiePurchases(selectedIds, pw, targetMetalTypeId);
    }
    setSelectedIds([]);
    setPostWeight('');
    setTargetMetalTypeId('');
    closeShowMeltingModal();
  };

  const filterLabel = showTodayOnly ? "Aujourd'hui" : showLastMonthOnly ? 'Mois dernier' : 'Période';

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
          <h1 className="section-title">Cassie Purchases</h1>
          <p className="section-subtitle">Achats Cassie et Fusion</p>
        </div>
        {/* View mode toggle */}
        <div style={{ display: 'flex', borderRadius: 16, background: 'var(--card-bg)', padding: 4, border: '1px solid var(--border)', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => setViewMode('purchase')}
            style={{
              padding: '8px 20px', borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: 'pointer', border: 'none',
              background: viewMode === 'purchase' ? 'rgba(201,168,76,0.18)' : 'transparent',
              color: viewMode === 'purchase' ? 'var(--gold)' : 'var(--silver-300)',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
            }}
          >
            <Box size={15} /> Achat
          </button>
          <button
            onClick={() => setViewMode('melting')}
            style={{
              padding: '8px 20px', borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: 'pointer', border: 'none',
              background: viewMode === 'melting' ? 'rgba(201,168,76,0.18)' : 'transparent',
              color: viewMode === 'melting' ? 'var(--gold)' : 'var(--silver-300)',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
            }}
          >
            <Flame size={15} /> Fusion
          </button>
        </div>
      </div>

      {/* Purchase View */}
      {viewMode === 'purchase' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => { resetForm(); setShowPurchaseModal(true); }}
              className="btn-gold"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 16, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              <Plus size={18} /> Nouveau Achat
            </button>
          </div>

          {/* Date Filters */}
          <div className="lux-card" style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, alignItems: 'end' }}>
              <button
                onClick={() => { setShowTodayOnly(!showTodayOnly); setShowLastMonthOnly(false); setStartDate(''); setEndDate(''); }}
                style={{
                  padding: '10px 16px', borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: 'pointer',
                  border: `1px solid ${showTodayOnly ? 'var(--gold)' : 'var(--border)'}`,
                  background: showTodayOnly ? 'rgba(201,168,76,0.15)' : 'var(--card-bg)',
                  color: showTodayOnly ? 'var(--gold)' : 'var(--silver-300)',
                  transition: 'all 0.2s'
                }}
              >
                Aujourd'hui
              </button>
              <button
                onClick={() => { setShowLastMonthOnly(!showLastMonthOnly); setShowTodayOnly(false); setStartDate(''); setEndDate(''); }}
                style={{
                  padding: '10px 16px', borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: 'pointer',
                  border: `1px solid ${showLastMonthOnly ? 'var(--gold)' : 'var(--border)'}`,
                  background: showLastMonthOnly ? 'rgba(201,168,76,0.15)' : 'var(--card-bg)',
                  color: showLastMonthOnly ? 'var(--gold)' : 'var(--silver-300)',
                  transition: 'all 0.2s'
                }}
              >
                Le mois dernier
              </button>
              <div>
                <label className="lux-label">Depuis:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => { setStartDate(e.target.value); setShowTodayOnly(false); setShowLastMonthOnly(false); }}
                  className="lux-input"
                />
              </div>
              <div>
                <label className="lux-label">Jusqu'à:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => { setEndDate(e.target.value); setShowTodayOnly(false); setShowLastMonthOnly(false); }}
                  className="lux-input"
                />
              </div>
            </div>
          </div>

          {/* Metrics Cards */}
          {(showTodayOnly || showLastMonthOnly || (startDate && endDate)) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div className="lux-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(201,168,76,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Box size={24} style={{ color: 'var(--gold)' }} />
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
                    Poids Total ({filterLabel})
                  </p>
                  <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--silver-100)', margin: 0 }}>{totalWeightDisplay.toFixed(2)} <span style={{ fontSize: 14, color: 'var(--silver-300)' }}>g</span></p>
                </div>
              </div>

              <div className="lux-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(20,184,166,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Flame size={24} style={{ color: 'var(--teal)' }} />
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
                    Prix Total ({filterLabel})
                  </p>
                  <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--silver-100)', margin: 0 }}>{totalPriceDisplay.toLocaleString()} <span style={{ fontSize: 14, color: 'var(--silver-300)' }}>DZD</span></p>
                </div>
              </div>

              <div className="lux-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(201,168,76,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={24} style={{ color: 'var(--gold)' }} />
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>Prix/g Moyen</p>
                  <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--gold)', margin: 0 }}>
                    {totalWeightDisplay > 0 ? (totalPriceDisplay / totalWeightDisplay).toFixed(2) : '0.00'} <span style={{ fontSize: 14 }}>DZD</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Purchase cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {displayedPurchases.map(p => (
              <div key={p.id} className="lux-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--silver-100)', margin: 0 }}>
                      {p.clientName}
                      {p.clientPhone && <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--silver-400)', marginLeft: 8 }}>{p.clientPhone}</span>}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--silver-300)', margin: '4px 0' }}>
                      Type: {metalTypes.find(s => s.id === p.metalTypeId)?.name || p.metalTypeId}
                    </p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--gold)', margin: '8px 0 4px' }}>
                      {p.weight} g &bull; {p.totalPrice.toLocaleString()} DZD
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--silver-400)' }}>Enregistré: {new Date(p.date).toLocaleDateString()}</span>
                      <span
                        style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                          background: p.isMelted ? 'rgba(201,168,76,0.15)' : 'rgba(20,184,166,0.12)',
                          color: p.isMelted ? 'var(--gold)' : 'var(--teal)',
                          textTransform: 'uppercase', letterSpacing: '0.06em'
                        }}
                      >
                        {p.isMelted ? 'Fondue' : 'En attente'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginLeft: 12 }}>
                    <button
                      onClick={() => {
                        setEditing(p);
                        setClientName(p.clientName);
                        setClientPhone(p.clientPhone || '');
                        setMetalTypeId(p.metalTypeId);
                        setWeight(String(p.weight));
                        setTotalPrice(String(p.totalPrice));
                        setShowPurchaseModal(true);
                      }}
                      className="btn-icon"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => { if (confirm('Supprimer cet achat ?')) deleteCassiePurchase(p.id); }}
                      style={can('cassiePurchases.delete') ? undefined : { display: 'none' }}
                      className="btn-icon danger"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Melting View */}
      {viewMode === 'melting' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setSelectedIds([]); setPostWeight(''); setTargetMetalTypeId(''); setShowMeltingModal(true); setEditingMelting(null); }}
              className="btn-gold"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 16, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              <Plus size={18} /> Nouveau Fusion
            </button>
          </div>

          {/* Meltings list */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {meltings.map(m => (
              <div key={m.id} className="lux-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--silver-100)', margin: 0 }}>
                      Fusion — {new Date(m.date).toLocaleDateString()}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--silver-300)', margin: '4px 0' }}>
                      Articles: {m.purchaseIds.length} &bull; Perte: <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{m.loss.toFixed(2)} g</span>
                    </p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', margin: '6px 0 2px' }}>
                      Avant: {m.totalPreWeight.toFixed(2)} g &bull; Après: {m.postWeight.toFixed(2)} g
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--silver-400)', margin: '2px 0' }}>
                      Prix total: {m.totalPrice.toLocaleString()} DZD &bull; Prix/g après: {m.pricePerGramAfter.toFixed(2)} DZD
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--silver-300)', margin: '2px 0' }}>
                      Dépôt: {metalTypes.find(s => s.id === m.targetMetalTypeId)?.name}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginLeft: 12 }}>
                    <button
                      onClick={() => {
                        setEditingMelting(m);
                        setSelectedIds(m.purchaseIds);
                        setPostWeight(String(m.postWeight));
                        setTargetMetalTypeId(m.targetMetalTypeId);
                        setShowMeltingModal(true);
                      }}
                      className="btn-icon"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => { if (confirm('Supprimer cette fusion ?')) deleteMeltingRecord(m.id); }}
                      style={can('cassiePurchases.melt.delete') ? undefined : { display: 'none' }}
                      className="btn-icon danger"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {meltings.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: 'var(--silver-400)', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Aucune fusion enregistrée
              </div>
            )}
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      <AnimatePresence>
        {showPurchaseModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeShowPurchaseModal}
          >
            <motion.div
              className="modal-box"
              style={{ maxWidth: 680 }}
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <div>
                  <div className="silver-line" style={{ marginBottom: 6 }} />
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.03em', margin: 0 }}>
                    {editing ? 'Modifier Achat' : 'Nouvel Achat Cassie'}
                  </h2>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>
                    Enregistrer un achat cassie
                  </p>
                </div>
                <button onClick={closeShowPurchaseModal} className="btn-icon"><X size={18} /></button>
              </div>

              <form onSubmit={handleSave}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                    <div>
                      <label className="lux-label">Nom Client</label>
                      <input value={clientName} onChange={e => setClientName(e.target.value)} className="lux-input" placeholder="Nom du client" />
                    </div>
                    <div>
                      <label className="lux-label">Téléphone</label>
                      <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="lux-input" placeholder="05XXXXXXXX" />
                    </div>
                    <div>
                      <label className="lux-label">Type Cassie</label>
                      <select value={metalTypeId} onChange={e => setMetalTypeId(e.target.value)} className="lux-select">
                        <option value="">-- Choisir --</option>
                        {cassieTypes.map(st => <option key={st.id} value={st.id}>{categoryLabel(st.id)} · {st.name} • {st.calibre}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
                    <div>
                      <label className="lux-label">Poids (g)</label>
                      <input value={weight} onChange={e => setWeight(e.target.value)} type="number" step="0.01" className="lux-input" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="lux-label">Prix Total (DZD)</label>
                      <input value={totalPrice} onChange={e => setTotalPrice(e.target.value)} type="number" step="0.01" className="lux-input" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="lux-label">Prix/g Calculé</label>
                      <div style={{
                        padding: '12px 16px', borderRadius: 12, background: 'rgba(201,168,76,0.08)',
                        border: '1px solid rgba(201,168,76,0.2)', fontSize: 18, fontWeight: 800, color: 'var(--gold)'
                      }}>
                        {pricePerGram ? pricePerGram.toFixed(2) : '0.00'} DZD
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" onClick={closeShowPurchaseModal} className="btn-outline" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    Annuler
                  </button>
                  <button type="submit" className="btn-gold" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    {editing ? 'Enregistrer' : 'Enregistrer Achat'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Melting Modal */}
      <AnimatePresence>
        {showMeltingModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeShowMeltingModal}
          >
            <motion.div
              className="modal-box"
              style={{ maxWidth: 780, maxHeight: '90vh', overflowY: 'auto' }}
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <div>
                  <div className="silver-line" style={{ marginBottom: 6 }} />
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.03em', margin: 0 }}>
                    {editingMelting ? 'Modifier Fusion' : 'Créer Fusion'}
                  </h2>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>
                    Sélectionner et fusionner des achats
                  </p>
                </div>
                <button onClick={closeShowMeltingModal} className="btn-icon"><X size={18} /></button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
                  {/* Purchase selection */}
                  <div>
                    <label className="lux-label" style={{ marginBottom: 10, display: 'block' }}>Sélectionnez Achats (non fondus)</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
                      {cassiePurchases.filter(p => !p.isMelted || (editingMelting && selectedIds.includes(p.id))).map(p => (
                        <label
                          key={p.id}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: 12, borderRadius: 10, cursor: 'pointer',
                            background: selectedIds.includes(p.id) ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${selectedIds.includes(p.id) ? 'rgba(201,168,76,0.3)' : 'var(--border)'}`,
                            transition: 'all 0.2s'
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 700, color: 'var(--silver-100)', fontSize: 13 }}>
                              {p.clientName} &bull; {metalTypes.find(st => st.id === p.metalTypeId)?.name} &bull; {p.weight} g
                            </span>
                            <p style={{ fontSize: 11, color: 'var(--silver-400)', margin: '2px 0 0' }}>{new Date(p.date).toLocaleDateString()}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(p.id)}
                            onChange={() => toggleSelect(p.id)}
                            style={{ accentColor: 'var(--gold)', width: 18, height: 18 }}
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="lux-card" style={{ padding: 16 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-400)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Poids total avant</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--silver-100)', margin: '4px 0 0' }}>
                        {selectedIds.reduce((s, id) => s + (cassiePurchases.find(p => p.id === id)?.weight || 0), 0).toFixed(2)} g
                      </p>
                    </div>
                    <div className="lux-card" style={{ padding: 16 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-400)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Prix total avant</p>
                      <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--gold)', margin: '4px 0 0' }}>
                        {selectedIds.reduce((s, id) => s + (cassiePurchases.find(p => p.id === id)?.totalPrice || 0), 0).toLocaleString()} DZD
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fusion params */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                  <div>
                    <label className="lux-label">Poids après fusion (g)</label>
                    <input value={postWeight} onChange={e => setPostWeight(e.target.value)} type="number" step="0.01" className="lux-input" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="lux-label">Dépôt (type cassie)</label>
                    <select value={targetMetalTypeId} onChange={e => setTargetMetalTypeId(e.target.value)} className="lux-select">
                      <option value="">-- Choisir --</option>
                      {cassieTypes.map(st => <option key={st.id} value={st.id}>{categoryLabel(st.id)} · {st.name} • {st.calibre} • stock: {st.initialQuantity}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div className="lux-card" style={{ padding: 12 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-400)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Perte (g)</p>
                        <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--danger)', margin: '2px 0 0' }}>
                          {(selectedIds.reduce((s, id) => s + (cassiePurchases.find(p => p.id === id)?.weight || 0), 0) - (parseFloat(postWeight) || 0)).toFixed(2)} g
                        </p>
                      </div>
                      <div className="lux-card" style={{ padding: 12 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-400)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Prix/g après</p>
                        <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--gold)', margin: '2px 0 0' }}>
                          {((parseFloat(postWeight) || 0) > 0 ? (selectedIds.reduce((s, id) => s + (cassiePurchases.find(p => p.id === id)?.totalPrice || 0), 0) / (parseFloat(postWeight) || 0)) : 0).toFixed(2)} DZD
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button onClick={closeShowMeltingModal} className="btn-outline" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  Annuler
                </button>
                <button onClick={handleMelt} className="btn-gold" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  Confirmer Fusion
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CassiePurchases;
