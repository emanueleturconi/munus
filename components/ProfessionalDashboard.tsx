
import React, { useState, useMemo } from 'react';
import { JobRequest, Professional, JobStatus, Category, Review, SubscriptionPlan } from '../types';
import { optimizeProfessionalProfile } from '../services/geminiService';

interface ProfessionalDashboardProps {
  professional: Professional;
  requests: JobRequest[];
  allProfessionals: Professional[];
  onAcceptRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string) => void;
  onUpdateProfile: (updatedPro: Professional) => void;
  onConfirmWork: (reviewId: string) => void;
  onReplyToReview: (reviewId: string, comment: string, rating: number) => void;
  onUpgradeSubscription: (plan: SubscriptionPlan) => void;
}

const ProfessionalDashboard: React.FC<ProfessionalDashboardProps> = ({ 
  professional, requests, allProfessionals, onAcceptRequest, onRejectRequest, onUpdateProfile, onConfirmWork, onReplyToReview, onUpgradeSubscription 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [editForm, setEditForm] = useState<Professional>(professional);
  const [showClientHistoryId, setShowClientHistoryId] = useState<string | null>(null);
  
  const [replyReviewId, setReplyReviewId] = useState<string | null>(null);
  const [replyComment, setReplyComment] = useState('');
  const [replyRating, setRating] = useState(5);

  const sub = professional.subscription || { plan: SubscriptionPlan.BASE, isTrialUsed: false };

  const isSubscriptionValid = useMemo(() => {
    if (sub.plan === SubscriptionPlan.BASE) return false;
    if (!sub.expiryDate) return false;

    try {
      const [day, month, year] = sub.expiryDate.split('/').map(Number);
      const expiryDateObj = new Date(year, month - 1, day, 23, 59, 59);
      return expiryDateObj >= new Date();
    } catch (e) {
      return false;
    }
  }, [sub]);

  const isPremium = isSubscriptionValid;
  const isExpired = !isPremium && sub.plan !== SubscriptionPlan.BASE;

  const allMyRequests = requests.filter(r => r.selectedProIds.includes(professional.id));
  const newOpportunities = allMyRequests.filter(r => 
    !(r.acceptedProIds || []).includes(professional.id) && 
    !(r.rejectedProIds || []).includes(professional.id) &&
    r.status !== JobStatus.COMPLETED &&
    r.status !== JobStatus.CONFIRMED
  );
  
  const pendingConfirmations = professional.reviews.filter(r => !r.isConfirmed);
  const confirmedReviews = professional.reviews.filter(r => r.isConfirmed);

  const getClientHistory = (clientId: string) => {
    const history: { proName: string, comment: string, rating: number, date: string }[] = [];
    allProfessionals.forEach(pro => {
      pro.reviews.forEach(rev => {
        if (rev.clientId === clientId && rev.proReply) {
          history.push({
            proName: pro.name,
            comment: rev.proReply.comment,
            rating: rev.proReply.clientRating,
            date: rev.proReply.date
          });
        }
      });
    });
    return history;
  };

  const handleSave = () => {
    onUpdateProfile(editForm);
    setIsEditing(false);
  };

  const handleOptimizeAI = async () => {
    setIsOptimizing(true);
    const result = await optimizeProfessionalProfile(editForm);
    setEditForm(prev => ({ ...prev, bio: result.bio, cvSummary: result.cvSummary }));
    setIsOptimizing(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Profilo */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="relative">
          <img src={professional.avatar} className={`w-24 h-24 rounded-2xl object-cover shadow-lg transition-all ${isPremium ? 'ring-4 ring-yellow-400' : 'ring-2 ring-slate-100'}`} alt={professional.name} />
          {isPremium && (
            <div className="absolute -top-3 -right-3 bg-yellow-400 text-white w-8 h-8 rounded-full border-2 border-white flex items-center justify-center font-black shadow-lg">P</div>
          )}
        </div>
        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-3">
             <h2 className="text-3xl font-black text-slate-900">Bentornato, {professional.name.split(' ')[0]}</h2>
             {isPremium && <span className="bg-yellow-100 text-yellow-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Premium Member</span>}
             {isExpired && <span className="bg-red-100 text-red-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Premium Scaduto</span>}
          </div>
          <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
            <span className="bg-blue-50 text-blue-600 font-bold uppercase tracking-widest text-[10px] px-3 py-1 rounded-full border border-blue-100">{professional.category}</span>
            <span className="bg-slate-50 text-slate-500 font-bold uppercase tracking-widest text-[10px] px-3 py-1 rounded-full border border-slate-100">★ {professional.ranking.toFixed(1)}</span>
            <span className="bg-slate-50 text-slate-500 font-bold uppercase tracking-widest text-[10px] px-3 py-1 rounded-full border border-slate-100">{confirmedReviews.length} Recensioni</span>
          </div>
        </div>
        <button onClick={() => { setEditForm(professional); setIsEditing(true); }} className="bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-black shadow-lg">Modifica Profilo</button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* SEZIONE ABBONAMENTO */}
          <div className={`rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden transition-all ${isPremium ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gradient-to-br from-blue-900 to-slate-900'}`}>
             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
             <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`${isPremium ? 'bg-yellow-400 text-slate-900' : 'bg-blue-600 text-white'} p-2 rounded-xl`}>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tight">Munus Premium Club</h3>
                </div>
                
                {isPremium ? (
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-slate-400 text-sm font-medium">Il tuo abbonamento <span className="text-yellow-400 font-bold">{sub.plan}</span> è attivo.</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">Scadenza: {sub.expiryDate || 'N/A'}</p>
                    </div>
                    <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10">
                       <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Status: In Regola</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-2">
                       <p className="text-slate-300 text-sm leading-relaxed max-w-xl italic">
                         {isExpired 
                           ? "Attenzione: Il tuo abbonamento è scaduto. Rinnova ora per non perdere i vantaggi e continuare a sbloccare i feedback dei clienti."
                           : "La tua reputazione è il tuo motore. Solo i membri Premium possono sbloccare i feedback dei clienti, l'unico modo per scalare gli algoritmi di ricerca di Munus."
                         }
                       </p>
                       {isExpired && (
                         <div className="flex items-center gap-2 text-red-400 text-[10px] font-black uppercase tracking-widest">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                            Scaduto il: {sub.expiryDate}
                         </div>
                       )}
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      {!sub.isTrialUsed && (
                        <button onClick={() => onUpgradeSubscription(SubscriptionPlan.TRIAL)} className="bg-white/10 hover:bg-white/20 border border-white/10 p-4 rounded-2xl text-left transition-all">
                          <p className="text-[10px] font-black text-blue-400 uppercase mb-1">Prova</p>
                          <p className="text-lg font-black">7 Giorni</p>
                          <p className="text-xs text-slate-400">Gratis (Una volta)</p>
                        </button>
                      )}
                      <button onClick={() => onUpgradeSubscription(SubscriptionPlan.MONTHLY)} className="bg-white/10 hover:bg-white/20 border border-white/10 p-4 rounded-2xl text-left transition-all">
                        <p className="text-[10px] font-black text-yellow-400 uppercase mb-1">Mensile</p>
                        <p className="text-lg font-black">4,99 €</p>
                        <p className="text-xs text-slate-400">Ogni mese</p>
                      </button>
                      <button onClick={() => onUpgradeSubscription(SubscriptionPlan.ANNUAL)} className="bg-blue-600 hover:bg-blue-500 p-4 rounded-2xl text-left transition-all shadow-lg shadow-blue-900/50">
                        <p className="text-[10px] font-black text-blue-200 uppercase mb-1">Annuale</p>
                        <p className="text-lg font-black">29,99 €</p>
                        <p className="text-xs text-blue-200">Risparmia 50%</p>
                      </button>
                    </div>
                  </div>
                )}
             </div>
          </div>

          {/* Lavori da confermare */}
          {pendingConfirmations.length > 0 && (
            <div className="space-y-4">
               <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                 <span className={`w-2 h-2 rounded-full animate-ping ${isPremium ? 'bg-blue-500' : 'bg-red-500'}`}></span>
                 Feedback da sbloccare ({pendingConfirmations.length})
               </h3>
               <div className="grid gap-4">
                 {pendingConfirmations.map(review => (
                   <div key={review.id} className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                     <div className="text-left flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Intervento dichiarato da {review.clientName}</p>
                          {!isPremium && <span className="bg-red-50 text-red-500 text-[8px] font-black px-1.5 py-0.5 rounded border border-red-100 uppercase">{isExpired ? 'ABBONAMENTO SCADUTO' : 'PROFILO BASE'}</span>}
                        </div>
                        <h4 className="text-lg font-black text-slate-900">{review.jobDescription}</h4>
                        {!isPremium && <p className="text-[10px] text-red-400 font-bold mt-1">Sottoscrivi o rinnova un piano Premium per confermare ed ottenere il feedback.</p>}
                     </div>
                     
                     {isPremium ? (
                       <button 
                         onClick={() => onConfirmWork(review.id)}
                         className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase shadow-lg shadow-blue-100 hover:scale-105 transition-transform"
                       >
                         Conferma Esecuzione
                       </button>
                     ) : (
                       <div className="bg-slate-50 border border-slate-200 px-8 py-4 rounded-2xl text-slate-400 font-black text-xs uppercase cursor-not-allowed opacity-60">
                         {isExpired ? 'Rinnova Premium' : 'Sblocca con Premium'}
                       </div>
                     )}
                   </div>
                 ))}
               </div>
            </div>
          )}

          {/* Sezione Nuove Opportunità */}
          <div>
            <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-3">
              Nuove Opportunità
              <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full">{newOpportunities.length}</span>
            </h3>
            {newOpportunities.length === 0 ? (
              <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-12 text-center">
                <p className="text-slate-400 font-bold">Nessuna nuova richiesta al momento.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {newOpportunities.map(request => {
                  const clientHistory = getClientHistory(request.clientId);
                  const isHistoryExpanded = showClientHistoryId === request.id;

                  return (
                    <div key={request.id} className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm group hover:border-blue-300 transition-all overflow-hidden">
                      <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                        <div className="flex-1 space-y-4">
                          {/* Dettagli Richiesta */}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                               <h4 className="text-xl font-black text-slate-900">{request.description}</h4>
                            </div>
                            <p className="text-xs text-slate-500 font-bold uppercase mt-1">{request.city} • {request.createdAt}</p>
                            <span className="inline-block mt-3 text-lg font-black text-blue-600">{request.budgetRange.min}€ - {request.budgetRange.max}€</span>
                          </div>

                          {/* Sezione Reputazione Cliente */}
                          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 relative">
                             <div className="flex items-center gap-4">
                                <img src={request.clientAvatar} className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm" alt={request.clientName} />
                                <div className="flex-1">
                                   <div className="flex items-center gap-2">
                                      <span className="text-sm font-black text-slate-900">{request.clientName}</span>
                                      <div className="bg-yellow-400 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm">
                                        ★ {request.clientRanking?.toFixed(1) || "5.0"}
                                      </div>
                                   </div>
                                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Reputazione Cliente Verificata</p>
                                </div>
                                {clientHistory.length > 0 && (
                                  <button 
                                    onClick={() => setShowClientHistoryId(isHistoryExpanded ? null : request.id)}
                                    className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                                  >
                                    {isHistoryExpanded ? 'Chiudi' : `Vedi ${clientHistory.length} Feedback`}
                                  </button>
                                )}
                             </div>

                             {isHistoryExpanded && (
                               <div className="mt-4 pt-4 border-t border-slate-200 space-y-3 animate-in fade-in slide-in-from-top-2">
                                  <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Commenti dei colleghi:</p>
                                  {clientHistory.map((h, i) => (
                                    <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                       <div className="flex justify-between items-center mb-1">
                                          <span className="text-[9px] font-black text-blue-500 uppercase">{h.proName}</span>
                                          <span className="text-yellow-500 text-[9px]">★ {h.rating}</span>
                                       </div>
                                       <p className="text-xs text-slate-600 italic">"{h.comment}"</p>
                                    </div>
                                  ))}
                               </div>
                             )}

                             {clientHistory.length === 0 && (
                               <p className="mt-3 text-[10px] text-slate-400 italic">Il cliente non ha ancora ricevuto valutazioni da altri esperti.</p>
                             )}
                          </div>
                        </div>

                        <div className="flex flex-row lg:flex-col gap-3 w-full lg:w-48">
                          <button 
                            onClick={() => onAcceptRequest(request.id)} 
                            className="flex-1 bg-blue-600 text-white py-4 px-6 rounded-2xl font-black text-sm uppercase hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
                          >
                            Candidati
                          </button>
                          <button 
                            onClick={() => onRejectRequest(request.id)} 
                            className="bg-slate-100 text-slate-400 py-4 px-6 rounded-2xl font-black hover:bg-red-50 hover:text-red-500 transition-all"
                            title="Rifiuta"
                          >
                            X
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-black text-slate-900">Feedback Pubblici ({confirmedReviews.length})</h3>
          <div className="space-y-4">
            {confirmedReviews.length === 0 ? (
              <p className="text-xs text-slate-400 italic px-2">Ancora nessuna recensione visibile.</p>
            ) : (
              confirmedReviews.map(review => (
                <div key={review.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex justify-between">
                    <span className="text-xs font-black text-slate-900">{review.clientName}</span>
                    <div className="text-yellow-400 text-xs">★ {review.rating}</div>
                  </div>
                  <p className="text-sm text-slate-600 italic">"{review.comment}"</p>
                  
                  {review.proReply ? (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] font-black text-blue-600 uppercase">Tua Risposta:</span>
                        <span className="text-yellow-500 text-[10px]">Hai dato ★ {review.proReply.clientRating}</span>
                      </div>
                      <p className="text-xs text-slate-500">"{review.proReply.comment}"</p>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setReplyReviewId(review.id)}
                      className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                    >
                      Rispondi al Cliente
                    </button>
                  )}
                  
                  {replyReviewId === review.id && (
                    <div className="pt-4 border-t border-slate-100 animate-in fade-in">
                       <textarea className="w-full text-xs p-3 border rounded-xl mb-3" value={replyComment} onChange={(e) => setReplyComment(e.target.value)} placeholder="Ringrazia il cliente..." />
                       <div className="flex gap-1 mb-4">
                         {[1,2,3,4,5].map(v => (
                           <button key={v} onClick={() => setRating(v)} className={`w-8 h-8 rounded-lg ${replyRating >= v ? 'bg-yellow-400 text-white' : 'bg-slate-100'}`}>★</button>
                         ))}
                       </div>
                       <button onClick={() => { onReplyToReview(review.id, replyComment, replyRating); setReplyReviewId(null); setReplyComment(''); }} className="w-full bg-slate-900 text-white py-3 rounded-xl text-xs font-black uppercase">Invia</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal Modifica Profilo Completo */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-900">Modifica Profilo Professionista</h3>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <div className="space-y-6">
               <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Nome Completo</label>
                    <input type="text" className="w-full p-3 border rounded-xl text-sm font-bold" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Categoria</label>
                    <select 
                      className="w-full p-3 border rounded-xl text-sm font-bold" 
                      value={editForm.category} 
                      onChange={e => setEditForm({...editForm, category: e.target.value as Category})}
                    >
                      {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
               </div>

               <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Email di contatto</label>
                    <input type="email" className="w-full p-3 border rounded-xl text-sm font-bold" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Telefono</label>
                    <input type="tel" className="w-full p-3 border rounded-xl text-sm font-bold" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                  </div>
               </div>

               <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Indirizzo Sede / Città</label>
                    <input type="text" className="w-full p-3 border rounded-xl text-sm font-bold" value={editForm.location.address} onChange={e => setEditForm({...editForm, location: {...editForm.location, address: e.target.value}})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Raggio d'azione (km)</label>
                    <input type="number" className="w-full p-3 border rounded-xl text-sm font-bold" value={editForm.workingRadius} onChange={e => setEditForm({...editForm, workingRadius: parseInt(e.target.value) || 0})} />
                  </div>
               </div>

               <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Certificazioni (separate da virgola)</label>
                  <input type="text" className="w-full p-3 border rounded-xl text-sm font-bold" value={editForm.certifications.join(', ')} onChange={e => setEditForm({...editForm, certifications: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '')})} placeholder="es. Patentino F-GAS, KNX..." />
               </div>

               <div>
                 <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Bio Professionale</label>
                 <textarea className="w-full p-4 border rounded-2xl text-sm leading-relaxed" rows={4} value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} placeholder="Descrivi brevemente la tua esperienza..." />
               </div>

               <div className="flex gap-4 pt-4">
                  <button onClick={handleOptimizeAI} disabled={isOptimizing} className="flex-1 bg-blue-50 text-blue-600 py-4 rounded-2xl font-black text-sm uppercase flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors">
                    {isOptimizing ? <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div> : 'AI-Optimize'}
                  </button>
                  <button onClick={handleSave} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-lg hover:bg-slate-800 transition-colors">Salva Modifiche</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalDashboard;
