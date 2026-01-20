
import React, { useState } from 'react';
import { JobRequest, Professional, JobStatus, Category } from '../types';
import { optimizeProfessionalProfile } from '../services/geminiService';

interface ProfessionalDashboardProps {
  professional: Professional;
  requests: JobRequest[];
  onAcceptRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string) => void;
  onUpdateProfile: (updatedPro: Professional) => void;
}

const ProfessionalDashboard: React.FC<ProfessionalDashboardProps> = ({ professional, requests, onAcceptRequest, onRejectRequest, onUpdateProfile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [editForm, setEditForm] = useState<Professional>(professional);
  const [newCert, setNewCert] = useState('');

  // Filtra le richieste in cui il pro è stato selezionato MA non l'ha ancora rifiutata
  const myRequests = requests.filter(r => 
    r.selectedProIds.includes(professional.id) && 
    !(r.rejectedProIds || []).includes(professional.id)
  );

  const handleSave = () => {
    onUpdateProfile(editForm);
    setIsEditing(false);
  };

  const handleOptimizeAI = async () => {
    setIsOptimizing(true);
    const result = await optimizeProfessionalProfile(editForm);
    setEditForm(prev => ({
      ...prev,
      bio: result.bio,
      cvSummary: result.cvSummary
    }));
    setIsOptimizing(false);
  };

  const addCert = () => {
    if (newCert.trim()) {
      setEditForm(prev => ({ ...prev, certifications: [...prev.certifications, newCert.trim()] }));
      setNewCert('');
    }
  };

  const removeCert = (index: number) => {
    setEditForm(prev => ({ ...prev, certifications: prev.certifications.filter((_, i) => i !== index) }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Profile Section */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="relative group">
          <img src={professional.avatar} className="w-24 h-24 rounded-2xl object-cover shadow-lg" alt={professional.name} />
          {professional.email === 'demo.esperto@munus.it' && (
            <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-lg">Demo</div>
          )}
        </div>
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-3xl font-black text-slate-900">Bentornato, {professional.name.split(' ')[0]}</h2>
          <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
            <span className="bg-blue-50 text-blue-600 font-bold uppercase tracking-widest text-[10px] px-3 py-1 rounded-full border border-blue-100">{professional.category}</span>
            <span className="bg-slate-50 text-slate-500 font-bold uppercase tracking-widest text-[10px] px-3 py-1 rounded-full border border-slate-100">★ {professional.ranking.toFixed(1)}</span>
            <span className="bg-slate-50 text-slate-500 font-bold uppercase tracking-widest text-[10px] px-3 py-1 rounded-full border border-slate-100">Radius: {professional.workingRadius}km</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { setEditForm(professional); setIsEditing(true); }}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-black shadow-lg shadow-slate-200 hover:bg-blue-600 transition-all active:scale-95"
          >
            Modifica Profilo
          </button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-10">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Il tuo Curriculum Professionale</h3>
                <button onClick={() => setIsEditing(false)} className="p-3 text-slate-400 hover:text-slate-900 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg></button>
              </div>

              <div className="grid md:grid-cols-2 gap-10">
                {/* Left Column: Basic Info & AI Bio */}
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Biografia Professionale (AI Support)</label>
                    <textarea 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-medium text-slate-700 focus:bg-white focus:border-blue-500 transition-all outline-none"
                      rows={4}
                      placeholder="Descrivi la tua esperienza, specializzazioni e attitudine..."
                      value={editForm.bio}
                      onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                    />
                    <button 
                      onClick={handleOptimizeAI}
                      disabled={isOptimizing}
                      className="mt-3 flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:text-blue-700 disabled:opacity-50"
                    >
                      {isOptimizing ? 'Ottimizzazione...' : (
                        <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Ottimizza con AI Assist</>
                      )}
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Certificazioni e Abilitazioni</label>
                    <div className="flex gap-2 mb-3">
                      <input 
                        type="text" 
                        className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-bold"
                        placeholder="Es: Patentino F-GAS, Cert. Domotica..."
                        value={newCert}
                        onChange={(e) => setNewCert(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addCert()}
                      />
                      <button onClick={addCert} className="bg-blue-600 text-white px-4 rounded-xl font-black">+</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editForm.certifications.map((cert, idx) => (
                        <span key={idx} className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black flex items-center gap-2 border border-blue-100">
                          {cert}
                          <button onClick={() => removeCert(idx)} className="text-blue-300 hover:text-red-500 font-black">×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Distance & Rates */}
                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Operatività Territoriale</label>
                    
                    <div className="mb-6">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Sede di Lavoro (Indirizzo)</label>
                      <input 
                        type="text" 
                        className="w-full bg-white border-2 border-slate-100 rounded-xl py-3 px-4 font-bold text-slate-700 focus:border-blue-500 outline-none transition-all"
                        placeholder="Es: Via Roma 10, Milano"
                        value={editForm.location.address}
                        onChange={(e) => setEditForm({...editForm, location: {...editForm.location, address: e.target.value}})}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-slate-700">Raggio di azione:</span>
                        <span className="text-lg font-black text-blue-600">{editForm.workingRadius} km</span>
                      </div>
                      <input 
                        type="range" min="1" max="150" step="5"
                        className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        value={editForm.workingRadius}
                        onChange={(e) => setEditForm({...editForm, workingRadius: parseInt(e.target.value)})}
                      />
                      <p className="text-[10px] text-slate-400 font-medium italic">Ti proporremo solo lavori entro questa distanza dalla tua sede.</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Tariffa Oraria (Range Indicativo)</label>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <span className="text-[9px] font-black text-slate-400 block mb-1">MIN (€/h)</span>
                        <input type="number" className="w-full py-3 px-4 rounded-xl border-2 border-slate-100 font-black text-xl text-center" value={editForm.hourlyRate.min} onChange={(e) => setEditForm({...editForm, hourlyRate: {...editForm.hourlyRate, min: parseInt(e.target.value)||0}})} />
                      </div>
                      <div className="w-4 h-0.5 bg-slate-300 mt-5"></div>
                      <div className="flex-1">
                        <span className="text-[9px] font-black text-slate-400 block mb-1">MAX (€/h)</span>
                        <input type="number" className="w-full py-3 px-4 rounded-xl border-2 border-slate-100 font-black text-xl text-center" value={editForm.hourlyRate.max} onChange={(e) => setEditForm({...editForm, hourlyRate: {...editForm.hourlyRate, max: parseInt(e.target.value)||0}})} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-12 flex gap-4">
                <button onClick={() => setIsEditing(false)} className="flex-1 py-5 rounded-2xl font-black text-slate-400 hover:bg-slate-50 transition-all">Annulla</button>
                <button onClick={handleSave} className="flex-[2] bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 text-sm">Salva e Aggiorna Profilo</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content: Opportunities & Stats */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-black text-slate-900 px-2 flex items-center justify-between">
            <span>Opportunità di lavoro ({myRequests.length})</span>
            <span className="text-[10px] text-blue-600 uppercase tracking-widest font-black">Nuove richieste</span>
          </h3>
          
          {myRequests.length === 0 ? (
            <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-16 text-center shadow-inner bg-slate-50/20">
              <p className="text-slate-400 font-bold mb-2">Nessuna nuova richiesta al momento.</p>
              <p className="text-[10px] text-slate-300 uppercase tracking-widest">Riceverai una notifica non appena sarai selezionato.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myRequests.slice().reverse().map(request => {
                const isAccepted = request.acceptedProIds.includes(professional.id);
                const isHired = request.hiredProId === professional.id;
                
                return (
                  <div key={request.id} className={`bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm transition-all hover:shadow-md ${isHired ? 'ring-4 ring-blue-100 border-blue-200' : ''} animate-in slide-in-from-bottom-4 duration-500`}>
                    <div className="flex justify-between items-start mb-6">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{request.createdAt} • ID: {request.id.slice(0, 5)}</span>
                        <h4 className="text-xl font-black text-slate-900 leading-tight">{request.description}</h4>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-blue-600">{request.budgetRange.min}€ - {request.budgetRange.max}€</div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter block">Budget Stimato</span>
                        {isHired && <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase mt-3 inline-block shadow-lg shadow-blue-100">Sei stato scelto!</span>}
                      </div>
                    </div>

                    {request.clarifications && request.clarifications.length > 0 && (
                      <div className="bg-slate-50 rounded-3xl p-6 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-100">
                        {request.clarifications.map((c, i) => (
                          <div key={i} className="space-y-1">
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{c.question}</p>
                            <p className="text-sm font-bold text-slate-700">{c.answer}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-4">
                      {!isAccepted ? (
                        <>
                          <button 
                            onClick={() => onAcceptRequest(request.id)}
                            className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 text-sm uppercase tracking-widest"
                          >
                            Accetta Incarico
                          </button>
                          <button 
                            onClick={() => onRejectRequest(request.id)}
                            className="flex-1 bg-white text-slate-400 py-4 rounded-2xl font-black border border-slate-200 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all active:scale-95 text-sm uppercase tracking-widest"
                          >
                            Rifiuta
                          </button>
                        </>
                      ) : (
                        <div className="w-full bg-green-50 text-green-600 py-4 rounded-2xl font-black text-center border border-green-100 flex items-center justify-center gap-2 uppercase tracking-widest text-sm">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                          Hai dato la tua disponibilità
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar: Profile Summary & Stats */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Certificazioni Attive</h4>
             <div className="space-y-3">
               {professional.certifications.length > 0 ? (
                 professional.certifications.map((c, i) => (
                   <div key={i} className="flex items-center gap-3 text-sm font-bold text-slate-200 bg-white/5 p-3 rounded-xl border border-white/10">
                     <svg className="w-5 h-5 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/></svg>
                     {c}
                   </div>
                 ))
               ) : (
                 <p className="text-[10px] text-slate-500 italic">Nessuna certificazione inserita.</p>
               )}
             </div>
          </div>

          <h3 className="text-xl font-black text-slate-900 px-2">Performance</h3>
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 space-y-6 shadow-sm">
             <div className="flex justify-between items-center border-b border-slate-50 pb-4">
               <span className="text-sm text-slate-400 font-bold uppercase tracking-tight">Lavori completati</span>
               <span className="text-2xl font-black text-slate-900">{professional.reviews.length}</span>
             </div>
             <div className="flex justify-between items-center border-b border-slate-50 pb-4">
               <span className="text-sm text-slate-400 font-bold uppercase tracking-tight">Tariffa (€/h)</span>
               <span className="text-xl font-black text-slate-900">€{editForm.hourlyRate.min}-{editForm.hourlyRate.max}</span>
             </div>
             <div className="flex justify-between items-center">
               <span className="text-sm text-slate-400 font-bold uppercase tracking-tight">Copertura Area</span>
               <span className="text-xl font-black text-blue-600">{professional.workingRadius}km</span>
             </div>
          </div>

          <h3 className="text-xl font-black text-slate-900 px-2">Recensioni</h3>
          <div className="space-y-4">
            {professional.reviews.length === 0 ? (
              <p className="text-xs text-slate-400 italic px-2">Ancora nessuna recensione.</p>
            ) : (
              professional.reviews.slice(0, 3).map(review => (
                <div key={review.id} className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm hover:border-blue-100 transition-colors">
                  <div className="flex justify-between mb-3">
                    <span className="text-xs font-black text-slate-900">{review.clientName}</span>
                    <div className="text-yellow-400 text-xs">★ {review.rating}</div>
                  </div>
                  <p className="text-[11px] text-slate-500 italic leading-relaxed">"{review.comment}"</p>
                  <div className="mt-3 text-[9px] text-slate-300 font-bold uppercase tracking-widest">{review.date}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalDashboard;
