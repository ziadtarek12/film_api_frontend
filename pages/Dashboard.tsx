import React, { useState, useEffect, useCallback } from 'react';
import { api, FilmFilters, addLog } from '../services/api';
import { useAuth } from '../App';
import { Film, WatchlistEntry, SortOption } from '../types';
import { FilmCard } from '../components/FilmCard';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { GraphView } from '../components/GraphView';
import { Input } from '../components/Input';

type Tab = 'discover' | 'watchlist' | 'recommendations';
type ViewMode = 'grid' | 'graph';

const Dashboard: React.FC = () => {
  const { token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('discover');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Data State
  const [films, setFilms] = useState<Film[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [recommendations, setRecommendations] = useState<Film[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filters/Pagination State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sort, setSort] = useState<string>(SortOption.RatingDesc);
  
  // Advanced Search State
  const [showFilters, setShowFilters] = useState(false);
  const [searchFilters, setSearchFilters] = useState<FilmFilters>({
    title: '',
    genres: '',
    actors: '',
    directors: ''
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFilmId, setSelectedFilmId] = useState<number | null>(null);
  const [priority, setPriority] = useState(5);
  const [notes, setNotes] = useState('');

  // --- Data Fetching ---

  const fetchWatchlist = useCallback(async () => {
    if (!token) return;
    try {
      // Fetch a larger initial batch to ensure "In Watchlist" checks are accurate for most recent items
      const res = await api.getWatchlist(token, false, 1, 100);
      setWatchlist(res.watchlist);
    } catch (e) {
      console.error(e);
    }
  }, [token]);

  const fetchFilms = useCallback(async (reset = false) => {
    if (!token) return;
    setLoading(true);
    try {
      const p = reset ? 1 : page;
      // Limit graph view items for performance
      const size = viewMode === 'graph' ? 50 : 20; 
      
      // Clean filters (trim whitespace)
      const cleanedFilters: FilmFilters = {
        title: searchFilters.title.trim(),
        genres: searchFilters.genres.trim(),
        actors: searchFilters.actors.trim(),
        directors: searchFilters.directors.trim(),
      };

      const res = await api.getFilms(token, p, size, sort, cleanedFilters);
      
      setFilms(prev => reset ? res.films : [...prev, ...res.films]);
      setHasMore(res.films.length === size); 
      setPage(p + 1);
    } catch (e) {
      console.error(e);
      if (e instanceof Error && e.message.includes('401')) logout();
    } finally {
      setLoading(false);
    }
  }, [token, page, sort, searchFilters, viewMode, logout]);

  const fetchRecommendations = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.getRecommendations(token);
      setRecommendations(res.recommendations);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial Load
  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  // Tab Effects
  useEffect(() => {
    setPage(1);
    if (activeTab === 'discover') fetchFilms(true);
    if (activeTab === 'watchlist') fetchWatchlist();
    if (activeTab === 'recommendations') fetchRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, sort, viewMode]); 

  // --- Handlers ---

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab !== 'discover') {
        setActiveTab('discover');
        // Effect will trigger fetch due to tab change
    } else {
        fetchFilms(true);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const openAddModal = (filmId: number) => {
    setSelectedFilmId(filmId);
    setPriority(5);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleAddToWatchlist = async () => {
    if (!token || !selectedFilmId) return;
    try {
      await api.addToWatchlist(token, selectedFilmId, priority, notes);
      setIsModalOpen(false);
      fetchWatchlist(); // Refresh watchlist to update UI
      addLog('INFO', 'Added film to watchlist');
    } catch (e: any) {
      addLog('ERR', 'Failed to add', e.message);
      alert("Failed to add to watchlist");
    }
  };

  const handleRemoveFromWatchlist = async (entryId: number) => {
    if (!token) return;
    
    // Removed blocking confirm for debugging
    // if (!window.confirm("Remove from watchlist?")) return;
    
    addLog('INFO', `Attempting to remove watchlist entry: ${entryId}`);
    try {
      await api.removeFromWatchlist(token, entryId);
      setWatchlist(prev => prev.filter(item => item.id !== entryId));
      addLog('INFO', `Successfully removed entry ${entryId} from local state`);
    } catch (e: any) {
      console.error(e);
      addLog('ERR', 'Failed to remove', e.message);
      alert(`Failed to remove: ${e.message}`);
    }
  };

  // --- Render Helpers ---

  const renderContent = () => {
    if (loading && films.length === 0 && watchlist.length === 0 && recommendations.length === 0) {
      return <div className="text-center py-20 text-gray-500">Loading your cinema universe...</div>;
    }

    if (activeTab === 'discover' && viewMode === 'graph') {
        return (
            <div className="animate-in fade-in zoom-in duration-300">
                 <GraphView films={films} />
                 <p className="text-center text-xs text-gray-500 mt-2">
                   Visualizing relationships for {films.length} loaded films. Double click a node to view details.
                 </p>
            </div>
        );
    }

    if (activeTab === 'discover') {
      return (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {films.length > 0 ? (
                films.map(film => {
                const inWatchlist = watchlist.find(w => w.film_id === film.id); 
                return (
                    <FilmCard 
                    key={film.id} 
                    film={film} 
                    watchlistEntry={inWatchlist}
                    onAddToWatchlist={!inWatchlist ? openAddModal : undefined}
                    onRemoveFromWatchlist={handleRemoveFromWatchlist}
                    />
                );
                })
            ) : (
                <div className="col-span-full text-center py-10 text-gray-500">
                    No films found matching your criteria.
                </div>
            )}
          </div>
          {hasMore && films.length > 0 && (
            <div className="mt-8 text-center">
              <Button onClick={() => fetchFilms(false)} variant="secondary" isLoading={loading}>
                Load More Films
              </Button>
            </div>
          )}
        </>
      );
    }

    if (activeTab === 'watchlist') {
      if (watchlist.length === 0) return <div className="text-center py-20 text-gray-500">Your watchlist is empty. Go discover some movies!</div>;
      
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {watchlist.map(entry => (
            <FilmCard 
              key={entry.id} 
              film={entry.film}
              watchlistEntry={entry}
              onRemoveFromWatchlist={handleRemoveFromWatchlist}
            />
          ))}
        </div>
      );
    }

    if (activeTab === 'recommendations') {
       if (recommendations.length === 0) return <div className="text-center py-20 text-gray-500">Rate some movies in your watchlist to get intelligent recommendations!</div>;

       return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {recommendations.map(film => {
             const inWatchlist = watchlist.find(w => w.film_id === film.id); 
             return (
                <FilmCard 
                key={film.id} 
                film={film} 
                watchlistEntry={inWatchlist}
                onAddToWatchlist={!inWatchlist ? openAddModal : undefined}
                onRemoveFromWatchlist={handleRemoveFromWatchlist}
                />
            );
          })}
        </div>
      );
    }
  };

  return (
    <div>
      {/* Controls Header */}
      <div className="flex flex-col gap-6 mb-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex space-x-1 bg-secondary-800 p-1 rounded-lg border border-secondary-700 w-fit">
            {(['discover', 'watchlist', 'recommendations'] as Tab[]).map((tab) => (
                <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === tab 
                    ? 'bg-primary-600 text-white shadow' 
                    : 'text-gray-400 hover:text-white'
                }`}
                >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
            ))}
            </div>

            <div className="flex items-center gap-3">
                 {/* View Toggle */}
                 {activeTab === 'discover' && (
                    <div className="flex space-x-1 bg-secondary-800 p-1 rounded-lg border border-secondary-700">
                        <button onClick={() => setViewMode('grid')} className={`px-3 py-1.5 rounded text-xs font-medium ${viewMode === 'grid' ? 'bg-secondary-600 text-white' : 'text-gray-400'}`}>Grid</button>
                        <button onClick={() => setViewMode('graph')} className={`px-3 py-1.5 rounded text-xs font-medium ${viewMode === 'graph' ? 'bg-secondary-600 text-white' : 'text-gray-400'}`}>Graph</button>
                    </div>
                 )}

                 <Button 
                   variant="secondary" 
                   size="sm"
                   onClick={() => setShowFilters(!showFilters)}
                   className={showFilters ? 'bg-secondary-600 border-primary-500' : ''}
                 >
                    {showFilters ? 'Hide Filters' : 'Filter & Sort'}
                 </Button>
            </div>
        </div>

        {/* Expandable Filter Section */}
        {showFilters && (
            <div className="bg-secondary-800/50 border border-secondary-700 rounded-xl p-6 animate-in slide-in-from-top-2 duration-200">
                <form onSubmit={handleSearchSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                        <Input 
                            label="Title"
                            name="title"
                            placeholder="e.g. Inception"
                            value={searchFilters.title}
                            onChange={handleFilterChange}
                        />
                        <Input 
                            label="Genres"
                            name="genres"
                            placeholder="e.g. Action"
                            value={searchFilters.genres}
                            onChange={handleFilterChange}
                        />
                         <Input 
                            label="Actor"
                            name="actors"
                            placeholder="e.g. DiCaprio"
                            value={searchFilters.actors}
                            onChange={handleFilterChange}
                        />
                        <Input 
                            label="Director"
                            name="directors"
                            placeholder="e.g. Nolan"
                            value={searchFilters.directors}
                            onChange={handleFilterChange}
                        />
                        <div className="w-full">
                            <label className="block text-sm font-medium text-gray-300 mb-1.5 ml-1">Sort By</label>
                            <select 
                                value={sort}
                                onChange={(e) => setSort(e.target.value)}
                                className="w-full bg-secondary-900 border border-secondary-600 rounded-lg px-4 py-2.5 text-white outline-none focus:border-primary-500"
                            >
                                <option value="-rating">Rating (High to Low)</option>
                                <option value="rating">Rating (Low to High)</option>
                                <option value="-year">Year (Newest)</option>
                                <option value="year">Year (Oldest)</option>
                                <option value="title">Title (A-Z)</option>
                                <option value="-title">Title (Z-A)</option>
                                <option value="-runtime">Runtime (Longest)</option>
                                <option value="runtime">Runtime (Shortest)</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => {
                            setSearchFilters({ title: '', genres: '', actors: '', directors: ''});
                            setSort('-rating');
                        }}>Clear</Button>
                        <Button type="submit" size="sm">Apply Filters</Button>
                    </div>
                </form>
            </div>
        )}
      </div>

      {/* Main Content */}
      {renderContent()}

      {/* Add to Watchlist Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Add to Watchlist"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Priority (1-10)</label>
            <input 
              type="range" 
              min="1" 
              max="10" 
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value))}
              className="w-full h-2 bg-secondary-600 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Low</span>
              <span className="text-primary-400 font-bold">{priority}</span>
              <span>High</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-secondary-900 border border-secondary-600 rounded-lg p-3 text-white focus:ring-primary-500 focus:border-primary-500 outline-none h-24 resize-none"
              placeholder="Why do you want to watch this?"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAddToWatchlist}>Add to Watchlist</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;