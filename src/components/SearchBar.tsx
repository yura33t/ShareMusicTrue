import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { searchTracks, searchPlaylists, SoundCloudTrack, SoundCloudPlaylist } from '../services/soundcloud';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onResults: (results: SoundCloudTrack[], playlists: SoundCloudPlaylist[], query: string) => void;
  onLoading: (loading: boolean) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, onResults, onLoading }) => {
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (value.trim()) {
        onLoading(true);
        try {
          const [tracks, playlists] = await Promise.all([
            searchTracks(value),
            searchPlaylists(value)
          ]);
          onResults(tracks, playlists, value);
        } catch (error) {
          console.error('Error during combined search:', error);
          onResults([], [], value);
        } finally {
          onLoading(false);
        }
      } else {
        onResults([], [], '');
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [value]);


  return (
    <div className="relative w-full max-w-2xl group">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <SearchIcon className="w-5 h-5 text-white/40 group-focus-within:text-white/80 transition-colors" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Поиск треков, артистов, плейлистов..."
        className="w-full flat-input rounded-xl py-3 pl-11 pr-11 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-700"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-4 flex items-center text-white/40 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
