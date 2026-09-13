import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import {
  Globe, Star, Truck, Phone, Settings as SettingsIcon,
  Plus, Eye, EyeOff, Edit2, Trash2, Link, X, Save,
  Image as ImageIcon, Gem, Facebook, Instagram, Mail,
  PhoneCall, MapPin, Send, Clock, Tag, Package,
  ToggleLeft, ToggleRight, CheckCircle, AlertCircle,
  TrendingUp, ShoppingBag, Zap,
} from 'lucide-react';
import { WebOffer, WebSpecialOffer, WebDeliveryCompany, WebWilayaPrice } from '../../types';
import { ALGERIA_WILAYAS } from '../../data/algeriaWilayas';
import { uploadImage, BUCKETS, type BucketName } from '../../lib/supabase';

type SubTab = 'offers' | 'specialOffers' | 'delivery' | 'contacts' | 'siteSettings';

const SUBTABS: { id: SubTab; label: string; icon: React.ElementType }[] = [
  { id: 'offers', label: 'Offres', icon: ShoppingBag },
  { id: 'specialOffers', label: 'Offres Spéciales', icon: Zap },
  { id: 'delivery', label: 'Livraison', icon: Truck },
  { id: 'contacts', label: 'Contacts', icon: Phone },
  { id: 'siteSettings', label: 'Paramètres', icon: SettingsIcon },
];

// ─── helpers ─────────────────────────────────────────────────────────────────

// Pictures are stored in a Supabase bucket and referenced by URL. Inlining
// them as base64 used to make every offer row — and every backup — enormous.
async function uploadTo(bucket: BucketName, file: File): Promise<string> {
  return uploadImage(bucket, file);
}

const Toggle: React.FC<{ on: boolean; onToggle: () => void; label: string }> = ({ on, onToggle, label }) => (
  <label
    onClick={onToggle}
    style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}
  >
    <div style={{
      width: 42, height: 23, borderRadius: 12, flexShrink: 0, position: 'relative',
      background: on ? 'linear-gradient(135deg, #C9A84C, #E8C96A)' : 'var(--border)',
      transition: 'background 0.25s', boxShadow: on ? '0 0 12px rgba(201,168,76,0.35)' : 'none',
    }}>
      <div style={{
        width: 19, height: 19, background: 'white', borderRadius: '50%',
        position: 'absolute', top: 2, left: on ? 21 : 2,
        transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </div>
    <span style={{ fontSize: 13, fontWeight: 600, color: on ? 'var(--silver-100)' : 'var(--silver-300)' }}>{label}</span>
  </label>
);

const Toast: React.FC<{ msg: string; type?: 'success' | 'error'; onClose: () => void }> = ({ msg, type = 'success', onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 10, scale: 0.95 }}
    style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
      background: 'var(--card-bg)', border: `1px solid ${type === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
      color: type === 'success' ? '#10b981' : '#ef4444',
      padding: '12px 20px', borderRadius: 14,
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
    }}
  >
    {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
    <span style={{ fontSize: 13, fontWeight: 700 }}>{msg}</span>
    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: 4, opacity: 0.7 }}>
      <X size={13} />
    </button>
  </motion.div>
);

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: string | number; color?: string }> = ({
  icon: Icon, label, value, color = 'var(--gold)',
}) => (
  <div className="lux-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
    <div style={{
      width: 44, height: 44, borderRadius: 14, flexShrink: 0,
      background: `${color}1A`, border: `1px solid ${color}33`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon size={20} color={color} />
    </div>
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-400)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--silver-100)', margin: 0, lineHeight: 1.2 }}>{value}</p>
    </div>
  </div>
);

// ─── image upload area ─────────────────────────────────────────────────────

const ImageUpload: React.FC<{
  image: string | null;
  onChange: (url: string | null) => void;
  bucket?: BucketName;
}> = ({ image, onChange, bucket = BUCKETS.products }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file: File) => {
    setError('');
    setBusy(true);
    try {
      onChange(await uploadTo(bucket, file));
    } catch (e: any) {
      setError(e?.message || "Échec de l'envoi de l'image");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className="lux-label">Image</label>
      <div
        onClick={() => ref.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        style={{
          marginTop: 8, height: 190, borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
          background: dragging ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.03)',
          border: `2px dashed ${dragging ? 'var(--gold)' : 'var(--border)'}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s', position: 'relative',
        }}
      >
        {image ? (
          <>
            <img src={image} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: 0, transition: 'opacity 0.2s',
            }}
              className="img-upload-hover"
            >
              <ImageIcon size={24} color="white" />
              <span style={{ fontSize: 11, color: 'white', fontWeight: 700 }}>Changer l'image</span>
            </div>
          </>
        ) : (
          <>
            <ImageIcon size={28} color="var(--silver-400)" />
            <span style={{ fontSize: 12, color: 'var(--silver-400)', marginTop: 8, fontWeight: 600 }}>Cliquer ou glisser-déposer</span>
          </>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={async e => { if (e.target.files?.[0]) { handleFile(e.target.files[0]); } }} />
      {busy && (
        <p style={{ fontSize: 11.5, color: 'var(--gold)', margin: '6px 0 0', fontWeight: 700 }}>
          Envoi de l'image…
        </p>
      )}
      {error && (
        <p style={{ fontSize: 11.5, color: 'var(--danger)', margin: '6px 0 0', fontWeight: 600 }}>{error}</p>
      )}
      {image && !busy && (
        <button
          onClick={e => { e.stopPropagation(); onChange(null); }}
          className="btn-outline"
          style={{ marginTop: 6, width: '100%', padding: '6px 0', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
        >
          Retirer l'image
        </button>
      )}
    </div>
  );
};

// ─── OFFER FORM MODAL ─────────────────────────────────────────────────────────

const OFFER_EMPTY = {
  name: '', image: null as string | null,
  metalTypeId: '', calibre: '', form: '',
  pricingMode: 'perGram' as 'perGram' | 'alaPiece',
  weight: 0, pricePerGram: 0, totalPrice: 0, unitPrice: 0,
  showQuantity: false, quantity: 0, showWeight: false, isHidden: false,
};

interface OfferModalProps {
  open: boolean;
  onClose: () => void;
  editing: WebOffer | null;
  onSave: (payload: Omit<WebOffer, 'id' | 'createdAt'>) => void;
  metalTypes: any[];
  shapes: string[];
}

const OfferModal: React.FC<OfferModalProps> = ({ open, onClose, editing, onSave, metalTypes, shapes }) => {
  const { categoryLabel } = useApp();
  const [f, setF] = useState({ ...OFFER_EMPTY });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calcMode, setCalcMode] = useState<'pgToTotal' | 'totalToPg'>('pgToTotal');

  useEffect(() => {
    if (editing) {
      setF({
        name: editing.name, image: editing.image,
        metalTypeId: editing.metalTypeId, calibre: editing.calibre, form: editing.form,
        pricingMode: editing.pricingMode,
        weight: editing.weight ?? 0, pricePerGram: editing.pricePerGram ?? 0,
        totalPrice: editing.totalPrice, unitPrice: editing.unitPrice ?? 0,
        showQuantity: editing.showQuantity, quantity: editing.quantity ?? 0,
        showWeight: editing.showWeight, isHidden: editing.isHidden,
      });
    } else {
      setF({ ...OFFER_EMPTY });
    }
    setCalcMode('pgToTotal');
    setErrors({});
  }, [editing, open]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = 'Nom requis';
    if (!f.metalTypeId) e.metalTypeId = 'Type de métal requis';
    if (f.pricingMode === 'perGram') {
      if (!f.weight) e.weight = 'Poids requis';
      if (calcMode === 'pgToTotal' && !f.pricePerGram) e.pricePerGram = 'Prix/g requis';
      if (calcMode === 'totalToPg' && !f.totalPrice) e.totalPrice = 'Total requis';
    }
    if (f.pricingMode === 'alaPiece' && !f.unitPrice) e.unitPrice = 'Prix unitaire requis';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const total = f.pricingMode === 'perGram' ? (f.totalPrice || 0) : f.unitPrice || 0;
    onSave({ ...f, totalPrice: total });
    onClose();
  };

  const setMetal = (id: string) => {
    const st = metalTypes.find((s: any) => s.id === id);
    setF(prev => ({ ...prev, metalTypeId: id, calibre: st?.calibre || '' }));
  };

  const ErrMsg = ({ field }: { field: string }) =>
    errors[field] ? <span style={{ fontSize: 11, color: '#ef4444', marginTop: 3, display: 'block' }}>{errors[field]}</span> : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="modal-box"
            style={{ maxWidth: 780, width: '95vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <div>
                <div className="silver-line" style={{ marginBottom: 6 }} />
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.03em', margin: 0 }}>
                  {editing ? 'Modifier l\'offre' : 'Nouvelle Offre'}
                </h2>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>
                  Gestion des offres produit
                </p>
              </div>
              <button onClick={onClose} className="btn-icon"><X size={18} /></button>
            </div>

            {/* Body */}
            <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, alignItems: 'start' }}>
                {/* Left: image + name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <ImageUpload image={f.image} onChange={img => setF(prev => ({ ...prev, image: img }))} />
                  <div>
                    <label className="lux-label">Nom de l'offre</label>
                    <input
                      value={f.name}
                      onChange={e => setF(prev => ({ ...prev, name: e.target.value }))}
                      className="lux-input"
                      style={{ marginTop: 6, borderColor: errors.name ? '#ef4444' : undefined }}
                      placeholder="Ex: Bague 925 Rosace"
                    />
                    <ErrMsg field="name" />
                  </div>
                </div>

                {/* Right: all fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label className="lux-label">Type de métal</label>
                      <select
                        value={f.metalTypeId} onChange={e => setMetal(e.target.value)}
                        className="lux-select" style={{ marginTop: 6, borderColor: errors.metalTypeId ? '#ef4444' : undefined }}
                      >
                        <option value="">-- Choisir --</option>
                        {metalTypes.filter((s: any) => !s.isCassie).map((s: any) => (
                          <option key={s.id} value={s.id}>{categoryLabel(s.id)} · {s.name}</option>
                        ))}
                      </select>
                      <ErrMsg field="metalTypeId" />
                    </div>
                    <div>
                      <label className="lux-label">Calibre</label>
                      <input
                        value={f.calibre} onChange={e => setF(prev => ({ ...prev, calibre: e.target.value }))}
                        className="lux-input" style={{ marginTop: 6 }} placeholder="Ex: 925"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="lux-label">Forme</label>
                    <select value={f.form} onChange={e => setF(prev => ({ ...prev, form: e.target.value }))} className="lux-select" style={{ marginTop: 6 }}>
                      <option value="">-- Choisir une forme --</option>
                      {shapes.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* Pricing mode */}
                  <div>
                    <label className="lux-label">Mode de tarification</label>
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                      {(['perGram', 'alaPiece'] as const).map(m => (
                        <button
                          key={m}
                          onClick={() => setF(prev => ({ ...prev, pricingMode: m }))}
                          style={{
                            flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            background: f.pricingMode === m ? 'rgba(201,168,76,0.18)' : 'transparent',
                            border: `1.5px solid ${f.pricingMode === m ? 'var(--gold)' : 'var(--border)'}`,
                            color: f.pricingMode === m ? 'var(--gold)' : 'var(--silver-300)',
                            transition: 'all 0.2s',
                          }}
                        >
                          {m === 'perGram' ? 'Au Gramme' : 'À la Pièce'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pricing fields */}
                  <AnimatePresence mode="wait">
                    {f.pricingMode === 'perGram' ? (
                      <motion.div key="pg" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                      >
                        {/* Calc mode sub-toggle */}
                        <div style={{ display: 'flex', gap: 8 }}>
                          {(['pgToTotal', 'totalToPg'] as const).map(m => (
                            <button
                              key={m}
                              onClick={() => {
                                setCalcMode(m);
                                if (m === 'pgToTotal') setF(prev => ({ ...prev, totalPrice: (prev.weight || 0) * (prev.pricePerGram || 0) }));
                                else setF(prev => ({ ...prev, pricePerGram: prev.weight > 0 && prev.totalPrice > 0 ? +(prev.totalPrice / prev.weight).toFixed(2) : prev.pricePerGram }));
                              }}
                              style={{
                                flex: 1, padding: '7px 0', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                                background: calcMode === m ? 'rgba(255,255,255,0.07)' : 'transparent',
                                border: `1.5px solid ${calcMode === m ? 'var(--silver-300)' : 'var(--border)'}`,
                                color: calcMode === m ? 'var(--silver-100)' : 'var(--silver-400)',
                                transition: 'all 0.2s',
                              }}
                            >
                              {m === 'pgToTotal' ? 'Poids + Prix/g → Total' : 'Poids + Total → Prix/g'}
                            </button>
                          ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <label className="lux-label">Poids (g)</label>
                            <input
                              type="number" value={f.weight || ''}
                              onChange={e => {
                                const w = +e.target.value;
                                setF(prev => ({
                                  ...prev, weight: w,
                                  ...(calcMode === 'pgToTotal'
                                    ? { totalPrice: w * (prev.pricePerGram || 0) }
                                    : { pricePerGram: w > 0 && prev.totalPrice > 0 ? +(prev.totalPrice / w).toFixed(2) : 0 }
                                  )
                                }));
                              }}
                              className="lux-input" style={{ marginTop: 6, borderColor: errors.weight ? '#ef4444' : undefined }}
                              placeholder="0.00"
                            />
                            <ErrMsg field="weight" />
                          </div>
                          {calcMode === 'pgToTotal' ? (
                            <div>
                              <label className="lux-label">Prix / g (DA)</label>
                              <input
                                type="number" value={f.pricePerGram || ''}
                                onChange={e => {
                                  const pg = +e.target.value;
                                  setF(prev => ({ ...prev, pricePerGram: pg, totalPrice: (prev.weight || 0) * pg }));
                                }}
                                className="lux-input" style={{ marginTop: 6, borderColor: errors.pricePerGram ? '#ef4444' : undefined }}
                                placeholder="0"
                              />
                              <ErrMsg field="pricePerGram" />
                            </div>
                          ) : (
                            <div>
                              <label className="lux-label">Prix / g (DA)</label>
                              <div style={{
                                marginTop: 6, padding: '10px 14px', borderRadius: 12,
                                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                                fontSize: 14, fontWeight: 700, color: 'var(--silver-200)',
                              }}>
                                {f.pricePerGram > 0 ? f.pricePerGram.toFixed(2) : '—'} DA/g
                              </div>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="lux-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            Total (DA)
                            {calcMode === 'pgToTotal' && (
                              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--gold)', background: 'rgba(201,168,76,0.12)', padding: '1px 6px', borderRadius: 4, letterSpacing: '0.05em' }}>MODIFIABLE</span>
                            )}
                          </label>
                          <input
                            type="number"
                            value={f.totalPrice || ''}
                            onChange={e => {
                              const t = +e.target.value;
                              setF(prev => ({
                                ...prev, totalPrice: t,
                                ...(calcMode === 'totalToPg' && prev.weight > 0 ? { pricePerGram: +(t / prev.weight).toFixed(2) } : {})
                              }));
                            }}
                            className="lux-input"
                            style={{
                              marginTop: 6, fontSize: 16, fontWeight: 800, color: 'var(--gold)',
                              background: 'rgba(201,168,76,0.06)', borderColor: errors.totalPrice ? '#ef4444' : 'rgba(201,168,76,0.3)',
                            }}
                            placeholder="0"
                          />
                          <ErrMsg field="totalPrice" />
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="ap" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                        <label className="lux-label">Prix unitaire (DA)</label>
                        <input
                          type="number" value={f.unitPrice || ''}
                          onChange={e => setF(prev => ({ ...prev, unitPrice: +e.target.value }))}
                          className="lux-input" style={{ marginTop: 6, borderColor: errors.unitPrice ? '#ef4444' : undefined }}
                          placeholder="0"
                        />
                        <ErrMsg field="unitPrice" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Toggles */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: 12, padding: '16px',
                    background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '1px solid var(--border)',
                  }}>
                    <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>Options d'affichage</p>
                    <Toggle on={f.showQuantity} onToggle={() => setF(prev => ({ ...prev, showQuantity: !prev.showQuantity }))} label="Afficher la quantité" />
                    <Toggle on={f.showWeight} onToggle={() => setF(prev => ({ ...prev, showWeight: !prev.showWeight }))} label="Afficher le poids sur la carte" />
                    <Toggle on={f.isHidden} onToggle={() => setF(prev => ({ ...prev, isHidden: !prev.isHidden }))} label="Masquer l'offre sur le site" />
                  </div>

                  {/* Quantity (conditional) */}
                  <AnimatePresence>
                    {f.showQuantity && (
                      <motion.div
                        key="qty"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <label className="lux-label">Quantité disponible</label>
                        <input
                          type="number" value={f.quantity || ''}
                          onChange={e => setF(prev => ({ ...prev, quantity: +e.target.value }))}
                          className="lux-input" style={{ marginTop: 6 }}
                          placeholder="0"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer" style={{ flexShrink: 0 }}>
              <button onClick={onClose} className="btn-outline" style={{ padding: '10px 28px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
              <button onClick={handleSave} className="btn-gold" style={{ padding: '10px 28px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Save size={15} /> {editing ? 'Enregistrer' : 'Créer l\'offre'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── SPECIAL OFFER FORM MODAL ─────────────────────────────────────────────────

const SOFFER_EMPTY = {
  name: '', image: null as string | null,
  metalTypeId: '', calibre: '', form: '',
  pricingMode: 'perGram' as 'perGram' | 'alaPiece',
  weight: 0, pricePerGram: 0, originalPrice: 0, specialPrice: 0, unitPrice: 0,
  showQuantity: false, quantity: 0, showWeight: false, isHidden: false, isActive: true,
  startDate: '', startHour: '08:00', endDate: '', endHour: '23:59',
};

interface SpecialOfferModalProps {
  open: boolean;
  onClose: () => void;
  editing: WebSpecialOffer | null;
  onSave: (payload: Omit<WebSpecialOffer, 'id' | 'createdAt'>) => void;
  metalTypes: any[];
  shapes: string[];
}

const SpecialOfferModal: React.FC<SpecialOfferModalProps> = ({ open, onClose, editing, onSave, metalTypes, shapes }) => {
  const { categoryLabel } = useApp();
  const [f, setF] = useState({ ...SOFFER_EMPTY });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calcMode, setCalcMode] = useState<'pgToTotal' | 'totalToPg'>('pgToTotal');

  useEffect(() => {
    if (editing) {
      setF({
        name: editing.name, image: editing.image,
        metalTypeId: editing.metalTypeId, calibre: editing.calibre, form: editing.form,
        pricingMode: editing.pricingMode,
        weight: editing.weight ?? 0, pricePerGram: editing.pricePerGram ?? 0,
        originalPrice: editing.originalPrice, specialPrice: editing.specialPrice,
        unitPrice: editing.unitPrice ?? 0,
        showQuantity: editing.showQuantity, quantity: editing.quantity ?? 0,
        showWeight: editing.showWeight, isHidden: editing.isHidden, isActive: editing.isActive,
        startDate: editing.startDate, startHour: editing.startHour,
        endDate: editing.endDate, endHour: editing.endHour,
      });
    } else {
      setF({ ...SOFFER_EMPTY });
    }
    setCalcMode('pgToTotal');
    setErrors({});
  }, [editing, open]);

  const discountPct = f.originalPrice > 0 && f.specialPrice > 0
    ? Math.round((f.originalPrice - f.specialPrice) / f.originalPrice * 100)
    : 0;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = 'Nom requis';
    if (!f.metalTypeId) e.metalTypeId = 'Type de métal requis';
    if (f.pricingMode === 'perGram') {
      if (!f.weight) e.weight = 'Poids requis';
      if (calcMode === 'pgToTotal' && !f.pricePerGram) e.pricePerGram = 'Prix/g requis';
      if (calcMode === 'totalToPg' && !f.originalPrice) e.originalPrice = 'Prix de base requis';
    }
    if (f.pricingMode === 'alaPiece' && !f.unitPrice) e.unitPrice = 'Prix unitaire requis';
    if (!f.specialPrice) e.specialPrice = 'Prix spécial requis';
    if (!f.endDate) e.endDate = 'Date de fin requise';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ ...f });
    onClose();
  };

  const setMetal = (id: string) => {
    const st = metalTypes.find((s: any) => s.id === id);
    setF(prev => ({ ...prev, metalTypeId: id, calibre: st?.calibre || '' }));
  };

  const ErrMsg = ({ field }: { field: string }) =>
    errors[field] ? <span style={{ fontSize: 11, color: '#ef4444', marginTop: 3, display: 'block' }}>{errors[field]}</span> : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="modal-box"
            style={{ maxWidth: 820, width: '95vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <div>
                <div className="silver-line" style={{ marginBottom: 6 }} />
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.03em', margin: 0 }}>
                  {editing ? 'Modifier l\'offre spéciale' : 'Nouvelle Offre Spéciale'}
                </h2>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>
                  Offres promotionnelles avec compte à rebours
                </p>
              </div>
              <button onClick={onClose} className="btn-icon"><X size={18} /></button>
            </div>

            {/* Body */}
            <div className="modal-body" style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 22 }}>
              {/* Top row: image + base info */}
              <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: 22, alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <ImageUpload image={f.image} bucket={BUCKETS.offers} onChange={img => setF(prev => ({ ...prev, image: img }))} />
                  <div>
                    <label className="lux-label">Nom</label>
                    <input
                      value={f.name} onChange={e => setF(prev => ({ ...prev, name: e.target.value }))}
                      className="lux-input" style={{ marginTop: 6, borderColor: errors.name ? '#ef4444' : undefined }}
                      placeholder="Nom de l'offre"
                    />
                    <ErrMsg field="name" />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="lux-label">Type de métal</label>
                      <select value={f.metalTypeId} onChange={e => setMetal(e.target.value)}
                        className="lux-select" style={{ marginTop: 6, borderColor: errors.metalTypeId ? '#ef4444' : undefined }}>
                        <option value="">-- Choisir --</option>
                        {metalTypes.filter((s: any) => !s.isCassie).map((s: any) => (
                          <option key={s.id} value={s.id}>{categoryLabel(s.id)} · {s.name}</option>
                        ))}
                      </select>
                      <ErrMsg field="metalTypeId" />
                    </div>
                    <div>
                      <label className="lux-label">Calibre</label>
                      <input value={f.calibre} onChange={e => setF(prev => ({ ...prev, calibre: e.target.value }))}
                        className="lux-input" style={{ marginTop: 6 }} placeholder="Ex: 925" />
                    </div>
                  </div>
                  <div>
                    <label className="lux-label">Forme</label>
                    <select value={f.form} onChange={e => setF(prev => ({ ...prev, form: e.target.value }))} className="lux-select" style={{ marginTop: 6 }}>
                      <option value="">-- Choisir une forme --</option>
                      {shapes.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {/* Pricing mode */}
                  <div>
                    <label className="lux-label">Mode de tarification</label>
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                      {(['perGram', 'alaPiece'] as const).map(m => (
                        <button key={m} onClick={() => setF(prev => ({ ...prev, pricingMode: m }))} style={{
                          flex: 1, padding: '9px 0', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          background: f.pricingMode === m ? 'rgba(201,168,76,0.18)' : 'transparent',
                          border: `1.5px solid ${f.pricingMode === m ? 'var(--gold)' : 'var(--border)'}`,
                          color: f.pricingMode === m ? 'var(--gold)' : 'var(--silver-300)', transition: 'all 0.2s',
                        }}>
                          {m === 'perGram' ? 'Au Gramme' : 'À la Pièce'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <AnimatePresence mode="wait">
                    {f.pricingMode === 'perGram' ? (
                      <motion.div key="pg" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {/* Calc mode sub-toggle */}
                        <div style={{ display: 'flex', gap: 8 }}>
                          {(['pgToTotal', 'totalToPg'] as const).map(m => (
                            <button key={m} onClick={() => {
                              setCalcMode(m);
                              if (m === 'pgToTotal') setF(prev => ({ ...prev, originalPrice: (prev.weight || 0) * (prev.pricePerGram || 0) }));
                              else setF(prev => ({ ...prev, pricePerGram: prev.weight > 0 && prev.originalPrice > 0 ? +(prev.originalPrice / prev.weight).toFixed(2) : prev.pricePerGram }));
                            }} style={{
                              flex: 1, padding: '7px 0', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                              background: calcMode === m ? 'rgba(255,255,255,0.07)' : 'transparent',
                              border: `1.5px solid ${calcMode === m ? 'var(--silver-300)' : 'var(--border)'}`,
                              color: calcMode === m ? 'var(--silver-100)' : 'var(--silver-400)', transition: 'all 0.2s',
                            }}>
                              {m === 'pgToTotal' ? 'Poids + Prix/g → Prix original' : 'Poids + Prix original → Prix/g'}
                            </button>
                          ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <label className="lux-label">Poids (g)</label>
                            <input type="number" value={f.weight || ''} onChange={e => {
                              const w = +e.target.value;
                              setF(prev => ({
                                ...prev, weight: w,
                                ...(calcMode === 'pgToTotal'
                                  ? { originalPrice: w * (prev.pricePerGram || 0) }
                                  : { pricePerGram: w > 0 && prev.originalPrice > 0 ? +(prev.originalPrice / w).toFixed(2) : 0 }
                                )
                              }));
                            }}
                              className="lux-input" style={{ marginTop: 6, borderColor: errors.weight ? '#ef4444' : undefined }} placeholder="0.00" />
                            <ErrMsg field="weight" />
                          </div>
                          {calcMode === 'pgToTotal' ? (
                            <div>
                              <label className="lux-label">Prix / g (DA)</label>
                              <input type="number" value={f.pricePerGram || ''} onChange={e => {
                                const pg = +e.target.value;
                                setF(prev => ({ ...prev, pricePerGram: pg, originalPrice: (prev.weight || 0) * pg }));
                              }}
                                className="lux-input" style={{ marginTop: 6, borderColor: errors.pricePerGram ? '#ef4444' : undefined }} placeholder="0" />
                              <ErrMsg field="pricePerGram" />
                            </div>
                          ) : (
                            <div>
                              <label className="lux-label">Prix / g (DA)</label>
                              <div style={{
                                marginTop: 6, padding: '10px 14px', borderRadius: 12,
                                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                                fontSize: 14, fontWeight: 700, color: 'var(--silver-200)',
                              }}>
                                {f.pricePerGram > 0 ? f.pricePerGram.toFixed(2) : '—'} DA/g
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="ap" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                        <label className="lux-label">Prix unitaire (DA)</label>
                        <input type="number" value={f.unitPrice || ''} onChange={e => setF(prev => ({ ...prev, unitPrice: +e.target.value }))}
                          className="lux-input" style={{ marginTop: 6 }} />
                        <ErrMsg field="unitPrice" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Promotional section */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Tag size={15} color="var(--gold)" />
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
                      Paramètres promotionnels
                    </p>
                  </div>
                  {discountPct > 0 && (
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#ef4444', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', padding: '4px 12px', borderRadius: 8 }}>
                      -{discountPct}% de réduction
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                  <div>
                    <label className="lux-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Prix original (DA)
                      {f.pricingMode === 'perGram' && calcMode === 'pgToTotal' && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--gold)', background: 'rgba(201,168,76,0.12)', padding: '1px 6px', borderRadius: 4, letterSpacing: '0.05em' }}>AUTO</span>
                      )}
                    </label>
                    <input
                      type="number" value={f.originalPrice || ''}
                      onChange={e => {
                        const p = +e.target.value;
                        setF(prev => ({
                          ...prev, originalPrice: p,
                          ...(prev.pricingMode === 'perGram' && calcMode === 'totalToPg' && prev.weight > 0
                            ? { pricePerGram: +(p / prev.weight).toFixed(2) }
                            : {}
                          )
                        }));
                      }}
                      className="lux-input" style={{ marginTop: 6, borderColor: errors.originalPrice ? '#ef4444' : undefined }}
                      placeholder="0"
                    />
                    <ErrMsg field="originalPrice" />
                  </div>
                  <div>
                    <label className="lux-label">Prix spécial (DA)</label>
                    <input
                      type="number" value={f.specialPrice || ''}
                      onChange={e => setF(prev => ({ ...prev, specialPrice: +e.target.value }))}
                      className="lux-input" style={{ marginTop: 6, borderColor: errors.specialPrice ? '#ef4444' : undefined }}
                      placeholder="0"
                    />
                    <ErrMsg field="specialPrice" />
                  </div>
                </div>

                <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                  <div>
                    <label className="lux-label">Date début</label>
                    <input type="date" value={f.startDate} onChange={e => setF(prev => ({ ...prev, startDate: e.target.value }))}
                      className="lux-input" style={{ marginTop: 6 }} />
                  </div>
                  <div>
                    <label className="lux-label">Heure début</label>
                    <input type="time" value={f.startHour} onChange={e => setF(prev => ({ ...prev, startHour: e.target.value }))}
                      className="lux-input" style={{ marginTop: 6 }} />
                  </div>
                  <div>
                    <label className="lux-label">Date fin</label>
                    <input type="date" value={f.endDate} onChange={e => setF(prev => ({ ...prev, endDate: e.target.value }))}
                      className="lux-input" style={{ marginTop: 6, borderColor: errors.endDate ? '#ef4444' : undefined }} />
                    <ErrMsg field="endDate" />
                  </div>
                  <div>
                    <label className="lux-label">Heure fin</label>
                    <input type="time" value={f.endHour} onChange={e => setF(prev => ({ ...prev, endHour: e.target.value }))}
                      className="lux-input" style={{ marginTop: 6 }} />
                  </div>
                </div>

                <div style={{
                  marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 16, padding: '14px 16px',
                  background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid var(--border)',
                }}>
                  <Toggle on={f.isActive} onToggle={() => setF(prev => ({ ...prev, isActive: !prev.isActive }))} label="Offre active" />
                  <Toggle on={f.showQuantity} onToggle={() => setF(prev => ({ ...prev, showQuantity: !prev.showQuantity }))} label="Afficher quantité" />
                  <Toggle on={f.showWeight} onToggle={() => setF(prev => ({ ...prev, showWeight: !prev.showWeight }))} label="Afficher poids" />
                  <Toggle on={f.isHidden} onToggle={() => setF(prev => ({ ...prev, isHidden: !prev.isHidden }))} label="Masquer sur le site" />
                </div>

                <AnimatePresence>
                  {f.showQuantity && (
                    <motion.div key="qty" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden', marginTop: 14 }}>
                      <label className="lux-label">Quantité disponible</label>
                      <input type="number" value={f.quantity || ''} onChange={e => setF(prev => ({ ...prev, quantity: +e.target.value }))} className="lux-input" style={{ marginTop: 6 }} placeholder="0" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer" style={{ flexShrink: 0 }}>
              <button onClick={onClose} className="btn-outline" style={{ padding: '10px 28px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
              <button onClick={handleSave} className="btn-gold" style={{ padding: '10px 28px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Save size={15} /> {editing ? 'Enregistrer' : 'Créer l\'offre spéciale'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── Offer Card ───────────────────────────────────────────────────────────────

const OfferCard: React.FC<{
  offer: WebOffer;
  metalTypeLabel: (id: string) => string;
  onEdit: () => void;
  onDelete: () => void;
  onDetail: () => void;
  onToggleHide: () => void;
  onCopyLink: () => void;
}> = ({ offer, metalTypeLabel, onEdit, onDelete, onDetail, onToggleHide, onCopyLink }) => (
  <motion.div
    className="lux-card"
    style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}
    whileHover={{ y: -2, transition: { duration: 0.2 } }}
    layout
  >
    {/* Image */}
    <div style={{ height: 170, background: 'rgba(255,255,255,0.03)', position: 'relative', overflow: 'hidden' }}>
      {offer.image
        ? <img src={offer.image} alt={offer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(201,168,76,0.04)' }}>
            <Gem size={36} color="var(--silver-400)" />
          </div>
      }
      {/* Status overlay badge */}
      <div style={{ position: 'absolute', top: 10, right: 10 }}>
        <span style={{
          fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 20, letterSpacing: '0.06em', textTransform: 'uppercase',
          background: offer.isHidden ? 'rgba(0,0,0,0.7)' : 'rgba(16,185,129,0.85)',
          color: 'white', backdropFilter: 'blur(4px)',
        }}>
          {offer.isHidden ? 'Masqué' : 'Visible'}
        </span>
      </div>
    </div>

    {/* Content */}
    <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h3 style={{ fontWeight: 800, color: 'var(--silver-100)', fontSize: 14, margin: 0, lineHeight: 1.3 }}>{offer.name}</h3>
      <p style={{ fontSize: 11, color: 'var(--silver-300)', margin: 0 }}>
        {metalTypeLabel(offer.metalTypeId)} {offer.calibre ? `• ${offer.calibre}` : ''} {offer.form ? `• ${offer.form}` : ''}
      </p>
      <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--gold)', margin: 0 }}>
        {offer.pricingMode === 'perGram'
          ? `${offer.totalPrice.toLocaleString()} DA`
          : `${offer.unitPrice?.toLocaleString()} DA / pièce`}
      </p>
      {offer.showQuantity && offer.quantity !== undefined && (
        <p style={{ fontSize: 11, color: 'var(--silver-400)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Package size={11} /> {offer.quantity} en stock
        </p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 10, flexWrap: 'wrap', borderTop: '1px solid var(--border)' }}>
        <button onClick={onDetail} className="btn-icon" title="Voir détails"><Eye size={14} /></button>
        <button onClick={onEdit} className="btn-icon" title="Modifier"><Edit2 size={14} /></button>
        <button onClick={onDelete} className="btn-icon danger" title="Supprimer"><Trash2 size={14} /></button>
        <button onClick={onToggleHide} className="btn-icon" title={offer.isHidden ? 'Afficher' : 'Masquer'}>
          {offer.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
        <button onClick={onCopyLink} className="btn-icon" title="Copier le lien"><Link size={14} /></button>
      </div>
    </div>
  </motion.div>
);

// ─── Special Offer Card ───────────────────────────────────────────────────────

const Countdown: React.FC<{ endDate: string; endHour: string }> = ({ endDate, endHour }) => {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    const end = new Date(`${endDate}T${endHour || '23:59'}`);
    const update = () => {
      const diff = end.getTime() - Date.now();
      if (diff <= 0) { setRemaining('Expiré'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining(d > 0 ? `${d}j ${h}h ${m}m` : `${h}h ${m}m`);
    };
    update();
    const iv = setInterval(update, 30000);
    return () => clearInterval(iv);
  }, [endDate, endHour]);
  const expired = remaining === 'Expiré';
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4,
      color: expired ? 'var(--silver-400)' : '#ef4444',
    }}>
      <Clock size={11} /> {remaining}
    </span>
  );
};

const SpecialOfferCard: React.FC<{
  offer: WebSpecialOffer;
  metalTypeLabel: (id: string) => string;
  onEdit: () => void;
  onDelete: () => void;
  onDetail: () => void;
  onToggleHide: () => void;
  onToggleActive: () => void;
  onCopyLink: () => void;
}> = ({ offer, metalTypeLabel, onEdit, onDelete, onDetail, onToggleHide, onToggleActive, onCopyLink }) => {
  const discountPct = offer.originalPrice > 0 ? Math.round((offer.originalPrice - offer.specialPrice) / offer.originalPrice * 100) : 0;

  return (
    <motion.div
      className="lux-card"
      style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      layout
    >
      {/* Image */}
      <div style={{ height: 170, background: 'rgba(255,255,255,0.03)', position: 'relative', overflow: 'hidden' }}>
        {offer.image
          ? <img src={offer.image} alt={offer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(201,168,76,0.04)' }}>
              <Star size={36} color="var(--silver-400)" />
            </div>
        }
        {/* Discount badge */}
        {discountPct > 0 && (
          <div style={{ position: 'absolute', top: 10, left: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 800, padding: '5px 10px', borderRadius: 20, background: '#ef4444', color: 'white', letterSpacing: '0.04em' }}>
              -{discountPct}%
            </span>
          </div>
        )}
        {/* Status */}
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <span style={{
            fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 20, letterSpacing: '0.06em', textTransform: 'uppercase',
            background: offer.isActive && !offer.isHidden ? 'rgba(201,168,76,0.85)' : 'rgba(0,0,0,0.7)',
            color: 'white', backdropFilter: 'blur(4px)',
          }}>
            {offer.isHidden ? 'Masqué' : offer.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h3 style={{ fontWeight: 800, color: 'var(--silver-100)', fontSize: 14, margin: 0, lineHeight: 1.3 }}>{offer.name}</h3>
        <p style={{ fontSize: 11, color: 'var(--silver-300)', margin: 0 }}>
          {metalTypeLabel(offer.metalTypeId)} {offer.calibre ? `• ${offer.calibre}` : ''} {offer.form ? `• ${offer.form}` : ''}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, textDecoration: 'line-through', color: 'var(--silver-400)' }}>
            {offer.originalPrice.toLocaleString()} DA
          </span>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--gold)' }}>
            {offer.specialPrice.toLocaleString()} DA
          </span>
        </div>
        {offer.endDate && <Countdown endDate={offer.endDate} endHour={offer.endHour} />}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 10, flexWrap: 'wrap', borderTop: '1px solid var(--border)' }}>
          <button onClick={onDetail} className="btn-icon" title="Détails"><Eye size={14} /></button>
          <button onClick={onEdit} className="btn-icon" title="Modifier"><Edit2 size={14} /></button>
          <button onClick={onDelete} className="btn-icon danger" title="Supprimer"><Trash2 size={14} /></button>
          <button onClick={onToggleHide} className="btn-icon" title={offer.isHidden ? 'Afficher' : 'Masquer'}>
            {offer.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          <button
            onClick={onToggleActive}
            style={{
              padding: '6px 8px', borderRadius: 8, border: `1px solid ${offer.isActive ? 'rgba(16,185,129,0.4)' : 'var(--border)'}`,
              background: offer.isActive ? 'rgba(16,185,129,0.1)' : 'transparent',
              color: offer.isActive ? '#10b981' : 'var(--silver-400)', cursor: 'pointer', fontSize: 10, fontWeight: 700,
            }}
            title={offer.isActive ? 'Désactiver' : 'Activer'}
          >
            {offer.isActive ? 'ON' : 'OFF'}
          </button>
          <button onClick={onCopyLink} className="btn-icon" title="Lien"><Link size={14} /></button>
        </div>
      </div>
    </motion.div>
  );
};

// ─── OFFERS TAB ───────────────────────────────────────────────────────────────

const OffersTab: React.FC = () => {
  const { webOffers, addWebOffer, updateWebOffer, deleteWebOffer, metalTypes, shapes } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<WebOffer | null>(null);
  const [detail, setDetail] = useState<WebOffer | null>(null);
  const [toast, setToast] = useState('');

  const metalTypeLabel = (id: string) => metalTypes.find(s => s.id === id)?.name || id;

  const handleSave = (payload: Omit<WebOffer, 'id' | 'createdAt'>) => {
    if (editing) updateWebOffer(editing.id, payload);
    else addWebOffer(payload);
    setToast(editing ? 'Offre modifiée !' : 'Offre créée !');
    setTimeout(() => setToast(''), 3000);
  };

  const handleDelete = (id: string) => {
    if (confirm('Supprimer cette offre ?')) {
      deleteWebOffer(id);
      setToast('Offre supprimée');
      setTimeout(() => setToast(''), 3000);
    }
  };

  const visible = webOffers.filter(o => !o.isHidden).length;
  const hidden = webOffers.filter(o => o.isHidden).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Stats */}
      {webOffers.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <StatCard icon={ShoppingBag} label="Total offres" value={webOffers.length} />
          <StatCard icon={Eye} label="Visibles" value={visible} color="#10b981" />
          <StatCard icon={EyeOff} label="Masquées" value={hidden} color="var(--silver-300)" />
        </div>
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--silver-100)', margin: 0 }}>
          Toutes les offres <span style={{ fontSize: 13, color: 'var(--silver-400)', fontWeight: 600 }}>({webOffers.length})</span>
        </h2>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="btn-gold"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 14, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          <Plus size={16} /> Nouvelle Offre
        </button>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 18 }}>
        {webOffers.map(o => (
          <OfferCard
            key={o.id}
            offer={o}
            metalTypeLabel={metalTypeLabel}
            onEdit={() => { setEditing(o); setShowModal(true); }}
            onDelete={() => handleDelete(o.id)}
            onDetail={() => setDetail(o)}
            onToggleHide={() => updateWebOffer(o.id, { isHidden: !o.isHidden })}
            onCopyLink={() => {
              navigator.clipboard.writeText(window.location.origin + '/shop?offer=' + o.id);
              setToast('Lien copié !');
              setTimeout(() => setToast(''), 2500);
            }}
          />
        ))}
      </div>

      {webOffers.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingBag size={28} color="var(--gold)" />
          </div>
          <div>
            <p style={{ color: 'var(--silver-100)', fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>Aucune offre</p>
            <p style={{ color: 'var(--silver-400)', fontSize: 13, margin: 0 }}>Créez votre première offre pour la publier sur le site</p>
          </div>
          <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-gold"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 14, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={15} /> Créer une offre
          </button>
        </div>
      )}

      <OfferModal
        open={showModal}
        onClose={() => setShowModal(false)}
        editing={editing}
        onSave={handleSave}
        metalTypes={metalTypes}
        shapes={shapes}
      />

      {/* Detail Modal */}
      <AnimatePresence>
        {detail && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDetail(null)}>
            <motion.div className="modal-box" style={{ maxWidth: 480 }}
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <div>
                  <div className="silver-line" style={{ marginBottom: 6 }} />
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.03em', margin: 0 }}>Détails de l'offre</h2>
                </div>
                <button onClick={() => setDetail(null)} className="btn-icon"><X size={18} /></button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {detail.image && <img src={detail.image} style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 14 }} alt="" />}
                {[
                  { label: 'Nom', value: detail.name },
                  { label: 'Métal', value: metalTypeLabel(detail.metalTypeId) },
                  { label: 'Calibre', value: detail.calibre || '—' },
                  { label: 'Forme', value: detail.form || '—' },
                  { label: 'Mode prix', value: detail.pricingMode === 'perGram' ? 'Au gramme' : 'À la pièce' },
                  ...(detail.pricingMode === 'perGram' ? [
                    { label: 'Poids', value: `${detail.weight ?? 0} g` },
                    { label: 'Prix/g', value: `${detail.pricePerGram ?? 0} DA` },
                  ] : []),
                  { label: 'Prix total', value: `${detail.totalPrice.toLocaleString()} DA`, gold: true },
                  { label: 'Statut', value: detail.isHidden ? 'Masqué' : 'Visible', success: !detail.isHidden },
                ].map(({ label, value, gold, success }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--silver-400)', fontWeight: 600 }}>{label}</span>
                    <span style={{ fontWeight: 700, color: gold ? 'var(--gold)' : success ? '#10b981' : 'var(--silver-100)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{toast && <Toast msg={toast} onClose={() => setToast('')} />}</AnimatePresence>
    </div>
  );
};

// ─── SPECIAL OFFERS TAB ───────────────────────────────────────────────────────

const SpecialOffersTab: React.FC = () => {
  const { webSpecialOffers, addWebSpecialOffer, updateWebSpecialOffer, deleteWebSpecialOffer, metalTypes, shapes } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<WebSpecialOffer | null>(null);
  const [detail, setDetail] = useState<WebSpecialOffer | null>(null);
  const [toast, setToast] = useState('');

  const metalTypeLabel = (id: string) => metalTypes.find(s => s.id === id)?.name || id;
  const discountPct = (orig: number, sp: number) => orig > 0 ? Math.round((orig - sp) / orig * 100) : 0;

  const handleSave = (payload: Omit<WebSpecialOffer, 'id' | 'createdAt'>) => {
    if (editing) updateWebSpecialOffer(editing.id, payload);
    else addWebSpecialOffer(payload);
    setToast(editing ? 'Offre spéciale modifiée !' : 'Offre spéciale créée !');
    setTimeout(() => setToast(''), 3000);
  };

  const handleDelete = (id: string) => {
    if (confirm('Supprimer cette offre spéciale ?')) {
      deleteWebSpecialOffer(id);
      setToast('Offre supprimée');
      setTimeout(() => setToast(''), 3000);
    }
  };

  const active = webSpecialOffers.filter(o => o.isActive && !o.isHidden).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {webSpecialOffers.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <StatCard icon={Zap} label="Total spéciales" value={webSpecialOffers.length} color="#ef4444" />
          <StatCard icon={TrendingUp} label="Actives" value={active} color="#10b981" />
          <StatCard icon={Tag} label="Moy. réduction" value={
            webSpecialOffers.length > 0
              ? `${Math.round(webSpecialOffers.reduce((s, o) => s + discountPct(o.originalPrice, o.specialPrice), 0) / webSpecialOffers.length)}%`
              : '0%'
          } color="var(--gold)" />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--silver-100)', margin: 0 }}>
          Offres spéciales <span style={{ fontSize: 13, color: 'var(--silver-400)', fontWeight: 600 }}>({webSpecialOffers.length})</span>
        </h2>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="btn-gold"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 14, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          <Plus size={16} /> Nouvelle Offre Spéciale
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 18 }}>
        {webSpecialOffers.map(o => (
          <SpecialOfferCard
            key={o.id}
            offer={o}
            metalTypeLabel={metalTypeLabel}
            onEdit={() => { setEditing(o); setShowModal(true); }}
            onDelete={() => handleDelete(o.id)}
            onDetail={() => setDetail(o)}
            onToggleHide={() => updateWebSpecialOffer(o.id, { isHidden: !o.isHidden })}
            onToggleActive={() => updateWebSpecialOffer(o.id, { isActive: !o.isActive })}
            onCopyLink={() => {
              navigator.clipboard.writeText(window.location.origin + '/shop?special=' + o.id);
              setToast('Lien copié !');
              setTimeout(() => setToast(''), 2500);
            }}
          />
        ))}
      </div>

      {webSpecialOffers.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={28} color="#ef4444" />
          </div>
          <div>
            <p style={{ color: 'var(--silver-100)', fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>Aucune offre spéciale</p>
            <p style={{ color: 'var(--silver-400)', fontSize: 13, margin: 0 }}>Créez des promotions limitées dans le temps avec compte à rebours</p>
          </div>
          <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-gold"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 14, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={15} /> Créer une offre spéciale
          </button>
        </div>
      )}

      <SpecialOfferModal
        open={showModal}
        onClose={() => setShowModal(false)}
        editing={editing}
        onSave={handleSave}
        metalTypes={metalTypes}
        shapes={shapes}
      />

      {/* Detail Modal */}
      <AnimatePresence>
        {detail && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDetail(null)}>
            <motion.div className="modal-box" style={{ maxWidth: 480 }}
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <div>
                  <div className="silver-line" style={{ marginBottom: 6 }} />
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.03em', margin: 0 }}>Détails offre spéciale</h2>
                </div>
                <button onClick={() => setDetail(null)} className="btn-icon"><X size={18} /></button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {detail.image && <img src={detail.image} style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 14, marginBottom: 12 }} alt="" />}
                {[
                  { label: 'Nom', value: detail.name },
                  { label: 'Métal', value: metalTypeLabel(detail.metalTypeId) },
                  { label: 'Prix original', value: `${detail.originalPrice.toLocaleString()} DA`, line: true },
                  { label: 'Prix spécial', value: `${detail.specialPrice.toLocaleString()} DA`, gold: true },
                  { label: 'Réduction', value: `-${discountPct(detail.originalPrice, detail.specialPrice)}%`, danger: true },
                  { label: 'Période', value: `${detail.startDate} → ${detail.endDate}` },
                  { label: 'Statut', value: detail.isActive ? 'Active' : 'Inactive', success: detail.isActive },
                ].map(({ label, value, gold, success, danger, line }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--silver-400)', fontWeight: 600 }}>{label}</span>
                    <span style={{
                      fontWeight: 700,
                      color: gold ? 'var(--gold)' : success ? '#10b981' : danger ? '#ef4444' : 'var(--silver-100)',
                      textDecoration: line ? 'line-through' : 'none',
                    }}>{value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{toast && <Toast msg={toast} onClose={() => setToast('')} />}</AnimatePresence>
    </div>
  );
};

// ─── DELIVERY TAB ─────────────────────────────────────────────────────────────

const DeliveryTab: React.FC = () => {
  const { webDeliveryCompanies, addWebDeliveryCompany, updateWebDeliveryCompany, deleteWebDeliveryCompany } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [editingCompany, setEditingCompany] = useState<WebDeliveryCompany | null>(null);
  const [managingCompany, setManagingCompany] = useState<WebDeliveryCompany | null>(null);
  const [companyForm, setCompanyForm] = useState({ name: '', phone: '' });

  // Wilaya price form state
  const [selectedWilayaCode, setSelectedWilayaCode] = useState<number | ''>('');
  const [selectedCommunes, setSelectedCommunes] = useState<string[]>([]);
  const [toBureau, setToBureau] = useState<string>('');
  const [toHome, setToHome] = useState<string>('');
  const [toast, setToast] = useState('');

  // When a wilaya is chosen, populate commune checkboxes and reset selection
  const handleWilayaSelect = (code: number | '') => {
    setSelectedWilayaCode(code);
    setSelectedCommunes([]);
  };

  const toggleCommune = (commune: string) => {
    setSelectedCommunes(prev =>
      prev.includes(commune) ? prev.filter(c => c !== commune) : [...prev, commune]
    );
  };

  const selectAllCommunes = () => {
    if (!selectedWilayaCode) return;
    const wilaya = ALGERIA_WILAYAS.find(w => w.code === selectedWilayaCode);
    if (!wilaya) return;
    setSelectedCommunes(
      selectedCommunes.length === wilaya.communes.length ? [] : [...wilaya.communes]
    );
  };

  const saveCompany = () => {
    if (!companyForm.name.trim()) return;
    if (editingCompany) {
      updateWebDeliveryCompany(editingCompany.id, companyForm);
      setToast('Société modifiée !');
    } else {
      addWebDeliveryCompany({ ...companyForm, wilayas: [] });
      setToast('Société ajoutée !');
    }
    setShowCreate(false);
    setEditingCompany(null);
    setTimeout(() => setToast(''), 3000);
  };

  const resetPriceForm = () => {
    setSelectedWilayaCode('');
    setSelectedCommunes([]);
    setToBureau('');
    setToHome('');
  };

  // Allow MULTIPLE price entries for the same wilaya — do NOT deduplicate
  const addWilaya = () => {
    if (!managingCompany || !selectedWilayaCode) return;
    const wilaya = ALGERIA_WILAYAS.find(w => w.code === selectedWilayaCode);
    if (!wilaya) return;
    if (selectedCommunes.length === 0) { setToast('Sélectionnez au moins une commune'); setTimeout(() => setToast(''), 2500); return; }
    const newEntry: WebWilayaPrice = {
      wilayaCode: wilaya.code,
      wilayaName: wilaya.name,
      communes: selectedCommunes,
      toBureau: Number(toBureau) || 0,
      toHome: Number(toHome) || 0,
    };
    const updatedWilayas = [...managingCompany.wilayas, newEntry];
    updateWebDeliveryCompany(managingCompany.id, { wilayas: updatedWilayas });
    setManagingCompany({ ...managingCompany, wilayas: updatedWilayas });
    resetPriceForm();
    setToast('Tarif ajouté !');
    setTimeout(() => setToast(''), 2500);
  };

  // Delete by index so duplicate wilaya entries can be removed independently
  const deleteWilayaByIndex = (index: number) => {
    if (!managingCompany) return;
    const wilayas = managingCompany.wilayas.filter((_, i) => i !== index);
    updateWebDeliveryCompany(managingCompany.id, { wilayas });
    setManagingCompany({ ...managingCompany, wilayas });
  };

  const totalWilayas = webDeliveryCompanies.reduce((s, c) => s + c.wilayas.length, 0);
  const currentWilayaData = selectedWilayaCode
    ? ALGERIA_WILAYAS.find(w => w.code === selectedWilayaCode)
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {webDeliveryCompanies.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <StatCard icon={Truck} label="Sociétés" value={webDeliveryCompanies.length} />
          <StatCard icon={MapPin} label="Tarifs configurés" value={totalWilayas} color="#10b981" />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--silver-100)', margin: 0 }}>
          Sociétés de livraison <span style={{ fontSize: 13, color: 'var(--silver-400)', fontWeight: 600 }}>({webDeliveryCompanies.length})</span>
        </h2>
        <button
          onClick={() => { setEditingCompany(null); setCompanyForm({ name: '', phone: '' }); setShowCreate(true); }}
          className="btn-gold"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 14, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          <Plus size={16} /> Nouvelle Société
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {webDeliveryCompanies.map(c => (
          <div key={c.id} className="lux-card" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontWeight: 800, color: 'var(--silver-100)', margin: '0 0 4px', fontSize: 15 }}>{c.name}</h3>
                <p style={{ fontSize: 12, color: 'var(--silver-300)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <PhoneCall size={11} /> {c.phone || 'Pas de téléphone'}
                </p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: 'rgba(201,168,76,0.12)', color: 'var(--gold)' }}>
                {c.wilayas.length} tarif{c.wilayas.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setEditingCompany(c); setCompanyForm({ name: c.name, phone: c.phone }); setShowCreate(true); }} className="btn-icon" title="Modifier"><Edit2 size={14} /></button>
              <button onClick={() => { if (confirm('Supprimer cette société ?')) { deleteWebDeliveryCompany(c.id); setToast('Société supprimée'); setTimeout(() => setToast(''), 2500); } }} className="btn-icon danger" title="Supprimer"><Trash2 size={14} /></button>
              <button
                onClick={() => { setManagingCompany(c); resetPriceForm(); }}
                className="btn-silver"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                <Truck size={13} /> Gérer les prix
              </button>
            </div>
          </div>
        ))}
      </div>

      {webDeliveryCompanies.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Truck size={28} color="var(--gold)" />
          </div>
          <p style={{ color: 'var(--silver-100)', fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>Aucune société de livraison</p>
          <p style={{ color: 'var(--silver-400)', fontSize: 13, margin: 0 }}>Ajoutez des sociétés pour activer la livraison sur votre site</p>
        </div>
      )}

      {/* Create/Edit Company Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreate(false)}>
            <motion.div className="modal-box" style={{ maxWidth: 480 }}
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <div>
                  <div className="silver-line" style={{ marginBottom: 6 }} />
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.03em', margin: 0 }}>
                    {editingCompany ? 'Modifier la société' : 'Nouvelle société de livraison'}
                  </h2>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>
                    Société de livraison
                  </p>
                </div>
                <button onClick={() => setShowCreate(false)} className="btn-icon"><X size={18} /></button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="lux-label">Nom de la société</label>
                  <input value={companyForm.name} onChange={e => setCompanyForm(f => ({ ...f, name: e.target.value }))}
                    className="lux-input" style={{ marginTop: 6 }} placeholder="Ex: Yalitec, Zr Express..." />
                </div>
                <div>
                  <label className="lux-label">Téléphone</label>
                  <input value={companyForm.phone} onChange={e => setCompanyForm(f => ({ ...f, phone: e.target.value }))}
                    className="lux-input" style={{ marginTop: 6 }} placeholder="0555..." />
                </div>
              </div>
              <div className="modal-footer">
                <button onClick={() => setShowCreate(false)} className="btn-outline" style={{ padding: '10px 28px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
                <button onClick={saveCompany} className="btn-gold" style={{ padding: '10px 28px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Save size={15} /> {editingCompany ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manage Delivery Prices Modal */}
      <AnimatePresence>
        {managingCompany && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setManagingCompany(null)}>
            <motion.div className="modal-box"
              style={{ maxWidth: 780, width: '96vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header" style={{ flexShrink: 0 }}>
                <div>
                  <div className="silver-line" style={{ marginBottom: 6 }} />
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.03em', margin: 0 }}>Prix de livraison</h2>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>
                    {managingCompany.name} — {managingCompany.wilayas.length} tarif{managingCompany.wilayas.length !== 1 ? 's' : ''} configuré{managingCompany.wilayas.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button onClick={() => setManagingCompany(null)} className="btn-icon"><X size={18} /></button>
              </div>

              <div className="modal-body" style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 22 }}>

                {/* ── Add price form ── */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Plus size={14} color="var(--gold)" />
                    </div>
                    <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                      Ajouter un nouveau tarif
                    </p>
                  </div>

                  {/* Step 1: wilaya select */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label className="lux-label">Wilaya</label>
                      <select
                        value={selectedWilayaCode}
                        onChange={e => handleWilayaSelect(e.target.value ? +e.target.value : '')}
                        className="lux-select"
                        style={{ marginTop: 6 }}
                      >
                        <option value="">-- Choisir une wilaya --</option>
                        {ALGERIA_WILAYAS.map(w => (
                          <option key={w.code} value={w.code}>{w.code}. {w.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Prices side by side */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label className="lux-label">Bureau (DA)</label>
                        <input
                          type="number" value={toBureau}
                          onChange={e => setToBureau(e.target.value)}
                          className="lux-input" style={{ marginTop: 6 }} placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="lux-label">Domicile (DA)</label>
                        <input
                          type="number" value={toHome}
                          onChange={e => setToHome(e.target.value)}
                          className="lux-input" style={{ marginTop: 6 }} placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 2: communes checkboxes (shown once wilaya is selected) */}
                  <AnimatePresence>
                    {currentWilayaData && (
                      <motion.div
                        key={selectedWilayaCode}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.22 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <label className="lux-label" style={{ margin: 0 }}>
                            Communes de {currentWilayaData.name}
                            <span style={{ marginLeft: 8, color: 'var(--silver-400)', fontWeight: 500 }}>
                              ({selectedCommunes.length}/{currentWilayaData.communes.length} sélectionnées)
                            </span>
                          </label>
                          <button
                            onClick={selectAllCommunes}
                            style={{
                              fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
                              background: selectedCommunes.length === currentWilayaData.communes.length
                                ? 'rgba(201,168,76,0.18)' : 'transparent',
                              border: `1px solid ${selectedCommunes.length === currentWilayaData.communes.length ? 'var(--gold)' : 'var(--border)'}`,
                              color: selectedCommunes.length === currentWilayaData.communes.length ? 'var(--gold)' : 'var(--silver-300)',
                              transition: 'all 0.2s',
                            }}
                          >
                            {selectedCommunes.length === currentWilayaData.communes.length ? 'Désélectionner tout' : 'Sélectionner tout'}
                          </button>
                        </div>
                        <div style={{
                          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8,
                          maxHeight: 200, overflowY: 'auto', padding: '4px 2px',
                        }}>
                          {currentWilayaData.communes.map(commune => {
                            const checked = selectedCommunes.includes(commune);
                            return (
                              <label
                                key={commune}
                                onClick={() => toggleCommune(commune)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                                  borderRadius: 10, cursor: 'pointer', userSelect: 'none',
                                  background: checked ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.03)',
                                  border: `1px solid ${checked ? 'rgba(201,168,76,0.4)' : 'var(--border)'}`,
                                  transition: 'all 0.15s',
                                }}
                              >
                                <div style={{
                                  width: 16, height: 16, borderRadius: 5, flexShrink: 0,
                                  background: checked ? 'var(--gold)' : 'transparent',
                                  border: `2px solid ${checked ? 'var(--gold)' : 'var(--border)'}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'all 0.15s',
                                }}>
                                  {checked && (
                                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                                      <path d="M1 3.5L3.5 6L8 1" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  )}
                                </div>
                                <span style={{ fontSize: 12, fontWeight: checked ? 700 : 500, color: checked ? 'var(--silver-100)' : 'var(--silver-300)' }}>
                                  {commune}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={addWilaya}
                    disabled={!selectedWilayaCode || selectedCommunes.length === 0}
                    className="btn-gold"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                      cursor: (!selectedWilayaCode || selectedCommunes.length === 0) ? 'not-allowed' : 'pointer',
                      opacity: (!selectedWilayaCode || selectedCommunes.length === 0) ? 0.5 : 1,
                      alignSelf: 'flex-start', transition: 'opacity 0.2s',
                    }}
                  >
                    <Plus size={15} /> Ajouter ce tarif
                  </button>
                </div>

                {/* ── Existing price rows ── */}
                {managingCompany.wilayas.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="lux-table">
                      <thead>
                        <tr>
                          <th>Wilaya</th>
                          <th>Communes</th>
                          <th style={{ textAlign: 'right' }}>Bureau</th>
                          <th style={{ textAlign: 'right' }}>Domicile</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {managingCompany.wilayas.map((w, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 700, color: 'var(--silver-100)', whiteSpace: 'nowrap' }}>
                              {w.wilayaCode}. {w.wilayaName}
                            </td>
                            <td style={{ maxWidth: 240 }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {w.communes.map(c => (
                                  <span key={c} style={{
                                    fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 6,
                                    background: 'rgba(255,255,255,0.06)', color: 'var(--silver-300)',
                                    border: '1px solid var(--border)',
                                  }}>{c}</span>
                                ))}
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', color: 'var(--gold)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                              {w.toBureau.toLocaleString()} DA
                            </td>
                            <td style={{ textAlign: 'right', color: 'var(--silver-200)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                              {w.toHome.toLocaleString()} DA
                            </td>
                            <td>
                              <button onClick={() => deleteWilayaByIndex(idx)} className="btn-icon danger" title="Supprimer ce tarif">
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--silver-400)', fontSize: 13 }}>
                    Aucun tarif configuré. Utilisez le formulaire ci-dessus pour en ajouter.
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{toast && <Toast msg={toast} onClose={() => setToast('')} />}</AnimatePresence>
    </div>
  );
};

// ─── CONTACTS TAB ─────────────────────────────────────────────────────────────

/**
 * One contact row: icon, label and its input.
 *
 * Kept at module scope deliberately — a component declared inside another
 * component's body is a new function type on every render, so React tears the
 * <input> down and builds a fresh one after each keystroke, losing focus. The
 * value and handler come in as props instead of being closed over.
 */
const ContactField: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  color?: string;
}> = ({ icon: Icon, label, value, onChange, placeholder, color = 'var(--gold)' }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
    <div style={{
      width: 42, height: 42, borderRadius: 12, flexShrink: 0, marginTop: 22,
      background: `${color}1A`, border: `1px solid ${color}33`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon size={17} color={color} />
    </div>
    <div style={{ flex: 1 }}>
      <label className="lux-label">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || ''}
        className="lux-input"
        style={{ marginTop: 6 }}
      />
    </div>
  </div>
);

const ContactsTab: React.FC = () => {
  const { webContacts, updateWebContacts } = useApp();
  const [form, setForm] = useState({ ...webContacts });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateWebContacts(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--silver-100)', marginBottom: 20 }}>Contacts & Réseaux Sociaux</h2>
      <div className="lux-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 4 }}>

        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--silver-400)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 14px' }}>Réseaux sociaux</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ContactField icon={Facebook} label="Facebook" value={(form.facebook as string) || ''} onChange={v => setForm(f => ({ ...f, facebook: v }))} placeholder="https://facebook.com/..." color="#1877F2" />
            <ContactField icon={Instagram} label="Instagram" value={(form.instagram as string) || ''} onChange={v => setForm(f => ({ ...f, instagram: v }))} placeholder="https://instagram.com/..." color="#E1306C" />
            <ContactField icon={Globe} label="TikTok" value={(form.tiktok as string) || ''} onChange={v => setForm(f => ({ ...f, tiktok: v }))} placeholder="https://tiktok.com/@..." color="#010101" />
            <ContactField icon={Globe} label="Snapchat" value={(form.snapchat as string) || ''} onChange={v => setForm(f => ({ ...f, snapchat: v }))} placeholder="https://snapchat.com/add/..." color="#FFFC00" />
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 18, marginTop: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--silver-400)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 14px' }}>Contact direct</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ContactField icon={Send} label="Telegram" value={(form.telegram as string) || ''} onChange={v => setForm(f => ({ ...f, telegram: v }))} placeholder="https://t.me/..." color="#2CA5E0" />
            <ContactField icon={PhoneCall} label="WhatsApp" value={(form.whatsapp as string) || ''} onChange={v => setForm(f => ({ ...f, whatsapp: v }))} placeholder="+213..." color="#25D366" />
            <ContactField icon={Mail} label="Email" value={(form.email as string) || ''} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="contact@..." color="var(--gold)" />
            <ContactField icon={PhoneCall} label="Téléphone" value={(form.phone as string) || ''} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="0555..." />
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, marginTop: 22, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={17} color="var(--gold)" />
              </div>
              <div style={{ flex: 1 }}>
                <label className="lux-label">Adresse</label>
                <textarea
                  value={form.address || ''}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  rows={3} className="lux-input" style={{ marginTop: 6, resize: 'vertical' }}
                  placeholder="Adresse complète du magasin"
                />
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {saved && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontSize: 12, fontWeight: 700, padding: '10px 16px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <CheckCircle size={14} /> Contacts enregistrés avec succès
            </motion.div>
          )}
        </AnimatePresence>

        <button onClick={handleSave} className="btn-gold"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 0', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
          <Save size={15} /> Enregistrer les contacts
        </button>
      </div>
    </div>
  );
};

// ─── SITE SETTINGS TAB ────────────────────────────────────────────────────────

const SiteSettingsTab: React.FC = () => {
  const { settings, updateSettings } = useApp();
  const [storeName, setStoreName] = useState(settings.storeName || '');
  const [slogan, setSlogan] = useState(settings.slogan || '');
  const [logo, setLogo] = useState(settings.logo || '');
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLogo(await uploadTo(BUCKETS.logos, file));
    } catch (err: any) {
      alert(err?.message || "Échec de l'envoi du logo");
    }
  };

  const handleSave = () => {
    updateSettings({ storeName, slogan, logo });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ maxWidth: 580 }}>
      <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--silver-100)', marginBottom: 20 }}>Paramètres du Site Vitrine</h2>
      <div className="lux-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* Logo */}
        <div>
          <label className="lux-label" style={{ marginBottom: 12, display: 'block' }}>Logo du magasin</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: 80, height: 80, borderRadius: 20, flexShrink: 0,
                background: logo ? 'transparent' : 'rgba(201,168,76,0.06)',
                border: `2px dashed ${logo ? 'var(--gold)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.2s',
              }}
            >
              {logo ? (
                <img src={logo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="logo" />
              ) : (
                <Gem size={28} color="var(--silver-400)" />
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => fileRef.current?.click()} className="btn-silver"
                style={{ padding: '8px 18px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Choisir un logo
              </button>
              {logo && (
                <button onClick={() => setLogo('')} className="btn-outline"
                  style={{ padding: '8px 14px', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  Supprimer
                </button>
              )}
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImage} />
        </div>

        <div>
          <label className="lux-label">Nom du magasin</label>
          <input value={storeName} onChange={e => setStoreName(e.target.value)} className="lux-input" style={{ marginTop: 6 }} placeholder="Ex: Bijouterie Luxor" />
        </div>

        <div>
          <label className="lux-label">Slogan / Description courte</label>
          <textarea value={slogan} onChange={e => setSlogan(e.target.value)} rows={3} className="lux-input"
            style={{ marginTop: 6, resize: 'vertical' }} placeholder="Ex: Bijoux en or 18k et argent 925 faits main..." />
        </div>

        <AnimatePresence>
          {saved && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontSize: 12, fontWeight: 700, padding: '10px 16px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={14} /> Paramètres enregistrés avec succès
            </motion.div>
          )}
        </AnimatePresence>

        <button onClick={handleSave} className="btn-gold"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 0', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          <Save size={15} /> Sauvegarder
        </button>
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const WebsiteManagement: React.FC = () => {
  const shouldReduce = useReducedMotion();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('offers');
  const { webOffers, webSpecialOffers, webDeliveryCompanies } = useApp();

  const counts: Record<SubTab, number | null> = {
    offers: webOffers.length,
    specialOffers: webSpecialOffers.length,
    delivery: webDeliveryCompanies.length,
    contacts: null,
    siteSettings: null,
  };

  const renderSubTab = () => {
    switch (activeSubTab) {
      case 'offers': return <OffersTab />;
      case 'specialOffers': return <SpecialOffersTab />;
      case 'delivery': return <DeliveryTab />;
      case 'contacts': return <ContactsTab />;
      case 'siteSettings': return <SiteSettingsTab />;
    }
  };

  return (
    <motion.div
      initial={shouldReduce ? false : { opacity: 0, y: 14, scale: 0.995 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] as any }}
      style={{ display: 'flex', flexDirection: 'column', gap: 28 }}
    >
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="silver-line" />
          <h1 className="section-title">Gestion Site Web</h1>
          <p className="section-subtitle">Gérez vos offres, livraisons, contacts et paramètres du site vitrine</p>
        </div>
      </div>

      {/* Sub-tab bar */}
      <div className="lux-tabs">
        {SUBTABS.map(tab => (
          <button
            key={tab.id}
            className={`lux-tab${activeSubTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveSubTab(tab.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <tab.icon size={14} />
            <span>{tab.label}</span>
            {counts[tab.id] !== null && counts[tab.id]! > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 6, marginLeft: 2,
                background: activeSubTab === tab.id ? 'rgba(201,168,76,0.25)' : 'var(--border)',
                color: activeSubTab === tab.id ? 'var(--gold)' : 'var(--silver-400)',
              }}>
                {counts[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="lux-card"
          style={{ padding: 28 }}
        >
          {renderSubTab()}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default WebsiteManagement;
