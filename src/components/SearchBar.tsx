import React, { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { searchTracks, searchPlaylists, SoundCloudTrack, SoundCloudPlaylist } from '../services/soundcloud';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onResults: (results: SoundCloudTrack[], playlists: SoundCloudPlaylist[], query: string) => void;
  onLoading: (loading: boolean) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, onResults, onLoading }) => {
  const [localValue, setLocalValue] = useState(value);
  const latestQueryRef = useRef(value);

  useEffect(() => {
    setLocalValue(value);
    latestQueryRef.current = value;
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalValue(newVal);
    latestQueryRef.current = newVal;
    onChange(newVal);
  };

  const handleClear = () => {
    setLocalValue('');
    latestQueryRef.current = '';
    onChange('');
    onResults([], [], '');
  };

  useEffect(() => {
    const queryToSearch = localValue.trim();

    if (!queryToSearch) {
      onResults([], [], '');
      onLoading(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      if (latestQueryRef.current.trim() !== queryToSearch) return;

      onLoading(true);
      try {
        const [tracks, playlists] = await Promise.all([
          searchTracks(queryToSearch),
          searchPlaylists(queryToSearch)
        ]);

        if (latestQueryRef.current.trim() === queryToSearch) {
          onResults(tracks, playlists, queryToSearch);
        }
      } catch (error) {
        console.error('Error during combined search:', error);
        if (latestQueryRef.current.trim() === queryToSearch) {
          onResults([], [], queryToSearch);
        }
      } finally {
        if (latestQueryRef.current.trim() === queryToSearch) {
          onLoading(false);
        }
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [localValue]);

  return (
    <div className="relative w-full max-w-2xl group">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <SearchIcon className="w-5 h-5 text-white/40 group-focus-within:text-white/80 transition-colors" />
      </div>
      <input
        type="text"
        value={localValue}
        onChange={handleInputChange}
        placeholder="Поиск треков, артистов, плейлистов..."
        className="w-full flat-input rounded-xl py-3 pl-11 pr-11 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-700 font-sans"
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-4 flex items-center text-white/40 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
