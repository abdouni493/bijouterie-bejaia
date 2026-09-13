/**
 * ─── PERMISSION EDITOR ───────────────────────────────────────────────────────
 * The tick-list an administrator uses to decide exactly which screens and which
 * buttons an employee gets. Each module is a group: the first row is the screen
 * itself (`<module>.view`) and the rows under it are the buttons on that screen.
 *
 * Unticking a screen unticks its buttons too, because a button on a screen the
 * employee cannot open would be meaningless.
 */
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Check, Eye, MousePointerClick, ShieldCheck, Square, CheckSquare } from 'lucide-react';
import { permissionsByModule, MODULE_LABELS, DEFAULT_WORKER_PERMISSIONS, ALL_PERMISSION_KEYS } from '../../lib/permissions';
import type { Language } from '../../types';

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  language: Language;
}

const PermissionEditor: React.FC<Props> = ({ value, onChange, language }) => {
  const isAr = language === 'ar';
  const groups = useMemo(() => permissionsByModule(), []);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const has = (key: string) => value.includes(key);

  const toggle = (key: string, module: string, isView: boolean) => {
    let next: string[];

    if (has(key)) {
      next = value.filter(k => k !== key);
      // Turning a screen off turns its buttons off with it.
      if (isView) {
        const moduleKeys = groups.find(g => g.module === module)?.items.map(i => i.key) || [];
        next = next.filter(k => !moduleKeys.includes(k));
      }
    } else {
      next = [...value, key];
      // Granting a button implies granting the screen it lives on.
      if (!isView) {
        const viewKey = `${module}.view`;
        if (!next.includes(viewKey)) next.push(viewKey);
      }
    }
    onChange(next);
  };

  const toggleModule = (module: string) => {
    const keys = groups.find(g => g.module === module)?.items.map(i => i.key) || [];
    const allOn = keys.every(k => has(k));
    onChange(allOn ? value.filter(k => !keys.includes(k)) : Array.from(new Set([...value, ...keys])));
  };

  const granted = value.length;

  const quickButton = (label: string, apply: () => void) => (
    <button
      type="button"
      onClick={apply}
      style={{
        padding: '6px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 700,
        cursor: 'pointer', fontFamily: 'inherit',
        border: '1px solid var(--border)', background: 'transparent',
        color: 'var(--silver-300)',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Summary + shortcuts */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, flexWrap: 'wrap',
        padding: '12px 14px', borderRadius: 12,
        background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheck size={17} style={{ color: 'var(--gold)' }} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--silver-200)' }}>
            {granted} / {ALL_PERMISSION_KEYS.length} {isAr ? 'صلاحية ممنوحة' : 'permissions accordées'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {quickButton(isAr ? 'الافتراضي' : 'Par défaut', () => onChange([...DEFAULT_WORKER_PERMISSIONS]))}
          {quickButton(isAr ? 'الكل' : 'Tout cocher', () => onChange([...ALL_PERMISSION_KEYS]))}
          {quickButton(isAr ? 'لا شيء' : 'Tout décocher', () => onChange([]))}
        </div>
      </div>

      {/* One collapsible block per screen */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
        {groups.map(({ module, items }) => {
          const viewItem = items.find(i => i.kind === 'interface');
          const actions = items.filter(i => i.kind === 'action');
          const moduleOn = viewItem ? has(viewItem.key) : false;
          const activeCount = items.filter(i => has(i.key)).length;
          const label = MODULE_LABELS[module] ? (isAr ? MODULE_LABELS[module].ar : MODULE_LABELS[module].fr) : module;
          const isOpen = open[module] ?? false;

          return (
            <div
              key={module}
              style={{
                border: `1px solid ${moduleOn ? 'rgba(201,168,76,0.3)' : 'var(--border)'}`,
                borderRadius: 12, overflow: 'hidden',
                background: moduleOn ? 'rgba(201,168,76,0.04)' : 'transparent',
              }}
            >
              {/* Screen row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
                <button
                  type="button"
                  onClick={() => viewItem && toggle(viewItem.key, module, true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9, flex: 1,
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: 0, textAlign: isAr ? 'right' : 'left', fontFamily: 'inherit',
                  }}
                >
                  <span style={{
                    width: 19, height: 19, borderRadius: 6, flexShrink: 0,
                    border: `1.5px solid ${moduleOn ? 'var(--gold)' : 'var(--border)'}`,
                    background: moduleOn ? 'var(--gold)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>
                    {moduleOn && <Check size={13} strokeWidth={3} style={{ color: 'var(--deep-bg)' }} />}
                  </span>
                  <Eye size={14} style={{ color: moduleOn ? 'var(--gold)' : 'var(--silver-400)', flexShrink: 0 }} />
                  <span style={{
                    fontSize: 13.5, fontWeight: 700,
                    color: moduleOn ? 'var(--silver-100)' : 'var(--silver-300)',
                  }}>
                    {label}
                  </span>
                  {activeCount > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 99,
                      background: 'rgba(201,168,76,0.15)', color: 'var(--gold)',
                    }}>
                      {activeCount}/{items.length}
                    </span>
                  )}
                </button>

                {actions.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleModule(module)}
                      title={isAr ? 'تحديد الكل' : 'Tout cocher pour cet écran'}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--silver-400)', padding: 4, display: 'flex',
                      }}
                    >
                      {items.every(i => has(i.key)) ? <CheckSquare size={15} /> : <Square size={15} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(o => ({ ...o, [module]: !isOpen }))}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--silver-400)', padding: 4, display: 'flex',
                      }}
                    >
                      <motion.span animate={{ rotate: isOpen ? 180 : 0 }} style={{ display: 'flex' }}>
                        <ChevronDown size={16} />
                      </motion.span>
                    </button>
                  </>
                )}
              </div>

              {/* Button rows */}
              {isOpen && actions.length > 0 && (
                <div style={{
                  borderTop: '1px solid var(--border)',
                  padding: '8px 12px 10px',
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 4,
                }}>
                  {actions.map(a => {
                    const on = has(a.key);
                    return (
                      <button
                        key={a.key}
                        type="button"
                        onClick={() => toggle(a.key, module, false)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: '6px 4px', textAlign: isAr ? 'right' : 'left',
                          fontFamily: 'inherit', borderRadius: 8,
                        }}
                      >
                        <span style={{
                          width: 16, height: 16, borderRadius: 5, flexShrink: 0,
                          border: `1.5px solid ${on ? 'var(--gold)' : 'var(--border)'}`,
                          background: on ? 'var(--gold)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {on && <Check size={11} strokeWidth={3} style={{ color: 'var(--deep-bg)' }} />}
                        </span>
                        <MousePointerClick size={12} style={{ color: 'var(--silver-400)', flexShrink: 0 }} />
                        <span style={{ fontSize: 12.5, color: on ? 'var(--silver-200)' : 'var(--silver-400)' }}>
                          {isAr ? a.labelAr : a.labelFr}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PermissionEditor;
