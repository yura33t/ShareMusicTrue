import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import SMLogo from './components/SMLogo';
import SearchBar from './components/SearchBar';
import TrackCard from './components/TrackCard';
import PlaylistCard from './components/PlaylistCard';
import PlaylistDetail from './components/PlaylistDetail';
import Player from './components/Player';
import { PlayerProvider, usePlayer } from './PlayerContext';
import { getRecommendations, searchTracks, searchPlaylists, SoundCloudTrack, SoundCloudPlaylist } from './services/soundcloud';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Music, TrendingUp, Sparkles, Heart, FolderHeart } from 'lucide-react';


const AppContent: React.FC = () => {
  const { likedTracks, setPlaylist } = usePlayer();
  const [searchResults, setSearchResults] = useState<SoundCloudTrack[]>([]);
  const [playlistSearchResults, setPlaylistSearchResults] = useState<SoundCloudPlaylist[]>([]);
  const [recommendations, setRecommendations] = useState<SoundCloudTrack[]>([]);
  const [recommendedPlaylists, setRecommendedPlaylists] = useState<SoundCloudPlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<SoundCloudPlaylist | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [view, setView] = useState('home');

  useEffect(() => {
    // If we're looking at a specific playlist, we don't overwrite playback queue with home/search unless we click a song
    if (view !== 'playlist-detail') {
      setPlaylist(view === 'liked' ? likedTracks : (isSearching ? searchResults : recommendations));
    }
  }, [recommendations, searchResults, likedTracks, view, isSearching]);

  useEffect(() => {
    const fetchRecs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [recs, recPlaylists] = await Promise.all([
          getRecommendations(),
          searchPlaylists('Серега Пират') // Load popular/fun lists on home screen
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
    fetchRecs();
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
    setCurrentQuery(query);
    setIsSearching(results.length > 0 || playlists.length > 0 || isAppend);
    setView('search');
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

    if (view === 'liked') {
        return (
            <motion.section 
                key="liked-songs"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
            >
                <div className="flex items-center gap-3">
                    <Heart className="w-6 h-6 text-red-500 fill-current" />
                    <h2 className="text-3xl font-bold tracking-tight">Liked Songs</h2>
                </div>
                {likedTracks.length === 0 ? (
                    <p className="text-white/50">You haven't liked any songs yet.</p>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
                        {likedTracks.map((track) => (
                            <TrackCard key={track.id} track={track} />
                        ))}
                    </div>
                )}
            </motion.section>
        );
    }

    if (view === 'search' && isSearching) {
        return (
            <motion.section 
                key="search-results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
            >
                {/* Playlists Search Results */}
                {playlistSearchResults.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <FolderHeart className="w-5 h-5 text-white/40" />
                            <h2 className="text-xl font-bold tracking-tight uppercase">Playlists</h2>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
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
                        <Sparkles className="w-5 h-5 lg:w-6 lg:h-6 text-white/40" />
                        <h2 className="text-xl font-bold tracking-tight uppercase">Tracks</h2>
                    </div>
                    {searchResults.length === 0 ? (
                        <p className="text-white/50 text-xs font-mono uppercase tracking-wider">No separate tracks found.</p>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
                            {searchResults.map((track) => (
                                <TrackCard key={track.id} track={track} />
                            ))}
                        </div>
                    )}
                </div>

                {searchResults.length > 0 && (
                    <button 
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 disabled:bg-white/2 disabled:opacity-50 text-white font-mono text-xs font-bold tracking-widest rounded-none border border-white/5 uppercase transition-all flex items-center justify-center gap-2"
                    >
                        {isLoadingMore ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin text-white/40" />
                                LOADING...
                            </>
                        ) : "LOAD MORE"}
                    </button>
                )}
            </motion.section>
        );
    }

    return (
        <div className="space-y-10">
            {/* Recommended Playlists (Russia/Serega Pirat theme) */}
            {recommendedPlaylists.length > 0 && (
                <motion.section 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-6 py-2 space-y-6"
                >
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold uppercase tracking-widest text-white/40">Featured Playlists</h2>
                    </div>
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
                </motion.section>
            )}

            {/* Recommendations */}
            <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-6 py-2 space-y-6"
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold uppercase tracking-widest text-white/40">Recommended Tracks</h2>
                    <button 
                        onClick={async () => {
                            setIsLoading(true);
                            const recs = await getRecommendations();
                            const recPlaylists = await searchPlaylists('Serega Pirat');
                            setRecommendations(recs);
                            setRecommendedPlaylists(recPlaylists);
                            setIsLoading(false);
                        }}
                        className="text-xs font-bold font-mono text-white/40 hover:text-white transition-colors border border-white/10 px-3 py-1"
                    >
                        REFRESH
                    </button>
                </div>
                
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-white/20" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                        {recommendations.map((track) => (
                            <TrackCard key={track.id} track={track} />
                        ))}
                    </div>
                )}
            </motion.section>
        </div>
    );
  };

  return (
      <div className="flex h-screen bg-[#050505] text-white overflow-hidden font-sans selection:bg-white selection:text-black relative">
        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 transform lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <Sidebar onClose={() => setIsSidebarOpen(false)} onNavigate={(v) => { setView(v); setIsSearching(false); }} />
        </div>
        
        <main className="flex-1 flex flex-col relative overflow-y-auto pb-32 scrollbar-hide">
          {/* Header / Search */}
          <header className="sticky top-0 z-40 bg-[#050505]/80 backdrop-blur-xl p-4 lg:p-8 flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <SMLogo className="w-6 h-6 text-white" />
            </button>
            
            <div className="flex-1">
              <SearchBar onResults={handleSearchResults} onLoading={setIsLoading} />
            </div>

            <div className="hidden sm:flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors cursor-pointer">
                <SMLogo className="w-5 h-5 text-white" />
              </div>
              <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center font-bold text-sm cursor-pointer hover:scale-105 transition-transform">
                Y
              </div>
            </div>
          </header>

          <div className="px-4 lg:px-8 space-y-8 lg:space-y-12">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}
            <AnimatePresence mode="wait">
              {renderContent()}
            </AnimatePresence>
          </div>
        </main>

        <Player />
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
