import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { Login } from './components/auth/Login';
import { MainLayout } from './components/layout/MainLayout';
import { SplashScreen } from './components/SplashScreen';

// Vistas de la carpeta pages
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { RolesPage } from './pages/roles/RolesPage';
import { UsuariosPage } from './pages/usuarios/UsuariosPage';
import { CategoriasPage } from './pages/categorias/CategoriasPage';
import { ProductosPage } from './pages/productos/ProductosPage';
import { ProveedoresPage } from './pages/proveedores/ProveedoresPage';
import { ComprasPage } from './pages/compras/ComprasPage';
import { BajasPage } from './pages/bajas/BajasPage';
import { JornadaPage } from './pages/jornada/JornadaPage';
import { ClientesPage } from './pages/clientes/ClientesPage';
import { VentasPage } from './pages/ventas/VentasPage';
import { MetodosPagoPage } from './pages/metodospago/MetodosPagoPage';

const AppContent = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('inicio');

  // Transición cuando termina la animación del Splash Screen
  const handleSplashFinish = () => {
    setIsLoading(false);
  };

  // Renderizado dinámico según el menú activo
  const renderCurrentView = () => {
    switch (activeTab) {
      case 'inicio': return <DashboardPage />;
      case 'roles': return <RolesPage />;
      case 'usuarios': return <UsuariosPage />;
      case 'categorias': return <CategoriasPage />;
      case 'productos': return <ProductosPage />;
      case 'proveedores': return <ProveedoresPage />;
      case 'metodospago': return <MetodosPagoPage />;
      case 'compras': return <ComprasPage />;
      case 'bajas': return <BajasPage />;
      case 'jornada': return <JornadaPage />;
      case 'clientes': return <ClientesPage />;
      case 'ventas': return <VentasPage />;
      default: return <DashboardPage />;
    }
  };

  // 1. Mostrar Splash Screen mientras la aplicación se inicializa
  if (isLoading) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  // 2. Si terminó el Splash y no está autenticado, mostrar Login
  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  // 3. Si ya se autenticó, mostrar el diseño principal con la navegación
  return (
    <MainLayout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      onLogout={() => setIsAuthenticated(false)}
    >
      {renderCurrentView()}
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