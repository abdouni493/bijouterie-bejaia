
import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Plus, Edit2, Trash2, Search, AlertCircle, Layers, Hash, X, Gem } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { translations } from '../../i18n/translations';
import { JewelryShape } from '../../types';

const Inventory: React.FC = () => {
  const {
    metalTypes, addMetalType, updateMetalType, deleteMetalType,
    metalCategories, language, purchases, cassiePurchases, meltings, can,
  } = useApp();
  const t = translations[language];
  const shouldReduce = useReducedMotion();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; calibre: string; qty: number; isCassie: boolean; isAlaPiece: boolean; metalCategoryId: string }>({
    name: '', calibre: '', qty: 0, isCassie: false, isAlaPiece: false,
    metalCategoryId: '',
  });
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingShapes, setEditingShapes] = useState<string | null>(null);

  const categoryById = (id?: string) => metalCategories.find(c => c.id === id);
  const defaultCategoryId = metalCategories[0]?.id || '';

  const filteredTypes = metalTypes.filter(st => {
    const term = searchTerm.toLowerCase();
    const cat = categoryById(st.metalCategoryId);
    const matchesTerm =
      st.name.toLowerCase().includes(term) ||
      (st.calibre || '').toLowerCase().includes(term) ||
      (cat?.name || '').toLowerCase().includes(term);
    const matchesCategory = categoryFilter === 'all' || st.metalCategoryId === categoryFilter;
    return matchesTerm && matchesCategory;
  });

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const isCassie = editForm.isCassie;
    const isAlaPiece = editForm.isAlaPiece;
    const metalCategoryId = editForm.metalCategoryId || defaultCategoryId;
    const calibre = isAlaPiece ? '' : (formData.get('calibre') as string || '');
    const qty = isAlaPiece ? 0 : (parseFloat(formData.get('qty') as string) || 0);

    if (editingTypeId) {
      updateMetalType(editingTypeId, {
        name,
        metalCategoryId,
        calibre,
        initialQuantity: qty,
        isCassie,
        isAlaPiece,
        shapes: isCassie
          ? { ring: 0, necklace: 0, earring: 0, bracelet: 0, parure4piece: 0, triyeu3piece: 0, gourmette: 0, pendentif: 0, louiza: 0, mahazma: 0, motife: 0 }
          : (isAlaPiece ? {} : undefined)
      } as any);
      setEditingTypeId(null);
    } else {
      addMetalType({
        name,
        metalCategoryId,
        calibre,
        initialQuantity: qty,
        isCassie,
        isAlaPiece,
        shapes: isCassie
          ? { ring: 0, necklace: 0, earring: 0, bracelet: 0, parure4piece: 0, triyeu3piece: 0, gourmette: 0, pendentif: 0, louiza: 0, mahazma: 0, motife: 0 }
          : (isAlaPiece ? {} : { ring: qty / 11, necklace: qty / 11, earring: qty / 11, bracelet: qty / 11, parure4piece: qty / 11, triyeu3piece: qty / 11, gourmette: qty / 11, pendentif: qty / 11, louiza: qty / 11, mahazma: qty / 11, motife: qty / 11 })
      } as any);
    }
    closeShowAddModal();
  };

  const closeShowAddModal = () => { setShowAddModal(false);
  };

  const handleUpdateShape = (id: string, shape: JewelryShape, value: string) => {
    const st = metalTypes.find(s => s.id === id);
    if (!st) return;
    const newShapes = { ...st.shapes, [shape]: parseFloat(value) || 0 };
    updateMetalType(id, { shapes: newShapes });
  };

  return (
    <div className="animate-page-enter space-y-8">

      {/* PAGE HEADER */}
      <div style={{ marginTop: 56 }}>
        <div className="silver-line" />
        <h1 className="section-title">{t.inventory}</h1>
        <p className="section-subtitle">{language === 'ar' ? 'إدارة أنواع المعادن' : 'Gestion des types de métaux — or, argent et plus'}</p>
      </div>

      {/* CATEGORY FILTER */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[{ id: 'all', name: language === 'ar' ? 'الكل' : 'Tous', color: 'var(--gold-pure)' }, ...metalCategories].map(cat => {
          const active = categoryFilter === cat.id;
          const count = cat.id === 'all' ? metalTypes.length : metalTypes.filter(mt => mt.metalCategoryId === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 99, cursor: 'pointer',
                fontSize: 12, fontWeight: 700, transition: 'all 0.18s',
                border: `1px solid ${active ? cat.color : 'var(--border)'}`,
                background: active ? `${cat.color}1f` : 'transparent',
                color: active ? cat.color : 'var(--platinum-400)',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, display: 'inline-block' }} />
              {(cat as any).nameAr && language === 'ar' ? (cat as any).nameAr : cat.name}
              <span style={{ opacity: 0.6 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="lux-search" style={{ width: '100%', maxWidth: 360 }}>
          <Search size={16} style={{ color: 'var(--platinum-400)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder={language === 'ar' ? 'بحث في المخزون...' : 'Rechercher dans le stock...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <motion.button
          onClick={() => { setShowAddModal(true); setEditingTypeId(null); setEditForm({ name: '', calibre: '', qty: 0, isCassie: false, isAlaPiece: false, metalCategoryId: defaultCategoryId }); }}
          whileHover={shouldReduce ? {} : { scale: 1.03, y: -1 }}
          whileTap={shouldReduce ? {} : { scale: 0.97 }}
          className="btn-silver flex items-center gap-2 px-5 py-3 rounded-2xl text-sm"
        >
          <Plus size={18} />
          {t.addMetalType}
        </motion.button>
      </div>

      {/* SILVER TYPE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTypes.map((st, idx) => {
          const isAlaPiece = !!(st as any).isAlaPiece;
          const total = st.isCassie
            ? st.initialQuantity
            : isAlaPiece
              ? (Object.values(st.shapes) as number[]).reduce((a, b) => a + b, 0)
              : (Object.values(st.shapes) as number[]).reduce((a, b) => a + b, 0);
          const isLow = isAlaPiece
            ? total < 5
            : total < st.initialQuantity * 0.25;
          const category = categoryById(st.metalCategoryId);
          const accent = category?.color || 'var(--gold-pure)';
          const fillPercent = st.isCassie || isAlaPiece
            ? 100
            : st.initialQuantity > 0
              ? Math.min(100, (total / st.initialQuantity) * 100)
              : 0;

          return (
            <div
              key={st.id}
              className={`lux-card animate-slide-up stagger-${(idx % 4) + 1}`}
              style={{ padding: 24, position: 'relative', overflow: 'hidden' }}
            >
              {/* Low stock accent */}
              {isLow && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--danger)', borderRadius: '36px 36px 0 0' }} />
              )}

              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                      background: isAlaPiece ? 'rgba(124,58,237,0.1)' : st.isCassie ? 'rgba(99,102,241,0.1)' : `${accent}22`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {isAlaPiece
                      ? <Hash size={20} style={{ color: '#7C3AED' }} />
                      : <Layers size={20} style={{ color: st.isCassie ? '#6366f1' : accent }} />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink-900)', letterSpacing: '-0.02em', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {st.name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {category && (
                        <span style={{
                          fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                          padding: '2px 8px', borderRadius: 99,
                          color: accent, background: `${accent}1f`, border: `1px solid ${accent}55`,
                        }}>
                          {language === 'ar' ? (category.nameAr || category.name) : category.name}
                        </span>
                      )}
                      {st.calibre && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--platinum-400)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                          {st.calibre}
                        </span>
                      )}
                      {isAlaPiece && <span className="badge badge-info" style={{ fontSize: 9 }}>À la Pièce</span>}
                      {st.isCassie && <span className="badge badge-platinum" style={{ fontSize: 9 }}>Cassie</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => { setEditingTypeId(st.id); setEditForm({ name: st.name, calibre: st.calibre || '', qty: Number(st.initialQuantity || 0), isCassie: !!st.isCassie, isAlaPiece: !!(st as any).isAlaPiece, metalCategoryId: st.metalCategoryId || defaultCategoryId }); setShowAddModal(true); }}
                    className="btn-icon"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => { if (confirm(t.delete + ' ?')) deleteMetalType(st.id); }}
                    className="btn-icon danger"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Stock stats */}
              <div
                style={{
                  background: 'var(--bg-muted)',
                  borderRadius: 16,
                  padding: '16px 18px',
                  marginBottom: 16,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--platinum-400)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 6px' }}>
                  {isAlaPiece ? 'Total Pièces' : t.totalWeight}
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: isLow ? 'var(--danger)' : 'var(--ink-900)', letterSpacing: '-0.04em' }}>
                    {isAlaPiece ? Math.round(total as number) : (total as number).toFixed(2)}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--platinum-400)' }}>
                    {isAlaPiece ? 'pcs' : 'g'}
                  </span>
                </div>

                {/* Progress bar */}
                {!isAlaPiece && !st.isCassie && (
                  <div className="lux-progress" style={{ marginBottom: 6 }}>
                    <div
                      className="lux-progress-fill"
                      style={{
                        width: `${fillPercent}%`,
                        background: isLow
                          ? 'linear-gradient(90deg, #f43f5e, #fb7185)'
                          : `linear-gradient(90deg, ${accent}, ${accent}aa)`,
                      }}
                    />
                  </div>
                )}

                {isLow && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <AlertCircle size={12} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--danger)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {t.alertLowStock}
                    </span>
                  </div>
                )}

                {!isAlaPiece && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--platinum-200)' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--platinum-400)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 3px' }}>
                      {t.totalPrice}
                    </p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink-900)', margin: 0, letterSpacing: '-0.02em' }}>
                      {(
                        purchases.reduce((acc, inv) => acc + (inv.items || []).reduce((s, it) => s + ((it.metalTypeId === st.id) ? (Number(it.totalPrice) || 0) : 0), 0), 0)
                        + (st.isCassie ? cassiePurchases.reduce((s, cp) => s + ((cp.metalTypeId === st.id && !cp.isMelted) ? Number(cp.totalPrice || 0) : 0), 0) : 0)
                        + (st.isCassie ? (meltings || []).reduce((s, m) => s + ((m.targetMetalTypeId === st.id) ? Number(m.totalPrice || 0) : 0), 0) : 0)
                      ).toLocaleString('fr-FR')} DA
                    </p>
                  </div>
                )}
              </div>

              {/* Shape breakdown */}
              {!st.isCassie && Object.keys(st.shapes).length > 0 && (
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                    {Object.entries(st.shapes).map(([shape, value]) => (
                      <div key={shape} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 10, transition: 'background 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--platinum-100)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: accent, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--platinum-500)', textTransform: 'capitalize' }}>
                            {(t as any)[shape + 's'] || shape}
                          </span>
                        </div>
                        {editingShapes === st.id ? (
                          <input
                            type="number"
                            className="lux-input"
                            style={{ width: 90, textAlign: 'right', padding: '5px 10px', fontSize: 12 }}
                            defaultValue={Number(value as any) || 0}
                            onBlur={(e) => handleUpdateShape(st.id, shape as JewelryShape, e.target.value)}
                            autoFocus
                          />
                        ) : (
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-900)', letterSpacing: '-0.01em' }}>
                            {isAlaPiece ? Math.round(Number(value) || 0) : (Number(value) || 0).toFixed(2)}
                            <span style={{ fontSize: 10, color: 'var(--platinum-300)', marginLeft: 3 }}>{isAlaPiece ? 'pcs' : 'g'}</span>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setEditingShapes(editingShapes === st.id ? null : st.id)}
                    className={editingShapes === st.id ? 'btn-gold' : 'btn-outline'}
                    style={{ width: '100%', height: 38, borderRadius: 10, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}
                  >
                    <Edit2 size={13} />
                    {editingShapes === st.id ? t.save : t.edit}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filteredTypes.length === 0 && (
          <div className="col-span-full" style={{ textAlign: 'center', padding: '60px 0' }}>
            <Layers size={40} style={{ color: 'var(--platinum-200)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--platinum-400)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
              Aucun type de métal trouvé
            </p>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeShowAddModal}
          >
            <motion.div
              className="modal-box"
              style={{ maxWidth: 480, marginTop: 60 }}
              initial={shouldReduce ? false : { scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={shouldReduce ? {} : { scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <div>
                  <div className="silver-line" style={{ marginBottom: 6 }} />
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.03em', margin: 0 }}>
                    {editingTypeId ? t.edit : t.addMetalType}
                  </h2>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver-300)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>
                    {editingTypeId ? 'Modifier les informations' : 'Ajouter un type de métal'}
                  </p>
                </div>
                <button onClick={() => { closeShowAddModal(); setEditingTypeId(null); }} className="btn-icon"><X size={18} /></button>
              </div>

              <form onSubmit={handleAdd}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Metal category — what the article is made of */}
                  <div>
                    <label className="lux-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Gem size={13} /> Métal
                    </label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                      {metalCategories.map(cat => {
                        const active = (editForm.metalCategoryId || defaultCategoryId) === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setEditForm(prev => ({
                              ...prev,
                              metalCategoryId: cat.id,
                              calibre: cat.calibres.includes(prev.calibre) ? prev.calibre : (cat.calibres[0] || ''),
                            }))}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '10px 16px', borderRadius: 12, cursor: 'pointer',
                              fontSize: 13, fontWeight: 700, transition: 'all 0.18s',
                              border: `1.5px solid ${active ? cat.color : 'var(--border)'}`,
                              background: active ? `${cat.color}22` : 'rgba(255,255,255,0.02)',
                              color: active ? cat.color : 'var(--silver-300)',
                            }}
                          >
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, display: 'inline-block' }} />
                            {language === 'ar' ? (cat.nameAr || cat.name) : cat.name}
                          </button>
                        );
                      })}
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--silver-400)', margin: '8px 0 0' }}>
                      Un métal manquant ? Créez-le dans <strong>Catalogue → Métaux</strong>.
                    </p>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="lux-label">Nom du Type</label>
                    <input
                      name="name"
                      required
                      defaultValue={editForm.name}
                      className="lux-input"
                      placeholder="ex: Or 18k Italien, Argent 925 Local…"
                      style={{ marginTop: 6 }}
                    />
                  </div>

                  {/* Type toggles */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <label className="lux-label" style={{ marginBottom: 2 }}>Type de stock</label>

                    {/* À la Pièce */}
                    <div
                      onClick={() => setEditForm(prev => ({ ...prev, isAlaPiece: !prev.isAlaPiece, isCassie: false }))}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '14px 16px', borderRadius: 14, cursor: 'pointer', transition: 'all 0.2s',
                        border: `1.5px solid ${editForm.isAlaPiece ? '#7C3AED' : 'var(--border)'}`,
                        background: editForm.isAlaPiece ? 'rgba(124,58,237,0.07)' : 'rgba(255,255,255,0.02)',
                      }}
                    >
                      <div style={{
                        width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1, transition: 'all 0.2s',
                        border: `2px solid ${editForm.isAlaPiece ? '#7C3AED' : 'var(--silver-600)'}`,
                        background: editForm.isAlaPiece ? '#7C3AED' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {editForm.isAlaPiece && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--silver-100)', margin: '0 0 2px' }}>À la Pièce</p>
                        <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--silver-400)', margin: 0 }}>Stock géré en nombre de pièces par forme</p>
                      </div>
                    </div>

                    {/* Cassie — hidden if À la Pièce */}
                    {!editForm.isAlaPiece && (
                      <div
                        onClick={() => setEditForm(prev => ({ ...prev, isCassie: !prev.isCassie }))}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 12,
                          padding: '14px 16px', borderRadius: 14, cursor: 'pointer', transition: 'all 0.2s',
                          border: `1.5px solid ${editForm.isCassie ? 'var(--gold)' : 'var(--border)'}`,
                          background: editForm.isCassie ? 'rgba(212,175,55,0.07)' : 'rgba(255,255,255,0.02)',
                        }}
                      >
                        <div style={{
                          width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1, transition: 'all 0.2s',
                          border: `2px solid ${editForm.isCassie ? 'var(--gold)' : 'var(--silver-600)'}`,
                          background: editForm.isCassie ? 'var(--gold)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {editForm.isCassie && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1a1200" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--silver-100)', margin: '0 0 2px' }}>Type Cassie</p>
                          <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--silver-400)', margin: 0 }}>Stock géré en grammes global (matière brute)</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Calibre */}
                  {!editForm.isAlaPiece && (
                    <div>
                      <label className="lux-label">Calibre</label>
                      <input
                        name="calibre"
                        required={!editForm.isAlaPiece}
                        value={editForm.calibre}
                        onChange={(e) => setEditForm(prev => ({ ...prev, calibre: e.target.value }))}
                        list="calibre-suggestions"
                        className="lux-input"
                        placeholder={categoryById(editForm.metalCategoryId || defaultCategoryId)?.calibres[0] || '925'}
                        style={{ marginTop: 6 }}
                      />
                      <datalist id="calibre-suggestions">
                        {(categoryById(editForm.metalCategoryId || defaultCategoryId)?.calibres || []).map(c => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </div>
                  )}

                  {/* Initial Qty */}
                  {!editForm.isAlaPiece && (
                    <div>
                      <label className="lux-label">{t.initialQty} (g)</label>
                      <input
                        name="qty"
                        type="number"
                        step="any"
                        min="0"
                        required={!editForm.isAlaPiece}
                        defaultValue={editForm.qty}
                        className="lux-input"
                        placeholder="0.00"
                        style={{ marginTop: 6 }}
                      />
                    </div>
                  )}

                  {editForm.isAlaPiece && (
                    <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: '12px 14px' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#60a5fa', margin: 0 }}>
                        Pour ce type, les formes et leurs quantités seront ajoutées lors des achats.
                      </p>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button type="button" onClick={() => { closeShowAddModal(); setEditingTypeId(null); }} className="btn-outline" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    {t.cancel}
                  </button>
                  <button type="submit" className="btn-silver" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    {t.save}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Inventory;
