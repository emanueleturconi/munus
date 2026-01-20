
import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import { MOCK_PROFESSIONALS } from './constants';
import { RequestStep, Professional, Review, JobRequest, JobStatus, JobClarification, UserRole, Category } from './types';
import ProfessionalCard from './components/ProfessionalCard';
import ReviewSection from './components/ReviewSection';
import UserDashboard from './components/UserDashboard';
import ProfessionalDashboard from './components/ProfessionalDashboard';
import { getSmartMatches, getJobClarifications, ClarificationQuestion, refineBudget } from './services/geminiService';
import { 
  auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, 
  collection, doc, setDoc, getDoc, updateDoc, addDoc, onSnapshot, query, where, orderBy 
} from './services/firebase';

const ITALIAN_CITIES = [
  "Milano", "Roma", "Napoli", "Torino", "Palermo", "Genova", "Bologna", "Firenze", "Bari", "Catania", 
  "Venezia", "Verona", "Messina", "Padova", "Trieste", "Brescia", "Parma", "Taranto", "Prato", "Modena",
  "Reggio Calabria", "Reggio Emilia", "Perugia", "Ravenna", "Livorno", "Cagliari", "Foggia", "Rimini", 
  "Salerno", "Ferrara", "Sassari", "Latina", "Giugliano in Campania", "Monza", "Siracusa", "Pescara", 
  "Bergamo", "Forlì", "Trento", "Vicenza", "Terni", "Bolzano", "Novara", "Piacenza", "Ancona", "Andria", 
  "Arezzo", "Udine", "Cesena", "Lecce"
];

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [activeUser, setActiveUser] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [requests, setRequests] = useState<JobRequest[]>([]);

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [view, setView] = useState<'home' | 'dashboard'>('home');
  const [step, setStep] = useState<RequestStep>(RequestStep.FORM);
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [budget, setBudget] = useState<{ min: number; max: number }>({ min: 50, max: 200 });
  const [questions, setQuestions] = useState<ClarificationQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [proposedPros, setProposedPros] = useState<Professional[]>([]);
  const [pings, setPings] = useState<string[]>([]); 
  const [isSearching, setIsSearching] = useState(false);
  const [isMatchingPros, setIsMatchingPros] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [selectedProProfile, setSelectedProProfile] = useState<Professional | null>(null);

  useEffect(() => {
    // Sincronizzazione Esperti
    const unsubPros = onSnapshot(collection(db, 'professionals'), (snapshot) => {
      const prosList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Professional));
      if (prosList.length === 0) {
        MOCK_PROFESSIONALS.forEach(p => setDoc(doc(db, 'professionals', p.id), p));
      }
      setProfessionals(prosList);
    });

    // Sincronizzazione Richieste
    const unsubRequests = onSnapshot(query(collection(db, 'requests'), orderBy('createdAt', 'desc')), (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobRequest)));
    });

    // Gestione Sessione Utente con Supporto Multi-Profilo (Cliente vs Professionista)
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      const demoActive = localStorage.getItem('munus_is_demo') === 'true';
      if (demoActive) {
        const savedUser = localStorage.getItem('munus_demo_user');
        const savedRole = localStorage.getItem('munus_temp_role');
        if (savedUser && savedRole) {
          setIsDemo(true); 
          setIsAuthenticated(true);
          setActiveUser(JSON.parse(savedUser));
          setRole(savedRole as UserRole);
          setIsLoadingProfile(false);
          return;
        }
      }

      if (user) {
        setIsLoadingProfile(true);
        // Identifica il ruolo desiderato (salvato localmente prima del login)
        const selectedRole = (localStorage.getItem('munus_temp_role') as UserRole) || UserRole.CLIENT;
        
        try {
          if (selectedRole === UserRole.PROFESSIONAL) {
            const proDoc = await getDoc(doc(db, 'professionals', user.uid));
            if (proDoc.exists()) {
              setActiveUser({ id: user.uid, ...proDoc.data() });
            } else {
              const newPro: Professional = {
                id: user.uid,
                name: user.displayName || 'Nuovo Esperto',
                email: user.email || '',
                avatar: user.photoURL || '',
                category: Category.PLUMBER,
                bio: 'In attesa di ottimizzazione...',
                phone: '',
                location: { lat: 45.4642, lng: 9.1900, address: 'Milano' },
                workingRadius: 30,
                hourlyRate: { min: 30, max: 50 },
                certifications: [],
                experienceYears: 1,
                ranking: 5.0,
                reviews: [],
                cvSummary: 'Profilo esperto creato.'
              };
              await setDoc(doc(db, 'professionals', user.uid), newPro);
              setActiveUser(newPro);
            }
          } else {
            const clientDoc = await getDoc(doc(db, 'clients', user.uid));
            if (clientDoc.exists()) {
              setActiveUser({ id: user.uid, ...clientDoc.data() });
            } else {
              const newClient = {
                id: user.uid,
                name: user.displayName || 'Utente',
                email: user.email || '',
                avatar: user.photoURL || '',
                createdAt: new Date().toISOString()
              };
              await setDoc(doc(db, 'clients', user.uid), newClient);
              setActiveUser(newClient);
            }
          }
          setRole(selectedRole);
          setIsAuthenticated(true);
          setIsDemo(false);
        } catch (err) {
          console.error("Errore caricamento profilo:", err);
        } finally {
          setIsLoadingProfile(false);
        }
      } else {
        setIsAuthenticated(false); 
        setIsDemo(false); 
        setActiveUser(null); 
        setRole(null);
        setIsLoadingProfile(false);
      }
    });

    return () => { unsubPros(); unsubRequests(); unsubAuth(); };
  }, []);

  const handleGoogleLogin = async () => {
    setIsAuthenticating(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setShowAuthPopup(false);
    } catch (error: any) {
      alert(`Errore Login: ${error.message}`);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDemoLogin = () => {
    setIsAuthenticating(true);
    setTimeout(() => {
      const isPro = role === UserRole.PROFESSIONAL;
      const demoUser = isPro ? {
        id: 'demo-pro-123', name: 'Mario Rossi (Demo)', email: 'demo.esperto@munus.it',
        avatar: `https://ui-avatars.com/api/?name=Mario+Rossi&background=0284c7&color=fff`,
        category: Category.ELECTRICIAN, bio: 'Profilo demo.', phone: '+39 333 000 0000',
        location: { lat: 45.4642, lng: 9.1900, address: 'Milano' }, workingRadius: 50,
        hourlyRate: { min: 35, max: 60 }, certifications: [], experienceYears: 10, ranking: 4.9, reviews: [], cvSummary: 'Profilo Demo'
      } : {
        id: 'demo-client-123', name: 'Gianni Cliente (Demo)', email: 'demo.cliente@munus.it',
        avatar: `https://ui-avatars.com/api/?name=Gianni+Cliente&background=10b981&color=fff`
      };
      setIsDemo(true); setIsAuthenticated(true); setActiveUser(demoUser);
      localStorage.setItem('munus_is_demo', 'true');
      localStorage.setItem('munus_demo_user', JSON.stringify(demoUser));
      setIsAuthenticating(false); setShowAuthPopup(false);
    }, 1000);
  };

  const handleLogout = () => { 
    signOut(auth); setIsDemo(false); setIsAuthenticated(false); setActiveUser(null); setRole(null);
    localStorage.removeItem('munus_is_demo'); localStorage.removeItem('munus_demo_user');
    localStorage.removeItem('munus_temp_role'); resetProcess();
  };

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    try {
      const analysis = await getJobClarifications(description);
      setBudget(analysis.suggestedBudget);
      if (analysis.questions && analysis.questions.length > 0) {
        setQuestions(analysis.questions);
        setStep(RequestStep.CLARIFY);
      } else proceedToSearch();
    } catch (err) {
      proceedToSearch();
    } finally {
      setIsSearching(false);
    }
  };

  const proceedToSearch = async () => {
    const unansweredCount = questions.filter(q => !answers[q.id] || answers[q.id].trim() === '').length;
    const cityMissing = !city || city.trim() === '';
    
    if (unansweredCount > 0 || cityMissing) {
      const warning = cityMissing ? "Indica la città dell'intervento." : "Alcuni dettagli tecnici non sono stati compilati.";
      const confirmProceed = window.confirm(`${warning}\n\nVuoi procedere comunque? Gli esperti riceveranno meno informazioni.`);
      if (!confirmProceed) return;
    }

    setIsMatchingPros(true);
    try {
      const requestStub: JobRequest = {
        id: 'stub', clientId: activeUser?.id || 'anon', description, budgetRange: budget, city: city || 'Località ignota',
        selectedProIds: [], acceptedProIds: [], status: JobStatus.PENDING, createdAt: '',
      };
      const recommendedIds = await getSmartMatches(requestStub, professionals);
      const results = recommendedIds
        .map(id => professionals.find(p => p.id === id))
        .filter((p): p is Professional => p !== undefined);
      setProposedPros(results);
      setStep(RequestStep.SELECT_PROS);
    } catch (err) {
      setProposedPros(professionals.slice(0, 4));
      setStep(RequestStep.SELECT_PROS);
    } finally {
      setIsMatchingPros(false);
    }
  };

  const handleSendRequests = async () => {
    if (pings.length === 0) {
      alert("Seleziona chi vuoi contattare prima di inviare.");
      return;
    }

    setIsSendingRequest(true);
    
    try {
      const savedClarifications: JobClarification[] = questions
        .filter(q => answers[q.id] && answers[q.id].trim() !== '')
        .map(q => ({ question: q.question, answer: answers[q.id] }));
      
      const newRequestData = {
        description: description || "Nessuna descrizione",
        budgetRange: { min: budget.min || 0, max: budget.max || 0 },
        city: city || "Non specificata",
        selectedProIds: [...pings],
        acceptedProIds: [],
        rejectedProIds: [],
        status: JobStatus.PENDING,
        createdAt: new Date().toISOString(),
        clarifications: savedClarifications,
        clientId: activeUser?.id || 'anon',
        clientName: activeUser?.name || 'Cliente Verificato',
        clientAvatar: activeUser?.avatar || ''
      };

      const docRef = await addDoc(collection(db, 'requests'), newRequestData);
      setStep(RequestStep.WAITING_RESPONSES);
      simulateOtherProResponses(docRef.id, pings);
      
    } catch (error: any) {
      const errorLog = `--- MUNUS ERROR REPORT ---\nStep: SEND_REQUEST\nCode: ${error.code}\nMsg: ${error.message}\nUserRole: ${role}`;
      console.error("DEBUG FIREBASE:", error);
      alert(errorLog);
    } finally {
      setIsSendingRequest(false);
    }
  };

  const simulateOtherProResponses = (requestId: string, targetProIds: string[]) => {
    targetProIds.forEach((id, index) => {
      if (activeUser && id === activeUser.id) return;
      setTimeout(async () => {
        try {
          const pro = professionals.find(p => p.id === id);
          if (pro && Math.random() < 0.7) {
            const reqRef = doc(db, 'requests', requestId);
            const reqSnap = await getDoc(reqRef);
            if (reqSnap.exists()) {
              const currentAccepted = reqSnap.data().acceptedProIds || [];
              await updateDoc(reqRef, { 
                acceptedProIds: [...new Set([...currentAccepted, id])],
                status: JobStatus.ACCEPTED
              });
            }
          }
        } catch (err) {}
      }, 2000 + (index * 1500));
    });
    setTimeout(() => { setStep(RequestStep.FINAL_MATCHES); }, 5000);
  };

  const handleAcceptRequest = async (requestId: string) => {
    const reqRef = doc(db, 'requests', requestId);
    const reqSnap = await getDoc(reqRef);
    if (reqSnap.exists()) {
      const currentAccepted = reqSnap.data().acceptedProIds || [];
      await updateDoc(reqRef, { acceptedProIds: [...new Set([...currentAccepted, activeUser.id])], status: JobStatus.ACCEPTED });
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const reqRef = doc(db, 'requests', requestId);
    const reqSnap = await getDoc(reqRef);
    if (reqSnap.exists()) {
      const currentRejected = reqSnap.data().rejectedProIds || [];
      await updateDoc(reqRef, { rejectedProIds: [...new Set([...currentRejected, activeUser.id])] });
    }
  };

  const handleUpdateProfile = async (updatedPro: Professional) => {
    try {
      await setDoc(doc(db, 'professionals', updatedPro.id), updatedPro, { merge: true });
      setActiveUser(updatedPro);
    } catch (e) {
      alert("Errore aggiornamento: " + e);
    }
  };

  const handleConfirmJob = async (requestId: string, proId: string) => {
    await updateDoc(doc(db, 'requests', requestId), { status: JobStatus.CONFIRMED, hiredProId: proId });
  };

  const handleAddReviewFromDashboard = async (requestId: string, proId: string, reviewData: Omit<Review, 'id' | 'isConfirmed'>) => {
    const request = requests.find(r => r.id === requestId);
    if (!request) return;
    const newReview: Review = { ...reviewData, id: Math.random().toString(36).substr(2, 9), isConfirmed: true, jobDescription: request.description, clientId: activeUser?.id || 'anon', clientName: activeUser?.name || 'Cliente Verificato' };
    const pro = professionals.find(p => p.id === proId);
    if (pro) {
      const updatedReviews = [...pro.reviews, newReview];
      const newRanking = updatedReviews.reduce((acc, rev) => acc + rev.rating, 0) / updatedReviews.length;
      await updateDoc(doc(db, 'professionals', proId), { reviews: updatedReviews, ranking: newRanking });
    }
    await updateDoc(doc(db, 'requests', requestId), { status: JobStatus.COMPLETED, hasFeedback: true });
  };

  const togglePing = (id: string) => {
    setPings(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleCityChange = (val: string) => {
    setCity(val);
    if (val.length > 1) {
      const filtered = ITALIAN_CITIES.filter(c => c.toLowerCase().includes(val.toLowerCase())).slice(0, 5);
      setCitySuggestions(filtered);
    } else setCitySuggestions([]);
  };

  const selectCity = (c: string) => { setCity(c); setCitySuggestions([]); };

  const resetProcess = () => {
    setStep(RequestStep.FORM); setPings([]); setDescription(''); setQuestions([]); setAnswers({}); setCity(''); setSelectedProProfile(null); setView('home'); setBudget({ min: 50, max: 200 });
  };

  const selectRoleAndAuth = (selectedRole: UserRole) => {
    setRole(selectedRole); 
    localStorage.setItem('munus_temp_role', selectedRole); 
    setShowAuthPopup(true);
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Caricamento Profilo...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 overflow-hidden relative font-sans">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100/50 rounded-full blur-[120px]"></div>
        {showAuthPopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-10 text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-8 shadow-xl">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 20a10.003 10.003 0 006.235-2.307l.054.09C16.51 20.483 13.517 22 12 22s-4.51-1.517-6.235-4.571M12 11c0-3.517 1.009-6.799 2.753-9.571m-3.44 2.04l.054-.09A10.003 10.003 0 0112 4a10.003 10.003 0 016.235 2.307l.054-.09C16.51 3.517 13.517 2 12 2s-4.51 1.517-6.235 4.571"/></svg>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Accesso Verificato</h3>
                <p className="text-slate-500 mb-10 font-medium italic">Ti stai collegando come <span className="text-blue-600 font-black">{role === UserRole.PROFESSIONAL ? 'Professionista' : 'Cliente'}</span></p>
                {isAuthenticating ? (
                  <div className="flex flex-col items-center py-10 space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-black text-blue-600 uppercase tracking-widest">In attesa...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <button onClick={handleGoogleLogin} className="w-full bg-white border-2 border-slate-100 py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-4 hover:border-blue-500 transition-all text-slate-700 shadow-sm">
                      <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.273 0 3.191 2.691 1.245 6.655l4.021 3.11z"/><path fill="#34A853" d="M16.04 18.013c-1.09.693-2.414 1.078-3.84 1.078-3.13 0-5.806-2.113-6.75-4.978l-4.045 3.125C3.391 21.218 7.391 24 12 24c3.11 0 5.927-1.036 8.114-2.8l-4.074-3.187z"/><path fill="#4A90E2" d="M23.49 12.273c0-.827-.073-1.627-.21-2.4H12v4.582h6.455c-.278 1.513-1.127 2.79-2.414 3.655l4.073 3.186c2.386-2.2 3.759-5.436 3.759-9.023z"/><path fill="#FBBC05" d="M5.45 14.114c-.24-.71-.377-1.473-.377-2.264 0-.79.136-1.554.377-2.264L1.43 6.477A11.977 11.977 0 0 0 0 11.85c0 1.91.445 3.718 1.236 5.336l4.214-3.072z"/></svg>
                      Continua con Google
                    </button>
                    <button onClick={handleDemoLogin} className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black flex items-center justify-center gap-3">
                      Usa Account Demo
                    </button>
                    <button onClick={() => setShowAuthPopup(false)} className="w-full py-4 text-slate-400 font-bold text-xs uppercase tracking-widest">Annulla</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="max-w-4xl w-full grid md:grid-cols-2 gap-12 animate-in fade-in zoom-in relative z-10 text-center md:text-left">
          <div className="flex flex-col justify-center">
            <h1 className="text-7xl font-black text-slate-900 tracking-tighter mb-6 leading-none">MUNUS <br/><span className="text-blue-600">NETWORK</span></h1>
            <p className="text-xl text-slate-500 font-medium">Il passaparola digitale basato sulla <span className="text-slate-900 font-black">Fiducia Reale.</span></p>
          </div>
          <div className="space-y-6">
            <button onClick={() => selectRoleAndAuth(UserRole.CLIENT)} className="w-full bg-white p-10 rounded-[3rem] border-2 border-slate-200 hover:border-blue-600 transition-all text-left group shadow-lg">
              <h3 className="text-3xl font-black text-slate-900 mb-2">Cerca Esperto</h3>
              <p className="text-slate-500">Trova chi ti serve nella tua zona.</p>
            </button>
            <button onClick={() => selectRoleAndAuth(UserRole.PROFESSIONAL)} className="w-full bg-slate-900 p-10 rounded-[3rem] border-2 border-slate-900 hover:shadow-2xl transition-all text-left">
              <h3 className="text-3xl font-black text-white mb-2">Sei un Esperto?</h3>
              <p className="text-slate-400">Gestisci i tuoi lavori e la tua fama.</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout currentView={view} onNavigate={setView} role={role || undefined} onLogout={handleLogout} userProfile={isAuthenticated ? activeUser || undefined : undefined}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {!activeUser ? (
           <div className="text-center py-20">
             <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
             <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Preparazione Dashboard...</p>
           </div>
        ) : role === UserRole.PROFESSIONAL ? (
          <ProfessionalDashboard professional={activeUser} requests={requests} onAcceptRequest={handleAcceptRequest} onRejectRequest={handleRejectRequest} onUpdateProfile={handleUpdateProfile} />
        ) : (
          view === 'dashboard' ? (
            <UserDashboard requests={requests} professionals={professionals} onConfirmJob={handleConfirmJob} onAddReview={handleAddReviewFromDashboard} onSelectPro={setSelectedProProfile} onNewRequest={resetProcess} />
          ) : (
            <>
              {/* Progress Steps */}
              <div className="flex justify-center mb-10">
                <div className="flex items-center w-full max-w-2xl">
                  {[RequestStep.FORM, RequestStep.CLARIFY, RequestStep.SELECT_PROS, RequestStep.WAITING_RESPONSES, RequestStep.FINAL_MATCHES].map((s, idx) => (
                    <React.Fragment key={s}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-sm ${step === s ? 'bg-blue-600 text-white ring-4 ring-blue-100 scale-110' : idx < [RequestStep.FORM, RequestStep.CLARIFY, RequestStep.SELECT_PROS, RequestStep.WAITING_RESPONSES, RequestStep.FINAL_MATCHES].indexOf(step) ? 'bg-green-500 text-white' : 'bg-white text-slate-400 border'}`}>
                        {idx + 1}
                      </div>
                      {idx < 4 && <div className={`flex-1 h-0.5 mx-2 ${idx < [RequestStep.FORM, RequestStep.CLARIFY, RequestStep.SELECT_PROS, RequestStep.WAITING_RESPONSES, RequestStep.FINAL_MATCHES].indexOf(step) ? 'bg-green-500' : 'bg-slate-200'}`} />}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className="grid lg:grid-cols-12 gap-8 mt-12 animate-in fade-in slide-in-from-bottom-6">
                <div className="lg:col-span-8">
                  {step === RequestStep.FORM && (
                    <div className="bg-white rounded-[3rem] p-10 border shadow-xl">
                      <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Di cosa hai bisogno?</h2>
                      <p className="text-slate-500 mb-10 text-lg">Descrivi brevemente il lavoro da svolgere.</p>
                      <form onSubmit={handleInitialSubmit} className="space-y-8">
                        <textarea className="w-full bg-white !text-slate-900 rounded-[2.5rem] border p-8 focus:ring-8 focus:ring-blue-100 focus:border-blue-500 text-2xl placeholder-slate-300 shadow-inner" rows={5} placeholder="Es: Devo riparare una persiana..." value={description} onChange={(e) => setDescription(e.target.value)} required />
                        <button type="submit" disabled={isSearching} className="w-full bg-blue-600 text-white py-8 rounded-[2rem] font-black text-2xl shadow-2xl hover:bg-blue-700 transition-all">
                          {isSearching ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div> : "Continua"}
                        </button>
                      </form>
                    </div>
                  )}
                  {step === RequestStep.CLARIFY && (
                    <div className="bg-white rounded-[3rem] p-10 border shadow-xl">
                      <h2 className="text-3xl font-black text-slate-900 mb-10">Dettagli & Località</h2>
                      <form onSubmit={(e) => { e.preventDefault(); proceedToSearch(); }} className="space-y-10">
                        <div className="space-y-6">
                          {questions.map((q) => (
                            <div key={q.id} className="bg-slate-50 p-8 rounded-[2rem]">
                              <label className="block text-xs font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">{q.question}</label>
                              <input type="text" className="w-full bg-white !text-slate-900 rounded-2xl border p-5 focus:ring-blue-500 font-bold" placeholder={q.placeholder} value={answers[q.id] || ''} onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})} />
                            </div>
                          ))}
                          <div className="bg-slate-50 p-8 rounded-[2rem] relative">
                            <label className="block text-xs font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">Città dell'intervento</label>
                            <input type="text" className="w-full bg-white !text-slate-900 rounded-2xl border p-5 focus:ring-blue-500 font-bold" placeholder="Milano, Roma..." value={city} onChange={(e) => handleCityChange(e.target.value)} />
                            {citySuggestions.length > 0 && (
                              <div className="absolute z-[60] left-0 right-0 mt-2 bg-white border rounded-2xl shadow-2xl">
                                {citySuggestions.map((s, idx) => (
                                  <button key={idx} type="button" onClick={() => selectCity(s)} className="w-full text-left px-6 py-4 hover:bg-blue-50 text-slate-700 font-bold">{s}</button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-6">
                          <button type="button" onClick={() => setStep(RequestStep.FORM)} className="flex-1 bg-white text-slate-500 py-6 rounded-3xl font-bold border">Indietro</button>
                          <button type="submit" disabled={isMatchingPros} className="flex-[2] bg-blue-600 text-white py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-3 shadow-lg">
                            {isMatchingPros ? (<><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Ricerca...</>) : 'Visualizza Esperti'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                  {step === RequestStep.SELECT_PROS && (
                    <div className="space-y-8">
                      <div className="flex items-center justify-between bg-white p-8 rounded-[2.5rem] border shadow-xl">
                        <button onClick={() => setStep(RequestStep.CLARIFY)} className="p-3 text-slate-300 hover:text-blue-600"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg></button>
                        <h2 className="text-2xl font-black text-slate-900">Chi vuoi contattare? ({pings.length})</h2>
                        <button 
                          onClick={handleSendRequests} 
                          disabled={isSendingRequest || pings.length === 0}
                          className="bg-blue-600 text-white px-10 py-4 rounded-[1.5rem] font-black shadow-2xl flex items-center gap-3 transition-all"
                        >
                          {isSendingRequest ? (
                            <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Invio...</>
                          ) : 'Invia agli Esperti'}
                        </button>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-6">
                        {proposedPros.map(pro => (
                          <div key={pro.id} className="relative">
                            <ProfessionalCard professional={pro} onSelect={() => setSelectedProProfile(pro)} />
                            <button onClick={(e) => { e.stopPropagation(); togglePing(pro.id); }} className={`absolute top-6 right-6 w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all ${pings.includes(pro.id) ? 'bg-blue-600 border-blue-600 text-white shadow-xl' : 'bg-white/90 text-slate-400 hover:border-blue-400'}`}>
                              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {step === RequestStep.WAITING_RESPONSES && (<div className="bg-white rounded-[4rem] p-20 border shadow-2xl text-center"><div className="w-32 h-32 border-8 border-blue-600 border-t-transparent rounded-[2rem] animate-spin mx-auto mb-10"></div><h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Sincronizzazione Esperti...</h2></div>)}
                  {step === RequestStep.FINAL_MATCHES && (<div className="animate-in slide-in-from-bottom-12 text-center"><div className="bg-white p-20 rounded-[4rem] border shadow-2xl"><h2 className="text-4xl font-black text-slate-900 mb-8 tracking-tight">Richieste Inviate!</h2><button onClick={() => setView('dashboard')} className="bg-slate-900 text-white px-12 py-5 rounded-[2rem] font-black text-xl shadow-2xl">Vai alle mie richieste</button></div></div>)}
                </div>
                <div className="lg:col-span-4">
                  {selectedProProfile && (
                    <div className="bg-white rounded-[3rem] border shadow-2xl sticky top-28 overflow-hidden">
                      <div className="h-32 bg-blue-600 relative">
                        <button onClick={() => setSelectedProProfile(null)} className="absolute top-6 right-6 bg-white/20 text-white p-2 rounded-2xl"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg></button>
                      </div>
                      <div className="px-10 pb-12 -mt-16 relative text-center">
                        <img src={selectedProProfile.avatar} className="w-32 h-32 rounded-[2.5rem] border-[6px] border-white mx-auto mb-6 object-cover shadow-2xl" />
                        <h3 className="text-2xl font-black text-slate-900">{selectedProProfile.name}</h3>
                        <span className="inline-block bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-black uppercase mt-2 mb-8">{selectedProProfile.category}</span>
                        <ReviewSection professional={selectedProProfile} onAddReview={() => {}} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )
        )}
      </div>
    </Layout>
  );
};

export default App;
