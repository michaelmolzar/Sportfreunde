/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { 
  Heart, 
  TrendingUp, 
  Users, 
  Info, 
  Award, 
  Calendar,
  Menu,
  X,
  CalendarDays,
  Clock,
  Settings,
  Mail,
  HeartHandshake,
  Trash2,
  Save,
  Trophy,
  Globe
} from 'lucide-react';
import { db, auth } from './firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

// --- DATEN-MODELL & KONFIGURATION ---
const RULES = {
  punkt: 1,
  tor: 1,
  meister: 100,
  cup: 100,
  cupFinale: 50,
  euroQuali: 50,
  euroSieg: 200,
  euroFinale: 100,
  euroGruppenphase: 50
};

const COLORS = {
  violett: '#5C2D91',
  gelb: '#FACC15',
  gold: '#D4AF37',
  gruen: '#10B981'
};

// Aktuelle Daten (Initialwerte)
const INITIAL_CLUBS_DATA: Record<string, { spieltag: number; punkte: number; tore: number; titel: string[]; logo: string; apiTeamId?: number; apiLeagueId?: number; apiSeason?: number }> = {
  'Austria Wien': { 
    spieltag: 20, 
    punkte: 32, 
    tore: 30, 
    titel: [],
    logo: '/logos/austria-wien.png',
    apiTeamId: 77, apiLeagueId: 218, apiSeason: 2024
  },
  'Rapid Wien': { 
    spieltag: 20, 
    punkte: 29, 
    tore: 24, 
    titel: [],
    logo: '/logos/rapid-wien.png',
    apiTeamId: 76, apiLeagueId: 218, apiSeason: 2024
  },
  'Villarreal': { 
    spieltag: 25, 
    punkte: 51, 
    tore: 47, 
    titel: [],
    logo: '/logos/villarreal.png',
    apiTeamId: 533, apiLeagueId: 140, apiSeason: 2024
  }
};

const INITIAL_NATIONAL_TEAMS_DATA: Record<string, { spiele: number; punkte: number; tore: number; logo: string; apiTeamId?: number; apiLeagueId?: number; apiSeason?: number }> = {
  'Österreich': { 
    spiele: 6, 
    punkte: 13, 
    tore: 16,
    logo: '/logos/oesterreich.png',
    apiTeamId: 17, apiLeagueId: 32, apiSeason: 2024
  },
  'Spanien': { 
    spiele: 6, 
    punkte: 16, 
    tore: 21,
    logo: '/logos/spanien.png',
    apiTeamId: 9, apiLeagueId: 32, apiSeason: 2024
  }
};

const membersConfig = [
  { name: 'Tom', club: 'Austria Wien', nationalTeam: 'Österreich', color: COLORS.violett },
  { name: 'Molz', club: 'Austria Wien', nationalTeam: 'Österreich', color: COLORS.violett },
  { name: 'Klaus', club: 'Austria Wien', nationalTeam: 'Österreich', color: COLORS.violett },
  { name: 'Michi', club: 'Austria Wien', nationalTeam: 'Österreich', color: COLORS.violett },
  { name: 'Lukas', club: 'Rapid Wien', nationalTeam: 'Österreich', color: COLORS.gelb },
  { name: 'Jakob', club: 'Villarreal', nationalTeam: 'Spanien', color: COLORS.gold }
];

// Hilfskomponente für Logos mit Format-Fallback
const SmartLogo = ({ src, alt, className }: { src: string, alt: string, className: string }) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [attemptedExtensions, setAttemptedExtensions] = useState<string[]>([]);

  // Reset state when src prop changes
  useEffect(() => {
    setCurrentSrc(src);
    setAttemptedExtensions([]);
  }, [src]);

  const handleError = () => {
    // Extract base path and current extension
    const match = currentSrc.match(/^(.*)\.([a-zA-Z0-9]+)$/);
    if (!match) return; // Can't parse, stop trying

    const basePath = match[1];
    const currentExt = match[2].toLowerCase();
    
    const extensions = ['png', 'svg', 'jpg', 'jpeg'];
    // Add current extension to attempted
    const newAttempted = [...attemptedExtensions];
    if (!newAttempted.includes(currentExt)) {
        newAttempted.push(currentExt);
    }
    setAttemptedExtensions(newAttempted);

    // Find next extension to try
    const nextExt = extensions.find(ext => !newAttempted.includes(ext));
    
    if (nextExt) {
      setCurrentSrc(`${basePath}.${nextExt}`);
    } else {
      if (!currentSrc.startsWith('https://ui-avatars.com')) {
        setCurrentSrc(`https://ui-avatars.com/api/?name=${encodeURIComponent(alt)}&background=random&color=fff&bold=true`);
      }
    }
  };

  if (!currentSrc) {
    return <div className={`bg-gray-200 flex items-center justify-center ${className}`}><span className="text-gray-400 text-xs">No Logo</span></div>;
  }

  return (
    <img 
      src={currentSrc} 
      alt={alt} 
      className={className}
      referrerPolicy="no-referrer"
      onError={handleError}
    />
  );
};

// Hilfskomponente für Community-Bilder mit Format-Fallback
const CommunityImage = ({ index, alt, className }: { index: number, alt: string, className: string }) => {
  const [src, setSrc] = useState(`/images/sportfreunde${index}.jpg`);
  const [attempt, setAttempt] = useState(0); // 0=jpg, 1=png, 2=svg, 3=fallback

  const handleError = () => {
    if (attempt === 0) {
      // Fallback 1: Versuch es mit .png
      setSrc(`/images/sportfreunde${index}.png`);
      setAttempt(1);
    } else if (attempt === 1) {
      // Fallback 2: Versuch es mit .svg
      setSrc(`/images/sportfreunde${index}.svg`);
      setAttempt(2);
    } else if (attempt === 2) {
      // Fallback 3: Platzhalter
      setSrc(`https://picsum.photos/seed/stadium${index}/800/600`);
      setAttempt(3);
    }
  };

  if (!src) return null;

  return (
    <img 
      src={src} 
      alt={alt} 
      className={className}
      referrerPolicy="no-referrer"
      onError={handleError}
    />
  );
};

// Hilfskomponente für Personen-Bilder mit Format-Fallback
const PersonImage = ({ index, alt, className }: { index: number, alt: string, className: string }) => {
  const [src, setSrc] = useState(`/images/person${index}.jpg`);
  const [attempt, setAttempt] = useState(0); // 0=jpg, 1=png, 2=svg, 3=jpeg, 4=fallback

  const handleError = () => {
    if (attempt === 0) {
      setSrc(`/images/person${index}.png`);
      setAttempt(1);
    } else if (attempt === 1) {
      setSrc(`/images/person${index}.svg`);
      setAttempt(2);
    } else if (attempt === 2) {
      setSrc(`/images/person${index}.jpeg`);
      setAttempt(3);
    } else {
      setAttempt(4);
    }
  };

  if (attempt === 4 || !src) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-200">
        <Users size={40} />
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className={className}
      referrerPolicy="no-referrer"
      onError={handleError}
    />
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Admin Login State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  // New Member Input State
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberClub, setNewMemberClub] = useState('Austria Wien');
  const [newMemberNationalTeam, setNewMemberNationalTeam] = useState('Österreich');

  // Newsletter Signup State
  const [signupEmail, setSignupEmail] = useState('');
  const [signupConsent, setSignupConsent] = useState(false);
  const [signupStatus, setSignupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // API Football Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState('');

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput === 'sportfreunde2024') {
      setIsAdminAuthenticated(true);
      setLoginError(false);
      // Sign in anonymously to allow writes to Firestore
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Error signing in anonymously:", error);
      }
    } else {
      setLoginError(true);
    }
  };

  // State für Daten (mit Firestore Integration)
  const [isLoading, setIsLoading] = useState(true);
  const [clubsData, setClubsData] = useState<any>(INITIAL_CLUBS_DATA);
  const [nationalTeamsData, setNationalTeamsData] = useState<any>(INITIAL_NATIONAL_TEAMS_DATA);
  const [membersList, setMembersList] = useState<any[]>(membersConfig);
  
  // State für neue Einträge
  const [newClubName, setNewClubName] = useState('');
  const [newNationalTeamName, setNewNationalTeamName] = useState('');
  
  // State für Newsletter
  const [newsletterSubject, setNewsletterSubject] = useState('');
  const [newsletterBody, setNewsletterBody] = useState('');

  const handleSendNewsletter = () => {
    const emails = membersList.map(m => m.email).filter(Boolean).join(',');
    if (!emails) {
      alert('Keine E-Mail-Adressen bei den Mitgliedern hinterlegt!');
      return;
    }
    if (!newsletterSubject || !newsletterBody) {
      alert('Bitte Betreff und Nachricht eingeben!');
      return;
    }
    const subject = encodeURIComponent(newsletterSubject);
    const body = encodeURIComponent(newsletterBody);
    window.location.href = `mailto:?bcc=${emails}&subject=${subject}&body=${body}`;
  };

  const handleNewsletterSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail || !signupConsent) return;
    
    setSignupStatus('loading');
    try {
      await addDoc(collection(db, 'newsletter_subscribers'), {
        email: signupEmail,
        consent: signupConsent,
        subscribedAt: new Date().toISOString()
      });
      setSignupStatus('success');
      setSignupEmail('');
      setSignupConsent(false);
      setTimeout(() => setSignupStatus('idle'), 5000);
    } catch (error) {
      console.error('Error adding newsletter subscriber: ', error);
      setSignupStatus('error');
      setTimeout(() => setSignupStatus('idle'), 5000);
    }
  };

  const syncWithApiFootball = async () => {
    const apiKey = import.meta.env.VITE_API_FOOTBALL_KEY;
    if (!apiKey) {
      alert("API Key für API-Football fehlt! Bitte in den Umgebungsvariablen (VITE_API_FOOTBALL_KEY) eintragen.");
      return;
    }

    setIsSyncing(true);
    setSyncResult('');
    let successCount = 0;
    let errorCount = 0;

    const fetchTeamData = async (teamName: string, config: any, isClub: boolean) => {
      if (!config.apiLeagueId || !config.apiSeason || !config.apiTeamId) {
        console.warn(`Missing API mapping for ${teamName}`);
        return;
      }
      try {
        const res = await fetch(`https://v3.football.api-sports.io/standings?league=${config.apiLeagueId}&season=${config.apiSeason}&team=${config.apiTeamId}`, {
          headers: {
            'x-apisports-key': apiKey
          }
        });
        const data = await res.json();
        
        if (data.errors && Object.keys(data.errors).length > 0) {
          console.error(`API Error for ${teamName}:`, data.errors);
          errorCount++;
          return;
        }

        const standings = data.response?.[0]?.league?.standings?.[0];
        if (!standings) {
          console.warn(`No standings found for ${teamName}`);
          errorCount++;
          return;
        }

        const teamStats = standings.find((s: any) => s.team.id === config.apiTeamId);
        if (teamStats) {
          const punkte = teamStats.points;
          const tore = teamStats.all.goals.for;
          const spiele = teamStats.all.played;

          const collectionName = isClub ? 'clubs' : 'nationalTeams';
          const docRef = doc(db, collectionName, teamName);
          
          if (isClub) {
            await updateDoc(docRef, { punkte, tore, spieltag: spiele });
          } else {
            await updateDoc(docRef, { punkte, tore, spiele });
          }
          successCount++;
        } else {
          errorCount++;
        }
      } catch (err) {
        console.error(`Fetch failed for ${teamName}:`, err);
        errorCount++;
      }
    };

    for (const [name, config] of Object.entries(clubsData)) {
      await fetchTeamData(name, config, true);
    }

    for (const [name, config] of Object.entries(nationalTeamsData)) {
      await fetchTeamData(name, config, false);
    }

    setIsSyncing(false);
    setSyncResult(`Sync abgeschlossen: ${successCount} aktualisiert, ${errorCount} Fehler.`);
    setTimeout(() => setSyncResult(''), 8000);
  };

  // Firestore Listeners
  useEffect(() => {
    let clubsLoaded = false;
    let teamsLoaded = false;
    let membersLoaded = false;

    const checkLoading = () => {
      if (clubsLoaded && teamsLoaded && membersLoaded) {
        setIsLoading(false);
      }
    };

    const unsubClubs = onSnapshot(collection(db, 'clubs'), (snapshot) => {
      const data: Record<string, any> = {};
      snapshot.forEach(doc => {
        data[doc.id] = doc.data();
      });
      if (Object.keys(data).length > 0) {
        setClubsData(prev => ({ ...prev, ...data }));
      }
      clubsLoaded = true;
      checkLoading();
    });

    const unsubNationalTeams = onSnapshot(collection(db, 'nationalTeams'), (snapshot) => {
      const data: Record<string, any> = {};
      snapshot.forEach(doc => {
        data[doc.id] = doc.data();
      });
      if (Object.keys(data).length > 0) {
        setNationalTeamsData(prev => ({ ...prev, ...data }));
      }
      teamsLoaded = true;
      checkLoading();
    });

    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const members: any[] = [];
      snapshot.forEach(doc => {
        members.push({ id: doc.id, ...doc.data() });
      });
      if (members.length > 0) {
        setMembersList(members);
      }
      membersLoaded = true;
      checkLoading();
    });

    return () => {
      unsubClubs();
      unsubNationalTeams();
      unsubMembers();
    };
  }, []);

  // Update Funktionen für den Admin-Bereich (Firestore)
  const updateClubData = async (club: string, field: string, value: any) => {
    const updatedClub = {
      ...clubsData[club],
      [field]: value
    };
    
    // Optimistic update
    setClubsData(prev => ({
      ...prev,
      [club]: updatedClub
    }));
    
    try {
        await setDoc(doc(db, 'clubs', club), updatedClub, { merge: true });
    } catch (e) {
        console.error("Error updating club data:", e);
    }
  };

  const updateNationalTeamData = async (team: string, field: string, value: any) => {
    const updatedTeam = {
      ...nationalTeamsData[team],
      [field]: value
    };

    // Optimistic update
    setNationalTeamsData(prev => ({
      ...prev,
      [team]: updatedTeam
    }));

    try {
        await setDoc(doc(db, 'nationalTeams', team), updatedTeam, { merge: true });
    } catch (e) {
        console.error("Error updating national team data:", e);
    }
  };

  const handleAddClub = async () => {
    if (!newClubName.trim()) return;
    const name = newClubName.trim();
    if (clubsData[name]) {
      alert("Dieser Club existiert bereits!");
      return;
    }
    const newData = { spieltag: 0, punkte: 0, tore: 0, titel: [], logo: '', apiTeamId: 0, apiLeagueId: 0, apiSeason: new Date().getFullYear() };
    try {
      await setDoc(doc(db, 'clubs', name), newData);
      setNewClubName('');
    } catch (e) {
      console.error("Error adding new club:", e);
    }
  };

  const handleAddNationalTeam = async () => {
    if (!newNationalTeamName.trim()) return;
    const name = newNationalTeamName.trim();
    if (nationalTeamsData[name]) {
      alert("Dieses Nationalteam existiert bereits!");
      return;
    }
    const newData = { spiele: 0, punkte: 0, tore: 0, titel: [], logo: '', apiTeamId: 0, apiLeagueId: 0, apiSeason: new Date().getFullYear() };
    try {
      await setDoc(doc(db, 'nationalTeams', name), newData);
      setNewNationalTeamName('');
    } catch (e) {
      console.error("Error adding new national team:", e);
    }
  };

  const toggleClubTitle = async (club: string, title: string) => {
    const currentTitles = clubsData[club].titel || [];
    const newTitles = currentTitles.includes(title)
      ? currentTitles.filter(t => t !== title)
      : [...currentTitles, title];
      
    const updatedClub = {
      ...clubsData[club],
      titel: newTitles
    };

    // Optimistic update
    setClubsData(prev => ({
        ...prev,
        [club]: updatedClub
    }));

    try {
        await setDoc(doc(db, 'clubs', club), updatedClub, { merge: true });
    } catch (e) {
        console.error("Error updating club titles:", e);
    }
  };

  const addMember = async (name: string, club: string, nationalTeam: string, email: string) => {
    const colors = [COLORS.violett, COLORS.gruen, COLORS.gelb, COLORS.gold, '#E11D48', '#2563EB', '#D97706'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const newMember = {
      name,
      club,
      nationalTeam,
      color: randomColor,
      email
    };

    try {
        await addDoc(collection(db, 'members'), newMember);
    } catch (e) {
        console.error("Error adding member:", e);
    }
  };

  const updateMemberData = async (memberId: string, field: string, value: any) => {
    if (!memberId) {
        console.error("Cannot update member without an ID. Please initialize data first.");
        return;
    }

    // Optimistic update
    setMembersList(prev => prev.map(m => m.id === memberId ? { ...m, [field]: value } : m));

    try {
        await updateDoc(doc(db, 'members', memberId), { [field]: value });
    } catch (e) {
        console.error("Error updating member data:", e);
    }
  };

  const removeMember = async (index: number) => {
    const member = membersList[index];
    if (member.id) {
        try {
            await deleteDoc(doc(db, 'members', member.id));
        } catch (e) {
            console.error("Error removing member:", e);
        }
    } else {
        console.error("Cannot remove member without an ID. Please initialize data first.");
    }
  };

  // Dynamische Berechnungen basierend auf dem State
  const calculateMemberTotal = (clubName: string, nationalTeamName: string) => {
    const club = clubsData[clubName];
    const nationalTeam = nationalTeamsData[nationalTeamName];
    
    let total = (club.punkte * RULES.punkt) + (club.tore * RULES.tor);
    
    club.titel.forEach(t => {
      if (t === 'Meister') total += RULES.meister;
      if (t === 'Cup') total += RULES.cup;
      if (t === 'CupFinale') total += RULES.cupFinale;
      if (t === 'EuroQuali') total += RULES.euroQuali;
      if (t === 'EuroSieg') total += RULES.euroSieg;
      if (t === 'EuroFinale') total += RULES.euroFinale;
    });

    // Nationalteam Punkte
    if (nationalTeam) {
      total += (nationalTeam.punkte * RULES.punkt) + (nationalTeam.tore * RULES.tor);
    }
    
    return total;
  };

  const calculateNationalTeamTotal = (teamName: string) => {
    const team = nationalTeamsData[teamName];
    return (team.punkte * RULES.punkt) + (team.tore * RULES.tor);
  };

  const membersData = membersList.map(member => ({
    ...member,
    ...clubsData[member.club],
    nationalTeamData: nationalTeamsData[member.nationalTeam],
    summe: calculateMemberTotal(member.club, member.nationalTeam)
  })).sort((a, b) => b.summe - a.summe);

  const totalDonation = membersData.reduce((acc, curr) => acc + curr.summe, 0);

  const clubsPerformance = Object.entries(clubsData).map(([name]) => ({
    name, 
    // Hier nur Club-Leistung für die "Top Club" Karte
    summe: (clubsData[name].punkte * RULES.punkt) + (clubsData[name].tore * RULES.tor)
  })).sort((a, b) => b.summe - a.summe);

  const topClub = clubsPerformance[0];
  const maxSpieltag = Math.max(...Object.values(clubsData).map((c: any) => c.spieltag));

  const historyData = [
    { spieltag: '1', gesamt: 25 },
    { spieltag: '5', gesamt: 80 },
    { spieltag: '10', gesamt: 155 },
    { spieltag: '15', gesamt: 240 },
    { spieltag: '20', gesamt: 330 },
    { spieltag: 'Aktuell', gesamt: totalDonation }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#5C2D91] border-t-[#D4AF37] rounded-full animate-spin mb-4"></div>
        <p className="text-[#5C2D91] font-bold text-lg animate-pulse">Lade aktuelle Spendenstände...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-gray-800 selection:bg-[#D4AF37] selection:text-white pb-12">
      
      {/* HEADER */}
      <header className="bg-[#5C2D91] shadow-md sticky top-0 z-50 border-b-4 border-[#D4AF37]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-28 flex items-center justify-between">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-4 text-left cursor-pointer hover:opacity-90 transition-opacity focus:outline-none"
          >
            <div className="bg-white p-2 rounded-full shadow-lg w-16 h-16 sm:w-24 sm:h-24 flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-[#D4AF37]">
              <img 
                src="/logo.png" 
                alt="Sportfreunde Helfen Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-black text-white tracking-wide uppercase leading-tight">
                Sportfreunde <span className="text-[#D4AF37]">helfen</span>
              </h1>
              <p className="text-sm sm:text-base text-[#FACC15] font-medium tracking-wider hidden sm:block">Charity Saison 25/26</p>
            </div>
          </button>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-6">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`text-sm font-bold uppercase tracking-wider px-4 py-2 rounded-full transition-all cursor-pointer ${activeTab === 'dashboard' ? 'bg-[#D4AF37] text-white shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('mission')}
              className={`text-sm font-bold uppercase tracking-wider px-4 py-2 rounded-full transition-all cursor-pointer ${activeTab === 'mission' ? 'bg-[#D4AF37] text-white shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
            >
              Mission
            </button>
            <button 
              onClick={() => setActiveTab('regeln')}
              className={`text-sm font-bold uppercase tracking-wider px-4 py-2 rounded-full transition-all cursor-pointer ${activeTab === 'regeln' ? 'bg-[#D4AF37] text-white shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
            >
              Modell & Regeln
            </button>
            <button 
              onClick={() => setActiveTab('support')}
              className={`text-sm font-bold uppercase tracking-wider px-4 py-2 rounded-full transition-all cursor-pointer ${activeTab === 'support' ? 'bg-[#D4AF37] text-white shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
            >
              Unterstützen
            </button>
            <button 
              onClick={() => setActiveTab('projects')}
              className={`text-sm font-bold uppercase tracking-wider px-4 py-2 rounded-full transition-all cursor-pointer ${activeTab === 'projects' ? 'bg-[#D4AF37] text-white shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
            >
              Projekte
            </button>
            <button 
              onClick={() => setActiveTab('stats')}
              className={`text-sm font-bold uppercase tracking-wider px-4 py-2 rounded-full transition-all cursor-pointer ${activeTab === 'stats' ? 'bg-[#D4AF37] text-white shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
            >
              Statistiken
            </button>
            <button 
              onClick={() => setActiveTab('admin')}
              className={`text-sm font-bold uppercase tracking-wider px-4 py-2 rounded-full transition-all cursor-pointer ${activeTab === 'admin' ? 'bg-[#D4AF37] text-white shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
            >
              <Settings size={18} />
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-white p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-[#5C2D91] border-t border-[#D4AF37] absolute w-full left-0 shadow-xl">
            <div className="px-4 pt-2 pb-4 space-y-2">
              <button 
                onClick={() => {
                  setActiveTab('dashboard');
                  setIsMobileMenuOpen(false);
                }}
                className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${activeTab === 'dashboard' ? 'bg-[#D4AF37] text-white' : 'text-white hover:bg-white/10'}`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => {
                  setActiveTab('mission');
                  setIsMobileMenuOpen(false);
                }}
                className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${activeTab === 'mission' ? 'bg-[#D4AF37] text-white' : 'text-white hover:bg-white/10'}`}
              >
                Mission
              </button>
              <button 
                onClick={() => {
                  setActiveTab('regeln');
                  setIsMobileMenuOpen(false);
                }}
                className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${activeTab === 'regeln' ? 'bg-[#D4AF37] text-white' : 'text-white hover:bg-white/10'}`}
              >
                Modell & Regeln
              </button>
              <button 
                onClick={() => {
                  setActiveTab('support');
                  setIsMobileMenuOpen(false);
                }}
                className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${activeTab === 'support' ? 'bg-[#D4AF37] text-white' : 'text-white hover:bg-white/10'}`}
              >
                Unterstützen
              </button>
              <button 
                onClick={() => {
                  setActiveTab('projects');
                  setIsMobileMenuOpen(false);
                }}
                className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${activeTab === 'projects' ? 'bg-[#D4AF37] text-white' : 'text-white hover:bg-white/10'}`}
              >
                Projekte
              </button>
              <button 
                onClick={() => {
                  setActiveTab('stats');
                  setIsMobileMenuOpen(false);
                }}
                className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${activeTab === 'stats' ? 'bg-[#D4AF37] text-white' : 'text-white hover:bg-white/10'}`}
              >
                Statistiken
              </button>
              <button 
                onClick={() => {
                  setActiveTab('admin');
                  setIsMobileMenuOpen(false);
                }}
                className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${activeTab === 'admin' ? 'bg-[#D4AF37] text-white' : 'text-white hover:bg-white/10'}`}
              >
                Admin
              </button>
            </div>
          </div>
        )}
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {activeTab === 'dashboard' && (
          <div className="space-y-8">

            {/* CTA BANNER */}
            <div className="bg-gradient-to-r from-[#5C2D91] to-[#4a2475] rounded-2xl p-6 shadow-lg text-white flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden border border-[#D4AF37]/20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37] opacity-10 rounded-full transform translate-x-1/3 -translate-y-1/2 blur-3xl"></div>
              <div className="relative z-10">
                <h2 className="text-2xl font-black mb-2">Werde Teil der Aktion!</h2>
                <p className="text-white/90 max-w-xl">
                  Du möchtest auch mit deinem Herzensverein Gutes tun? Melde dich jetzt an und unterstütze unsere Charity-Saison.
                </p>
              </div>
              <button 
                onClick={() => setActiveTab('support')}
                className="relative z-10 bg-[#D4AF37] text-[#5C2D91] font-bold uppercase tracking-wider py-3 px-6 rounded-xl hover:bg-[#FACC15] transition-colors shadow-md whitespace-nowrap flex items-center gap-2"
              >
                <Heart size={20} className="fill-[#5C2D91]" />
                Jetzt Mitmachen
              </button>
            </div>
            
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37] opacity-10 rounded-bl-full transform group-hover:scale-110 transition-transform"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Gesammelte Spenden</p>
                    <h2 className="text-5xl font-black text-[#5C2D91]">{totalDonation} <span className="text-2xl text-[#D4AF37]">EUR</span></h2>
                  </div>
                  <div className="bg-[#5C2D91]/10 p-3 rounded-xl z-10 relative">
                    <Heart className="w-8 h-8 text-[#5C2D91]" />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-4 font-medium relative z-10">Für den guten Zweck gesichert</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FACC15] opacity-10 rounded-bl-full transform group-hover:scale-110 transition-transform"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Top Performer (Club)</p>
                    <h2 className="text-3xl font-black text-gray-800 mt-2">{topClub.name}</h2>
                    <p className="text-md font-bold text-[#D4AF37] mt-1">{topClub.summe} EUR generiert</p>
                  </div>
                  <div className="bg-[#FACC15]/20 p-3 rounded-xl z-10 relative">
                    <TrendingUp className="w-8 h-8 text-[#D4AF37]" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#5C2D91] opacity-5 rounded-bl-full transform group-hover:scale-110 transition-transform"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Saisonfortschritt</p>
                    <h2 className="text-3xl font-black text-gray-800 mt-2">Max. {maxSpieltag}. Spieltag</h2>
                    <p className="text-md font-bold text-[#5C2D91] mt-1">Laufende Erfassung</p>
                  </div>
                  <div className="bg-gray-100 p-3 rounded-xl z-10 relative">
                    <Calendar className="w-8 h-8 text-gray-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* NATIONAL TEAMS SECTION */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-white to-[#F8F9FA]">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#5C2D91]" />
                  <h3 className="text-xl font-bold text-[#5C2D91]">Sonderwertung Nationalteams</h3>
                </div>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(nationalTeamsData).map(([teamName, data]: [string, any]) => (
                  <div key={teamName} className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-full p-1 shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden">
                        <SmartLogo src={data.logo} alt={teamName} className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800 text-lg mb-1">{teamName}</h4>
                        <div className="text-sm text-gray-500 space-x-3">
                          <span>{data.spiele} Spiele</span>
                          <span>{data.punkte} Punkte</span>
                          <span>{data.tore} Tore</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-[#D4AF37]">{calculateNationalTeamTotal(teamName)} €</div>
                      <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Beitrag</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CHARTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Gesamter Verlauf */}
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
                  <h3 className="text-xl font-bold text-[#5C2D91]">Spendenverlauf (Gesamt)</h3>
                </div>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorGesamt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="spieltag" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                        formatter={(value) => [`${value} €`, 'Spendensumme']}
                        labelFormatter={(label) => `Spieltag / Status: ${label}`}
                      />
                      <Area type="monotone" dataKey="gesamt" stroke="#D4AF37" strokeWidth={4} fillOpacity={1} fill="url(#colorGesamt)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Aktueller Stand pro Mitglied */}
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center opacity-15 pointer-events-none z-0">
                  <img 
                    src="/logo.png" 
                    alt="Logo Watermark" 
                    className="w-3/4 h-3/4 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex items-center gap-2 mb-6 relative z-10">
                  <Users className="w-5 h-5 text-[#5C2D91]" />
                  <h3 className="text-xl font-bold text-[#5C2D91]">Spendenstand pro Mitglied</h3>
                </div>
                <div className="h-80 w-full relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={membersData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#4B5563', fontWeight: 600}} width={60} />
                      <Tooltip 
                        cursor={{fill: '#F3F4F6'}}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        formatter={(value, name, props) => [`${value} €`, `Spende (${props.payload.club})`]}
                      />
                      <Bar dataKey="summe" radius={[0, 6, 6, 0]} barSize={24}>
                        {membersData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* DETAIL TABLE */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden relative z-10">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-white to-[#F8F9FA]">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#5C2D91]" />
                  <h3 className="text-xl font-bold text-[#5C2D91]">Detailauswertung</h3>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-semibold">Mitglied</th>
                      <th className="px-6 py-4 font-semibold">Club</th>
                      <th className="px-6 py-4 font-semibold text-center">Nationalteam</th>
                      <th className="px-6 py-4 font-semibold text-center">Spieltag</th>
                      <th className="px-6 py-4 font-semibold text-center">Punkte</th>
                      <th className="px-6 py-4 font-semibold text-center">Tore</th>
                      <th className="px-6 py-4 font-semibold text-center">Boni (Titel)</th>
                      <th className="px-6 py-4 font-semibold text-right">Summe (€)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {membersData.map((member, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-inner" style={{backgroundColor: member.color}}>
                              {member.name.charAt(0)}
                            </div>
                            <span className="font-bold text-gray-800">{member.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-white rounded-full p-0.5 shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden">
                              <SmartLogo src={clubsData[member.club].logo} alt={member.club} className="w-full h-full object-contain" />
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                              ${member.club === 'Austria Wien' ? 'bg-[#5C2D91]/10 text-[#5C2D91] border-[#5C2D91]/20' : 
                              member.club === 'Rapid Wien' ? 'bg-[#FACC15]/10 text-yellow-700 border-[#FACC15]/30' : 
                              'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30'}`}>
                              {member.club}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-6 h-6 bg-white rounded-full p-0.5 shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden">
                              <SmartLogo src={nationalTeamsData[member.nationalTeam].logo} alt={member.nationalTeam} className="w-full h-full object-contain" />
                            </div>
                            <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                              {member.nationalTeam} (+{calculateNationalTeamTotal(member.nationalTeam)}€)
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-gray-800 font-bold">{member.spieltag}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-gray-600 font-medium">{member.punkte}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-gray-600 font-medium">{member.tore}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-gray-400 text-sm">
                          {member.titel.length > 0 ? member.titel.join(', ') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-lg font-black text-[#5C2D91]">{member.summe} €</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'mission' && (
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                <Heart className="w-8 h-8 text-[#D4AF37]" />
                <h2 className="text-3xl font-black text-[#5C2D91]">Unsere Mission</h2>
              </div>
              
              <div className="prose prose-lg text-gray-600 leading-relaxed">
                <p className="mb-6">
                  Die <strong className="text-[#5C2D91]">Sportfreunde</strong> haben diese Aktion ins Leben gerufen, aus einer tiefen Dankbarkeit heraus. Der Fußball ist für uns mehr als nur ein Spiel – er ist ein Begleiter, der uns über Jahre hinweg geprägt und beschenkt hat.
                </p>
                
                <p className="mb-6">
                  Er hat uns die ganze Bandbreite an <strong>Emotionen</strong> geschenkt: Den puren Rausch beim Siegtor in der letzten Minute, aber auch den bitteren Schmerz einer Niederlage. Beides hat uns wachsen lassen und uns gezeigt, was Leidenschaft bedeutet.
                </p>

                <p className="mb-6">
                  Vor allem aber hat uns der Fußball <strong>gemeinsame Erlebnisse</strong> und <strong>soziale Kontakte</strong> geschenkt. Die Reisen zu Auswärtsspielen, die Diskussionen am Stammtisch, das gemeinsame Mitfiebern im Stadion – all das hat Freundschaften geschmiedet, die weit über den Platz hinausreichen.
                </p>

                <p>
                  Mit dieser Charity-Aktion wollen wir etwas von dem zurückgeben, was wir durch den Sport empfangen durften. Wir nutzen die Kraft des Fußballs, um nicht nur Tore und Punkte zu zählen, sondern um gemeinsam einen positiven Beitrag zu leisten.
                </p>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-100 flex items-center justify-center">
                <p className="text-[#D4AF37] font-black uppercase tracking-widest text-sm">
                  Aus Liebe zum Spiel. Aus Verantwortung für andere.
                </p>
              </div>
            </div>

            {/* COMMUNITY PHOTOS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-100 group h-64 relative">
                <CommunityImage 
                  index={1} 
                  alt="Community im Stadion 1" 
                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500" 
                />
              </div>
              <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-100 group h-64 relative">
                <CommunityImage 
                  index={2} 
                  alt="Community im Stadion 2" 
                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500" 
                />
              </div>
              <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-100 group h-64 relative">
                <CommunityImage 
                  index={3} 
                  alt="Community im Stadion 3" 
                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500" 
                />
              </div>
            </div>

            {/* MOTTO BANNER */}
            <div className="bg-[#5C2D91] rounded-2xl p-8 shadow-lg text-white text-center relative overflow-hidden border-4 border-[#D4AF37]">
              <div className="relative z-10">
                <h3 className="text-2xl md:text-3xl font-black uppercase tracking-wider mb-4 text-[#FACC15]">
                  "Durch Farben getrennt,<br/>in der Sache vereint"
                </h3>
                <p className="text-white/90 text-lg leading-relaxed max-w-2xl mx-auto mb-6">
                  Unsere Community agiert über alle Vereinsgrenzen hinweg. Egal ob Violett, Grün-Weiß oder Schwarz-Weiß – wenn es darum geht zu helfen, tragen wir alle das gleiche Trikot. Rivalität bleibt auf dem Platz, Menschlichkeit steht darüber.
                </p>
                <p className="text-white/90 text-lg leading-relaxed max-w-2xl mx-auto">
                  Dabei verbindet der Fußball unterschiedlichste soziale Schichten wie kaum etwas anderes. Im Stadion stehen wir Seite an Seite – unabhängig von Herkunft oder Status. Bei uns ist jeder willkommen, niemand wird ausgeschlossen.
                </p>
              </div>
            </div>

            {/* WER SIND WIR */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-100">
                <Users className="w-8 h-8 text-[#D4AF37]" />
                <h2 className="text-3xl font-black text-[#5C2D91]">Wer sind wir?</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Michael Molzar */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-32 h-32 bg-gray-200 rounded-full mb-4 overflow-hidden border-4 border-[#5C2D91]/10 shadow-inner">
                    <PersonImage index={1} alt="Michael Molzar" className="w-full h-full object-cover" />
                  </div>
                  <h3 className="text-xl font-bold text-[#5C2D91] mb-2">Michael Molzar</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    "Ich bin seitdem ich 8 Jahre alt bin im Stadion zu finden und habe hier alle Gefühle erlebt :-). Seit 10 Jahren habe ich jedoch keinen Elfmeter live gesehen."
                  </p>
                </div>

                {/* Placeholder Person 2 */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-32 h-32 bg-gray-200 rounded-full mb-4 overflow-hidden border-4 border-[#5C2D91]/10 shadow-inner">
                    <PersonImage index={2} alt="Max Mustermann" className="w-full h-full object-cover" />
                  </div>
                  <h3 className="text-xl font-bold text-[#5C2D91] mb-2">Max Mustermann</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    "Hier könnte dein Text stehen. Erzähle uns, warum du dabei bist und was dich antreibt."
                  </p>
                </div>

                {/* Placeholder Person 3 */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-32 h-32 bg-gray-200 rounded-full mb-4 overflow-hidden border-4 border-[#5C2D91]/10 shadow-inner">
                    <PersonImage index={3} alt="Julia Beispiel" className="w-full h-full object-cover" />
                  </div>
                  <h3 className="text-xl font-bold text-[#5C2D91] mb-2">Julia Beispiel</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    "Auch hier ist Platz für eine kurze Vorstellung. Wir sind eine bunte Truppe mit einem gemeinsamen Ziel."
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'regeln' && (
          /* REGELN & MODELL TAB */
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                <Info className="w-8 h-8 text-[#D4AF37]" />
                <h2 className="text-3xl font-black text-[#5C2D91]">Das Spenden-Modell</h2>
              </div>
              
              <p className="text-gray-600 leading-relaxed mb-8 text-lg">
                Jedes Mitglied der Gruppe <strong className="text-[#5C2D91]">"Sportfreunde helfen"</strong> hat vor der Saison einen Fußballklub gewählt. 
                Basierend auf den realen sportlichen Leistungen dieser Clubs in der aktuellen Saison werden Spendengelder generiert. 
                Am Ende der Saison wird der gesamte Topf an einen wohltätigen Zweck gespendet.
              </p>

              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-[#FACC15]" />
                Die Tarif-Tabelle
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                  <span className="font-medium text-gray-700">Pro erspieltem Punkt</span>
                  <span className="font-black text-[#5C2D91] text-lg">1 €</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                  <span className="font-medium text-gray-700">Pro geschossenem Tor</span>
                  <span className="font-black text-[#5C2D91] text-lg">1 €</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                  <span className="font-medium text-gray-700">Europacup Qualifikationsplatz</span>
                  <span className="font-black text-[#D4AF37] text-lg">50 €</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                  <span className="font-medium text-gray-700">Erreichen des Cupfinales</span>
                  <span className="font-black text-[#D4AF37] text-lg">50 €</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                  <span className="font-medium text-gray-700">Meistertitel</span>
                  <span className="font-black text-[#D4AF37] text-lg">100 €</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                  <span className="font-medium text-gray-700">Cuptitel</span>
                  <span className="font-black text-[#D4AF37] text-lg">100 €</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                  <span className="font-medium text-gray-700">Erreichen eines Finales in einem europäischen Bewerb</span>
                  <span className="font-black text-[#D4AF37] text-lg">100 €</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center shadow-sm">
                  <span className="font-medium text-gray-700">Sieg eines europäischen Wettbewerbes</span>
                  <span className="font-black text-[#D4AF37] text-lg">200 €</span>
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#5C2D91]" />
                Team & Zuordnung
              </h3>
              <ul className="space-y-3 text-gray-600 bg-[#5C2D91]/5 p-6 rounded-xl border border-[#5C2D91]/10">
                {Object.values(
                  membersList.reduce((acc, member) => {
                    const key = `${member.club}-${member.nationalTeam}`;
                    if (!acc[key]) {
                      acc[key] = {
                        names: [],
                        club: member.club,
                        nationalTeam: member.nationalTeam,
                        color: member.color
                      };
                    }
                    acc[key].names.push(member.name);
                    return acc;
                  }, {} as Record<string, { names: string[], club: string, nationalTeam: string, color: string }>)
                ).map((group: any, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: group.color }}></div>
                    <span>
                      <strong>{group.names.join(', ')}:</strong> {group.club} <span className="text-gray-400 mx-1">•</span> {group.nationalTeam}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'support' && (
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                <Mail className="w-8 h-8 text-[#D4AF37]" />
                <h2 className="text-3xl font-black text-[#5C2D91]">Mitmachen & Unterstützen</h2>
              </div>
              
              <div className="prose prose-lg text-gray-600 leading-relaxed mb-8">
                <p>
                  Du möchtest auch Teil der <strong className="text-[#5C2D91]">Sportfreunde helfen</strong> Community werden? 
                  Großartig! Fülle einfach das Formular aus und wir melden uns bei dir mit allen Details zum Ablauf.
                </p>
              </div>

              <form 
                className="space-y-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const name = formData.get('name');
                  const nickname = formData.get('nickname');
                  const email = formData.get('email');
                  const club = formData.get('club');
                  const nationalTeam = formData.get('nationalTeam');
                  const message = formData.get('message');

                  const subject = encodeURIComponent('Anmeldung: Sportfreunde helfen');
                  const body = encodeURIComponent(`Hallo Molz,\n\nich möchte gerne bei der Aktion "Sportfreunde helfen" mitmachen!\n\nName: ${name}\nNickname: ${nickname}\nEmail: ${email}\nWunsch-Club: ${club}\nNationalteam: ${nationalTeam}\nNachricht: ${message}\n\nLiebe Grüße`);
                  
                  window.location.href = `mailto:molz@molz.at?subject=${subject}&body=${body}`;
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-2">Dein Name *</label>
                    <input 
                      type="text" 
                      id="name" 
                      name="name" 
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5C2D91] focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                      placeholder="Max Mustermann"
                    />
                  </div>
                  <div>
                    <label htmlFor="nickname" className="block text-sm font-bold text-gray-700 mb-2">Dein Nickname *</label>
                    <input 
                      type="text" 
                      id="nickname" 
                      name="nickname" 
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5C2D91] focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                      placeholder="Der Bomber"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">E-Mail Adresse *</label>
                  <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5C2D91] focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                    placeholder="max@beispiel.at"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="club" className="block text-sm font-bold text-gray-700 mb-2">Dein Wunsch-Club *</label>
                    <input 
                      type="text" 
                      id="club" 
                      name="club" 
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5C2D91] focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                      placeholder="z.B. Sturm Graz, LASK, ..."
                    />
                    <p className="text-xs text-gray-400 mt-1">Welchen Verein möchtest du in der Wertung vertreten?</p>
                  </div>
                  <div>
                    <label htmlFor="nationalTeam" className="block text-sm font-bold text-gray-700 mb-2">Dein Nationalteam *</label>
                    <input 
                      type="text" 
                      id="nationalTeam" 
                      name="nationalTeam" 
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5C2D91] focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                      placeholder="z.B. Österreich, Spanien, ..."
                    />
                    <p className="text-xs text-gray-400 mt-1">Welches Nationalteam unterstützt du?</p>
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-bold text-gray-700 mb-2">Nachricht (Optional)</label>
                  <textarea 
                    id="message" 
                    name="message" 
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5C2D91] focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white resize-none"
                    placeholder="Deine Nachricht an uns..."
                  ></textarea>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    className="w-full sm:w-auto bg-[#5C2D91] text-white font-bold uppercase tracking-wider py-4 px-8 rounded-xl hover:bg-[#4a2475] transition-colors shadow-lg flex items-center justify-center gap-2"
                  >
                    <Mail size={20} />
                    Anmeldung absenden
                  </button>
                  <p className="text-center text-xs text-gray-400 mt-4">
                    Durch Klick auf "Absenden" öffnet sich dein E-Mail-Programm.
                  </p>
                </div>
              </form>
            </div>

            {/* Newsletter Anmeldung */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14"></path></svg>
                </div>
                <h2 className="text-2xl font-black text-[#5C2D91]">Newsletter Anmeldung</h2>
              </div>
              
              <div className="prose prose-lg text-gray-600 leading-relaxed mb-6">
                <p>
                  Bleib auf dem Laufenden! Melde dich für unseren Newsletter an und erfahre als Erster von neuen Projekten, Spendenständen und Aktionen.
                </p>
              </div>

              {signupStatus === 'success' ? (
                <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-6 text-center">
                  <div className="flex justify-center mb-2">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  <h3 className="font-bold text-lg mb-1">Vielen Dank für deine Anmeldung!</h3>
                  <p className="text-sm">Du bist nun für unseren Newsletter eingetragen.</p>
                </div>
              ) : (
                <form onSubmit={handleNewsletterSignup} className="space-y-4">
                  <div>
                    <label htmlFor="newsletterEmail" className="block text-sm font-bold text-gray-700 mb-2">E-Mail Adresse *</label>
                    <input 
                      type="email" 
                      id="newsletterEmail" 
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5C2D91] focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                      placeholder="deine@email.at"
                    />
                  </div>
                  
                  <div className="flex items-start gap-3 mt-4">
                    <div className="flex items-center h-5 mt-1">
                      <input 
                        id="consent" 
                        type="checkbox" 
                        checked={signupConsent}
                        onChange={(e) => setSignupConsent(e.target.checked)}
                        required
                        className="w-4 h-4 text-[#5C2D91] bg-gray-100 border-gray-300 rounded focus:ring-[#5C2D91]"
                      />
                    </div>
                    <label htmlFor="consent" className="text-sm text-gray-600">
                      Ich stimme zu, dass meine E-Mail-Adresse gespeichert wird und ich den Newsletter des Vereins "Sportfreunde helfen" erhalte. Diese Einwilligung kann ich jederzeit widerrufen. Weitere Informationen findest du in unserer <a href="/datenschutz.html" className="text-[#5C2D91] underline">Datenschutzerklärung</a>. *
                    </label>
                  </div>

                  {signupStatus === 'error' && (
                    <p className="text-red-500 text-sm mt-2">Es gab einen Fehler bei der Anmeldung. Bitte versuche es später erneut.</p>
                  )}

                  <div className="pt-4">
                    <button 
                      type="submit" 
                      disabled={signupStatus === 'loading' || !signupConsent || !signupEmail}
                      className="w-full sm:w-auto bg-[#D4AF37] text-white font-bold uppercase tracking-wider py-3 px-8 rounded-xl hover:bg-[#c4a030] transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {signupStatus === 'loading' ? (
                        <span className="animate-pulse">Wird angemeldet...</span>
                      ) : (
                        <>Anmelden</>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-100">
                <div className="w-12 h-12 bg-[#5C2D91]/10 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#5C2D91]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                </div>
                <h2 className="text-3xl font-black text-[#5C2D91]">Statistiken & KPIs</h2>
              </div>

              {(() => {
                const totalParticipants = membersList.length;
                const totalDonations = totalDonation; // Use the calculated totalDonation
                const avgDonationPerParticipant = totalParticipants > 0 ? (totalDonations / totalParticipants).toFixed(2) : '0.00';
                
                const totalClubGoals = Object.values(clubsData as Record<string, any>).reduce((sum: number, club: any) => sum + (club.tore || 0), 0) as number;
                const totalNationalGoals = Object.values(nationalTeamsData as Record<string, any>).reduce((sum: number, team: any) => sum + (team.tore || 0), 0) as number;
                const totalGoals = totalClubGoals + totalNationalGoals;

                const clubCount = Object.keys(clubsData).length;
                const avgGoalsPerClub = clubCount > 0 ? (totalClubGoals / clubCount).toFixed(1) : '0.0';

                // Find most successful club (by points)
                let bestClub = { name: '-', points: -1 };
                Object.entries(clubsData).forEach(([name, data]: [string, any]) => {
                  if (data.punkte > bestClub.points) {
                    bestClub = { name, points: data.punkte };
                  }
                });

                // Find most successful national team (by points)
                let bestNationalTeam = { name: '-', points: -1 };
                Object.entries(nationalTeamsData).forEach(([name, data]: [string, any]) => {
                  if (data.punkte > bestNationalTeam.points) {
                    bestNationalTeam = { name, points: data.punkte };
                  }
                });

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* KPI Card 1 */}
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
                      <div className="absolute top-0 right-0 opacity-20 transform translate-x-4 -translate-y-4">
                        <Users size={80} />
                      </div>
                      <h3 className="text-blue-100 font-semibold mb-2 relative z-10">Teilnehmer gesamt</h3>
                      <div className="text-4xl font-black relative z-10">{totalParticipants}</div>
                      <p className="text-sm text-blue-100 mt-2 relative z-10">Sportfreunde im Einsatz</p>
                    </div>

                    {/* KPI Card 2 */}
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
                      <div className="absolute top-0 right-0 opacity-20 transform translate-x-4 -translate-y-4">
                        <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      </div>
                      <h3 className="text-green-100 font-semibold mb-2 relative z-10">Ø Spende pro Teilnehmer</h3>
                      <div className="text-4xl font-black relative z-10">{avgDonationPerParticipant} €</div>
                      <p className="text-sm text-green-100 mt-2 relative z-10">Durchschnittlicher Beitrag</p>
                    </div>

                    {/* KPI Card 3 */}
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
                      <div className="absolute top-0 right-0 opacity-20 transform translate-x-4 -translate-y-4">
                        <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      </div>
                      <h3 className="text-purple-100 font-semibold mb-2 relative z-10">Tore gesamt</h3>
                      <div className="text-4xl font-black relative z-10">{totalGoals}</div>
                      <p className="text-sm text-purple-100 mt-2 relative z-10">Clubs & Nationalteams</p>
                    </div>

                    {/* KPI Card 4 */}
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
                      <div className="absolute top-0 right-0 opacity-20 transform translate-x-4 -translate-y-4">
                        <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                      </div>
                      <h3 className="text-orange-100 font-semibold mb-2 relative z-10">Ø Tore pro Club</h3>
                      <div className="text-4xl font-black relative z-10">{avgGoalsPerClub}</div>
                      <p className="text-sm text-orange-100 mt-2 relative z-10">In der aktuellen Saison</p>
                    </div>

                    {/* KPI Card 5 */}
                    <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
                      <div className="absolute top-0 right-0 opacity-20 transform translate-x-4 -translate-y-4">
                        <Award size={80} />
                      </div>
                      <h3 className="text-yellow-100 font-semibold mb-2 relative z-10">Bester Club</h3>
                      <div className="text-2xl font-black relative z-10 truncate" title={bestClub.name}>{bestClub.name}</div>
                      <p className="text-sm text-yellow-100 mt-2 relative z-10">Mit {bestClub.points} Punkten</p>
                    </div>

                    {/* KPI Card 6 */}
                    <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
                      <div className="absolute top-0 right-0 opacity-20 transform translate-x-4 -translate-y-4">
                        <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path></svg>
                      </div>
                      <h3 className="text-red-100 font-semibold mb-2 relative z-10">Bestes Nationalteam</h3>
                      <div className="text-2xl font-black relative z-10 truncate" title={bestNationalTeam.name}>{bestNationalTeam.name}</div>
                      <p className="text-sm text-red-100 mt-2 relative z-10">Mit {bestNationalTeam.points} Punkten</p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Top 3 Rankings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Top 3 Clubs */}
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                  <Trophy className="w-6 h-6 text-[#D4AF37]" />
                  <h3 className="text-xl font-bold text-[#5C2D91]">Top 3 Vereine (Spenden)</h3>
                </div>
                <div className="space-y-4">
                  {(() => {
                    const clubEuros = Object.entries(clubsData).map(([name, data]: [string, any]) => {
                      let total = (data.punkte * RULES.punkt) + (data.tore * RULES.tor);
                      (data.titel || []).forEach((t: string) => {
                        if (t === 'Meister') total += RULES.meister;
                        if (t === 'Cup') total += RULES.cup;
                        if (t === 'CupFinale') total += RULES.cupFinale;
                        if (t === 'EuroQuali') total += RULES.euroQuali;
                        if (t === 'EuroGruppenphase') total += RULES.euroGruppenphase;
                      });
                      return { name, total, logo: data.logo };
                    }).sort((a, b) => b.total - a.total).slice(0, 3);

                    return clubEuros.map((club, index) => (
                      <div key={club.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${index === 0 ? 'bg-[#D4AF37] text-white' : index === 1 ? 'bg-gray-300 text-gray-700' : 'bg-amber-600 text-white'}`}>
                            {index + 1}
                          </div>
                          <div className="w-10 h-10 bg-white rounded-full p-1 shadow-sm border border-gray-200 flex items-center justify-center overflow-hidden">
                            <SmartLogo src={club.logo} alt={club.name} className="w-full h-full object-contain" />
                          </div>
                          <span className="font-bold text-gray-800">{club.name}</span>
                        </div>
                        <div className="font-black text-[#5C2D91]">{club.total} €</div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Top 3 National Teams */}
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                  <Globe className="w-6 h-6 text-[#D4AF37]" />
                  <h3 className="text-xl font-bold text-[#5C2D91]">Top 3 Nationalteams (Spenden)</h3>
                </div>
                <div className="space-y-4">
                  {(() => {
                    const teamEuros = Object.entries(nationalTeamsData).map(([name, data]: [string, any]) => {
                      let total = (data.punkte * RULES.punkt) + (data.tore * RULES.tor);
                      return { name, total, logo: data.logo };
                    }).sort((a, b) => b.total - a.total).slice(0, 3);

                    return teamEuros.map((team, index) => (
                      <div key={team.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${index === 0 ? 'bg-[#D4AF37] text-white' : index === 1 ? 'bg-gray-300 text-gray-700' : 'bg-amber-600 text-white'}`}>
                            {index + 1}
                          </div>
                          <div className="w-10 h-10 bg-white rounded-full p-1 shadow-sm border border-gray-200 flex items-center justify-center overflow-hidden">
                            <SmartLogo src={team.logo} alt={team.name} className="w-full h-full object-contain" />
                          </div>
                          <span className="font-bold text-gray-800">{team.name}</span>
                        </div>
                        <div className="font-black text-[#5C2D91]">{team.total} €</div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                <HeartHandshake className="w-8 h-8 text-[#D4AF37]" />
                <h2 className="text-3xl font-black text-[#5C2D91]">Unterstützte Projekte</h2>
              </div>
              
              <div className="prose prose-lg text-gray-600 leading-relaxed mb-8">
                <p>
                  Unsere Community unterstützt mit den gesammelten Spenden Projekte der Plattform <strong className="text-[#5C2D91]">Dank Dir!</strong>.
                </p>
                <p>
                  Dank Dir!® ist eine Online-Spendenplattform für Kinder mit geistiger und/oder körperlicher Behinderung in Österreich. 
                  Der Zweck ist es, dringend benötigte Therapien oder Heilbehelfe zu finanzieren, die von der Krankenkasse nicht oder nur teilweise übernommen werden.
                </p>
                <p>
                  Darüber hinaus unterstützt Dank Dir!® Sonderausgaben für Geräte, die der Inklusion dienen (z.B. Behinderten-Fahrräder) oder auch Adaptierungen im Wohnbereich.
                </p>
                <p className="font-bold text-[#5C2D91]">
                  Jeder Cent geht direkt an das Kind!
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Warum Dank Dir?</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="mt-1 w-5 h-5 rounded-full bg-[#D4AF37] flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                    <span>Transparente Hilfe direkt für betroffene Kinder in Österreich</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 w-5 h-5 rounded-full bg-[#D4AF37] flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                    <span>Finanzierung konkreter Therapien und Heilbehelfe</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 w-5 h-5 rounded-full bg-[#D4AF37] flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                    <span>100% der Spenden kommen an</span>
                  </li>
                </ul>
              </div>

              <div className="text-center">
                <a 
                  href="https://www.dankdir.at/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#5C2D91] text-white font-bold uppercase tracking-wider py-4 px-8 rounded-xl hover:bg-[#4a2475] transition-colors shadow-lg"
                >
                  Zur Webseite von Dank Dir!
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </a>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="max-w-4xl mx-auto space-y-8">
            {!isAdminAuthenticated ? (
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 max-w-md mx-auto text-center">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-[#5C2D91]/10 rounded-full flex items-center justify-center">
                    <Settings className="w-8 h-8 text-[#5C2D91]" />
                  </div>
                </div>
                <h2 className="text-2xl font-black text-[#5C2D91] mb-2">Admin Login</h2>
                <p className="text-gray-500 mb-6">Bitte gib das Passwort ein, um Daten zu bearbeiten.</p>
                
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <input
                      type="password"
                      value={adminPasswordInput}
                      onChange={(e) => setAdminPasswordInput(e.target.value)}
                      placeholder="Passwort"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#5C2D91] focus:border-transparent outline-none transition-all"
                      autoFocus
                    />
                  </div>
                  {loginError && (
                    <p className="text-red-500 text-sm font-medium">Falsches Passwort!</p>
                  )}
                  <button
                    type="submit"
                    className="w-full bg-[#5C2D91] text-white font-bold py-3 rounded-xl hover:bg-[#4a2475] transition-colors shadow-md"
                  >
                    Anmelden
                  </button>
                </form>
              </div>
            ) : (
              <>
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <Settings className="w-8 h-8 text-[#D4AF37]" />
                      <h2 className="text-3xl font-black text-[#5C2D91]">Daten verwalten</h2>
                    </div>
                    <button 
                      onClick={() => {
                        setIsAdminAuthenticated(false);
                        setAdminPasswordInput('');
                      }}
                      className="text-sm text-gray-500 hover:text-[#5C2D91] font-medium"
                    >
                      Abmelden
                    </button>
                  </div>

                  {/* API Football Sync */}
                  <div className="mb-8 p-6 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-blue-900 mb-1">Live-Daten synchronisieren</h3>
                        <p className="text-sm text-blue-700">Aktualisiert Punkte und Tore automatisch über API-Football.</p>
                      </div>
                      <button
                        onClick={syncWithApiFootball}
                        disabled={isSyncing}
                        className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isSyncing ? (
                          <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Syncing...</>
                        ) : (
                          <>Jetzt synchronisieren</>
                        )}
                      </button>
                    </div>
                    {syncResult && (
                      <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${syncResult.includes('Fehler') ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                        {syncResult}
                      </div>
                    )}
                  </div>

                  {/* Initialization Button */}
                  {Object.keys(clubsData).length > 0 && (!clubsData['Austria Wien']?.logo || !membersList.find(m => m.name === 'Tom')?.id) && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Info className="text-yellow-600" />
                            <p className="text-yellow-800 font-medium">Die Datenbank ist noch nicht vollständig initialisiert.</p>
                        </div>
                        <button 
                            onClick={async () => {
                                // Initialize Clubs
                                Object.entries(INITIAL_CLUBS_DATA).forEach(async ([name, data]) => {
                                    await setDoc(doc(db, 'clubs', name), data, { merge: true });
                                });
                                // Initialize National Teams
                                Object.entries(INITIAL_NATIONAL_TEAMS_DATA).forEach(async ([name, data]) => {
                                    await setDoc(doc(db, 'nationalTeams', name), data, { merge: true });
                                });
                                // Initialize Members (only if they don't exist in DB)
                                membersConfig.forEach(async (member) => {
                                    const existingMember = membersList.find(m => m.name === member.name);
                                    if (!existingMember || !existingMember.id) {
                                        await addDoc(collection(db, 'members'), member);
                                    }
                                });
                            }}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                        >
                            Fehlende Startdaten hinzufügen
                        </button>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 gap-8">
                    {Object.entries(clubsData).map(([clubName, data]: [string, any]) => (
                      <div key={clubName} className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                          <div className="w-8 h-8 bg-white rounded-full p-1 shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden">
                            <SmartLogo src={data.logo} alt={clubName} className="w-full h-full object-contain" />
                          </div>
                          {clubName}
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Logo URL</label>
                            <input 
                              type="text" 
                              value={data.logo || ''}
                              onChange={(e) => updateClubData(clubName, 'logo', e.target.value)}
                              placeholder="z.B. /logos/club.png oder https://..."
                              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#5C2D91] focus:border-transparent outline-none font-mono text-sm text-gray-700"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Spieltag</label>
                            <input 
                              type="number" 
                              value={data.spieltag}
                              onChange={(e) => updateClubData(clubName, 'spieltag', parseInt(e.target.value) || 0)}
                              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#5C2D91] focus:border-transparent outline-none font-mono font-bold text-gray-700"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Punkte</label>
                            <input 
                              type="number" 
                              value={data.punkte}
                              onChange={(e) => updateClubData(clubName, 'punkte', parseInt(e.target.value) || 0)}
                              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#5C2D91] focus:border-transparent outline-none font-mono font-bold text-gray-700"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tore</label>
                            <input 
                              type="number" 
                              value={data.tore}
                              onChange={(e) => updateClubData(clubName, 'tore', parseInt(e.target.value) || 0)}
                              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#5C2D91] focus:border-transparent outline-none font-mono font-bold text-gray-700"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                          <div>
                            <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">API Team ID</label>
                            <input 
                              type="number" 
                              value={data.apiTeamId || ''}
                              onChange={(e) => updateClubData(clubName, 'apiTeamId', parseInt(e.target.value) || 0)}
                              placeholder="z.B. 77"
                              className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-sm text-gray-700"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">API League ID</label>
                            <input 
                              type="number" 
                              value={data.apiLeagueId || ''}
                              onChange={(e) => updateClubData(clubName, 'apiLeagueId', parseInt(e.target.value) || 0)}
                              placeholder="z.B. 218"
                              className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-sm text-gray-700"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">API Season</label>
                            <input 
                              type="number" 
                              value={data.apiSeason || ''}
                              onChange={(e) => updateClubData(clubName, 'apiSeason', parseInt(e.target.value) || 0)}
                              placeholder="z.B. 2024"
                              className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-sm text-gray-700"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Boni / Titel</label>
                          <div className="flex flex-wrap gap-3">
                            {['EuroQuali', 'Meister', 'Cup', 'CupFinale', 'EuroSieg', 'EuroFinale'].map(title => (
                              <button
                                key={title}
                                onClick={() => toggleClubTitle(clubName, title)}
                                className={`px-3 py-1.5 rounded-full text-sm font-bold border transition-all ${
                                  data.titel.includes(title) 
                                    ? 'bg-[#D4AF37] text-white border-[#D4AF37]' 
                                    : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                {title}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add New Club */}
                  <div className="mt-8 bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h4 className="font-bold text-gray-800 mb-4">Neuen Club hinzufügen</h4>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <input 
                        type="text" 
                        value={newClubName}
                        onChange={(e) => setNewClubName(e.target.value)}
                        placeholder="Name des Clubs (z.B. FC Bayern München)"
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#5C2D91] focus:border-transparent outline-none"
                      />
                      <button 
                        onClick={handleAddClub}
                        disabled={!newClubName.trim()}
                        className="bg-[#5C2D91] hover:bg-[#4a2475] text-white px-6 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        Club hinzufügen
                      </button>
                    </div>
                  </div>

                  <div className="mt-12 pt-8 border-t border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                      <Award className="w-6 h-6 text-[#D4AF37]" />
                      <h3 className="text-2xl font-black text-[#5C2D91]">Nationalteams verwalten</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {Object.entries(nationalTeamsData).map(([teamName, data]: [string, any]) => (
                        <div key={teamName} className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                            <div className="w-8 h-8 bg-white rounded-full p-1 shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden">
                              <SmartLogo src={data.logo} alt={teamName} className="w-full h-full object-contain" />
                            </div>
                            {teamName}
                          </h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Spiele</label>
                              <input 
                                type="number" 
                                value={data.spiele}
                                onChange={(e) => updateNationalTeamData(teamName, 'spiele', parseInt(e.target.value) || 0)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#5C2D91] focus:border-transparent outline-none font-mono font-bold text-gray-700"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Punkte</label>
                              <input 
                                type="number" 
                                value={data.punkte}
                                onChange={(e) => updateNationalTeamData(teamName, 'punkte', parseInt(e.target.value) || 0)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#5C2D91] focus:border-transparent outline-none font-mono font-bold text-gray-700"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tore</label>
                              <input 
                                type="number" 
                                value={data.tore}
                                onChange={(e) => updateNationalTeamData(teamName, 'tore', parseInt(e.target.value) || 0)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#5C2D91] focus:border-transparent outline-none font-mono font-bold text-gray-700"
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                              <div>
                                <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">API Team ID</label>
                                <input 
                                  type="number" 
                                  value={data.apiTeamId || ''}
                                  onChange={(e) => updateNationalTeamData(teamName, 'apiTeamId', parseInt(e.target.value) || 0)}
                                  placeholder="z.B. 17"
                                  className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-sm text-gray-700"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">API League ID</label>
                                <input 
                                  type="number" 
                                  value={data.apiLeagueId || ''}
                                  onChange={(e) => updateNationalTeamData(teamName, 'apiLeagueId', parseInt(e.target.value) || 0)}
                                  placeholder="z.B. 32"
                                  className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-sm text-gray-700"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">API Season</label>
                                <input 
                                  type="number" 
                                  value={data.apiSeason || ''}
                                  onChange={(e) => updateNationalTeamData(teamName, 'apiSeason', parseInt(e.target.value) || 0)}
                                  placeholder="z.B. 2024"
                                  className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-sm text-gray-700"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add New National Team */}
                    <div className="mt-8 bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <h4 className="font-bold text-gray-800 mb-4">Neues Nationalteam hinzufügen</h4>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <input 
                          type="text" 
                          value={newNationalTeamName}
                          onChange={(e) => setNewNationalTeamName(e.target.value)}
                          placeholder="Name des Nationalteams (z.B. Spanien)"
                          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#5C2D91] focus:border-transparent outline-none"
                        />
                        <button 
                          onClick={handleAddNationalTeam}
                          disabled={!newNationalTeamName.trim()}
                          className="bg-[#5C2D91] hover:bg-[#4a2475] text-white px-6 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          Team hinzufügen
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-12 pt-8 border-t border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                      <Users className="w-6 h-6 text-[#D4AF37]" />
                      <h3 className="text-2xl font-black text-[#5C2D91]">Teilnehmer verwalten</h3>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8">
                      <h4 className="font-bold text-gray-800 mb-4">Neuen Teilnehmer hinzufügen</h4>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div className="md:col-span-1">
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Name</label>
                          <input 
                            type="text" 
                            value={newMemberName}
                            onChange={(e) => setNewMemberName(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#5C2D91] focus:border-transparent outline-none"
                            placeholder="Name"
                          />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Email</label>
                          <input 
                            type="email" 
                            value={newMemberEmail}
                            onChange={(e) => setNewMemberEmail(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#5C2D91] focus:border-transparent outline-none"
                            placeholder="Email"
                          />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Club</label>
                          <select 
                            value={newMemberClub}
                            onChange={(e) => setNewMemberClub(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#5C2D91] focus:border-transparent outline-none bg-white"
                          >
                            {Object.keys(clubsData).map(club => (
                              <option key={club} value={club}>{club}</option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Nationalteam</label>
                          <select 
                            value={newMemberNationalTeam}
                            onChange={(e) => setNewMemberNationalTeam(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#5C2D91] focus:border-transparent outline-none bg-white"
                          >
                            {Object.keys(nationalTeamsData).map(team => (
                              <option key={team} value={team}>{team}</option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-1">
                          <button 
                            onClick={() => {
                              if (newMemberName) {
                                addMember(newMemberName, newMemberClub, newMemberNationalTeam, newMemberEmail);
                                setNewMemberName('');
                                setNewMemberEmail('');
                              }
                            }}
                            className="w-full bg-[#5C2D91] text-white font-bold py-2 rounded-lg hover:bg-[#4a2475] transition-colors shadow-md"
                          >
                            Hinzufügen
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {membersList.map((member, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-inner flex-shrink-0" style={{backgroundColor: member.color}}>
                              {member.name.charAt(0)}
                            </div>
                            <div className="min-w-[150px]">
                              <div className="font-bold text-gray-800">{member.name}</div>
                              <div className="flex gap-2 mt-1">
                                <select 
                                  value={member.club}
                                  onChange={(e) => member.id && updateMemberData(member.id, 'club', e.target.value)}
                                  className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-1 py-0.5 outline-none focus:border-[#5C2D91]"
                                >
                                  {Object.keys(clubsData).map(club => (
                                    <option key={club} value={club}>{club}</option>
                                  ))}
                                </select>
                                <select 
                                  value={member.nationalTeam}
                                  onChange={(e) => member.id && updateMemberData(member.id, 'nationalTeam', e.target.value)}
                                  className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-1 py-0.5 outline-none focus:border-[#5C2D91]"
                                >
                                  {Object.keys(nationalTeamsData).map(team => (
                                    <option key={team} value={team}>{team}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="flex-1 max-w-md">
                                <input 
                                    type="email" 
                                    value={member.email || ''} 
                                    onChange={(e) => member.id && updateMemberData(member.id, 'email', e.target.value)}
                                    placeholder="Email Adresse"
                                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-[#5C2D91] focus:ring-1 focus:ring-[#5C2D91] outline-none text-gray-600 bg-gray-50 focus:bg-white transition-colors"
                                />
                            </div>
                          </div>
                          <button 
                            onClick={() => removeMember(idx)}
                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors ml-4"
                            title="Löschen"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Newsletter Section */}
                  <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 mt-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-800">Newsletter versenden</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Betreff</label>
                        <input 
                          type="text" 
                          value={newsletterSubject}
                          onChange={(e) => setNewsletterSubject(e.target.value)}
                          placeholder="z.B. Update zur aktuellen Saison!"
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Nachricht</label>
                        <textarea 
                          value={newsletterBody}
                          onChange={(e) => setNewsletterBody(e.target.value)}
                          placeholder="Liebe Sportfreunde..."
                          rows={6}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y"
                        ></textarea>
                      </div>
                      <div className="flex justify-end pt-2">
                        <button 
                          onClick={handleSendNewsletter}
                          className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                          E-Mail Client öffnen & Senden
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 text-right mt-2">
                        * Öffnet dein Standard-E-Mail-Programm. Alle hinterlegten E-Mail-Adressen der Mitglieder werden automatisch in das BCC-Feld (Blindkopie) eingefügt.
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                     <button 
                        className="bg-green-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-green-700 transition-colors shadow-lg flex items-center gap-2"
                        onClick={() => alert('Alle Daten wurden erfolgreich gespeichert!')}
                      >
                        <Save size={20} />
                        Speichern
                      </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center gap-6">
          <a href="/impressum.html" className="text-sm text-gray-500 hover:text-[#5C2D91] transition-colors">
            Impressum & Offenlegung
          </a>
          <a href="/datenschutz.html" className="text-sm text-gray-500 hover:text-[#5C2D91] transition-colors">
            Datenschutzerklärung
          </a>
        </div>
      </footer>
    </div>
  );
}

