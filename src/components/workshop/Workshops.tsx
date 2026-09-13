
import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Plus, Warehouse, Phone, MapPin, History, Edit2, Trash2, X, Info, Eye } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { translations } from '../../i18n/translations';
import { Workshop } from '../../types';

const Workshops: React.FC = () => {
  const { workshops, addWorkshop, updateWorkshop, deleteWorkshop, commands, deliveries, language, can } = useApp();
  const shouldReduce = useReducedMotion();
  const t = translations[language];
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);
  const [selectedWorkshop, setSelectedWorkshop] = useState<string | null>(null);
  const [selectedCommandDetails, setSelectedCommandDetails] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      name: fd.get('name') as string,
      phone: fd.get('phone') as string,
      address: fd.get('address') as string,
    };

    if (editingWorkshop) {
      updateWorkshop(editingWorkshop.id, data);
    } else {
      addWorkshop(data);
    }

    closeModal();
  };

  const closeModal = () => {
    setShowAddModal(false); setEditingWorkshop(null);
  };

  const closeSelectedWorkshop = () => {
    setSelectedWorkshop(null);
  };

  const closeSelectedCommandDetails = () => {
    setSelectedCommandDetails(null);
  };

  const handleEdit = (w: Workshop) => {
    setEditingWorkshop(w);
    setShowAddModal(true);
  };

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
          <h1 className="section-title">{t.workshops}</h1>
          <p className="section-subtitle">Gestion des ateliers partenaires</p>
        </div>
        <button
          onClick={() => { setEditingWorkshop(null); setShowAddModal(true); }}
          className="btn-gold"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 16, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          <Plus size={18} />
          <span>{t.newWorkshop}</span>
        </button>
      </div>

      {/* Workshops grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
        {workshops.map(w => (
          <div key={w.id} className="lux-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: 52, height: 52, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Warehouse size={24} color="var(--gold)" />
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => handleEdit(w)} className="btn-icon" title="Modifier">
                  <Edit2 size={15} />
                </button>
                <button onClick={() => { if (confirm(t.delete + ' ?')) deleteWorkshop(w.id); }} style={can('workshops.delete') ? undefined : { display: 'none' }} className="btn-icon danger" title="Supprimer">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--silver-100)', margin: 0, letterSpacing: '-0.02em' }}>{w.name}</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--silver-300)' }}>
                <Phone size={15} color="var(--silver-400)" />
                <span style={{ fontWeight: 600 }}>{w.phone}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--silver-300)' }}>
                <MapPin size={15} color="var(--silver-400)" />
                <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.address}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedWorkshop(w.id)}
              className="btn-silver"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 0', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em' }}
            >
              <History size={15} color="var(--gold)" />
              {t.history}
            </button>
          </div>
        ))}
        {workshops.length === 0 && (
          <div style={{ gridColumn: '1/-1', padding: '80px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, border: '2px dashed var(--border)', borderRadius: 24 }}>
            <Warehouse size={48} color="var(--border)" />
            <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--silver-400)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>Aucun atelier enregistré</p>
          </div>
        )}
      </div>

      {/* Add/Edit Workshop Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
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
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.03em', margin: 0 }}>
                    {editingWorkshop ? t.edit : t.newWorkshop}
                  </h2>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>
                    Atelier partenaire
                  </p>
                </div>
                <button onClick={closeModal} className="btn-icon"><X size={18} /></button>
              </div>

              <form key={editingWorkshop?.id || 'new'} onSubmit={handleSubmit}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label className="lux-label">Nom de l'atelier</label>
                    <input
                      name="name"
                      required
                      defaultValue={editingWorkshop?.name}
                      placeholder="Ex: Atelier Chéraga"
                      className="lux-input"
                      style={{ marginTop: 6 }}
                    />
                  </div>
                  <div>
                    <label className="lux-label">Téléphone</label>
                    <input
                      name="phone"
                      required
                      defaultValue={editingWorkshop?.phone}
                      placeholder="05XX XX XX XX"
                      className="lux-input"
                      style={{ marginTop: 6 }}
                    />
                  </div>
                  <div>
                    <label className="lux-label">Adresse</label>
                    <textarea
                      name="address"
                      required
                      defaultValue={editingWorkshop?.address}
                      placeholder="Adresse complète"
                      className="lux-input"
                      rows={3}
                      style={{ marginTop: 6, resize: 'none' }}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" onClick={closeModal} className="btn-outline" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    Annuler
                  </button>
                  <button type="submit" className="btn-gold" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    Enregistrer
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Workshop History Modal */}
      <AnimatePresence>
        {selectedWorkshop && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSelectedWorkshop}
          >
            <motion.div
              className="modal-box"
              style={{ maxWidth: 680, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <div>
                  <div className="silver-line" style={{ marginBottom: 6 }} />
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.03em', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <History size={20} color="var(--gold)" />
                    {t.history}
                  </h2>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>
                    {workshops.find(w => w.id === selectedWorkshop)?.name}
                  </p>
                </div>
                <button onClick={closeSelectedWorkshop} className="btn-icon"><X size={18} /></button>
              </div>

              <div className="modal-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {commands.filter(c => c.workshopId === selectedWorkshop).map(c => (
                  <div
                    key={c.id}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: c.type === 'reparation' ? 'rgba(99,102,241,0.12)' : 'rgba(212,175,55,0.12)', border: c.type === 'reparation' ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(212,175,55,0.2)' }}>
                        <Info size={16} color={c.type === 'reparation' ? '#818cf8' : 'var(--gold)'} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 800, color: 'var(--silver-100)', fontSize: 13 }}>{c.clientName}</span>
                          <span
                            style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 6, background: c.type === 'reparation' ? 'rgba(99,102,241,0.1)' : 'rgba(212,175,55,0.1)', color: c.type === 'reparation' ? '#818cf8' : 'var(--gold)' }}
                          >
                            {t[c.type]}
                          </span>
                        </div>
                        <p style={{ fontSize: 10, color: 'var(--silver-400)', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>
                          {new Date(c.date).toLocaleDateString()}
                        </p>
                        {c.deliveryId && (
                          <p style={{ fontSize: 9, color: '#10b981', fontWeight: 800, margin: '2px 0 0' }}>Livraison assignée</p>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 900, color: 'var(--silver-100)', fontSize: 14, margin: 0 }}>{c.initialWeight}g</p>
                        <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '2px 0 0', color: c.status === 'pending' ? 'var(--gold)' : '#10b981' }}>
                          {t[c.status]}
                        </p>
                      </div>
                      <button onClick={() => setSelectedCommandDetails(c.id)} className="btn-icon">
                        <Eye size={15} />
                      </button>
                    </div>
                  </div>
                ))}
                {commands.filter(c => c.workshopId === selectedWorkshop).length === 0 && (
                  <p style={{ color: 'var(--silver-400)', fontSize: 13, textAlign: 'center', padding: '32px 0', fontWeight: 600 }}>Aucune commande pour cet atelier.</p>
                )}
              </div>

              <div style={{ padding: '16px 24px 24px', borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={closeSelectedWorkshop}
                  className="btn-outline"
                  style={{ width: '100%', padding: '12px 0', borderRadius: 14, fontSize: 13, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em' }}
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Command Details Modal */}
      <AnimatePresence>
        {selectedCommandDetails && (
          <motion.div
            className="modal-overlay"
            style={{ zIndex: 200 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSelectedCommandDetails}
          >
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
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.03em', margin: 0 }}>Détails de la commande</h2>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>Atelier / Réparation</p>
                </div>
                <button onClick={closeSelectedCommandDetails} className="btn-icon"><X size={18} /></button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {(() => {
                  const command = commands.find(c => c.id === selectedCommandDetails);
                  if (!command) return null;
                  const delivery = command.deliveryId ? deliveries.find(d => d.id === command.deliveryId) : null;
                  return (
                    <>
                      <div>
                        <p style={{ fontSize: 11, color: 'var(--silver-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Client</p>
                        <p style={{ fontWeight: 800, fontSize: 18, color: 'var(--silver-100)', margin: 0 }}>{command.clientName}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 11, color: 'var(--silver-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Téléphone</p>
                        <p style={{ fontWeight: 700, color: 'var(--silver-200)', margin: 0 }}>{command.clientPhone || '—'}</p>
                      </div>

                      <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                        <p style={{ fontSize: 11, color: 'var(--silver-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Type</p>
                        <span
                          style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 12px', borderRadius: 8, background: command.type === 'reparation' ? 'rgba(99,102,241,0.1)' : 'rgba(212,175,55,0.1)', color: command.type === 'reparation' ? '#818cf8' : 'var(--gold)', border: command.type === 'reparation' ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(212,175,55,0.2)' }}
                        >
                          {t[command.type]}
                        </span>
                      </div>

                      <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div>
                          <p style={{ fontSize: 11, color: 'var(--silver-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 3px' }}>Poids</p>
                          <p style={{ fontWeight: 800, color: 'var(--silver-100)', margin: 0 }}>{command.initialWeight}g</p>
                        </div>
                        <div>
                          <p style={{ fontSize: 11, color: 'var(--silver-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 3px' }}>Date</p>
                          <p style={{ fontWeight: 700, color: 'var(--silver-200)', margin: 0 }}>{new Date(command.date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: 11, color: 'var(--silver-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 3px' }}>Statut</p>
                          <p style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 12, margin: 0, color: command.status === 'pending' ? 'var(--gold)' : '#10b981' }}>
                            {t[command.status]}
                          </p>
                        </div>
                      </div>

                      {delivery && (
                        <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 14, padding: 14 }}>
                          <p style={{ fontSize: 11, color: 'var(--silver-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Livraison</p>
                          <p style={{ fontWeight: 800, color: 'var(--silver-100)', margin: '0 0 2px' }}>{delivery.fullName}</p>
                          <p style={{ fontSize: 13, color: 'var(--silver-300)', fontWeight: 700, margin: 0 }}>{delivery.phone}</p>
                          {command.deliveryPrice && (
                            <p style={{ fontSize: 14, fontWeight: 900, color: '#10b981', margin: '8px 0 0' }}>Prix: {command.deliveryPrice.toLocaleString()} DZD</p>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Workshops;
