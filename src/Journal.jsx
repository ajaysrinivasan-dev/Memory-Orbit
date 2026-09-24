import { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import Typewriter from 'typewriter-effect';
import { Sparkles, Mic, Square, X } from 'lucide-react';
import { rateLimitedFetch } from './utils/apiCache';

// Browser compatibility check
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function Journal({ user, onClose }) {
  const [entryText, setEntryText] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiReply, setAiReply] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupport, setSpeechSupport] = useState(false);
  const micRef = useRef(null);

  useEffect(() => {
    if (SpeechRecognition) {
      setSpeechSupport(true);
      const mic = new SpeechRecognition();
      mic.continuous = true; // Keep listening
      mic.interimResults = true;
      mic.lang = 'en-US';
      
      mic.onresult = (event) => {
        const results = Array.from(event.results);
        const latestResult = results[results.length - 1];
        if (latestResult.isFinal) {
           const transcript = latestResult[0].transcript;
           setEntryText(prev => prev + ' ' + transcript);
        }
      };

      mic.onend = () => { /* Optional: handle auto-stop */ };
      mic.onerror = (event) => {
        console.error("Speech error", event.error);
        setIsRecording(false);
      };
      
      micRef.current = mic;
    }

    // Cleanup function to prevent memory leaks
    return () => {
      if (micRef.current) {
        micRef.current.abort();
        micRef.current = null;
      }
    };
  }, []);

  const handleRecordClick = () => {
    if (!micRef.current) return;
    if (isRecording) {
      micRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        micRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Mic start error:", err);
      }
    }
  };

  const handleClose = () => {
    if (entryText.trim() && !window.confirm('Discard this unsaved memory?')) return;
    if (micRef.current && isRecording) {
      micRef.current.stop();
      setIsRecording(false);
    }
    document.activeElement?.blur();
    onClose?.();
  };

  const handleSaveEntry = async (e) => {
    e.preventDefault();
    if (entryText.trim() === '') return;
    if (isRecording && micRef.current) {
      micRef.current.stop();
      setIsRecording(false);
    }

    setLoading(true);
    setAiReply(''); 

    let entryRef;
    try {
      if (!user?.uid) {
        throw new Error("User is not authenticated.");
      }

      entryRef = await addDoc(collection(db, 'users', user.uid, 'entries'), {
        content: entryText,
        createdAt: serverTimestamp(),
        emotion: "Neutral",
        summary: "",
        keywords: [],
        sentiment: 0,
        aiStatus: "processing"
      });
    } catch (err) {
      console.error("[Journal] Firestore save failed:", err);
      if (err?.code === 'permission-denied') {
        console.error("[Journal] Firestore permission denied. Check authentication and Firestore security rules.");
      }
      setAiReply(`Unable to save memory: ${err.message}`);
      setLoading(false);
      return;
    }

    setEntryText('');

    try {
      const response = await rateLimitedFetch('/api/processEntry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: entryText }),
      });
      const cleanJsonString = response.reply.replace(/```json|```/g, '').trim();
      let aiJson;
      try {
        aiJson = JSON.parse(cleanJsonString);
      } catch (e) {
        aiJson = { reply: cleanJsonString, emotion: "Neutral", summary: "Log Entry", keywords: [] };
      }

      await updateDoc(entryRef, {
        emotion: aiJson.emotion || "Neutral",
        summary: aiJson.summary || "",
        keywords: aiJson.keywords || [],
        sentiment: aiJson.sentiment_score ?? 0,
        aiStatus: "complete"
      });

      setAiReply(aiJson.reply);
    } catch (err) {
      console.error("[Journal] AI processing failed:", err);
      try {
        await updateDoc(entryRef, { aiStatus: "failed" });
      } catch (statusError) {
        console.error("[Journal] Failed to update AI status:", statusError);
      }
      setAiReply('Memory saved. AI analysis is temporarily unavailable.');
    }
    setLoading(false);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col gap-4">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-widest text-white font-tech md:text-xl">
            <Sparkles className="text-blue-400" size={18} />
            LOG ENTRY
        </h2>
        <div className="flex items-center gap-2">
          <div className="text-[11px] text-blue-400 font-tech md:text-[12px]">
              {new Date().toLocaleDateString()}
          </div>
          {onClose && (
            <button type="button" onClick={handleClose} aria-label="Close journal" className="flex min-h-12 min-w-12 items-center justify-center rounded-lg text-blue-300 hover:bg-blue-500/10 hover:text-white">
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSaveEntry} className="relative flex min-h-0 flex-1 flex-col">
        <textarea
          value={entryText}
          onChange={(e) => setEntryText(e.target.value)}
          placeholder="Log your thoughts to the stars..."
          // GLASS STYLING: bg-black/20 allowing stars to show through
          className="min-h-[min(40vh,16rem)] w-full flex-1 resize-none rounded-xl border border-blue-500/20 bg-black/20 p-4 text-base leading-relaxed text-blue-100 backdrop-blur-sm transition-all placeholder-blue-500/30 focus:border-blue-400/80 focus:outline-none custom-scrollbar md:min-h-[200px] md:text-lg"
          disabled={loading}
        />

        <div className="mt-3 flex gap-3 md:mt-4 md:gap-4">
           {/* Upload Button */}
           <button
             type="submit"
             className="min-h-12 flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold uppercase tracking-wider text-white transition-all shadow-[0_0_15px_rgba(37,99,235,0.5)] hover:bg-blue-500 hover:shadow-[0_0_25px_rgba(37,99,235,0.7)] disabled:cursor-not-allowed disabled:opacity-50 font-tech md:px-6"
             disabled={loading}
           >
             {loading ? 'Transmitting...' : 'Upload to Galaxy'}
           </button>
           
           {/* Mic Button - Restored */}
           {speechSupport && (
             <button
               type="button"
               onClick={handleRecordClick}
               aria-label={isRecording ? 'Stop recording' : 'Start recording'}
               className={`min-h-12 min-w-12 rounded-xl border px-4 font-bold transition-all flex items-center justify-center gap-2 ${
                 isRecording
                   ? 'bg-red-500/20 border-red-500 text-red-100 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                   : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/30'
               }`}
             >
               {isRecording ? <Square size={18} /> : <Mic size={20} />}
             </button>
           )}
        </div>
      </form>

      {/* AI Reply Area - Sci-Fi Terminal Style */}
      {aiReply && (
        <div className="mt-4 max-h-48 overflow-y-auto rounded-r-xl border-l-2 border-purple-500 bg-black/60 p-4 backdrop-blur-md shadow-lg mobile-scroll">
          <p className="text-purple-400 text-[10px] mb-2 uppercase tracking-[0.2em] font-tech flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></span>
            Incoming Transmission
          </p>
          <div className="text-purple-100 text-sm font-light leading-relaxed font-tech">
            <Typewriter
              onInit={(typewriter) => {
                typewriter.changeDelay(20).typeString(aiReply).start();
              }}
              options={{ cursor: ' █' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Journal;