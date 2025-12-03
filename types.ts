export interface User {
  id: number;
  name: string;
  email: string;
  activated: boolean;
  created_at?: string;
}

export interface Film {
  id: number;
  imdb_id: string;
  title: string;
  year: number;
  runtime: string | number;
  certificate: string;
  rating: number;
  description: string;
  genres: string[];
  directors: string[];
  actors: string[];
  image?: string;
}

export interface WatchlistEntry {
  id: number;
  user_id: number;
  film_id: number;
  added_at: string;
  notes: string;
  priority: number;
  watched: boolean;
  watched_at: string | null;
  rating: number | null;
  film: Film;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface MetaData {
  current_page: number;
  page_size: number;
  first_page: number;
  last_page: number;
  total_records: number;
}

export interface FilmListResponse {
  films: Film[];
  metadata: MetaData;
}

export interface WatchlistResponse {
  watchlist: WatchlistEntry[];
  metadata: MetaData;
}

export interface RecommendationsResponse {
  recommendations: Film[];
}

export interface RegisterResponse {
  user: User;
  activation_token: {
    token: string;
    expiry: string;
  };
}

export enum SortOption {
  RatingDesc = "-rating",
  YearDesc = "-year",
  TitleAsc = "title",
  PriorityDesc = "-priority" // For watchlist
}
