import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { WebOrder, WebOrderStatus } from '../../types';
import {
  ShoppingBag, Eye, Edit2, Trash2, CheckCircle, XCircle, Truck,
  Package, Flag, RotateCcw, X, Save, Search, Clock, AlertCircle
} from 'lucide-react';

const STATUS_LABELS: Record<WebOrderStatus, string> = {
  pending: 'En attente',
  accepted: 'Acceptée',
  in_delivery: 'En livraison',
  delivered: 'Livrée',
  finalized: 'Finalisée',
  cancelled: 'Annulée',
};

const STATUS_BADGE: Record<WebOrderStatus, string> = {
  pending: 'badge badge-gold',
  accepted: 'badge badge-info',
  in_delivery: 'badge badge-platinum',
  delivered: 'badge badge-success',
  finalized: 'badge badge-success',
  cancelled: 'badge badge-danger',
};

const ACTIVE_STATUSES: WebOrderStatus[] = ['pending', 'accepted', 'in_delivery', 'delivered'];

const WebsiteOrders: React.FC = () => {
  const { webOrders, webDeliveryCompanies, updateWebOrder, deleteWebOrder, finalizeWebOrder, cancelWebOrder, can } = useApp();
  const shouldReduce = useReducedMotion();
  const [view, setView] = useState<'active' | 'history'>('active');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<WebOrder | null>(null);
  const [editModal, setEditModal] = useState<WebOrder | null>(null);
  const [finalizeModal, setFinalizeModal] = useState<WebOrder | null>(null);
  const [editForm, setEditForm] = useState({ clientFullName: '', clientPhone: '', clientEmail: '', address: '' });

  const activeOrders = webOrders.filter(o => ACTIVE_STATUSES.includes(o.status));
  const historyOrders = webOrders.filter(o => !ACTIVE_STATUSES.includes(o.status));

  const filteredHistory = historyOrders.filter(o =>
    !search || o.clientFullName.toLowerCase().includes(search.toLowerCase()) || o.clientPhone.includes(search)
  );

  const companyName = (id: string) => webDeliveryCompanies.find(c => c.id === id)?.name || id;

  const openEdit = (o: WebOrder) => {
    setEditForm({ clientFullName: o.clientFullName, clientPhone: o.clientPhone, clientEmail: o.clientEmail || '', address: o.address });
    setEditModal(o);
  };



  const closeDetail = () => { setDetail(null);
  };

  const closeEditModal = () => { setEditModal(null);
  };

  const closeFinalizeModal = () => { setFinalizeModal(null);
  };

  const saveEdit = () => {
    if (!editModal) return;
    updateWebOrder(editModal.id, editForm);
    closeEditModal();
  };

  // Stats
  const stats: { label: string; count: number; badgeClass: string }[] = [
    { label: 'Total', count: webOrders.length, badgeClass: 'badge badge-platinum' },
    { label: 'En attente', count: webOrders.filter(o => o.status === 'pending').length, badgeClass: 'badge badge-gold' },
    { label: 'Acceptées', count: webOrders.filter(o => o.status === 'accepted').length, badgeClass: 'badge badge-info' },
    { label: 'En livraison', count: webOrders.filter(o => o.status === 'in_delivery').length, badgeClass: 'badge badge-platinum' },
    { label: 'Livrées', count: webOrders.filter(o => o.status === 'delivered').length, badgeClass: 'badge badge-success' },
    { label: 'Finalisées', count: webOrders.filter(o => o.status === 'finalized').length, badgeClass: 'badge badge-success' },
    { label: 'Annulées', count: webOrders.filter(o => o.status === 'cancelled').length, badgeClass: 'badge badge-danger' },
  ];

  const OrderCard: React.FC<{ o: WebOrder; isHistory?: boolean }> = ({ o, isHistory }) => (
    <div className="lux-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <p style={{ fontWeight: 800, color: 'var(--silver-100)', fontSize: 13, margin: 0 }}>{o.orderNumber}</p>
          <p style={{ fontSize: 11, color: 'var(--silver-400)', margin: '2px 0 0' }}>{new Date(o.createdAt).toLocaleString('fr-FR')}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span className={STATUS_BADGE[o.status]}>{STATUS_LABELS[o.status]}</span>
          {o.isPersonalized && <span className="badge badge-info">Personnalisé</span>}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        <p style={{ fontWeight: 700, color: 'var(--silver-100)', margin: 0 }}>{o.clientFullName}</p>
        <p style={{ color: 'var(--silver-300)', margin: 0 }}>{o.clientPhone}</p>
        <p style={{ color: 'var(--silver-300)', margin: 0 }}>{o.wilayaName} — {o.commune}</p>
        <p style={{ color: 'var(--silver-300)', margin: 0 }}>{companyName(o.deliveryCompanyId)} • {o.deliveryType === 'bureau' ? 'Bureau' : 'Domicile'}</p>
      </div>

      {o.items.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {o.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--silver-300)', gap: 8 }}>
              <span>
                {item.name} × {item.quantity}
                {item.size && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.30)', color: 'var(--gold)' }}>{item.size}</span>}
              </span>
              <span>{item.totalPrice.toLocaleString()} DA</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--silver-300)' }}>
          <span>Sous-total</span><span>{o.subtotal.toLocaleString()} DA</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--silver-300)' }}>
          <span>Livraison</span><span>{o.deliveryPrice.toLocaleString()} DA</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, color: 'var(--gold)' }}>
          <span>TOTAL</span><span>{o.total.toLocaleString()} DA</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 4 }}>
        <button onClick={() => setDetail(o)} className="btn-icon" title="Détails"><Eye size={14} /></button>
        <button onClick={() => openEdit(o)} className="btn-icon" title="Modifier"><Edit2 size={14} /></button>
        <button onClick={() => { if (confirm('Supprimer ?')) deleteWebOrder(o.id); }} style={can('websiteOrders.delete') ? undefined : { display: 'none' }} className="btn-icon danger" title="Supprimer"><Trash2 size={14} /></button>

        {!isHistory && (
          <>
            {o.status === 'pending' && (
              <button
                onClick={() => updateWebOrder(o.id, { status: 'accepted' })}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa' }}
              >
                <CheckCircle size={12} /> Accepter
              </button>
            )}
            {(o.status === 'pending' || o.status === 'accepted') && (
              <button
                onClick={() => updateWebOrder(o.id, { status: 'cancelled' })}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)' }}
              >
                <XCircle size={12} /> Annuler
              </button>
            )}
            {o.status === 'accepted' && (
              <button
                onClick={() => updateWebOrder(o.id, { status: 'in_delivery' })}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: '#a78bfa' }}
              >
                <Truck size={12} /> En livraison
              </button>
            )}
            {o.status === 'in_delivery' && (
              <button
                onClick={() => updateWebOrder(o.id, { status: 'delivered' })}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }}
              >
                <Package size={12} /> Livré
              </button>
            )}
            {o.status === 'delivered' && (
              <button
                onClick={() => setFinalizeModal(o)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.25)', color: '#2dd4bf' }}
              >
                <Flag size={12} /> Finaliser
              </button>
            )}
          </>
        )}

        {isHistory && o.status === 'finalized' && o.storageDeducted && (
          <button
            onClick={() => { if (confirm('Récupérer le stock et annuler cette commande ?')) cancelWebOrder(o.id, true); }}
            style={{ display: can('websiteOrders.cancel') ? 'flex' : 'none', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', color: 'var(--gold)' }}
          >
            <RotateCcw size={12} /> Récupérer stock
          </button>
        )}
      </div>
    </div>
  );

  return (
    <motion.div
      initial={shouldReduce ? false : { opacity: 0, y: 14, scale: 0.995 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] as any }}
      style={{ display: 'flex', flexDirection: 'column', gap: 32 }}
    >
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="silver-line" />
          <h1 className="section-title">Commandes Site Web</h1>
          <p className="section-subtitle">Suivi et gestion des commandes passées en ligne</p>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {stats.map(s => (
          <div key={s.label} className="lux-card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px' }}>
            <span style={{ fontSize: 12, color: 'var(--silver-300)', fontWeight: 600 }}>{s.label}</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--gold)' }}>{s.count}</span>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="lux-tabs">
        {[{ id: 'active' as const, label: 'Commandes en cours' }, { id: 'history' as const, label: 'Historique' }].map(t => (
          <button key={t.id} className={`lux-tab${view === t.id ? ' active' : ''}`} onClick={() => setView(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search (history only) */}
      {view === 'history' && (
        <div className="lux-search">
          <Search size={15} color="var(--silver-400)" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom ou téléphone..." />
        </div>
      )}

      {/* Orders grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {(view === 'active' ? activeOrders : filteredHistory).map(o => (
          <OrderCard key={o.id} o={o} isHistory={view === 'history'} />
        ))}
        {(view === 'active' ? activeOrders : filteredHistory).length === 0 && (
          <div style={{ gridColumn: '1/-1', padding: '64px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Clock size={40} color="var(--border)" />
            <p style={{ color: 'var(--silver-400)', fontSize: 13, fontWeight: 600, margin: 0 }}>
              Aucune commande {view === 'active' ? 'en cours' : "dans l'historique"}
            </p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {detail && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeDetail}>
            <motion.div
              className="modal-box"
              style={{ maxHeight: '90vh', overflowY: 'auto' }}
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <div>
                  <div className="silver-line" style={{ marginBottom: 6 }} />
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.03em', margin: 0 }}>Commande {detail.orderNumber}</h2>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>Détails complets</p>
                </div>
                <button onClick={closeDetail} className="btn-icon"><X size={18} /></button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Client', value: detail.clientFullName },
                    { label: 'Téléphone', value: detail.clientPhone },
                    ...(detail.clientEmail ? [{ label: 'Email', value: detail.clientEmail, full: true }] : []),
                    { label: 'Wilaya', value: detail.wilayaName },
                    { label: 'Commune', value: detail.commune },
                    { label: 'Adresse', value: detail.address, full: true },
                    { label: 'Société livraison', value: companyName(detail.deliveryCompanyId) },
                    { label: 'Type', value: detail.deliveryType === 'bureau' ? 'Bureau' : 'Domicile' },
                  ].map(({ label, value, full }) => (
                    <div key={label} style={full ? { gridColumn: '1/-1' } : {}}>
                      <span style={{ fontSize: 10, color: 'var(--silver-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 2 }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--silver-100)' }}>{value}</span>
                    </div>
                  ))}
                  <div>
                    <span style={{ fontSize: 10, color: 'var(--silver-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>Statut</span>
                    <span className={STATUS_BADGE[detail.status]}>{STATUS_LABELS[detail.status]}</span>
                  </div>
                </div>

                {detail.isPersonalized && detail.personalizedDetails && (
                  <div style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <p style={{ fontWeight: 800, color: '#a78bfa', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Commande personnalisée</p>
                    <p style={{ fontSize: 12, color: 'var(--silver-200)', margin: 0 }}>Type: {detail.personalizedDetails.metalType}</p>
                    <p style={{ fontSize: 12, color: 'var(--silver-200)', margin: 0 }}>Calibre: {detail.personalizedDetails.calibre}</p>
                    <p style={{ fontSize: 12, color: 'var(--silver-200)', margin: 0 }}>Forme: {detail.personalizedDetails.form}</p>
                    <p style={{ fontSize: 12, color: 'var(--silver-200)', margin: 0 }}>Poids max: {detail.personalizedDetails.maxGrams}g</p>
                    {detail.personalizedDetails.notes && <p style={{ fontSize: 12, color: 'var(--silver-200)', margin: 0 }}>Notes: {detail.personalizedDetails.notes}</p>}
                  </div>
                )}

                {detail.items.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                    <p style={{ fontWeight: 800, color: 'var(--silver-200)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Articles</p>
                    {detail.items.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--silver-300)', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                        <span>{item.name} × {item.quantity}</span>
                        <span style={{ fontWeight: 700 }}>{item.totalPrice.toLocaleString()} DA</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--silver-300)' }}>
                    <span>Sous-total</span><span>{detail.subtotal.toLocaleString()} DA</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--silver-300)' }}>
                    <span>Livraison</span><span>{detail.deliveryPrice.toLocaleString()} DA</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 900, color: 'var(--gold)' }}>
                    <span>TOTAL</span><span>{detail.total.toLocaleString()} DA</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeEditModal}>
            <motion.div
              className="modal-box"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <div>
                  <div className="silver-line" style={{ marginBottom: 6 }} />
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.03em', margin: 0 }}>Modifier la commande</h2>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>Informations client</p>
                </div>
                <button onClick={closeEditModal} className="btn-icon"><X size={18} /></button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: 'Nom complet', field: 'clientFullName' as const },
                  { label: 'Téléphone', field: 'clientPhone' as const },
                  { label: 'Email', field: 'clientEmail' as const },
                  { label: 'Adresse', field: 'address' as const },
                ].map(({ label, field }) => (
                  <div key={field}>
                    <label className="lux-label">{label}</label>
                    <input value={editForm[field]} onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))} className="lux-input" style={{ marginTop: 6 }} />
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button onClick={closeEditModal} className="btn-outline" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
                <button onClick={saveEdit} className="btn-gold" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Save size={15} /> Enregistrer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Finalize Modal */}
      <AnimatePresence>
        {finalizeModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeFinalizeModal}>
            <motion.div
              className="modal-box"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <div>
                  <div className="silver-line" style={{ marginBottom: 6 }} />
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.03em', margin: 0 }}>Finaliser la commande</h2>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>Confirmation de finalisation</p>
                </div>
                <button onClick={closeFinalizeModal} className="btn-icon"><X size={18} /></button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <p style={{ fontWeight: 800, color: 'var(--gold)', fontSize: 13, margin: 0 }}>{finalizeModal.orderNumber}</p>
                  <p style={{ fontSize: 12, color: 'var(--silver-200)', margin: 0 }}>Client: {finalizeModal.clientFullName}</p>
                  <p style={{ fontSize: 12, color: 'var(--silver-200)', margin: 0 }}>Total: {finalizeModal.total.toLocaleString()} DA</p>
                </div>
                {finalizeModal.items.some(i => i.metalTypeId && i.weight) && (
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertCircle size={15} color="var(--danger)" />
                      <p style={{ fontWeight: 800, color: 'var(--danger)', fontSize: 12, margin: 0 }}>Déductions de stock</p>
                    </div>
                    {finalizeModal.items.filter(i => i.metalTypeId && i.weight).map((item, idx) => (
                      <p key={idx} style={{ fontSize: 11, color: 'var(--danger)', margin: 0 }}>{item.name}: {item.weight}g sera déduit de l'inventaire</p>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button onClick={closeFinalizeModal} className="btn-outline" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
                <button
                  onClick={() => { finalizeWebOrder(finalizeModal.id); closeFinalizeModal(); }}
                  className="btn-gold"
                  style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <CheckCircle size={15} /> Confirmer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default WebsiteOrders;
