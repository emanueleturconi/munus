
import React from 'react';
import { JobRequest, JobStatus, Professional, Review } from '../types';
import ProfessionalCard from './ProfessionalCard';
import ReviewSection from './ReviewSection';

interface UserDashboardProps {
  requests: JobRequest[];
  professionals: Professional[];
  onConfirmJob: (requestId: string, proId: string) => void;
  onMarkServiceAsReceived: (requestId: string) => void;
  onDeleteRequest: (requestId: string) => void;
  onAddReview: (requestId: string, proId: string, review: Omit<Review, 'id' | 'isConfirmed'>) => void;
  onSelectPro: (pro: Professional) => void;
  onNewRequest: () => void;
  clientRanking?: number;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ requests, professionals, onConfirmJob, onMarkServiceAsReceived, onDeleteRequest, onAddReview, onSelectPro, onNewRequest, clientRanking = 5.0 }) => {
  const getPro = (id: string) => professionals.find(p => p.id === id);

  const StatusBadge = ({ status }: { status: JobStatus }) => {
    switch (status) {
      case JobStatus.PENDING: return <span className="bg-yellow-50 text-yellow-600 border border-yellow-100 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">In attesa disponibilità</span>;
      case JobStatus.ACCEPTED: return <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Disponibilità Ricevute</span>;
      case JobStatus.CONFIRMED: return <span className="bg-purple-50 text-purple-600 border border-purple-100 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Lavoro in corso</span>;
      case JobStatus.COMPLETED: return <span className="bg-green-50 text-green-600 border border-green-100 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Completato</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Area Personale</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-slate-500">I tuoi interventi e la tua reputazione nel network.</p>
            <div className="bg-yellow-400 text-white px-3 py-1 rounded-full text-[10px] font-black shadow-sm flex items-center gap-1">
              RANKING CLIENTE ★ {clientRanking.toFixed(1)}
            </div>
          </div>
        </div>
        <button onClick={onNewRequest} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
          Nuova Richiesta
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <p className="text-slate-500 font-medium">Non hai ancora effettuato nessuna richiesta.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {requests.slice().reverse().map(request => {
            const canDelete = request.status !== JobStatus.COMPLETED && !request.serviceReceived;

            return (
              <div key={request.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col lg:flex-row animate-in fade-in slide-in-from-bottom-4">
                <div className="p-6 lg:w-2/5 bg-slate-50 border-r border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <StatusBadge status={request.status} />
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{request.createdAt}</span>
                    </div>
                    <h4 className="text-sm text-slate-700 font-bold leading-relaxed mb-4">{request.description}</h4>
                    
                    {/* Visualizzazione Chiarimenti AI */}
                    {request.clarifications && request.clarifications.length > 0 && (
                      <div className="space-y-3 mb-6 bg-white/40 p-4 rounded-2xl border border-slate-200/50">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Dettagli specificati:</p>
                        {request.clarifications.map((c, i) => (
                          <div key={i} className="flex flex-col">
                            <span className="text-[10px] text-blue-500 font-bold italic">{c.question}</span>
                            <span className="text-xs text-slate-700 font-black">{c.answer}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-4 border-t border-slate-200">
                       <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Budget stimato: {request.budgetRange.min}€ - {request.budgetRange.max}€</div>
                    </div>
                  </div>
                  
                  {canDelete && (
                    <div className="mt-6 pt-6 border-t border-slate-200">
                      <button 
                        onClick={() => onDeleteRequest(request.id)}
                        className="text-red-500 text-[10px] font-black uppercase tracking-widest hover:text-red-700 transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        Annulla Richiesta
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-6 flex-1 bg-white">
                  {(request.status === JobStatus.ACCEPTED || request.status === JobStatus.CONFIRMED || request.status === JobStatus.COMPLETED) && (
                    <div className="space-y-6">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Esperti interessati all'intervento</h5>
                      {(request.hiredProId ? [request.hiredProId] : request.acceptedProIds).map(proId => {
                        const pro = getPro(proId);
                        if (!pro) return null;
                        const isHired = request.hiredProId === proId;
                        const myReview = pro.reviews.find(r => r.clientId === request.clientId && r.jobDescription === request.description);
                        
                        return (
                          <div key={proId} className={`rounded-[2rem] border transition-all ${isHired ? 'bg-blue-50/20 border-blue-200 ring-2 ring-blue-50' : 'border-slate-100 hover:border-slate-300'}`}>
                            <div className="p-6">
                              <div className="flex flex-col md:flex-row md:items-center gap-6">
                                <img src={pro.avatar} className="w-16 h-16 rounded-2xl object-cover shadow-sm ring-2 ring-white" />
                                <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h6 className="font-black text-slate-900 text-lg">{pro.name}</h6>
                                      <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mb-2">{pro.category}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                      <div className="bg-yellow-400 text-white px-2 py-1 rounded-lg text-[10px] font-black shadow-sm">
                                        ★ {pro.ranking.toFixed(1)}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3 pt-3 border-t border-slate-50">
                                    <div className="flex items-center gap-2">
                                      <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                      <span className="text-[10px] text-slate-500 font-bold truncate">{pro.location.address}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Tariffa:</span>
                                      <span className="text-[10px] text-slate-900 font-black">{pro.hourlyRate.min}€/h</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Esp:</span>
                                      <span className="text-[10px] text-slate-900 font-black">{pro.experienceYears}y</span>
                                    </div>
                                  </div>

                                  {/* Nuova Sezione Contatti Professionista */}
                                  <div className="mt-4 flex flex-wrap gap-4 pt-4 border-t border-slate-100/50">
                                    {pro.phone && (
                                      <a href={`tel:${pro.phone}`} className="flex items-center gap-2 bg-slate-50 hover:bg-blue-50 px-3 py-2 rounded-xl transition-colors group/contact">
                                        <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm border border-slate-100 group-hover/contact:border-blue-200">
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-600 group-hover/contact:text-blue-600">{pro.phone}</span>
                                      </a>
                                    )}
                                    {pro.email && (
                                      <a href={`mailto:${pro.email}`} className="flex items-center gap-2 bg-slate-50 hover:bg-blue-50 px-3 py-2 rounded-xl transition-colors group/contact">
                                        <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm border border-slate-100 group-hover/contact:border-blue-200">
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-600 group-hover/contact:text-blue-600 truncate max-w-[120px]">{pro.email}</span>
                                      </a>
                                    )}
                                  </div>
                                </div>
                                
                                {request.status === JobStatus.ACCEPTED && (
                                  <button 
                                    onClick={() => onConfirmJob(request.id, proId)}
                                    className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-105 active:scale-95 transition-all self-center shrink-0"
                                  >
                                    Scegli Questo Pro
                                  </button>
                                )}
                              </div>

                              {isHired && !request.serviceReceived && (
                                <div className="mt-6 bg-slate-900 p-8 rounded-3xl text-center space-y-4 shadow-xl animate-in zoom-in-95">
                                  <p className="text-white font-black text-lg uppercase tracking-tight">Il lavoro è terminato?</p>
                                  <p className="text-slate-400 text-xs italic">Conferma solo se l'intervento è stato eseguito correttamente.</p>
                                  <button 
                                    onClick={() => onMarkServiceAsReceived(request.id)}
                                    className="bg-blue-600 text-white px-10 py-4 rounded-xl font-black text-sm uppercase shadow-2xl hover:bg-blue-500 transition-colors"
                                  >
                                    Lavoro Completato con Successo
                                  </button>
                                </div>
                              )}

                              {isHired && request.serviceReceived && !request.hasFeedback && (
                                <div className="mt-6">
                                  <ReviewSection professional={pro} onAddReview={(data) => onAddReview(request.id, proId, data)} />
                                </div>
                              )}

                              {isHired && request.hasFeedback && myReview && (
                                <div className="mt-6 p-6 rounded-3xl bg-slate-50 border border-slate-100">
                                   {myReview.isConfirmed ? (
                                     <div className="space-y-4">
                                       <div className="flex items-center gap-2 text-green-600 font-black text-[10px] uppercase tracking-widest">
                                         <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                                         Recensione Verificata e Pubblicata
                                       </div>
                                       {myReview.proReply && (
                                         <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                            <div className="flex justify-between items-center mb-2">
                                              <p className="text-[10px] font-black text-blue-600 uppercase">Risposta da {pro.name.split(' ')[0]}:</p>
                                              <span className="text-yellow-500 font-black text-[10px]">Valutazione per te: ★ {myReview.proReply.clientRating}</span>
                                            </div>
                                            <p className="text-sm text-slate-600 italic">"{myReview.proReply.comment}"</p>
                                         </div>
                                       )}
                                     </div>
                                   ) : (
                                     <div className="flex items-center gap-3 text-slate-500 font-bold text-xs uppercase tracking-widest italic py-4">
                                       <div className="w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
                                       In attesa di conferma finale dall'esperto...
                                     </div>
                                   )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {request.status === JobStatus.PENDING && (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 space-y-4">
                       <div className="relative">
                          <div className="w-16 h-16 border-4 border-blue-100 rounded-full"></div>
                          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
                       </div>
                       <div className="max-w-xs">
                          <p className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Ricerca Intelligente</p>
                          <p className="text-xs font-medium text-slate-400">Stiamo notificando gli esperti più qualificati nella zona di {request.city}.</p>
                       </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
