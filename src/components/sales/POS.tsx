
import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ShoppingBag, Printer, User, Coins, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { translations } from '../../i18n/translations';
import { JewelryShape } from '../../types';

const POS: React.FC = () => {
  const { metalTypes, addSale, user, language, shapes, settings, clients, addClientPayment, categoryLabel, can } = useApp();
  const t = translations[language];

  const importedType = metalTypes.find(st => {
    const n = st.name.toLowerCase();
    return n.includes('import') || n.includes('ital') || n.includes('italie') || n.includes('importé') || n.includes('imported');
  });
  const [selectedType, setSelectedType] = useState(importedType?.id || metalTypes.find(st => !st.isCassie)?.id || '');
  const [selectedShape, setSelectedShape] = useState<JewelryShape>('' as JewelryShape);
  const [weight, setWeight] = useState('');
  const [pricePerGram, setPricePerGram] = useState('');
  const [inputMode, setInputMode] = useState<'weight' | 'total' | 'weight_total'>('weight');
  const [totalInput, setTotalInput] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [amountFromSavings, setAmountFromSavings] = useState('');
  const [appliedFromSavings, setAppliedFromSavings] = useState(0);
  const [isDebt, setIsDebt] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);

  // À la Pièce fields
  const [pieceQuantity, setPieceQuantity] = useState('');
  const [pricePerPiece, setPricePerPiece] = useState('');

  const selectedST = metalTypes.find(st => st.id === selectedType);
  const isAlaPiece = !!(selectedST as any)?.isAlaPiece;

  // Get available shapes for the selected type
  const availableShapes = isAlaPiece
    ? (Object.keys(selectedST?.shapes || {}).length > 0 ? Object.keys(selectedST.shapes) : shapes)
    : shapes.filter(s => !selectedST?.isCassie);

  // Current stock for selected shape (for À la Pièce)
  const currentShapeStock = isAlaPiece && selectedST
    ? Math.round(Number((selectedST.shapes as any)[selectedShape]) || 0)
    : null;

  // Total calculation
  const totalWeight = isAlaPiece ? 0 : (parseFloat(weight) || 0);
  const totalPPG = isAlaPiece ? 0 : (parseFloat(pricePerGram) || 0);
  const total = isAlaPiece
    ? (parseFloat(pieceQuantity) || 0) * (parseFloat(pricePerPiece) || 0)
    : totalWeight * totalPPG;

  const paid = parseFloat(amountPaid) || 0;
  const remaining = Math.max(0, total - paid);

  const handleCreate = () => {
    if (!selectedType) {
      alert(language === 'ar' ? 'يرجى اختيار نوع المعدن' : "Veuillez sélectionner un type de métal");
      return;
    }
    if (!selectedShape) {
      alert(language === 'ar' ? 'يرجى اختيار شكل المجوهرات' : 'Veuillez sélectionner une forme');
      return;
    }
    if (isAlaPiece) {
      if (!pieceQuantity || !pricePerPiece) {
        alert(language === 'ar' ? 'يرجى ملء الكمية والسعر' : 'Veuillez remplir la quantité et le prix par pièce');
        return;
      }
      const qty = parseFloat(pieceQuantity);
      if (currentShapeStock !== null && qty > currentShapeStock) {
        alert(language === 'ar'
          ? `الكمية المطلوبة (${qty}) أكبر من المخزون المتاح (${currentShapeStock})`
          : `La quantité demandée (${qty}) dépasse le stock disponible (${currentShapeStock} pcs)`);
        return;
      }
    } else {
      if (!weight || !pricePerGram) {
        alert(language === 'ar' ? 'يرجى ملء جميع الحقول' : 'Veuillez remplir tous les champs');
        return;
      }
    }

    const saleData: any = {
      date: new Date().toISOString(),
      workerId: user?.id || 'admin',
      clientName: clientName || undefined,
      clientPhone: clientPhone || undefined,
      items: [{
        metalTypeId: selectedType,
        shape: selectedShape,
        weight: isAlaPiece ? 0 : parseFloat(weight),
        pricePerGram: isAlaPiece ? 0 : parseFloat(pricePerGram),
        totalPrice: total,
        isAlaPiece: isAlaPiece || undefined,
        quantity: isAlaPiece ? parseFloat(pieceQuantity) : undefined,
        pricePerPiece: isAlaPiece ? parseFloat(pricePerPiece) : undefined,
      }],
      isDebt,
      amountPaid: isDebt ? paid : total,
      remaining: isDebt ? remaining : 0,
      total
    };

    if (selectedClientId && appliedFromSavings > 0) {
      addClientPayment(selectedClientId, { amount: -appliedFromSavings, date: new Date().toISOString() });
    }
    addSale(saleData);
    setLastInvoice({
      ...saleData,
      id: 'INV-' + Date.now(),
      typeName: selectedST?.name
    });
    setShowInvoicePreview(true);
    setAppliedFromSavings(0);
  };

  const handlePrint = () => {
    if (!lastInvoice) return;
    import('../../utils/printInvoice').then(mod => {
      mod.default(settings, lastInvoice, { type: 'pos' });
      resetForm();
    });
  };

  React.useEffect(() => {
    if (selectedType) return;
    const imported = metalTypes.find(st => {
      const n = st.name.toLowerCase();
      return n.includes('import') || n.includes('ital') || n.includes('italie') || n.includes('importé') || n.includes('imported');
    });
    setSelectedType(imported?.id || metalTypes.find(st => !st.isCassie)?.id || '');
  }, [metalTypes]);

  React.useEffect(() => {
    if (inputMode !== 'weight_total') return;
    const tot = parseFloat(totalInput) || 0;
    const w = parseFloat(weight) || 0;
    if (w > 0) setPricePerGram(String((tot / w).toFixed(2)));
    else setPricePerGram('');
  }, [weight, totalInput, inputMode]);

  // When switching type, reset shape and fields
  React.useEffect(() => {
    setSelectedShape('' as JewelryShape);
    setPieceQuantity('');
    setPricePerPiece('');
    setWeight('');
    setPricePerGram('');
  }, [selectedType]);

  const resetForm = () => {
    setSelectedShape('' as JewelryShape);
    setWeight('');
    setPricePerGram('');
    setClientName('');
    setClientPhone('');
    setIsDebt(false);
    setAmountPaid('');
    setShowInvoicePreview(false);
    setInputMode('weight');
    setTotalInput('');
    setPieceQuantity('');
    setPricePerPiece('');
  };

  return (
    <div className="animate-page-enter">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: 28 }}
      >
        <div className="silver-line" />
        <h1 className="section-title">{t.pos}</h1>
        <p className="section-subtitle">Nouvelle Transaction</p>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ===== LEFT PANEL: INPUTS ===== */}
        <div className="xl:col-span-7 lux-card-flat space-y-7" style={{ padding: 28 }}>

          {/* Silver Type selector */}
          <div>
            <label className="lux-label">{t.selectMetalType}</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="lux-select"
            >
              {metalTypes.filter(st => !st.isCassie).map(st => (
                <option key={st.id} value={st.id}>
                  {categoryLabel(st.id)} · {st.name}{(st as any).isAlaPiece ? ' (À la Pièce)' : ''}
                </option>
              ))}
            </select>
            {isAlaPiece && (
              <div style={{ marginTop: 8 }}>
                <span className="badge badge-info">Mode À la Pièce</span>
              </div>
            )}
          </div>

          {/* Shape selector */}
          <div>
            <label className="lux-label">{t.selectShape}</label>
            <select
              value={selectedShape}
              onChange={(e) => setSelectedShape(e.target.value as JewelryShape)}
              className="lux-select"
            >
              <option value="">— Sélectionner une forme —</option>
              {availableShapes.map(s => (
                <option key={s} value={s}>{(t as any)[s + 's'] || s}</option>
              ))}
            </select>

            {isAlaPiece && selectedShape && currentShapeStock !== null && (
              <div style={{ marginTop: 8 }}>
                <span className={currentShapeStock === 0 ? 'badge badge-danger' : currentShapeStock < 5 ? 'badge badge-warning' : 'badge badge-info'}>
                  Stock: {currentShapeStock} pcs
                  {currentShapeStock === 0 && ' — Rupture !'}
                  {currentShapeStock > 0 && currentShapeStock < 5 && ' — Faible !'}
                </span>
              </div>
            )}
          </div>

          {/* Weight / Price section — ONLY for non-À la Pièce */}
          {!isAlaPiece && (
            <div className="space-y-5">
              {/* Pricing mode tabs */}
              <div>
                <label className="lux-label" style={{ marginBottom: 10 }}>Mode de Saisie</label>
                <div className="lux-tabs">
                  <button
                    type="button"
                    className={`lux-tab${inputMode === 'weight' ? ' active' : ''}`}
                    onClick={() => { setInputMode('weight'); setTotalInput(''); }}
                  >
                    Par Poids
                  </button>
                  <button
                    type="button"
                    className={`lux-tab${inputMode === 'total' ? ' active' : ''}`}
                    onClick={() => { setInputMode('total'); setTotalInput(String(total || '')); }}
                  >
                    Par Total
                  </button>
                  <button
                    type="button"
                    className={`lux-tab${inputMode === 'weight_total' ? ' active' : ''}`}
                    onClick={() => { setInputMode('weight_total'); setTotalInput(String(total || '')); }}
                  >
                    Poids + Total
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="lux-label">{t.weight} (g)</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => { if (inputMode !== 'total') setWeight(e.target.value); }}
                    readOnly={inputMode === 'total'}
                    className="lux-input"
                    placeholder="0.00"
                    style={{ opacity: inputMode === 'total' ? 0.6 : 1 }}
                  />
                </div>
                <div>
                  <label className="lux-label">{t.pricePerGram}</label>
                  <input
                    type="number"
                    value={pricePerGram}
                    onChange={(e) => {
                      if (inputMode === 'weight_total') return;
                      setPricePerGram(e.target.value);
                      if (inputMode === 'total') {
                        const p = parseFloat(e.target.value) || 0;
                        const tot = parseFloat(totalInput) || 0;
                        if (p > 0) setWeight(String((tot / p).toFixed(2)));
                        else setWeight('');
                      }
                    }}
                    readOnly={inputMode === 'weight_total'}
                    className="lux-input"
                    placeholder="0"
                    style={{ opacity: inputMode === 'weight_total' ? 0.6 : 1 }}
                  />
                </div>
              </div>

              {(inputMode === 'total' || inputMode === 'weight_total') && (
                <div>
                  <label className="lux-label">Prix Total (DZD)</label>
                  <input
                    type="number"
                    value={totalInput}
                    onChange={(e) => {
                      setTotalInput(e.target.value);
                      const tot = parseFloat(e.target.value) || 0;
                      const p = parseFloat(pricePerGram) || 0;
                      if (inputMode === 'total') {
                        if (p > 0) setWeight(String((tot / p).toFixed(2)));
                        else setWeight('');
                      } else if (inputMode === 'weight_total') {
                        const w = parseFloat(weight) || 0;
                        if (w > 0) setPricePerGram(String((tot / w).toFixed(2)));
                        else setPricePerGram('');
                      }
                    }}
                    className="lux-input"
                    placeholder="0"
                  />
                </div>
              )}
            </div>
          )}

          {/* À la Pièce inputs */}
          {isAlaPiece && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="lux-label">Quantité (pièces)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={pieceQuantity}
                  onChange={(e) => setPieceQuantity(e.target.value)}
                  className="lux-input"
                  placeholder="0"
                  style={{ borderColor: currentShapeStock !== null && parseFloat(pieceQuantity) > currentShapeStock ? 'var(--danger)' : undefined }}
                />
                {currentShapeStock !== null && parseFloat(pieceQuantity) > currentShapeStock && (
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)', margin: '6px 0 0', letterSpacing: '0.04em' }}>
                    Dépasse le stock ({currentShapeStock} pcs)
                  </p>
                )}
              </div>
              <div>
                <label className="lux-label">Prix par Pièce (DZD)</label>
                <input
                  type="number"
                  value={pricePerPiece}
                  onChange={(e) => setPricePerPiece(e.target.value)}
                  className="lux-input"
                  placeholder="0"
                />
              </div>

              {pieceQuantity && pricePerPiece && (
                <div
                  className="col-span-2"
                  style={{
                    background: 'rgba(124,58,237,0.06)',
                    border: '1px solid #DDD6FE',
                    borderRadius: 14,
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 800, color: '#7C3AED', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 3px' }}>Calcul</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-800)', margin: 0 }}>
                      {pieceQuantity} pcs × {parseFloat(pricePerPiece).toLocaleString()} DZD
                    </p>
                  </div>
                  <p style={{ fontSize: 22, fontWeight: 800, color: '#7C3AED', letterSpacing: '-0.03em', margin: 0 }}>
                    {total.toLocaleString()} DZD
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="lux-divider" />

          {/* Client Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <User size={14} style={{ color: 'var(--gold-pure)' }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--platinum-500)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Informations Client
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="lux-label">{t.clientName}</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder={t.clientName}
                  className="lux-input"
                />
              </div>
              <div>
                <label className="lux-label">{t.clientPhone}</label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder={t.clientPhone}
                  className="lux-input"
                />
              </div>
            </div>

            {/* Client search */}
            <div style={{ marginTop: 16 }}>
              <label className="lux-label">Recherche Client</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Nom ou téléphone..."
                  className="lux-input"
                />
                {clientSearch && (
                  <div
                    className="lux-card-flat"
                    style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)', zIndex: 50, maxHeight: 200, overflowY: 'auto', padding: 6 }}
                  >
                    {clients
                      .filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || (c.phone || '').includes(clientSearch))
                      .slice(0, 10)
                      .map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedClientId(c.id);
                            setClientName(c.name);
                            setClientPhone(c.phone || '');
                            setClientSearch('');
                            const bal = (c.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
                            const defaultUse = Math.min(bal, Math.max(0, total - (parseFloat(amountPaid) || 0)));
                            setAmountFromSavings(defaultUse ? String(defaultUse) : '');
                          }}
                          style={{
                            display: 'block', width: '100%', textAlign: 'left',
                            padding: '10px 12px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                            color: 'var(--ink-800)', background: 'transparent', border: 'none', cursor: 'pointer',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--platinum-100)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          {c.name} • {c.phone}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Savings balance */}
              {selectedClientId && (() => {
                const c = clients.find(x => x.id === selectedClientId);
                const bal = c ? (c.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0) : 0;
                return (
                  <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--platinum-400)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>
                        {t.savingsTotal}
                      </p>
                      <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--gold-deep)', margin: 0 }}>{bal.toLocaleString()} DZD</p>
                    </div>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <label className="lux-label">{t.useAmount}</label>
                      <input
                        value={amountFromSavings}
                        onChange={(e) => setAmountFromSavings(e.target.value)}
                        placeholder="0"
                        className="lux-input"
                        style={{ padding: '8px 14px', fontSize: 13 }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (!selectedClientId) { alert(language === 'ar' ? 'اختر عميلًا' : 'Veuillez sélectionner un client'); return; }
                        const c = clients.find(x => x.id === selectedClientId);
                        const balance = c ? (c.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0) : 0;
                        const remainingNow = Math.max(0, total - (parseFloat(amountPaid) || 0));
                        if (remainingNow > 0) {
                          const requested = (amountFromSavings || '').toString().trim() === '' ? balance : Math.max(0, parseFloat(amountFromSavings) || 0);
                          const toPay = Math.min(balance, requested, remainingNow);
                          if (toPay <= 0) { alert(language === 'ar' ? 'لا يوجد مبلغ لاستخدامه' : 'Aucun solde disponible à utiliser'); return; }
                          setAppliedFromSavings(toPay);
                          setAmountPaid(String((parseFloat(amountPaid) || 0) + toPay));
                          alert((language === 'ar' ? 'تم تطبيق من رصيد العميل: ' : 'Montant appliqué depuis le solde client: ') + toPay.toLocaleString() + ' DZD');
                        } else {
                          const depositAmount = Math.max(0, parseFloat(amountFromSavings) || 0);
                          if (depositAmount <= 0) { alert(language === 'ar' ? 'أدخل مبلغًا للإيداع' : 'Veuillez entrer un montant à déposer'); return; }
                          addClientPayment(selectedClientId, { amount: depositAmount, date: new Date().toISOString() });
                          alert((language === 'ar' ? 'تم إيداع: ' : 'Montant déposé: ') + depositAmount.toLocaleString() + ' DZD');
                        }
                      }}
                      className="btn-gold"
                      style={{ height: 42, borderRadius: 10, padding: '0 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      {t.addDeposit}
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Total + Debt panel */}
          <motion.div
            style={{
              background: 'linear-gradient(135deg, rgba(28,36,46,0.95), rgba(22,28,36,0.98))',
              border: '1px solid rgba(192,200,212,0.15)',
              borderRadius: 20,
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 20,
              position: 'relative',
              overflow: 'hidden',
            }}
            whileHover={{ borderColor: 'rgba(192,200,212,0.3)' }}
          >
            <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: 'rgba(192,200,212,0.04)', borderRadius: '50%', filter: 'blur(30px)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
              <motion.div
                style={{
                  width: 44, height: 24, borderRadius: 99, cursor: 'pointer', position: 'relative',
                  background: isDebt ? 'rgba(255,95,114,0.2)' : 'rgba(192,200,212,0.08)',
                  border: `1.5px solid ${isDebt ? 'rgba(255,95,114,0.5)' : 'rgba(192,200,212,0.2)'}`,
                  transition: 'all 0.25s',
                }}
                onClick={() => setIsDebt(!isDebt)}
              >
                <motion.div
                  animate={{ x: isDebt ? 22 : 3 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  style={{ position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%', background: isDebt ? '#FF5F72' : '#8FA3B8' }}
                />
              </motion.div>
              <label
                style={{ fontSize: 14, fontWeight: 700, color: isDebt ? '#FF5F72' : 'var(--silver-200)', cursor: 'pointer', letterSpacing: '-0.01em', transition: 'color 0.2s' }}
                onClick={() => setIsDebt(!isDebt)}
              >
                {t.isDebt}
              </label>
            </div>
            <div style={{ textAlign: 'right', position: 'relative', zIndex: 1 }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(192,200,212,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 4px' }}>
                {t.totalPrice}
              </p>
              <p style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.04em', margin: 0, lineHeight: 1, background: 'linear-gradient(135deg, #F0F4F8, #C0C8D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {total.toLocaleString()}
                <span style={{ fontSize: 14, fontWeight: 700, WebkitTextFillColor: '#C9A84C', marginLeft: 6 }}>DZD</span>
              </p>
              {isAlaPiece && pieceQuantity && (
                <p style={{ fontSize: 11, color: 'var(--silver-300)', margin: '4px 0 0' }}>
                  {pieceQuantity} pcs × {parseFloat(pricePerPiece || '0').toLocaleString()} DZD
                </p>
              )}
            </div>
          </motion.div>

          {isDebt && (
            <div
              style={{
                background: 'var(--danger-bg)',
                border: '1px solid rgba(255,95,114,0.3)',
                borderRadius: 16,
                padding: '18px 20px',
              }}
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="lux-label">{t.amountPaid}</label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="lux-input"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="lux-label">{t.remaining}</label>
                  <div
                    className="lux-input"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'default', background: 'rgba(255,95,114,0.06)' }}
                  >
                    <span style={{ fontWeight: 800, color: 'var(--danger)', fontSize: 16 }}>{remaining.toLocaleString()}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)' }}>DZD</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <motion.button
            onClick={handleCreate}
            className="btn-silver"
            whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(192,200,212,0.25)' }}
            whileTap={{ scale: 0.97 }}
            style={{ width: '100%', height: 56, borderRadius: 14, fontSize: 16, fontWeight: 800, display: can('pos.create') ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer', letterSpacing: '-0.02em' }}
          >
            <ShoppingBag size={22} />
            {t.createInvoice}
          </motion.button>
        </div>

        {/* ===== RIGHT PANEL: INVOICE PREVIEW ===== */}
        <div className="xl:col-span-5">
          {showInvoicePreview ? (
            <div className="lux-card-flat" style={{ padding: 28, position: 'sticky', top: 88 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div className="silver-line" />
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink-900)', letterSpacing: '-0.02em', margin: 0 }}>
                    Facture
                  </h3>
                </div>
                <button onClick={() => setShowInvoicePreview(false)} className="btn-icon">
                  <X size={16} />
                </button>
              </div>

              <div id="invoice-to-print" className="p-4 space-y-8 bg-white text-slate-900">
                <div className="text-center space-y-2 pb-8 border-b-2 border-slate-50">
                  {settings?.logo ? (
                    <div className="w-14 h-14 rounded-full mx-auto mb-3 overflow-hidden">
                      <img src={settings.logo} alt="logo" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div style={{ width: 52, height: 52, background: 'var(--ink-900)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <Coins size={24} style={{ color: 'var(--gold-pure)' }} />
                    </div>
                  )}
                  <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">{settings?.storeName || t.bijouterieName}</h1>
                  <p className="text-amber-600 font-bold uppercase tracking-widest text-[9px] italic">{settings?.slogan || t.slogan}</p>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase space-y-0.5">
                    <p>{settings?.address || t.location + ' • ALGER'}</p>
                    <p>TÉL: {settings?.phone || '0549904709'}</p>
                  </div>
                </div>

                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">FACTURÉ À</p>
                    <p className="text-base font-black text-slate-900">{lastInvoice.clientName || 'CLIENT DE PASSAGE'}</p>
                    <p className="text-xs font-semibold text-slate-400">{lastInvoice.clientPhone || '---'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">DÉTAILS</p>
                    <p className="text-sm font-black text-slate-900">#{lastInvoice.id.slice(-8)}</p>
                    <p className="text-xs font-semibold text-slate-400">{new Date(lastInvoice.date).toLocaleDateString()}</p>
                  </div>
                </div>

                <table className="lux-table">
                  <thead>
                    <tr>
                      <th>Article</th>
                      {lastInvoice.items.some((i: any) => i.isAlaPiece) ? (
                        <><th style={{ textAlign: 'right' }}>Qté</th><th style={{ textAlign: 'right' }}>Prix/Pcs</th></>
                      ) : (
                        <><th style={{ textAlign: 'right' }}>Poids</th><th style={{ textAlign: 'right' }}>Prix/g</th></>
                      )}
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastInvoice.items.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td>
                          <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>
                            {(t as any)[item.shape + 's'] || item.shape}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--platinum-400)', marginLeft: 6 }}>/ {lastInvoice.typeName}</span>
                        </td>
                        {item.isAlaPiece ? (
                          <><td style={{ textAlign: 'right' }}>{item.quantity} pcs</td><td style={{ textAlign: 'right' }}>{item.pricePerPiece?.toLocaleString()} DZD</td></>
                        ) : (
                          <><td style={{ textAlign: 'right' }}>{item.weight}g</td><td style={{ textAlign: 'right' }}>{item.pricePerGram} DZD/g</td></>
                        )}
                        <td style={{ textAlign: 'right', fontWeight: 800 }}>{item.totalPrice.toLocaleString()} DZD</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="space-y-3">
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--platinum-400)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Global</span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink-900)', letterSpacing: '-0.03em' }}>{lastInvoice.total.toLocaleString()} DZD</span>
                  </div>
                  {lastInvoice.isDebt && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--info-bg)', borderRadius: 10, padding: '10px 14px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--info)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Montant Payé</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--info)' }}>{lastInvoice.amountPaid.toLocaleString()} DZD</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--warning-bg)', borderRadius: 10, padding: '10px 14px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Reste à Payer</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--warning)' }}>{lastInvoice.remaining.toLocaleString()} DZD</span>
                      </div>
                    </>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', background: lastInvoice.isDebt ? 'var(--danger-bg)' : 'var(--success-bg)', borderRadius: 10, padding: '10px 14px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: lastInvoice.isDebt ? 'var(--danger)' : 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Statut</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: lastInvoice.isDebt ? 'var(--danger)' : 'var(--success)' }}>
                      {lastInvoice.isDebt ? t.debts : t.paid}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 no-print" style={{ marginTop: 20 }}>
                <button
                  onClick={handlePrint}
                  className="btn-gold"
                  style={{ flex: 1, height: 44, borderRadius: 10, display: can('pos.print') ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  <Printer size={16} />
                  {t.print}
                </button>
                <button
                  onClick={resetForm}
                  className="btn-outline"
                  style={{ height: 44, borderRadius: 10, padding: '0 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Nouvelle Vente
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                minHeight: 400, border: '2px dashed var(--platinum-200)', borderRadius: 28,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: 40, textAlign: 'center', transition: 'border-color 0.3s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--gold-pure)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--platinum-200)'; }}
            >
              <div style={{ width: 64, height: 64, background: 'var(--platinum-100)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <ShoppingBag size={28} style={{ color: 'var(--platinum-300)' }} />
              </div>
              <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--platinum-400)', letterSpacing: '-0.02em', margin: '0 0 6px' }}>Aperçu Facture</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--platinum-300)', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0, maxWidth: 220, lineHeight: 1.6 }}>
                Complétez les champs pour générer un document officiel
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default POS;
