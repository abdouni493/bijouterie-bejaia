import React, { useState } from 'react';
import { Plus, Truck, Phone, Calendar, CreditCard, Edit2, Trash2, X, History } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { translations } from '../../i18n/translations';
import { Delivery } from '../../types';

const Deliveries: React.FC = () => {
  const { deliveries, addDelivery, updateDelivery, deleteDelivery, addPaymentAction, deletePaymentAction, language, can } = useApp();
  const t = translations[language];
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      fullName: fd.get('fullName') as string,
      phone: fd.get('phone') as string,
      createdDate: editingDelivery?.createdDate || new Date().toISOString(),
      paymentHistory: editingDelivery?.paymentHistory || [],
    };

    if (editingDelivery) {
      updateDelivery(editingDelivery.id, data);
    } else {
      addDelivery(data);
    }
    
    closeModal();
  };

  const handlePaymentSubmit = (e: React.FormEvent<HTMLFormElement>, deliveryId: string) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      amount: parseFloat(fd.get('amount') as string),
      date: fd.get('date') as string,
      method: fd.get('method') as 'cash' | 'cassie_silver' | 'cassie_gold' | 'mixed',
    };

    addPaymentAction(deliveryId, data);
    closeShowPaymentModal();
  };

  const CLOSE_MS = 240;
  const [showAddModalClosing, setShowAddModalClosing] = useState(false);
  const [selectedDeliveryClosing, setSelectedDeliveryClosing] = useState(false);
  const [showPaymentModalClosing, setShowPaymentModalClosing] = useState(false);

  const closeModal = () => { setShowAddModal(false); setEditingDelivery(null);
  };

  const closeSelectedDelivery = () => { setSelectedDelivery(null);
  };

  const closeShowPaymentModal = () => { setShowPaymentModal(false);
  };

  const handleEdit = (d: Delivery) => {
    setEditingDelivery(d);
    setShowAddModal(true);
  };

  return (
    <div className="space-y-8 animate-fade-scale">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
        <div>
           <h2 className="text-3xl font-black text-slate-800 tracking-tighter">{t.deliveries}</h2>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Gestion des livraisons</p>
        </div>
        <button onClick={() => { setEditingDelivery(null); setShowAddModal(true); }} style={can('deliveries.create') ? undefined : { display: 'none' }} className="btn-gold flex items-center gap-3 px-8 py-4 rounded-3xl font-black shadow-xl shadow-amber-200/40">
          <Plus size={22} />
          <span className="font-bold">{t.newDelivery}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {deliveries.map(d => (
          <div key={d.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group">
            <div className="flex justify-between items-start mb-8">
              <div className="bg-slate-50 p-4 rounded-2xl text-slate-800 border border-slate-100 group-hover:bg-amber-50 group-hover:text-amber-600 transition-all">
                <Truck size={28} />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleEdit(d)}
                  className="p-2.5 text-slate-300 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all shadow-sm"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => { if (confirm(t.delete + ' ?')) deleteDelivery(d.id); }}
                  style={can('deliveries.delete') ? undefined : { display: 'none' }} 
                  className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all shadow-sm"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            
            <h3 className="text-xl font-black text-slate-800 mb-6 tracking-tight">{d.fullName}</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-4 text-slate-500 group-hover:text-slate-800 transition-colors font-bold text-sm">
                <Phone size={18} className="text-slate-400" />
                <span>{d.phone}</span>
              </div>
              <div className="flex items-center gap-4 text-slate-500 group-hover:text-slate-800 transition-colors font-bold text-sm">
                <Calendar size={18} className="text-slate-400" />
                <span>{new Date(d.createdDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-4 text-slate-500 group-hover:text-slate-800 transition-colors font-bold text-sm">
                <CreditCard size={18} className="text-slate-400" />
                <span>{d.paymentHistory.length} {t.paymentHistory}</span>
              </div>
            </div>

            <button 
              onClick={() => setSelectedDelivery(d.id)}
              className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 uppercase tracking-widest text-[10px]"
            >
              <History size={18} className="text-amber-400" />
              {t.paymentHistory}
            </button>
          </div>
        ))}
        {deliveries.length === 0 && (
          <div className="lg:col-span-3 py-20 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300">
             <Truck size={48} className="mb-4" />
             <p className="font-black uppercase tracking-[4px] text-xs">Aucune livraison enregistrée</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className={`legacy-overlay fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4`}>
          <div className="bg-white rounded-[3.5rem] w-full max-w-md p-10 shadow-2xl animate-fade-scale relative">
            <button onClick={closeModal} className="absolute top-8 right-8 p-2 text-slate-300 hover:text-slate-800"><X size={24}/></button>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter mb-8">{editingDelivery ? t.edit : t.newDelivery}</h2>
            <form key={editingDelivery?.id || 'new'} onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.fullName}</label>
                <input 
                  name="fullName" 
                  required 
                  defaultValue={editingDelivery?.fullName} 
                  placeholder="Ex: Ahmed Rami" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 font-bold outline-none" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.phone}</label>
                <input 
                  name="phone" 
                  required 
                  defaultValue={editingDelivery?.phone} 
                  placeholder="05XX XX XX XX" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 font-bold outline-none" 
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

      {selectedDelivery && (
        <div className={`legacy-overlay fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4`}>
          <div className="bg-white rounded-[3.5rem] w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-10 shadow-2xl animate-fade-scale relative">
            <button onClick={closeSelectedDelivery} className="absolute top-8 right-8 p-2 text-slate-300 hover:text-slate-800"><X size={24}/></button>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter mb-8 flex items-center gap-4 pr-8">
              <History className="text-amber-500" />
              {t.paymentHistory} - {deliveries.find(d => d.id === selectedDelivery)?.fullName}
            </h2>
            <div className="flex-1 overflow-y-auto space-y-4 pr-3 no-scrollbar">
              {deliveries.find(d => d.id === selectedDelivery)?.paymentHistory.map(p => (
                <div key={p.id} className="p-6 border border-slate-50 rounded-[2rem] bg-slate-50/50 flex justify-between items-center group hover:bg-white hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-100 text-amber-600`}>
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-slate-800">{p.amount} DA</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-50 text-amber-500`}>
                          {p.method}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-black uppercase">{new Date(p.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { if (confirm(t.delete + ' ?')) deletePaymentAction(selectedDelivery, p.id); }}
                    style={can('deliveries.payment.delete') ? undefined : { display: 'none' }}
                    className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all shadow-sm"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {(!deliveries.find(d => d.id === selectedDelivery)?.paymentHistory || deliveries.find(d => d.id === selectedDelivery)?.paymentHistory.length === 0) && (
                <div className="py-20 text-center text-slate-300">
                  <p className="font-black uppercase tracking-widest text-xs">Aucun paiement enregistré</p>
                </div>
              )}
            </div>
            <button 
              onClick={() => setShowPaymentModal(true)}
              className="mt-8 w-full py-5 mb-4 bg-slate-900 text-white font-black rounded-[2rem] shadow-xl uppercase tracking-widest text-[10px] flex items-center justify-center gap-3" 
            >
              <Plus size={18} className="text-amber-400" />
              {t.addPayment}
            </button>
            <button onClick={closeSelectedDelivery} className="w-full py-5 bg-slate-100 text-slate-800 font-black rounded-[2rem] shadow-xl uppercase tracking-widest text-[10px]">Fermer</button>
          </div>
        </div>
      )}

      {showPaymentModal && selectedDelivery && (
        <div className={`legacy-overlay fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[110] flex items-center justify-center p-4`}>
          <div className="bg-white rounded-[3.5rem] w-full max-w-md p-10 shadow-2xl animate-fade-scale relative">
            <button onClick={closeShowPaymentModal} className="absolute top-8 right-8 p-2 text-slate-300 hover:text-slate-800"><X size={24}/></button>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter mb-8">{t.addPayment}</h2>
            <form onSubmit={(e) => handlePaymentSubmit(e, selectedDelivery)} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.amount}</label>
                <input 
                  name="amount" 
                  type="number"
                  step="0.01"
                  required 
                  placeholder="Ex: 5000" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 font-bold outline-none" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.date}</label>
                <input 
                  name="date" 
                  type="date"
                  required 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 font-bold outline-none" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.paymentMethod}</label>
                <select 
                  name="method" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 font-bold outline-none"
                >
                  <option value="cash">{t.cash}</option>
                  <option value="cassie_silver">{t.cassieSilver}</option>
                  <option value="cassie_gold">{t.cassieGold}</option>
                  <option value="mixed">Mixte</option>
                </select>
              </div>
              <div className="flex gap-4 mt-8">
                <button type="button" onClick={closeShowPaymentModal} className="flex-1 py-5 font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-colors">Annuler</button>
                <button type="submit" className="flex-1 py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest">Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Deliveries;
