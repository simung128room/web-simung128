/// <reference types="vite/client" />
import React, { useState, useEffect, useRef } from 'react';
import { initialStudents } from './data';
import { translations, Language } from './translations';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, GoogleAuthProvider, signInWithPopup, signInWithPhoneNumber } from 'firebase/auth';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, Settings, Users, History, MessageSquare, Globe, Send, Key, 
  ShieldAlert, CheckCircle2, AlertCircle, LayoutDashboard, GraduationCap, 
  UserCircle, BookOpen, ChevronRight, Search, Activity, Edit3, Plus,
  Sparkles, Command, Bell, Menu, X, Upload, Camera
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GlobalChat, AdminAnnouncements, Recommendations } from './components/Features';

declare global {
  interface Window {
    recaptchaVerifier: any;
    __firebase_config: any;
  }
}

// --- Utility Functions ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function calculateGrade(score: number): string {
  if (score >= 80) return '4.0';
  if (score >= 75) return '3.5';
  if (score >= 70) return '3.0';
  if (score >= 65) return '2.5';
  if (score >= 60) return '2.0';
  if (score >= 55) return '1.5';
  if (score >= 50) return '1.0';
  return '0.0';
}

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDn7BxRgFOVV-fFCH_0zLKHC7CRaJf5GuA",
  authDomain: "web-simungsk.firebaseapp.com",
  databaseURL: "https://web-simungsk-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "web-simungsk",
  storageBucket: "web-simungsk.firebasestorage.app",
  messagingSenderId: "601368421164",
  appId: "1:601368421164:web:a55bd106466abf03200289",
  measurementId: "G-13KSTZNVWS"
};

let app: any, auth: any, db: any;
let isFirebaseConfigured = false;
try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getDatabase(app);
  isFirebaseConfigured = true;
} catch (e) {
  console.error("Firebase initialization error", e);
}

// --- Types ---
type Theme = 'light' | 'dark' | 'blue' | 'green';
type Role = 'admin' | 'student';

interface Grade {
  id: string;
  subject: string;
  term: string;
  score: number;
  grade: string;
  credits: number;
  timestamp: number;
}

interface User {
  id: string;
  name: string;
  class?: string;
  password?: string;
  isBanned?: boolean;
  avatar?: string;
  email?: string;
  phone?: string;
  grades?: Grade[];
}

interface LoginEvent {
  id: string;
  userId: string;
  name: string;
  role: Role;
  timestamp: number;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  type: 'text' | 'image' | 'audio';
  timestamp: number;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  author: string;
}

interface Recommendation {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  type: 'novel' | 'webtoon';
  title: string;
  description: string;
  imageUrl?: string;
  link?: string;
  timestamp: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// --- Main App ---
export default function App() {
  // Global State
  const [language, setLanguage] = useState<Language>('th');
  const [theme, setTheme] = useState<Theme>('light');
  const [currentUser, setCurrentUser] = useState<{ id: string, name: string, role: Role } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // DB State
  const [users, setUsers] = useState<User[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginEvent[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const isInitialLoad = useRef(true);

  // Initialize DB
  useEffect(() => {
    if (!db) return;

    const usersRef = ref(db, 'users');
    const historyRef = ref(db, 'history');
    const chatRef = ref(db, 'chat');
    const announcementsRef = ref(db, 'announcements');
    const recommendationsRef = ref(db, 'recommendations');

    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUsers(Array.isArray(data) ? data : Object.values(data));
      } else {
        const initUsers = initialStudents.map(s => ({ 
          ...s, 
          password: '123456', 
          isBanned: false,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${s.name}`,
          grades: []
        }));
        setUsers(initUsers);
        set(usersRef, initUsers);
      }
    });

    const unsubscribeHistory = onValue(historyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setLoginHistory(Array.isArray(data) ? data : Object.values(data));
      }
    });

    const unsubscribeChat = onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setChatMessages(Array.isArray(data) ? data : Object.values(data));
      }
    });

    const unsubscribeAnnouncements = onValue(announcementsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setAnnouncements(Array.isArray(data) ? data : Object.values(data));
      }
    });

    const unsubscribeRecommendations = onValue(recommendationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setRecommendations(Array.isArray(data) ? data : Object.values(data));
      }
    });

    const storedLang = localStorage.getItem('app_lang') as Language;
    if (storedLang && translations[storedLang]) setLanguage(storedLang);
    
    const storedTheme = localStorage.getItem('app_theme') as Theme;
    if (storedTheme) setTheme(storedTheme);

    return () => {
      unsubscribeUsers();
      unsubscribeHistory();
      unsubscribeChat();
      unsubscribeAnnouncements();
      unsubscribeRecommendations();
    };
  }, []);

  // Sync DB
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    if (users.length > 0 && db) {
      set(ref(db, 'users'), users);
    }
  }, [users]);

  useEffect(() => {
    if (isInitialLoad.current) return;
    if (db) {
      set(ref(db, 'history'), loginHistory);
    }
  }, [loginHistory]);

  useEffect(() => {
    if (isInitialLoad.current) return;
    if (db) {
      set(ref(db, 'chat'), chatMessages);
    }
  }, [chatMessages]);

  useEffect(() => {
    if (isInitialLoad.current) return;
    if (db) {
      set(ref(db, 'announcements'), announcements);
    }
  }, [announcements]);

  useEffect(() => {
    if (isInitialLoad.current) return;
    if (db) {
      set(ref(db, 'recommendations'), recommendations);
    }
  }, [recommendations]);

  useEffect(() => {
    if (currentUser && currentUser.id !== 'admin') {
      const updatedUser = users.find(u => u.id === currentUser.id);
      if (updatedUser) {
        setCurrentUser(updatedUser);
      }
    }
  }, [users]);

  useEffect(() => {
    localStorage.setItem('app_lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('app_theme', theme);
    document.documentElement.className = theme;
  }, [theme]);

  const t = translations[language];

  // --- Handlers ---
  const handleLogin = (id: string, pass: string) => {
    // Admin Check
    if (id === 'admin' && pass === 'ooD7822429') {
      const user = { id: 'admin', name: 'Administrator', role: 'admin' as Role };
      setCurrentUser(user);
      addLoginHistory(user);
      return { success: true };
    }
    
    // Student Check
    const user = users.find(u => u.id === id);
    if (!user || user.password !== pass) return { success: false, message: t.invalidLogin };
    if (user.isBanned) return { success: false, message: t.bannedMessage };
    
    const sessionUser = { id: user.id, name: user.name, role: 'student' as Role };
    setCurrentUser(sessionUser);
    addLoginHistory(sessionUser);
    return { success: true };
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      let dbUser = users.find(u => u.email === user.email);
      
      if (!dbUser) {
        dbUser = {
          id: user.uid.substring(0, 6),
          name: user.displayName || 'Google User',
          email: user.email || '',
          avatar: user.photoURL || '',
          password: 'google-login',
          class: '1/1',
          isBanned: false,
          grades: []
        };
        setUsers(prev => [...prev, dbUser!]);
      }
      
      if (dbUser.isBanned) return { success: false, message: t.bannedMessage };
      
      const sessionUser = { id: dbUser.id, name: dbUser.name, role: 'student' as Role };
      setCurrentUser(sessionUser);
      addLoginHistory(sessionUser);
      return { success: true };
    } catch (error: any) {
      console.error(error);
      return { success: false, message: error.message };
    }
  };

  const handlePhoneLogin = async (phone: string, verificationCode: string, confirmationResult: any) => {
    try {
      const result = await confirmationResult.confirm(verificationCode);
      const user = result.user;
      
      let dbUser = users.find(u => u.phone === user.phoneNumber);
      
      if (!dbUser) {
        dbUser = {
          id: user.uid.substring(0, 6),
          name: 'Phone User',
          phone: user.phoneNumber || '',
          password: 'phone-login',
          class: '1/1',
          isBanned: false,
          grades: []
        };
        setUsers(prev => [...prev, dbUser!]);
      }
      
      if (dbUser.isBanned) return { success: false, message: t.bannedMessage };
      
      const sessionUser = { id: dbUser.id, name: dbUser.name, role: 'student' as Role };
      setCurrentUser(sessionUser);
      addLoginHistory(sessionUser);
      return { success: true };
    } catch (error: any) {
      console.error(error);
      return { success: false, message: "Invalid OTP code" };
    }
  };

  const handleLogout = () => setCurrentUser(null);

  const addLoginHistory = (user: { id: string, name: string, role: Role }) => {
    setLoginHistory(prev => [{
      id: Date.now().toString(),
      userId: user.id,
      name: user.name,
      role: user.role,
      timestamp: Date.now()
    }, ...prev].slice(0, 200));
  };

  // --- Theme Classes ---
  const getThemeClasses = () => {
    switch (theme) {
      case 'dark': return 'bg-[#202124] text-[#e8eaed] selection:bg-blue-500/30';
      case 'blue': return 'bg-[#F0F4F8] text-[#102A43] selection:bg-blue-500/30';
      case 'green': return 'bg-[#F0FFF4] text-[#22543D] selection:bg-emerald-500/30';
      default: return 'bg-[#f8f9fa] text-[#202124] selection:bg-blue-500/30';
    }
  };

  const getCardClasses = () => {
    switch (theme) {
      case 'dark': return 'bg-[#292a2d] border-[#3c4043] text-[#e8eaed] shadow-sm';
      case 'blue': return 'bg-white border-[#D9E2EC] shadow-md ring-1 ring-blue-500/5';
      case 'green': return 'bg-white border-[#C6F6D5] shadow-md ring-1 ring-emerald-500/5';
      default: return 'bg-white border-[#dadce0] shadow-sm rounded-lg';
    }
  };

  const getSidebarClasses = () => {
    switch (theme) {
      case 'dark': return 'bg-[#292a2d] border-[#3c4043]';
      case 'blue': return 'bg-[#F0F4F8] border-[#D9E2EC]'; 
      case 'green': return 'bg-[#F0FFF4] border-[#C6F6D5]';
      default: return 'bg-white border-[#dadce0]';
    }
  };

  // --- Render ---
  return (
    <div className={cn("min-h-screen font-sans flex flex-col transition-colors duration-500 antialiased selection:bg-black/10", getThemeClasses())}>
      {/* Top Navbar */}
      <header className={cn("sticky top-0 z-50 border-b h-16 flex items-center justify-between px-4 sm:px-6 shrink-0 transition-colors duration-500", 
        theme === 'dark' ? 'bg-[#292a2d] border-[#3c4043]' : 'bg-white border-[#dadce0]'
      )}>
        <div className="flex items-center gap-3 sm:gap-4">
          {currentUser && (
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="sm:hidden p-2 -ml-2 rounded-lg text-neutral-500 hover:bg-black/5 dark:hover:bg-white/5"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
          <img src="https://img5.pic.in.th/file/secure-sv1/IMG_4712.png" alt="Logo" className="h-8 object-contain" />
          <span className="text-lg font-medium font-display hidden sm:block">Academic@SK</span>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-neutral-500" />
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value as Language)}
              className={cn("text-[13px] rounded-md border-none focus:ring-0 cursor-pointer py-1.5 px-2 font-medium outline-none transition-colors appearance-none pr-6 relative", 
                theme === 'dark' ? 'bg-transparent text-[#E0E0E0] hover:bg-white/5' : 'bg-transparent text-[#333333] hover:bg-black/5'
              )}
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.25rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
            >
              <option value="th">TH</option>
              <option value="en">EN</option>
            </select>
          </div>

          {currentUser && (
            <div className="flex items-center gap-4 pl-5 border-l border-neutral-200 dark:border-[#333333]">
              <div className="flex items-center gap-3">
                <div className="hidden md:block text-right">
                  <p className="text-[13px] font-semibold leading-none">{currentUser.name}</p>
                  <p className="text-[11px] font-medium text-neutral-500 mt-1 capitalize tracking-wide">{currentUser.role}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 p-[2px]">
                  <div className="w-full h-full rounded-full bg-white dark:bg-[#1E1E1E] flex items-center justify-center overflow-hidden">
                    {users.find(u => u.id === currentUser.id)?.avatar && !users.find(u => u.id === currentUser.id)?.avatar?.includes('dicebear') ? (
                      <img src={users.find(u => u.id === currentUser.id)?.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle className="w-5 h-5 text-neutral-400" />
                    )}
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 rounded-full text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-all ml-1"
                  title={t.logout}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        <AnimatePresence mode="wait">
          {!currentUser ? (
            <motion.div 
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="flex-1 overflow-y-auto flex items-center justify-center p-4 relative z-10"
            >
              <LoginScreen onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} onPhoneLogin={handlePhoneLogin} t={t} cardClass={getCardClasses()} theme={theme} />
            </motion.div>
          ) : currentUser.role === 'admin' ? (
            <motion.div 
              key="admin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full flex"
            >
              <AdminLayout 
                t={t} 
                users={users} 
                setUsers={setUsers} 
                history={loginHistory} 
                chatMessages={chatMessages}
                setChatMessages={setChatMessages}
                announcements={announcements}
                setAnnouncements={setAnnouncements}
                recommendations={recommendations}
                setRecommendations={setRecommendations}
                theme={theme} 
                setTheme={setTheme}
                cardClass={getCardClasses()}
                sidebarClass={getSidebarClasses()}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
              />
            </motion.div>
          ) : (
            <motion.div 
              key="student"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full flex"
            >
              <StudentLayout 
                t={t} 
                user={currentUser} 
                users={users}
                setUsers={setUsers}
                chatMessages={chatMessages}
                setChatMessages={setChatMessages}
                announcements={announcements}
                recommendations={recommendations}
                setRecommendations={setRecommendations}
                cardClass={getCardClasses()}
                sidebarClass={getSidebarClasses()}
                theme={theme}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- Unified Login Screen ---
function LoginScreen({ onLogin, onGoogleLogin, onPhoneLogin, t, cardClass, theme }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'password' | 'phone'>('password');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  
  // Math CAPTCHA
  const [num1, setNum1] = useState(Math.floor(Math.random() * 10) + 1);
  const [num2, setNum2] = useState(Math.floor(Math.random() * 10) + 1);
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  const refreshCaptcha = () => {
    setNum1(Math.floor(Math.random() * 10) + 1);
    setNum2(Math.floor(Math.random() * 10) + 1);
    setCaptchaAnswer('');
  };

  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => {},
      });
    }
  }, []);

  const handleSendOTP = async () => {
    if (!phoneNumber) {
      setError("Please enter a phone number");
      return;
    }
    setError('');
    setLoading(true);
    try {
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      alert("OTP sent to your phone");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to send OTP");
    }
    setLoading(false);
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || !verificationCode) return;
    
    setError('');
    setLoading(true);
    const res = await onPhoneLogin(phoneNumber, verificationCode, confirmationResult);
    if (!res.success) {
      setError(res.message);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (parseInt(captchaAnswer) !== num1 + num2) {
      setError("Bot verification failed. Please try again.");
      refreshCaptcha();
      return;
    }

    setLoading(true);
    // Simulate network delay for realism
    await new Promise(r => setTimeout(r, 600));
    
    const res = onLogin(username, password);
    if (!res.success) {
      setError(res.message);
      refreshCaptcha();
    }
    setLoading(false);
  };

  const handleGoogleClick = async () => {
    setLoading(true);
    const res = await onGoogleLogin();
    if (!res.success) {
      setError(res.message);
    }
    setLoading(false);
  };

  return (
    <div className={cn("w-full max-w-[450px] rounded-lg p-10 relative overflow-hidden border", cardClass)}>
      <div className="text-center mb-8 relative z-10">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-20 h-20 flex items-center justify-center mx-auto mb-4"
        >
          <img src="https://img5.pic.in.th/file/secure-sv1/IMG_4712.png" alt="Logo" className="w-full h-full object-contain" />
        </motion.div>
        <h2 className="text-2xl font-normal tracking-tight font-display">
          welcome to sk128
        </h2>
        <p className="text-[14px] font-normal mt-2 opacity-70">Authenticate to continue</p>
      </div>

      <div className="flex justify-center gap-4 mb-6 relative z-10">
        <button 
          onClick={() => setLoginMethod('password')}
          className={cn("px-4 py-2 text-[13px] font-medium rounded-full transition-colors", loginMethod === 'password' ? 'bg-[#1a73e8] text-white' : 'bg-transparent text-neutral-500 hover:bg-black/5 dark:hover:bg-white/5')}
        >
          Password
        </button>
        <button 
          onClick={() => setLoginMethod('phone')}
          className={cn("px-4 py-2 text-[13px] font-medium rounded-full transition-colors", loginMethod === 'phone' ? 'bg-[#1a73e8] text-white' : 'bg-transparent text-neutral-500 hover:bg-black/5 dark:hover:bg-white/5')}
        >
          Phone OTP
        </button>
      </div>

      {loginMethod === 'password' ? (
        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="p-3 rounded bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[13px] flex items-center gap-2 font-medium border border-red-200 dark:border-red-800"
              >
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="space-y-4">
            <div>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className={cn("w-full px-4 py-3 rounded border focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-[14px] placeholder:text-neutral-400", 
                  theme === 'dark' ? 'bg-transparent border-[#5f6368]' : 'bg-transparent border-[#dadce0]'
                )}
                placeholder="Username"
                required
              />
            </div>
            
            <div>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={cn("w-full px-4 py-3 rounded border focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-[14px] placeholder:text-neutral-400", 
                  theme === 'dark' ? 'bg-transparent border-[#5f6368]' : 'bg-transparent border-[#dadce0]'
                )}
                placeholder="Password"
                required
              />
            </div>
          </div>

          {/* Math CAPTCHA */}
          <div className="space-y-2">
            <label className="block text-[13px] font-medium opacity-70">Bot Verification</label>
            <div className="flex items-center gap-3">
              <div className={cn("px-4 py-3 rounded border font-mono text-[14px] font-medium flex-shrink-0", theme === 'dark' ? 'bg-[#303134] border-[#5f6368]' : 'bg-[#f1f3f4] border-[#dadce0]')}>
                {num1} + {num2} = ?
              </div>
              <input 
                type="number" 
                value={captchaAnswer} 
                onChange={e => setCaptchaAnswer(e.target.value)} 
                className={cn("flex-1 px-4 py-3 rounded border focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-[14px] placeholder:text-neutral-400", theme === 'dark' ? 'bg-transparent border-[#5f6368]' : 'bg-transparent border-[#dadce0]')}
                placeholder="Answer"
                required
              />
            </div>
          </div>

          <motion.button 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit" 
            disabled={loading}
            className="w-full py-2.5 rounded bg-[#1a73e8] hover:bg-[#1b66c9] text-white text-[14px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t.login}
          </motion.button>
        </form>
      ) : (
        <form onSubmit={handlePhoneSubmit} className="space-y-6 relative z-10">
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="p-3 rounded bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[13px] flex items-center gap-2 font-medium border border-red-200 dark:border-red-800"
              >
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium opacity-70 mb-1.5">Phone Number</label>
              <div className="flex gap-2">
                <input 
                  type="tel" 
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  className={cn("flex-1 px-4 py-3 rounded border focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-[14px] placeholder:text-neutral-400", 
                    theme === 'dark' ? 'bg-transparent border-[#5f6368]' : 'bg-transparent border-[#dadce0]'
                  )}
                  placeholder="+66 81 234 5678"
                  disabled={!!confirmationResult}
                  required
                />
                {!confirmationResult && (
                  <button 
                    type="button"
                    onClick={handleSendOTP}
                    disabled={loading || !phoneNumber}
                    className="px-4 py-3 rounded bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-[13px] font-medium transition-colors disabled:opacity-50"
                  >
                    Send OTP
                  </button>
                )}
              </div>
            </div>

            {confirmationResult && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <label className="block text-[13px] font-medium opacity-70 mb-1.5">Verification Code</label>
                <input 
                  type="text" 
                  value={verificationCode}
                  onChange={e => setVerificationCode(e.target.value)}
                  className={cn("w-full px-4 py-3 rounded border focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-[14px] placeholder:text-neutral-400", 
                    theme === 'dark' ? 'bg-transparent border-[#5f6368]' : 'bg-transparent border-[#dadce0]'
                  )}
                  placeholder="123456"
                  required
                />
              </motion.div>
            )}
          </div>

          {confirmationResult && (
            <motion.button 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit" 
              disabled={loading}
              className="w-full py-2.5 rounded bg-[#1a73e8] hover:bg-[#1b66c9] text-white text-[14px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Verify & Login"}
            </motion.button>
          )}
        </form>
      )}

      <div className="mt-6 relative z-10">
        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800"></div>
          <span className="flex-shrink-0 mx-4 text-neutral-400 text-[12px]">or continue with</span>
          <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800"></div>
        </div>
        
        <button 
          onClick={handleGoogleClick}
          disabled={loading}
          className={cn("mt-4 w-full py-2.5 rounded border flex items-center justify-center gap-3 text-[14px] font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5",
            theme === 'dark' ? 'border-[#5f6368]' : 'border-[#dadce0]'
          )}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>
      </div>
      <div id="recaptcha-container"></div>
    </div>
  );
}

// --- Admin Layout & Features ---
function AdminLayout({ t, users, setUsers, history, chatMessages, setChatMessages, announcements, setAnnouncements, recommendations, setRecommendations, theme, setTheme, cardClass, sidebarClass, isSidebarOpen, setIsSidebarOpen }: any) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'grading' | 'logs' | 'settings' | 'chat' | 'announcements' | 'recommendations'>('dashboard');

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: t.dashboard },
    { id: 'users', icon: Users, label: t.userManagement },
    { id: 'grading', icon: GraduationCap, label: t.grading },
    { id: 'chat', icon: MessageSquare, label: t.chat || 'Global Chat' },
    { id: 'announcements', icon: Bell, label: t.announcements || 'Announcements' },
    { id: 'recommendations', icon: BookOpen, label: 'ป้ายยา' },
    { id: 'logs', icon: History, label: t.systemLogs },
    { id: 'settings', icon: Settings, label: t.settings },
  ];

  return (
    <div className="flex w-full h-full relative">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 sm:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn("fixed sm:relative inset-y-0 left-0 z-40 w-64 border-r flex flex-col shrink-0 transition-transform duration-300 ease-in-out sm:translate-x-0", 
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        sidebarClass
      )}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#1a73e8] flex items-center justify-center">
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
          <h2 className="font-semibold tracking-tight">Admin Console</h2>
        </div>
        <nav className="flex-1 px-4 pb-4 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id as any); setIsSidebarOpen(false); }}
              className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all relative overflow-hidden group",
                activeTab === item.id 
                  ? "text-white dark:text-black" 
                  : "hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100"
              )}
            >
              {activeTab === item.id && (
                <motion.div 
                  layoutId="admin-active-tab"
                  className="absolute inset-0 bg-[#e8f0fe] dark:bg-[#3c4043] rounded -z-10"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon className={cn("w-4 h-4 transition-transform duration-300", activeTab === item.id ? "scale-110" : "group-hover:scale-110")} />
              <span className="relative z-10">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-transparent relative z-10">
        <div className="max-w-5xl mx-auto space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <h2 className="text-2xl font-bold tracking-tight">{navItems.find(i => i.id === activeTab)?.label}</h2>
            <div className="flex items-center gap-2 text-[13px] font-medium text-neutral-500">
              <span>Admin</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-neutral-900 dark:text-white">{navItems.find(i => i.id === activeTab)?.label}</span>
            </div>
          </motion.div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <AdminOverview t={t} users={users} history={history} cardClass={cardClass} />}
              {activeTab === 'users' && <UserManagement t={t} users={users} setUsers={setUsers} cardClass={cardClass} theme={theme} />}
              {activeTab === 'grading' && <GradingSystem t={t} users={users} setUsers={setUsers} cardClass={cardClass} theme={theme} />}
              {activeTab === 'chat' && (
                <GlobalChat 
                  t={t} 
                  messages={chatMessages} 
                  currentUser={{ id: 'admin', name: 'Admin', role: 'admin' }} 
                  cardClass={cardClass} 
                  theme={theme} 
                  onSendMessage={(msg: any) => setChatMessages([...chatMessages, { ...msg, id: Date.now().toString(), userId: 'admin', userName: 'Admin', userAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Admin', timestamp: Date.now() }])}
                  onDeleteMessage={(id: string) => setChatMessages(chatMessages.filter((m: any) => m.id !== id))}
                />
              )}
              {activeTab === 'announcements' && (
                <AdminAnnouncements 
                  t={t} 
                  announcements={announcements} 
                  cardClass={cardClass} 
                  theme={theme} 
                  onAddAnnouncement={(a: any) => setAnnouncements([{ ...a, id: Date.now().toString(), timestamp: Date.now(), author: 'Admin' }, ...announcements])}
                  onDeleteAnnouncement={(id: string) => setAnnouncements(announcements.filter((a: any) => a.id !== id))}
                />
              )}
              {activeTab === 'recommendations' && (
                <Recommendations 
                  t={t} 
                  recommendations={recommendations} 
                  currentUser={{ id: 'admin', name: 'Admin', role: 'admin' }} 
                  cardClass={cardClass} 
                  theme={theme} 
                  onAddRecommendation={(r: any) => setRecommendations([{ ...r, id: Date.now().toString(), userId: 'admin', userName: 'Admin', userAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Admin', timestamp: Date.now() }, ...recommendations])}
                  onDeleteRecommendation={(id: string) => setRecommendations(recommendations.filter((r: any) => r.id !== id))}
                />
              )}
              {activeTab === 'logs' && <SystemLogs t={t} history={history} cardClass={cardClass} />}
              {activeTab === 'settings' && <SystemSettings t={t} theme={theme} setTheme={setTheme} cardClass={cardClass} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function AdminOverview({ t, users, history, cardClass }: any) {
  const studentsCount = users.filter((u: User) => u.id !== 'admin').length;
  const activeToday = new Set(history.filter((h: LoginEvent) => Date.now() - h.timestamp < 86400000).map((h: LoginEvent) => h.userId)).size;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <motion.div whileHover={{ y: -2 }} className={cn("p-6 rounded-lg border flex items-center gap-5 relative overflow-hidden group", cardClass)}>
        <div className="absolute inset-0 bg-blue-50/50 dark:bg-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="w-12 h-12 rounded bg-[#1a73e8] text-white flex items-center justify-center">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <p className="text-[12px] font-semibold text-neutral-500 uppercase tracking-wider">{t.totalStudents}</p>
          <p className="text-3xl font-bold mt-1 tracking-tight">{studentsCount}</p>
        </div>
      </motion.div>
      <motion.div whileHover={{ y: -2 }} className={cn("p-6 rounded-lg border flex items-center gap-5 relative overflow-hidden group", cardClass)}>
        <div className="absolute inset-0 bg-emerald-50/50 dark:bg-emerald-900/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="w-12 h-12 rounded bg-[#1e8e3e] text-white flex items-center justify-center">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <p className="text-[12px] font-semibold text-neutral-500 uppercase tracking-wider">{t.activeUsers}</p>
          <p className="text-3xl font-bold mt-1 tracking-tight">{activeToday}</p>
        </div>
      </motion.div>
    </div>
  );
}

function UserManagement({ t, users, setUsers, cardClass, theme }: any) {
  const [searchTerm, setSearchTerm] = useState('');

  const toggleBan = (userId: string) => {
    setUsers((prev: User[]) => prev.map(u => u.id === userId ? { ...u, isBanned: !u.isBanned } : u));
  };

  const resetPassword = (userId: string) => {
    if(confirm('Reset password to 123456?')) {
      setUsers((prev: User[]) => prev.map(u => u.id === userId ? { ...u, password: '123456' } : u));
      alert(t.success);
    }
  };

  const filteredUsers = users.filter((u: User) => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={cn("flex items-center gap-2 px-4 py-2 rounded border flex-1 max-w-md", theme === 'dark' ? 'bg-[#0A0A0A] border-[#262626]' : 'bg-white border-[#E5E5E5]')}>
          <Search className="w-4 h-4 text-neutral-400" />
          <input 
            type="text" 
            placeholder={t.search || "Search users..."} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-[13px] w-full"
          />
        </div>
      </div>
      <div className={cn("rounded border overflow-hidden", cardClass)}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] uppercase opacity-60 border-b border-[#E5E5E5] dark:border-[#262626] bg-[#FAFAFA] dark:bg-[#0A0A0A]">
              <tr>
                <th className="px-6 py-4 font-medium tracking-wider">ID</th>
                <th className="px-6 py-4 font-medium tracking-wider">Name</th>
                <th className="px-6 py-4 font-medium tracking-wider">Class</th>
                <th className="px-6 py-4 font-medium tracking-wider">{t.status}</th>
                <th className="px-6 py-4 font-medium tracking-wider text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5] dark:divide-[#262626]">
              {filteredUsers.map((u: User) => (
                <tr key={u.id} className="hover:bg-[#FAFAFA] dark:hover:bg-[#171717] transition-colors">
                  <td className="px-6 py-4 font-mono text-[13px]">{u.id}</td>
                  <td className="px-6 py-4 font-medium flex items-center gap-3 text-[13px]">
                    {u.avatar && !u.avatar.includes('dicebear') ? (
                      <img src={u.avatar} alt="" className="w-6 h-6 rounded-full bg-[#F5F5F5] dark:bg-[#262626] object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center overflow-hidden">
                        <UserCircle className="w-5 h-5 text-neutral-400 dark:text-neutral-500 mt-1" />
                      </div>
                    )}
                    {u.name}
                  </td>
                  <td className="px-6 py-4 text-[13px]">{u.class}</td>
                  <td className="px-6 py-4">
                    {u.isBanned ? 
                      <span className="px-2 py-1 rounded-md text-[10px] font-medium uppercase tracking-wider bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 flex items-center gap-1 w-max">Banned</span> : 
                      <span className="px-2 py-1 rounded-md text-[10px] font-medium uppercase tracking-wider bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 flex items-center gap-1 w-max">Active</span>
                    }
                  </td>
                  <td className="px-6 py-4 flex gap-2 justify-end">
                    <button onClick={() => toggleBan(u.id)} className={cn("px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors", u.isBanned ? 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400')}>
                      {u.isBanned ? t.unbanUser : t.banUser}
                    </button>
                    <button onClick={() => resetPassword(u.id)} className="px-3 py-1.5 rounded-md text-[11px] font-medium bg-[#F5F5F5] text-[#171717] hover:bg-[#E5E5E5] dark:bg-[#262626] dark:text-[#EDEDED] dark:hover:bg-[#404040]">
                      Reset Pass
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GradingSystem({ t, users, setUsers, cardClass, theme }: any) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [term, setTerm] = useState('1/2567');
  const [score, setScore] = useState<number | ''>('');
  const [credits, setCredits] = useState<number | ''>(3);

  const selectedUser = users.find((u: User) => u.id === selectedUserId);

  const handleAddGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || score === '' || !subject || credits === '') return;

    const newGrade: Grade = {
      id: Date.now().toString(),
      subject,
      term,
      score: Number(score),
      grade: calculateGrade(Number(score)),
      credits: Number(credits),
      timestamp: Date.now()
    };

    setUsers((prev: User[]) => prev.map(u => {
      if (u.id === selectedUserId) {
        return { ...u, grades: [...(u.grades || []), newGrade] };
      }
      return u;
    }));

    setSubject('');
    setScore('');
    setCredits(3);
    alert(t.success);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Student Selector */}
      <div className={cn("rounded-lg border p-5 lg:col-span-1 h-max", cardClass)}>
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Search className="w-4 h-4"/> {t.selectStudent}</h3>
        <select 
          value={selectedUserId}
          onChange={e => setSelectedUserId(e.target.value)}
          className={cn("w-full px-3 py-2 rounded-lg border outline-none text-[13px] mb-4", theme === 'dark' ? 'bg-[#0A0A0A] border-[#262626]' : 'bg-[#FAFAFA] border-[#E5E5E5]')}
        >
          <option value="">-- Select --</option>
          {users.map((u: User) => (
            <option key={u.id} value={u.id}>{u.id} - {u.name}</option>
          ))}
        </select>

        {selectedUser && (
          <div className="pt-4 border-t border-slate-200/20">
            <div className="flex items-center gap-3 mb-2">
              {selectedUser.avatar && !selectedUser.avatar.includes('dicebear') ? (
                <img src={selectedUser.avatar} alt="" className="w-10 h-10 rounded-full bg-slate-200 object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center overflow-hidden">
                  <UserCircle className="w-8 h-8 text-neutral-400 dark:text-neutral-500 mt-2" />
                </div>
              )}
              <div>
                <p className="font-medium text-sm">{selectedUser.name}</p>
                <p className="text-xs opacity-70">Class: {selectedUser.class}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grade Entry & History */}
      <div className="lg:col-span-2 space-y-6">
        {selectedUser ? (
          <>
            <div className={cn("rounded-lg border p-5", cardClass)}>
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4"/> {t.addGrade}</h3>
              <form onSubmit={handleAddGrade} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-medium mb-1.5 opacity-60 uppercase">{t.subject}</label>
                  <input type="text" value={subject} onChange={e => setSubject(e.target.value)} required className={cn("w-full px-3 py-2 rounded-lg border outline-none text-[13px]", theme === 'dark' ? 'bg-[#0A0A0A] border-[#262626]' : 'bg-[#FAFAFA] border-[#E5E5E5]')} placeholder="e.g. Math 101" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1.5 opacity-60 uppercase">{t.term}</label>
                  <input type="text" value={term} onChange={e => setTerm(e.target.value)} required className={cn("w-full px-3 py-2 rounded-lg border outline-none text-[13px]", theme === 'dark' ? 'bg-[#0A0A0A] border-[#262626]' : 'bg-[#FAFAFA] border-[#E5E5E5]')} />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1.5 opacity-60 uppercase">Credits</label>
                  <input type="number" min="0.5" step="0.5" value={credits} onChange={e => setCredits(e.target.value ? Number(e.target.value) : '')} required className={cn("w-full px-3 py-2 rounded-lg border outline-none text-[13px]", theme === 'dark' ? 'bg-[#0A0A0A] border-[#262626]' : 'bg-[#FAFAFA] border-[#E5E5E5]')} placeholder="e.g. 3" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1.5 opacity-60 uppercase">{t.score}</label>
                  <input type="number" min="0" max="100" value={score} onChange={e => setScore(e.target.value ? Number(e.target.value) : '')} required className={cn("w-full px-3 py-2 rounded-lg border outline-none text-[13px]", theme === 'dark' ? 'bg-[#0A0A0A] border-[#262626]' : 'bg-[#FAFAFA] border-[#E5E5E5]')} placeholder="0-100" />
                </div>
                <div className="sm:col-span-4 flex justify-end mt-2">
                  <button type="submit" className="px-5 py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black text-[13px] font-medium transition-colors">
                    {t.save}
                  </button>
                </div>
              </form>
            </div>

            <div className={cn("rounded-lg border overflow-hidden", cardClass)}>
              <div className="p-4 border-b border-[#E5E5E5] dark:border-[#262626] bg-[#FAFAFA] dark:bg-[#0A0A0A]">
                <h3 className="font-medium text-[13px]">{t.myGrades}</h3>
              </div>
              <table className="w-full text-sm text-left">
                <thead className="text-[11px] uppercase opacity-60 border-b border-[#E5E5E5] dark:border-[#262626]">
                  <tr>
                    <th className="px-4 py-3 font-medium tracking-wider">{t.term}</th>
                    <th className="px-4 py-3 font-medium tracking-wider">{t.subject}</th>
                    <th className="px-4 py-3 font-medium tracking-wider text-center">Credits</th>
                    <th className="px-4 py-3 font-medium tracking-wider text-center">{t.score}</th>
                    <th className="px-4 py-3 font-medium tracking-wider text-center">{t.grade}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5] dark:divide-[#262626]">
                  {selectedUser.grades && selectedUser.grades.length > 0 ? (
                    selectedUser.grades.map((g: Grade) => (
                      <tr key={g.id} className="hover:bg-[#FAFAFA] dark:hover:bg-[#171717]">
                        <td className="px-4 py-3 text-[13px]">{g.term}</td>
                        <td className="px-4 py-3 font-medium text-[13px]">{g.subject}</td>
                        <td className="px-4 py-3 text-center text-[13px]">{g.credits || 3}</td>
                        <td className="px-4 py-3 text-center text-[13px]">{g.score}</td>
                        <td className="px-4 py-3 text-center font-semibold text-[13px]">{g.grade}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} className="px-4 py-8 text-center opacity-50 text-[13px]">{t.noData}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className={cn("rounded-lg border p-12 text-center opacity-50 flex flex-col items-center justify-center", cardClass)}>
            <UserCircle className="w-12 h-12 mb-3" />
            <p>{t.selectStudent}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SystemLogs({ t, history, cardClass }: any) {
  return (
    <div className={cn("rounded-xl border overflow-hidden", cardClass)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-[11px] uppercase opacity-60 border-b border-[#E5E5E5] dark:border-[#262626] bg-[#FAFAFA] dark:bg-[#0A0A0A]">
            <tr>
              <th className="px-6 py-4 font-medium tracking-wider">{t.time}</th>
              <th className="px-6 py-4 font-medium tracking-wider">{t.user}</th>
              <th className="px-6 py-4 font-medium tracking-wider">{t.role}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5] dark:divide-[#262626]">
            {history.map((h: LoginEvent) => (
              <tr key={h.id} className="hover:bg-[#FAFAFA] dark:hover:bg-[#171717]">
                <td className="px-6 py-4 text-[13px] font-mono opacity-80">{new Date(h.timestamp).toLocaleString()}</td>
                <td className="px-6 py-4 font-medium text-[13px]">{h.name} <span className="opacity-50 font-normal text-[11px] ml-2">({h.userId})</span></td>
                <td className="px-6 py-4">
                  <span className={cn("px-2 py-1 rounded-md text-[10px] font-medium uppercase tracking-wider", h.role === 'admin' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400')}>
                    {h.role}
                  </span>
                </td>
              </tr>
            ))}
            {history.length === 0 && <tr><td colSpan={3} className="px-6 py-8 text-center opacity-50 text-[13px]">{t.noData}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SystemSettings({ t, theme, setTheme, cardClass }: any) {
  return (
    <div className={cn("rounded-lg border p-6 max-w-2xl", cardClass)}>
      <h3 className="text-[11px] font-medium mb-4 uppercase tracking-wider opacity-60">{t.theme}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(['light', 'dark', 'blue', 'green'] as Theme[]).map(th => (
          <button 
            key={th}
            onClick={() => setTheme(th)}
            className={cn("px-4 py-6 rounded border font-medium transition-all flex flex-col items-center gap-3", 
              theme === th ? 'border-black dark:border-white ring-1 ring-black dark:ring-white' : 'border-[#E5E5E5] dark:border-[#262626] hover:border-[#A3A3A3]',
              th === 'dark' ? 'bg-[#0A0A0A] text-white' : th === 'blue' ? 'bg-[#F8FAFC] text-[#0F172A]' : th === 'green' ? 'bg-[#F6F8F6] text-[#1C1917]' : 'bg-white text-[#171717]'
            )}
          >
            <div className={cn("w-6 h-6 rounded-full", 
              th === 'light' ? 'bg-white border shadow-sm' : 
              th === 'dark' ? 'bg-[#0A0A0A] border border-[#262626]' : 
              th === 'blue' ? 'bg-[#0F172A]' : 'bg-[#1C1917]'
            )} />
            <span className="text-[13px]">{t[th] || th}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Student Layout & Features ---
function StudentLayout({ t, user, users, setUsers, cardClass, sidebarClass, theme, isSidebarOpen, setIsSidebarOpen }: any) {
  const [activeTab, setActiveTab] = useState<'profile' | 'grades'>('profile');
  const studentData = users.find((u: User) => u.id === user.id);

  const navItems = [
    { id: 'profile', icon: UserCircle, label: t.profile },
    { id: 'grades', icon: BookOpen, label: t.myGrades },
  ];

  return (
    <div className="flex w-full h-full relative">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 sm:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn("fixed sm:relative inset-y-0 left-0 z-40 w-64 border-r flex flex-col shrink-0 transition-transform duration-300 ease-in-out sm:translate-x-0", 
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        sidebarClass
      )}>
        <div className="p-8 flex flex-col items-center border-b border-pink-200/50 dark:border-[#1F1F1F]">
          <div className="relative mb-4 group">
            <div className="absolute inset-0 bg-black/5 dark:bg-white/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            {studentData?.avatar && !studentData.avatar.includes('dicebear') ? (
              <img src={studentData.avatar} alt="Avatar" className="relative w-24 h-24 rounded-full bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 shadow-xl object-cover" />
            ) : (
              <div className="relative w-24 h-24 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center overflow-hidden shadow-xl">
                <UserCircle className="w-20 h-20 text-neutral-300 dark:text-neutral-600 mt-4" />
              </div>
            )}
          </div>
          <h3 className="font-semibold text-[16px] text-center leading-tight tracking-tight">{studentData?.name}</h3>
          <p className="text-[12px] font-medium text-pink-600 dark:text-pink-400 mt-1.5 bg-pink-100 dark:bg-pink-500/10 px-2.5 py-0.5 rounded-full">Class {studentData?.class}</p>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id as any); setIsSidebarOpen(false); }}
              className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all relative overflow-hidden group",
                activeTab === item.id 
                  ? "text-white" 
                  : "hover:bg-pink-500/10 dark:hover:bg-white/5 opacity-70 hover:opacity-100"
              )}
            >
              {activeTab === item.id && (
                <motion.div 
                  layoutId="student-active-tab"
                  className="absolute inset-0 bg-[#e8f0fe] dark:bg-[#3c4043] rounded -z-10"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon className={cn("w-4 h-4 transition-transform duration-300", activeTab === item.id ? "scale-110" : "group-hover:scale-110")} />
              <span className="relative z-10">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-transparent relative z-10">
        <div className="max-w-4xl mx-auto space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <h2 className="text-2xl font-bold tracking-tight">{navItems.find(i => i.id === activeTab)?.label}</h2>
            <div className="flex items-center gap-2 text-[13px] font-medium text-neutral-500">
              <span>Student</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-neutral-900 dark:text-white">{navItems.find(i => i.id === activeTab)?.label}</span>
            </div>
          </motion.div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'profile' && <StudentProfile t={t} user={studentData} setUsers={setUsers} cardClass={cardClass} theme={theme} />}
              {activeTab === 'grades' && <StudentGrades t={t} user={studentData} setUsers={setUsers} cardClass={cardClass} theme={theme} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function StudentProfile({ t, user, setUsers, cardClass, theme }: any) {
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [password, setPassword] = useState(user.password || '');
  const [msg, setMsg] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setUsers((prev: User[]) => prev.map(u => u.id === user.id ? { ...u, avatar, email, phone, password } : u));
    setMsg(t.success);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={cn("rounded-lg border p-6 lg:p-8", cardClass)}>
      <form onSubmit={handleSave} className="max-w-xl space-y-6">
        {msg && <div className="p-3 rounded bg-emerald-50 text-emerald-600 text-sm font-medium flex items-center gap-2 border border-emerald-100"><CheckCircle2 className="w-4 h-4"/> {msg}</div>}
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="relative group cursor-pointer w-24 h-24 shrink-0">
            {avatar && !avatar.includes('dicebear') ? (
              <img src={avatar} alt="Avatar Preview" className="w-24 h-24 rounded-full bg-neutral-100 dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center overflow-hidden">
                <UserCircle className="w-20 h-20 text-neutral-300 dark:text-neutral-600 mt-4" />
              </div>
            )}
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center border-2 border-white dark:border-[#0A0A0A] cursor-pointer hover:bg-blue-600 transition-colors shadow-sm">
              <Plus className="w-4 h-4" />
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{user.name}</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Class {user.class}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-[11px] font-medium mb-1.5 opacity-60 uppercase">{t.email}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={cn("w-full px-3 py-2 rounded-lg border outline-none text-[13px]", theme === 'dark' ? 'bg-[#0A0A0A] border-[#262626]' : 'bg-[#FAFAFA] border-[#E5E5E5]')} />
          </div>
          <div>
            <label className="block text-[11px] font-medium mb-1.5 opacity-60 uppercase">{t.phone}</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={cn("w-full px-3 py-2 rounded-lg border outline-none text-[13px]", theme === 'dark' ? 'bg-[#0A0A0A] border-[#262626]' : 'bg-[#FAFAFA] border-[#E5E5E5]')} />
          </div>
        </div>

        <div className="pt-6 border-t border-[#E5E5E5] dark:border-[#262626]">
          <h3 className="text-[13px] font-medium mb-4 flex items-center gap-2"><Key className="w-4 h-4"/> {t.changePassword}</h3>
          <div className="max-w-xs">
            <label className="block text-[11px] font-medium mb-1.5 opacity-60 uppercase">{t.newPassword}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} className={cn("w-full px-3 py-2 rounded-lg border outline-none text-[13px]", theme === 'dark' ? 'bg-[#0A0A0A] border-[#262626]' : 'bg-[#FAFAFA] border-[#E5E5E5]')} required />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button type="submit" className="px-5 py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black text-[13px] font-medium transition-colors shadow-sm">
            {t.save}
          </button>
        </div>
      </form>
    </div>
  );
}

function StudentGrades({ t, user, setUsers, cardClass, theme }: any) {
  const grades = user.grades || [];
  const [subject, setSubject] = useState('');
  const [term, setTerm] = useState('1/2567');
  const [score, setScore] = useState<number | ''>('');
  const [credits, setCredits] = useState<number | ''>(3);
  
  // Calculate GPA
  const totalCredits = grades.reduce((sum: number, g: Grade) => sum + (g.credits || 3), 0);
  const totalPoints = grades.reduce((sum: number, g: Grade) => sum + (Number(g.grade) * (g.credits || 3)), 0);
  const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';

  const handleAddGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (score === '' || !subject || credits === '') return;

    const newGrade: Grade = {
      id: Date.now().toString(),
      subject,
      term,
      score: Number(score),
      grade: calculateGrade(Number(score)),
      credits: Number(credits),
      timestamp: Date.now()
    };

    setUsers((prev: User[]) => prev.map(u => {
      if (u.id === user.id) {
        return { ...u, grades: [...(u.grades || []), newGrade] };
      }
      return u;
    }));

    setSubject('');
    setScore('');
    setCredits(3);
    alert(t.success);
  };

  return (
    <div className="space-y-8">
      <motion.div whileHover={{ y: -2 }} className={cn("p-8 rounded-lg border flex items-center justify-between relative overflow-hidden group", cardClass)}>
        <div className="absolute inset-0 bg-blue-50/50 dark:bg-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div>
          <p className="text-[12px] font-semibold text-neutral-500 uppercase tracking-wider">Cumulative GPA</p>
          <p className="text-5xl font-bold mt-2 tracking-tight text-[#1a73e8] dark:text-[#8ab4f8]">{gpa}</p>
        </div>
        <div className="w-20 h-20 rounded bg-[#1a73e8] flex items-center justify-center">
          <GraduationCap className="w-10 h-10 text-white" />
        </div>
      </motion.div>

      <div className={cn("rounded-lg border p-6", cardClass)}>
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-pink-500"/> {t.addGrade}</h3>
        <form onSubmit={handleAddGrade} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-semibold mb-1.5 opacity-70 uppercase tracking-wider">{t.subject}</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)} required className={cn("w-full px-4 py-2.5 rounded border outline-none text-[13px] transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500", theme === 'dark' ? 'bg-[#0A0A0A] border-[#262626]' : 'bg-white border-[#dadce0]')} placeholder="e.g. Magic 101" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1.5 opacity-70 uppercase tracking-wider">{t.term}</label>
            <input type="text" value={term} onChange={e => setTerm(e.target.value)} required className={cn("w-full px-4 py-2.5 rounded border outline-none text-[13px] transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500", theme === 'dark' ? 'bg-[#0A0A0A] border-[#262626]' : 'bg-white border-[#dadce0]')} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1.5 opacity-70 uppercase tracking-wider">Credits</label>
            <input type="number" min="0.5" step="0.5" value={credits} onChange={e => setCredits(e.target.value ? Number(e.target.value) : '')} required className={cn("w-full px-4 py-2.5 rounded border outline-none text-[13px] transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500", theme === 'dark' ? 'bg-[#0A0A0A] border-[#262626]' : 'bg-white border-[#dadce0]')} placeholder="e.g. 3" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1.5 opacity-70 uppercase tracking-wider">{t.score}</label>
            <input type="number" min="0" max="100" value={score} onChange={e => setScore(e.target.value ? Number(e.target.value) : '')} required className={cn("w-full px-4 py-2.5 rounded border outline-none text-[13px] transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500", theme === 'dark' ? 'bg-[#0A0A0A] border-[#262626]' : 'bg-white border-[#dadce0]')} placeholder="0-100" />
          </div>
          <div className="sm:col-span-4 flex justify-end mt-2">
            <button type="submit" className="px-6 py-2.5 rounded bg-[#1a73e8] hover:bg-[#1b66c9] text-white text-[13px] font-medium transition-colors">
              {t.save}
            </button>
          </div>
        </form>
      </div>

      <div className={cn("rounded-lg border overflow-hidden", cardClass)}>
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase opacity-70 border-b border-slate-200/20 bg-slate-500/5">
            <tr>
              <th className="px-6 py-4 font-semibold">{t.term}</th>
              <th className="px-6 py-4 font-semibold">{t.subject}</th>
              <th className="px-6 py-4 font-semibold text-center">Credits</th>
              <th className="px-6 py-4 font-semibold text-center">{t.score}</th>
              <th className="px-6 py-4 font-semibold text-center">{t.grade}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/10">
            {grades.length > 0 ? (
              grades.map((g: Grade) => (
                <tr key={g.id} className="hover:bg-slate-500/5">
                  <td className="px-6 py-4">{g.term}</td>
                  <td className="px-6 py-4 font-medium">{g.subject}</td>
                  <td className="px-6 py-4 text-center">{g.credits || 3}</td>
                  <td className="px-6 py-4 text-center">{g.score}</td>
                  <td className="px-6 py-4 text-center font-bold text-blue-600 dark:text-blue-400">{g.grade}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="px-6 py-12 text-center opacity-50">{t.noData}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

