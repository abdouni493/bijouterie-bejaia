
import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Plus, FileText, ShoppingCart, Calculator, Trash2, Edit2, Eye, X, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { translations } from '../../i18n/translations';
import { JewelryShape, PurchaseInvoice } from '../../types';

const Purchases: React.FC = () => {
  const { suppliers, metalTypes, purchases, addPurchase, deletePurchase, updatePurchase, updateMetalType, addDebtPayment, language, shapes, categoryLabel, can } = useApp();
  const t = translations[language];
  const shouldReduce = useReducedMotion();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<PurchaseInvoice | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);
  const [showOnlyDebts, setShowOnlyDebts] = useState(false);
  const [selectedDebtSupplier, setSelectedDebtSupplier] = useState<string>('');

  // Debt payment modal states
  const [showDebtPaymentModal, setShowDebtPaymentModal] = useState(false);
  const [debtPaymentAmount, setDebtPaymentAmount] = useState('');
  const [debtPaymentType, setDebtPaymentType] = useState<'cash' | 'silver'>('cash');
  const [selectedMetalForPayment, setSelectedMetalForPayment] = useState('');
  const [silverPricePerGram, setSilverPricePerGram] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Form states
  const [supplierId, setSupplierId] = useState('');
  const [metalTypeId, setMetalTypeId] = useState('');
  const [shape, setShape] = useState<JewelryShape>('ring');
  const [weight, setWeight] = useState('');
  const [pricePerGram, setPricePerGram] = useState('');
  const [laborCostPerGram, setLaborCostPerGram] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [pricingMode, setPricingMode] = useState<'weight' | 'piece'>('weight');
  const [quantity, setQuantity] = useState('');
  const [pricePerPiece, setPricePerPiece] = useState('');

  // Payment states
  const [cashPay, setCashPay] = useState('');
  const [cassieSilverTypeId, setCassieSilverTypeId] = useState('');
  const [cassieSilverGrams, setCassieSilverGrams] = useState('');
  const [cassieSilverPrice, setCassieSilverPrice] = useState('');
  const [cassieGoldTypeId, setCassieGoldTypeId] = useState('');
  const [cassieGoldGrams, setCassieGoldGrams] = useState('');
  const [cassieGoldPrice, setCassieGoldPrice] = useState('');
  const [amountPaidManual, setAmountPaidManual] = useState('');
  const [showPayDebtBox, setShowPayDebtBox] = useState(false);
  const [payDebtAmount, setPayDebtAmount] = useState('');
  const [payProcessing, setPayProcessing] = useState(false);

  const cassieSilverStockType = metalTypes.find(st => st.id === cassieSilverTypeId);
  const cassieGoldType = metalTypes.find(st => st.id === cassieGoldTypeId);
  const cassieOptions = metalTypes.filter(st => st.isCassie);

  const selectedST = metalTypes.find(st => st.id === metalTypeId);
  const isAlaPiece = !!(selectedST as any)?.isAlaPiece;

  const laborNumber = laborCostPerGram.trim() === '' ? undefined : (parseFloat(laborCostPerGram) || 0);
  const labor = laborNumber ?? 0;

  // For À la Pièce, the effective pricing mode is always 'piece'
  const effectivePricingMode = isAlaPiece ? 'piece' : pricingMode;

  const totalPurchasePrice = effectivePricingMode === 'weight'
    ? ((parseFloat(weight) || 0) * ((parseFloat(pricePerGram) || 0) + labor))
    : ((parseFloat(quantity) || 0) * (parseFloat(pricePerPiece) || 0));

  const cassieSilverTotal = (parseFloat(cassieSilverGrams) || 0) * (parseFloat(cassieSilverPrice) || 0);
  const cassieGoldTotal = (parseFloat(cassieGoldGrams) || 0) * (parseFloat(cassieGoldPrice) || 0);
  const paymentTotal = (parseFloat(cashPay) || 0) + cassieSilverTotal + cassieGoldTotal;

  const handleOpenEdit = (p: PurchaseInvoice) => {
    setEditingInvoice(p);
    setSupplierId(p.supplierId);

    if (p.items.length > 0) {
      const item = p.items[0];
      setMetalTypeId(item.metalTypeId);
      setShape(item.shape || 'ring');
      setWeight(item.weight.toString());
      setPricePerGram(item.pricePerGram.toString());
      setLaborCostPerGram((item as any).laborCostPerGram !== undefined ? String((item as any).laborCostPerGram) : '');
      setPricingMode((item as any).pricingMode || 'weight');
      setQuantity((item as any).quantity?.toString() || '');
      setPricePerPiece((item as any).pricePerPiece?.toString() || '');
    }

    setCashPay(p.payment.cash.toString());
    setCassieSilverTypeId((p.payment as any).cassieSilverTypeId || '');
    setCassieSilverGrams(p.payment.cassieSilverGrams.toString());
    setCassieSilverPrice(p.payment.cassieSilverPricePerGram.toString());
    setCassieGoldTypeId((p.payment as any).cassieGoldTypeId || '');
    setCassieGoldGrams(p.payment.cassieGoldGrams.toString());
    setCassieGoldPrice(p.payment.cassieGoldPricePerGram.toString());
    setAmountPaidManual((p.amountPaid ?? p.payment.total).toString());
    setInvoiceDate(new Date(p.date).toISOString().split('T')[0]);
    setShowAddModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !metalTypeId) return;
    if (!isAlaPiece && effectivePricingMode === 'weight' && !weight) return;
    if ((isAlaPiece || effectivePricingMode === 'piece') && (!quantity || !pricePerPiece)) return;
    if (isAlaPiece && !shape) return;

    const invoiceTotal = totalPurchasePrice;
    const paidFromInputs = paymentTotal;
    const manualPaid = amountPaidManual ? parseFloat(amountPaidManual) : NaN;
    const amountPaid = !isNaN(manualPaid) ? manualPaid : paidFromInputs;
    const remaining = Math.max(0, invoiceTotal - amountPaid);
    const isDebt = remaining > 0;

    const paymentObj: any = {
      cash: parseFloat(cashPay) || 0,
      cassieSilverGrams: parseFloat(cassieSilverGrams) || 0,
      cassieSilverPricePerGram: parseFloat(cassieSilverPrice) || 0,
      cassieGoldGrams: parseFloat(cassieGoldGrams) || 0,
      cassieGoldPricePerGram: parseFloat(cassieGoldPrice) || 0,
      total: paidFromInputs
    };

    if (cassieSilverTypeId) paymentObj.cassieSilverTypeId = cassieSilverTypeId;
    if (cassieGoldTypeId) paymentObj.cassieGoldTypeId = cassieGoldTypeId;

    const purchaseData = {
      supplierId,
      date: invoiceDate ? new Date(invoiceDate).toISOString() : new Date().toISOString(),
      items: [{
        metalTypeId,
        shape: (isAlaPiece || !selectedST?.isCassie) ? shape : undefined,
        weight: effectivePricingMode === 'weight' ? parseFloat(weight) : 0,
        pricePerGram: effectivePricingMode === 'weight' ? parseFloat(pricePerGram) : 0,
        laborCostPerGram: effectivePricingMode === 'weight' ? (laborNumber !== undefined ? laborNumber : undefined) : undefined,
        totalPrice: totalPurchasePrice,
        pricingMode: effectivePricingMode,
        quantity: effectivePricingMode === 'piece' ? parseFloat(quantity) : undefined,
        pricePerPiece: effectivePricingMode === 'piece' ? parseFloat(pricePerPiece) : undefined,
        isAlaPiece: isAlaPiece || undefined,
      } as any],
      payment: paymentObj,
      amountPaid,
      remaining,
      isDebt
    };

    if (editingInvoice) {
      updatePurchase(editingInvoice.id, purchaseData);
    } else {
      addPurchase(purchaseData);
    }

    handleCloseModal();
  };

  const handleCloseModal = () => {
    setShowAddModal(false); setEditingInvoice(null); resetForm();
  };

  const closeSelectedInvoice = () => {
    setSelectedInvoice(null);
  };

  const closeShowPayDebtBox = () => {
    setShowPayDebtBox(false); setPayDebtAmount('');
  };

  const closeShowDebtPaymentModal = () => {
    setShowDebtPaymentModal(false); setDebtPaymentAmount(''); setDebtPaymentType('cash'); setSelectedMetalForPayment(''); setSilverPricePerGram('');
  };

  const resetForm = () => {
    setWeight(''); setPricePerGram(''); setCashPay('');
    setCassieSilverTypeId(''); setCassieSilverGrams(''); setCassieSilverPrice('');
    setCassieGoldTypeId(''); setCassieGoldGrams(''); setCassieGoldPrice('');
    setSupplierId(''); setMetalTypeId('');
    setAmountPaidManual(''); setShowPayDebtBox(false); setPayDebtAmount(''); setLaborCostPerGram(''); setInvoiceDate('');
    setPricingMode('weight'); setQuantity(''); setPricePerPiece('');
    setShape('ring');
  };

  // Calculate supplier debts
  const getSupplierDebts = () => {
    const debtsBySupplier: Record<string, number> = {};
    purchases.forEach(p => {
      const invoiceTotal = p.items.reduce((a, b) => a + (b.totalPrice || 0), 0);
      const paid = (p.amountPaid !== undefined && p.amountPaid !== null) ? p.amountPaid : (p.payment?.total || 0);
      const remaining = Math.max(0, invoiceTotal - paid);
      if (remaining > 0) {
        debtsBySupplier[p.supplierId] = (debtsBySupplier[p.supplierId] || 0) + remaining;
      }
    });
    return debtsBySupplier;
  };

  const supplierDebts = getSupplierDebts();
  const suppliersWithDebts = suppliers.filter(s => supplierDebts[s.id] && supplierDebts[s.id] > 0);
  const selectedSupplierDebtAmount = selectedDebtSupplier ? supplierDebts[selectedDebtSupplier] : 0;

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
          <h1 className="section-title">{t.purchases}</h1>
          <p className="section-subtitle">Gestion des approvisionnements</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Filter toggle */}
          <div style={{ display: 'flex', borderRadius: 16, background: 'var(--card-bg)', padding: 4, border: '1px solid var(--border)' }}>
            <button
              onClick={() => { setShowOnlyDebts(false); setSelectedDebtSupplier(''); }}
              style={{
                padding: '8px 18px', borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: 'pointer', border: 'none',
                background: !showOnlyDebts ? 'rgba(201,168,76,0.18)' : 'transparent',
                color: !showOnlyDebts ? 'var(--gold)' : 'var(--silver-300)',
                transition: 'all 0.2s'
              }}
            >
              Tous
            </button>
            <button
              onClick={() => setShowOnlyDebts(true)}
              style={{
                padding: '8px 18px', borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: 'pointer', border: 'none',
                background: showOnlyDebts ? 'rgba(220,38,38,0.15)' : 'transparent',
                color: showOnlyDebts ? 'var(--danger)' : 'var(--silver-300)',
                transition: 'all 0.2s'
              }}
            >
              Dettes
            </button>
          </div>
          {showOnlyDebts && suppliersWithDebts.length > 0 && (
            <select
              value={selectedDebtSupplier}
              onChange={(e) => setSelectedDebtSupplier(e.target.value)}
              className="lux-select"
              style={{ minWidth: 180 }}
            >
              <option value="">-- Tous les Dettes --</option>
              {suppliersWithDebts.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-gold"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 16, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            <Plus size={18} /> {t.newPurchase}
          </button>
        </div>
      </div>

      {/* Debt supplier card */}
      {showOnlyDebts && selectedDebtSupplier && (
        <div className="lux-card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(220,38,38,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShoppingCart size={24} style={{ color: 'var(--danger)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>Fournisseur</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--silver-100)', margin: '4px 0 12px' }}>{suppliers.find(s => s.id === selectedDebtSupplier)?.name}</p>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>Total Dette</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--danger)', margin: '4px 0 0' }}>{selectedSupplierDebtAmount.toLocaleString()} DZD</p>
            </div>
          </div>
          <button
            onClick={() => setShowDebtPaymentModal(true)}
            className="btn-gold"
            style={{ width: '100%', padding: '12px 0', borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase' }}
          >
            Payer la Dette
          </button>
        </div>
      )}

      {/* Table */}
      <div className="lux-card" style={{ overflow: 'hidden' }}>
        <table className="lux-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Fournisseur</th>
              <th>Type de Métal</th>
              <th>Statut</th>
              <th>Total</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {purchases
              .filter(p => {
                const invoiceTotal = p.items.reduce((a, b) => a + (b.totalPrice || 0), 0);
                const paid = (p.amountPaid !== undefined && p.amountPaid !== null) ? p.amountPaid : (p.payment?.total || 0);
                const remaining = Math.max(0, invoiceTotal - paid);
                const hasDebt = remaining > 0;
                if (showOnlyDebts) {
                  if (!hasDebt) return false;
                  if (selectedDebtSupplier && p.supplierId !== selectedDebtSupplier) return false;
                  return true;
                }
                return true;
              })
              .map(p => {
                const stName = metalTypes.find(s => s.id === p.items[0]?.metalTypeId)?.name || '—';
                const firstItem = p.items[0];
                const isPiece = (firstItem as any)?.pricingMode === 'piece' || (firstItem as any)?.isAlaPiece;
                return (
                  <tr key={p.id}>
                    <td style={{ color: 'var(--silver-300)', fontSize: 13 }}>{new Date(p.date).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 700, color: 'var(--silver-100)' }}>{suppliers.find(s => s.id === p.supplierId)?.name}</td>
                    <td style={{ color: 'var(--silver-200)' }}>
                      <div style={{ fontWeight: 600 }}>{stName}</div>
                      {isPiece
                        ? <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}>{(firstItem as any)?.quantity || 0} pcs</span>
                        : <span style={{ fontSize: 11, color: 'var(--silver-400)' }}>{p.items.reduce((a, b) => a + b.weight, 0).toFixed(2)}g</span>
                      }
                    </td>
                    {(() => {
                      const invoiceTotal = p.items.reduce((a, b) => a + (b.totalPrice || 0), 0);
                      const paid = (p.amountPaid !== undefined && p.amountPaid !== null) ? p.amountPaid : (p.payment?.total || 0);
                      const remaining = Math.max(0, invoiceTotal - paid);
                      const debt = remaining > 0;
                      return (
                        <>
                          <td>
                            {debt ? (
                              <span className="badge badge-danger">Dette {remaining.toLocaleString()} DZD</span>
                            ) : (
                              <span className="badge badge-success">Payé</span>
                            )}
                          </td>
                          <td style={{ fontWeight: 800, color: 'var(--gold)' }}>{invoiceTotal.toLocaleString()} DZD</td>
                        </>
                      );
                    })()}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button onClick={() => setSelectedInvoice(p)} className="btn-icon" title="Voir"><Eye size={16} /></button>
                        <button onClick={() => handleOpenEdit(p)} className="btn-icon" title="Modifier"><Edit2 size={16} /></button>
                        <button onClick={() => { if (confirm(t.delete + ' ?')) deletePurchase(p.id); }} style={can('purchases.delete') ? undefined : { display: 'none' }} className="btn-icon danger" title="Supprimer"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            {purchases.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '60px 0', color: 'var(--silver-400)', fontWeight: 700, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Aucun achat enregistré
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ADD / EDIT MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseModal}
          >
            <motion.div
              className="modal-box"
              style={{ maxWidth: 720, maxHeight: '90vh', overflowY: 'auto' }}
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
                    {editingInvoice ? t.edit : t.newPurchase}
                  </h2>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>
                    Complétez les détails de votre achat
                  </p>
                </div>
                <button onClick={handleCloseModal} className="btn-icon"><X size={18} /></button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Supplier / Silver Type / Date */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                    <div>
                      <label className="lux-label">{t.selectSupplier}</label>
                      <select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="lux-select">
                        <option value="">-- {t.selectSupplier} --</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="lux-label">{t.selectMetalType}</label>
                      <select required value={metalTypeId} onChange={(e) => {
                        setMetalTypeId(e.target.value);
                        setShape('ring');
                        setQuantity('');
                        setPricePerPiece('');
                        setWeight('');
                        setPricePerGram('');
                      }} className="lux-select">
                        <option value="">-- {t.selectMetalType} --</option>
                        {metalTypes.map(st => (
                          <option key={st.id} value={st.id}>
                            {categoryLabel(st.id)} · {st.name}{(st as any).isAlaPiece ? ' (À la Pièce)' : ''}
                          </option>
                        ))}
                      </select>
                      {isAlaPiece && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.05em', marginTop: 4, display: 'block' }}>Mode À la Pièce actif</span>
                      )}
                    </div>
                    <div>
                      <label className="lux-label">Date</label>
                      <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="lux-input" />
                    </div>
                  </div>

                  {/* Shape selector */}
                  {selectedST && !selectedST.isCassie && (
                    <div>
                      <label className="lux-label">{t.selectShape}</label>
                      <select value={shape} onChange={(e) => setShape(e.target.value as JewelryShape)} className="lux-select">
                        {shapes.map((s, idx) => (
                          <option key={`${s}-${idx}`} value={s}>
                            {(t as any)[s + 's'] || s}
                            {isAlaPiece && Number((selectedST.shapes as any)[s]) > 0
                              ? ` — ${Math.round(Number((selectedST.shapes as any)[s]))} pcs en stock`
                              : ''}
                          </option>
                        ))}
                      </select>
                      {isAlaPiece && shape && (
                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stock actuel:</span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--gold)' }}>
                            {Math.round(Number((selectedST.shapes as any)[shape]) || 0)} pcs
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pricing mode — non-cassie */}
                  {!isAlaPiece && selectedST && !selectedST.isCassie && (
                    <div style={{ padding: 16, background: 'rgba(201,168,76,0.07)', borderRadius: 12, border: '1px solid var(--border)' }}>
                      <label className="lux-label" style={{ marginBottom: 10, display: 'block' }}>Mode de Tarification</label>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          type="button"
                          onClick={() => setPricingMode('weight')}
                          style={{
                            flex: 1, padding: '10px 16px', borderRadius: 10, fontWeight: 800, fontSize: 13,
                            textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', border: 'none',
                            background: pricingMode === 'weight' ? 'var(--gold)' : 'var(--card-bg)',
                            color: pricingMode === 'weight' ? '#1a1610' : 'var(--silver-300)',
                            transition: 'all 0.2s'
                          }}
                        >
                          Par Poids
                        </button>
                        <button
                          type="button"
                          onClick={() => setPricingMode('piece')}
                          style={{
                            flex: 1, padding: '10px 16px', borderRadius: 10, fontWeight: 800, fontSize: 13,
                            textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', border: 'none',
                            background: pricingMode === 'piece' ? 'var(--gold)' : 'var(--card-bg)',
                            color: pricingMode === 'piece' ? '#1a1610' : 'var(--silver-300)',
                            transition: 'all 0.2s'
                          }}
                        >
                          À la Pièce
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Cassie — weight only */}
                  {!isAlaPiece && selectedST?.isCassie && (
                    <div style={{ padding: 16, background: 'rgba(201,168,76,0.07)', borderRadius: 12, border: '1px solid var(--border)' }}>
                      <label className="lux-label" style={{ marginBottom: 10, display: 'block' }}>Mode de Tarification</label>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          type="button"
                          onClick={() => setPricingMode('weight')}
                          style={{
                            flex: 1, padding: '10px 16px', borderRadius: 10, fontWeight: 800, fontSize: 13,
                            textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', border: 'none',
                            background: 'var(--gold)', color: '#1a1610'
                          }}
                        >
                          Par Poids
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Price inputs — weight mode */}
                  {effectivePricingMode === 'weight' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label className="lux-label">{t.weight} (g)</label>
                        <input type="number" step="0.01" required value={weight} onChange={(e) => setWeight(e.target.value)} className="lux-input" placeholder="0.00" />
                      </div>
                      <div>
                        <label className="lux-label">{t.pricePerGram}</label>
                        <input type="number" required value={pricePerGram} onChange={(e) => setPricePerGram(e.target.value)} className="lux-input" placeholder="0" />
                      </div>
                    </div>
                  )}

                  {/* Price inputs — piece mode */}
                  {effectivePricingMode === 'piece' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label className="lux-label">Quantité (pièces)</label>
                        <input type="number" step="1" min="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} className="lux-input" placeholder="0" />
                      </div>
                      <div>
                        <label className="lux-label">Prix par Pièce (DZD)</label>
                        <input type="number" required value={pricePerPiece} onChange={(e) => setPricePerPiece(e.target.value)} className="lux-input" placeholder="0" />
                      </div>
                    </div>
                  )}

                  {/* Labor cost */}
                  {effectivePricingMode === 'weight' && selectedST && !selectedST.isCassie && !(selectedST as any).isAlaPiece && (
                    <div>
                      <label className="lux-label">{t.laborCostPerGram}</label>
                      <input type="number" value={laborCostPerGram} onChange={(e) => setLaborCostPerGram(e.target.value)} className="lux-input" placeholder="0" />
                    </div>
                  )}

                  {/* Payment section */}
                  <div style={{ padding: 20, background: 'rgba(201,168,76,0.06)', borderRadius: 16, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <Calculator size={18} style={{ color: 'var(--gold)' }} />
                      <span style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--silver-200)' }}>{t.paymentMethod}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
                      <div>
                        <label className="lux-label">{t.cash}</label>
                        <input type="number" value={cashPay} onChange={(e) => setCashPay(e.target.value)} placeholder="0 DZD" className="lux-input" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label className="lux-label">Cassie Argent</label>
                        <select value={cassieSilverTypeId} onChange={(e) => setCassieSilverTypeId(e.target.value)} className="lux-select">
                          <option value="">-- Sélectionner --</option>
                          {cassieOptions.map(st => <option key={st.id} value={st.id}>{st.name} ({st.calibre})</option>)}
                        </select>
                        {cassieSilverStockType && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)' }}>Stock: {cassieSilverStockType.initialQuantity?.toFixed(2) || 0}g</div>}
                        <input type="number" value={cassieSilverGrams} onChange={(e) => setCassieSilverGrams(e.target.value)} placeholder="Grams" className="lux-input" />
                        <input type="number" value={cassieSilverPrice} onChange={(e) => setCassieSilverPrice(e.target.value)} placeholder="Prix/g" className="lux-input" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label className="lux-label">Cassie Or</label>
                        <select value={cassieGoldTypeId} onChange={(e) => setCassieGoldTypeId(e.target.value)} className="lux-select">
                          <option value="">-- Sélectionner --</option>
                          {cassieOptions.map(st => <option key={st.id} value={st.id}>{st.name} ({st.calibre})</option>)}
                        </select>
                        {cassieGoldType && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)' }}>Stock: {cassieGoldType.initialQuantity?.toFixed(2) || 0}g</div>}
                        <input type="number" value={cassieGoldGrams} onChange={(e) => setCassieGoldGrams(e.target.value)} placeholder="Grams" className="lux-input" />
                        <input type="number" value={cassieGoldPrice} onChange={(e) => setCassieGoldPrice(e.target.value)} placeholder="Prix/g" className="lux-input" />
                      </div>
                    </div>
                  </div>

                  {/* Totals */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', background: 'rgba(20,20,28,0.8)', borderRadius: 16, border: '1px solid var(--border)', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-400)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Total Facture</p>
                      <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--silver-100)', margin: 0 }}>{totalPurchasePrice.toLocaleString()} DZD</p>
                      {isAlaPiece && quantity && pricePerPiece && (
                        <p style={{ fontSize: 12, color: 'var(--gold)', margin: '4px 0 0' }}>{quantity} pcs × {parseFloat(pricePerPiece).toLocaleString()} DZD</p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-400)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Total Payé</p>
                      <input
                        type="number"
                        value={amountPaidManual}
                        onChange={(e) => setAmountPaidManual(e.target.value)}
                        placeholder={paymentTotal.toString()}
                        style={{
                          fontSize: 26, fontWeight: 800, textAlign: 'right', background: 'transparent', outline: 'none', border: 'none',
                          color: Math.abs((parseFloat(amountPaidManual || String(paymentTotal)) || 0) - totalPurchasePrice) < 1 ? 'var(--teal)' : 'var(--gold)',
                          width: '100%'
                        }}
                      />
                      <p style={{ fontSize: 12, color: 'var(--silver-300)', margin: '4px 0 0' }}>
                        Reste: {(Math.max(0, totalPurchasePrice - (parseFloat(amountPaidManual || String(paymentTotal)) || 0))).toLocaleString()} DZD
                      </p>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button type="button" onClick={handleCloseModal} className="btn-outline" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                      Annuler
                    </button>
                    <button type="submit" className="btn-gold" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                      {editingInvoice ? t.save : t.newPurchase}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VIEW INVOICE MODAL */}
      <AnimatePresence>
        {selectedInvoice && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => closeSelectedInvoice()}
          >
            <motion.div
              className="modal-box"
              style={{ maxWidth: 760, maxHeight: '90vh', overflowY: 'auto' }}
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(201,168,76,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Info size={20} style={{ color: 'var(--gold)' }} />
                  </div>
                  <div>
                    <div className="silver-line" style={{ marginBottom: 4 }} />
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--silver-100)', margin: 0 }}>Détails de l'achat</h2>
                    <p style={{ fontSize: 12, color: 'var(--silver-300)', margin: '2px 0 0' }}>
                      {suppliers.find(s => s.id === selectedInvoice.supplierId)?.name} • {new Date(selectedInvoice.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button onClick={() => closeSelectedInvoice()} className="btn-icon"><X size={18} /></button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="lux-card" style={{ padding: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-400)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Fournisseur</p>
                    <p style={{ fontWeight: 800, color: 'var(--silver-100)', margin: '4px 0 0' }}>{suppliers.find(s => s.id === selectedInvoice.supplierId)?.name}</p>
                  </div>
                  <div className="lux-card" style={{ padding: 16, textAlign: 'right' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-400)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Date</p>
                    <p style={{ fontWeight: 700, color: 'var(--silver-100)', margin: '4px 0 0' }}>{new Date(selectedInvoice.date).toLocaleDateString()}</p>
                  </div>
                </div>

                {(() => {
                  const invoiceTotal = selectedInvoice.items.reduce((a, b) => a + (b.totalPrice || 0), 0);
                  const displayedPaid = (selectedInvoice.amountPaid !== undefined && selectedInvoice.amountPaid !== null) ? selectedInvoice.amountPaid : (selectedInvoice.payment?.total || 0);
                  const displayRemaining = (selectedInvoice.remaining !== undefined && selectedInvoice.remaining !== null) ? selectedInvoice.remaining : Math.max(0, invoiceTotal - displayedPaid);
                  const hasLabor = selectedInvoice.items.some(it => Boolean((it as any).laborCostPerGram));

                  return (
                    <>
                      <div style={{ overflowX: 'auto' }}>
                        <table className="lux-table">
                          <thead>
                            <tr>
                              <th>Type de Métal</th>
                              <th>Forme</th>
                              <th style={{ textAlign: 'right' }}>Quantité / Poids</th>
                              <th style={{ textAlign: 'right' }}>Prix Unitaire</th>
                              {hasLabor && <th style={{ textAlign: 'right' }}>{t.laborCostPerGram}</th>}
                              <th style={{ textAlign: 'right' }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedInvoice.items.map((it, idx) => {
                              const stName = metalTypes.find(s => s.id === it.metalTypeId)?.name || '—';
                              const isPieceItem = (it as any).pricingMode === 'piece' || (it as any).isAlaPiece;
                              return (
                                <tr key={idx}>
                                  <td style={{ fontWeight: 700, color: 'var(--silver-100)' }}>{stName}</td>
                                  <td style={{ color: 'var(--silver-200)', textTransform: 'capitalize' }}>
                                    {it.shape ? ((t as any)[it.shape + 's'] || it.shape) : '—'}
                                  </td>
                                  {isPieceItem ? (
                                    <>
                                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--gold)' }}>{(it as any).quantity} pcs</td>
                                      <td style={{ textAlign: 'right', color: 'var(--silver-200)' }}>{(it as any).pricePerPiece?.toLocaleString()} DZD/pcs</td>
                                    </>
                                  ) : (
                                    <>
                                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--silver-100)' }}>{it.weight}g</td>
                                      <td style={{ textAlign: 'right', color: 'var(--silver-200)' }}>{it.pricePerGram} DZD/g</td>
                                    </>
                                  )}
                                  {hasLabor && <td style={{ textAlign: 'right', color: 'var(--silver-300)' }}>{(it as any).laborCostPerGram ? (it as any).laborCostPerGram + ' DZD' : '-'}</td>}
                                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--gold)' }}>{(it.totalPrice || 0).toLocaleString()} DZD</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="lux-card" style={{ padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--silver-300)', fontSize: 13 }}>Total Facture</span>
                          <span style={{ fontWeight: 800, color: 'var(--gold)' }}>{invoiceTotal.toLocaleString()} DZD</span>
                        </div>
                      </div>

                      {(selectedInvoice.payment.cassieSilverGrams > 0 || selectedInvoice.payment.cassieGoldGrams > 0) && (
                        <div style={{ padding: 16, borderRadius: 12, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
                          <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--gold)', marginBottom: 12 }}>Détails Paiement par Cassie</p>
                          {selectedInvoice.payment.cassieSilverGrams > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <div style={{ fontSize: 13, color: 'var(--silver-200)' }}>
                                <span style={{ fontWeight: 700 }}>Cassie Argent: </span>
                                {metalTypes.find(st => st.id === (selectedInvoice.payment as any).cassieSilverTypeId)?.name || 'Cassie Argent'}
                              </div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--silver-100)' }}>{selectedInvoice.payment.cassieSilverGrams}g @ {selectedInvoice.payment.cassieSilverPricePerGram} DZD/g</div>
                            </div>
                          )}
                          {selectedInvoice.payment.cassieGoldGrams > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontSize: 13, color: 'var(--silver-200)' }}>
                                <span style={{ fontWeight: 700 }}>Cassie Or: </span>
                                {metalTypes.find(st => st.id === (selectedInvoice.payment as any).cassieGoldTypeId)?.name || 'Cassie Or'}
                              </div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--silver-100)' }}>{selectedInvoice.payment.cassieGoldGrams}g @ {selectedInvoice.payment.cassieGoldPricePerGram} DZD/g</div>
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ padding: 20, borderRadius: 14, background: 'rgba(20,20,28,0.8)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                          <span style={{ color: 'var(--silver-300)', fontSize: 13 }}>Espèces</span>
                          <span style={{ fontWeight: 800, color: 'var(--teal)' }}>{(selectedInvoice.payment.cash || 0).toLocaleString()} DZD</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                          <span style={{ color: 'var(--silver-200)', fontWeight: 700 }}>Total Payé</span>
                          <span style={{ fontWeight: 800, color: 'var(--gold)' }}>{displayedPaid.toLocaleString()} DZD</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                          <span style={{ color: 'var(--silver-200)', fontWeight: 700 }}>Reste</span>
                          <span style={{ fontWeight: 800, color: displayRemaining > 0 ? 'var(--danger)' : 'var(--teal)' }}>{displayRemaining.toLocaleString()} DZD</span>
                        </div>
                        {selectedInvoice.isDebt && (selectedInvoice.remaining || 0) > 0 && (
                          <div style={{ marginTop: 16 }}>
                            <button
                              onClick={() => setShowPayDebtBox(true)}
                              className="btn-gold"
                              style={{ padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                            >
                              Payer la dette
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="modal-footer">
                <button onClick={() => closeSelectedInvoice()} className="btn-outline" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pay Debt Sub-modal */}
      <AnimatePresence>
        {showPayDebtBox && selectedInvoice && (
          <motion.div
            className="modal-overlay"
            style={{ zIndex: 110 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => closeShowPayDebtBox()}
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
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--silver-100)', margin: 0 }}>Payer la dette</h2>
                  <p style={{ fontSize: 12, color: 'var(--danger)', margin: '4px 0 0', fontWeight: 700 }}>
                    Reste: {selectedInvoice.remaining?.toLocaleString()} DZD
                  </p>
                </div>
                <button onClick={() => closeShowPayDebtBox()} className="btn-icon"><X size={18} /></button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="lux-label">Montant</label>
                  <input type="number" value={payDebtAmount} onChange={(e) => setPayDebtAmount(e.target.value)} placeholder="Montant" className="lux-input" />
                </div>
              </div>
              <div className="modal-footer">
                <button onClick={() => closeShowPayDebtBox()} className="btn-outline" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
                <button
                  onClick={async () => {
                    const amt = parseFloat(payDebtAmount || '0');
                    if (!amt || amt <= 0) return;
                    setPayProcessing(true);
                    const newAmountPaid = (selectedInvoice.amountPaid || selectedInvoice.payment.total || 0) + amt;
                    const totalInvoice = selectedInvoice.items.reduce((a, b) => a + b.totalPrice, 0) || 0;
                    const newRemaining = Math.max(0, totalInvoice - newAmountPaid);
                    const newIsDebt = newRemaining > 0;
                    const newPayment = { ...selectedInvoice.payment, cash: (selectedInvoice.payment.cash || 0) + amt, total: (selectedInvoice.payment.total || 0) + amt };
                    updatePurchase(selectedInvoice.id, { payment: newPayment, amountPaid: newAmountPaid, remaining: newRemaining, isDebt: newIsDebt });
                    await addDebtPayment({
                      partyType: 'supplier',
                      partyId: selectedInvoice.supplierId,
                      partyName: suppliers.find(s => s.id === selectedInvoice.supplierId)?.name || '',
                      amount: amt,
                      date: new Date().toISOString(),
                      method: 'cash',
                      invoiceId: selectedInvoice.id,
                      allocations: [{ invoiceId: selectedInvoice.id, amount: amt }],
                      note: '',
                    });
                    setSelectedInvoice({ ...selectedInvoice, payment: newPayment, amountPaid: newAmountPaid, remaining: newRemaining, isDebt: newIsDebt });
                    setPayDebtAmount(''); closeShowPayDebtBox(); setPayProcessing(false);
                  }}
                  className="btn-gold"
                  style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                >
                  {payProcessing ? '...' : 'Confirmer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Debt Payment Modal */}
      <AnimatePresence>
        {showDebtPaymentModal && selectedDebtSupplier && (
          <motion.div
            className="modal-overlay"
            style={{ zIndex: 110 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => closeShowDebtPaymentModal()}
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
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--silver-100)', margin: 0 }}>Paiement de Dette</h2>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>Règlement fournisseur</p>
                </div>
                <button onClick={() => closeShowDebtPaymentModal()} className="btn-icon">
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Debt amount display */}
                <div style={{ padding: 20, borderRadius: 14, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Total Dette du Fournisseur</p>
                  <p style={{ fontSize: 32, fontWeight: 800, color: 'var(--danger)', margin: '6px 0 0' }}>{selectedSupplierDebtAmount.toLocaleString()} DZD</p>
                </div>

                <div>
                  <label className="lux-label">Montant à Payer (DZD)</label>
                  <input type="number" value={debtPaymentAmount} onChange={(e) => setDebtPaymentAmount(e.target.value)} max={selectedSupplierDebtAmount} className="lux-input" placeholder="0" />
                </div>

                {debtPaymentAmount && (
                  <div className="lux-card" style={{ padding: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-400)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Montant à Payer</p>
                        <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--silver-100)', margin: '4px 0 0' }}>{(parseFloat(debtPaymentAmount) || 0).toLocaleString()} DZD</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-400)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Reste</p>
                        <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--danger)', margin: '4px 0 0' }}>{Math.max(0, selectedSupplierDebtAmount - (parseFloat(debtPaymentAmount) || 0)).toLocaleString()} DZD</p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="lux-label" style={{ display: 'block', marginBottom: 10 }}>Méthode de Paiement</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => { setDebtPaymentType('cash'); setSelectedMetalForPayment(''); setSilverPricePerGram(''); }}
                      style={{
                        padding: '14px 16px', borderRadius: 12, fontWeight: 800, fontSize: 13,
                        textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', border: 'none',
                        background: debtPaymentType === 'cash' ? 'var(--teal)' : 'var(--card-bg)',
                        color: debtPaymentType === 'cash' ? '#fff' : 'var(--silver-300)',
                        transition: 'all 0.2s'
                      }}
                    >
                      Caisse
                    </button>
                    <button
                      type="button"
                      onClick={() => setDebtPaymentType('silver')}
                      style={{
                        padding: '14px 16px', borderRadius: 12, fontWeight: 800, fontSize: 13,
                        textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', border: 'none',
                        background: debtPaymentType === 'silver' ? 'var(--gold)' : 'var(--card-bg)',
                        color: debtPaymentType === 'silver' ? '#1a1610' : 'var(--silver-300)',
                        transition: 'all 0.2s'
                      }}
                    >
                      Métal
                    </button>
                  </div>
                </div>

                {debtPaymentType === 'silver' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16, borderRadius: 14, background: 'rgba(201,168,76,0.06)', border: '1px solid var(--border)' }}>
                    <label className="lux-label" style={{ display: 'block' }}>Tous les Types de Métal Disponibles</label>
                    {metalTypes.filter(st => !st.isCassie && !(st as any).isAlaPiece).length > 0 && (
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Stock Personnel</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                          {metalTypes.filter(st => !st.isCassie && !(st as any).isAlaPiece).map(st => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => setSelectedMetalForPayment(st.id)}
                              style={{
                                padding: 14, borderRadius: 12, border: `2px solid ${selectedMetalForPayment === st.id ? 'var(--gold)' : 'var(--border)'}`,
                                background: selectedMetalForPayment === st.id ? 'rgba(201,168,76,0.15)' : 'var(--card-bg)',
                                cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                              }}
                            >
                              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--silver-100)', margin: 0 }}>{st.name}</p>
                              <p style={{ fontSize: 11, color: 'var(--silver-300)', margin: '2px 0' }}>{st.calibre}</p>
                              <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--gold)', margin: 0 }}>{st.initialQuantity?.toFixed(2) || 0}g</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {metalTypes.filter(st => st.isCassie).length > 0 && (
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Cassie</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                          {metalTypes.filter(st => st.isCassie).map(st => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => setSelectedMetalForPayment(st.id)}
                              style={{
                                padding: 14, borderRadius: 12, border: `2px solid ${selectedMetalForPayment === st.id ? 'var(--gold)' : 'var(--border)'}`,
                                background: selectedMetalForPayment === st.id ? 'rgba(201,168,76,0.15)' : 'var(--card-bg)',
                                cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                              }}
                            >
                              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--silver-100)', margin: 0 }}>{st.name}</p>
                              <p style={{ fontSize: 11, color: 'var(--silver-300)', margin: '2px 0' }}>{st.calibre}</p>
                              <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--gold)', margin: 0 }}>{st.initialQuantity?.toFixed(2) || 0}g</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="lux-label">Prix par Gramme (DZD)</label>
                      <input type="number" step="0.01" value={silverPricePerGram} onChange={(e) => setSilverPricePerGram(e.target.value)} className="lux-input" placeholder="0.00" />
                    </div>
                    {silverPricePerGram && debtPaymentAmount && (
                      <div style={{ padding: 16, borderRadius: 12, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Poids à Déduire</p>
                        <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--gold)', margin: '4px 0 0' }}>
                          {(parseFloat(debtPaymentAmount) / parseFloat(silverPricePerGram || '1')).toFixed(2)}g
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => closeShowDebtPaymentModal()}
                  className="btn-outline"
                  style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const amount = parseFloat(debtPaymentAmount || '0');
                    if (!amount || amount <= 0) { alert('Veuillez entrer un montant valide'); return; }
                    if (debtPaymentType === 'silver' && (!selectedMetalForPayment || !silverPricePerGram)) { alert('Veuillez sélectionner un type de métal et entrer le prix par gramme'); return; }
                    setPaymentProcessing(true);
                    const supplierInvoices = purchases.filter(p => p.supplierId === selectedDebtSupplier);
                    let remainingPayment = amount;
                    let totalMetalToDeductb = 0;
                    const allocations: { invoiceId: string; amount: number }[] = [];
                    supplierInvoices.forEach(invoice => {
                      const invoiceTotal = invoice.items.reduce((a, b) => a + (b.totalPrice || 0), 0);
                      const paid = (invoice.amountPaid !== undefined && invoice.amountPaid !== null) ? invoice.amountPaid : (invoice.payment?.total || 0);
                      const remaining = Math.max(0, invoiceTotal - paid);
                      if (remaining > 0 && remainingPayment > 0) {
                        const paymentForThisInvoice = Math.min(remainingPayment, remaining);
                        remainingPayment -= paymentForThisInvoice;
                        const newAmountPaid = paid + paymentForThisInvoice;
                        const newRemaining = Math.max(0, invoiceTotal - newAmountPaid);
                        const newIsDebt = newRemaining > 0;
                        let newPayment = { ...invoice.payment };
                        if (debtPaymentType === 'cash') { newPayment.cash = (newPayment.cash || 0) + paymentForThisInvoice; newPayment.total = (newPayment.total || 0) + paymentForThisInvoice; }
                        updatePurchase(invoice.id, { payment: newPayment, amountPaid: newAmountPaid, remaining: newRemaining, isDebt: newIsDebt });
                        allocations.push({ invoiceId: invoice.id, amount: paymentForThisInvoice });
                      }
                    });
                    if (debtPaymentType === 'silver') {
                      const metalWeight = amount / parseFloat(silverPricePerGram);
                      totalMetalToDeductb = metalWeight;
                      const metalType = metalTypes.find(st => st.id === selectedMetalForPayment);
                      if (metalType) { const newQuantity = Math.max(0, metalType.initialQuantity - metalWeight); updateMetalType(metalType.id, { initialQuantity: newQuantity }); }
                    }
                    const paidMetalType = metalTypes.find(st => st.id === selectedMetalForPayment);
                    await addDebtPayment({
                      partyType: 'supplier',
                      partyId: selectedDebtSupplier,
                      partyName: suppliers.find(s => s.id === selectedDebtSupplier)?.name || '',
                      amount,
                      date: new Date().toISOString(),
                      method: debtPaymentType === 'silver' ? 'silver' : 'cash',
                      metalTypeId: debtPaymentType === 'silver' ? selectedMetalForPayment : undefined,
                      metalTypeName: debtPaymentType === 'silver' ? paidMetalType?.name : undefined,
                      pricePerGram: debtPaymentType === 'silver' ? parseFloat(silverPricePerGram) : undefined,
                      weight: debtPaymentType === 'silver' ? totalMetalToDeductb : undefined,
                      allocations,
                      note: allocations.length > 1 ? `Réparti sur ${allocations.length} factures` : '',
                    });
                    closeShowDebtPaymentModal(); setPaymentProcessing(false);
                    alert(`Paiement de ${amount.toLocaleString()} DZD effectué avec succès${debtPaymentType === 'silver' ? ` (${totalMetalToDeductb.toFixed(2)}g de métal déduit)` : ''}`);
                  }}
                  disabled={paymentProcessing || !debtPaymentAmount || parseFloat(debtPaymentAmount || '0') <= 0}
                  className="btn-gold"
                  style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: (paymentProcessing || !debtPaymentAmount || parseFloat(debtPaymentAmount || '0') <= 0) ? 0.5 : 1 }}
                >
                  {paymentProcessing ? 'Traitement...' : 'Confirmer le Paiement'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Purchases;
