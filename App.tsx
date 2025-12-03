import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { User, AuthResponse } from './types';
import { api } from './services/api';
import { DebugConsole } from './components/DebugConsole';

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (data: AuthResponse) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Check local storage on load
    const storedToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user_data');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (data: AuthResponse) => {
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('user_data', JSON.stringify(data.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

// --- Layout ---
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-secondary-900 text-gray-100 font-sans selection:bg-primary-500 selection:text-white">
      <nav className="sticky top-0 z-40 bg-secondary-900/80 backdrop-blur-md border-b border-secondary-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-8 h-8 bg-gradient-to-tr from-primary-600 to-primary-400 rounded-lg flex items-center justify-center text-white font-bold text-xl">C</div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">CineGraph</span>
            </div>
            
            <div className="flex items-center gap-4">
              {user && (
                <>
                   <span className="hidden md:block text-sm text-gray-400">Welcome, <span className="text-white">{user.name}</span></span>
                   <button 
                    onClick={logout}
                    className="text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <DebugConsole />
    </div>
  );
};

// --- Pages Imports ---
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import FilmDetails from './pages/FilmDetails';

const ProtectedRoute: React.FC<{ children: React.JSX.Element }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/film/:id" 
              element={
                <ProtectedRoute>
                  <FilmDetails />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Layout>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;