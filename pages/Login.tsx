
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../App';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { validate } from '../utils/validation';

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    email: 'john@example.com',
    password: 'securepassword123'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Real-time validation if already touched
    if (touched[name]) {
      if (name === 'email') {
        const { error } = validate(value, 'EMAIL');
        setErrors(prev => ({ ...prev, email: error || '' }));
      } else if (name === 'password') {
         // Simple required check for login password, no regex needed for login itself usually
         // but we can enforce non-empty
         setErrors(prev => ({ ...prev, password: value ? '' : 'Password is required' }));
      }
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    
    if (name === 'email') {
      const { error } = validate(value, 'EMAIL');
      setErrors(prev => ({ ...prev, email: error || '' }));
    }
    if (name === 'password' && !value) {
      setErrors(prev => ({ ...prev, password: 'Password is required' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    
    // Validate all
    const emailValidation = validate(formData.email, 'EMAIL');
    const passwordValid = !!formData.password;
    
    setErrors({
      email: emailValidation.error || '',
      password: passwordValid ? '' : 'Password is required'
    });
    setTouched({ email: true, password: true });

    if (!emailValidation.isValid || !passwordValid) return;

    setLoading(true);
    try {
      const response = await api.login(formData.email, formData.password);
      login(response);
      navigate('/');
    } catch (err: any) {
      setApiError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 px-4">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-tr from-primary-600 to-primary-400 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4 shadow-lg shadow-primary-900/50">C</div>
        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome Back</h2>
        <p className="text-gray-400">Sign in to access your personal film graph.</p>
      </div>

      <div className="bg-secondary-800/50 backdrop-blur-xl rounded-2xl p-8 border border-secondary-700 shadow-2xl relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {apiError && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 text-red-200 rounded-xl text-sm flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <p className="pt-0.5">{apiError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2">
          <Input
            label="Email Address"
            name="email"
            type="email"
            placeholder="john@example.com"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.email}
            touched={touched.email}
          />
          
          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.password}
            touched={touched.password}
          />

          <div className="pt-4">
            <Button type="submit" className="w-full py-3 text-lg shadow-lg shadow-primary-900/20" isLoading={loading}>
              Sign In
            </Button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-secondary-700 text-center text-sm text-gray-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium hover:underline underline-offset-4">
            Create Free Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
