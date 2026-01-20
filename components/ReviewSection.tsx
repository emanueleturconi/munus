
import React, { useState } from 'react';
import { Review, Professional } from '../types';

interface ReviewSectionProps {
  professional: Professional;
  onAddReview: (review: Omit<Review, 'id' | 'isConfirmed'>) => void;
}

const ReviewSection: React.FC<ReviewSectionProps> = ({ professional, onAddReview }) => {
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
      date: new Date().toISOString().split('T')[0]
    });
    setComment('');
    setJobDescription('');
    setShowForm(false);
  };

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-900">Feedback Lavori ({professional.reviews.length})</h3>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
        >
          {showForm ? 'Annulla' : 'Lascia feedback'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Qualità del servizio</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setRating(num)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${rating >= num ? 'bg-yellow-400 text-white shadow-lg shadow-yellow-100' : 'bg-white text-slate-300 border border-slate-100'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Che tipo di lavoro è stato fatto?</label>
            <input
              required
              type="text"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="w-full rounded-xl border-slate-200 text-sm focus:ring-blue-500 focus:border-blue-500 font-semibold"
              placeholder="Es: Riparazione caldaia, Tinteggiatura camera..."
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Dettagli del feedback</label>
            <textarea
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded-xl border-slate-200 text-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Racconta la tua esperienza..."
              rows={3}
            />
          </div>
          
          <p className="text-[10px] text-slate-400 mb-4 italic">Il tuo feedback sarà pubblicato dopo la conferma di esecuzione del professionista.</p>
          
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 transition-all">
            Invia Recensione
          </button>
        </form>
      )}

      <div className="space-y-6">
        {professional.reviews.filter(r => r.isConfirmed).length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-3xl">
             <p className="text-slate-400 text-sm italic">Nessun feedback ancora disponibile.</p>
          </div>
        ) : (
          professional.reviews
            .filter(r => r.isConfirmed)
            .sort((a, b) => b.date.localeCompare(a.date))
            .map(review => (
              <div key={review.id} className="relative pl-4 border-l-2 border-slate-100">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Lavoro Eseguito:</span>
                    <span className="font-bold text-slate-900 text-sm leading-tight">{review.jobDescription}</span>
                  </div>
                  <div className="flex text-yellow-400 text-[10px]">
                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                  </div>
                </div>
                
                <p className="text-sm text-slate-600 mt-2 mb-2 leading-relaxed italic">"{review.comment}"</p>
                
                <div className="flex items-center gap-2 mt-3">
                    <div className="w-5 h-5 bg-slate-200 rounded-full"></div>
                    <span className="font-bold text-slate-800 text-[11px]">{review.clientName}</span>
                    <span className="text-[10px] text-slate-400">• {review.date}</span>
                    <span className="ml-auto text-[9px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold border border-green-100 flex items-center gap-1">
                        <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                        Verificato
                    </span>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
};

export default ReviewSection;
