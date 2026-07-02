import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import SMLogo from './components/SMLogo';
import SearchBar from './components/SearchBar';
import TrackCard from './components/TrackCard';
import PlaylistCard from './components/PlaylistCard';
import PlaylistDetail from './components/PlaylistDetail';
import ArtistDetail from './components/ArtistDetail';
import Settings from './components/Settings';
import Player from './components/Player';
import RightPanel from './components/RightPanel';
import PremiumModal from './components/PremiumModal';
import { PlayerProvider, usePlayer } from './PlayerContext';
import { getRecommendations, searchTracks, searchPlaylists, SoundCloudTrack, SoundCloudPlaylist } from './services/soundcloud';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Music, TrendingUp, Sparkles, Heart, FolderHeart, Search } from 'lucide-react';


const PLAYLIST_QUERIES = [
  'madkid',
  'популярные треки',
  'Miyagi',
  'Серега Пират',
  'популярное',
  'русский рэп',
  'phonk gaming',
  'хиты 2026'
];

const AppContent: React.FC = () => {
  const { likedTracks, setPlaylist } = usePlayer();
  const [searchResults, setSearchResults] = useState<SoundCloudTrack[]>([]);
  const [playlistSearchResults, setPlaylistSearchResults] = useState<SoundCloudPlaylist[]>([]);
  const [recommendations, setRecommendations] = useState<SoundCloudTrack[]>([]);
  const [recommendedPlaylists, setRecommendedPlaylists] = useState<SoundCloudPlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<SoundCloudPlaylist | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<{ id: number; username: string; avatar_url: string } | null>(null);
  const [playlistQueryIndex, setPlaylistQueryIndex] = useState(() => Math.floor(Math.random() * PLAYLIST_QUERIES.length));
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaylistsLoading, setIsPlaylistsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [view, setView] = useState('home');
  const [font, setFont] = useState('inter');

  const handleFontChange = (newFont: string) => {
    setFont('inter');
  };

  useEffect(() => {
    document.documentElement.classList.remove('font-minecraft-theme');
    document.body.classList.remove('font-minecraft-theme');
    localStorage.removeItem('app-font');
  }, []);



  const [recsOffset, setRecsOffset] = useState(0);

  const fetchRecs = async (offset = 0, plIndex = playlistQueryIndex) => {
    setIsLoading(true);
    setError(null);
    try {
      const plQuery = PLAYLIST_QUERIES[plIndex % PLAYLIST_QUERIES.length];
      const [recs, recPlaylists] = await Promise.all([
        getRecommendations(offset),
        searchPlaylists(plQuery)
      ]);
      
      if (recs.length === 0) {
        setError("Ошибка 403: SoundCloud заблокировал запрос. Попробуйте обновить Client ID в настройках.");
      }
      setRecommendations(recs);
      setRecommendedPlaylists(recPlaylists);
    } catch (err) {
      console.error("Error loading recommendations and playlists:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshPlaylists = async () => {
    setIsPlaylistsLoading(true);
    setError(null);
    try {
      const nextIndex = playlistQueryIndex + 1;
      setPlaylistQueryIndex(nextIndex);
      const plQuery = PLAYLIST_QUERIES[nextIndex % PLAYLIST_QUERIES.length];
      const recPlaylists = await searchPlaylists(plQuery);
      setRecommendedPlaylists(recPlaylists);
    } catch (err) {
      console.error("Error loading playlists:", err);
    } finally {
      setIsPlaylistsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecs(0, playlistQueryIndex);
  }, []);

  const [currentQuery, setCurrentQuery] = useState('');
  const [searchOffset, setSearchOffset] = useState(0);

  const handleSearchResults = (results: SoundCloudTrack[], playlists: SoundCloudPlaylist[], query: string, isAppend = false) => {
    if (isAppend) {
        setSearchResults(prev => [...prev, ...results]);
    } else {
        setSearchResults(results);
        setPlaylistSearchResults(playlists);
        setSearchOffset(0);
        setSelectedPlaylist(null); // Clear active playlist detail on new search
    }
    setIsSearching(results.length > 0 || playlists.length > 0 || isAppend);
    if (query.trim()) {
      setView('search');
    } else if (view === 'search') {
      setView('home');
    }
    if (results.length === 0 && playlists.length === 0 && isSearching && !isAppend) {
      setError("Ничего не найдено или ошибка 403 (SoundCloud заблокировал запрос).");
    } else {
      setError(null);
    }
  };

  const handleLoadMore = async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const nextOffset = searchOffset + 50;
      const moreResults = await searchTracks(currentQuery, nextOffset);
      if (moreResults && moreResults.length > 0) {
        handleSearchResults(moreResults, playlistSearchResults, currentQuery, true);
        setSearchOffset(nextOffset);
      }
    } catch (err) {
      console.error("Error fetching more results:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const renderContent = () => {
    if (view === 'playlist-detail' && selectedPlaylist) {
        return (
            <PlaylistDetail 
                playlist={selectedPlaylist} 
                onBack={() => {
                    setSelectedPlaylist(null);
                    setView(isSearching ? 'search' : 'home');
                }} 
            />
        );
    }

    if (view === 'artist-detail' && selectedArtist) {
        return (
            <ArtistDetail 
                artist={selectedArtist} 
                onBack={() => {
                    setSelectedArtist(null);
                    setView(isSearching ? 'search' : 'home');
                }} 
            />
        );
    }

    if (view === 'settings') {
        return (
            <Settings 
                currentFont={font} 
                onFontChange={handleFontChange} 
            />
        );
    }

    if (view === 'liked') {
        return (
            <motion.section 
                key="liked-songs"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ type: "spring", stiffness: 100, damping: 18 }}
                className="px-6 py-2 space-y-6"
            >
                <div className="flex items-center gap-3">
                    <Heart className="w-6 h-6 text-red-500 fill-current" />
                    <h2 className="text-2xl font-bold tracking-tight">Любимые треки</h2>
                </div>
                {likedTracks.length === 0 ? (
                    <div className="glass-panel rounded-2xl p-8 text-center max-w-md border border-white/5 mx-auto">
                        <Heart className="w-8 h-8 text-white/20 mx-auto mb-3" />
                        <p className="text-white/50 text-sm">Вы еще не добавили ни одного трека в любимые.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                        {likedTracks.map((track) => (
                            <TrackCard key={track.id} track={track} contextPlaylist={likedTracks} />
                        ))}
                    </div>
                )}
            </motion.section>
        );
    }

    if (view === 'search') {
        if (isSearching) {
            return (
                <motion.section 
                    key="search-results"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                    className="space-y-8"
                >
                    {/* Playlists Search Results */}
                    {playlistSearchResults.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <FolderHeart className="w-5 h-5 text-zinc-400" />
                                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 font-display">Плейлисты</h2>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                                {playlistSearchResults.map((playlist) => (
                                    <PlaylistCard 
                                        key={playlist.id} 
                                        playlist={playlist} 
                                        onClick={(p) => {
                                            setSelectedPlaylist(p);
                                            setView('playlist-detail');
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tracks Search Results */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Sparkles className="w-5 h-5 text-zinc-400" />
                            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 font-display">Треки</h2>
                        </div>
                        {searchResults.length === 0 ? (
                            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Отдельных треков не найдено.</p>
                        ) : (
                            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                                {searchResults.map((track) => (
                                    <TrackCard key={track.id} track={track} contextPlaylist={searchResults} />
                                ))}
                            </div>
                        )}
                    </div>

                    {searchResults.length > 0 && (
                        <button 
                            onClick={handleLoadMore}
                            disabled={isLoadingMore}
                            className="w-full max-w-xs mx-auto py-3 bg-[#16161c] border border-white/[0.03] hover:bg-[#1c1c24] disabled:opacity-50 text-white font-bold text-xs tracking-wider rounded-xl uppercase transition-colors flex items-center justify-center gap-2"
                        >
                            {isLoadingMore ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                                    ЗАГРУЗКА...
                                </>
                            ) : "Загрузить еще"}
                        </button>
                    )}
                </motion.section>
            );
        } else {
            return (
                <motion.section 
                    key="search-landing"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                    className="space-y-10"
                >
                    <div className="space-y-2.5">
                        <h1 className="text-2xl font-black tracking-tight text-white font-display leading-none">Поиск</h1>
                        <p className="text-zinc-500 text-[13px] font-sans leading-relaxed">
                            Ищите ваши любимые треки, исполнителей и плейлисты из SoundCloud в реальном времени.
                        </p>
                    </div>

                    <div className="flex flex-col items-center justify-center py-20 text-center border border-white/[0.02] bg-[#121215]/40 rounded-[24px] p-8 max-w-xl mx-auto shadow-xl">
                        <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mb-5">
                            <Search className="w-6 h-6 text-zinc-500" />
                        </div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300">Готов к поиску</h3>
                        <p className="text-[11px] text-zinc-500 mt-2 max-w-xs leading-relaxed">
                            Введите название песни, имя артиста или название плейлиста в поле поиска вверху. Мы найдем лучшие совпадения.
                        </p>
                    </div>
                </motion.section>
            );
        }
    }

    const uniqueArtists = Array.from(new Set(recommendations.map(t => t.user?.id)))
      .map(id => recommendations.find(t => t.user?.id === id)?.user)
      .filter(Boolean)
      .slice(0, 8);

    return (
        <motion.div 
            key="home-sections"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
            className="space-y-12"
        >
            {/* Minimalist Hero Header as in the mockup */}
            <div className="space-y-2.5">
              <h1 className="text-2xl font-black tracking-tight text-white font-display leading-none">Лента</h1>
              <p className="text-zinc-500 text-[13px] font-sans leading-relaxed">
                Ваша персональная лента новостей и рекомендаций.
              </p>
            </div>

            {/* Recommended Playlists */}
            {recommendedPlaylists.length > 0 && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 font-display">Новые</h2>
                        <button 
                            onClick={handleRefreshPlaylists}
                            disabled={isPlaylistsLoading}
                            className="text-[11px] font-bold text-zinc-400 hover:text-white transition-colors bg-[#16161c] border border-white/[0.03] py-1.5 px-4 rounded-xl uppercase tracking-wider flex items-center gap-1.5"
                        >
                            {isPlaylistsLoading && <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />}
                            Обновить
                        </button>
                    </div>
                    {isPlaylistsLoading ? (
                        <div className="flex items-center justify-center h-48">
                            <Loader2 className="w-6 h-6 animate-spin text-[#3b82f6]" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                            {recommendedPlaylists.slice(0, 6).map((playlist) => (
                                <PlaylistCard 
                                    key={playlist.id} 
                                    playlist={playlist} 
                                    onClick={(p) => {
                                        setSelectedPlaylist(p);
                                        setView('playlist-detail');
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Recommendations */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 font-display">Рекомендуемые треки</h2>
                    <button 
                        onClick={async () => {
                            const nextOffset = (recsOffset + 15) % 120;
                            setRecsOffset(nextOffset);
                            await fetchRecs(nextOffset);
                        }}
                        className="text-[11px] font-bold text-zinc-400 hover:text-white transition-colors bg-[#16161c] border border-white/[0.03] py-1.5 px-4 rounded-xl uppercase tracking-wider"
                    >
                        Обновить
                    </button>
                </div>
                
                {isLoading ? (
                    <div className="flex items-center justify-center h-48">
                        <Loader2 className="w-6 h-6 animate-spin text-[#3b82f6]" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                        {recommendations.slice(0, 12).map((track) => (
                            <TrackCard key={track.id} track={track} contextPlaylist={recommendations} />
                        ))}
                    </div>
                )}
            </div>

            {/* Recommended Artists (matching mockup "Рекомендуемые исполнители") */}
            {uniqueArtists.length > 0 && (
              <div className="space-y-6 pb-6">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 font-display">Рекомендуемые исполнители</h2>
                <div className="flex flex-wrap items-center gap-6">
                  {uniqueArtists.map((artist, idx) => {
                    const avatar = artist?.avatar_url || '';
                    return (
                      <div 
                        key={idx} 
                        onClick={() => {
                          if (artist) {
                            setSelectedArtist({
                              id: artist.id,
                              username: artist.username,
                              avatar_url: artist.avatar_url || ''
                            });
                            setView('artist-detail');
                          }
                        }}
                        className="flex flex-col items-center gap-3 w-[105px] text-center group cursor-pointer"
                      >
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-900 border border-white/[0.04] transition-transform duration-200 group-hover:scale-105 group-hover:border-blue-500/50">
                          <img src={avatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={artist?.username} />
                        </div>
                        <span className="text-xs font-bold text-zinc-400 group-hover:text-white transition-colors truncate w-full">{artist?.username}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
        </motion.div>
    );
  };

  return (
      <div className="flex h-screen bg-[#08080a] text-zinc-100 overflow-hidden font-sans selection:bg-white selection:text-black relative p-3 md:p-4 gap-4">
        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 transform lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <Sidebar onClose={() => setIsSidebarOpen(false)} onNavigate={(v) => { setView(v); setIsSearching(false); }} currentView={view} />
        </div>
        
        {/* Main Floating Rounded Panel (Bento/Card aesthetic) */}
        <div className="flex-1 bg-[#101013] border border-white/[0.03] rounded-[24px] overflow-y-auto relative flex flex-col scrollbar-hide animate-fade-in">
          
          {/* Header / Search */}
          <header className="sticky top-0 z-40 bg-[#101013]/90 backdrop-blur-md p-5 lg:p-6 flex items-center gap-4 border-b border-white/[0.02]">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-white/5 rounded-xl transition-colors shrink-0 text-zinc-400 hover:text-white"
            >
              <SMLogo className="w-6 h-6" />
            </button>
            
            <div className="flex-1">
              <SearchBar value={currentQuery} onChange={(val) => { setCurrentQuery(val); if (!val.trim()) { setIsSearching(false); setView('home'); } }} onResults={handleSearchResults} onLoading={setIsLoading} />
            </div>


          </header>

          {/* Main scrollable body */}
          <div className="px-6 lg:px-8 py-6 space-y-8 lg:space-y-12 pb-32">
            {error && (
              <div className="bg-red-500/10 border border-red-500/15 text-red-400 p-4 rounded-xl text-xs font-semibold uppercase tracking-wider">
                {error}
              </div>
            )}
            <AnimatePresence mode="wait">
              {renderContent()}
            </AnimatePresence>
          </div>
        </div>

        <RightPanel />

        <Player />

        <PremiumModal />
      </div>
  );
};

const App: React.FC = () => {
  return (
    <PlayerProvider>
      <AppContent />
    </PlayerProvider>
  );
};

export default App;
