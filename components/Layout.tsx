
import React, { useState } from 'react';
import { UserRole, Professional } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  onNavigate: (view: 'home' | 'dashboard') => void;
  currentView: 'home' | 'dashboard';
  role?: UserRole;
  onLogout: () => void;
  userProfile?: any; // Generic to handle both pro and client properties
  requestBadgeCount?: number;
}

const Layout: React.FC<LayoutProps> = ({ children, onNavigate, currentView, role, onLogout, userProfile, requestBadgeCount = 0 }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = (
    <>
      <button 
        onClick={() => { onNavigate('home'); setIsMobileMenuOpen(false); }}
        className={`text-sm font-bold transition-colors text-left md:text-center relative ${currentView === 'home' ? 'text-blue-600' : 'text-slate-500 hover:text-blue-600'}`}
      >
        {role === UserRole.PROFESSIONAL ? 'Dashboard' : 'Trova Esperti'}
        {role === UserRole.PROFESSIONAL && requestBadgeCount > 0 && (
          <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] font-black text-white bg-blue-600 rounded-full animate-in zoom-in">
            {requestBadgeCount}
          </span>
        )}
      </button>
      {role === UserRole.CLIENT && (
        <button 
          onClick={() => { onNavigate('dashboard'); setIsMobileMenuOpen(false); }}
          className={`text-sm font-bold transition-colors text-left md:text-center flex items-center gap-2 ${currentView === 'dashboard' ? 'text-blue-600' : 'text-slate-500 hover:text-blue-600'}`}
        >
          Le mie Richieste
          {requestBadgeCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-black text-white bg-blue-600 rounded-full shadow-lg shadow-blue-100 animate-in zoom-in">
              {requestBadgeCount}
            </span>
          )}
        </button>
      )}
    </>
  );

  const userInfo = userProfile ? (
    <div className="flex items-center gap-3 bg-slate-50 pr-4 pl-1.5 py-1.5 rounded-full border border-slate-100">
      <img src={userProfile.avatar} className="w-8 h-8 rounded-full object-cover border border-white shadow-sm" alt={userProfile.name} />
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-black text-slate-900 leading-tight">{userProfile.name}</span>
          {role === UserRole.CLIENT && userProfile.ranking && (
            <span className="text-[9px] font-black text-yellow-500">★{userProfile.ranking}</span>
          )}
        </div>
        <span className="text-[9px] text-blue-500 font-bold uppercase tracking-tighter">Account Verificato</span>
      </div>
    </div>
  ) : (
    <div className="w-8 h-8 bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center overflow-hidden">
       <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-[60]">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('home')}>
            <div className="relative group">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">MUNUS</h1>
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] leading-none mt-1">
                {role === UserRole.PROFESSIONAL ? 'Area Esperto' : 'Area Cliente'}
              </span>
            </div>
          </div>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks}
            <div className="h-8 w-px bg-slate-200 mx-2"></div>
            <div className="flex items-center gap-4">
              {userInfo}
              <button 
                onClick={onLogout}
                className="text-sm font-bold text-slate-400 hover:text-red-500 transition-colors"
                title="Scollegati"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              </button>
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            ) : (
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16"/></svg>
            )}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 right-0 bg-white border-b border-slate-200 shadow-xl p-6 flex flex-col gap-6 animate-in slide-in-from-top duration-200 z-[55]">
            <div className="flex flex-col gap-4">
              {navLinks}
            </div>
            <div className="h-px bg-slate-100"></div>
            <div className="flex items-center justify-between">
              {userInfo}
              <button 
                onClick={() => { onLogout(); setIsMobileMenuOpen(false); }}
                className="flex items-center gap-2 text-sm font-black text-red-500 bg-red-50 px-4 py-2 rounded-xl border border-red-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                Esci
              </button>
            </div>
          </div>
        )}
      </header>
      
      <main className="flex-1">
        {children}
      </main>
      
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">© 2024 MUNUS NETWORK • ECCELLENZA ARTIGIANA</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
