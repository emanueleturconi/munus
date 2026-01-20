
import React from 'react';
import { JobRequest, JobStatus, Professional, Review } from '../types';
import ProfessionalCard from './ProfessionalCard';
import ReviewSection from './ReviewSection';

interface UserDashboardProps {
  requests: JobRequest[];
  professionals: Professional[];
  onConfirmJob: (requestId: string, proId: string) => void;
  onAddReview: (requestId: string, proId: string, review: Omit<Review, 'id' | 'isConfirmed'>) => void;
  onSelectPro: (pro: Professional) => void;
  onNewRequest: () => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ requests, professionals, onConfirmJob, onAddReview, onSelectPro, onNewRequest }) => {
  const getPro = (id: string) => professionals.find(p => p.id === id);

  const StatusBadge = ({ status }: { status: JobStatus }) => {
    switch (status) {
      case JobStatus.PENDING: return <span className="bg-yellow-50 text-yellow-600 border border-yellow-100 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">In attesa</span>;
      case JobStatus.ACCEPTED: return <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Risposte ricevute</span>;
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
          <p className="text-slate-500">Gestisci i tuoi interventi e lascia feedback verificati.</p>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={onNewRequest}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
            Nuova Richiesta
          </button>
          <div className="flex gap-4 text-sm font-bold border-l border-slate-200 pl-6">
             <div className="text-center">
               <span className="block text-xl text-blue-600">{requests.length}</span>
               <span className="text-[10px] text-slate-400 uppercase tracking-widest">Totali</span>
             </div>
             <div className="text-center">
               <span className="block text-xl text-green-600">{requests.filter(r => r.status === JobStatus.COMPLETED).length}</span>
               <span className="text-[10px] text-slate-400 uppercase tracking-widest">Finiti</span>
             </div>
          </div>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
          </div>
          <p className="text-slate-500 font-medium">Non hai ancora effettuato nessuna richiesta.</p>
          <button onClick={onNewRequest} className="mt-4 text-blue-600 font-bold text-sm hover:underline">Inizia ora la tua prima richiesta</button>
        </div>
      ) : (
        <div className="grid gap-6">
          {requests.slice().reverse().map(request => (
            <div key={request.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col lg:flex-row">
              <div className="p-6 lg:w-2/5 bg-slate-50 border-r border-slate-100 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <StatusBadge status={request.status} />
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{request.createdAt}</span>
                </div>
                
                <div className="mb-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Richiesta Originale</h4>
                  <p className="text-sm text-slate-700 font-bold leading-relaxed">{request.description}</p>
                </div>

                {request.clarifications && request.clarifications.length > 0 && (
                  <div className="mt-auto pt-4 border-t border-slate-200">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Dettagli Tecnici AI</h4>
                    <div className="space-y-2">
                      {request.clarifications.map((c, i) => (
                        <div key={i} className="flex justify-between items-start gap-4">
                          <span className="text-[10px] text-slate-500 italic flex-1">{c.question}</span>
                          <span className="text-[10px] font-black text-slate-900 text-right">{c.answer}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-200">
                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Budget stimato:</div>
                   <div className="text-sm font-black text-slate-900">{request.budgetRange.min}€ - {request.budgetRange.max}€</div>
                </div>
              </div>

              <div className="p-6 flex-1 bg-white">
                {request.status === JobStatus.PENDING && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="animate-pulse bg-yellow-100 text-yellow-600 p-4 rounded-full mb-4">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </div>
                    <p className="text-lg font-bold text-slate-700">In attesa di disponibilità</p>
                    <p className="text-sm text-slate-400 mt-1 max-w-xs">I {request.selectedProIds.length} professionisti selezionati stanno valutando la tua richiesta.</p>
                  </div>
                )}

                {(request.status === JobStatus.ACCEPTED || request.status === JobStatus.CONFIRMED || request.status === JobStatus.COMPLETED) && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        {request.status === JobStatus.ACCEPTED ? `${request.acceptedProIds.length} Professionisti Disponibili` : 'Professionista Scelto'}
                      </h5>
                    </div>
                    
                    <div className="grid gap-4">
                      {(request.hiredProId ? [request.hiredProId] : request.acceptedProIds).map(proId => {
                        const pro = getPro(proId);
                        if (!pro) return null;
                        const isHired = request.hiredProId === proId;
                        
                        return (
                          <div key={proId} className={`flex flex-col gap-4 p-5 rounded-2xl border transition-all ${isHired ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-slate-100'}`}>
                            <div className="flex items-center gap-4">
                              <img src={pro.avatar} className="w-14 h-14 rounded-2xl object-cover shadow-sm border border-white" />
                              <div className="flex-1">
                                <h6 className="font-bold text-slate-900 text-lg leading-none mb-1">{pro.name}</h6>
                                <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">{pro.category}</p>
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => onSelectPro(pro)}
                                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-blue-600 transition-colors shadow-sm"
                                  title="Vedi Profilo"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                </button>
                                {request.status === JobStatus.ACCEPTED && (
                                  <a href={`tel:${pro.phone}`} className="w-10 h-10 flex items-center justify-center rounded-xl bg-green-500 text-white shadow-lg shadow-green-100 hover:bg-green-600">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                                  </a>
                                )}
                              </div>
                            </div>
                            
                            {request.status === JobStatus.ACCEPTED && (
                              <button 
                                onClick={() => onConfirmJob(request.id, proId)}
                                className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-black hover:bg-blue-700 shadow-md transition-all active:scale-95"
                              >
                                Ho svolto il lavoro con {pro.name.split(' ')[0]}
                              </button>
                            )}
                            
                            {isHired && !request.hasFeedback && (
                              <div className="mt-2 border-t border-blue-100 pt-4">
                                <p className="text-xs font-bold text-blue-600 mb-4 uppercase tracking-widest text-center">Racconta come è andato l'intervento</p>
                                <ReviewSection 
                                  professional={pro} 
                                  onAddReview={(data) => onAddReview(request.id, proId, data)} 
                                />
                              </div>
                            )}

                            {isHired && request.hasFeedback && (
                              <div className="flex items-center justify-center gap-2 text-green-600 font-bold text-sm bg-green-50 py-3 rounded-xl border border-green-100">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                                Esperienza valutata con successo
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
