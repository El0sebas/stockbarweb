import React, { lazy, Suspense, useCallback, useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/auth/Login';
import { MainLayout } from './components/layout/MainLayout';
import { MENU } from './components/layout/Sidebar';
import { SplashScreen } from './components/SplashScreen';

// Cada vista se descarga al abrirla por primera vez (gráficas y PDF pesan:
// el empleado que solo vende nunca baja el código del dashboard).
const vista = (cargar, nombre) => lazy(() => cargar().then((m) => ({ default: m[nombre] })));
const VISTAS = {
  inicio: vista(() => import('./pages/dashboard/DashboardPage'), 'DashboardPage'),
  roles: vista(() => import('./pages/roles/RolesPage'), 'RolesPage'),
  usuarios: vista(() => import('./pages/usuarios/UsuariosPage'), 'UsuariosPage'),
  categorias: vista(() => import('./pages/categorias/CategoriasPage'), 'CategoriasPage'),
  productos: vista(() => import('./pages/productos/ProductosPage'), 'ProductosPage'),
  proveedores: vista(() => import('./pages/proveedores/ProveedoresPage'), 'ProveedoresPage'),
  compras: vista(() => import('./pages/compras/ComprasPage'), 'ComprasPage'),
  bajas: vista(() => import('./pages/bajas/BajasPage'), 'BajasPage'),
  jornada: vista(() => import('./pages/jornada/JornadaPage'), 'JornadaPage'),
  clientes: vista(() => import('./pages/clientes/ClientesPage'), 'ClientesPage'),
  ventas: vista(() => import('./pages/ventas/VentasPage'), 'VentasPage'),
};

const AppContent = () => {
  const { currentUser, verificando, logout, tienePermiso } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(null);
  const terminarSplash = useCallback(() => setIsLoading(false), []);

  // 1. Splash mientras arranca la aplicación y se recupera la sesión guardada
  if (isLoading || verificando) {
    return <SplashScreen onFinish={terminarSplash} />;
  }

  // 2. Sin sesión: Login
  if (!currentUser) {
    return <Login />;
  }

  // 3. Solo los módulos que el rol permite; si la pestaña activa no está
  // permitida se abre el primero disponible (p. ej. Ventas para el Empleado).
  const menu = MENU.filter((item) => tienePermiso(item.permiso));
  // Sin dashboard, se abre Ventas: el empleado entra directo a la ventanilla.
  const actual = menu.find((item) => item.id === activeTab) ?? menu.find((item) => item.id === 'inicio') ?? menu.find((item) => item.id === 'ventas') ?? menu[0];
  const Vista = actual ? VISTAS[actual.id] : null;

  return (
    <MainLayout
      activeTab={actual?.id}
      setActiveTab={setActiveTab}
      menuItems={menu}
      onLogout={() => {
        setActiveTab(null);
        logout();
      }}
    >
      {Vista ? (
        <Suspense fallback={<div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>Cargando...</div>}>
          <Vista />
        </Suspense>
      ) : (
        <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
          Tu rol no tiene módulos asignados. Solicita permisos al administrador.
        </div>
      )}
    </MainLayout>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
