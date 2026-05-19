import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { searchTracks, SoundCloudTrack } from '../services/soundcloud';

interface SearchBarProps {
  onResults: (results: SoundCloudTrack[], query: string) => void;
  onLoading: (loading: boolean) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onResults, onLoading }) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim()) {
        onLoading(true);
        const results = await searchTracks(query);
        onResults(results, query);
        onLoading(false);
      } else {
        onResults([], '');
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <div className="relative w-full max-w-2xl">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <SearchIcon className="w-5 h-5 text-white/40" />
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for tracks, artists, or podcasts..."
        className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-12 pr-12 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
      />
      {query && (
        <button
          onClick={() => setQuery('')}
          className="absolute inset-y-0 right-4 flex items-center text-white/40 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
