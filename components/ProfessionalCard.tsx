
import React from 'react';
import { Professional } from '../types';

interface ProfessionalCardProps {
  professional: Professional;
  onSelect: (p: Professional) => void;
  distance?: number;
}

const ProfessionalCard: React.FC<ProfessionalCardProps> = ({ professional, onSelect, distance }) => {
  return (
    <div 
      className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group relative"
      onClick={() => onSelect(professional)}
    >
      <div className="flex items-start gap-4">
        <img 
          src={professional.avatar} 
          alt={professional.name} 
          className="w-16 h-16 rounded-xl object-cover ring-2 ring-slate-100 shadow-sm"
        />
        <div className="flex-1">
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{professional.name}</h3>
            <div className="flex items-center gap-1 bg-yellow-400 px-2 py-0.5 rounded-lg text-white text-[10px] font-black">
              ★ {professional.ranking.toFixed(1)}
            </div>
          </div>
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2">{professional.category}</p>
          
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium border-t border-slate-50 pt-3">
            <div className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <span>{distance ? `${distance}km da te` : professional.location.address}</span>
            </div>
            <span>{professional.experienceYears}y exp.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalCard;
