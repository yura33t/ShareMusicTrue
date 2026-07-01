import React from 'react';
import { motion } from 'motion/react';
import { Type, Check } from 'lucide-react';

interface SettingsProps {
  currentFont: string;
  onFontChange: (font: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ currentFont, onFontChange }) => {
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
          Персонализируйте интерфейс Share Music под ваш вкус.
        </p>
      </div>

      <div className="space-y-8">
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
