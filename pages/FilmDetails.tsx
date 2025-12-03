import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, addLog } from '../services/api';
import { useAuth } from '../App';
import { Film, WatchlistEntry } from '../types';
import { Button } from '../components/Button';
import { geminiService } from '../services/gemini';
import { Modal } from '../components/Modal';

const FilmDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [film, setFilm] = useState<Film | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Watchlist State
  const [watchlistEntry, setWatchlistEntry] = useState<WatchlistEntry | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [priority, setPriority] = useState(5);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!token || !id) return;
      setLoading(true);
      try {
        const filmId = parseInt(id);
        
        // 1. Fetch Film Details
        const res = await api.getFilm(token, filmId);
        setFilm(res.film);

        // 2. Check Watchlist Status
        // We fetch a larger page size to increase chance of finding the item in one go
        const watchlistRes = await api.getWatchlist(token, false, 1, 100);
        const entry = watchlistRes.watchlist.find(w => w.film_id === filmId);
        if (entry) {
            setWatchlistEntry(entry);
        }

      } catch (err) {
        console.error(err);
        setError("Failed to load film details.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, token]);

  const handleAiAsk = async () => {
    if (!film || aiInsight) return;
    setLoadingAi(true);
    const insight = await geminiService.getFilmInsight(film);
    setAiInsight(insight);
    setLoadingAi(false);
  };

  const openWatchlistModal = () => {
      if (watchlistEntry) {
          setPriority(watchlistEntry.priority);
          setNotes(watchlistEntry.notes);
      } else {
          setPriority(5);
          setNotes('');
      }
      setIsModalOpen(true);
  };

  const handleSaveWatchlist = async () => {
    if (!token || !film) return;
    try {
      if (watchlistEntry) {
        // Edit existing
        await api.updateWatchlist(token, watchlistEntry.id, { priority, notes });
        setWatchlistEntry({ ...watchlistEntry, priority, notes });
        addLog('INFO', 'Updated watchlist entry');
      } else {
        // Add new
        await api.addToWatchlist(token, film.id, priority, notes);
        
        // Refetch to get the new ID
        const watchlistRes = await api.getWatchlist(token, false, 1, 100);
        const newEntry = watchlistRes.watchlist.find(w => w.film_id === film.id);
        if (newEntry) setWatchlistEntry(newEntry);
        addLog('INFO', 'Added to watchlist');
      }
      setIsModalOpen(false);
    } catch (e: any) {
      addLog('ERR', 'Failed to save watchlist', e.message);
      alert("Failed to save watchlist entry");
    }
  };

  const handleRemoveWatchlist = async () => {
    if (!token || !watchlistEntry) return;
    
    // Removed blocking confirm for debugging
    // if (!window.confirm("Are you sure you want to remove this film from your watchlist?")) return;
    
    addLog('INFO', `Attempting to remove watchlist entry: ${watchlistEntry.id}`);
    try {
      await api.removeFromWatchlist(token, watchlistEntry.id);
      setWatchlistEntry(null);
      addLog('INFO', 'Successfully removed from watchlist (Local state updated)');
    } catch (e: any) {
      console.error(e);
      addLog('ERR', 'Failed to remove', e.message);
      alert(`Failed to remove: ${e.message}`);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-500">Loading film details...</div>;
  if (error || !film) return <div className="text-center py-20 text-red-400">{error || "Film not found"}</div>;

  // Image handling
  const imageUrl = film.image && film.image.startsWith('http') 
    ? film.image 
    : `https://picsum.photos/seed/${film.id}/800/1200`;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
        ← Back
      </Button>

      {/* Cinematic Header with Backdrop and Poster */}
      <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl bg-secondary-900 border border-secondary-800">
        
        {/* Backdrop Image (Blurred) */}
        <div className="absolute inset-0">
          <img 
            src={imageUrl} 
            alt="Backdrop" 
            className="w-full h-full object-cover blur-xl opacity-40 scale-105" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-secondary-900 via-secondary-900/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-secondary-900 via-secondary-900/60 to-transparent" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row gap-8 items-start">
          
          {/* Poster Image */}
          <div className="flex-shrink-0 w-48 md:w-64 lg:w-72 aspect-[2/3] rounded-lg overflow-hidden shadow-2xl border border-white/10 mx-auto md:mx-0">
             <img 
              src={imageUrl} 
              alt={film.title} 
              className="w-full h-full object-cover" 
            />
          </div>

          {/* Details */}
          <div className="flex-1 text-center md:text-left pt-4">
            <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
              {film.genres.map(g => (
                  <span key={g} className="px-3 py-1 bg-primary-600/90 text-white text-xs font-bold uppercase tracking-wider rounded-full backdrop-blur-md shadow-sm">
                    {g}
                  </span>
              ))}
            </div>

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 leading-tight text-shadow">
              {film.title}
            </h1>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-6 text-gray-300 text-sm md:text-base font-medium mb-6">
              <span className="flex items-center gap-1 text-yellow-400 font-bold text-lg bg-yellow-400/10 px-2 py-1 rounded">
                ★ {film.rating}
              </span>
              <span>{film.year}</span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                {film.runtime} mins
              </span>
              <span className="px-2 py-0.5 border border-gray-500 rounded text-xs bg-gray-800/50">{film.certificate}</span>
            </div>

            {/* Quick Actions (Mobile/Tablet) */}
             <div className="md:hidden flex flex-col gap-3 justify-center mb-6">
               <Button onClick={openWatchlistModal} className="w-full">
                 {watchlistEntry ? 'Edit Watchlist' : '+ Watchlist'}
               </Button>
               {watchlistEntry && (
                 <Button variant="danger" onClick={handleRemoveWatchlist} className="w-full">
                    Remove
                 </Button>
               )}
             </div>

             {/* Actions (Desktop) */}
             <div className="hidden md:flex gap-4">
               <Button size="lg" onClick={openWatchlistModal} className="shadow-lg shadow-primary-900/50">
                   {watchlistEntry ? 'Edit Watchlist Priority' : '+ Add to Watchlist'}
               </Button>
               
               {watchlistEntry && (
                  <Button size="lg" variant="danger" onClick={handleRemoveWatchlist}>
                    Remove
                  </Button>
               )}

               <Button size="lg" variant="secondary" onClick={() => window.open(`https://www.imdb.com/title/${film.imdb_id}`, '_blank')}>
                  IMDb
               </Button>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
           <section className="bg-secondary-800/30 p-6 rounded-2xl border border-secondary-800">
             <h2 className="text-2xl font-bold text-white mb-3">Plot Summary</h2>
             <p className="text-gray-300 leading-relaxed text-lg">{film.description}</p>
           </section>

           <section>
             <h2 className="text-2xl font-bold text-white mb-3 flex items-center gap-2">
                AI Insight <span className="text-xs bg-primary-900 text-primary-300 px-2 py-0.5 rounded border border-primary-700">Powered by Gemini</span>
             </h2>
             {!aiInsight ? (
               <div className="bg-secondary-800 rounded-xl p-8 border border-secondary-700 flex flex-col md:flex-row items-center justify-between gap-4">
                 <div className="text-gray-400 text-center md:text-left">
                    <p className="font-medium text-white mb-1">Undecided?</p>
                    <p className="text-sm">Ask Gemini for a professional cinematic breakdown of this film.</p>
                 </div>
                 <Button onClick={handleAiAsk} isLoading={loadingAi} className="whitespace-nowrap">
                    ✨ Generate Insight
                 </Button>
               </div>
             ) : (
               <div className="bg-gradient-to-br from-primary-900/40 to-secondary-800 rounded-xl p-6 border border-primary-500/30 animate-in slide-in-from-bottom-2">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary-500/20 p-2 rounded-lg">
                        <span className="text-2xl">✨</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-primary-300 mb-2">Gemini Analysis</h3>
                      <p className="text-gray-200 italic leading-relaxed">"{aiInsight}"</p>
                    </div>
                  </div>
               </div>
             )}
           </section>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
           <section>
             <h2 className="text-xl font-bold text-white mb-4">Cast & Crew</h2>
             <div className="space-y-4">
                <div className="bg-secondary-800 p-5 rounded-xl border border-secondary-700">
                   <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-3 font-semibold">Director</h3>
                   <div className="flex flex-wrap gap-2">
                     {film.directors.map(d => (
                       <div key={d} className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-xs">
                             {d.charAt(0)}
                          </div>
                          <span className="text-white font-medium">{d}</span>
                       </div>
                     ))}
                   </div>
                </div>
                
                <div className="bg-secondary-800 p-5 rounded-xl border border-secondary-700">
                   <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-3 font-semibold">Top Cast</h3>
                   <div className="flex flex-col gap-3">
                     {film.actors.map(a => (
                       <div key={a} className="flex items-center gap-3 border-b border-secondary-700/50 pb-2 last:border-0 last:pb-0">
                          <div className="w-8 h-8 rounded-full bg-secondary-700 flex items-center justify-center text-gray-400 text-xs">
                             {a.charAt(0)}
                          </div>
                          <span className="text-gray-200">{a}</span>
                       </div>
                     ))}
                   </div>
                </div>
             </div>
           </section>
        </div>
      </div>

       {/* Edit/Add Watchlist Modal */}
       <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={watchlistEntry ? "Edit Watchlist Entry" : "Add to Watchlist"}
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
              placeholder={watchlistEntry ? "Update your notes..." : "Why do you want to watch this?"}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveWatchlist}>
                {watchlistEntry ? "Update Entry" : "Add to Watchlist"}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default FilmDetails;