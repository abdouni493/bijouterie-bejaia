
import React, { useState } from 'react';
import { Search, FileText, Printer, Trash2, Eye, Edit2, X, CreditCard, Calculator, CheckCircle, RotateCcw, Receipt, TrendingUp, Scale, Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import printInvoice from '../../utils/printInvoice';
import { translations } from '../../i18n/translations';
import { SaleInvoice } from '../../types';

const SellingInvoices: React.FC = () => {
  const { sales, deleteSale, updateSale, language, user, workers, settings, purchases, metalPriceFor, metalCategories, metalTypes, updateMetalType, can } = useApp();
  const t = translations[language];
  const [searchTerm, setSearchTerm] = useState('');
  const [showDebtOnly, setShowDebtOnly] = useState(false);
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<SaleInvoice | null>(null);
  const [payingDebtInvoice, setPayingDebtInvoice] = useState<SaleInvoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<SaleInvoice | null>(null);
  const [editClientName, setEditClientName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editIsDebt, setEditIsDebt] = useState(false);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [deletingWithRecoveryInvoice, setDeletingWithRecoveryInvoice] = useState<SaleInvoice | null>(null);

  const isAdmin = user?.role === 'admin';

  // Build cost per gram map from all purchases
  const costPerGramMap: Record<string, number> = {};
  purchases.forEach(p => {
    p.items.forEach(it => {
      const id = it.metalTypeId;
      if (!costPerGramMap[id]) costPerGramMap[id] = it.pricePerGram;
    });
  });

  const getCreatorName = (workerId: string): string => {
    if (workerId === 'admin' || !workerId) return 'Admin';
    const worker = workers.find(w => w.id === workerId);
    return worker?.fullName || 'Utilisateur';
  };

  const filtered = sales.filter(s => {
    const matchesSearch = s.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.id.toLowerCase().includes(searchTerm.toLowerCase());
    const isOwner = isAdmin || s.workerId === user?.id;
    const matchesDebtFilter = !showDebtOnly || s.isDebt;
    const isToday = (() => { const d = new Date(s.date); const now = new Date(); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate(); })();
    const matchesToday = !showTodayOnly || isToday;
    const matchesCustomRange = !showCustomRange || (customStartDate && customEndDate && new Date(s.date) >= new Date(customStartDate) && new Date(s.date) <= new Date(customEndDate));
    return matchesSearch && isOwner && matchesDebtFilter && matchesToday && matchesCustomRange;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // totals for today (owner-scoped)
  const todaysSales = sales.filter(s => {
    const isOwner = isAdmin || s.workerId === user?.id;
    const d = new Date(s.date);
    const now = new Date();
    return isOwner && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  });
  const totalAmountToday = todaysSales.reduce((a, b) => a + (Number(b.total) || 0), 0);
  const totalWeightToday = todaysSales.reduce((a, s) => a + (s.items || []).reduce((sa, it) => sa + (Number(it.weight) || 0), 0), 0);
  const totalProfitToday = todaysSales.reduce((s, sale) => s + sale.items.reduce((si, it) => {
    const reference = metalPriceFor(it.metalTypeId);
    const costPerGram = reference > 0 ? reference : (costPerGramMap[it.metalTypeId] ?? (it.pricePerGram * 0.6));
    return si + (Number(it.weight) || 0) * (it.pricePerGram - costPerGram);
  }, 0), 0);

  // totals for custom date range (owner-scoped)
  const customRangeSales = sales.filter(s => {
    const isOwner = isAdmin || s.workerId === user?.id;
    if (!customStartDate || !customEndDate) return false;
    const d = new Date(s.date);
    const startDate = new Date(customStartDate);
    const endDate = new Date(customEndDate);
    endDate.setHours(23, 59, 59, 999);
    return isOwner && d >= startDate && d <= endDate;
  });
  const totalAmountCustomRange = customRangeSales.reduce((a, b) => a + (Number(b.total) || 0), 0);
  const totalWeightCustomRange = customRangeSales.reduce((a, s) => a + (s.items || []).reduce((sa, it) => sa + (Number(it.weight) || 0), 0), 0);
  const totalProfitCustomRange = customRangeSales.reduce((s, sale) => s + sale.items.reduce((si, it) => {
    const reference = metalPriceFor(it.metalTypeId);
    const costPerGram = reference > 0 ? reference : (costPerGramMap[it.metalTypeId] ?? (it.pricePerGram * 0.6));
    return si + (Number(it.weight) || 0) * (it.pricePerGram - costPerGram);
  }, 0), 0);

  const handlePrint = (invoice: SaleInvoice) => {
    printInvoice(settings, invoice, { type: 'sale' });
  };

  const handleDeleteWithRecovery = () => {
    if (!deletingWithRecoveryInvoice) return;

    deletingWithRecoveryInvoice.items.forEach(item => {
      const metalType = metalTypes.find(st => st.id === item.metalTypeId);
      if (metalType) {
        const isPieceItem = (item as any).isAlaPiece;
        if (isPieceItem) {
          const currentQty = Number((metalType.shapes as any)[item.shape]) || 0;
          const pieceQty = Number((item as any).quantity) || 0;
          updateMetalType(item.metalTypeId, {
            shapes: {
              ...metalType.shapes,
              [item.shape]: currentQty + pieceQty
            }
          });
        } else {
          const currentShapeWeight = metalType.shapes[item.shape] || 0;
          updateMetalType(item.metalTypeId, {
            shapes: {
              ...metalType.shapes,
              [item.shape]: currentShapeWeight + item.weight
            }
          });
        }
      }
    });

    deleteSale(deletingWithRecoveryInvoice.id);
    closeDeleteRecovery();
  };

  const closePayingDebt = () => { setPayingDebtInvoice(null);
  };
  const closeSelectedInvoice = () => { setSelectedInvoice(null);
  };
  const closeDeleteRecovery = () => { setDeletingWithRecoveryInvoice(null);
  };

  const confirmPayDebt = () => {
    if (!payingDebtInvoice) return;
    updateSale(payingDebtInvoice.id, { isDebt: false });
    closePayingDebt();
  };

  const handleOpenEdit = (invoice: SaleInvoice) => {
    setEditingInvoice(invoice);
    setEditClientName(invoice.clientName || '');
    setEditClientPhone(invoice.clientPhone || '');
    setEditDate(new Date(invoice.date).toISOString().split('T')[0]);
    setEditIsDebt(invoice.isDebt);
    setEditItems(invoice.items.map(item => ({ ...item })));
  };

  const clearEditState = () => {
    setEditingInvoice(null);
    setEditClientName('');
    setEditClientPhone('');
    setEditDate('');
    setEditIsDebt(false);
    setEditItems([]);
  };

  const handleSaveEdit = () => {
    if (!editingInvoice) return;
    const newTotal = editItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    updateSale(editingInvoice.id, {
      clientName: editClientName,
      clientPhone: editClientPhone,
      date: new Date(editDate).toISOString(),
      isDebt: editIsDebt,
      items: editItems,
      total: newTotal
    });
    clearEditState();
  };

  const closeEditModal = () => {
    clearEditState();
  };

  return (
    <div className="animate-page-enter space-y-8">

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="gold-line" />
          <h2 className="section-title">{t.sellingInvoices}</h2>
          <p className="section-subtitle">
            {isAdmin ? 'Historique des transactions clients' : 'Mes factures émises'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:w-72">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--silver-400)' }}
            />
            <input
              type="text"
              placeholder={language === 'ar' ? 'بحث عن فاتورة...' : 'Rechercher une facture...'}
              className="lux-input pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter: Today */}
          <button
            onClick={() => { setShowTodayOnly(!showTodayOnly); setShowCustomRange(false); }}
            className={`btn-${showTodayOnly ? 'gold' : 'outline'} px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 whitespace-nowrap`}
          >
            <Calendar size={14} />
            Aujourd'hui
          </button>

          {/* Filter: Period */}
          <button
            onClick={() => { setShowCustomRange(!showCustomRange); setShowTodayOnly(false); }}
            className={`btn-${showCustomRange ? 'gold' : 'outline'} px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 whitespace-nowrap`}
          >
            <Calendar size={14} />
            Période
          </button>

          {/* Filter: Debts */}
          <button
            onClick={() => setShowDebtOnly(!showDebtOnly)}
            className={`${showDebtOnly ? 'btn-danger' : 'btn-outline'} px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap`}
          >
            {t.debts}
          </button>
        </div>
      </div>

      {/* ── TODAY METRICS ── */}
      {showTodayOnly && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-scale">
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-3">
              <Scale size={16} style={{ color: 'var(--silver-300)' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--silver-300)' }}>Poids Aujourd'hui</span>
            </div>
            <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{totalWeightToday.toFixed(2)}<span className="text-sm ml-1" style={{ color: 'var(--silver-400)' }}>g</span></p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-3">
              <Receipt size={16} style={{ color: 'var(--gold)' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--silver-300)' }}>Montant Aujourd'hui</span>
            </div>
            <p className="text-2xl font-black text-gold-gradient">{totalAmountToday.toLocaleString()}<span className="text-sm ml-1" style={{ color: 'var(--silver-400)' }}>DZD</span></p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} style={{ color: 'var(--teal)' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--silver-300)' }}>Bénéfice Estimé</span>
            </div>
            <p className="text-2xl font-black" style={{ color: 'var(--teal)' }}>{totalProfitToday.toLocaleString()}<span className="text-sm ml-1" style={{ color: 'var(--silver-400)' }}>DZD</span></p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={16} style={{ color: 'var(--silver-300)' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--silver-300)' }}>Prix de Référence</span>
            </div>
            <div className="space-y-1">
              {metalCategories.filter(c => c.pricePerGram > 0).map(c => (
                <p key={c.id} className="text-sm font-black flex items-center gap-2" style={{ color: 'var(--gold)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
                  {c.name}: {c.pricePerGram.toLocaleString()}<span className="text-xs ml-1" style={{ color: 'var(--silver-400)' }}>DZD/g</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOM RANGE ── */}
      {showCustomRange && (
        <div className="lux-card p-6 space-y-5 animate-fade-scale">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="lux-label">Date de début</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="lux-input"
              />
            </div>
            <div>
              <label className="lux-label">Date de fin</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="lux-input"
              />
            </div>
          </div>

          {customStartDate && customEndDate && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-3">
                  <Scale size={16} style={{ color: 'var(--silver-300)' }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--silver-300)' }}>Total Poids</span>
                </div>
                <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{totalWeightCustomRange.toFixed(2)}<span className="text-sm ml-1" style={{ color: 'var(--silver-400)' }}>g</span></p>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-3">
                  <Receipt size={16} style={{ color: 'var(--gold)' }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--silver-300)' }}>Total Montant</span>
                </div>
                <p className="text-2xl font-black text-gold-gradient">{totalAmountCustomRange.toLocaleString()}<span className="text-sm ml-1" style={{ color: 'var(--silver-400)' }}>DZD</span></p>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={16} style={{ color: 'var(--teal)' }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--silver-300)' }}>Bénéfice Estimé</span>
                </div>
                <p className="text-2xl font-black" style={{ color: 'var(--teal)' }}>{totalProfitCustomRange.toLocaleString()}<span className="text-sm ml-1" style={{ color: 'var(--silver-400)' }}>DZD</span></p>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={16} style={{ color: 'var(--silver-300)' }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--silver-300)' }}>Prix de Référence</span>
                </div>
                <div className="space-y-1">
                  {metalCategories.filter(c => c.pricePerGram > 0).map(c => (
                    <p key={c.id} className="text-sm font-black flex items-center gap-2" style={{ color: 'var(--gold)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
                      {c.name}: {c.pricePerGram.toLocaleString()}<span className="text-xs ml-1" style={{ color: 'var(--silver-400)' }}>DZD/g</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── INVOICES TABLE ── */}
      <div className="lux-card" style={{ overflow: 'visible' }}>
        <table className="lux-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>Client</th>
              <th>Créé par</th>
              <th>Statut</th>
              <th>Total</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td>
                  <span className="font-mono text-xs" style={{ color: 'var(--silver-400)' }}>#{s.id.slice(-6)}</span>
                </td>
                <td style={{ color: 'var(--silver-300)' }}>{new Date(s.date).toLocaleDateString()}</td>
                <td>
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{s.clientName || 'Passager'}</span>
                </td>
                <td style={{ color: 'var(--silver-300)' }}>{getCreatorName(s.workerId)}</td>
                <td>
                  <span className={`badge ${s.isDebt ? 'badge-danger' : 'badge-success'}`}>
                    {s.isDebt ? t.debts : t.paid}
                  </span>
                </td>
                <td>
                  <span className="font-bold text-gold-gradient">{s.total.toLocaleString()} DZD</span>
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      className="btn-icon"
                      title="Voir les détails"
                      onClick={() => setSelectedInvoice(s)}
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      className="btn-icon"
                      title="Modifier"
                      style={{ '--btn-icon-hover-color': 'var(--gold)', '--btn-icon-hover-border': 'rgba(201,168,76,0.4)', '--btn-icon-hover-bg': 'var(--gold-dim)' } as React.CSSProperties}
                      onClick={() => handleOpenEdit(s)}
                      onMouseEnter={e => { const el = e.currentTarget; el.style.color = 'var(--gold)'; el.style.borderColor = 'rgba(201,168,76,0.4)'; el.style.background = 'var(--gold-dim)'; }}
                      onMouseLeave={e => { const el = e.currentTarget; el.style.color = ''; el.style.borderColor = ''; el.style.background = ''; }}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      className="btn-icon"
                      title="Imprimer"
                      onClick={() => handlePrint(s)}
                    >
                      <Printer size={15} />
                    </button>
                    {s.isDebt && (
                      <button
                        className="btn-icon"
                        title="Marquer comme payé"
                        onClick={() => setPayingDebtInvoice(s)}
                        onMouseEnter={e => { const el = e.currentTarget; el.style.color = 'var(--teal)'; el.style.borderColor = 'rgba(34,211,165,0.4)'; el.style.background = 'var(--success-bg)'; }}
                        onMouseLeave={e => { const el = e.currentTarget; el.style.color = ''; el.style.borderColor = ''; el.style.background = ''; }}
                      >
                        <CreditCard size={15} />
                      </button>
                    )}
                    <button
                      className="btn-icon"
                      title="Supprimer & Récupérer stock"
                      onClick={() => setDeletingWithRecoveryInvoice(s)}
                      onMouseEnter={e => { const el = e.currentTarget; el.style.color = 'var(--silver-200)'; el.style.borderColor = 'var(--border-bright)'; }}
                      onMouseLeave={e => { const el = e.currentTarget; el.style.color = ''; el.style.borderColor = ''; }}
                    >
                      <RotateCcw size={15} />
                    </button>
                    <button
                      className="btn-icon danger"
                      title="Supprimer définitivement"
                      onClick={() => { if (confirm(t.delete + ' ?')) { deleteSale(s.id); } }}
                      style={can('sellingInvoices.delete') ? undefined : { display: 'none' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-16">
                  <FileText size={32} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--silver-400)' }} />
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--silver-400)' }}>Aucune facture enregistrée</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── PAY DEBT MODAL ── */}
      {payingDebtInvoice && (
        <div className="modal-overlay">
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--success-bg)', border: '1px solid rgba(34,211,165,0.25)' }}>
                  <Calculator size={18} style={{ color: 'var(--teal)' }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t.payDebt}</h3>
                  <p className="text-xs" style={{ color: 'var(--silver-400)' }}>Confirmer le règlement de la dette</p>
                </div>
              </div>
              <button onClick={closePayingDebt} className="btn-icon">
                <X size={16} />
              </button>
            </div>

            <div className="modal-body space-y-4">
              <div className="p-5 rounded-xl" style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)' }}>
                <p className="lux-label mb-1">Montant à régler</p>
                <p className="text-3xl font-black text-gold-gradient">{(payingDebtInvoice.remaining || payingDebtInvoice.total).toLocaleString()} DZD</p>
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <p className="text-sm" style={{ color: 'var(--silver-300)' }}>
                    Client: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{payingDebtInvoice.clientName || 'Passager'}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={closePayingDebt} className="btn-outline px-6 py-2.5 rounded-xl text-sm font-bold">
                Annuler
              </button>
              <button onClick={confirmPayDebt} className="btn-gold px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2">
                <CheckCircle size={16} />
                Confirmer
              </button>
            </div>
        </div>
      )}

      {/* ── DETAILS MODAL ── */}
      {selectedInvoice && (
        <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '60px' }}>
          <div className="modal-box modal-box-lg" style={{ maxHeight: '85vh' }}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--gold-dim)', border: '1px solid rgba(201,168,76,0.25)' }}>
                  <Receipt size={18} style={{ color: 'var(--gold)' }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Détails Facture</h3>
                  <p className="text-xs font-mono" style={{ color: 'var(--silver-400)' }}>#INV-{selectedInvoice.id.slice(-8)}</p>
                </div>
              </div>
              <button onClick={closeSelectedInvoice} className="btn-icon">
                <X size={16} />
              </button>
            </div>

            <div className="modal-body space-y-6" id="invoice-to-print">
              {/* Store header */}
              <div className="text-center space-y-2 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
                {settings?.logo && (
                  <div className="w-16 h-16 rounded-full mx-auto overflow-hidden mb-2">
                    <img src={settings.logo} alt="logo" className="w-full h-full object-cover" />
                  </div>
                )}
                <h1 className="text-xl font-black text-gold-gradient uppercase tracking-wide">{settings?.storeName || t.bijouterieName}</h1>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--silver-400)' }}>{settings?.slogan || t.slogan}</p>
                <div className="text-xs space-y-0.5" style={{ color: 'var(--silver-400)' }}>
                  <p>{settings?.address || 'NAZLI CHERIF N°30 SEC 21 RDC 11 CHÉRAGA - ALGER'}</p>
                  <p>TÉL: {settings?.phone || '0549904709'}</p>
                  <p style={{ color: 'var(--gold)' }}>{settings?.contact || 'RÉSEAUX SOCIAUX: BIJOUTERIE LAKROUF'}</p>
                </div>
              </div>

              {/* Invoice meta */}
              <div className="flex justify-between items-start">
                <div>
                  <p className="lux-label mb-1">Facturé à</p>
                  <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{selectedInvoice.clientName || 'CLIENT DE PASSAGE'}</p>
                  <p className="text-sm" style={{ color: 'var(--silver-400)' }}>{selectedInvoice.clientPhone || '---'}</p>
                </div>
                <div className="text-right">
                  <p className="lux-label mb-1">Détails</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>#INV-{selectedInvoice.id.slice(-8)}</p>
                  <p className="text-xs" style={{ color: 'var(--silver-400)' }}>{new Date(selectedInvoice.date).toLocaleDateString()}</p>
                  <p className="text-xs mt-2" style={{ color: 'var(--silver-400)' }}>Créé par: {getCreatorName(selectedInvoice.workerId)}</p>
                </div>
              </div>

              {/* Items table */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <table className="lux-table">
                  <thead>
                    <tr>
                      <th>Article</th>
                      <th>Type</th>
                      <th className="text-right">Qté / Poids</th>
                      <th className="text-right">Prix Unitaire</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item, idx) => {
                      const stName = metalTypes.find(s => s.id === item.metalTypeId)?.name || '—';
                      const isPieceItem = (item as any).isAlaPiece;
                      return (
                        <tr key={idx}>
                          <td className="font-bold capitalize" style={{ color: 'var(--text-primary)' }}>
                            {(t as any)[item.shape + 's'] || item.shape}
                          </td>
                          <td style={{ color: 'var(--silver-400)' }}>
                            {stName}
                            {isPieceItem && (
                              <span className="ml-2 badge badge-info" style={{ fontSize: '9px' }}>Pièce</span>
                            )}
                          </td>
                          {isPieceItem ? (
                            <>
                              <td className="text-right font-bold" style={{ color: 'var(--text-primary)' }}>{(item as any).quantity} pcs</td>
                              <td className="text-right" style={{ color: 'var(--silver-400)' }}>{((item as any).pricePerPiece || 0).toLocaleString()} DZD/pcs</td>
                            </>
                          ) : (
                            <>
                              <td className="text-right font-bold" style={{ color: 'var(--text-primary)' }}>{item.weight}g</td>
                              <td className="text-right" style={{ color: 'var(--silver-400)' }}>{item.pricePerGram.toLocaleString()} DZD/g</td>
                            </>
                          )}
                          <td className="text-right font-bold text-gold-gradient">{item.totalPrice.toLocaleString()} DZD</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Total row */}
              <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <span className={`badge ${selectedInvoice.isDebt ? 'badge-danger' : 'badge-success'}`}>
                  {selectedInvoice.isDebt ? t.debts : t.paid}
                </span>
                <div className="text-right">
                  {selectedInvoice.isDebt ? (
                    <div className="space-y-2">
                      {selectedInvoice.amountPaid !== undefined && (
                        <>
                          <div>
                            <p className="lux-label mb-0.5">Montant Payé</p>
                            <p className="text-lg font-bold" style={{ color: 'var(--silver-200)' }}>{selectedInvoice.amountPaid.toLocaleString()} DZD</p>
                          </div>
                          <div className="pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                            <p className="lux-label mb-0.5">Reste à Payer</p>
                            <p className="text-2xl font-black" style={{ color: 'var(--danger)' }}>{(selectedInvoice.remaining || 0).toLocaleString()} DZD</p>
                          </div>
                        </>
                      )}
                      {selectedInvoice.amountPaid === undefined && (
                        <div>
                          <p className="lux-label mb-0.5">Total à Payer</p>
                          <p className="text-2xl font-black text-gold-gradient">{selectedInvoice.total.toLocaleString()} DZD</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="lux-label mb-0.5">Total Global</p>
                      <p className="text-2xl font-black text-gold-gradient">{selectedInvoice.total.toLocaleString()} DZD</p>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-center text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--silver-400)' }}>Merci de votre visite</p>

              {/* Benefit calculation */}
              {selectedInvoice.items.some(item => !(item as any).isAlaPiece && metalPriceFor(item.metalTypeId) > 0) && (
                <div className="pt-5 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
                  <p className="lux-label">Calcul du Bénéfice (prix de référence par métal)</p>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedInvoice.items.filter(item => !(item as any).isAlaPiece).map((item, idx) => {
                      const referencePrice = metalPriceFor(item.metalTypeId);
                      const benefitPerGram = item.pricePerGram - referencePrice;
                      const totalBenefit = item.weight * benefitPerGram;
                      const stName = metalTypes.find(s => s.id === item.metalTypeId)?.name || '';
                      return (
                        <div key={idx} className="p-4 rounded-xl space-y-2" style={{ background: 'var(--success-bg)', border: '1px solid rgba(34,211,165,0.2)' }}>
                          <p className="text-xs font-bold uppercase tracking-widest capitalize" style={{ color: 'var(--teal)' }}>{(t as any)[item.shape + 's'] || item.shape}</p>
                          <p className="text-xs" style={{ color: 'var(--silver-400)' }}>{stName}</p>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span style={{ color: 'var(--silver-400)' }}>Prix Vente:</span>
                              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{item.pricePerGram} DZD/g</span>
                            </div>
                            <div className="flex justify-between">
                              <span style={{ color: 'var(--silver-400)' }}>Prix Coût:</span>
                              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{referencePrice.toLocaleString()} DZD/g</span>
                            </div>
                            <div className="flex justify-between pt-1" style={{ borderTop: '1px solid rgba(34,211,165,0.2)' }}>
                              <span style={{ color: 'var(--teal)' }}>Bénéfice/g:</span>
                              <span className="font-bold" style={{ color: 'var(--teal)' }}>{benefitPerGram.toFixed(2)} DZD</span>
                            </div>
                            <div className="flex justify-between p-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
                              <span className="font-bold" style={{ color: 'var(--silver-300)' }}>{item.weight}g × {benefitPerGram.toFixed(2)}</span>
                              <span className="font-black" style={{ color: 'var(--teal)' }}>{totalBenefit.toFixed(2)} DZD</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-4 rounded-xl flex justify-between items-center" style={{ background: 'rgba(34,211,165,0.08)', border: '1px solid rgba(34,211,165,0.2)' }}>
                    <span className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--teal)' }}>Bénéfice Total</span>
                    <span className="text-2xl font-black" style={{ color: 'var(--teal)' }}>
                      {selectedInvoice.items.filter(item => !(item as any).isAlaPiece).reduce((total, item) => {
                        return total + (item.weight * (item.pricePerGram - metalPriceFor(item.metalTypeId)));
                      }, 0).toFixed(2)} DZD
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={closeSelectedInvoice} className="btn-outline px-6 py-2.5 rounded-xl text-sm font-bold">
                Fermer
              </button>
              <button
                onClick={() => selectedInvoice && printInvoice(settings, selectedInvoice, { type: 'sale' })}
                className="btn-gold px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"
              >
                <Printer size={16} /> {t.print}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT INVOICE MODAL ── */}
      {editingInvoice && (
        <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '40px' }}>
          <div className="modal-box" style={{ maxHeight: '88vh' }}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--gold-dim)', border: '1px solid rgba(201,168,76,0.25)' }}>
                  <Edit2 size={18} style={{ color: 'var(--gold)' }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Modifier Facture</h3>
                  <p className="text-xs" style={{ color: 'var(--silver-400)' }}>Mettre à jour les informations client</p>
                </div>
              </div>
              <button onClick={closeEditModal} className="btn-icon">
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="lux-label">Date</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="lux-input"
                    />
                  </div>
                  <div>
                    <label className="lux-label">Statut Paiement</label>
                    <select
                      value={editIsDebt ? 'debt' : 'paid'}
                      onChange={(e) => setEditIsDebt(e.target.value === 'debt')}
                      className="lux-select"
                    >
                      <option value="paid">Payé</option>
                      <option value="debt">Dette</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="lux-label">Nom Client</label>
                  <input
                    type="text"
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    className="lux-input"
                    placeholder="Nom du client"
                  />
                </div>

                <div>
                  <label className="lux-label">Téléphone Client</label>
                  <input
                    type="tel"
                    value={editClientPhone}
                    onChange={(e) => setEditClientPhone(e.target.value)}
                    className="lux-input"
                    placeholder="Numéro de téléphone"
                  />
                </div>

                <div className="pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                  <p className="lux-label mb-3">Articles</p>
                  <div className="space-y-3">
                    {editItems.map((item, idx) => (
                      <div key={idx} className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(13,17,23,0.5)', border: '1px solid var(--border)' }}>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="lux-label">Poids (g)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.weight}
                              onChange={(e) => {
                                const newItems = [...editItems];
                                newItems[idx].weight = parseFloat(e.target.value) || 0;
                                newItems[idx].totalPrice = newItems[idx].weight * newItems[idx].pricePerGram;
                                setEditItems(newItems);
                              }}
                              className="lux-input"
                            />
                          </div>
                          <div>
                            <label className="lux-label">Prix/g (DZD)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.pricePerGram}
                              onChange={(e) => {
                                const newItems = [...editItems];
                                newItems[idx].pricePerGram = parseFloat(e.target.value) || 0;
                                newItems[idx].totalPrice = newItems[idx].weight * newItems[idx].pricePerGram;
                                setEditItems(newItems);
                              }}
                              className="lux-input"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="lux-label">Total (DZD)</label>
                          <div className="lux-input font-bold text-gold-gradient cursor-default">
                            {item.totalPrice.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl flex justify-between items-center" style={{ background: 'var(--gold-dim)', border: '1px solid rgba(201,168,76,0.2)' }}>
                  <p className="lux-label mb-0">Total Facture</p>
                  <p className="text-lg font-black text-gold-gradient">
                    {editItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0).toLocaleString()} DZD
                  </p>
                </div>

                <div className="modal-footer" style={{ padding: '0', border: 'none', marginTop: '4px' }}>
                  <button type="button" onClick={closeEditModal} className="btn-outline px-6 py-2.5 rounded-xl text-sm font-bold flex-1">
                    Annuler
                  </button>
                  <button type="submit" className="btn-gold px-6 py-2.5 rounded-xl text-sm font-bold flex-1">
                    Enregistrer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE WITH RECOVERY MODAL ── */}
      {deletingWithRecoveryInvoice && (
        <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '40px' }}>
          <div className="modal-box modal-box-lg" style={{ maxHeight: '88vh' }}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--danger-bg)', border: '1px solid rgba(255,95,114,0.3)' }}>
                  <Trash2 size={18} style={{ color: 'var(--danger)' }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Supprimer & Récupérer Poids</h3>
                  <p className="text-xs" style={{ color: 'var(--silver-400)' }}>Supprimer la facture et restaurer le stock</p>
                </div>
              </div>
              <button onClick={closeDeleteRecovery} className="btn-icon">
                <X size={16} />
              </button>
            </div>

            <div className="modal-body space-y-5">
              {/* Invoice summary */}
              <div className="p-5 rounded-xl space-y-3" style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)' }}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="lux-label mb-1">Numéro Facture</p>
                    <p className="font-bold font-mono" style={{ color: 'var(--text-primary)' }}>#{deletingWithRecoveryInvoice.id.slice(-6)}</p>
                  </div>
                  <div>
                    <p className="lux-label mb-1">Date</p>
                    <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{new Date(deletingWithRecoveryInvoice.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="lux-label mb-1">Client</p>
                    <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{deletingWithRecoveryInvoice.clientName || 'Client de Passage'}</p>
                  </div>
                  <div>
                    <p className="lux-label mb-1">Créé par</p>
                    <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{getCreatorName(deletingWithRecoveryInvoice.workerId)}</p>
                  </div>
                </div>
              </div>

              {/* Items table */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <table className="lux-table">
                  <thead>
                    <tr>
                      <th>Article</th>
                      <th className="text-right">Poids / Qté</th>
                      <th className="text-right">Prix</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletingWithRecoveryInvoice.items.map((item, idx) => {
                      const isPieceItem = (item as any).isAlaPiece;
                      const stName = metalTypes.find(s => s.id === item.metalTypeId)?.name || '—';
                      return (
                        <tr key={idx}>
                          <td>
                            <p className="font-bold capitalize" style={{ color: 'var(--text-primary)' }}>{(t as any)[item.shape + 's'] || item.shape}</p>
                            <p className="text-xs" style={{ color: 'var(--silver-400)' }}>{stName}</p>
                          </td>
                          {isPieceItem ? (
                            <>
                              <td className="text-right font-bold" style={{ color: 'var(--text-primary)' }}>{(item as any).quantity} pcs</td>
                              <td className="text-right" style={{ color: 'var(--silver-400)' }}>{((item as any).pricePerPiece || 0).toLocaleString()} DZD/pcs</td>
                            </>
                          ) : (
                            <>
                              <td className="text-right font-bold" style={{ color: 'var(--text-primary)' }}>{item.weight}g</td>
                              <td className="text-right" style={{ color: 'var(--silver-400)' }}>{item.pricePerGram.toLocaleString()} DZD/g</td>
                            </>
                          )}
                          <td className="text-right font-bold text-gold-gradient">{item.totalPrice.toLocaleString()} DZD</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Stock recovery preview */}
              <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(143,163,184,0.06)', border: '1px solid var(--border)' }}>
                <p className="lux-label">Stock à Récupérer</p>
                <div className="flex flex-wrap gap-2">
                  {deletingWithRecoveryInvoice.items.map((item, idx) => {
                    const isPieceItem = (item as any).isAlaPiece;
                    return (
                      <div key={idx} className="px-4 py-2 rounded-xl" style={{ background: 'var(--card-hover)', border: '1px solid var(--border-bright)' }}>
                        <p className="text-xs font-bold capitalize" style={{ color: 'var(--silver-300)' }}>{(t as any)[item.shape + 's'] || item.shape}</p>
                        <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                          {isPieceItem ? `${(item as any).quantity} pcs` : `${item.weight}g`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Warning */}
              <div className="p-4 rounded-xl" style={{ background: 'var(--danger-bg)', border: '1px solid rgba(255,95,114,0.25)' }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--danger)' }}>⚠ Attention — Action irréversible</p>
                <p className="text-sm" style={{ color: 'rgba(255,95,114,0.8)' }}>
                  {language === 'ar'
                    ? 'سيتم حذف هذه الفاتورة نهائياً واسترجاع الوزن إلى المخزن. لا يمكن التراجع عن هذا الإجراء.'
                    : 'Cette facture sera supprimée définitivement et le poids sera récupéré au stockage.'}
                </p>
              </div>

              {/* Total */}
              <div className="p-4 rounded-xl flex justify-between items-center" style={{ background: 'var(--gold-dim)', border: '1px solid rgba(201,168,76,0.2)' }}>
                <p className="lux-label mb-0">Total Facture</p>
                <p className="text-2xl font-black text-gold-gradient">{deletingWithRecoveryInvoice.total.toLocaleString()} DZD</p>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={closeDeleteRecovery} className="btn-outline px-6 py-2.5 rounded-xl text-sm font-bold flex-1">
                Annuler
              </button>
              <button onClick={handleDeleteWithRecovery} className="btn-danger px-6 py-2.5 rounded-xl text-sm font-bold flex-1 flex items-center justify-center gap-2">
                <Trash2 size={16} />
                Confirmer Suppression
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellingInvoices;
