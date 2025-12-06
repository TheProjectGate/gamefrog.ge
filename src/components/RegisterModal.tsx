import React, { useState, FormEvent, useEffect } from 'react';
import { CloseIcon } from './Icons';
import { AVATARS } from '../utils/avatars';
import { GEORGIAN_CITIES } from '../data/georgianCities';

type AccordionSection = 'personal' | 'contact' | 'avatar' | 'credentials';

type Mode = 'register' | 'signin';

interface RegisterModalProps {
  onClose: () => void;
  onRegister: (email: string, password: string, firstName?: string, lastName?: string, avatar?: number, phone?: string, address?: string) => void;
  onLogin: (email: string, password: string) => boolean | Promise<boolean>;
  promptMessage?: string;
}

const RegisterModal: React.FC<RegisterModalProps> = ({ onClose, onRegister, onLogin, promptMessage }) => {
  const [mode, setMode] = useState<Mode>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [addressDetails, setAddressDetails] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<number>(0);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [openSections, setOpenSections] = useState<Set<AccordionSection>>(new Set(['personal']));
  const AUTH_KEY = 'gf_auth';

  const toggleSection = (section: AccordionSection) => {
    setOpenSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { email?: string; password?: string };
        if (saved?.email) setEmail(saved.email);
        if (saved?.password) setPassword(saved.password);
        setMode('signin');
      }
    } catch (error) {
      console.error('[RegisterModal] Failed to load saved credentials:', error);
    }
  }, []);

  const handleModeSwitch = (newMode: Mode) => {
    setMode(newMode);
    if (newMode === 'signin') {
      try {
        const raw = localStorage.getItem(AUTH_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as { email?: string; password?: string };
          setEmail(saved?.email || '');
          setPassword(saved?.password || '');
        }
      } catch {
        setEmail('');
        setPassword('');
      }
      setOpenSections(new Set());
    } else {
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setSelectedAvatar(0);
      setOpenSections(new Set(['personal']));
    }
    setConfirmPassword('');
    setError('');
  };

  const validateEmail = (email: string): string => {
    if (!email) return 'Email is required.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address.';
    return '';
  };

  const validatePassword = (password: string): string => {
    if (!password) return 'Password is required.';
    if (password.length < 6) return 'Password must be at least 6 characters long.';
    if (password.length > 128) return 'Password is too long (max 128 characters).';
    return '';
  };

  const validateField = (name: string, value: string): void => {
    let error = '';
    
    switch (name) {
      case 'email':
        error = validateEmail(value);
        break;
      case 'password':
        error = validatePassword(value);
        break;
      case 'confirmPassword':
        if (!value) {
          error = 'Please confirm your password.';
        } else if (password && value !== password) {
          error = 'Passwords do not match.';
        }
        break;
      case 'firstName':
        if (!value) {
          error = 'First name is required.';
        } else if (value.length < 2) {
          error = 'First name must be at least 2 characters.';
        }
        break;
      case 'lastName':
        if (!value) {
          error = 'Last name is required.';
        } else if (value.length < 2) {
          error = 'Last name must be at least 2 characters.';
        }
        break;
    }
    
    setFieldErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleBlur = (name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const value = name === 'email' ? email : name === 'password' ? password : name === 'confirmPassword' ? confirmPassword : name === 'firstName' ? firstName : lastName;
    validateField(name, value);
  };

  const handleChange = (name: string, value: string) => {
    switch (name) {
      case 'email':
        setEmail(value);
        break;
      case 'password':
        setPassword(value);
        if (confirmPassword && value !== confirmPassword) {
          setFieldErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match.' }));
        } else if (confirmPassword) {
          setFieldErrors(prev => ({ ...prev, confirmPassword: '' }));
        }
        break;
      case 'confirmPassword':
        setConfirmPassword(value);
        if (password && value !== password) {
          setFieldErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match.' }));
        } else {
          setFieldErrors(prev => ({ ...prev, confirmPassword: '' }));
        }
        break;
      case 'firstName':
        setFirstName(value);
        break;
      case 'lastName':
        setLastName(value);
        break;
    }
    
    // Валидация в реальном времени для уже тронутых полей
    if (touched[name]) {
      validateField(name, value);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Помечаем все поля как тронутые
    const allFields = isRegisterMode 
      ? ['email', 'password', 'confirmPassword', 'firstName', 'lastName']
      : ['email', 'password'];
    
    allFields.forEach(field => {
      setTouched(prev => ({ ...prev, [field]: true }));
      const value = field === 'email' ? email : field === 'password' ? password : field === 'confirmPassword' ? confirmPassword : field === 'firstName' ? firstName : lastName;
      validateField(field, value);
    });

    // Проверяем наличие ошибок
    const hasErrors = allFields.some(field => {
      const value = field === 'email' ? email : field === 'password' ? password : field === 'confirmPassword' ? confirmPassword : field === 'firstName' ? firstName : lastName;
      validateField(field, value);
      return fieldErrors[field] || (touched[field] && !value);
    });

    if (hasErrors) {
      setError('Please fix the errors in the form.');
      return;
    }

    if (mode === 'register') {
      const fullAddress = city && addressDetails ? `${city}, ${addressDetails}` : city || addressDetails || undefined;
      onRegister(email, password, firstName, lastName, selectedAvatar, phone || undefined, fullAddress);
    } else { // signin mode
      const loginSuccess = await onLogin(email, password);
      if (!loginSuccess) {
        setError('Invalid email or password.');
      }
    }
  };

  const isRegisterMode = mode === 'register';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className="relative bg-white border-4 border-black w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-black hover:text-[#FF0000] transition-colors z-10"
          aria-label="Close form"
        >
          <CloseIcon className="w-6 h-6" />
        </button>

        {promptMessage && (
            <p className="bg-[#FFD700] border-2 border-black p-2 text-center font-semibold text-sm text-black mb-4">
            {promptMessage}
            </p>
        )}

        <div className="text-center mb-4">
            <h2 id="auth-modal-title" className="text-3xl sm:text-4xl font-display text-black uppercase">{isRegisterMode ? 'Create Account' : 'Sign In'}</h2>
            <p className="text-black/80 mt-1 text-sm">{isRegisterMode ? 'Join the Pixel Palace community!' : 'Welcome back!'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
            {isRegisterMode && (
              <>
                {/* Personal Information Accordion */}
                <div className="border-2 border-black">
                  <button
                    type="button"
                    onClick={() => toggleSection('personal')}
                    className="w-full flex items-center justify-between bg-[#FFD700] hover:bg-[#FFE44D] px-4 py-2 border-b-2 border-black transition-colors"
                  >
                    <span className="font-bold text-black uppercase text-sm">1. Personal Information</span>
                    <span className="text-black font-bold text-lg">
                      {openSections.has('personal') ? '−' : '+'}
                    </span>
                  </button>
                  {openSections.has('personal') && (
                    <div className="p-4 space-y-3 bg-white">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="firstName" className="block text-xs font-bold text-black uppercase tracking-wider mb-1">First Name</label>
                          <input
                            id="firstName"
                            name="firstName"
                            type="text"
                            autoComplete="given-name"
                            required={isRegisterMode}
                            value={firstName}
                            onChange={(e) => handleChange('firstName', e.target.value)}
                            onBlur={() => handleBlur('firstName')}
                            className={`w-full h-10 text-base text-black bg-white px-3 py-1 border-2 focus:outline-none focus:ring-2 focus:ring-[#FFD700] transition ${
                              touched.firstName && fieldErrors.firstName ? 'border-red-500' : 'border-black'
                            }`}
                          />
                          {touched.firstName && fieldErrors.firstName && (
                            <p className="text-red-500 text-xs mt-1">{fieldErrors.firstName}</p>
                          )}
                        </div>
                        <div>
                          <label htmlFor="lastName" className="block text-xs font-bold text-black uppercase tracking-wider mb-1">Last Name</label>
                          <input
                            id="lastName"
                            name="lastName"
                            type="text"
                            autoComplete="family-name"
                            required={isRegisterMode}
                            value={lastName}
                            onChange={(e) => handleChange('lastName', e.target.value)}
                            onBlur={() => handleBlur('lastName')}
                            className={`w-full h-10 text-base text-black bg-white px-3 py-1 border-2 focus:outline-none focus:ring-2 focus:ring-[#FFD700] transition ${
                              touched.lastName && fieldErrors.lastName ? 'border-red-500' : 'border-black'
                            }`}
                          />
                          {touched.lastName && fieldErrors.lastName && (
                            <p className="text-red-500 text-xs mt-1">{fieldErrors.lastName}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Contact Information Accordion */}
                <div className="border-2 border-black">
                  <button
                    type="button"
                    onClick={() => toggleSection('contact')}
                    className="w-full flex items-center justify-between bg-[#FFD700] hover:bg-[#FFE44D] px-4 py-2 border-b-2 border-black transition-colors"
                  >
                    <span className="font-bold text-black uppercase text-sm">2. Contact Info (Optional)</span>
                    <span className="text-black font-bold text-lg">
                      {openSections.has('contact') ? '−' : '+'}
                    </span>
                  </button>
                  {openSections.has('contact') && (
                    <div className="p-4 space-y-3 bg-white">
                      <div>
                        <label htmlFor="phone" className="block text-xs font-bold text-black uppercase tracking-wider mb-1">Phone Number</label>
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          autoComplete="tel"
                          placeholder="+995 XXX XX XX XX"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full h-10 text-base text-black bg-white px-3 py-1 border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700] transition"
                        />
                      </div>
                      <div>
                        <label htmlFor="city" className="block text-xs font-bold text-black uppercase tracking-wider mb-1">City</label>
                        <select
                          id="city"
                          name="city"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full h-10 text-base text-black bg-white px-3 py-1 border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700] transition"
                        >
                          <option value="">Select city...</option>
                          {GEORGIAN_CITIES.map((cityName) => (
                            <option key={cityName} value={cityName}>
                              {cityName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="addressDetails" className="block text-xs font-bold text-black uppercase tracking-wider mb-1">Street, Building, Apartment</label>
                        <input
                          id="addressDetails"
                          name="addressDetails"
                          type="text"
                          autoComplete="street-address"
                          placeholder="e.g. Rustaveli Ave 12, apt 45"
                          value={addressDetails}
                          onChange={(e) => setAddressDetails(e.target.value)}
                          className="w-full h-10 text-base text-black bg-white px-3 py-1 border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700] transition"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Avatar Selection Accordion */}
                <div className="border-2 border-black">
                  <button
                    type="button"
                    onClick={() => toggleSection('avatar')}
                    className="w-full flex items-center justify-between bg-[#FFD700] hover:bg-[#FFE44D] px-4 py-2 border-b-2 border-black transition-colors"
                  >
                    <span className="font-bold text-black uppercase text-sm">3. Choose Avatar</span>
                    <span className="text-black font-bold text-lg">
                      {openSections.has('avatar') ? '−' : '+'}
                    </span>
                  </button>
                  {openSections.has('avatar') && (
                    <div className="p-4 bg-white">
                      <div className="grid grid-cols-6 gap-2">
                        {AVATARS.map((avatar) => (
                          <button
                            key={avatar.id}
                            type="button"
                            onClick={() => setSelectedAvatar(avatar.id)}
                            className={`w-full aspect-square border-2 overflow-hidden bg-gray-100 transition-all ${
                              selectedAvatar === avatar.id
                                ? 'border-black shadow-[3px_3px_0_0_#000] scale-110'
                                : 'border-gray-300 hover:border-black'
                            }`}
                            title={avatar.name}
                          >
                            <img 
                              src={avatar.image} 
                              alt={avatar.name}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                      {AVATARS[selectedAvatar] && (
                        <p className="text-xs text-black/70 mt-2 text-center">Selected: {AVATARS[selectedAvatar]?.name}</p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
            {/* Credentials Section */}
            {isRegisterMode ? (
              <div className="border-2 border-black">
                <button
                  type="button"
                  onClick={() => toggleSection('credentials')}
                  className="w-full flex items-center justify-between bg-[#FFD700] hover:bg-[#FFE44D] px-4 py-2 border-b-2 border-black transition-colors"
                >
                  <span className="font-bold text-black uppercase text-sm">4. Account Credentials</span>
                  <span className="text-black font-bold text-lg">
                    {openSections.has('credentials') ? '−' : '+'}
                  </span>
                </button>
                {openSections.has('credentials') && (
                  <div className="p-4 space-y-3 bg-white">
                    <div>
                      <label htmlFor="email" className="block text-xs font-bold text-black uppercase tracking-wider mb-1">Email Address</label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        onBlur={() => handleBlur('email')}
                        className={`w-full h-10 text-base text-black bg-white px-3 py-1 border-2 focus:outline-none focus:ring-2 focus:ring-[#FFD700] transition ${
                          touched.email && fieldErrors.email ? 'border-red-500' : 'border-black'
                        }`}
                      />
                      {touched.email && fieldErrors.email && (
                        <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="password" className="block text-xs font-bold text-black uppercase tracking-wider mb-1">Password</label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        onBlur={() => handleBlur('password')}
                        className={`w-full h-10 text-base text-black bg-white px-3 py-1 border-2 focus:outline-none focus:ring-2 focus:ring-[#FFD700] transition ${
                          touched.password && fieldErrors.password ? 'border-red-500' : 'border-black'
                        }`}
                      />
                      {touched.password && fieldErrors.password && (
                        <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="confirm-password" className="block text-xs font-bold text-black uppercase tracking-wider mb-1">Confirm Password</label>
                      <input
                        id="confirm-password"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        required={isRegisterMode}
                        value={confirmPassword}
                        onChange={(e) => handleChange('confirmPassword', e.target.value)}
                        onBlur={() => handleBlur('confirmPassword')}
                        className={`w-full h-10 text-base text-black bg-white px-3 py-1 border-2 focus:outline-none focus:ring-2 focus:ring-[#FFD700] transition ${
                          touched.confirmPassword && fieldErrors.confirmPassword ? 'border-red-500' : 'border-black'
                        }`}
                      />
                      {touched.confirmPassword && fieldErrors.confirmPassword && (
                        <p className="text-red-500 text-xs mt-1">{fieldErrors.confirmPassword}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="email" className="block text-xs font-bold text-black uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    className={`w-full h-10 text-base text-black bg-white px-3 py-1 border-2 focus:outline-none focus:ring-2 focus:ring-[#FFD700] transition ${
                      touched.email && fieldErrors.email ? 'border-red-500' : 'border-black'
                    }`}
                  />
                  {touched.email && fieldErrors.email && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="password" className="block text-xs font-bold text-black uppercase tracking-wider mb-1">Password</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    onBlur={() => handleBlur('password')}
                    className={`w-full h-10 text-base text-black bg-white px-3 py-1 border-2 focus:outline-none focus:ring-2 focus:ring-[#FFD700] transition ${
                      touched.password && fieldErrors.password ? 'border-red-500' : 'border-black'
                    }`}
                  />
                  {touched.password && fieldErrors.password && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>
                  )}
                </div>
              </>
            )}

            {error && <p role="alert" className="text-xs font-bold text-center text-red-600 py-2">{error}</p>}

            <div className="pt-2">
                <button
                    type="submit"
                    className="w-full bg-[#FFD700] text-black font-bold text-base py-3 px-4 border-2 border-black transition-colors hover:bg-black hover:text-[#FFD700] btn-pop"
                >
                    {isRegisterMode ? 'Create Account' : 'Sign In'}
                </button>
            </div>
            <p className="text-center text-xs font-semibold text-black/80 pt-1">
                {isRegisterMode ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button type="button" className="font-bold text-[#0047AB] hover:underline" onClick={() => handleModeSwitch(isRegisterMode ? 'signin' : 'register')}>
                    {isRegisterMode ? 'Sign In' : 'Register'}
                </button>
            </p>
        </form>
      </div>
    </div>
  );
};

export default RegisterModal;
