
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Plus, Wrench, Hammer, CheckCircle, Clock, Trash2, Eye, Printer, X, Info, Calculator, Truck, Edit } from 'lucide-react';
import printInvoice from '../../utils/printInvoice';
import { useApp } from '../../context/AppContext';
import { translations } from '../../i18n/translations';
import { JewelryShape, Command } from '../../types';

const Commands: React.FC = () => {
  const { commands, workshops, metalTypes, deliveries, addCommand, updateCommand, deleteCommand, language, shapes, settings, calibres, addCalibre, deleteCalibre, metals, metalCategories, addMetal, deleteMetal, addPaymentAction, can } = useApp();
  const t = translations[language];
  const [activeSubTab, setActiveSubTab] = useState<'reparation' | 'industry'>('reparation');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);
  const [editingCommand, setEditingCommand] = useState<Command | null>(null);
  const [finalizingCommand, setFinalizingCommand] = useState<Command | null>(null);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string>('');
  const [deliveryPrice, setDeliveryPrice] = useState<string>('');
  const [newCalibreInput, setNewCalibreInput] = useState<string>('');
  const [showCalibreForm, setShowCalibreForm] = useState(false);
  const [newMetalInput, setNewMetalInput] = useState<string>('');
  // Metal picked in the "new order" form — narrows the calibre list below it.
  const [newCommandMetal, setNewCommandMetal] = useState<string>('');

  /** Calibres valid for a metal, falling back to the global list. */
  const calibresForMetal = (metalName: string) => {
    const cat = metalCategories.find(c => c.name === metalName);
    return cat && cat.calibres.length ? cat.calibres : calibres;
  };
  const [showMetalForm, setShowMetalForm] = useState(false);

  const [finalWeightInput, setFinalWeightInput] = useState('');
  const [workshopPriceInput, setWorkshopPriceInput] = useState('');
  const [clientPriceInput, setClientPriceInput] = useState('');
  const [amountPaidInput, setAmountPaidInput] = useState('');

  // Industry payment method states
  const [industryPaymentMethod, setIndustryPaymentMethod] = useState<'money' | 'cassie'>('money');
  const [selectedCassieId, setSelectedCassieId] = useState<string>('');
  const [workshopMoneyAmount, setWorkshopMoneyAmount] = useState<string>('');

  // Edit form states
  const [editClientName, setEditClientName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editMetal, setEditMetal] = useState('');
  const [editCalibre, setEditCalibre] = useState('');
  const [editInitialWeight, setEditInitialWeight] = useState('');
  const [editWorkshopId, setEditWorkshopId] = useState('');
  const [editShape, setEditShape] = useState('');
  const [editDeliveryId, setEditDeliveryId] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editPaidAmount, setEditPaidAmount] = useState('');

  // Finalize pricing states
  const [pricingMode, setPricingMode] = useState<'perGram' | 'total'>('perGram');
  const [pricePerGramInput, setPricePerGramInput] = useState<string>('');
  const [workshopCassieAmount, setWorkshopCassieAmount] = useState<string>('');
  const [workshopPricingMode, setWorkshopPricingMode] = useState<'perGram' | 'total'>('total');
  const [moneyClientPricingMode, setMoneyClientPricingMode] = useState<'perGram' | 'total'>('total');

  const filtered = commands.filter(c => c.type === activeSubTab);

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const commandData: any = {
      type: activeSubTab,
      clientName: fd.get('clientName') as string,
      clientPhone: fd.get('clientPhone') as string,
      metal: fd.get('metal') as string,
      calibre: fd.get('calibre') as string,
      initialWeight: parseFloat(fd.get('initialWeight') as string),
      workshopId: fd.get('workshopId') as string,
      date: new Date().toISOString(),
      status: 'pending',
      shape: (fd.get('shape') as JewelryShape) || undefined,
      paidAmount: parseFloat(fd.get('paidAmount') as string) || 0,
      deliveryId: (fd.get('deliveryId') as string) || undefined,
      note: (fd.get('note') as string) || undefined,
    };

    // Add industry-specific payment method fields
    if (activeSubTab === 'industry') {
      commandData.paymentMethod = industryPaymentMethod;
      if (industryPaymentMethod === 'cassie') {
        commandData.cassieTypeId = selectedCassieId;
      }
    }

    addCommand(commandData);
    closeShowAddModal();
    // Reset industry form fields
    setIndustryPaymentMethod('money');
    setSelectedCassieId('');
    setWorkshopMoneyAmount('');
  };

  const closeShowAddModal = () => { setShowAddModal(false);
  };
  const closeEditingCommand = () => { setEditingCommand(null);
  };
  const closeFinalizingCommand = () => { setFinalizingCommand(null);
  };
  const closeSelectedCommand = () => { setSelectedCommand(null);
  };

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCommand) return;

    const commandData: any = {
      clientName: editClientName,
      clientPhone: editClientPhone,
      metal: editMetal,
      calibre: editCalibre,
      initialWeight: parseFloat(editInitialWeight),
      workshopId: editWorkshopId,
      shape: editShape || undefined,
      paidAmount: parseFloat(editPaidAmount) || 0,
      deliveryId: editDeliveryId || undefined,
      note: editNote || undefined,
    };

    updateCommand(editingCommand.id, commandData);
    closeEditingCommand();
    // Reset edit form fields
    setEditClientName('');
    setEditClientPhone('');
    setEditMetal('');
    setEditCalibre('');
    setEditInitialWeight('');
    setEditWorkshopId('');
    setEditShape('');
    setEditDeliveryId('');
    setEditNote('');
    setEditPaidAmount('');
  };

  const handleFinalizeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!finalizingCommand) return;
    const finalWeight = parseFloat(finalWeightInput || '0');
    let workshopPrice = parseFloat(workshopPriceInput || '0');
    let clientPrice = parseFloat(clientPriceInput || '0');
    const paidAmount = parseFloat(amountPaidInput || '0');

    // Calculate workshop price based on workshop pricing mode
    if (workshopPricingMode === 'perGram') {
      workshopPrice = finalWeight * workshopPrice;
    }

    // Calculate client price based on pricing mode for cassie
    if (finalizingCommand.paymentMethod === 'cassie') {
      if (pricingMode === 'perGram') {
        const pricePerG = parseFloat(pricePerGramInput || '0');
        clientPrice = finalWeight * pricePerG;
      }
      // else: clientPrice already set from clientPriceInput
    }

    // Calculate client price for money payment based on pricing mode
    if (finalizingCommand.paymentMethod === 'money') {
      if (moneyClientPricingMode === 'perGram') {
        clientPrice = finalWeight * clientPrice;
      }
      // else: clientPrice already set from clientPriceInput
    }

    const remaining = Math.max(0, clientPrice - paidAmount);

    updateCommand(finalizingCommand.id, {
      finalWeight,
      workshopPrice,
      clientPrice,
      pricePerGram: pricingMode === 'perGram' ? parseFloat(pricePerGramInput || '0') : (finalizingCommand.paymentMethod === 'cassie' ? undefined : (finalWeight > 0 ? clientPrice / finalWeight : 0)),
      paidAmount,
      status: 'finalized',
      endDate: new Date().toISOString(),
      deliveryId: selectedDeliveryId || undefined,
      deliveryPrice: selectedDeliveryId ? parseFloat(deliveryPrice) || 0 : undefined,
      workshopCassieAmount: finalizingCommand.paymentMethod === 'cassie' ? parseFloat(workshopCassieAmount || '0') : undefined,
    });

    // Add payment record to delivery if assigned and price is set
    const amount = selectedDeliveryId && deliveryPrice ? parseFloat(deliveryPrice) : null;
    if (amount && !isNaN(amount) && amount > 0) {
      addPaymentAction(selectedDeliveryId, {
        amount: amount,
        date: new Date().toISOString(),
        method: 'cash',
      });
    }

    closeFinalizingCommand();
    setSelectedDeliveryId('');
    setDeliveryPrice('');
    setPricingMode('perGram');
    setWorkshopPricingMode('total');
    setMoneyClientPricingMode('total');
    setPricePerGramInput('');
    setWorkshopCassieAmount('');
  };

  useEffect(() => {
    if (!finalizingCommand) return;
    setFinalWeightInput(finalizingCommand.finalWeight?.toString() || finalizingCommand.initialWeight?.toString() || '');
    setWorkshopPriceInput(finalizingCommand.workshopPrice?.toString() || '');
    setClientPriceInput(finalizingCommand.clientPrice?.toString() || '');
    setAmountPaidInput(finalizingCommand.paidAmount?.toString() || '');
    setSelectedDeliveryId(finalizingCommand.deliveryId || '');
    setDeliveryPrice(finalizingCommand.deliveryPrice?.toString() || '');
    setPricePerGramInput(finalizingCommand.pricePerGram?.toString() || '');
    setWorkshopCassieAmount(finalizingCommand.workshopCassieAmount?.toString() || '');
    setWorkshopPricingMode('total');
    setMoneyClientPricingMode('total');
    if (finalizingCommand.paymentMethod === 'cassie' && finalizingCommand.pricePerGram) {
      setPricingMode('perGram');
    }
  }, [finalizingCommand]);

  useEffect(() => {
    if (!editingCommand) return;
    setEditClientName(editingCommand.clientName);
    setEditClientPhone(editingCommand.clientPhone);
    setEditMetal(editingCommand.metal || '');
    setEditCalibre(editingCommand.calibre || '');
    setEditInitialWeight(editingCommand.initialWeight?.toString() || '');
    setEditWorkshopId(editingCommand.workshopId);
    setEditShape(editingCommand.shape || '');
    setEditDeliveryId(editingCommand.deliveryId || '');
    setEditNote(editingCommand.note || '');
    setEditPaidAmount(editingCommand.paidAmount?.toString() || '');
  }, [editingCommand]);

  const statusStyle = (status: string) => {
    if (status === 'pending') return { borderColor: 'var(--gold-pure)', badgeClass: 'badge badge-warning' };
    if (status === 'finalized') return { borderColor: '#6366f1', badgeClass: 'badge badge-info' };
    return { borderColor: '#10b981', badgeClass: 'badge badge-success' };
  };

  const statusLabel = (status: string) => {
    if (status === 'pending') return 'En Attente';
    if (status === 'finalized') return 'Finalisé';
    return 'Payé';
  };

  return (
    <div className="animate-page-enter space-y-8">
      {/* PAGE HEADER */}
      <div>
        <div className="silver-line" />
        <h1 className="section-title">{t.commands}</h1>
        <p className="section-subtitle">Gestion des commandes & réparations</p>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="lux-tabs" style={{ width: 'auto' }}>
          <button
            className={`lux-tab${activeSubTab === 'reparation' ? ' active' : ''}`}
            onClick={() => setActiveSubTab('reparation')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Wrench size={14} /> {t.reparation}
          </button>
          <button
            className={`lux-tab${activeSubTab === 'industry' ? ' active' : ''}`}
            onClick={() => setActiveSubTab('industry')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Hammer size={14} /> {t.industry}
          </button>
        </div>
        <button
          onClick={() => { setShowAddModal(true); setIndustryPaymentMethod('money'); setSelectedCassieId(''); setWorkshopMoneyAmount(''); }}
          className="btn-silver"
          style={{ height: 44, borderRadius: 12, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          <Plus size={16} />
          {t.newCommand}
        </button>
      </div>

      {/* COMMAND CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((c, idx) => {
          const ss = statusStyle(c.status);
          return (
            <div
              key={c.id}
              className={`lux-card animate-slide-up stagger-${(idx % 4) + 1}`}
              style={{ padding: 22, borderLeft: `3px solid ${ss.borderColor}`, position: 'relative' }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 10 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink-900)', letterSpacing: '-0.02em', margin: '0 0 3px' }}>
                    {c.clientName}
                  </h3>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--platinum-400)', margin: 0, letterSpacing: '0.04em' }}>
                    {c.clientPhone}
                  </p>
                </div>
                <span className={ss.badgeClass} style={{ flexShrink: 0, fontSize: 10 }}>
                  {statusLabel(c.status)}
                </span>
              </div>

              {/* Meta info */}
              <div className="grid grid-cols-2 gap-2" style={{ marginBottom: 14 }}>
                <div style={{ background: 'var(--bg-muted)', borderRadius: 10, padding: '10px 12px' }}>
                  <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--platinum-400)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 3px' }}>{t.metal}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-900)', margin: 0, textTransform: 'capitalize' }}>{c.metal} {c.calibre}</p>
                </div>
                <div style={{ background: 'var(--bg-muted)', borderRadius: 10, padding: '10px 12px' }}>
                  <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--platinum-400)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 3px' }}>{t.weight}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-900)', margin: 0 }}>{c.initialWeight}g</p>
                </div>
                {c.shape && (
                  <div className="col-span-2" style={{ background: 'var(--bg-muted)', borderRadius: 10, padding: '10px 12px' }}>
                    <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--platinum-400)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 3px' }}>{t.shape || 'Forme'}</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-900)', margin: 0, textTransform: 'capitalize' }}>{(t as any)[c.shape + 's'] || c.shape}</p>
                  </div>
                )}
              </div>

              {/* Date & Workshop */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--platinum-100)' }}>
                <Clock size={13} style={{ color: 'var(--platinum-300)', flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--platinum-400)' }}>{new Date(c.date).toLocaleDateString()}</span>
                <span style={{ color: 'var(--platinum-200)' }}>•</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--platinum-600)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {workshops.find(w => w.id === c.workshopId)?.name}
                </span>
              </div>

              {/* Note */}
              {c.note && (
                <div style={{ background: 'var(--gold-muted)', border: '1px solid #E8C86B', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
                  <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--gold-deep)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>Note</p>
                  <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--gold-deep)', margin: 0 }}>{c.note}</p>
                </div>
              )}

              {/* Finalized details */}
              {c.status === 'finalized' && (
                <div style={{ background: 'var(--info-bg)', border: '1px solid #BFDBFE', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
                  <div className="grid grid-cols-2 gap-2" style={{ marginBottom: 8 }}>
                    {c.finalWeight && (
                      <div>
                        <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--info)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 2px' }}>Poids Final</p>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--info)', margin: 0 }}>{c.finalWeight}g</p>
                      </div>
                    )}
                    {c.workshopPrice && (
                      <div>
                        <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--info)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 2px' }}>Prix Atelier</p>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--info)', margin: 0 }}>{c.workshopPrice.toLocaleString()} DZD</p>
                      </div>
                    )}
                  </div>
                  {c.paymentMethod === 'cassie' && (
                    <div style={{ background: 'var(--gold-muted)', border: '1px solid #E8C86B', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                      <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--gold-deep)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 3px' }}>Paiement Cassie</p>
                      {c.workshopCassieAmount && <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold-deep)', margin: 0 }}>{c.workshopCassieAmount}g cassie atelier</p>}
                      {c.pricePerGram && <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold-deep)', margin: 0 }}>{c.pricePerGram} DZD/g</p>}
                    </div>
                  )}
                  {c.clientPrice && (
                    <div>
                      <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--info)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 2px' }}>Prix Client</p>
                      <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--info)', margin: 0, letterSpacing: '-0.02em' }}>{c.clientPrice.toLocaleString()} DZD</p>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                {c.status === 'pending' && (
                  <button
                    onClick={() => setFinalizingCommand(c)}
                    className="btn-silver"
                    style={{ flex: 1, height: 38, borderRadius: 10, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}
                  >
                    <CheckCircle size={14} /> {t.finalize}
                  </button>
                )}
                <button onClick={() => setEditingCommand(c)} className="btn-icon"><Edit size={15} /></button>
                <button onClick={() => setSelectedCommand(c)} className="btn-icon"><Eye size={15} /></button>
                <button onClick={() => deleteCommand(c.id)} style={can('commands.delete') ? undefined : { display: 'none' }} className="btn-icon danger"><Trash2 size={15} /></button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full" style={{ textAlign: 'center', padding: '60px 0' }}>
            <Wrench size={36} style={{ color: 'var(--platinum-200)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--platinum-400)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
              Aucun dossier dans cette catégorie
            </p>
          </div>
        )}
      </div>

      {/* ===== ADD MODAL ===== */}
      {showAddModal && (
        <div className="modal-overlay">
            <div className="modal-header">
              <div>
                <div className="silver-line" style={{ marginBottom: 6 }} />
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink-900)', letterSpacing: '-0.03em', margin: 0 }}>{t.newCommand}</h2>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--platinum-400)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>Saisissez les détails</p>
              </div>
              <button onClick={() => { closeShowAddModal(); setIndustryPaymentMethod('money'); setSelectedCassieId(''); setWorkshopMoneyAmount(''); }} className="btn-icon" style={{ flexShrink: 0 }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdd}>
              <div className="modal-body space-y-5">
                {/* Industry payment method selector */}
                {activeSubTab === 'industry' && (
                  <div style={{ background: 'var(--gold-muted)', border: '1px solid #E8C86B', borderRadius: 14, padding: '14px 16px' }}>
                    <label className="lux-label" style={{ color: 'var(--gold-deep)' }}>Mode de Paiement Atelier</label>
                    <div className="lux-tabs" style={{ marginTop: 8 }}>
                      <button type="button" className={`lux-tab${industryPaymentMethod === 'money' ? ' active' : ''}`} onClick={() => setIndustryPaymentMethod('money')}>
                        Espèces
                      </button>
                      <button type="button" className={`lux-tab${industryPaymentMethod === 'cassie' ? ' active' : ''}`} onClick={() => setIndustryPaymentMethod('cassie')}>
                        Cassie
                      </button>
                    </div>

                    {industryPaymentMethod === 'cassie' && (
                      <div style={{ marginTop: 12 }}>
                        <label className="lux-label">Type de Cassie</label>
                        <select value={selectedCassieId} onChange={(e) => setSelectedCassieId(e.target.value)} className="lux-select">
                          <option value="">-- Choisir une Cassie --</option>
                          {metalTypes.filter(st => st.isCassie).map(st => (
                            <option key={st.id} value={st.id}>
                              {st.name} ({st.calibre}) - {st.initialQuantity?.toLocaleString()} g disponible
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {industryPaymentMethod === 'money' && (
                      <div style={{ marginTop: 12 }}>
                        <label className="lux-label">Montant pour Atelier (DZD)</label>
                        <input type="number" value={workshopMoneyAmount} onChange={(e) => setWorkshopMoneyAmount(e.target.value)} placeholder="Ex: 50000" className="lux-input" />
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="lux-label">{t.clientName}</label>
                  <input name="clientName" required className="lux-input" placeholder="Nom du client" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="lux-label">{t.clientPhone}</label>
                    <input name="clientPhone" required className="lux-input" placeholder="05XX..." />
                  </div>
                  {(activeSubTab !== 'industry' || industryPaymentMethod === 'money') && (
                    <div>
                      <label className="lux-label">{t.metal}</label>
                      <select name="metal" value={newCommandMetal} onChange={(e) => setNewCommandMetal(e.target.value)} className="lux-select">
                        <option value="">-- Sélectionner --</option>
                        {metals.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {(activeSubTab !== 'industry' || industryPaymentMethod === 'money') && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="lux-label">{t.calibre}</label>
                      <select name="calibre" className="lux-select">
                        <option value="">-- Sélectionner --</option>
                        {calibresForMetal(newCommandMetal).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="lux-label">{t.weight} (g)</label>
                      <input name="initialWeight" type="number" step="0.01" required className="lux-input" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="lux-label">{t.workshop}</label>
                      <select name="workshopId" required className="lux-select">
                        <option value="">-- Sélectionner --</option>
                        {workshops.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {activeSubTab === 'industry' && industryPaymentMethod === 'cassie' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="lux-label">{t.weight} (g)</label>
                        <input name="initialWeight" type="number" step="0.01" required className="lux-input" placeholder="0.00" />
                      </div>
                      <div>
                        <label className="lux-label">{t.workshop}</label>
                        <select name="workshopId" required className="lux-select">
                          <option value="">-- Sélectionner --</option>
                          {workshops.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <input type="hidden" name="metal" value="" />
                    <input type="hidden" name="calibre" value="" />
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="lux-label">{t.selectShape}</label>
                    <select name="shape" className="lux-select">
                      <option value="">-- Optionnel --</option>
                      {shapes.map(s => <option key={s} value={s}>{(t as any)[s+'s'] || s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="lux-label">{t.deliveries}</label>
                    <select name="deliveryId" className="lux-select">
                      <option value="">-- Optionnel --</option>
                      {deliveries.map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="lux-label">{t.amountPaid} (DZD)</label>
                  <input name="paidAmount" type="number" step="0.01" className="lux-input" placeholder="0" />
                </div>

                <div>
                  <label className="lux-label">Note</label>
                  <textarea name="note" placeholder="Ajouter une note..." className="lux-input" style={{ resize: 'none', height: 72 }} />
                </div>

                {/* Metal manager */}
                <div style={{ background: 'var(--bg-muted)', borderRadius: 14, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <label className="lux-label" style={{ margin: 0 }}>Gérer Métaux</label>
                    <button type="button" onClick={() => setShowMetalForm(!showMetalForm)} style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold-pure)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {showMetalForm ? 'Fermer' : '+ Ajouter'}
                    </button>
                  </div>
                  {showMetalForm && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <input type="text" value={newMetalInput} onChange={(e) => setNewMetalInput(e.target.value)} placeholder="Ex: Or Rose, Platine…" className="lux-input" style={{ flex: 1, padding: '8px 12px', fontSize: 13 }} />
                      <button type="button" onClick={() => { if (newMetalInput.trim()) { addMetal(newMetalInput.trim()); setNewMetalInput(''); setShowMetalForm(false); } }} className="btn-silver" style={{ height: 40, borderRadius: 10, padding: '0 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        Ajouter
                      </button>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {metals.map(metal => (
                      <div key={metal} style={{ background: 'var(--bg-surface)', border: '1px solid var(--platinum-200)', borderRadius: 99, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-800)' }}>{metal}</span>
                        <button type="button" onClick={() => deleteMetal(metal)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--platinum-400)', display: 'flex' }}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Calibre manager (reparation only) */}
                {activeSubTab === 'reparation' && (
                  <div style={{ background: 'var(--bg-muted)', borderRadius: 14, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <label className="lux-label" style={{ margin: 0 }}>Gérer Calibres</label>
                      <button type="button" onClick={() => setShowCalibreForm(!showCalibreForm)} style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold-pure)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        {showCalibreForm ? 'Fermer' : '+ Ajouter'}
                      </button>
                    </div>
                    {showCalibreForm && (
                      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                        <input type="text" value={newCalibreInput} onChange={(e) => setNewCalibreInput(e.target.value)} placeholder="Ex: 925" className="lux-input" style={{ flex: 1, padding: '8px 12px', fontSize: 13 }} />
                        <button type="button" onClick={() => { if (newCalibreInput.trim()) { addCalibre(newCalibreInput.trim()); setNewCalibreInput(''); setShowCalibreForm(false); } }} className="btn-silver" style={{ height: 40, borderRadius: 10, padding: '0 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          Ajouter
                        </button>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {calibres.map(calibre => (
                        <div key={calibre} style={{ background: 'var(--bg-surface)', border: '1px solid var(--platinum-200)', borderRadius: 99, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-800)' }}>{calibre}</span>
                          <button type="button" onClick={() => deleteCalibre(calibre)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--platinum-400)', display: 'flex' }}>
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => { closeShowAddModal(); setIndustryPaymentMethod('money'); setSelectedCassieId(''); setWorkshopMoneyAmount(''); }} className="btn-outline" style={{ height: 42, borderRadius: 10, padding: '0 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Annuler
                </button>
                <button type="submit" className="btn-silver" style={{ height: 42, borderRadius: 10, padding: '0 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Enregistrer
                </button>
              </div>
            </form>
        </div>
      )}

      {/* ===== EDIT MODAL ===== */}
      {editingCommand && (
        <div className="modal-overlay">
            <div className="modal-header">
              <div>
                <div className="silver-line" style={{ marginBottom: 6 }} />
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink-900)', letterSpacing: '-0.03em', margin: 0 }}>Modifier Commande</h2>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--platinum-400)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>Modifiez les détails</p>
              </div>
              <button onClick={() => closeEditingCommand()} className="btn-icon" style={{ flexShrink: 0 }}><X size={18} /></button>
            </div>

            <form onSubmit={handleEdit}>
              <div className="modal-body space-y-5">
                <div>
                  <label className="lux-label">{t.clientName}</label>
                  <input value={editClientName} onChange={(e) => setEditClientName(e.target.value)} required className="lux-input" placeholder="Nom du client" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="lux-label">{t.clientPhone}</label>
                    <input value={editClientPhone} onChange={(e) => setEditClientPhone(e.target.value)} required className="lux-input" placeholder="05XX..." />
                  </div>
                  <div>
                    <label className="lux-label">{t.metal}</label>
                    <select value={editMetal} onChange={(e) => setEditMetal(e.target.value)} className="lux-select">
                      <option value="">-- Sélectionner --</option>
                      {metals.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="lux-label">{t.calibre}</label>
                    <select value={editCalibre} onChange={(e) => setEditCalibre(e.target.value)} className="lux-select">
                      <option value="">-- Sélectionner --</option>
                      {calibresForMetal(editMetal).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="lux-label">{t.weight} (g)</label>
                    <input value={editInitialWeight} onChange={(e) => setEditInitialWeight(e.target.value)} type="number" step="0.01" required className="lux-input" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="lux-label">{t.workshop}</label>
                    <select value={editWorkshopId} onChange={(e) => setEditWorkshopId(e.target.value)} required className="lux-select">
                      <option value="">-- Sélectionner --</option>
                      {workshops.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="lux-label">{t.selectShape}</label>
                    <select value={editShape} onChange={(e) => setEditShape(e.target.value)} className="lux-select">
                      <option value="">-- Optionnel --</option>
                      {shapes.map(s => <option key={s} value={s}>{(t as any)[s+'s'] || s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="lux-label">{t.deliveries}</label>
                    <select value={editDeliveryId} onChange={(e) => setEditDeliveryId(e.target.value)} className="lux-select">
                      <option value="">-- Optionnel --</option>
                      {deliveries.map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="lux-label">{t.amountPaid} (DZD)</label>
                  <input value={editPaidAmount} onChange={(e) => setEditPaidAmount(e.target.value)} type="number" step="0.01" className="lux-input" placeholder="0" />
                </div>
                <div>
                  <label className="lux-label">Note</label>
                  <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Ajouter une note..." className="lux-input" style={{ resize: 'none', height: 72 }} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => closeEditingCommand()} className="btn-outline" style={{ height: 42, borderRadius: 10, padding: '0 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
                <button type="submit" className="btn-silver" style={{ height: 42, borderRadius: 10, padding: '0 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Enregistrer</button>
              </div>
            </form>
        </div>
      )}

      {/* ===== FINALIZE MODAL ===== */}
      {finalizingCommand && (
        <div className="modal-overlay">
            <div className="modal-header">
              <div>
                <div className="silver-line" style={{ marginBottom: 6 }} />
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink-900)', letterSpacing: '-0.03em', margin: 0 }}>Finaliser Commande</h2>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--platinum-400)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>Complétez les détails</p>
              </div>
              <button onClick={() => { closeFinalizingCommand(); setPricingMode('perGram'); setPricePerGramInput(''); setWorkshopCassieAmount(''); setWorkshopPricingMode('total'); setMoneyClientPricingMode('total'); }} className="btn-icon" style={{ flexShrink: 0 }}>
                <X size={18} />
              </button>
            </div>

            <form key={finalizingCommand.id} onSubmit={handleFinalizeSubmit}>
              <div className="modal-body space-y-5">
                <div>
                  <label className="lux-label">Poids Final (g)</label>
                  <input value={finalWeightInput} onChange={e => setFinalWeightInput(e.target.value)} name="finalWeight" type="number" step="0.01" required className="lux-input" />
                </div>

                {/* Cassie payment section */}
                {finalizingCommand.paymentMethod === 'cassie' && finalizingCommand.cassieTypeId && (
                  <div style={{ background: 'var(--gold-muted)', border: '1px solid #E8C86B', borderRadius: 14, padding: '14px 16px' }}>
                    <h3 style={{ fontSize: 11, fontWeight: 800, color: 'var(--gold-deep)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>Détails Paiement Cassie</h3>
                    <div style={{ background: 'var(--bg-surface)', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
                      <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--gold-deep)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 3px' }}>Type de Cassie</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold-deep)', margin: 0 }}>
                        {metalTypes.find(st => st.id === finalizingCommand.cassieTypeId)?.name} ({metalTypes.find(st => st.id === finalizingCommand.cassieTypeId)?.calibre})
                      </p>
                    </div>
                    <div>
                      <label className="lux-label">Quantité Cassie pour Atelier (g)</label>
                      <input type="number" step="0.01" value={workshopCassieAmount} onChange={(e) => setWorkshopCassieAmount(e.target.value)} placeholder="0.00" className="lux-input" />
                    </div>
                  </div>
                )}

                {/* Workshop pricing */}
                <div style={{ background: 'var(--info-bg)', border: '1px solid #BFDBFE', borderRadius: 14, padding: '14px 16px' }}>
                  <label className="lux-label" style={{ color: 'var(--info)' }}>Prix Atelier - Mode de Calcul</label>
                  <div className="lux-tabs" style={{ marginTop: 8, marginBottom: 12 }}>
                    <button type="button" className={`lux-tab${workshopPricingMode === 'perGram' ? ' active' : ''}`} onClick={() => setWorkshopPricingMode('perGram')}>Par Gramme</button>
                    <button type="button" className={`lux-tab${workshopPricingMode === 'total' ? ' active' : ''}`} onClick={() => setWorkshopPricingMode('total')}>Montant Total</button>
                  </div>
                  <div>
                    <label className="lux-label">{workshopPricingMode === 'perGram' ? 'Prix par Gramme (DZD/g)' : 'Prix Total (DZD)'}</label>
                    <input type="number" step="1" value={workshopPriceInput} onChange={(e) => setWorkshopPriceInput(e.target.value)} placeholder={workshopPricingMode === 'perGram' ? 'Ex: 500' : 'Ex: 50000'} className="lux-input" />
                  </div>
                  {finalWeightInput && workshopPriceInput && (
                    <div style={{ background: 'var(--bg-surface)', borderRadius: 10, padding: '10px 12px', marginTop: 10 }}>
                      <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--info)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 3px' }}>
                        {workshopPricingMode === 'perGram' ? 'Prix Total Calculé' : 'Prix par Gramme'}
                      </p>
                      <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--info)', margin: 0 }}>
                        {workshopPricingMode === 'perGram'
                          ? (parseFloat(finalWeightInput) * parseFloat(workshopPriceInput)).toLocaleString() + ' DZD'
                          : (parseFloat(workshopPriceInput) / parseFloat(finalWeightInput)).toFixed(2) + ' DZD/g'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Client pricing */}
                <div style={{ background: 'var(--info-bg)', border: '1px solid #BFDBFE', borderRadius: 14, padding: '14px 16px' }}>
                  <label className="lux-label" style={{ color: 'var(--info)' }}>
                    {finalizingCommand.paymentMethod === 'cassie' ? 'Mode de Calcul du Prix Client' : 'Mode de Calcul du Prix'}
                  </label>
                  <div className="lux-tabs" style={{ marginTop: 8, marginBottom: 12 }}>
                    {finalizingCommand.paymentMethod === 'cassie' ? (
                      <>
                        <button type="button" className={`lux-tab${pricingMode === 'perGram' ? ' active' : ''}`} onClick={() => setPricingMode('perGram')}>Par Gramme</button>
                        <button type="button" className={`lux-tab${pricingMode === 'total' ? ' active' : ''}`} onClick={() => setPricingMode('total')}>Montant Total</button>
                      </>
                    ) : (
                      <>
                        <button type="button" className={`lux-tab${moneyClientPricingMode === 'perGram' ? ' active' : ''}`} onClick={() => setMoneyClientPricingMode('perGram')}>Par Gramme</button>
                        <button type="button" className={`lux-tab${moneyClientPricingMode === 'total' ? ' active' : ''}`} onClick={() => setMoneyClientPricingMode('total')}>Montant Total</button>
                      </>
                    )}
                  </div>
                  <div>
                    <label className="lux-label">
                      {(finalizingCommand.paymentMethod === 'cassie' ? pricingMode : moneyClientPricingMode) === 'perGram' ? 'Prix par Gramme (DZD/g)' : 'Prix Total (DZD)'}
                    </label>
                    <input
                      type="number" step="1"
                      value={finalizingCommand.paymentMethod === 'cassie' && pricingMode === 'perGram' ? pricePerGramInput : clientPriceInput}
                      onChange={(e) => {
                        if (finalizingCommand.paymentMethod === 'cassie' && pricingMode === 'perGram') setPricePerGramInput(e.target.value);
                        else setClientPriceInput(e.target.value);
                      }}
                      placeholder="Ex: 100000"
                      className="lux-input"
                    />
                  </div>
                  {finalWeightInput && (finalizingCommand.paymentMethod === 'cassie' ? pricePerGramInput || clientPriceInput : clientPriceInput) && (
                    <div style={{ background: 'var(--bg-surface)', borderRadius: 10, padding: '10px 12px', marginTop: 10 }}>
                      <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--info)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 3px' }}>
                        {(finalizingCommand.paymentMethod === 'cassie' ? pricingMode : moneyClientPricingMode) === 'perGram' ? 'Prix Total Calculé' : 'Prix par Gramme'}
                      </p>
                      <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--info)', margin: 0 }}>
                        {(() => {
                          const fw = parseFloat(finalWeightInput || '0');
                          const mode = finalizingCommand.paymentMethod === 'cassie' ? pricingMode : moneyClientPricingMode;
                          const val = finalizingCommand.paymentMethod === 'cassie' && pricingMode === 'perGram'
                            ? parseFloat(pricePerGramInput || '0')
                            : parseFloat(clientPriceInput || '0');
                          if (mode === 'perGram') return (fw * val).toLocaleString() + ' DZD';
                          return fw > 0 ? (val / fw).toFixed(2) + ' DZD/g' : '---';
                        })()}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="lux-label">Montant Versé par Client (DZD)</label>
                  <input value={amountPaidInput} onChange={e => setAmountPaidInput(e.target.value)} name="amountPaid" type="number" className="lux-input" placeholder="0" />
                </div>

                {/* Summary */}
                {finalWeightInput && amountPaidInput && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Poids Final', value: finalWeightInput + 'g' },
                      { label: 'Montant Versé', value: parseFloat(amountPaidInput || '0').toLocaleString() + ' DZD' },
                      { label: 'Reste à Payer', value: Math.max(0, parseFloat(clientPriceInput || '0') - parseFloat(amountPaidInput || '0')).toLocaleString() + ' DZD' },
                    ].map(item => (
                      <div key={item.label} style={{ background: 'var(--bg-muted)', borderRadius: 12, padding: '12px 14px' }}>
                        <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--platinum-400)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>{item.label}</p>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-900)', margin: 0 }}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="lux-label">Livreur (Optionnel)</label>
                  <select value={selectedDeliveryId || finalizingCommand.deliveryId || ''} onChange={(e) => setSelectedDeliveryId(e.target.value)} className="lux-select">
                    <option value="">-- Choisir un livreur --</option>
                    {deliveries.map(d => (
                      <option key={d.id} value={d.id}>{d.fullName} ({d.phone})</option>
                    ))}
                  </select>
                </div>

                {selectedDeliveryId && (
                  <div>
                    <label className="lux-label">Prix Livraison (DZD)</label>
                    <input type="number" step="0.01" value={deliveryPrice || finalizingCommand.deliveryPrice || ''} onChange={(e) => setDeliveryPrice(e.target.value)} placeholder="Ex: 5000" className="lux-input" />
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => { closeFinalizingCommand(); setPricingMode('perGram'); setPricePerGramInput(''); setWorkshopCassieAmount(''); setWorkshopPricingMode('total'); setMoneyClientPricingMode('total'); }} className="btn-outline" style={{ height: 42, borderRadius: 10, padding: '0 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Annuler
                </button>
                <button type="submit" className="btn-silver" style={{ height: 42, borderRadius: 10, padding: '0 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Confirmer
                </button>
              </div>
            </form>
        </div>
      )}

      {/* ===== DETAILS MODAL ===== */}
      {selectedCommand && (
        <div className="modal-overlay">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--gold-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Info size={16} style={{ color: 'var(--gold-deep)' }} />
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink-900)', letterSpacing: '-0.02em', margin: 0 }}>Détails Commande</h2>
              </div>
              <button onClick={() => closeSelectedCommand()} className="btn-icon" style={{ flexShrink: 0 }}><X size={18} /></button>
            </div>

            <div className="modal-body space-y-3">
              {[
                { label: 'Client', value: selectedCommand.clientName },
                { label: 'Poids Initial', value: selectedCommand.initialWeight + 'g' },
                { label: 'Montant Versé', value: (selectedCommand.paidAmount || 0).toLocaleString() + ' DZD' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-muted)', borderRadius: 12, padding: '12px 16px' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--platinum-400)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{item.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-900)' }}>{item.value}</span>
                </div>
              ))}

              {selectedCommand.clientPrice !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--warning-bg)', border: '1px solid #FDE68A', borderRadius: 12, padding: '12px 16px' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Reste à Payer</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--warning)' }}>{Math.max(0, (selectedCommand.clientPrice || 0) - (selectedCommand.paidAmount || 0)).toLocaleString()} DZD</span>
                </div>
              )}

              {selectedCommand.finalWeight && (
                <>
                  {[
                    { label: 'Poids Final', value: selectedCommand.finalWeight + 'g' },
                    { label: 'Prix Atelier', value: selectedCommand.workshopPrice?.toLocaleString() + ' DZD' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-muted)', borderRadius: 12, padding: '12px 16px' }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--platinum-400)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{item.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-900)' }}>{item.value}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--ink-900)', borderRadius: 12, padding: '12px 16px' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Prix Client</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--gold-pure)' }}>{selectedCommand.clientPrice?.toLocaleString()} DZD</span>
                  </div>
                  {selectedCommand.endDate && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--success-bg)', border: '1px solid #A7F3D0', borderRadius: 12, padding: '12px 16px' }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Finalisé le</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>{new Date(selectedCommand.endDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {selectedCommand.deliveryId && (
                    <div style={{ background: 'var(--success-bg)', border: '1px solid #A7F3D0', borderRadius: 12, padding: '12px 16px' }}>
                      <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>Livraison</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-900)', margin: '0 0 2px' }}>{deliveries.find(d => d.id === selectedCommand.deliveryId)?.fullName || 'Non trouvée'}</p>
                      <p style={{ fontSize: 12, color: 'var(--platinum-400)', margin: 0 }}>{deliveries.find(d => d.id === selectedCommand.deliveryId)?.phone}</p>
                      {selectedCommand.deliveryPrice && (
                        <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--success)', margin: '6px 0 0' }}>Prix: {selectedCommand.deliveryPrice.toLocaleString()} DZD</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => printInvoice(settings, selectedCommand, { type: 'command' })} className="btn-outline" style={{ height: 42, borderRadius: 10, padding: '0 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Printer size={15} /> {t.print}
              </button>
              <button onClick={() => closeSelectedCommand()} className="btn-silver" style={{ height: 42, borderRadius: 10, padding: '0 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Fermer</button>
            </div>
        </div>
      )}
    </div>
  );
};

export default Commands;
