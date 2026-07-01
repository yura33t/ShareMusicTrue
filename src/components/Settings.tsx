import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Type, Check, Crown, Sparkles, Gift, ArrowRight } from 'lucide-react';
import { usePlayer } from '../PlayerContext';

interface SettingsProps {
  currentFont: string;
  onFontChange: (font: string) => void;
}

const Settings: React.FC<SettingsProps> = () => {
  const { isPremium, activatePremium } = usePlayer();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const ok = activatePremium(code);
    if (ok) {
      setSuccess(true);
      setCode('');
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError('Неверный код активации. Обратитесь к разработчику за кодом.');
    }
  };

  return (
    <motion.section 
      key="settings-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: "spring", stiffness: 120, damping: 20 }}
      className="space-y-10 max-w-2xl"
    >
      {/* Title */}
      <div className="space-y-2.5">
        <h1 className="text-2xl font-black tracking-tight text-white font-display leading-none">Настройки</h1>
        <p className="text-zinc-500 text-[13px] font-sans leading-relaxed">
          Персонализируйте интерфейс и управляйте вашей подпиской в Share Music.
        </p>
      </div>

      <div className="space-y-8">
        {/* PREMIUM MEMBERSHIP CARD */}
        <div className={`relative overflow-hidden rounded-3xl border p-6 transition-all duration-300 ${
          isPremium 
            ? 'bg-gradient-to-br from-amber-500/10 via-yellow-600/5 to-transparent border-amber-500/30 shadow-lg shadow-amber-500/5' 
            : 'bg-[#121215]/80 border-white/[0.03]'
        }`}>
          {/* Subtle gold glow background for premium */}
          {isPremium && (
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
          )}

          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              isPremium 
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20' 
                : 'bg-zinc-800 text-zinc-400'
            }`}>
              <Crown className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Статус подписки</h3>
                {isPremium && (
                  <span className="bg-amber-500/15 text-amber-400 text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded border border-amber-500/25 animate-pulse">
                    PREMIUM
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">Управляйте возможностями вашего аккаунта</p>
            </div>
          </div>

          <div className="pt-6">
            {isPremium ? (
              <div className="space-y-4">
                <div className="flex gap-3.5 items-start">
                  <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white uppercase tracking-tight">Ваш Премиум-аккаунт активен! ✨</p>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Вы получили безлимитный доступ к скачиванию музыки на любое устройство. Нажмите на кнопку скачивания в проигрывателе или списках треков, чтобы сохранить MP3-файл.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-3.5">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Премиум-подписка открывает возможность скачивания любых треков в высоком качестве (MP3). Активируйте подписку бесплатно с помощью секретного кода активации.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-[#d4af37]">
                    <Gift className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Для получения кода обратитесь к разработчику или введите секретный ключ тестировщика.</span>
                  </div>
                </div>

                <form onSubmit={handleActivate} className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 space-y-1.5">
                    <input 
                      type="text"
                      placeholder="Введите промокод..."
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value);
                        setError(null);
                      }}
                      className="w-full bg-[#16161d] border border-white/5 focus:border-amber-500/50 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                    {error && (
                      <p className="text-[10px] text-red-400 font-medium ml-1">{error}</p>
                    )}
                    {success && (
                      <p className="text-[10px] text-green-400 font-medium ml-1">Премиум успешно активирован! 🎉</p>
                    )}
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="py-3 px-6 bg-zinc-100 hover:bg-white text-black font-bold uppercase text-[10px] tracking-wider rounded-xl transition-colors shrink-0 flex items-center justify-center gap-1.5"
                  >
                    <span>Активировать</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </motion.button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Font Picker card */}
        <div className="bg-[#121215]/80 border border-white/[0.03] rounded-3xl p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Типографика и шрифты</h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">Выберите шрифт для отображения интерфейса приложения</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Standard Inter Font */}
            <div
              className="flex items-center justify-between p-5 rounded-2xl border bg-[#161b2c] border-blue-500/30 text-white text-left"
            >
              <div className="space-y-1">
                <span className="text-sm font-bold uppercase tracking-wider block text-white">Интер (Стандартный)</span>
                <span className="text-xs text-zinc-400 font-sans block">Высококачественный современный шрифт, установленный по умолчанию для всего приложения.</span>
              </div>
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default Settings;
