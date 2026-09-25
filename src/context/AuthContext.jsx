import React, { createContext, useState, useContext } from 'react';

// Usuario autenticado en la sesión actual (mock: se pierde al recargar, igual
// que isAuthenticated en App.jsx — no hay persistencia de sesión real todavía).
// Lo usan las pantallas que deben registrar id_usuario desde la sesión, nunca
// desde un input (ej. Bajas de inventario), en vez de dejarlo sin auditoría.
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
