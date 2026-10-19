import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, EVENTO_SESION_EXPIRADA, sesion } from '../services/api';
import { showToast } from '../utils/alerts';

// Sesión real: JWT emitido por el backend. El usuario y sus permisos los
// devuelve la API; el menú los usa solo para ocultar lo que no aplica (la
// seguridad real la aplica el middleware RBAC del backend).
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [verificando, setVerificando] = useState(() => !!sesion.token());

  // Al recargar la página, si hay token se recupera la sesión.
  useEffect(() => {
    if (!sesion.token()) return;
    api
      .get('/auth/me')
      .then(setCurrentUser)
      .catch(() => sesion.limpiar())
      .finally(() => setVerificando(false));
  }, []);

  const logout = useCallback(() => {
    if (sesion.token()) api.post('/auth/logout').catch(() => {});
    sesion.limpiar();
    setCurrentUser(null);
  }, []);

  useEffect(() => {
    const expirada = (e) => {
      sesion.limpiar();
      setCurrentUser((actual) => {
        if (actual) showToast('warning', e.detail || 'La sesión expiró o el usuario fue desactivado. Inicia sesión de nuevo.');
        return null;
      });
    };
    window.addEventListener(EVENTO_SESION_EXPIRADA, expirada);
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, expirada);
  }, []);

  const login = async (correo, contrasena, recordar) => {
    const { token, usuario } = await api.post('/auth/login', { correo, contrasena });
    sesion.guardar(token, recordar);
    setCurrentUser(usuario);
    return usuario;
  };

  const tienePermiso = (...permisos) => permisos.some((p) => currentUser?.permisos?.includes(p));

  return (
    <AuthContext.Provider value={{ currentUser, verificando, login, logout, tienePermiso }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export const nombreUsuario = (u) => (u ? `${u.nombres} ${u.apellidos}`.trim() : '');
