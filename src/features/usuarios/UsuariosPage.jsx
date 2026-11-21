import { useCallback, useEffect, useState } from 'react';
import { faCircleExclamation, faKey, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import {
  Badge, Button, Card, EmptyState, Field, FieldRow, IconButton, Modal, PageHeader, Table, useConfirm, useToast,
} from '../../components/ui';
import {
  cambiarEstadoUsuario, crearUsuario, EVENTO_USUARIOS, listarUsuarios, NOMBRE_ROL, obtenerSesion,
  restablecerPassword, ROLES,
} from '../../services/authService';
import { formatearFecha, formatearFechaHora } from '../../utils/formato';
import { requerido, validarEmail, validarFormulario, validarPasswordNueva } from '../../utils/validaciones';
import styles from './Usuarios.module.css';

const VACIO = { nombre: '', email: '', rol: '', password: '' };
const REGLAS_NUEVO = {
  nombre: [requerido],
  email: [requerido, validarEmail],
  rol: [(v) => requerido(v, 'Seleccione un rol.')],
  password: [requerido, validarPasswordNueva],
};

function UsuariosPage() {
  const toast = useToast();
  const confirmar = useConfirm();
  const sesion = obtenerSesion();

  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');

  // modal: { tipo: 'nuevo' } | { tipo: 'restablecer', usuario }
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setUsuarios(await listarUsuarios());
      setErrorCarga('');
    } catch (error) {
      setErrorCarga(error.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    window.addEventListener(EVENTO_USUARIOS, cargar);
    return () => window.removeEventListener(EVENTO_USUARIOS, cargar);
  }, [cargar]);

  const abrir = (nuevoModal) => {
    setForm(VACIO);
    setErrores({});
    setModal(nuevoModal);
  };

  const cambiar = (campo) => (e) => {
    setForm((f) => ({ ...f, [campo]: e.target.value }));
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: '' }));
  };

  // Muestra en cada campo el error que devuelve el servidor
  const mostrarErrorServidor = (error) => {
    if (Object.keys(error.detalles || {}).length) setErrores(error.detalles);
    else if (error.status === 409) setErrores({ email: error.message });
    else toast.error(error.message);
  };

  const guardarNuevo = async (e) => {
    e.preventDefault();
    const nuevos = validarFormulario(form, REGLAS_NUEVO);
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;
    setGuardando(true);
    try {
      const usuario = await crearUsuario(form);
      toast.success(`Usuario ${usuario.email} creado. Deberá cambiar la contraseña al ingresar.`, 6000);
      setModal(null);
    } catch (error) {
      mostrarErrorServidor(error);
    } finally {
      setGuardando(false);
    }
  };

  const guardarRestablecer = async (e) => {
    e.preventDefault();
    const nuevos = validarFormulario(form, { password: REGLAS_NUEVO.password });
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;
    setGuardando(true);
    try {
      await restablecerPassword(modal.usuario.id, form.password);
      toast.success(`Contraseña de ${modal.usuario.nombre} restablecida. Deberá cambiarla al ingresar.`, 6000);
      setModal(null);
    } catch (error) {
      mostrarErrorServidor(error);
    } finally {
      setGuardando(false);
    }
  };

  const alternar = async (usuario) => {
    if (usuario.activo) {
      const ok = await confirmar({
        title: `¿Desactivar a ${usuario.nombre}?`,
        message: 'No podrá iniciar sesión hasta que lo vuelvas a activar. Si tiene la sesión abierta, se cerrará.',
        confirmText: 'Desactivar',
        danger: true,
      });
      if (!ok) return;
    }
    try {
      await cambiarEstadoUsuario(usuario.id, !usuario.activo);
      toast.success(usuario.activo ? 'Usuario desactivado.' : 'Usuario activado.');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const columnas = [
    {
      key: 'nombre',
      header: 'Nombre',
      render: (u) => (
        <div>
          <p className={styles.name}>{u.nombre}{u.id === sesion.id && <span className="muted"> (tú)</span>}</p>
          <p className={styles.email}>{u.email}</p>
        </div>
      ),
    },
    { key: 'rol', header: 'Rol', render: (u) => NOMBRE_ROL[u.rol] },
    {
      key: 'ultimoAcceso',
      header: 'Último acceso',
      render: (u) => (u.ultimoAcceso ? formatearFechaHora(u.ultimoAcceso) : <span className="muted">Nunca</span>),
    },
    { key: 'creadoEn', header: 'Creado', render: (u) => formatearFecha(u.creadoEn) },
    {
      key: 'activo',
      header: 'Estado',
      render: (u) => (
        <div className={styles.badges}>
          <Badge tone={u.activo ? 'success' : 'neutral'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge>
          {u.debeCambiarPassword && <Badge tone="warning">Clave temporal</Badge>}
        </div>
      ),
    },
    {
      key: 'acciones',
      header: '',
      className: 'actions',
      render: (u) => (
        <div className={styles.actions}>
          <IconButton icon={faKey} label={`Restablecer contraseña de ${u.nombre}`} onClick={() => abrir({ tipo: 'restablecer', usuario: u })} />
          <Button size="sm" variant="secondary" onClick={() => alternar(u)} disabled={u.id === sesion.id}>
            {u.activo ? 'Desactivar' : 'Activar'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Usuarios"
        subtitle="Crea cuentas para el personal, asigna su rol y restablece contraseñas."
        actions={<Button icon={faUserPlus} onClick={() => abrir({ tipo: 'nuevo' })}>Nuevo usuario</Button>}
      />

      <Card padded={false}>
        {errorCarga ? (
          <EmptyState icon={faCircleExclamation} title="No se pudieron cargar los usuarios" text={errorCarga}
            action={<Button variant="secondary" onClick={cargar}>Reintentar</Button>} />
        ) : cargando ? (
          <EmptyState compact title="Cargando usuarios…" />
        ) : (
          <Table caption="Usuarios" columns={columnas} rows={usuarios} />
        )}
      </Card>

      <Modal
        open={modal?.tipo === 'nuevo'}
        onClose={() => setModal(null)}
        title="Nuevo usuario"
        description="La contraseña es temporal: la persona deberá cambiarla en su primer ingreso. Compártela por un medio seguro."
        footer={(
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button type="submit" form="form-usuario" disabled={guardando}>{guardando ? 'Creando…' : 'Crear usuario'}</Button>
          </>
        )}
      >
        <form id="form-usuario" onSubmit={guardarNuevo} noValidate className={styles.form}>
          <Field label="Nombre" value={form.nombre} onChange={cambiar('nombre')} error={errores.nombre} />
          <Field label="Correo" type="email" placeholder="usuario@live.uleam.edu.ec" value={form.email} onChange={cambiar('email')} error={errores.email} />
          <FieldRow>
            <Field as="select" label="Rol" value={form.rol} onChange={cambiar('rol')} error={errores.rol}>
              <option value="">Seleccione…</option>
              {Object.values(ROLES).map((r) => <option key={r} value={r}>{NOMBRE_ROL[r]}</option>)}
            </Field>
            <Field label="Contraseña temporal" type="text" autoComplete="new-password" value={form.password} onChange={cambiar('password')}
              error={errores.password} hint="Mínimo 8 caracteres, con letras y números." />
          </FieldRow>
        </form>
      </Modal>

      <Modal
        open={modal?.tipo === 'restablecer'}
        onClose={() => setModal(null)}
        title="Restablecer contraseña"
        description={modal?.usuario && `${modal.usuario.nombre} (${modal.usuario.email}) deberá cambiarla al ingresar. También se desbloquea si estaba bloqueado por intentos fallidos.`}
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button type="submit" form="form-restablecer" disabled={guardando}>{guardando ? 'Guardando…' : 'Restablecer'}</Button>
          </>
        )}
      >
        <form id="form-restablecer" onSubmit={guardarRestablecer} noValidate className={styles.form}>
          <Field label="Contraseña temporal" type="text" autoComplete="new-password" value={form.password} onChange={cambiar('password')}
            error={errores.password} hint="Mínimo 8 caracteres, con letras y números." />
        </form>
      </Modal>
    </>
  );
}

export default UsuariosPage;
