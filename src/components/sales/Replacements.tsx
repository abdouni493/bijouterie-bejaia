import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { translations } from '../../i18n/translations';
import { Trash2, Edit2, Printer, Eye, Plus, X, DollarSign, ArrowLeftRight } from 'lucide-react';

const Replacements: React.FC = () => {
  const { replacements, addReplacement, updateReplacement, deleteReplacement, metalTypes, shapes, deliveries, language, addPaymentAction, categoryLabel, can } = useApp();
  const t = translations[language];
  const shouldReduce = useReducedMotion();

  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [showBuybackModal, setShowBuybackModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'exchange' | 'buyback'>('exchange');
  const [selectedDetailsId, setSelectedDetailsId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form state
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string>('');
  const [deliveryPrice, setDeliveryPrice] = useState<string>('');

  // Exchange path
  const [returnedMetalTypeId, setReturnedMetalTypeId] = useState<string>(metalTypes[0]?.id || '');
  const [returnedShape, setReturnedShape] = useState<string | undefined>(shapes[0]);
  const [returnedWeight, setReturnedWeight] = useState<number>(0);
  const [returnedPricePerGram, setReturnedPricePerGram] = useState<number>(0);
  const [returnedTotalInput, setReturnedTotalInput] = useState<number>(0);

  const [newMetalTypeId, setNewMetalTypeId] = useState<string>(metalTypes[0]?.id || '');
  const [newShape, setNewShape] = useState<string | undefined>(shapes[0]);
  const [newWeight, setNewWeight] = useState<number>(0);
  const [newPricePerGram, setNewPricePerGram] = useState<number>(0);
  const [newTotalInput, setNewTotalInput] = useState<number>(0);

  // Buy-back path
  const [buybackMetalTypeId, setBuybackMetalTypeId] = useState<string>(metalTypes[0]?.id || '');
  const [buybackShape, setBuybackShape] = useState<string | undefined>(shapes[0]);
  const [buybackWeight, setBuybackWeight] = useState<number>(0);
  const [buybackPricePerGram, setBuybackPricePerGram] = useState<number>(0);
  const [buybackTotalInput, setBuybackTotalInput] = useState<number>(0);
  const [amountPaidToClient, setAmountPaidToClient] = useState<number>(0);

  useEffect(() => {
    if (metalTypes.length && !returnedMetalTypeId) setReturnedMetalTypeId(metalTypes[0].id);
    if (metalTypes.length && !newMetalTypeId) setNewMetalTypeId(metalTypes[0].id);
    if (metalTypes.length && !buybackMetalTypeId) setBuybackMetalTypeId(metalTypes[0].id);
  }, [metalTypes]);

  // Sync totals <-> pricePerGram for returned item
  useEffect(() => {
    if (returnedTotalInput && returnedWeight > 0) {
      setReturnedPricePerGram(Number((returnedTotalInput / returnedWeight).toFixed(4)));
    }
  }, [returnedTotalInput, returnedWeight]);
  useEffect(() => {
    if (returnedWeight > 0 && returnedPricePerGram > 0) {
      setReturnedTotalInput(Number((returnedWeight * returnedPricePerGram).toFixed(2)));
    }
  }, [returnedPricePerGram, returnedWeight]);

  // Sync totals <-> pricePerGram for new item
  useEffect(() => {
    if (newTotalInput && newWeight > 0) {
      setNewPricePerGram(Number((newTotalInput / newWeight).toFixed(4)));
    }
  }, [newTotalInput, newWeight]);
  useEffect(() => {
    if (newWeight > 0 && newPricePerGram > 0) {
      setNewTotalInput(Number((newWeight * newPricePerGram).toFixed(2)));
    }
  }, [newPricePerGram, newWeight]);

  // Sync totals <-> pricePerGram for buyback
  useEffect(() => {
    if (buybackTotalInput && buybackWeight > 0) {
      setBuybackPricePerGram(Number((buybackTotalInput / buybackWeight).toFixed(4)));
    }
  }, [buybackTotalInput, buybackWeight]);
  useEffect(() => {
    if (buybackWeight > 0 && buybackPricePerGram > 0) {
      setBuybackTotalInput(Number((buybackWeight * buybackPricePerGram).toFixed(2)));
    }
  }, [buybackPricePerGram, buybackWeight]);

  const returnedTotal = useMemo(() => (returnedWeight || 0) * (returnedPricePerGram || 0), [returnedWeight, returnedPricePerGram]);
  const newTotal = useMemo(() => (newWeight || 0) * (newPricePerGram || 0), [newWeight, newPricePerGram]);
  const diff = useMemo(() => newTotal - returnedTotal, [newTotal, returnedTotal]);
  const buybackTotal = useMemo(() => (buybackWeight || 0) * (buybackPricePerGram || 0), [buybackWeight, buybackPricePerGram]);

  const getShapeLabel = (shapeName?: string) => {
    if (!shapeName) return '';
    const pluralKey = (shapeName + 's') as keyof typeof t;
    const singularKey = shapeName as keyof typeof t;
    return (t[pluralKey] as string) || (t[singularKey] as string) || shapeName;
  };

  const closeExchangeModal = () => {
    handleResetForm(); setShowExchangeModal(false);
  };
  const closeBuybackModal = () => {
    handleResetForm(); setShowBuybackModal(false);
  };
  const closeSelectedDetailsId = () => {
    setSelectedDetailsId(null);
  };
  const closeDeleteTargetId = () => {
    setDeleteTargetId(null);
  };

  const handleResetForm = () => {
    setEditingId(null);
    setClientName('');
    setClientPhone('');
    setSelectedDeliveryId('');
    setDeliveryPrice('');
    setReturnedWeight(0);
    setReturnedPricePerGram(0);
    setReturnedTotalInput(0);
    setNewWeight(0);
    setNewPricePerGram(0);
    setNewTotalInput(0);
    setBuybackWeight(0);
    setBuybackPricePerGram(0);
    setBuybackTotalInput(0);
    setAmountPaidToClient(0);
  };

  const handleSubmitExchange = () => {
    const payload = {
      type: 'exchange' as const,
      clientName,
      clientPhone,
      returnedItem: { metalTypeId: returnedMetalTypeId, shape: returnedShape, weight: Number(returnedWeight), pricePerGram: Number(returnedPricePerGram) },
      newItem: { metalTypeId: newMetalTypeId, shape: newShape, weight: Number(newWeight), pricePerGram: Number(newPricePerGram) },
      deliveryId: selectedDeliveryId || undefined,
      deliveryPrice: selectedDeliveryId ? parseFloat(deliveryPrice) || 0 : undefined,
    };
    if (editingId) updateReplacement(editingId, payload as any);
    else addReplacement(payload as any);

    // Add payment record to delivery if assigned and price is set
    const amount = selectedDeliveryId && deliveryPrice ? parseFloat(deliveryPrice) : null;
    if (amount && !isNaN(amount) && amount > 0) {
      addPaymentAction(selectedDeliveryId, {
        amount: amount,
        date: new Date().toISOString(),
        method: 'cash',
      });
    }

    closeExchangeModal();
  };

  const handleSubmitBuyback = () => {
    const payload = {
      type: 'buyback' as const,
      clientName,
      clientPhone,
      returnedItem: { metalTypeId: buybackMetalTypeId, shape: buybackShape, weight: Number(buybackWeight), pricePerGram: Number(buybackPricePerGram) },
      buyBackPricePerGram: Number(buybackPricePerGram),
      deliveryId: selectedDeliveryId || undefined,
      deliveryPrice: selectedDeliveryId ? parseFloat(deliveryPrice) || 0 : undefined,
    };
    if (editingId) updateReplacement(editingId, payload as any);
    else addReplacement(payload as any);

    // Add payment record to delivery if assigned and price is set
    const amount = selectedDeliveryId && deliveryPrice ? parseFloat(deliveryPrice) : null;
    if (amount && !isNaN(amount) && amount > 0) {
      addPaymentAction(selectedDeliveryId, {
        amount: amount,
        date: new Date().toISOString(),
        method: 'cash',
      });
    }

    closeBuybackModal();
  };

  const startEdit = (id: string) => {
    const r = replacements.find(x => x.id === id);
    if (!r) return;
    setEditingId(id);
    setEditMode(r.type);
    setClientName(r.clientName || '');
    setClientPhone(r.clientPhone || '');
    setSelectedDeliveryId(r.deliveryId || '');
    setDeliveryPrice(r.deliveryPrice?.toString() || '');

    if (r.type === 'exchange' && r.newItem) {
      setReturnedMetalTypeId(r.returnedItem.metalTypeId);
      setReturnedShape(r.returnedItem.shape);
      setReturnedWeight(r.returnedItem.weight || 0);
      setReturnedPricePerGram(r.returnedItem.pricePerGram || 0);
      setReturnedTotalInput((r.returnedItem.weight || 0) * (r.returnedItem.pricePerGram || 0));
      setNewMetalTypeId(r.newItem.metalTypeId);
      setNewShape(r.newItem.shape);
      setNewWeight(r.newItem.weight || 0);
      setNewPricePerGram(r.newItem.pricePerGram || 0);
      setNewTotalInput((r.newItem.weight || 0) * (r.newItem.pricePerGram || 0));
      setShowExchangeModal(true);
    } else if (r.type === 'buyback') {
      setBuybackMetalTypeId(r.returnedItem.metalTypeId);
      setBuybackShape(r.returnedItem.shape);
      setBuybackWeight(r.returnedItem.weight || 0);
      setBuybackPricePerGram(r.returnedItem.pricePerGram || 0);
      setBuybackTotalInput((r.returnedItem.weight || 0) * (r.returnedItem.pricePerGram || 0));
      setShowBuybackModal(true);
    }
  };

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
          <h1 className="section-title">{t.replacements}</h1>
          <p className="section-subtitle">Gestion des échanges et rachats</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => { handleResetForm(); setShowExchangeModal(true); }}
            className="btn-gold"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 16, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            <Plus size={18} /> {t.exchange}
          </button>
          <button
            onClick={() => { handleResetForm(); setShowBuybackModal(true); }}
            className="btn-silver"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 16, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            <Plus size={18} /> {t.buyBack}
          </button>
        </div>
      </div>

      {/* Replacements Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {replacements.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: 'var(--silver-400)', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Aucun remplacement enregistré
          </div>
        ) : (
          replacements.slice().reverse().map((r) => (
            <div key={r.id} className="lux-card" style={{ overflow: 'hidden' }}>
              {/* Card Header */}
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                background: r.type === 'exchange' ? 'rgba(201,168,76,0.05)' : 'rgba(20,184,166,0.05)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800,
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      background: r.type === 'exchange' ? 'rgba(201,168,76,0.2)' : 'rgba(20,184,166,0.2)',
                      color: r.type === 'exchange' ? 'var(--gold)' : 'var(--teal)'
                    }}>
                      {r.type === 'exchange' ? t.exchange : t.buyBack}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--silver-400)' }}>{new Date(r.date).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setSelectedDetailsId(r.id)} className="btn-icon" title={t.details}><Eye size={14} /></button>
                    <button onClick={() => { /* TODO: Print invoice */ }} className="btn-icon" title={t.print}><Printer size={14} /></button>
                    <button onClick={() => startEdit(r.id)} className="btn-icon" title={t.edit}><Edit2 size={14} /></button>
                    <button onClick={() => setDeleteTargetId(r.id)} style={can('replacements.delete') ? undefined : { display: 'none' }} className="btn-icon danger" title={t.delete}><Trash2 size={14} /></button>
                  </div>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--silver-100)', margin: 0 }}>{r.clientName || ''}</h3>
              </div>

              {/* Card Body */}
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Returned Item */}
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-400)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>{t.returnedItem}</p>
                  <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--silver-100)', margin: 0 }}>
                      {metalTypes.find(s => s.id === r.returnedItem.metalTypeId)?.name || 'N/A'}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--silver-300)', margin: '2px 0 0' }}>
                      {getShapeLabel(r.returnedItem.shape)}
                      {r.returnedItem.weight && r.returnedItem.weight > 0 ? <> &bull; {r.returnedItem.weight}g</> : null}
                      {r.returnedItem.pricePerGram && r.returnedItem.pricePerGram > 0 ? <> @ {r.returnedItem.pricePerGram} DZD/g</> : null}
                    </p>
                  </div>
                </div>

                {/* New Item for Exchange */}
                {r.type === 'exchange' && r.newItem && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-400)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>{t.newItem}</p>
                    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--silver-100)', margin: 0 }}>
                        {metalTypes.find(s => s.id === r.newItem?.metalTypeId)?.name || 'N/A'}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--silver-300)', margin: '2px 0 0' }}>
                        {getShapeLabel(r.newItem?.shape)}
                        {r.newItem?.weight && r.newItem?.weight > 0 ? <> &bull; {r.newItem?.weight}g</> : null}
                        {r.newItem?.pricePerGram && r.newItem?.pricePerGram > 0 ? <> @ {r.newItem?.pricePerGram} DZD/g</> : null}
                      </p>
                    </div>
                  </div>
                )}

                {/* Amount Footer */}
                {(r.amountToPay && r.amountToPay > 0 || r.amountToRefund && r.amountToRefund > 0) && (
                  <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    {r.amountToPay && r.amountToPay > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: 'var(--silver-300)', fontWeight: 600 }}>{t.amountToPay}</span>
                        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--gold)' }}>{r.amountToPay.toLocaleString()} DZD</span>
                      </div>
                    )}
                    {r.amountToRefund && r.amountToRefund > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: 'var(--silver-300)', fontWeight: 600 }}>{t.amountToRefund}</span>
                        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--teal)' }}>{r.amountToRefund.toLocaleString()} DZD</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Exchange Modal */}
      <AnimatePresence>
        {showExchangeModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeExchangeModal}
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
                    {editingId && editMode === 'exchange' ? t.edit : t.exchange}
                  </h2>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>
                    {editingId ? 'Modifier' : 'Créer'} un échange produit
                  </p>
                </div>
                <button onClick={closeExchangeModal} className="btn-icon"><X size={18} /></button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Client Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="lux-label">{t.clientName}</label>
                    <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} className="lux-input" placeholder={t.clientName} />
                  </div>
                  <div>
                    <label className="lux-label">{t.clientPhone}</label>
                    <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="lux-input" placeholder={t.clientPhone} />
                  </div>
                </div>

                {/* Delivery Section */}
                <div style={{ padding: 16, borderRadius: 12, background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.15)' }}>
                  <label className="lux-label" style={{ marginBottom: 10, display: 'block' }}>Livraison</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <select value={selectedDeliveryId} onChange={e => setSelectedDeliveryId(e.target.value)} className="lux-select">
                        <option value="">Aucune</option>
                        {deliveries.map(d => (
                          <option key={d.id} value={d.id}>{d.fullName} - {d.phone}</option>
                        ))}
                      </select>
                    </div>
                    {selectedDeliveryId && (
                      <div>
                        <label className="lux-label">Prix de livraison</label>
                        <input type="number" value={deliveryPrice} onChange={e => setDeliveryPrice(e.target.value)} className="lux-input" step="0.1" placeholder="0.00" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Returned Item */}
                <div style={{ padding: 20, borderRadius: 14, background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--gold)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 3, height: 18, borderRadius: 2, background: 'var(--gold)' }} />
                    {t.returnedItem}
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label className="lux-label">{t.metalType}</label>
                        <select value={returnedMetalTypeId} onChange={e => setReturnedMetalTypeId(e.target.value)} className="lux-select">
                          <option value="">Select</option>
                          {metalTypes.map(st => <option key={st.id} value={st.id}>{categoryLabel(st.id)} · {st.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="lux-label">{t.total}</label>
                        <input type="number" value={returnedTotalInput} onChange={e => setReturnedTotalInput(Number(e.target.value))} className="lux-input" step="0.1" placeholder="0.00" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label className="lux-label">{t.shape}</label>
                        <select value={returnedShape} onChange={e => setReturnedShape(e.target.value)} className="lux-select">
                          <option value="">Select</option>
                          {shapes.map(s => <option key={s} value={s}>{getShapeLabel(s)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="lux-label">{t.pricePerGram}</label>
                        <input type="number" value={returnedPricePerGram} onChange={e => setReturnedPricePerGram(Number(e.target.value))} className="lux-input" step="0.1" placeholder="0.00" />
                      </div>
                    </div>
                    <div>
                      <label className="lux-label">{t.weight} (g)</label>
                      <input type="number" value={returnedWeight} onChange={e => setReturnedWeight(Number(e.target.value))} className="lux-input" step="0.1" placeholder="0.00" />
                    </div>
                  </div>
                  <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--silver-200)' }}>
                      {t.total}: <span style={{ color: 'var(--gold)', fontSize: 16, fontWeight: 800 }}>{returnedTotal.toLocaleString()} DZD</span>
                    </span>
                  </div>
                </div>

                {/* New Item */}
                <div style={{ padding: 20, borderRadius: 14, background: 'rgba(20,184,166,0.05)', border: '1px solid rgba(20,184,166,0.15)' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--teal)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 3, height: 18, borderRadius: 2, background: 'var(--teal)' }} />
                    {t.newItem}
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label className="lux-label">{t.metalType}</label>
                        <select value={newMetalTypeId} onChange={e => setNewMetalTypeId(e.target.value)} className="lux-select">
                          <option value="">Select</option>
                          {metalTypes.map(st => <option key={st.id} value={st.id}>{categoryLabel(st.id)} · {st.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="lux-label">{t.total}</label>
                        <input type="number" value={newTotalInput} onChange={e => setNewTotalInput(Number(e.target.value))} className="lux-input" step="0.1" placeholder="0.00" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label className="lux-label">{t.shape}</label>
                        <select value={newShape} onChange={e => setNewShape(e.target.value)} className="lux-select">
                          <option value="">Select</option>
                          {shapes.map(s => <option key={s} value={s}>{getShapeLabel(s)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="lux-label">{t.pricePerGram}</label>
                        <input type="number" value={newPricePerGram} onChange={e => setNewPricePerGram(Number(e.target.value))} className="lux-input" step="0.1" placeholder="0.00" />
                      </div>
                    </div>
                    <div>
                      <label className="lux-label">{t.weight} (g)</label>
                      <input type="number" value={newWeight} onChange={e => setNewWeight(Number(e.target.value))} className="lux-input" step="0.1" placeholder="0.00" />
                    </div>
                  </div>
                  <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)', display: 'flex', gap: 20 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--silver-200)' }}>
                      {t.total}: <span style={{ color: 'var(--teal)', fontSize: 16, fontWeight: 800 }}>{(newTotalInput || newTotal).toLocaleString()} DZD</span>
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--silver-200)' }}>
                      {t.difference}: <span style={{ fontSize: 16, fontWeight: 800, color: diff > 0 ? 'var(--gold)' : 'var(--teal)' }}>
                        {diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()} DZD
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button onClick={closeExchangeModal} className="btn-outline" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  {t.cancel}
                </button>
                <button onClick={handleSubmitExchange} className="btn-gold" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  {editingId && editMode === 'exchange' ? t.save : t.createInvoice}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTargetId && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDeleteTargetId}
          >
            <motion.div
              className="modal-box"
              style={{ maxWidth: 400 }}
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <div>
                  <div className="silver-line" style={{ marginBottom: 6 }} />
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--danger)', margin: 0 }}>{t.delete} ?</h2>
                </div>
                <button onClick={closeDeleteTargetId} className="btn-icon"><X size={18} /></button>
              </div>
              <div className="modal-body">
                <p style={{ color: 'var(--silver-300)', fontSize: 14 }}>Voulez-vous vraiment supprimer cet enregistrement ? Cette action est irréversible.</p>
              </div>
              <div className="modal-footer">
                <button onClick={closeDeleteTargetId} className="btn-outline" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  {t.cancel || 'Annuler'}
                </button>
                <button
                  onClick={() => { deleteReplacement(deleteTargetId); closeDeleteTargetId(); }}
                  style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'var(--danger)', color: '#fff' }}
                >
                  {t.delete || 'Supprimer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buy-Back Modal */}
      <AnimatePresence>
        {showBuybackModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeBuybackModal}
          >
            <motion.div
              className="modal-box"
              style={{ maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}
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
                    {editingId && editMode === 'buyback' ? t.edit : t.buyBack}
                  </h2>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>
                    {editingId ? 'Modifier' : 'Créer'} un rachat (Cash)
                  </p>
                </div>
                <button onClick={closeBuybackModal} className="btn-icon"><X size={18} /></button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Client Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="lux-label">{t.clientName}</label>
                    <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} className="lux-input" placeholder={t.clientName} />
                  </div>
                  <div>
                    <label className="lux-label">{t.clientPhone}</label>
                    <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="lux-input" placeholder={t.clientPhone} />
                  </div>
                </div>

                {/* Delivery Section */}
                <div style={{ padding: 16, borderRadius: 12, background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)' }}>
                  <label className="lux-label" style={{ marginBottom: 10, display: 'block' }}>Livraison</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <select value={selectedDeliveryId} onChange={e => setSelectedDeliveryId(e.target.value)} className="lux-select">
                        <option value="">Aucune</option>
                        {deliveries.map(d => (
                          <option key={d.id} value={d.id}>{d.fullName} - {d.phone}</option>
                        ))}
                      </select>
                    </div>
                    {selectedDeliveryId && (
                      <div>
                        <label className="lux-label">Prix de livraison</label>
                        <input type="number" value={deliveryPrice} onChange={e => setDeliveryPrice(e.target.value)} className="lux-input" step="0.1" placeholder="0.00" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Item to Buy Back */}
                <div style={{ padding: 20, borderRadius: 14, background: 'rgba(20,184,166,0.05)', border: '1px solid rgba(20,184,166,0.15)' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--teal)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 3, height: 18, borderRadius: 2, background: 'var(--teal)' }} />
                    {t.buyBack}
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label className="lux-label">{t.metalType}</label>
                        <select value={buybackMetalTypeId} onChange={e => setBuybackMetalTypeId(e.target.value)} className="lux-select">
                          <option value="">Select</option>
                          {metalTypes.map(st => <option key={st.id} value={st.id}>{categoryLabel(st.id)} · {st.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="lux-label">{t.total}</label>
                        <input type="number" value={buybackTotalInput} onChange={e => setBuybackTotalInput(Number(e.target.value))} className="lux-input" step="0.1" placeholder="0.00" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label className="lux-label">{t.shape}</label>
                        <select value={buybackShape} onChange={e => setBuybackShape(e.target.value)} className="lux-select">
                          <option value="">Select</option>
                          {shapes.map(s => <option key={s} value={s}>{getShapeLabel(s)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="lux-label">{t.pricePerGram}</label>
                        <input type="number" value={buybackPricePerGram} onChange={e => setBuybackPricePerGram(Number(e.target.value))} className="lux-input" step="0.1" placeholder="0.00" />
                      </div>
                    </div>
                    <div>
                      <label className="lux-label">{t.weight} (g)</label>
                      <input type="number" value={buybackWeight} onChange={e => setBuybackWeight(Number(e.target.value))} className="lux-input" step="0.1" placeholder="0.00" />
                    </div>
                  </div>
                  <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--silver-200)' }}>
                      {t.amountToRefund}: <span style={{ color: 'var(--teal)', fontSize: 16, fontWeight: 800 }}>{(buybackTotalInput || buybackTotal).toLocaleString()} DZD</span>
                    </span>
                  </div>
                </div>

                {/* Amount Paid to Client */}
                <div style={{ padding: 20, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--silver-200)', margin: '0 0 12px' }}>Montant Payé au Client</h4>
                  <input
                    type="number"
                    value={amountPaidToClient}
                    onChange={e => setAmountPaidToClient(Number(e.target.value))}
                    className="lux-input"
                    step="100"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button onClick={closeBuybackModal} className="btn-outline" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  {t.cancel}
                </button>
                <button onClick={handleSubmitBuyback} className="btn-gold" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  {editingId && editMode === 'buyback' ? t.save : t.createInvoice}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedDetailsId && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSelectedDetailsId}
          >
            <motion.div
              className="modal-box"
              style={{ maxWidth: 500 }}
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
            >
              {(() => {
                const inv = replacements.find(r => r.id === selectedDetailsId);
                if (!inv) return null;
                return (
                  <>
                    <div className="modal-header">
                      <div>
                        <div className="silver-line" style={{ marginBottom: 6 }} />
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--silver-100)', margin: 0 }}>{t.details}</h2>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '4px 0 0' }}>
                          {inv.type === 'exchange' ? t.exchange : t.buyBack}
                        </p>
                      </div>
                      <button onClick={closeSelectedDetailsId} className="btn-icon"><X size={18} /></button>
                    </div>

                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="lux-card" style={{ padding: 14 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-400)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{t.clientName}</p>
                          <p style={{ fontWeight: 800, color: 'var(--silver-100)', fontSize: 15, margin: '4px 0 0' }}>{inv.clientName || ''}</p>
                        </div>
                        <div className="lux-card" style={{ padding: 14 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-400)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{t.clientPhone}</p>
                          <p style={{ fontWeight: 700, color: 'var(--silver-100)', margin: '4px 0 0' }}>{inv.clientPhone || '—'}</p>
                        </div>
                      </div>

                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-400)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>{t.returnedItem}</p>
                        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.15)' }}>
                          <p style={{ fontWeight: 700, color: 'var(--silver-100)', margin: 0 }}>
                            {metalTypes.find(s => s.id === inv.returnedItem.metalTypeId)?.name} - {getShapeLabel(inv.returnedItem.shape)}
                          </p>
                          {(inv.returnedItem.weight * inv.returnedItem.pricePerGram) > 0 && (
                            <p style={{ fontSize: 13, color: 'var(--silver-300)', margin: '4px 0 0' }}>
                              {inv.returnedItem.weight}g @ {inv.returnedItem.pricePerGram} DZD/g = {(inv.returnedItem.weight * inv.returnedItem.pricePerGram).toLocaleString()} DZD
                            </p>
                          )}
                        </div>
                      </div>

                      {inv.type === 'exchange' && inv.newItem && (
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-400)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>{t.newItem}</p>
                          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(20,184,166,0.07)', border: '1px solid rgba(20,184,166,0.15)' }}>
                            <p style={{ fontWeight: 700, color: 'var(--silver-100)', margin: 0 }}>
                              {metalTypes.find(s => s.id === inv.newItem?.metalTypeId)?.name} - {getShapeLabel(inv.newItem?.shape)}
                            </p>
                              {(inv.newItem?.weight || 0) * (inv.newItem?.pricePerGram || 0) > 0 && (
                                <p style={{ fontSize: 13, color: 'var(--silver-300)', margin: '4px 0 0' }}>
                                  {inv.newItem?.weight}g @ {inv.newItem?.pricePerGram} DZD/g = {(inv.newItem?.weight * inv.newItem?.pricePerGram).toLocaleString()} DZD
                                </p>
                              )}
                          </div>
                        </div>
                      )}

                      {(inv.amountToPay && inv.amountToPay > 0 || inv.amountToRefund && inv.amountToRefund > 0) && (
                        <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {inv.amountToPay && inv.amountToPay > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 700, color: 'var(--silver-200)', fontSize: 14 }}>{t.amountToPay}</span>
                              <span style={{ fontWeight: 800, color: 'var(--gold)', fontSize: 16 }}>{inv.amountToPay.toLocaleString()} DZD</span>
                            </div>
                          )}
                          {inv.amountToRefund && inv.amountToRefund > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 700, color: 'var(--silver-200)', fontSize: 14 }}>{t.amountToRefund}</span>
                              <span style={{ fontWeight: 800, color: 'var(--teal)', fontSize: 16 }}>{inv.amountToRefund.toLocaleString()} DZD</span>
                            </div>
                          )}
                        </div>
                      )}

                      {inv.deliveryId && (
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-400)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Livraison</p>
                          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(20,184,166,0.07)', border: '1px solid rgba(20,184,166,0.15)' }}>
                            <p style={{ fontWeight: 700, color: 'var(--silver-100)', margin: 0 }}>
                              {deliveries.find(d => d.id === inv.deliveryId)?.fullName || 'Non trouvée'}
                            </p>
                            <p style={{ fontSize: 13, color: 'var(--silver-300)', margin: '2px 0 0' }}>
                              {deliveries.find(d => d.id === inv.deliveryId)?.phone}
                            </p>
                            {inv.deliveryPrice && (
                              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--teal)', margin: '4px 0 0' }}>
                                Prix: {inv.deliveryPrice.toLocaleString()} DZD
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="modal-footer">
                      <button onClick={closeSelectedDetailsId} className="btn-outline" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
                        Fermer
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Replacements;
