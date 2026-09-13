import React, { useState } from 'react';
import { Plus, Receipt, DollarSign, Calendar, Edit2, Trash2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { translations } from '../../i18n/translations';
import { StoreExpense } from '../../types';

const StoreExpenses: React.FC = () => {
  const { storeExpenses, addStoreExpense, updateStoreExpense, deleteStoreExpense, language, can } = useApp();
  const t = translations[language];
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<StoreExpense | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      expenseName: fd.get('expenseName') as string,
      price: parseFloat(fd.get('price') as string),
      date: fd.get('date') as string,
      note: (fd.get('note') as string) || undefined,
    };

    if (editingExpense) {
      updateStoreExpense(editingExpense.id, data);
    } else {
      addStoreExpense(data);
    }
    
    closeModal();
  };

  const CLOSE_MS = 240;
  const [showAddModalClosing, setShowAddModalClosing] = useState(false);

  const closeModal = () => { setShowAddModal(false); setEditingExpense(null);
  };

  const handleEdit = (e: StoreExpense) => {
    setEditingExpense(e);
    setShowAddModal(true);
  };

  const totalExpenses = storeExpenses.reduce((sum: number, e: StoreExpense) => sum + e.price, 0);

  return (
    <div className="space-y-8 animate-fade-scale">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
        <div>
           <h2 className="text-3xl font-black text-slate-800 tracking-tighter">{t.storeExpenses}</h2>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Gestion des dépenses du magasin</p>
        </div>
        <button onClick={() => { setEditingExpense(null); setShowAddModal(true); }} style={can('storeExpenses.create') ? undefined : { display: 'none' }} className="btn-gold flex items-center gap-3 px-8 py-4 rounded-3xl font-black shadow-xl shadow-amber-200/40">
          <Plus size={22} />
          <span className="font-bold">{t.newExpense}</span>
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 text-white shadow-xl shadow-slate-200/30 border border-slate-700/50">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-white/10 p-4 rounded-2xl border border-white/20">
            <DollarSign size={32} className="text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Total des dépenses</p>
            <h3 className="text-4xl font-black tracking-tighter">{totalExpenses.toLocaleString('fr-FR')} DA</h3>
          </div>
        </div>
        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{storeExpenses.length} dépenses enregistrées</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {storeExpenses.map(e => (
          <div key={e.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group">
            <div className="flex justify-between items-start mb-8">
              <div className="bg-slate-50 p-4 rounded-2xl text-slate-800 border border-slate-100 group-hover:bg-rose-50 group-hover:text-rose-600 transition-all">
                <Receipt size={28} />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleEdit(e)}
                  className="p-2.5 text-slate-300 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all shadow-sm"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => deleteStoreExpense(e.id)}
                  style={can('storeExpenses.delete') ? undefined : { display: 'none' }} 
                  className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all shadow-sm"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            
            <h3 className="text-xl font-black text-slate-800 mb-6 tracking-tight">{e.expenseName}</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-4 text-slate-500 group-hover:text-slate-800 transition-colors font-bold text-sm">
                <DollarSign size={18} className="text-slate-400" />
                <span className="text-xl font-black text-slate-900">{e.price.toLocaleString('fr-FR')} DA</span>
              </div>
              <div className="flex items-center gap-4 text-slate-500 group-hover:text-slate-800 transition-colors font-bold text-sm">
                <Calendar size={18} className="text-slate-400" />
                <span>{new Date(e.date).toLocaleDateString('fr-FR')}</span>
              </div>
              {e.note && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 group-hover:bg-slate-100 transition-colors">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-1">Note</p>
                  <p className="text-sm text-slate-700">{e.note}</p>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.actions}</p>
            </div>
          </div>
        ))}
        {storeExpenses.length === 0 && (
          <div className="lg:col-span-3 py-20 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300">
             <Receipt size={48} className="mb-4" />
             <p className="font-black uppercase tracking-[4px] text-xs">Aucune dépense enregistrée</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className={`legacy-overlay fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4`}>
          <div className="bg-white rounded-[3.5rem] w-full max-w-md p-10 shadow-2xl animate-fade-scale relative">
            <button onClick={closeModal} className="absolute top-8 right-8 p-2 text-slate-300 hover:text-slate-800"><X size={24}/></button>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter mb-8">{editingExpense ? t.edit : t.newExpense}</h2>
            <form key={editingExpense?.id || 'new'} onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.expenseName}</label>
                <input 
                  name="expenseName" 
                  required 
                  defaultValue={editingExpense?.expenseName} 
                  placeholder="Ex: Électricité" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 font-bold outline-none" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.price}</label>
                <input 
                  name="price" 
                  type="number"
                  step="0.01"
                  required 
                  defaultValue={editingExpense?.price} 
                  placeholder="Ex: 15000" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 font-bold outline-none" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.date}</label>
                <input 
                  name="date" 
                  type="date"
                  required 
                  defaultValue={editingExpense?.date ? new Date(editingExpense.date).toISOString().split('T')[0] : ''} 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 font-bold outline-none" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Note (Optionnel)</label>
                <textarea 
                  name="note" 
                  defaultValue={editingExpense?.note || ''} 
                  placeholder="Ex: Facture ref. 12345..." 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 font-bold outline-none resize-none" 
                  rows={3}
                />
              </div>
              <div className="flex gap-4 mt-8">
                <button type="button" onClick={closeModal} className="flex-1 py-5 font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-colors">Annuler</button>
                <button type="submit" className="flex-1 py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreExpenses;
