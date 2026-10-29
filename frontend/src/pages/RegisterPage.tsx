import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    if (!acceptTerms) {
      toast.error('Please accept the Terms of Service to continue');
      return;
    }

    try {
      setLoading(true);
      await register({
        full_name: fullName,
        email,
        password,
        confirm_password: confirmPassword,
        accept_terms: acceptTerms,
      });
      toast.success('Account created successfully! Welcome to Smart EV.');
      navigate('/app/overview');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to create account';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="auth-card auth-card-signup"
      >
        {/* Brand Header */}
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <Zap style={{ width: 22, height: 22 }} />
          </div>
          <div className="auth-brand-text">
            Smart <span>EV</span>
          </div>
        </div>

        {/* Heading & Subtitle */}
        <h1 className="auth-heading">Create Your Account</h1>
        <p className="auth-subtitle">Start planning smarter electric journeys.</p>

        {/* Register Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Full Name */}
          <div className="auth-form-group">
            <label className="auth-label" htmlFor="register-name">
              Full Name
            </label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">
                <User style={{ width: 17, height: 17 }} />
              </span>
              <input
                id="register-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
                className="auth-input"
                autoComplete="name"
              />
            </div>
          </div>

          {/* Email */}
          <div className="auth-form-group">
            <label className="auth-label" htmlFor="register-email">
              Email Address
            </label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">
                <Mail style={{ width: 17, height: 17 }} />
              </span>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                className="auth-input"
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="auth-form-group">
            <label className="auth-label" htmlFor="register-password">
              Password
            </label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">
                <Lock style={{ width: 17, height: 17 }} />
              </span>
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                className="auth-input"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="auth-toggle-pwd"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff style={{ width: 17, height: 17 }} /> : <Eye style={{ width: 17, height: 17 }} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="auth-form-group">
            <label className="auth-label" htmlFor="register-confirm-password">
              Confirm Password
            </label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">
                <Lock style={{ width: 17, height: 17 }} />
              </span>
              <input
                id="register-confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                className="auth-input"
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* Terms Checkbox */}
          <label className="auth-checkbox-group">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="auth-checkbox"
              required
            />
            <span>
              I agree to the <span style={{ color: '#F8FAFC', textDecoration: 'underline' }}>Terms of Service</span> and{' '}
              <span style={{ color: '#F8FAFC', textDecoration: 'underline' }}>Privacy Policy</span>.
            </span>
          </label>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="auth-primary-button"
          >
            {loading ? (
              <span className="spinner-sm" />
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight style={{ width: 17, height: 17 }} />
              </>
            )}
          </button>
        </form>

        {/* Login Footer */}
        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </div>
      </motion.div>
    </div>
  );
}
