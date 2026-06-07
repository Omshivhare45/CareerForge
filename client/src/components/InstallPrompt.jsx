import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Download, X, Sparkles, Check, Smartphone, Monitor } from 'lucide-react';

const DISMISS_KEY = 'cf_pwa_dismissed_at';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [timePassed, setTimePassed] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showPrompt, setShowPrompt] = useState(false);

  // Check if previously dismissed within 7 days
  const isDismissed = () => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (!dismissedAt) return false;
    const elapsed = Date.now() - parseInt(dismissedAt, 10);
    return elapsed < DISMISS_DURATION;
  };

  // Track screen size
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent default mini-infobar on mobile
      e.preventDefault();
      // Store event
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Listen for appinstalled event
  useEffect(() => {
    const handleAppInstalled = () => {
      toast.success('CareerForge installed successfully! 🚀', {
        duration: 5000,
        icon: '🎉',
        style: {
          background: '#09090b',
          color: '#f4f4f5',
          border: '1px solid #27272a',
          borderRadius: '16px'
        }
      });
      setDeferredPrompt(null);
      setShowPrompt(false);
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // 30 seconds timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setTimePassed(true);
    }, 30000); // 30 seconds
    return () => clearTimeout(timer);
  }, []);

  // Interaction detection
  useEffect(() => {
    if (interacted) return;

    const handleInteraction = () => {
      setInteracted(true);
      cleanup();
    };

    const cleanup = () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('scroll', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('scroll', handleInteraction);

    return cleanup;
  }, [interacted]);

  // Determine if the prompt should be shown
  useEffect(() => {
    if (deferredPrompt && timePassed && interacted && !isDismissed()) {
      setShowPrompt(true);
    } else {
      setShowPrompt(false);
    }
  }, [deferredPrompt, timePassed, interacted]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('PWA installation accepted');
    } else {
      console.log('PWA installation dismissed');
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      {isMobile ? (
        // Mobile Bottom Sheet
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-end justify-center">
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full max-w-lg bg-zinc-950 border-t border-zinc-800 rounded-t-[32px] p-6 shadow-2xl pb-8 relative"
          >
            {/* Grab handle */}
            <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto mb-6" />

            <button
              onClick={handleDismiss}
              className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-zinc-200 bg-zinc-900/50 hover:bg-zinc-900 rounded-full transition-colors border border-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-inner relative flex-shrink-0">
                <img src="/favicon.png" alt="CareerForge Logo" className="w-12 h-12 rounded-xl" />
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 p-1 rounded-full text-zinc-950">
                  <Sparkles className="w-3 h-3 fill-current" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-zinc-100 font-sans tracking-tight">Install CareerForge</h3>
                <p className="text-zinc-400 text-sm mt-1 leading-relaxed">
                  Get faster access and an app-like experience right from your home screen.
                </p>
              </div>
            </div>

            {/* Mobile Feature Highlights */}
            <div className="space-y-4 mb-6 bg-zinc-900/50 border border-zinc-900 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 bg-emerald-500/10 p-1 rounded-lg text-emerald-400">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">Learn faster</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">Quickly access zero-to-coding modules, sandbox playground, and roadmaps.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 bg-emerald-500/10 p-1 rounded-lg text-emerald-400">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">Open from home screen</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">Launch seamlessly as a standalone application directly from your home grid.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 bg-emerald-500/10 p-1 rounded-lg text-emerald-400">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">Full-screen experience</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">Focus completely on coding adventures with no browser search bars cluttering your view.</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleDismiss}
                className="py-3 px-4 rounded-xl text-sm font-semibold text-zinc-400 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-all active:scale-[0.98] cursor-pointer"
              >
                Maybe Later
              </button>
              <button
                onClick={handleInstall}
                className="py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 shadow-lg shadow-emerald-950/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer border border-emerald-500/20"
              >
                <Download className="w-4 h-4" />
                Install Now
              </button>
            </div>
          </motion.div>
        </div>
      ) : (
        // Desktop Premium Banner/Modal (using glassmorphism)
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-md bg-zinc-950/90 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
          >
            {/* Sparkle Glow Background */}
            <div className="absolute -top-12 -left-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 rounded-full transition-colors border border-zinc-900"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center mt-2">
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-inner mb-4 relative">
                <img src="/favicon.png" alt="CareerForge Emblem" className="w-16 h-16 rounded-xl" />
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 p-1.5 rounded-full text-zinc-950 border border-zinc-950">
                  <Monitor className="w-4 h-4" />
                </div>
              </div>

              <h3 className="text-2xl font-bold text-zinc-100 font-sans tracking-tight">Install CareerForge</h3>
              <p className="text-zinc-400 text-sm mt-2 max-w-xs leading-relaxed">
                Get faster access and an app-like experience. Run CareerForge as a standalone application on your desktop.
              </p>

              {/* Desktop Benefits */}
              <div className="w-full mt-5 space-y-2.5 text-left bg-zinc-900/40 border border-zinc-900 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/10 p-1 rounded-md text-emerald-400">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span className="text-xs font-medium text-zinc-300">Fast application startup</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/10 p-1 rounded-md text-emerald-400">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span className="text-xs font-medium text-zinc-300">Launches in a dedicated clean window</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/10 p-1 rounded-md text-emerald-400">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span className="text-xs font-medium text-zinc-300">Pin directly to taskbar or desktop</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 w-full mt-6">
                <button
                  onClick={handleDismiss}
                  className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-zinc-400 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-all active:scale-[0.98] cursor-pointer text-center"
                >
                  Maybe Later
                </button>
                <button
                  onClick={handleInstall}
                  className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 shadow-lg shadow-emerald-950/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer border border-emerald-500/20"
                >
                  <Download className="w-4 h-4" />
                  Install Now
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default InstallPrompt;
