import React, { useEffect, useState } from 'react';

export const SplashScreen = ({ onFinish }) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onFinish, 500);
    }, 1000);

    return () => clearTimeout(timer);
  }, [onFinish]);

  const styles = {
    container: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'var(--bg-main)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      transition: 'opacity 0.5s ease-in-out',
      opacity: show ? 1 : 0,
    },
    title: {
      color: 'var(--amber-action)',
      fontSize: '3rem',
      fontWeight: '800',
      letterSpacing: '-1px',
      marginBottom: '1rem',
    },
    subtitle: {
      color: 'var(--text-muted)',
      fontSize: '1rem',
      fontWeight: '500',
    },
    spinner: {
      marginTop: '2rem',
      width: '40px',
      height: '40px',
      border: '3px solid var(--border-color)',
      borderTop: '3px solid var(--amber-action)',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      <div style={styles.container}>
        <h1 style={styles.title}>StockBar</h1>
        <p style={styles.subtitle}>Gestión Inteligente de Inventario</p>
        <div style={styles.spinner}></div>
      </div>
    </>
  );
};