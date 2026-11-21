import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { iniciarSesion, RUTA_POR_ROL } from '../services/authService';

export function useAuth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  // 'requiredRole' indica desde qué interfaz se intenta entrar
  const login = async (email, password, requiredRole) => {
    setErrorGeneral('');
    setFieldErrors({ email: '', password: '' });

    if (!email.trim() || !password.trim()) {
      setFieldErrors({
        email: !email.trim() ? 'Este campo no puede estar vacío' : '',
        password: !password.trim() ? 'Este campo no puede estar vacío' : '',
      });
      triggerShake();
      return;
    }

    setLoading(true);
    try {
      const sesion = await iniciarSesion(email, password, requiredRole);
      navigate(RUTA_POR_ROL[sesion.rol]);
    } catch (error) {
      setErrorGeneral(error.message || 'No se pudo iniciar sesión.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, errorGeneral, fieldErrors, shake };
}
