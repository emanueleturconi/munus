
import React from 'react';
import { Professional, SubscriptionPlan } from '../types';

interface ProfessionalCardProps {
  professional: Professional;
  onSelect: (p: Professional) => void;
  distance?: number;
  matchScore?: number;
}

const ProfessionalCard: React.FC<ProfessionalCardProps> = ({ professional, onSelect, distance, matchScore }) => {
  const isPremium = professional.subscription?.plan && professional.subscription.plan !== SubscriptionPlan.BASE;

  return (
    <div 
      className="bg-white rounded-[2rem] border border-slate-200 p-6 hover:border-blue-400 hover:shadow-xl transition-all cursor-pointer group relative"
      onClick={() => onSelect(professional)}
    >
      <div className="flex items-start gap-5">
        <div className="relative shrink-0">
          <img 
            src={professional.avatar} 
            alt={professional.name} 
            className={`w-20 h-20 rounded-2xl object-cover shadow-sm ${isPremium ? 'ring-2 ring-yellow-400' : 'ring-2 ring-slate-100'}`}
          />
          {isPremium && (
            <div className="absolute -top-2 -right-2 bg-yellow-400 text-white w-6 h-6 rounded-full border border-white flex items-center justify-center text-[10px] font-black shadow-md">
              P
            </div>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate text-lg">{professional.name}</h3>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1 bg-yellow-400 px-2.5 py-1 rounded-lg text-white text-[10px] font-black shrink-0 shadow-sm">
                ★ {professional.ranking.toFixed(1)}
              </div>
              {matchScore !== undefined && (
                <div className="bg-emerald-500 text-white px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter">
                  {matchScore}% Match
                </div>
              )}
            </div>
          </div>
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.15em] mb-3">{professional.category}</p>
          
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-bold border-t border-slate-50 pt-3">
            <div className="flex items-center gap-1 truncate max-w-[150px]">
              <svg className="w-3.5 h-3.5 shrink-0 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <span className="truncate">{distance ? `${distance}km da te` : professional.location.address}</span>
            </div>
            <div className="flex items-center gap-3">
               <span className="bg-slate-50 px-2 py-0.5 rounded-md">{professional.experienceYears}y esp.</span>
               <span className="text-slate-300">|</span>
               <span className="text-slate-900">{professional.hourlyRate.min}€/h</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalCard;
