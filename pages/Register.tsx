
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../App';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { validate, ValidationResult } from '../utils/validation';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleValidation = (name: string, value: string) => {
    let result: ValidationResult = { isValid: true };
    
    if (name === 'name') result = validate(value, 'NAME');
    if (name === 'email') result = validate(value, 'EMAIL');
    if (name === 'password') result = validate(value, 'PASSWORD');

    setErrors(prev => ({
      ...prev,
      [name]: result.error || ''
    }));
    return result.isValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Real-time validation
    if (touched[name]) {
      if (name === 'confirmPassword') {
        setErrors(prev => ({
          ...prev, 
          confirmPassword: value === formData.password ? '' : "Passwords do not match."
        }));
      } else if (name === 'password') {
        handleValidation(name, value);
        if (touched.confirmPassword) {
           // Re-validate confirm password if password changes
           setErrors(prev => ({
             ...prev, 
             confirmPassword: formData.confirmPassword === value ? '' : "Passwords do not match."
           }));
        }
      } else {
        handleValidation(name, value);
      }
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    
    if (name === 'confirmPassword') {
      setErrors(prev => ({
        ...prev, 
        confirmPassword: value === formData.password ? '' : "Passwords do not match."
      }));
    } else {
      handleValidation(name, value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    
    // Validate all fields
    const isNameValid = handleValidation('name', formData.name);
    const isEmailValid = handleValidation('email', formData.email);
    const isPasswordValid = handleValidation('password', formData.password);
    
    // Validate Confirm Password
    const isConfirmValid = formData.password === formData.confirmPassword;
    setErrors(prev => ({
      ...prev,
      confirmPassword: isConfirmValid ? '' : "Passwords do not match."
    }));
    
    setTouched({ name: true, email: true, password: true, confirmPassword: true });

    if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmValid) return;

    setLoading(true);
    try {
      const registerResponse = await api.register(formData.name, formData.email, formData.password);
      await api.activate(registerResponse.activation_token.token);
      const loginResponse = await api.login(formData.email, formData.password);
      login(loginResponse);
      navigate('/');
    } catch (err: any) {
      setApiError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 px-4">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-tr from-primary-600 to-primary-400 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4 shadow-lg shadow-primary-900/50">C</div>
        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Create Account</h2>
        <p className="text-gray-400">Join the graph to discover your next favorite film.</p>
      </div>

      <div className="bg-secondary-800/50 backdrop-blur-xl rounded-2xl p-8 border border-secondary-700 shadow-2xl relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {apiError && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 text-red-200 rounded-xl text-sm flex items-start gap-3">
             <span className="text-xl">⚠️</span>
             <p className="pt-0.5">{apiError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2">
          <Input
            label="Full Name"
            name="name"
            type="text"
            placeholder="John Doe"
            value={formData.name}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.name}
            touched={touched.name}
          />

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
          
          <Input
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.confirmPassword}
            touched={touched.confirmPassword}
          />
          
          {/* Password requirements hint */}
          <div className="text-xs text-gray-500 px-1 pb-4">
            Must contain 8+ chars, uppercase, lowercase, number & special char.
          </div>

          <Button type="submit" className="w-full py-3 text-lg shadow-lg shadow-primary-900/20" isLoading={loading}>
            Create Account
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-secondary-700 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium hover:underline underline-offset-4">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;