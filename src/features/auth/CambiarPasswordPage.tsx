import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCircleExclamation, faKey } from '@fortawesome/free-solid-svg-icons';
import logoUleam from '../../assets/logo-uleam.png';
import { Button, Field, useToast } from '../../components/ui';
import { cambiarPassword, sesionActual } from '../../services/authService';
import { requerido, validarFormulario, validarPasswordNueva } from '../../utils/validaciones';
import styles from './CambiarPassword.module.css';
import { comoErrorApi } from '../../services/api';
import type { Errores } from '../../types/dominio';
import type { Validador } from '../../utils/validaciones';

type FormPassword = { actual: string; nueva: string; confirmacion: string };

const REGLAS: Record<keyof FormPassword, Validador[]> = {
  actual: [(v) => requerido(v, 'Ingresa tu contraseña actual.')],
  nueva: [requerido, validarPasswordNueva],
  confirmacion: [requerido],
};

/**
 * Cambio de contraseña. Es obligatorio cuando el administrador creó el usuario
 * o le restableció la contraseña (contraseña temporal).
 */
function CambiarPasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const sesion = sesionActual();
  const obligatorio = sesion?.debeCambiarPassword;

  const [form, setForm] = useState<FormPassword>({ actual: '', nueva: '', confirmacion: '' });
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cambiar = (campo: keyof FormPassword) => (e: ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [campo]: e.target.value }));
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: '' }));
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const nuevos = validarFormulario(form, REGLAS);
    if (!nuevos.confirmacion && form.nueva !== form.confirmacion) nuevos.confirmacion = 'No coincide con la contraseña nueva.';
    setErrores(nuevos);
    setErrorGeneral('');
    if (Object.keys(nuevos).length) return;

    setGuardando(true);
    try {
      await cambiarPassword(form.actual, form.nueva);
      toast.success('Contraseña actualizada.');
      navigate('/inicio', { replace: true });
    } catch (err) {
      const error = comoErrorApi(err);
      // El servidor indica qué campo falló (p. ej. contraseña actual incorrecta)
      if (error.detalles) setErrores(error.detalles);
      else setErrorGeneral(error.message);
      setGuardando(false);
    }
  };

  return (
    <div className={styles.page} data-rol={sesion?.rol}>
      <form className={styles.card} onSubmit={enviar} noValidate>
        <img src={logoUleam} alt="" className={styles.logo} />
        <span className={styles.icon} aria-hidden="true"><FontAwesomeIcon icon={faKey} /></span>
        <h1 className={styles.title}>{obligatorio ? 'Crea tu contraseña' : 'Cambiar contraseña'}</h1>
        <p className={styles.subtitle}>
          {obligatorio
            ? `Hola, ${sesion.nombre}. Tu contraseña es temporal: elige una nueva para continuar.`
            : 'Usa al menos 8 caracteres, con letras y números.'}
        </p>

        {errorGeneral && (
          <div className={styles.alert} role="alert">
            <FontAwesomeIcon icon={faCircleExclamation} /> {errorGeneral}
          </div>
        )}

        <Field
          label={obligatorio ? 'Contraseña temporal' : 'Contraseña actual'}
          type="password"
          autoComplete="current-password"
          value={form.actual}
          onChange={cambiar('actual')}
          error={errores.actual}
        />
        <Field
          label="Contraseña nueva"
          type="password"
          autoComplete="new-password"
          value={form.nueva}
          onChange={cambiar('nueva')}
          error={errores.nueva}
          hint="Mínimo 8 caracteres, con al menos una letra y un número."
        />
        <Field
          label="Repite la contraseña nueva"
          type="password"
          autoComplete="new-password"
          value={form.confirmacion}
          onChange={cambiar('confirmacion')}
          error={errores.confirmacion}
        />

        <Button type="submit" disabled={guardando} className={styles.submit}>
          {guardando ? 'Guardando…' : 'Guardar contraseña'}
        </Button>

        {!obligatorio && (
          <Link to="/inicio" className={styles.back}>
            <FontAwesomeIcon icon={faArrowLeft} /> Volver al inicio
          </Link>
        )}
      </form>
    </div>
  );
}

export default CambiarPasswordPage;
