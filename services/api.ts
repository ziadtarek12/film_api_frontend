import { 
  AuthResponse, 
  FilmListResponse, 
  WatchlistResponse, 
  RecommendationsResponse, 
  RegisterResponse,
  WatchlistEntry,
  Film
} from '../types';

// Live API URL
const BASE_URL = 'https://zeyadomaro.alwaysdata.net/v1';

// --- LOGGING SYSTEM ---
export type LogEntry = {
  id: string;
  timestamp: string;
  type: 'REQ' | 'RES' | 'ERR' | 'INFO';
  message: string;
  details?: any;
};

type LogListener = (log: LogEntry) => void;
const listeners: LogListener[] = [];

const notifyListeners = (log: LogEntry) => {
  listeners.forEach(l => l(log));
};

export const subscribeToLogs = (listener: LogListener) => {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx > -1) listeners.splice(idx, 1);
  };
};

export const addLog = (type: 'REQ' | 'RES' | 'ERR' | 'INFO', message: string, details?: any) => {
  const entry: LogEntry = {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toLocaleTimeString(),
    type,
    message,
    details
  };
  console.log(`[${type}] ${message}`, details || '');
  notifyListeners(entry);
};

// --- API CLIENT ---

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const getHeaders = (token?: string) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  // Read body text once
  const text = await response.text();
  
  addLog('RES', `${response.status} ${response.statusText} - ${response.url}`, text ? text.substring(0, 200) : '<empty body>');

  // 1. Check for HTTP Errors
  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorData = JSON.parse(text);
      errorMessage = errorData.error || errorMessage;
      if (typeof errorData.error === 'object') {
        errorMessage = JSON.stringify(errorData.error);
      }
    } catch {
      errorMessage = text || response.statusText;
    }
    throw new ApiError(response.status, errorMessage);
  }

  // 2. Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  // 3. Handle empty body
  if (!text) return {} as T;

  try {
    return JSON.parse(text);
  } catch (e) {
    addLog('INFO', 'Response was 200 OK but not JSON. Returning empty object.', text);
    return {} as T;
  }
};

export interface FilmFilters {
  title?: string;
  genres?: string;
  actors?: string;
  directors?: string;
}

export const api = {
  // --- Auth ---
  register: async (name: string, email: string, password: string): Promise<RegisterResponse> => {
    const url = `${BASE_URL}/users`;
    addLog('REQ', `POST ${url}`, { email });
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, email, password }),
    });
    return handleResponse<RegisterResponse>(response);
  },

  activate: async (token: string): Promise<void> => {
    const url = `${BASE_URL}/users/activate`;
    addLog('REQ', `PUT ${url}`);
    const response = await fetch(url, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ token }),
    });
    return handleResponse<void>(response);
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const url = `${BASE_URL}/tokens/authentication`;
    addLog('REQ', `POST ${url}`, { email });
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<AuthResponse>(response);
  },

  // --- Films ---
  getFilms: async (
    token: string, 
    page: number = 1, 
    pageSize: number = 20, 
    sort: string = '-rating', 
    filters: FilmFilters = {}
  ): Promise<FilmListResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
      sort,
    });
    
    if (filters.title) params.append('title', filters.title);
    if (filters.genres) params.append('genres', filters.genres);
    if (filters.actors) params.append('actors', filters.actors);
    if (filters.directors) params.append('directors', filters.directors);

    const url = `${BASE_URL}/films?${params.toString()}`;
    // Don't log every GET to avoid spamming the debug console
    // addLog('REQ', `GET ${url}`); 

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(token),
    });
    return handleResponse<FilmListResponse>(response);
  },

  getFilm: async (token: string, id: number): Promise<{ film: Film }> => {
    const url = `${BASE_URL}/films/${id}`;
    addLog('REQ', `GET ${url}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(token),
    });
    return handleResponse<{ film: Film }>(response);
  },

  // --- Watchlist ---
  getWatchlist: async (
    token: string, 
    watched: boolean = false, 
    page: number = 1, 
    pageSize: number = 20
  ): Promise<WatchlistResponse> => {
    const params = new URLSearchParams({
      watched: watched.toString(),
      sort: '-priority',
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    const url = `${BASE_URL}/watchlist?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(token),
    });
    return handleResponse<WatchlistResponse>(response);
  },

  addToWatchlist: async (token: string, filmId: number, priority: number, notes: string): Promise<void> => {
    const url = `${BASE_URL}/watchlist`;
    addLog('REQ', `POST ${url}`, { filmId, priority });
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ film_id: filmId, priority, notes }),
    });
    return handleResponse<void>(response);
  },

  updateWatchlist: async (token: string, entryId: number, updates: Partial<WatchlistEntry>): Promise<void> => {
    const url = `${BASE_URL}/watchlist/${entryId}`;
    addLog('REQ', `PATCH ${url}`, updates);
    const response = await fetch(url, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify(updates),
    });
    return handleResponse<void>(response);
  },

  removeFromWatchlist: async (token: string, entryId: number): Promise<void> => {
    const url = `${BASE_URL}/watchlist/${entryId}`;
    addLog('REQ', `DELETE ${url}`);
    
    // Explicitly NO Content-Type for DELETE
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: headers,
    });
    return handleResponse<void>(response);
  },

  // --- Recommendations ---
  getRecommendations: async (token: string): Promise<RecommendationsResponse> => {
    const url = `${BASE_URL}/recommendations?limit=12`;
    addLog('REQ', `GET ${url}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(token),
    });
    return handleResponse<RecommendationsResponse>(response);
  }
};