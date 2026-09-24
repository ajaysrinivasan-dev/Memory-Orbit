import React, { useState } from 'react';
import { X } from 'lucide-react';

const TheVoid = ({ onClose }) => {
  const [text, setText] = useState('');
  const [isVenting, setIsVenting] = useState(false);

  const handleClose = () => {
    document.activeElement?.blur();
    onClose();
  };

  const handleVent = () => {
    if (!text.trim()) return;
    
    setIsVenting(true); // Trigger the "Suck" animation
    document.activeElement?.blur();
    
    // Wait for animation to finish, then close
    setTimeout(() => {
      onClose(); 
    }, 2000);
  };

  return (
     <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black animate-fade-in">
       <button type="button" onClick={handleClose} aria-label="Close The Void" className="absolute right-3 top-3 z-[110] flex min-h-12 min-w-12 items-center justify-center rounded-full border border-red-900/50 bg-black/60 text-red-300 hover:text-white">
         <X size={22} />
       </button>
       
       {/* --- BACKGROUND STARS --- */}
       <div className="absolute inset-0 opacity-50">
            <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full animate-pulse"></div>
            <div className="absolute top-3/4 left-1/3 w-2 h-2 bg-purple-500 rounded-full blur-sm animate-pulse"></div>
            <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
       </div>

       {/* --- THE SUPERMASSIVE BLACK HOLE --- */}
      <div className={`relative flex h-[min(78vw,500px)] w-[min(78vw,500px)] items-center justify-center transition-transform duration-[2000ms] ease-in-out ${isVenting ? 'scale-[5] rotate-180' : 'scale-100'}`}>
            
            {/* 1. Outer Glow (Lensing Effect) */}
            <div className="absolute w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[100px] animate-pulse"></div>

            {/* 2. Accretion Disk (Spinning Rings) */}
            <div className="absolute w-[420px] h-[420px] rounded-full border-[2px] border-transparent border-t-orange-500/50 border-r-red-600/50 blur-[1px] animate-[spin_8s_linear_infinite]"></div>
            <div className="absolute w-[400px] h-[400px] rounded-full border-[4px] border-transparent border-b-orange-400/30 border-l-yellow-600/30 blur-[2px] animate-[spin_12s_linear_infinite_reverse]"></div>
            
            {/* 3. Photon Ring (Bright Inner Rim) */}
            <div className="absolute w-[310px] h-[310px] rounded-full border-[1px] border-white/10 shadow-[0_0_50px_rgba(255,100,50,0.4)]"></div>

            {/* 4. The Event Horizon (Pure Black Void) */}
            <div className="w-72 h-72 bg-black rounded-full shadow-[0_0_60px_rgba(0,0,0,1)] z-10 relative flex items-center justify-center overflow-hidden">
                {/* Inner Darkness Pulse */}
                <div className="absolute inset-0 bg-black shadow-[inset_0_0_40px_rgba(50,0,0,0.5)] animate-pulse"></div>
            </div>
       </div>

       {/* --- THE UI LAYER --- */}
       <div className={`absolute z-50 flex flex-col items-center gap-6 transition-all duration-[1500ms] ease-in-out ${isVenting ? 'scale-0 opacity-0 translate-y-[200px] blur-xl' : 'scale-100 opacity-100'}`}>
           
           <h2 className="text-2xl font-bold uppercase tracking-[0.35em] text-transparent bg-gradient-to-b from-red-500 to-black bg-clip-text drop-shadow-glow md:text-4xl md:tracking-[0.5em]">The Void</h2>
           
           <div className="w-[calc(100vw-2rem)] max-w-[500px] rounded-2xl border border-red-900/30 bg-black/40 p-4 shadow-2xl backdrop-blur-md md:p-6">
               <textarea 
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type the thought you wish to destroy..."
                  className="h-32 w-full resize-none border-b border-red-900/30 bg-transparent p-4 text-center text-base text-red-100 transition-all placeholder-red-900/50 focus:border-red-500 focus:outline-none font-mono md:text-lg"
               />
           </div>
           
           <div className="flex w-full flex-col gap-2 px-4 sm:w-auto sm:flex-row sm:gap-4 sm:px-0">
                <button 
                    onClick={handleClose}
                    className="min-h-12 px-8 py-3 text-xs font-bold uppercase tracking-widest text-red-500/40 transition-all hover:scale-105 hover:text-red-400"
                >
                    Retreat
                </button>
                <button 
                    onClick={handleVent}
                    className="min-h-12 rounded-full bg-red-600 px-10 py-4 text-xs font-bold uppercase tracking-widest text-white shadow-[0_0_50px_rgba(220,38,38,0.4)] transition-all hover:scale-110 hover:bg-red-500 hover:shadow-[0_0_80px_rgba(220,38,38,0.6)] active:scale-95"
                >
                    Cast into Void
                </button>
           </div>
       </div>

    </div>
  );
};

export default TheVoid;