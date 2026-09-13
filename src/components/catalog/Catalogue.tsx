/**
 * Catalogue — the reference data every other screen builds on:
 *   • Métaux   : the metal families (Or, Argent, and any the user creates)
 *   • Formes   : the jewellery shapes stock is broken down by
 *   • Calibres : the purities available when creating a stock type
 */
import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Plus, Edit2, Trash2, X, Gem, Shapes as ShapesIcon, Hash, Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { translations } from '../../i18n/translations';
import { MetalCategory } from '../../types';

type Tab = 'metals' | 'shapes' | 'calibres';

const PRESET_COLORS = ['#C9A84C', '#A8B2BD', '#DCE3EB', '#8FB6BD', '#D9A066', '#B98D3A', '#7C3AED', '#22C55E', '#EF4444', '#3B82F6'];

const Catalogue: React.FC = () => {
  const {
    metalCategories, addMetalCategory, updateMetalCategory, deleteMetalCategory,
    metalTypes, shapes, addShape, updateShape, deleteShape,
    calibres, addCalibre, deleteCalibre, language, can,
  } = useApp();
  const t = translations[language];
  const shouldReduce = useReducedMotion();

  const [tab, setTab] = useState<Tab>('metals');

  // ── Metal category modal ───────────────────────────────────
  const emptyMetal = { name: '', nameAr: '', color: PRESET_COLORS[0], calibres: '', pricePerGram: '' };
  const [metalModal, setMetalModal] = useState(false);
  const [editingMetal, setEditingMetal] = useState<MetalCategory | null>(null);
  const [metalForm, setMetalForm] = useState(emptyMetal);

  const openAddMetal = () => { setEditingMetal(null); setMetalForm(emptyMetal); setMetalModal(true); };
  const openEditMetal = (c: MetalCategory) => {
    setEditingMetal(c);
    setMetalForm({
      name: c.name, nameAr: c.nameAr || '', color: c.color,
      calibres: (c.calibres || []).join(', '),
      pricePerGram: String(c.pricePerGram || ''),
    });
    setMetalModal(true);
  };

  const submitMetal = (e: React.FormEvent) => {
    e.preventDefault();
    const name = metalForm.name.trim();
    if (!name) return;
    const payload = {
      name,
      nameAr: metalForm.nameAr.trim() || name,
      color: metalForm.color,
      calibres: metalForm.calibres.split(',').map(c => c.trim()).filter(Boolean),
      pricePerGram: parseFloat(metalForm.pricePerGram) || 0,
    };
    if (editingMetal) updateMetalCategory(editingMetal.id, payload);
    else addMetalCategory(payload);
    setMetalModal(false);
    setEditingMetal(null);
  };

  const removeMetal = (c: MetalCategory) => {
    const used = metalTypes.filter(mt => mt.metalCategoryId === c.id).length;
    if (c.isBuiltIn) {
      alert(`« ${c.name} » est un métal de base et ne peut pas être supprimé.`);
      return;
    }
    if (used > 0) {
      alert(`« ${c.name} » est utilisé par ${used} type(s) de stock. Réaffectez-les avant de le supprimer.`);
      return;
    }
    if (confirm(`Supprimer le métal « ${c.name} » ?`)) deleteMetalCategory(c.id);
  };

  // ── Shape modal ────────────────────────────────────────────
  const [shapeModal, setShapeModal] = useState(false);
  const [editingShape, setEditingShape] = useState<string | null>(null);
  const [shapeValue, setShapeValue] = useState('');

  const submitShape = (e: React.FormEvent) => {
    e.preventDefault();
    const value = shapeValue.trim();
    if (!value) return;
    if (editingShape) updateShape(editingShape, value); else addShape(value);
    setShapeModal(false); setShapeValue(''); setEditingShape(null);
  };

  // ── Calibre input ──────────────────────────────────────────
  const [calibreValue, setCalibreValue] = useState('');

  const submitCalibre = (e: React.FormEvent) => {
    e.preventDefault();
    const value = calibreValue.trim();
    if (!value) return;
    addCalibre(value);
    setCalibreValue('');
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'metals', label: language === 'ar' ? 'المعادن' : 'Métaux', icon: <Gem size={14} />, count: metalCategories.length },
    { key: 'shapes', label: language === 'ar' ? 'الأشكال' : 'Formes', icon: <ShapesIcon size={14} />, count: shapes.length },
    { key: 'calibres', label: language === 'ar' ? 'العيارات' : 'Calibres', icon: <Hash size={14} />, count: calibres.length },
  ];

  return (
    <motion.div
      initial={shouldReduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 28 }}
    >
      {/* Page header */}
      <div>
        <div className="silver-line" />
        <h1 className="section-title">{language === 'ar' ? 'الكتالوج' : 'Catalogue'}</h1>
        <p className="section-subtitle">
          {language === 'ar'
            ? 'المعادن والأشكال والعيارات المستعملة في كل التطبيق'
            : 'Métaux, formes et calibres utilisés dans toute l’application'}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {tabs.map(tb => {
          const active = tab === tb.key;
          return (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 12, cursor: 'pointer',
                fontSize: 13, fontWeight: 700, transition: 'all 0.18s',
                border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
                background: active ? 'rgba(201,168,76,0.12)' : 'transparent',
                color: active ? 'var(--gold)' : 'var(--silver-300)',
              }}
            >
              {tb.icon} {tb.label}
              <span style={{ fontSize: 11, opacity: 0.65 }}>{tb.count}</span>
            </button>
          );
        })}
      </div>

      {/* ═══ MÉTAUX ═══ */}
      {tab === 'metals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 12, color: 'var(--silver-400)', margin: 0, maxWidth: 620, lineHeight: 1.6 }}>
              Chaque type de stock appartient à un métal. Créez ici les métaux que vous travaillez —
              or, argent, or blanc, platine, plaqué… — avec leur prix de référence au gramme,
              qui sert au calcul des marges.
            </p>
            <button onClick={openAddMetal} className="btn-gold" style={{ display: can('catalogue.category.manage') ? 'flex' : 'none', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 14, fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
              <Plus size={17} /> Nouveau Métal
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {metalCategories.map((c, i) => {
              const usedBy = metalTypes.filter(mt => mt.metalCategoryId === c.id).length;
              return (
                <motion.div
                  key={c.id}
                  initial={shouldReduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                  className="lux-card"
                  style={{ padding: 20, borderTop: `3px solid ${c.color}` }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${c.color}22`, border: `1px solid ${c.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Gem size={19} style={{ color: c.color }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--silver-100)', margin: 0, letterSpacing: '-0.02em' }}>{c.name}</p>
                        <p style={{ fontSize: 11, color: 'var(--silver-400)', margin: '2px 0 0' }} dir="rtl">{c.nameAr}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => openEditMetal(c)} className="btn-icon" title="Modifier"><Edit2 size={14} /></button>
                      {c.isBuiltIn
                        ? <span className="btn-icon" title="Métal de base — non supprimable" style={{ opacity: 0.4, cursor: 'not-allowed' }}><Lock size={14} /></span>
                        : <button onClick={() => removeMetal(c)} style={can('catalogue.category.manage') ? undefined : { display: 'none' }} className="btn-icon danger" title="Supprimer"><Trash2 size={14} /></button>}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ background: 'var(--bg-muted)', borderRadius: 10, padding: '10px 12px' }}>
                      <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--silver-400)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>Prix / g</p>
                      <p style={{ fontSize: 15, fontWeight: 800, color: c.color, margin: 0 }}>
                        {c.pricePerGram > 0 ? `${c.pricePerGram.toLocaleString()} DZD` : '—'}
                      </p>
                    </div>
                    <div style={{ background: 'var(--bg-muted)', borderRadius: 10, padding: '10px 12px' }}>
                      <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--silver-400)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>Types de stock</p>
                      <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--silver-100)', margin: 0 }}>{usedBy}</p>
                    </div>
                  </div>

                  {c.calibres.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                      {c.calibres.map(cal => (
                        <span key={cal} style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: `${c.color}18`, color: c.color, border: `1px solid ${c.color}40` }}>
                          {cal}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ FORMES ═══ */}
      {tab === 'shapes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 12, color: 'var(--silver-400)', margin: 0, maxWidth: 620, lineHeight: 1.6 }}>
              Les formes découpent le stock de chaque type de métal (bagues, colliers, bracelets…).
              Ajouter une forme l’ajoute à tous les types existants.
            </p>
            <button
              onClick={() => { setEditingShape(null); setShapeValue(''); setShapeModal(true); }}
              className="btn-gold"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 14, fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
            >
              <Plus size={17} /> Nouvelle Forme
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {shapes.map((s, i) => (
              <motion.div
                key={s}
                initial={shouldReduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                className="lux-card"
                style={{ padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: 'var(--gold)', flexShrink: 0 }}>
                    {s.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--silver-100)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {(t as any)[s + 's'] || s}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => { setEditingShape(s); setShapeValue(s); setShapeModal(true); }} className="btn-icon" title="Modifier"><Edit2 size={14} /></button>
                  <button onClick={() => { if (confirm(t.delete + ' ?')) deleteShape(s); }} style={can('catalogue.shape.manage') ? undefined : { display: 'none' }} className="btn-icon danger" title="Supprimer"><Trash2 size={14} /></button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ CALIBRES ═══ */}
      {tab === 'calibres' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={{ fontSize: 12, color: 'var(--silver-400)', margin: 0, maxWidth: 620, lineHeight: 1.6 }}>
            Les calibres proposés lors de la création d’un type de stock ou d’une commande d’atelier.
            Chaque métal peut aussi avoir ses propres calibres (onglet Métaux).
          </p>

          <form onSubmit={submitCalibre} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              value={calibreValue}
              onChange={e => setCalibreValue(e.target.value)}
              className="lux-input"
              placeholder="Ex: 18k, 21k, 925…"
              style={{ maxWidth: 260 }}
            />
            <button type="submit" className="btn-silver" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px', height: 44, borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <Plus size={16} /> Ajouter
            </button>
          </form>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {calibres.map(c => (
              <div key={c} className="lux-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--silver-100)' }}>{c}</span>
                <button onClick={() => { if (confirm(`Supprimer le calibre ${c} ?`)) deleteCalibre(c); }} style={can('catalogue.calibre.manage') ? undefined : { display: 'none' }} className="btn-icon danger" title="Supprimer">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {calibres.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--silver-400)', margin: 0 }}>Aucun calibre enregistré.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Metal modal ── */}
      <AnimatePresence>
        {metalModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMetalModal(false)}>
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
                    {editingMetal ? 'Modifier le Métal' : 'Nouveau Métal'}
                  </h2>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>
                    {editingMetal ? 'Nom, couleur, calibres et prix' : 'Or, argent ou tout autre matériau'}
                  </p>
                </div>
                <button onClick={() => setMetalModal(false)} className="btn-icon"><X size={18} /></button>
              </div>

              <form onSubmit={submitMetal}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <label className="lux-label">Nom (français)</label>
                    <input
                      value={metalForm.name}
                      onChange={e => setMetalForm(f => ({ ...f, name: e.target.value }))}
                      className="lux-input" placeholder="Ex: Or Rose" autoFocus required style={{ marginTop: 6 }}
                    />
                  </div>

                  <div>
                    <label className="lux-label">Nom (arabe)</label>
                    <input
                      value={metalForm.nameAr}
                      onChange={e => setMetalForm(f => ({ ...f, nameAr: e.target.value }))}
                      className="lux-input" placeholder="ذهب وردي" dir="rtl" style={{ marginTop: 6 }}
                    />
                  </div>

                  <div>
                    <label className="lux-label">Couleur d’accent</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                      {PRESET_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setMetalForm(f => ({ ...f, color }))}
                          style={{
                            width: 30, height: 30, borderRadius: '50%', background: color, cursor: 'pointer',
                            border: metalForm.color === color ? '3px solid var(--silver-100)' : '2px solid transparent',
                            boxShadow: metalForm.color === color ? `0 0 0 2px ${color}` : 'none',
                          }}
                          aria-label={color}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="lux-label">Calibres (séparés par des virgules)</label>
                    <input
                      value={metalForm.calibres}
                      onChange={e => setMetalForm(f => ({ ...f, calibres: e.target.value }))}
                      className="lux-input" placeholder="18k, 21k, 24k" style={{ marginTop: 6 }}
                    />
                  </div>

                  <div>
                    <label className="lux-label">Prix de référence (DZD / g)</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={metalForm.pricePerGram}
                      onChange={e => setMetalForm(f => ({ ...f, pricePerGram: e.target.value }))}
                      className="lux-input" placeholder="0" style={{ marginTop: 6 }}
                    />
                    <p style={{ fontSize: 11, color: 'var(--silver-400)', margin: '6px 0 0' }}>
                      Sert de coût matière dans les calculs de marge. Laissez à 0 pour les matériaux non pesés.
                    </p>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" onClick={() => setMetalModal(false)} className="btn-outline" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    Annuler
                  </button>
                  <button type="submit" className="btn-gold" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    {editingMetal ? 'Enregistrer' : 'Ajouter'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Shape modal ── */}
      <AnimatePresence>
        {shapeModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShapeModal(false)}>
            <motion.div
              className="modal-box"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: 420, width: '100%' }}
            >
              <div className="modal-header">
                <div>
                  <div className="silver-line" style={{ marginBottom: 6 }} />
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.03em', margin: 0 }}>
                    {editingShape ? 'Modifier Forme' : 'Nouvelle Forme'}
                  </h2>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>
                    {editingShape ? 'Renommer la forme' : 'Ajouter une forme de bijou'}
                  </p>
                </div>
                <button onClick={() => setShapeModal(false)} className="btn-icon"><X size={18} /></button>
              </div>

              <form onSubmit={submitShape}>
                <div className="modal-body">
                  <label className="lux-label">Nom de la Forme</label>
                  <input
                    value={shapeValue}
                    onChange={e => setShapeValue(e.target.value)}
                    className="lux-input"
                    placeholder="Ex: Chevalière, Créole, Alliance…"
                    autoFocus required
                    style={{ marginTop: 6 }}
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" onClick={() => setShapeModal(false)} className="btn-outline" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    Annuler
                  </button>
                  <button type="submit" className="btn-gold" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    {editingShape ? 'Enregistrer' : 'Ajouter'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Catalogue;
