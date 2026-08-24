import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('buildwise_user') || 'null'));
  const signIn = (profile, token, refreshToken) => {
    setUser(profile);
    localStorage.setItem('buildwise_user', JSON.stringify(profile));
    if (token) localStorage.setItem('buildwise_token', token);
    if (refreshToken) localStorage.setItem('buildwise_refresh_token', refreshToken);
  };
  const signOut = () => { setUser(null); localStorage.removeItem('buildwise_user'); localStorage.removeItem('buildwise_token'); localStorage.removeItem('buildwise_refresh_token'); };
  return <AuthContext.Provider value={{ user, signIn, signOut }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
