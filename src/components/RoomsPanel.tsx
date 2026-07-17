import React, { useState, useEffect, useRef } from 'react';
import { usePlayer } from '../PlayerContext';
import { getSafeArtworkUrl } from '../services/soundcloud';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Sparkles, Send, LogOut, ArrowRight, Loader2, Plus, LogIn,
  MessageSquare, UserPlus, Info, Check, AlertCircle, RefreshCw, X
} from 'lucide-react';

export const RoomsPanel: React.FC = () => {
  const { 
    user, setUser, logout,
    roomCode, roomMembers, roomChat, joinRoom, leaveRoom, sendChatMessage, requestSync,
    roomOwner, roomError, clearRoomError,
    currentTrack, isPlaying, togglePlay, isLoading
  } = usePlayer();

  // Auth tab selection: 'login' | 'register'
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  
  // Credentials input states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Form feedback states
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Active room states
  const [roomInput, setRoomInput] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Scroll chat container to bottom on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [roomChat]);

  // Handle auto-syncing of chat room state periodically
  useEffect(() => {
    if (roomCode) {
      const interval = setInterval(() => {
        requestSync();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [roomCode]);

  // Username validation helper according to strict requirements:
  // - English alphanumeric only
  // - Length >= 4
  // - Must not start with a digit
  const validateUsername = (name: string): { isValid: boolean; reason: string | null } => {
    if (name.length < 4) {
      return { isValid: false, reason: "Минимум 4 символа" };
    }
    const startsWithDigit = /^\d/;
    if (startsWithDigit.test(name)) {
      return { isValid: false, reason: "Не должно начинаться с цифры" };
    }
    const englishAlphanumeric = /^[a-zA-Z0-9]+$/;
    if (!englishAlphanumeric.test(name)) {
      return { isValid: false, reason: "Только английские буквы и цифры без спец. символов" };
    }
    return { isValid: true, reason: null };
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setAuthError("Заполните все поля");
      return;
    }

    // Validate username on client side first
    const validation = validateUsername(trimmedUser);
    if (!validation.isValid) {
      setAuthError(validation.reason);
      return;
    }

    if (password.length < 4) {
      setAuthError("Пароль должен быть не менее 4 символов");
      return;
    }

    setAuthLoading(true);

    try {
      const endpoint = authTab === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUser, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Произошла ошибка при авторизации");
      }

      if (authTab === 'register') {
        setAuthSuccess("Регистрация успешна! Теперь вы можете войти.");
        setAuthTab('login');
        setPassword('');
      } else {
        setUser(data.user);
      }
    } catch (err: any) {
      setAuthError(err.message || "Ошибка соединения с сервером");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCreateRoom = () => {
    if (!user) return;
    // Generate a random 6-character room code (e.g. "XR89PL")
    const generated = Math.random().toString(36).substring(2, 8).toUpperCase();
    joinRoom(generated, user.username, user.avatarUrl, true); // true = creating
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !roomInput.trim()) return;
    joinRoom(roomInput.trim(), user.username, user.avatarUrl, false); // false = joining
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    sendChatMessage(chatMessage.trim());
    setChatMessage('');
  };

  // Login/Registration screen
  if (!user) {
    const isUserValid = validateUsername(username);

    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 select-none">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-[#08080a] border border-white/[0.04] rounded-xl p-8 shadow-xl relative"
        >
          {/* Logo & Header */}
          <div className="flex flex-col items-center gap-2 mb-8">
            <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
              <Users className="w-8 h-8 text-zinc-300" />
            </div>
            <h1 className="text-xl font-black uppercase tracking-wider text-white font-display">Слушать вместе</h1>
            <p className="text-zinc-500 text-xs text-center max-w-xs font-medium">
              Объединяйтесь с друзьями, делитесь любимыми треками и общайтесь в реальном времени.
            </p>
          </div>

          {/* Auth Switcher */}
          <div className="flex bg-white/[0.02] p-1 rounded-lg mb-6 border border-white/[0.04]">
            <button
              onClick={() => { setAuthTab('login'); setAuthError(null); setAuthSuccess(null); }}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
                authTab === 'login' ? 'bg-white/[0.04] text-white border border-white/[0.08]' : 'text-zinc-500 hover:text-zinc-400'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Вход
            </button>
            <button
              onClick={() => { setAuthTab('register'); setAuthError(null); setAuthSuccess(null); }}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
                authTab === 'register' ? 'bg-white/[0.04] text-white border border-white/[0.08]' : 'text-zinc-500 hover:text-zinc-400'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Регистрация
            </button>
          </div>

          {/* Feedback alerts */}
          <AnimatePresence mode="wait">
            {authError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-semibold flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </motion.div>
            )}
            {authSuccess && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-semibold flex items-center gap-2"
              >
                <Check className="w-4 h-4 shrink-0" />
                <span>{authSuccess}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-zinc-500 text-[10px] uppercase tracking-widest font-bold mb-1.5 px-1">
                Имя пользователя (Только на англ)
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Например, musiclover"
                required
                className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/10 transition-all font-mono"
              />
              {/* Dynamic validation helpers under Username input */}
              {username.length > 0 && (
                <div className="mt-1.5 px-1 flex flex-col gap-0.5 text-[10px] text-zinc-500 font-medium">
                  <div className={`flex items-center gap-1.5 ${username.length >= 4 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                    <Check className="w-3 h-3 shrink-0" />
                    <span>Длина не менее 4 символов</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${/^\d/.test(username) ? 'text-red-400' : 'text-emerald-400'}`}>
                    {/^\d/.test(username) ? <X className="w-3 h-3 shrink-0" /> : <Check className="w-3 h-3 shrink-0" />}
                    <span>Не начинается на цифру</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${/^[a-zA-Z0-9]+$/.test(username) ? 'text-emerald-400' : 'text-red-400'}`}>
                    {/^[a-zA-Z0-9]+$/.test(username) ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0" />}
                    <span>Только английский алфавит и цифры</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-zinc-500 text-[10px] uppercase tracking-widest font-bold mb-1.5 px-1">
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 4 символа"
                required
                className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/10 transition-all font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading || (authTab === 'register' && !isUserValid.isValid)}
              className="w-full py-3.5 bg-white hover:bg-zinc-200 text-black disabled:opacity-40 rounded-lg font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 mt-2"
            >
              {authLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  Обработка...
                </>
              ) : (
                <>
                  {authTab === 'login' ? "Войти" : "Зарегистрироваться"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Info Card footer */}
          <div className="mt-6 p-3 bg-white/[0.01] border border-white/[0.03] rounded-lg flex gap-2">
            <Info className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-zinc-500 leading-normal font-medium">
              Имя пользователя должно состоять только из латинских букв и цифр, быть длиннее 4 символов и не начинаться с цифр. Это необходимо для корректной синхронизации лобби.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Lobby select (if logged in, but not in any active room yet)
  if (!roomCode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 select-none">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg bg-[#08080a] border border-white/[0.04] rounded-xl p-8 shadow-xl relative"
        >
          {/* User profile header card */}
          <div className="flex items-center justify-between border-b border-white/[0.05] pb-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Вы вошли как</span>
                <span className="text-white font-bold text-base font-mono">{user.username}</span>
              </div>
            </div>
            <button
              onClick={logout}
              className="px-3 py-1.5 border border-white/[0.04] hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
              title="Выйти"
            >
              <LogOut className="w-4 h-4" />
              Выйти
            </button>
          </div>

          {/* Room join/create error banner */}
          <AnimatePresence mode="wait">
            {roomError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-semibold flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{roomError}</span>
                </div>
                <button 
                  onClick={clearRoomError}
                  className="p-1 hover:bg-white/[0.05] rounded transition-colors text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Create Lobby Option */}
            <div className="flex flex-col justify-between p-6 bg-[#0c0d14]/40 border border-white/[0.04] rounded-lg transition-all hover:bg-[#0c0d14]/60">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-center justify-center">
                  <Plus className="w-5 h-5 text-zinc-400" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Создать лобби</h3>
                <p className="text-zinc-500 text-xs leading-relaxed font-medium">
                  Создайте новую комнату прослушивания, отправьте код друзьям и станьте диджеем!
                </p>
              </div>
              <button
                onClick={handleCreateRoom}
                className="w-full mt-6 py-3 bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                Создать
              </button>
            </div>

            {/* Join Lobby Option */}
            <div className="flex flex-col justify-between p-6 bg-[#0c0d14]/40 border border-white/[0.04] rounded-lg transition-all hover:bg-[#0c0d14]/60">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-center justify-center">
                  <LogIn className="w-5 h-5 text-zinc-400" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Присоединиться</h3>
                <p className="text-zinc-500 text-xs leading-relaxed font-medium">
                  Введите 6-значный код комнаты, который вам прислал ваш друг.
                </p>
              </div>
              
              <form onSubmit={handleJoinRoom} className="mt-6 space-y-2">
                <input
                  type="text"
                  maxLength={10}
                  value={roomInput}
                  onChange={(e) => {
                    setRoomInput(e.target.value.toUpperCase());
                    if (roomError) clearRoomError();
                  }}
                  placeholder="КОД КОМНАТЫ"
                  className="w-full bg-white/[0.02] border border-white/[0.05] rounded-lg px-4 py-2.5 text-center font-bold text-sm tracking-widest text-white placeholder-zinc-700 focus:outline-none focus:border-white/10 transition-all font-mono"
                />
                <button
                  type="submit"
                  disabled={!roomInput.trim()}
                  className="w-full py-3 bg-white hover:bg-zinc-200 disabled:opacity-40 text-black font-bold text-xs uppercase tracking-wider rounded-lg transition-colors"
                >
                  Войти в комнату
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Active sync co-listening room!
  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 p-4 select-none">
      
      {/* Left Column: Room members, Now Playing controls */}
      <div className="flex-1 flex flex-col gap-6">
        
        {/* Room Header Info Card */}
        <div className="bg-[#08080a] border border-white/[0.04] rounded-xl p-6 relative shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/[0.02] border border-white/[0.05] rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">КОМНАТА АКТИВНА</span>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold font-mono text-white tracking-widest uppercase">{roomCode}</h1>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(roomCode || '');
                      alert("Код комнаты скопирован!");
                    }}
                    className="px-2 py-0.5 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] text-[9px] text-zinc-300 font-bold uppercase rounded transition-colors"
                  >
                    Копировать
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => requestSync()}
                className="p-2 border border-white/[0.04] hover:bg-white/[0.05] text-zinc-400 hover:text-white rounded-lg transition-colors"
                title="Синхронизировать состояние"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={leaveRoom}
                className="px-4 py-2 border border-white/[0.04] hover:bg-red-500/10 text-zinc-400 hover:text-red-400 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>

        {/* Currently Playing Track in Room */}
        {currentTrack ? (
          <div className="bg-gradient-to-r from-[#030305] to-[#0a0c16] border border-white/[0.04] rounded-xl p-5 flex items-center justify-between gap-4 shadow-2xl relative overflow-hidden group">
            {/* Ambient blue background glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none transition-all group-hover:bg-blue-500/15" />
            
            <div className="flex items-center gap-4 min-w-0 relative z-10">
              <img 
                src={getSafeArtworkUrl(currentTrack.artwork_url || currentTrack.user?.avatar_url, 't300x300')} 
                alt={currentTrack.title} 
                className="w-14 h-14 rounded-lg border border-white/[0.05] shrink-0 object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <span className="text-[9px] text-blue-400 uppercase tracking-widest font-black block mb-0.5 font-mono">СЕЙЧАС ИГРАЕТ</span>
                <h3 className="text-white text-sm font-bold truncate max-w-sm uppercase font-mono">{currentTrack.title}</h3>
                <p className="text-zinc-400 text-[10px] truncate uppercase font-bold tracking-wide mt-0.5">
                  {currentTrack.user?.username || 'Unknown Artist'}
                </p>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-2 shrink-0 relative z-10">
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-white text-black hover:bg-zinc-200 active:scale-95 flex items-center justify-center transition-all shadow-lg shrink-0"
                title={isPlaying ? "Пауза" : "Воспроизвести"}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                ) : isPlaying ? (
                  <svg className="w-4 h-4 fill-current text-black" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                  <svg className="w-4 h-4 fill-current text-black ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#08080a] border border-white/[0.04] rounded-xl p-5 text-center text-zinc-500 text-xs py-8 relative overflow-hidden">
            <p className="font-bold uppercase tracking-wider mb-1 font-mono text-zinc-450">Очередь пуста</p>
            <p className="text-[10px] max-w-xs mx-auto text-zinc-500">Включите любой трек через плеер, и он заиграет у всех участников!</p>
          </div>
        )}

        {/* Room Participants/Members List */}
        <div className="bg-[#08080a] border border-white/[0.04] rounded-xl p-6 flex-1 flex flex-col min-h-[220px]">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2 shrink-0">
            <span>В КОМНАТЕ ({roomMembers.length})</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </h2>
          <div className="overflow-y-auto space-y-3 flex-1 pr-1">
            {roomMembers.map((member) => (
              <div 
                key={member.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  member.username === user.username 
                    ? 'bg-white/[0.02] border-white/[0.05]' 
                    : 'bg-transparent border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-white text-sm font-bold font-mono">{member.username}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      member.username === roomOwner 
                        ? 'text-blue-400 font-black' 
                        : 'text-zinc-550'
                    }`}>
                      {member.username === roomOwner ? '★ Владелец' : 'Слушатель'}
                    </span>
                  </div>
                </div>
                {member.username === user.username && (
                  <span className="px-2 py-0.5 bg-white/[0.03] text-zinc-300 text-[8px] font-black uppercase tracking-widest rounded border border-white/[0.05]">
                    Вы
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Room Synchronized Chat */}
      <div className="w-full lg:w-[360px] shrink-0 bg-[#08080a] border border-white/[0.04] rounded-xl flex flex-col h-[500px] lg:h-auto overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 border-b border-white/[0.04] bg-[#0c0d12]/20 flex items-center gap-2.5">
          <MessageSquare className="w-4 h-4 text-zinc-400" />
          <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400">Чат комнаты</h2>
        </div>

        {/* Chat Scrolling Logs */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 pr-2">
          {roomChat.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-zinc-600 space-y-1">
              <MessageSquare className="w-8 h-8 opacity-25 text-zinc-500" />
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Сообщений нет</p>
              <p className="text-[10px] max-w-[180px]">Напишите первое сообщение, чтобы начать беседу!</p>
            </div>
          ) : (
            roomChat.map((msg) => {
              const isSys = msg.username === 'System';
              const isMe = msg.username === user.username;

              if (isSys) {
                return (
                  <div key={msg.id} className="text-center">
                    <span className="inline-block px-3 py-1 bg-white/[0.02] border border-white/[0.04] text-[9px] text-zinc-400 font-bold uppercase tracking-wider rounded-full">
                      {msg.message}
                    </span>
                  </div>
                );
              }

              return (
                <div 
                  key={msg.id} 
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] text-zinc-500 font-bold px-1 font-mono">
                    <span>{msg.username}</span>
                    <span className="opacity-40">•</span>
                    <span className="font-normal">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className={`max-w-[85%] rounded-lg px-4 py-2 text-xs font-medium leading-relaxed ${
                    isMe 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white/[0.03] text-zinc-200 border border-white/[0.05] rounded-tl-none'
                  }`}>
                    {msg.message}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Chat Message Input form */}
        <form onSubmit={handleSendChat} className="p-4 border-t border-white/[0.04] bg-[#0c0d12]/10 flex gap-2">
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="Напишите сообщение..."
            className="flex-1 bg-white/[0.02] border border-white/[0.05] rounded-lg px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/10 transition-colors font-medium font-sans"
          />
          <button
            type="submit"
            disabled={!chatMessage.trim()}
            className="p-2.5 bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
};

export default RoomsPanel;
