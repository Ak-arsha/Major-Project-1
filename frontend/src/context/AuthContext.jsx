import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

export const ROLES = {
  PATIENT: 'patient',
};

export const DEMO_ACCOUNTS = {
  [ROLES.PATIENT]: {
    id: 'demo-patient-1',
    name: 'Alex Sharma',
    email: 'patient@healthnavigator.ai',
    role: ROLES.PATIENT,
    phone: '+91 98765 43210',
    age: '28',
    sex: 'Female',
    avatar: 'AS',
    headline: 'Patient / Healthcare Seeker',
    bio: 'Looking for doctor consultation, appointments, and preventive care tracking.',
  },
};

const USER_STORAGE_KEY = 'hn_auth_user';
const TOKEN_STORAGE_KEY = 'hn_auth_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load persisted session on initial mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);

      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.warn('Failed to parse stored session:', err);
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSession = (userData, token = `tok_${Date.now()}`) => {
    setUser(userData);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem('hn_last_patient_account', JSON.stringify(userData));
  };

  const login = async (email, password) => {
    const cleanEmail = email.trim().toLowerCase();

    // Check against demo patient account
    const demo = DEMO_ACCOUNTS[ROLES.PATIENT];
    if (demo && demo.email.toLowerCase() === cleanEmail) {
      saveSession(demo);
      return { success: true, user: demo };
    }

    // Check custom registered users in localStorage
    const registeredUsers = JSON.parse(
      localStorage.getItem('hn_registered_users') || '[]'
    );
    const existing = registeredUsers.find(
      (u) => u.email.toLowerCase() === cleanEmail
    );

    if (existing) {
      if (existing.password && existing.password !== password) {
        throw new Error('Invalid email or password.');
      }
      const { password: _, ...safeUser } = existing;
      saveSession(safeUser);
      return { success: true, user: safeUser };
    }

    // Do NOT auto-login unregistered emails
    throw new Error('No account found with this email. Please click "Create Account" to sign up.');
  };

  const loginAsDemo = () => {
    const account = DEMO_ACCOUNTS[ROLES.PATIENT];
    saveSession(account);
    return account;
  };

  const register = async ({
    name,
    email,
    password,
    phone = '',
    age = '',
    sex = 'Female',
  }) => {
    const cleanEmail = email.trim().toLowerCase();
    const registeredUsers = JSON.parse(
      localStorage.getItem('hn_registered_users') || '[]'
    );

    if (registeredUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }

    const trimmedName = name.trim();
    const initials = trimmedName
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'PT';

    const newUser = {
      id: `usr_${Date.now()}`,
      name: trimmedName,
      email: cleanEmail,
      password,
      role: ROLES.PATIENT,
      phone: phone.trim(),
      age: age ? String(age).trim() : '',
      sex: sex || 'Female',
      avatar: initials,
      headline: 'Patient Account',
      bio: '',
    };

    // Save into registered users collection
    registeredUsers.push(newUser);
    localStorage.setItem('hn_registered_users', JSON.stringify(registeredUsers));

    // Save to patient registry
    try {
      const rawP = localStorage.getItem('hn_patient_registry');
      const pList = rawP ? JSON.parse(rawP) : [];
      const filtered = pList.filter((p) => p.email !== cleanEmail);
      const pEntry = {
        id: newUser.id,
        name: newUser.name,
        email: cleanEmail,
        phone: newUser.phone,
        age: newUser.age,
        sex: newUser.sex,
        registered_at: new Date().toISOString(),
      };
      localStorage.setItem('hn_patient_registry', JSON.stringify([pEntry, ...filtered]));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hn_patients_updated', { detail: pEntry }));
      }
    } catch (pErr) {
      console.warn('Failed to store patient in registry:', pErr);
    }

    // Save session (without password in active session state)
    const { password: _, ...safeUser } = newUser;
    saveSession(safeUser);
    return { success: true, user: safeUser };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  };

  const updateUser = (fields) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...fields };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const hasRole = (...allowedRoles) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  const value = {
    user,
    role: ROLES.PATIENT,
    isAuthenticated: Boolean(user),
    loading,
    login,
    loginAsDemo,
    register,
    logout,
    updateUser,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
