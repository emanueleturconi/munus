
import React, { useState } from 'react';
import { Review, Professional } from '../types';

interface ReviewSectionProps {
  professional: Professional;
  onAddReview: (review: Omit<Review, 'id' | 'isConfirmed'>) => void;
  hideForm?: boolean;
}

const ReviewSection: React.FC<ReviewSectionProps> = ({ professional, onAddReview, hideForm = false }) => {
  const [comment, setComment] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [rating, setRating] = useState(5);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddReview({
      clientId: 'current-user',
      clientName: 'Cliente Verificato',
      jobDescription,
      rating,
      comment,
      date: new Date().toLocaleDateString('it-IT')
    });
    setComment('');
    setJobDescription('');
    setShowForm(false);
  };

  return (
    <div className="mt-4">
      {!hideForm && (
        !showForm ? (
          <button 
            onClick={() => setShowForm(true)}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-lg active:scale-95 transition-transform"
          >
            Lascia un Feedback Verificato
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 animate-in fade-in slide-in-from-top-2">
            <div className="mb-4">
              <label className="block text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest">Valutazione Servizio</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setRating(num)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${rating >= num ? 'bg-yellow-400 text-white shadow-lg' : 'bg-white text-slate-300 border border-slate-100'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Cosa è stato fatto?</label>
              <input
                required
                type="text"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full rounded-xl border-slate-200 text-sm font-bold p-3"
                placeholder="Es: Riparazione lavandino..."
              />
            </div>

            <div className="mb-4">
              <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Tua Recensione</label>
              <textarea
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full rounded-xl border-slate-200 text-sm p-3"
                placeholder="Com'è stata l'esperienza?"
                rows={3}
              />
            </div>
            
            <p className="text-[9px] text-slate-400 mb-4 italic leading-tight">Nota: Per tutelare il professionista, il feedback sarà visibile solo dopo che avrà confermato lo svolgimento dell'incarico.</p>
            
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-xs font-black uppercase shadow-md">Pubblica</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-3 rounded-xl border border-slate-200 text-slate-400 text-xs font-black uppercase">X</button>
            </div>
          </form>
        )
      )}

      <div className="space-y-6 mt-8">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Recensioni dei Clienti</h4>
        {professional.reviews
          .filter(r => r.isConfirmed)
          .sort((a, b) => b.date.localeCompare(a.date))
          .map(review => (
            <div key={review.id} className="relative pl-4 border-l-2 border-slate-100">
              <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{review.jobDescription}</span>
                  <span className="font-bold text-slate-900 text-sm">{review.clientName}</span>
                </div>
                <div className="text-yellow-400 text-[10px]">★ {review.rating}</div>
              </div>
              <p className="text-sm text-slate-600 italic">"{review.comment}"</p>
              
              {review.proReply && (
                <div className="mt-3 ml-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                   <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Risposta di {professional.name.split(' ')[0]}:</p>
                   <p className="text-xs text-slate-500 italic">"{review.proReply.comment}"</p>
                </div>
              )}
            </div>
          ))}
        {professional.reviews.filter(r => r.isConfirmed).length === 0 && (
          <p className="text-xs text-slate-400 italic">Nessun feedback ancora ricevuto.</p>
        )}
      </div>
    </div>
  );
};

export default ReviewSection;
