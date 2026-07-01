import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crown, Sparkles, X, Gift, Check, ArrowRight, Download } from 'lucide-react';
import { usePlayer } from '../PlayerContext';

const PremiumModal: React.FC = () => {
  const { 
    premiumModalOpen, 
    setPremiumModalOpen, 
    activatePremium, 
    pendingDownloadTrack,
    downloadTrack,
    setPendingDownloadTrack
  } = usePlayer();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!premiumModalOpen) return null;

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const isActivated = activatePremium(code);
    if (isActivated) {
      setSuccess(true);
      setTimeout(() => {
        setPremiumModalOpen(false);
        setSuccess(false);
        setCode('');
        
        // If there was a pending download, trigger it now!
        if (pendingDownloadTrack) {
          downloadTrack(pendingDownloadTrack);
          setPendingDownloadTrack(null);
        }
      }, 2000);
    } else {
      setError('Неверный код активации. Обратитесь к разработчику за кодом.');
    }
  };

  const handleClose = () => {
    setPremiumModalOpen(false);
    setPendingDownloadTrack(null);
    setError(null);
    setCode('');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="bg-[#0c0c0e] border border-white/10 rounded-3xl max-w-sm w-full overflow-hidden text-white relative shadow-2xl"
        >
          {/* Close button */}
          <button 
            onClick={handleClose}
            className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header area */}
          <div className="p-8 pb-4 text-center flex flex-col items-center space-y-4">
            <motion.div 
              animate={success ? { rotate: [0, 10, -10, 0], scale: [1, 1.1, 1.1, 1] } : {}}
              className="w-14 h-14 rounded-2xl bg-zinc-900 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37] shadow-inner mb-2"
            >
              <Crown className="w-6 h-6 stroke-[1.5]" />
            </motion.div>
            
            <div className="space-y-1">
              <h2 className="text-lg font-bold uppercase tracking-widest text-zinc-100 font-display">
                {success ? 'Доступ Открыт' : 'Премиум подписка'}
              </h2>
              <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">
                {success ? 'Успешная активация' : 'Оригинальное качество звука'}
              </p>
            </div>
          </div>

          <div className="p-8 pt-2 space-y-6">
            {success ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-4 py-8"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-900 border border-emerald-500/30 text-emerald-400">
                  <Check className="w-5 h-5 stroke-[2]" />
                </div>
                <p className="text-xs text-zinc-400 font-medium leading-relaxed max-w-xs mx-auto">
                  Спасибо! Статус аккаунта успешно обновлен. Теперь вам доступно безлимитное скачивание треков.
                </p>
                {pendingDownloadTrack && (
                  <p className="text-[11px] text-zinc-500 font-mono animate-pulse">
                    Подготовка файла к загрузке...
                  </p>
                )}
              </motion.div>
            ) : (
              <>
                <div className="space-y-4 border-t border-b border-white/[0.03] py-5">
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-white/[0.04] flex items-center justify-center text-zinc-400 shrink-0">
                      <Download className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Сохранение треков</h4>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">Скачивайте любимую музыку в оригинальном качестве на любое устройство.</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-white/[0.04] flex items-center justify-center text-[#d4af37]/80 shrink-0">
                      <Gift className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-display">Тестирование</h4>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">Используйте ваш персональный или тестовый код для бесплатной активации.</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleActivate} className="space-y-4">
                  <div className="space-y-2">
                    <input 
                      type="text"
                      placeholder="Введите код активации"
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value);
                        setError(null);
                      }}
                      className="w-full bg-zinc-950/60 border border-white/[0.04] focus:border-[#d4af37]/45 rounded-xl px-4 py-3.5 text-xs text-zinc-100 placeholder-zinc-700 font-mono focus:outline-none transition-colors text-center uppercase tracking-widest"
                    />
                    {error && (
                      <p className="text-xs text-red-400/90 text-center font-medium">{error}</p>
                    )}
                  </div>

                  <motion.button 
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    className="w-full py-3.5 bg-[#d4af37] hover:bg-[#c19a2e] text-black font-bold uppercase text-[10px] tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2 font-display"
                  >
                    <span>Активировать доступ</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PremiumModal;
