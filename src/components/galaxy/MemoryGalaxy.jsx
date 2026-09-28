import React, { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from '../../firebase';
import Journal from '../../Journal.jsx';
import TheVoid from '../../TheVoid.jsx';
import { signOut, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, limit } from "firebase/firestore";
import { Scan, Database, Activity, FileText, X, User as UserIcon, LogOut, ShieldCheck } from 'lucide-react';

// --- Component Imports ---
import GalaxyGraph from './GalaxyGraph.jsx';
import CommandDock from './CommandDock.jsx';
import EntryModal from './EntryModal.jsx';

// --- Lazy-loaded Panel Imports ---
// Only load panels when requested to reduce initial bundle size
const StarLog = lazy(() => import('./panels/StarLog.jsx'));
const OraclePanel = lazy(() => import('./panels/OraclePanel.jsx'));
const IdentityPanel = lazy(() => import('./panels/IdentityPanel.jsx'));
const SentimentPanel = lazy(() => import('./panels/SentimentPanel.jsx'));
const MoodExplorer = lazy(() => import('./panels/MoodExplorer.jsx'));

// Loading fallback component
const PanelLoader = () => (
  <div className="flex items-center justify-center h-full text-blue-400">
    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
      <span className="text-2xl">◆</span>
    </motion.div>
  </div>
);

// --- COMPONENT: CAPTAIN'S IDENTITY BADGE ---
const UserBadge = ({ user }) => {
    const [expanded, setExpanded] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState(null);
    const [passwordError, setPasswordError] = useState(null);
    const [passwordBusy, setPasswordBusy] = useState(false);

    const handleChangePassword = async (event) => {
        event.preventDefault();
        setPasswordError(null);
        setPasswordMessage(null);

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            setPasswordError('Complete all password fields.');
            return;
        }
        if (newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters.');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setPasswordError('New passwords do not match.');
            return;
        }

        setPasswordBusy(true);
        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            setPasswordMessage('Password changed successfully.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (error) {
            const messages = {
                'auth/invalid-credential': 'Current password is incorrect.',
                'auth/weak-password': 'New password must be at least 6 characters.',
                'auth/too-many-requests': 'Too many attempts. Please try again later.',
            };
            setPasswordError(messages[error.code] || 'Unable to change password. Please try again.');
        } finally {
            setPasswordBusy(false);
        }
    };

    const resetPasswordSection = () => {
        setShowChangePassword(false);
        setPasswordError(null);
        setPasswordMessage(null);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
    };

    return (
      <motion.div className="absolute top-6 right-6 z-50 flex flex-col items-end" initial={false} animate={expanded ? "open" : "closed"}>
          <motion.button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-3 bg-blue-950/30 backdrop-blur-md border border-blue-500/30 rounded-full pl-4 pr-1 py-1 shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:bg-blue-900/40 transition-all group"
              whileHover={{ scale: 1.05, borderColor: "rgba(59,130,246,0.6)" }}
              whileTap={{ scale: 0.95 }}
          >
              <div className="flex flex-col items-end mr-2">
                   <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest leading-none">
                      CDR. {user.displayName?.split(' ')[0] || 'PILOT'}
                   </span>
                   <span className="text-[8px] text-blue-500/60 font-tech tracking-wider">
                      ID: {user.uid.substring(0, 4)}...{user.uid.substring(user.uid.length - 4)}
                   </span>
              </div>
  
              <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-blue-400/50 group-hover:border-blue-300 transition-colors bg-black">
                  {user.photoURL ? (
                      <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                  ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-900">
                          <UserIcon size={18} className="text-blue-200" />
                      </div>
                  )}
                  <span className="absolute bottom-0 right-0 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-black"></span>
                  </span>
              </div>
          </motion.button>
  
          <AnimatePresence>
              {expanded && (
                  <motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      className="mt-2 w-56 bg-gray-950/90 backdrop-blur-2xl border border-blue-500/20 rounded-xl overflow-hidden shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] origin-top-right"
                  >
                      <button type="button" onClick={() => setExpanded(false)} aria-label="Close account menu" className="absolute right-2 top-2 flex min-h-10 min-w-10 items-center justify-center text-blue-300 hover:text-white">
                          <X size={18} />
                      </button>
                      <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 opacity-50" />
                      <div className="space-y-2 border-b border-white/5 p-4 pr-12">
                          <div className="flex items-center gap-2 text-xs text-blue-200">
                             <ShieldCheck size={14} className="text-emerald-400" />
                             <span>Secure Connection</span>
                          </div>
                          <p className="text-[10px] text-gray-500 font-tech truncate">{user.email}</p>
                      </div>
                      {user.providerData.some((provider) => provider.providerId === 'password') && (
                          <div className="border-b border-white/5">
                              <button
                                  type="button"
                                  onClick={() => {
                                      setShowChangePassword(!showChangePassword);
                                      setPasswordError(null);
                                      setPasswordMessage(null);
                                  }}
                                  className="w-full flex items-center gap-3 p-4 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 transition-colors text-xs font-bold uppercase tracking-wider"
                              >
                                  <ShieldCheck size={16} />
                                  {showChangePassword ? 'Close Password Section' : 'Change Password'}
                              </button>

                              {showChangePassword && (
                                  <form onSubmit={handleChangePassword} className="px-4 pb-4 space-y-3">
                                      <input
                                          type="password"
                                          value={currentPassword}
                                          onChange={(event) => setCurrentPassword(event.target.value)}
                                          placeholder="Current password"
                                          autoComplete="current-password"
                                          className="w-full px-3 py-2 bg-gray-900/70 border border-blue-500/20 rounded-lg text-xs text-blue-100 placeholder-gray-600 focus:outline-none focus:border-blue-400"
                                          required
                                      />
                                      <input
                                          type="password"
                                          value={newPassword}
                                          onChange={(event) => setNewPassword(event.target.value)}
                                          placeholder="New password"
                                          autoComplete="new-password"
                                          className="w-full px-3 py-2 bg-gray-900/70 border border-blue-500/20 rounded-lg text-xs text-blue-100 placeholder-gray-600 focus:outline-none focus:border-blue-400"
                                          required
                                          minLength={6}
                                      />
                                      <input
                                          type="password"
                                          value={confirmNewPassword}
                                          onChange={(event) => setConfirmNewPassword(event.target.value)}
                                          placeholder="Confirm new password"
                                          autoComplete="new-password"
                                          className="w-full px-3 py-2 bg-gray-900/70 border border-blue-500/20 rounded-lg text-xs text-blue-100 placeholder-gray-600 focus:outline-none focus:border-blue-400"
                                          required
                                          minLength={6}
                                      />

                                      {passwordError && (
                                          <p className="text-[10px] text-red-300">{passwordError}</p>
                                      )}
                                      {passwordMessage && (
                                          <p className="text-[10px] text-emerald-300">{passwordMessage}</p>
                                      )}

                                      <div className="flex gap-2">
                                          <button
                                              type="submit"
                                              disabled={passwordBusy}
                                              className="flex-1 rounded-lg border border-blue-500/40 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-blue-300 hover:bg-blue-500/10 disabled:opacity-50"
                                          >
                                              {passwordBusy ? 'Updating...' : 'Update Password'}
                                          </button>
                                          <button
                                              type="button"
                                              onClick={resetPasswordSection}
                                              disabled={passwordBusy}
                                              className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-200 disabled:opacity-50"
                                          >
                                              Cancel
                                          </button>
                                      </div>
                                  </form>
                              )}
                          </div>
                      )}
                      <button
                          onClick={() => signOut(auth)}
                          className="w-full flex items-center gap-3 p-4 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-xs font-bold uppercase tracking-wider"
                      >
                          <LogOut size={16} />
                          Disengage System
                      </button>
                  </motion.div>
              )}
          </AnimatePresence>
      </motion.div>
    );
};

// --- COMPONENT: BIG BANG INTRO ---
const IntroSequence = ({ onComplete }) => {
    return (
        <motion.div 
            className="absolute inset-0 z-[100] flex items-center justify-center bg-black"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1, delay: 2.5, ease: "easeOut" }}
            onAnimationComplete={onComplete}
        >
            <motion.div
                initial={{ scale: 0, opacity: 0, boxShadow: "0 0 0px #fff" }}
                animate={{ 
                    scale: [0, 1.5, 0.5, 50],
                    opacity: [0, 1, 1, 0],
                    boxShadow: ["0 0 0px #fff", "0 0 50px #fff", "0 0 100px #60a5fa", "0 0 500px #fff"]
                }}
                transition={{ duration: 2.5, times: [0, 0.4, 0.6, 1], ease: "easeInOut" }}
                className="w-4 h-4 bg-white rounded-full"
            />
            <motion.h1
                initial={{ opacity: 0, letterSpacing: "1em", scale: 2 }}
                animate={{ opacity: [0, 1, 0], letterSpacing: "0.2em", scale: 1 }}
                transition={{ duration: 2, delay: 0.2 }}
                className="absolute text-white font-bold text-sm md:text-xl uppercase tracking-widest mt-32 font-tech"
            >
                Initializing Universe
            </motion.h1>
        </motion.div>
    );
};

const scannerThemes = {
    gray: { panelBorder: "border-gray-500/30", scan: "via-gray-400", header: "bg-gray-950/30", headerBorder: "border-gray-500/20", icon: "text-gray-400", type: "text-gray-300", dot: "bg-gray-500" },
    blue: { panelBorder: "border-blue-500/30", scan: "via-blue-400", header: "bg-blue-950/30", headerBorder: "border-blue-500/20", icon: "text-blue-400", type: "text-blue-300", dot: "bg-blue-500" },
    pink: { panelBorder: "border-pink-500/30", scan: "via-pink-400", header: "bg-pink-950/30", headerBorder: "border-pink-500/20", icon: "text-pink-400", type: "text-pink-300", dot: "bg-pink-500" },
    purple: { panelBorder: "border-purple-500/30", scan: "via-purple-400", header: "bg-purple-950/30", headerBorder: "border-purple-500/20", icon: "text-purple-400", type: "text-purple-300", dot: "bg-purple-500" },
};

// --- COMPONENT: SCANNER HUD ---
const ScannerHUD = ({ data, onClose }) => {
    if (!data) return null;
    let config = { title: "UNKNOWN SIGNAL", type: "ANOMALY", desc: "Unable to parse data signature.", theme: scannerThemes.gray, icon: Scan };

    if (data.group === 'entry') {
        config = { title: "MEMORY LOG", type: "CHRONICLE DATA", desc: `Encrypted journal entry from ${data.name || 'Unknown Date'}. Contains personal reflection data.`, theme: scannerThemes.blue, icon: FileText };
    } else if (data.group === 'emotion') {
        config = { title: "EMOTIONAL CORE", type: "PSIONIC SIGNATURE", desc: `A cluster of memories bound by the feeling of "${(data.name || 'Unknown').toUpperCase()}". High resonance detected.`, theme: scannerThemes.pink, icon: Activity };
    } else if (data.group === 'keyword') {
        config = { title: "NEURAL LINK", type: "SEMANTIC TAG", desc: `Recurring concept: "${(data.name || 'Unknown').toUpperCase()}". Connected to multiple timeline entries.`, theme: scannerThemes.purple, icon: Database };
    }

    return (
        <motion.div initial={{ opacity: 0, x: 50, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 50, scale: 0.9 }} className={`absolute bottom-24 right-6 z-50 w-80 overflow-hidden rounded-xl border ${config.theme.panelBorder} bg-black/80 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.5)]`}>
            <motion.div initial={{ top: "-100%" }} animate={{ top: "200%" }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className={`absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent ${config.theme.scan} to-transparent opacity-50`} />
            <div className={`flex items-center justify-between ${config.theme.header} p-3 border-b ${config.theme.headerBorder}`}>
                <div className="flex items-center gap-2"><config.icon size={16} className={`${config.theme.icon} animate-pulse`} /><span className={`text-xs font-bold tracking-[0.2em] ${config.theme.type} font-tech`}>{config.type}</span></div>
                <button type="button" onClick={onClose} aria-label="Close memory signal" className="flex min-h-10 min-w-10 items-center justify-center text-gray-400 transition-colors hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-3">
                <h3 className="text-lg font-bold text-white uppercase tracking-wider text-shadow-sm">{config.title}</h3>
                <div className="h-px w-full bg-gradient-to-r from-white/20 to-transparent" />
                <p className="text-sm text-gray-300 font-tech leading-relaxed"><span className={config.theme.icon}>{">"}</span> {config.desc}</p>
                <div className="flex justify-between items-end mt-2 opacity-50">
                    <span className="text-[10px] text-gray-500 font-tech">ID: {data.id?.substring(0,8).toUpperCase()}...</span>
                    <div className="flex gap-1"><div className={`w-1 h-1 rounded-full ${config.theme.dot}`} /><div className={`w-1 h-1 rounded-full ${config.theme.dot} animate-bounce`} style={{ animationDelay: '0.1s'}} /><div className={`w-1 h-1 rounded-full ${config.theme.dot} animate-bounce`} style={{ animationDelay: '0.2s'}} /></div>
                </div>
            </div>
        </motion.div>
    );
};

// --- MAIN COMPONENT ---
const MemoryGalaxy = ({ user }) => {
  const [entries, setEntries] = useState([]);
  const [activePanel, setActivePanel] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [scannerData, setScannerData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isBlackHoleMode, setIsBlackHoleMode] = useState(false);
  const [init, setInit] = useState(false);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const ENTRIES_PER_PAGE = 100; // Load max 100 entries for graph performance

  // --- Effects ---
  useEffect(() => {
    if (!user) return;
    // OPTIMIZATION: Limit entries to prevent graph freeze
    const q = query(
      collection(db, 'users', user.uid, 'entries'), 
      orderBy("createdAt", "desc"),
      limit(ENTRIES_PER_PAGE)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rawEntries = [];
      snapshot.forEach((doc) => rawEntries.push({ id: doc.id, ...doc.data() }));
      setEntries(rawEntries);
    });
    return () => unsubscribe();
  }, [user.uid]);

  useEffect(() => {
    if (entries.length === 0 || isBlackHoleMode || loading) return;
    const showSignal = () => {
      const randomEntry = entries[Math.floor(Math.random() * entries.length)];
      if (!randomEntry) return;
      const snippet = randomEntry.content.length > 100 ? randomEntry.content.substring(0, 100) + "..." : randomEntry.content;
      let dateStr = "Unknown Stardate";
      if (randomEntry.createdAt && randomEntry.createdAt.toDate) dateStr = randomEntry.createdAt.toDate().toLocaleDateString();
      setNotification({ date: dateStr, message: snippet });
      setTimeout(() => setNotification(null), 6000);
    };
    const signalInterval = setInterval(showSignal, 15000);
    const initialTimeout = setTimeout(showSignal, 4000);
    return () => { clearInterval(signalInterval); clearTimeout(initialTimeout); };
  }, [entries, isBlackHoleMode, loading]);

  useEffect(() => { initParticlesEngine(async (engine) => { await loadSlim(engine); }).then(() => setInit(true)); }, []);
  useEffect(() => { setIsBlackHoleMode(activePanel === 'void'); }, [activePanel]);

    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key !== 'Escape') return;
            document.activeElement?.blur();
            setActivePanel(null);
            setSelectedNode(null);
            setScannerData(null);
            setNotification(null);
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, []);

  const togglePanel = (panel) => setActivePanel(activePanel === panel ? null : panel);

    const closePanel = () => {
        document.activeElement?.blur();
        setActivePanel(null);
    };

    const closeEntryModal = () => {
        document.activeElement?.blur();
        setSelectedNode(null);
    };

  const handleNodeClick = (node) => {
    const foundEntry = entries.find(e => e.id === node.id);
    if (foundEntry) {
        setSelectedNode(foundEntry);
        setActivePanel(null);
        setScannerData(null);
    } else {
        setScannerData({ ...node, group: node.group || (node.emotion ? 'emotion' : 'keyword') });
        setSelectedNode(null);
    }
  };

  const particlesOptions = useMemo(() => ({
    fullScreen: { enable: false },
    background: { color: { value: "transparent" } }, 
    fpsLimit: 60,
    particles: {
      color: { value: "#ffffff" },
      move: { enable: true, speed: 0.3, direction: "none", random: true, outModes: "out" },
      number: { value: 300, density: { enable: true, area: 800 } },
      opacity: { value: { min: 0.1, max: 0.8 }, animation: { enable: true, speed: 0.5, minimumValue: 0.1, sync: false } },
      size: { value: { min: 0.5, max: 2.5 } }
    },
  }), []);

  return (
    // FIX: DEEP SPACE RADIAL GRADIENT + OVERLAYS
    <div className={`relative w-full h-full overflow-hidden transition-colors duration-1000 ${isBlackHoleMode ? 'bg-black' : 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a1d29] via-[#000000] to-[#000000]'}`}>
        
        {/* TEXTURE LAYERS */}
        <div className="scanlines" />
        <div className="vignette" />

        <AnimatePresence>
            {loading && <IntroSequence onComplete={() => setLoading(false)} />}
        </AnimatePresence>

        {init && <Particles id="memory-galaxy-particles" options={particlesOptions} className="absolute inset-0 -z-20" />}

        <AnimatePresence>
            {isBlackHoleMode && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50">
                    <TheVoid onClose={() => togglePanel('void')} />
                </motion.div>
            )}
        </AnimatePresence>

        <motion.div 
            className={`absolute inset-0 z-0 transition-opacity duration-1000 ${isBlackHoleMode ? 'opacity-0' : 'opacity-100'}`}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: loading ? 0 : 1, scale: loading ? 0.5 : 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
        >
             <GalaxyGraph entries={entries} searchTerm={searchTerm} onNodeClick={handleNodeClick} />
        </motion.div>

        {!loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 1 }}>
                {/* Header */}
                <div className="absolute top-4 left-4 right-4 z-50 flex flex-col items-start gap-2 md:top-6 md:left-6 md:right-auto md:flex-row md:items-center md:gap-4">
                    <h1 className="text-lg font-bold text-white tracking-widest md:text-3xl">Memory Orbit</h1>
                    {!isBlackHoleMode && (
                        <input type="text" placeholder="Scan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-40 bg-blue-950/30 border border-blue-500/20 rounded-full py-2 px-4 text-sm text-blue-100 focus:outline-none focus:border-blue-400/50 transition-all backdrop-blur-sm md:w-48 md:py-1" />
                    )}
                </div>

                {!isBlackHoleMode && <UserBadge user={user} />}

                <AnimatePresence>
                    {notification && !isBlackHoleMode && (
                        <motion.div initial={{ opacity: 0, y: -20, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: -20, x: "-50%" }} className="absolute top-24 left-1/2 z-50 flex w-[calc(100%-1rem)] max-w-2xl cursor-pointer items-start gap-4 whitespace-normal rounded-2xl border border-white/10 bg-black/20 px-4 py-4 shadow-xl backdrop-blur-md transition-colors hover:bg-black/30 md:w-full md:px-6" onClick={() => setNotification(null)}>
                            <span className="text-xl animate-pulse text-blue-300">📡</span>
                            <div className="flex flex-col text-left">
                                <span className="text-[10px] font-bold text-blue-400/80 uppercase tracking-widest mb-1 font-tech">Signal Received • {notification.date}</span>
                                <p className="text-sm text-blue-100/90 leading-relaxed font-light">"{notification.message}"</p>
                            </div>
                            <button type="button" onClick={(event) => { event.stopPropagation(); setNotification(null); }} aria-label="Close signal notification" className="ml-auto flex min-h-10 min-w-10 shrink-0 items-center justify-center text-blue-300 hover:text-white"><X size={18} /></button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {scannerData && !isBlackHoleMode && <ScannerHUD data={scannerData} onClose={() => { document.activeElement?.blur(); setScannerData(null); }} />}
                </AnimatePresence>

                <CommandDock activePanel={activePanel} togglePanel={togglePanel} isBlackHoleMode={isBlackHoleMode} />
            </motion.div>
        )}

        <AnimatePresence mode="wait">
                    {activePanel === 'log' && <motion.div key="log" initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: 300 }} className="absolute inset-0 pointer-events-none z-40"><Suspense fallback={<PanelLoader />}><StarLog entries={entries} searchTerm={searchTerm} onNodeClick={handleNodeClick} onClose={closePanel}/></Suspense></motion.div>}
            
            {activePanel === 'journal' && !isBlackHoleMode && (
                <motion.div 
                    key="journal" 
                    initial={{ y: 200, opacity: 0, x: "-50%" }} 
                    animate={{ y: 0, opacity: 1, x: "-50%" }} 
                    exit={{ y: 200, opacity: 0, x: "-50%" }} 
                    className="absolute bottom-0 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 pb-[env(safe-area-inset-bottom)] md:bottom-32 md:pb-0"
                >
                    <div className="mobile-scroll max-h-[calc(100dvh-4.5rem)] overflow-y-auto rounded-t-3xl border border-blue-500/30 bg-gray-900/95 p-4 shadow-2xl backdrop-blur-xl md:max-h-none md:rounded-3xl md:bg-gray-900/60 md:p-6">
                        <Journal user={user} onClose={closePanel} />
                    </div>
                </motion.div>
            )}

            {activePanel === 'identity' && !isBlackHoleMode && <motion.div key="identity" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute inset-0 z-40 flex items-end justify-center pointer-events-none md:items-center"><div className="pointer-events-auto h-[calc(100dvh-4.5rem)] w-full max-w-4xl md:h-[80vh]"><Suspense fallback={<PanelLoader />}><IdentityPanel user={user} entries={entries} onClose={closePanel} /></Suspense></div></motion.div>}
            {activePanel === 'discover' && !isBlackHoleMode && <motion.div key="discover" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="absolute inset-0 z-40 flex items-end justify-center pointer-events-none md:items-center"><div className="pointer-events-auto h-[calc(100dvh-4.5rem)] w-full max-w-5xl md:h-[85vh]"><Suspense fallback={<PanelLoader />}><MoodExplorer entries={entries} onClose={closePanel} /></Suspense></div></motion.div>}
            {activePanel === 'vitals' && !isBlackHoleMode && <motion.div key="vitals" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 1, x: 50 }} className="absolute inset-0 z-40 flex items-end justify-center pointer-events-none md:items-center"><div className="pointer-events-auto w-full max-w-4xl p-2 md:p-4"><Suspense fallback={<PanelLoader />}><SentimentPanel entries={entries} onClose={closePanel} /></Suspense></div></motion.div>}
            {activePanel === 'oracle' && !isBlackHoleMode && <motion.div key="oracle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 flex items-end justify-center pointer-events-none md:items-center"><div className="pointer-events-auto h-[calc(100dvh-4.5rem)] w-full max-w-2xl"><Suspense fallback={<PanelLoader />}><OraclePanel entries={entries} onClose={closePanel} /></Suspense></div></motion.div>}
        </AnimatePresence>

        {selectedNode && <EntryModal entry={selectedNode} onClose={closeEntryModal} user={user} />}
    </div>
  );
};

export default MemoryGalaxy;