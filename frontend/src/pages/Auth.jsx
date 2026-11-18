import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  Sparkles,
  User,
  UserCheck,
} from 'lucide-react';
import Logo from '../components/layout/Logo';
import { DEMO_ACCOUNTS, ROLES, useAuth } from '../context/AuthContext';
import '../styles/auth.css';

export default function Auth() {
  const { login, register, loginAsDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState('login'); // 'login' | 'register'

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('Female');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const destination = location.state?.from?.pathname || '/';

  const handleDemoSelect = () => {
    loginAsDemo();
    navigate(destination, { replace: true });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await login(email, password);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please verify your details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!email.trim() || !password) {
      setError('Please provide an email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password should be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name,
        email,
        password,
        phone,
        age,
        sex,
      });
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Header */}
        <header className="auth-header">
          <div className="auth-header__logo">
            <Logo size={48} />
          </div>
          <h1>Healthcare Navigator</h1>
          <p>
            Patient Care Portal — Doctor discovery, OPD appointment booking, WHO triage &amp; insurance intelligence.
          </p>
        </header>

        {/* 1-Click Quick Demo Sign In */}
        <section className="auth-demo-section" aria-label="One-click demo login">
          <div className="auth-demo-label">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Sparkles size={14} /> Quick Demo Access
            </span>
            <span className="auth-demo-badge">Instant Login</span>
          </div>

          <div className="auth-demo-grid" style={{ gridTemplateColumns: '1fr' }}>
            <button
              type="button"
              className="auth-demo-btn auth-demo-btn--patient"
              onClick={handleDemoSelect}
              title="Sign in as Demo Patient (Alex Sharma)"
              style={{ justifyContent: 'center' }}
            >
              <div className="auth-demo-btn__icon">
                <User size={16} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <strong>Patient Demo Account</strong>
                <span>Alex Sharma (patient@healthnavigator.ai)</span>
              </div>
            </button>
          </div>
        </section>

        {/* Mode Switcher Tabs */}
        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`auth-tab ${mode === 'login' ? 'auth-tab--active' : ''}`}
            onClick={() => {
              setMode('login');
              setError('');
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={`auth-tab ${mode === 'register' ? 'auth-tab--active' : ''}`}
            onClick={() => {
              setMode('register');
              setError('');
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="auth-alert auth-alert--error" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        {mode === 'login' ? (
          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <div className="auth-field">
              <label htmlFor="login-email">Email Address</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input
                  id="login-email"
                  type="email"
                  required
                  className="auth-input"
                  placeholder="e.g. patient@healthnavigator.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="login-password">Password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="auth-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="auth-input-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn--primary auth-submit"
              disabled={submitting}
            >
              <span>{submitting ? 'Signing in...' : 'Sign In to Patient Portal'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegisterSubmit}>
            <div className="auth-field">
              <label htmlFor="reg-name">Full Name *</label>
              <div className="auth-input-wrap">
                <User size={16} className="auth-input-icon" />
                <input
                  id="reg-name"
                  type="text"
                  required
                  className="auth-input"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="reg-email">Email Address *</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input
                  id="reg-email"
                  type="email"
                  required
                  className="auth-input"
                  placeholder="e.g. john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="reg-password">Password (min 6 characters) *</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="auth-input"
                  placeholder="Choose a secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="auth-input-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="reg-phone">Phone Number</label>
              <div className="auth-input-wrap">
                <Phone size={16} className="auth-input-icon" />
                <input
                  id="reg-phone"
                  type="tel"
                  className="auth-input"
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-grid-2">
              <div className="auth-field">
                <label htmlFor="reg-age">Age</label>
                <input
                  id="reg-age"
                  type="number"
                  min="1"
                  max="120"
                  className="auth-input"
                  placeholder="e.g. 28"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>

              <div className="auth-field">
                <label htmlFor="reg-sex">Sex</label>
                <select
                  id="reg-sex"
                  className="auth-input"
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn--primary auth-submit"
              disabled={submitting}
            >
              <UserCheck size={16} />
              <span>{submitting ? 'Creating account...' : 'Create Patient Account'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
