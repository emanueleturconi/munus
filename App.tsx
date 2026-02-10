
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Layout from './components/Layout';
import { MOCK_PROFESSIONALS } from './constants';
import { RequestStep, Professional, Review, JobRequest, JobStatus, JobClarification, UserRole, Category, SubscriptionPlan } from './types';
import ProfessionalCard from './components/ProfessionalCard';
import ReviewSection from './components/ReviewSection';
import UserDashboard from './components/UserDashboard';
import ProfessionalDashboard from './components/ProfessionalDashboard';
import { getSmartMatches, getJobClarifications, refineBudget, getLocationSuggestions, ClarificationQuestion, SmartMatchResponse } from './services/geminiService';
import { 
  auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, 
  collection, doc, setDoc, getDoc, updateDoc, deleteDoc, addDoc, onSnapshot, query, orderBy 
} from './services/firebase';

interface ScoredProfessional extends Professional {
  matchScore: number;
}

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
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const [budget, setBudget] = useState<{ min: number; max: number }>({ min: 50, max: 200 });
  const [questions, setQuestions] = useState<ClarificationQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [proposedPros, setProposedPros] = useState<ScoredProfessional[]>([]);
  const [pings, setPings] = useState<string[]>([]); 
  const [sortBy, setSortBy] = useState<'match' | 'ranking'>('match');
  const [isSearching, setIsSearching] = useState(false);
  const [isMatchingPros, setIsMatchingPros] = useState(false);
  const [isRefiningBudget, setIsRefiningBudget] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [selectedProProfile, setSelectedProProfile] = useState<Professional | null>(null);

  const cityInputRef = useRef<HTMLDivElement>(null);
  const citySearchTimeoutRef = useRef<any>(null);

  // Calcolo del Badge Notifiche
  const notificationCount = useMemo(() => {
    if (!activeUser || !isAuthenticated) return 0;
    
    if (role === UserRole.CLIENT) {
      // Per il cliente: conta le richieste che hanno ricevuto proposte (ACCEPTED) ma non sono ancora confermate
      return requests.filter(r => r.clientId === activeUser.id && r.status === JobStatus.ACCEPTED && !r.hiredProId).length;
    } else if (role === UserRole.PROFESSIONAL) {
      // Per il professionista: conta le nuove opportunità non ancora accettate o rifiutate
      return requests.filter(r => 
        r.selectedProIds.includes(activeUser.id) && 
        !(r.acceptedProIds || []).includes(activeUser.id) && 
        !(r.rejectedProIds || []).includes(activeUser.id) &&
        r.status === JobStatus.PENDING
      ).length;
    }
    return 0;
  }, [requests, activeUser, role, isAuthenticated]);

  useEffect(() => {
    const unsubPros = onSnapshot(collection(db, 'professionals'), (snapshot) => {
      const prosList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Professional));
      if (prosList.length === 0) {
        MOCK_PROFESSIONALS.forEach(p => {
          const proWithSub = { ...p, subscription: { plan: SubscriptionPlan.BASE, isTrialUsed: false } };
          setDoc(doc(db, 'professionals', p.id), proWithSub);
        });
      }
      setProfessionals(prosList);
    });

    const unsubRequests = onSnapshot(query(collection(db, 'requests'), orderBy('createdAt', 'desc')), (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobRequest)));
    });

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      const demoActive = localStorage.getItem('munus_is_demo') === 'true';
      if (demoActive) {
        const savedUserStr = localStorage.getItem('munus_demo_user');
        const savedRole = localStorage.getItem('munus_temp_role');
        if (savedUserStr && savedRole) {
          try {
            setIsDemo(true); 
            setIsAuthenticated(true);
            setActiveUser(JSON.parse(savedUserStr));
            setRole(savedRole as UserRole);
          } catch(e) {}
          setIsLoadingProfile(false);
          return;
        }
      }

      if (user) {
        setIsLoadingProfile(true);
        const selectedRole = (localStorage.getItem('munus_temp_role') as UserRole) || UserRole.CLIENT;
        try {
          if (selectedRole === UserRole.PROFESSIONAL) {
            const proDoc = await getDoc(doc(db, 'professionals', user.uid));
            if (proDoc.exists()) {
              setActiveUser({ id: user.uid, ...proDoc.data() });
            } else {
              const newPro = {
                id: user.uid,
                name: user.displayName || 'Nuovo Esperto',
                email: user.email || '',
                avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'P')}&background=0284c7&color=fff`,
                category: Category.PLUMBER,
                bio: 'Professionista certificato nel network Munus.',
                phone: '',
                location: { lat: 45.4642, lng: 9.1900, address: 'Milano' },
                workingRadius: 30,
                hourlyRate: { min: 30, max: 50 },
                certifications: [],
                experienceYears: 1,
                ranking: 5.0,
                reviews: [],
                cvSummary: 'Profilo esperto verificato.',
                subscription: { plan: SubscriptionPlan.BASE, isTrialUsed: false }
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
                name: user.displayName || 'Utente Munus',
                email: user.email || '',
                avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&background=10b981&color=fff`,
                createdAt: new Date().toISOString(),
                ranking: 5.0,
                reviewCount: 0
              };
              await setDoc(doc(db, 'clients', user.uid), newClient);
              setActiveUser(newClient);
            }
          }
          setRole(selectedRole);
          setIsAuthenticated(true);
        } catch (err) {
          console.error("Errore profilo:", err);
        } finally {
          setIsLoadingProfile(false);
        }
      } else {
        setIsAuthenticated(false); setIsDemo(false); setActiveUser(null); setRole(null); setIsLoadingProfile(false);
      }
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (cityInputRef.current && !cityInputRef.current.contains(event.target as Node)) {
        setCitySuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => { unsubPros(); unsubRequests(); unsubAuth(); document.removeEventListener("mousedown", handleClickOutside); };
  }, []);

  const handleLogout = () => { 
    signOut(auth); setIsDemo(false); setIsAuthenticated(false); setActiveUser(null); setRole(null);
    localStorage.removeItem('munus_is_demo'); localStorage.removeItem('munus_demo_user'); localStorage.removeItem('munus_temp_role'); 
    resetProcess();
  };

  const handleGoogleLogin = async () => {
    setIsAuthenticating(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setShowAuthPopup(false);
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain') {
        alert("Errore: Dominio non autorizzato in Firebase. Usa 'Prova Account Demo'.");
      } else {
        alert("Errore durante l'accesso con Google.");
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDemoLogin = () => {
    setIsAuthenticating(true);
    const selectedRole = (localStorage.getItem('munus_temp_role') as UserRole) || UserRole.CLIENT;
    const demoUser = selectedRole === UserRole.PROFESSIONAL ? {
      id: 'demo_pro_1',
      name: 'Mario Rossi (Demo)',
      category: Category.PLUMBER,
      bio: 'Professionista demo esperto.',
      phone: '+39 340 000 0000',
      email: 'mario.demo@example.com',
      location: { lat: 45.4642, lng: 9.1900, address: 'Milano, Centro' },
      workingRadius: 30,
      hourlyRate: { min: 40, max: 60 },
      certifications: ['Certificazione Demo Munus'],
      experienceYears: 15,
      ranking: 4.8,
      reviews: [],
      cvSummary: 'Profilo demo.',
      avatar: 'https://picsum.photos/seed/mario/200',
      subscription: { plan: SubscriptionPlan.BASE, isTrialUsed: false }
    } : {
      id: 'demo_client_1',
      name: 'Utente Demo Munus',
      email: 'demo@munus.it',
      avatar: 'https://ui-avatars.com/api/?name=Demo+User&background=10b981&color=fff',
      createdAt: new Date().toISOString(),
      ranking: 4.9,
      reviewCount: 12
    };

    setTimeout(() => {
      localStorage.setItem('munus_is_demo', 'true');
      localStorage.setItem('munus_demo_user', JSON.stringify(demoUser));
      setIsDemo(true); setActiveUser(demoUser); setRole(selectedRole); setIsAuthenticated(true); setShowAuthPopup(false); setIsAuthenticating(false);
    }, 1000);
  };

  const handleUpgradeSubscription = async (plan: SubscriptionPlan) => {
    if (!activeUser || role !== UserRole.PROFESSIONAL) return;
    let days = plan === SubscriptionPlan.TRIAL ? 7 : plan === SubscriptionPlan.MONTHLY ? 30 : 365;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    const updatedSub = {
      plan: plan,
      expiryDate: expiry.toLocaleDateString('it-IT'),
      isTrialUsed: plan === SubscriptionPlan.TRIAL ? true : (activeUser.subscription?.isTrialUsed || false)
    };
    if (isDemo) { setActiveUser({ ...activeUser, subscription: updatedSub }); alert(`Piano ${plan} attivato (Demo)!`); return; }
    try {
      await updateDoc(doc(db, 'professionals', activeUser.id), { subscription: updatedSub });
      setActiveUser({ ...activeUser, subscription: updatedSub });
      alert(`Piano ${plan} attivato!`);
    } catch (err) { console.error(err); }
  };

  const handleRefineBudgetAI = useCallback(async () => {
    if (isRefiningBudget) return;
    setIsRefiningBudget(true);
    try {
      const clars: JobClarification[] = questions
        .filter(q => answers[q.id])
        .map(q => ({ question: q.question, answer: answers[q.id] }));
      const refined = await refineBudget(description, clars);
      setBudget(refined);
    } catch (err) {
      console.error("Errore ricalcolo budget", err);
    } finally {
      setIsRefiningBudget(false);
    }
  }, [description, questions, answers, isRefiningBudget]);

  useEffect(() => {
    if (step === RequestStep.CLARIFY) {
      const delayDebounceFn = setTimeout(() => {
        handleRefineBudgetAI();
      }, 2000);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [answers, step]);

  const proceedToSearch = async () => {
    if (!city || city.trim() === '') { alert("Indica la città dell'intervento."); return; }
    setIsMatchingPros(true);
    try {
      const requestStub: JobRequest = {
        id: 'stub', clientId: activeUser?.id || 'anon', description, budgetRange: budget, city: city || 'Milano',
        selectedProIds: [], acceptedProIds: [], status: JobStatus.PENDING, createdAt: '',
      };
      const matches = await getSmartMatches(requestStub, professionals);
      const results: ScoredProfessional[] = matches.map(m => {
        const pro = professionals.find(p => p.id === m.id);
        return pro ? { ...pro, matchScore: m.score } : null;
      }).filter((p): p is ScoredProfessional => p !== null);
      
      setProposedPros(results.length > 0 ? results : professionals.slice(0, 4).map(p => ({ ...p, matchScore: 75 })));
      setStep(RequestStep.SELECT_PROS);
    } catch (err) {
      setProposedPros(professionals.slice(0, 4).map(p => ({ ...p, matchScore: 75 })));
      setStep(RequestStep.SELECT_PROS);
    } finally { setIsMatchingPros(false); }
  };

  const handleSendRequests = async () => {
    if (pings.length === 0) { alert("Seleziona almeno un esperto."); return; }
    setIsSendingRequest(true);
    try {
      const savedClarifications: JobClarification[] = questions
        .filter(q => answers[q.id] && answers[q.id].trim() !== '')
        .map(q => ({ question: q.question, answer: answers[q.id] }));
      const newRequestData = {
        description: description || "Richiesta",
        budgetRange: { min: budget.min || 0, max: budget.max || 0 },
        city: city || "Non specificata",
        selectedProIds: [...pings],
        acceptedProIds: [],
        rejectedProIds: [],
        status: JobStatus.PENDING,
        createdAt: new Date().toLocaleString('it-IT'),
        clarifications: savedClarifications,
        clientId: activeUser?.id || 'anon',
        clientName: activeUser?.name || 'Utente',
        clientAvatar: activeUser?.avatar || '',
        clientRanking: activeUser?.ranking || 5.0
      };
      const docRef = await addDoc(collection(db, 'requests'), newRequestData);
      setStep(RequestStep.WAITING_RESPONSES);
      simulateOtherProResponses(docRef.id, pings);
    } catch (error: any) { alert(`Errore: ${error.message}`); } finally { setIsSendingRequest(false); }
  };

  const simulateOtherProResponses = (requestId: string, targetProIds: string[]) => {
    // La simulazione ora gestisce solo la transizione della UI verso la schermata di successo dell'invio.
    // Abbiamo rimosso l'aggiornamento automatico del documento Firestore a 'ACCEPTED' 
    // per permettere una gestione manuale della disponibilità da parte dei professionisti.
    setTimeout(() => { 
      setStep(RequestStep.FINAL_MATCHES); 
    }, 2500);
  };

  const handleConfirmJob = async (requestId: string, proId: string) => {
    const reqRef = doc(db, 'requests', requestId);
    const reqSnap = await getDoc(reqRef);
    if (reqSnap.exists()) {
      const data = reqSnap.data();
      await updateDoc(reqRef, { status: JobStatus.CONFIRMED, hiredProId: proId, rejectedProIds: data.selectedProIds.filter((id: string) => id !== proId) });
    }
  };

  const handleMarkServiceAsReceived = async (requestId: string) => {
    await updateDoc(doc(db, 'requests', requestId), { serviceReceived: true });
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (window.confirm("Annullare richiesta?")) {
      try { await deleteDoc(doc(db, 'requests', requestId)); } catch (err) {}
    }
  };

  const handleAddReviewFromDashboard = async (requestId: string, proId: string, reviewData: Omit<Review, 'id' | 'isConfirmed'>) => {
    const request = requests.find(r => r.id === requestId);
    if (!request) return;
    const newReview: Review = { 
      ...reviewData, id: `rev_${Math.random().toString(36).substr(2, 9)}`, 
      isConfirmed: false, jobDescription: request.description, 
      clientId: activeUser?.id || 'anon', clientName: activeUser?.name || 'Cliente' 
    };
    const pro = professionals.find(p => p.id === proId);
    if (pro) {
      const updatedReviews = [...pro.reviews, newReview];
      if (!isDemo) await updateDoc(doc(db, 'professionals', proId), { reviews: updatedReviews });
    }
    await updateDoc(doc(db, 'requests', requestId), { status: JobStatus.COMPLETED, hasFeedback: true });
  };

  const handleConfirmWorkByPro = async (reviewId: string) => {
    const pro = professionals.find(p => p.id === activeUser.id);
    if (!pro) return;
    const updatedReviews = pro.reviews.map(r => r.id === reviewId ? { ...r, isConfirmed: true } : r);
    const confirmedReviews = updatedReviews.filter(r => r.isConfirmed);
    const newRanking = confirmedReviews.length > 0 ? confirmedReviews.reduce((acc, rev) => acc + rev.rating, 0) / confirmedReviews.length : 5.0;
    if (isDemo) { setActiveUser({ ...activeUser, reviews: updatedReviews, ranking: newRanking }); return; }
    await updateDoc(doc(db, 'professionals', activeUser.id), { reviews: updatedReviews, ranking: newRanking });
  };

  const handleReplyToReview = async (reviewId: string, replyComment: string, clientRating: number) => {
    const pro = professionals.find(p => p.id === activeUser.id);
    if (!pro) return;
    const review = pro.reviews.find(r => r.id === reviewId);
    if (!review) return;

    // Update the review in professional's array
    const updatedReviews = pro.reviews.map(r => r.id === reviewId ? { ...r, proReply: { comment: replyComment, clientRating, date: new Date().toLocaleDateString('it-IT') } } : r);
    
    if (isDemo) { 
      setActiveUser({ ...activeUser, reviews: updatedReviews }); 
      return; 
    }
    
    // Update professional document
    await updateDoc(doc(db, 'professionals', activeUser.id), { reviews: updatedReviews });

    // Update client overall ranking
    try {
      const clientDocRef = doc(db, 'clients', review.clientId);
      const clientSnap = await getDoc(clientDocRef);
      if (clientSnap.exists()) {
        const clientData = clientSnap.data();
        const oldRanking = clientData.ranking || 5.0;
        const oldCount = clientData.reviewCount || 0;
        const newCount = oldCount + 1;
        const newRanking = ((oldRanking * oldCount) + clientRating) / newCount;
        
        await updateDoc(clientDocRef, { 
          ranking: parseFloat(newRanking.toFixed(1)), 
          reviewCount: newCount 
        });
      }
    } catch (err) {
      console.error("Error updating client ranking:", err);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    if (!activeUser) return;
    try {
      const reqRef = doc(db, 'requests', requestId);
      const reqSnap = await getDoc(reqRef);
      if (reqSnap.exists()) {
        const currentAccepted = reqSnap.data().acceptedProIds || [];
        if (!currentAccepted.includes(activeUser.id)) {
          const updates: any = { acceptedProIds: [...new Set([...currentAccepted, activeUser.id])] };
          if (reqSnap.data().status === JobStatus.PENDING) updates.status = JobStatus.ACCEPTED;
          await updateDoc(reqRef, updates);
        }
      }
    } catch (err) {}
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!activeUser) return;
    try {
      const reqRef = doc(db, 'requests', requestId);
      const reqSnap = await getDoc(reqRef);
      if (reqSnap.exists()) {
        const currentRejected = reqSnap.data().rejectedProIds || [];
        await updateDoc(reqRef, { rejectedProIds: [...new Set([...currentRejected, activeUser.id])] });
      }
    } catch (err) {}
  };

  const handleUpdateProfile = async (updatedPro: Professional) => {
    if (isDemo) { setActiveUser(updatedPro); return; }
    try { await updateDoc(doc(db, 'professionals', updatedPro.id), updatedPro as any); setActiveUser(updatedPro); } catch (err) {}
  };

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setIsSearching(true);
    try {
      const analysis = await getJobClarifications(description);
      setBudget(analysis.suggestedBudget);
      if (analysis.questions && analysis.questions.length > 0) {
        setQuestions(analysis.questions);
        setStep(RequestStep.CLARIFY);
      } else proceedToSearch();
    } catch (err) { proceedToSearch(); } finally { setIsSearching(false); }
  };

  const togglePing = (id: string) => {
    setPings(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleCityChange = (val: string) => {
    setCity(val);
    if (citySearchTimeoutRef.current) clearTimeout(citySearchTimeoutRef.current);

    if (val.trim().length >= 2) {
      setIsSearchingCity(true);
      citySearchTimeoutRef.current = setTimeout(async () => {
        try {
          const suggestions = await getLocationSuggestions(val);
          setCitySuggestions(suggestions);
        } catch (err) {
          console.error("City search error", err);
        } finally {
          setIsSearchingCity(false);
        }
      }, 600);
    } else {
      setCitySuggestions([]);
      setIsSearchingCity(false);
    }
  };

  const selectCity = (c: string) => {
    setCity(c);
    setCitySuggestions([]);
  };

  const resetProcess = () => {
    setStep(RequestStep.FORM); setPings([]); setDescription(''); setQuestions([]); setAnswers({}); setCity(''); setSelectedProProfile(null); setView('home'); setBudget({ min: 50, max: 200 });
  };

  const selectRoleAndAuth = (selectedRole: UserRole) => {
    setRole(selectedRole); localStorage.setItem('munus_temp_role', selectedRole); setShowAuthPopup(true);
  };

  const sortedPros = [...proposedPros].sort((a, b) => {
    if (sortBy === 'match') return b.matchScore - a.matchScore;
    return b.ranking - a.ranking;
  });

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Accesso in corso...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 overflow-hidden relative font-sans">
        {showAuthPopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-10 text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-8 shadow-xl">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 20a10.003 10.003 0 006.235-2.307l.054.09C16.51 20.483 13.517 22 12 22s-4.51-1.517-6.235-4.571M12 11c0-3.517 1.009-6.799 2.753-9.571m-3.44 2.04l.054-.09A10.003 10.003 0 0112 4a10.003 10.003 0 016.235 2.307l.054-.09C16.51 3.517 13.517 2 12 2s-4.51 1.517-6.235-4.571"/></svg>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Accesso Munus</h3>
                <p className="text-slate-500 mb-10 font-medium italic">Accedi come <span className="text-blue-600 font-black">{role === UserRole.PROFESSIONAL ? 'Esperto' : 'Cliente'}</span></p>
                <div className="space-y-4">
                  <button onClick={handleGoogleLogin} className="w-full bg-white border-2 border-slate-100 py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-4 hover:border-blue-500 transition-all text-slate-700 shadow-sm active:scale-95">
                    {isAuthenticating ? (
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" style={{ display: 'block' }}>
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Continua con Google
                      </>
                    )}
                  </button>
                  <button onClick={handleDemoLogin} className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black active:scale-95">Prova Account Demo</button>
                  <button onClick={() => setShowAuthPopup(false)} className="w-full py-4 text-slate-400 font-bold text-xs uppercase">Chiudi</button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="max-w-4xl w-full grid md:grid-cols-2 gap-12 text-center md:text-left p-6">
          <div className="flex flex-col justify-center">
            <h1 className="text-6xl md:text-7xl font-black text-slate-900 tracking-tighter mb-6 leading-none">MUNUS <br/><span className="text-blue-600">NETWORK</span></h1>
            <p className="text-xl text-slate-500 font-medium">Il passaparola digitale basato sulla fiducia.</p>
          </div>
          <div className="space-y-6">
            <button onClick={() => selectRoleAndAuth(UserRole.CLIENT)} className="w-full bg-white p-8 md:p-10 rounded-[3rem] border-2 border-slate-200 hover:border-blue-600 transition-all text-left group shadow-lg active:scale-[0.98]">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{display: 'block'}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 leading-tight">Cerca Esperto</h2>
                  <p className="text-slate-500 font-medium">Trova il professionista giusto</p>
                </div>
              </div>
            </button>
            <button onClick={() => selectRoleAndAuth(UserRole.PROFESSIONAL)} className="w-full bg-slate-900 p-8 md:p-10 rounded-[3rem] border-2 border-slate-900 hover:shadow-2xl transition-all text-left active:scale-[0.98]">
              <div className="flex items-center gap-6 text-white">
                <div className="w-16 h-16 bg-white/10 text-white rounded-2xl flex items-center justify-center shrink-0">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{display: 'block'}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white leading-tight">Sei un Esperto?</h2>
                  <p className="text-slate-400 font-medium">Entra nel network e ricevi richieste</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout 
      currentView={view} 
      onNavigate={setView} 
      role={role || undefined} 
      onLogout={handleLogout} 
      userProfile={isAuthenticated ? activeUser || undefined : undefined}
      requestBadgeCount={notificationCount}
    >
      <div className="max-w-7xl mx-auto px-4 py-8">
        {!activeUser ? (
           <div className="text-center py-20 text-slate-900 font-bold">Caricamento in corso...</div>
        ) : role === UserRole.PROFESSIONAL ? (
          <ProfessionalDashboard 
            professional={activeUser} requests={requests} 
            allProfessionals={professionals}
            onAcceptRequest={handleAcceptRequest} onRejectRequest={handleRejectRequest} 
            onUpdateProfile={handleUpdateProfile} onConfirmWork={handleConfirmWorkByPro}
            onReplyToReview={handleReplyToReview} onUpgradeSubscription={handleUpgradeSubscription}
          />
        ) : (
          view === 'dashboard' ? (
            <UserDashboard 
              requests={requests} professionals={professionals} 
              onConfirmJob={handleConfirmJob} onMarkServiceAsReceived={handleMarkServiceAsReceived}
              onDeleteRequest={handleDeleteRequest} onAddReview={handleAddReviewFromDashboard} 
              onSelectPro={setSelectedProProfile} onNewRequest={resetProcess} 
              clientRanking={activeUser?.ranking || 5.0}
            />
          ) : (
            <>
              <div className="flex justify-center mb-10 overflow-x-auto pb-4 no-scrollbar">
                <div className="flex items-center w-full max-w-2xl px-4 min-w-[500px]">
                  {[RequestStep.FORM, RequestStep.CLARIFY, RequestStep.SELECT_PROS, RequestStep.WAITING_RESPONSES, RequestStep.FINAL_MATCHES].map((s, idx) => (
                    <React.Fragment key={s}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-sm shrink-0 ${step === s ? 'bg-blue-600 text-white ring-4 ring-blue-100 scale-110' : idx < [RequestStep.FORM, RequestStep.CLARIFY, RequestStep.SELECT_PROS, RequestStep.WAITING_RESPONSES, RequestStep.FINAL_MATCHES].indexOf(step) ? 'bg-green-500 text-white' : 'bg-white text-slate-400 border'}`}>
                        {idx < [RequestStep.FORM, RequestStep.CLARIFY, RequestStep.SELECT_PROS, RequestStep.WAITING_RESPONSES, RequestStep.FINAL_MATCHES].indexOf(step) ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg> : idx + 1}
                      </div>
                      {idx < 4 && <div className={`flex-1 h-0.5 mx-2 min-w-[20px] ${idx < [RequestStep.FORM, RequestStep.CLARIFY, RequestStep.SELECT_PROS, RequestStep.WAITING_RESPONSES, RequestStep.FINAL_MATCHES].indexOf(step) ? 'bg-green-500' : 'bg-slate-200'}`} />}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className="grid lg:grid-cols-12 gap-8 mt-4 animate-in fade-in">
                <div className="lg:col-span-8">
                  {step === RequestStep.FORM && (
                    <div className="bg-white rounded-[2.5rem] p-10 border shadow-xl text-slate-900 font-bold">
                      <h2 className="text-3xl font-black mb-8 text-slate-900">Di cosa hai bisogno?</h2>
                      <textarea className="w-full bg-white text-slate-900 rounded-[2rem] border-2 border-slate-100 p-8 text-xl placeholder-slate-300 focus:border-blue-600 focus:ring-0 outline-none" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Es: Devo riparare una perdita d'acqua in cucina..." required />
                      <button onClick={handleInitialSubmit} disabled={isSearching} className="w-full bg-blue-600 text-white py-8 rounded-[2rem] font-black text-2xl shadow-2xl mt-8 flex items-center justify-center gap-3">
                        {isSearching ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Continua"}
                      </button>
                    </div>
                  )}
                  {step === RequestStep.CLARIFY && (
                    <div className="bg-white rounded-[2.5rem] p-10 border shadow-xl">
                      <div className="mb-10 flex items-center justify-between">
                        <h2 className="text-2xl font-black text-slate-900">Specifica Dettagli</h2>
                        {isRefiningBudget && (
                          <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase">
                            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            ✨ IA sta aggiornando il budget...
                          </div>
                        )}
                      </div>
                      <div className="space-y-6">
                        {questions.map((q) => (
                          <div key={q.id} className="bg-slate-50 p-6 rounded-[2rem]">
                            <label className="block text-[10px] font-black text-slate-400 mb-4 uppercase">{q.question}</label>
                            <input type="text" className="w-full bg-white text-slate-900 rounded-2xl border p-4 font-bold outline-none focus:border-blue-600" value={answers[q.id] || ''} onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})} placeholder={q.placeholder} />
                          </div>
                        ))}
                        <div className="bg-slate-50 p-6 rounded-[2rem] relative" ref={cityInputRef}>
                          <label className="block text-[10px] font-black text-slate-400 mb-4 uppercase">Città o Frazione dell'intervento</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              className="w-full bg-white text-slate-900 rounded-2xl border p-4 font-bold outline-none focus:border-blue-600 pr-12" 
                              value={city} 
                              onChange={(e) => handleCityChange(e.target.value)} 
                              placeholder="Cerca comune o frazione (es. Sforzesca)..." 
                            />
                            {isSearchingCity && (
                              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            )}
                          </div>
                          {citySuggestions.length > 0 && (
                            <div className="absolute z-[70] left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                              {citySuggestions.map((s, i) => (
                                <button 
                                  key={i} 
                                  type="button"
                                  onClick={() => selectCity(s)} 
                                  className="w-full text-left px-6 py-4 hover:bg-blue-50 text-slate-700 font-bold border-b last:border-0 transition-colors flex items-center gap-3"
                                >
                                  <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                  {s}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="bg-blue-50/50 p-8 rounded-[2rem] border border-blue-100/50 relative overflow-hidden">
                          <div className="flex flex-col mb-6">
                            <label className="text-[10px] font-black text-blue-600 uppercase">Budget Proposto (Modificabile)</label>
                            <div className="mt-2 flex items-center gap-2 bg-white/60 self-start px-3 py-1.5 rounded-lg border border-blue-100">
                               <span className="text-blue-500 animate-pulse">✨</span>
                               <span className="text-[10px] text-blue-800 font-bold italic">Budget calcolato automatically in base ai dettagli della tua richiesta</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <input type="number" className="w-full bg-white text-slate-900 rounded-2xl border p-4 font-black outline-none focus:border-blue-600 transition-colors" value={budget.min} onChange={(e) => setBudget({...budget, min: parseInt(e.target.value) || 0})} />
                            <div className="text-blue-200 font-black text-xl">-</div>
                            <input type="number" className="w-full bg-white text-slate-900 rounded-2xl border p-4 font-black outline-none focus:border-blue-600 transition-colors" value={budget.max} onChange={(e) => setBudget({...budget, max: parseInt(e.target.value) || 0})} />
                          </div>
                        </div>
                      </div>
                      <button onClick={proceedToSearch} disabled={isMatchingPros} className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black text-lg mt-8 flex items-center justify-center gap-3 shadow-xl hover:bg-blue-700 transition-all active:scale-[0.98]">
                        {isMatchingPros ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Trova Esperti'}
                      </button>
                    </div>
                  )}
                  {step === RequestStep.SELECT_PROS && (
                    <div className="space-y-6">
                      <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
                         <div>
                            <h2 className="text-2xl font-black text-slate-900">Seleziona professionisti ({pings.length})</h2>
                            <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-wider">Migliori match calcolati via AI</p>
                         </div>
                         <div className="flex items-center gap-4 self-stretch sm:self-auto">
                            <div className="bg-slate-50 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-100">
                               <button 
                                 onClick={() => setSortBy('match')} 
                                 className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${sortBy === 'match' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                               >
                                 Top Match
                               </button>
                               <button 
                                 onClick={() => setSortBy('ranking')} 
                                 className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${sortBy === 'ranking' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                               >
                                 Ranking
                               </button>
                            </div>
                            <button 
                              onClick={handleSendRequests} 
                              disabled={pings.length === 0} 
                              className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black text-sm disabled:bg-slate-300 shadow-lg active:scale-95 transition-all"
                            >
                              Invia Richiesta
                            </button>
                         </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-6">
                        {sortedPros.map(pro => (
                          <div key={pro.id} className="relative">
                            <ProfessionalCard professional={pro} matchScore={pro.matchScore} onSelect={() => setSelectedProProfile(pro)} />
                            <button onClick={() => togglePing(pro.id)} className={`absolute top-4 right-4 w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${pings.includes(pro.id) ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-slate-400'}`}>
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {step === RequestStep.WAITING_RESPONSES && (
                    <div className="text-center py-24 bg-white rounded-[3rem] border shadow-xl">
                      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                      <h2 className="text-2xl font-black text-slate-900 mb-2">Sincronizzazione in corso...</h2>
                      <p className="text-slate-400 font-medium">Contattiamo gli esperti disponibili.</p>
                    </div>
                  )}
                  {step === RequestStep.FINAL_MATCHES && (
                    <div className="text-center py-24 bg-white rounded-[3rem] border shadow-xl">
                      <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                         <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                      </div>
                      <h2 className="text-2xl font-black text-slate-900 mb-8">Richiesta Inviata!</h2>
                      <button onClick={() => setView('dashboard')} className="bg-slate-900 text-white px-12 py-5 rounded-2xl font-black shadow-xl active:scale-95 transition-transform">Vai alla Dashboard</button>
                    </div>
                  )}
                </div>
                <div className="lg:col-span-4">
                  {selectedProProfile ? (
                    <div className="bg-white rounded-[2.5rem] border shadow-2xl p-8 sticky top-28 animate-in slide-in-from-right overflow-hidden">
                       <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                          <img src={selectedProProfile.avatar} className="w-16 h-16 rounded-2xl object-cover shadow-md" alt={selectedProProfile.name} />
                          <div className="flex-1">
                             <h3 className="font-black text-slate-900 text-lg leading-tight">{selectedProProfile.name}</h3>
                             <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">{selectedProProfile.category}</p>
                             <div className="mt-2 flex items-center gap-1.5">
                                <div className="bg-yellow-400 text-white px-2 py-0.5 rounded-md text-[10px] font-black flex items-center gap-0.5">
                                   ★ {selectedProProfile.ranking.toFixed(1)}
                                </div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Voto medio</span>
                             </div>
                          </div>
                       </div>
                       <ReviewSection professional={selectedProProfile} onAddReview={() => {}} hideForm={true} />
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-[2.5rem] p-12 text-center sticky top-28">
                       <p className="text-slate-400 font-bold text-sm">Seleziona un profilo per visualizzare recensioni e dettagli tecnici.</p>
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
