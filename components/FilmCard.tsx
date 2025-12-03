import React, { useState } from 'react';
import { Film, WatchlistEntry } from '../types';
import { Button } from './Button';
import { geminiService } from '../services/gemini';
import { useNavigate } from 'react-router-dom';
import { addLog } from '../services/api';

interface FilmCardProps {
  film: Film;
  onAddToWatchlist?: (filmId: number) => void;
  onRemoveFromWatchlist?: (entryId: number) => void;
  watchlistEntry?: WatchlistEntry;
  showAi?: boolean;
}

export const FilmCard: React.FC<FilmCardProps> = ({ 
  film, 
  onAddToWatchlist, 
  onRemoveFromWatchlist,
  watchlistEntry,
  showAi = true
}) => {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const navigate = useNavigate();

  // Fallback image logic
  const imageUrl = film.image && film.image.startsWith('http') 
    ? film.image 
    : `https://picsum.photos/seed/${film.id}/300/450`;

  const handleAiAsk = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (aiInsight) return;
    setLoadingAi(true);
    const insight = await geminiService.getFilmInsight(film);
    setAiInsight(insight);
    setLoadingAi(false);
  };

  const handleCardClick = () => {
    navigate(`/film/${film.id}`);
  };

  return (
    <div 
      className="group relative bg-secondary-800 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 border border-secondary-700 flex flex-col h-full cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Image Container */}
      <div className="relative aspect-[2/3] overflow-hidden">
        <img 
          src={imageUrl} 
          alt={film.title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-secondary-900 via-transparent to-transparent opacity-80" />
        
        <div className="absolute top-2 right-2 bg-yellow-500/90 text-black font-bold text-xs px-2 py-1 rounded shadow-md backdrop-blur-sm">
          ★ {film.rating}
        </div>
        
        <div className="absolute bottom-0 left-0 p-4 w-full">
          <h3 className="text-lg font-bold text-white leading-tight mb-1 truncate">{film.title}</h3>
          <div className="flex items-center text-xs text-gray-300 space-x-2">
            <span>{film.year}</span>
            <span>•</span>
            <span>{film.certificate}</span>
            <span>•</span>
            <span>{typeof film.runtime === 'number' ? `${film.runtime}m` : film.runtime}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex flex-wrap gap-1 mb-3">
          {film.genres.slice(0, 3).map(g => (
            <span key={g} className="text-[10px] uppercase tracking-wider bg-secondary-700 text-gray-300 px-2 py-0.5 rounded-full border border-secondary-600">
              {g}
            </span>
          ))}
        </div>
        
        <p className="text-sm text-gray-400 line-clamp-3 mb-4 flex-grow">
          {film.description}
        </p>

        {aiInsight && (
          <div className="mb-4 p-3 bg-primary-900/30 border border-primary-500/30 rounded-lg text-xs text-primary-200 italic">
            <span className="font-semibold not-italic block mb-1 text-primary-400">Gemini Insight:</span>
            "{aiInsight}"
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto space-y-2">
          <div className="flex gap-2">
            {watchlistEntry && onRemoveFromWatchlist ? (
              <Button 
                variant="danger" 
                size="sm" 
                className="w-full"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  addLog('INFO', `User clicked Remove for Film ${film.title} (Watchlist ID: ${watchlistEntry.id})`);
                  onRemoveFromWatchlist(watchlistEntry.id); 
                }}
              >
                Remove
              </Button>
            ) : onAddToWatchlist ? (
              <Button 
                variant="primary" 
                size="sm" 
                className="w-full"
                onClick={(e) => { e.stopPropagation(); onAddToWatchlist(film.id); }}
              >
                + Watchlist
              </Button>
            ) : null}

            {showAi && (
               <Button 
               variant="ghost" 
               size="sm" 
               className="px-2"
               title="Ask AI"
               onClick={handleAiAsk}
               isLoading={loadingAi}
             >
               ✨
             </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};