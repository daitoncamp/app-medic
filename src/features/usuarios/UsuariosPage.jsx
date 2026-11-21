import { useCallback, useEffect, useState } from 'react';
import { faCircleInfo, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Badge, Button, Card, Field, FieldRow, Modal, PageHeader, Table, useConfirm, useToast,
} from '../../components/ui';
import {
  cambiarEstadoUsuario, crearUsuario, EVENTO_USUARIOS, listarUsuarios, NOMBRE_ROL, obtenerSesion, ROLES,
} from '../../services/authService';
import { formatearFecha } from '../../utils/formato';
import { requerido, validarEmail, validarFormulario } from '../../utils/validaciones';
import styles from './Usuarios.module.css';

const VACIO = { nombre: '', email: '', rol: '', pass: '' };
const REGLAS = {
  nombre: [requerido],
  email: [requerido, validarEmail],
  rol: [(v) => requerido(v, 'Seleccione un rol.')],
  pass: [requerido, (v) => (v.length >= 8 ? '' : 'Mínimo 8 caracteres.')],
};

function UsuariosPage() {
  const toast = useToast();
  const confirmar = useConfirm();
  const sesion = obtenerSesion();
  const [usuarios, setUsuarios] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});

  const cargar = useCallback(() => listarUsuarios().then(setUsuarios), []);

  useEffect(() => {
    cargar();
    window.addEventListener(EVENTO_USUARIOS, cargar);
    return () => window.removeEventListener(EVENTO_USUARIOS, cargar);
  }, [cargar]);

  const cambiar = (campo) => (e) => {
    setForm((f) => ({ ...f, [campo]: e.target.value }));
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: '' }));
  };

  const abrir = () => {
    setForm(VACIO);
    setErrores({});
    setModal(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    const nuevos = validarFormulario(form, REGLAS);
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;
    try {
      const usuario = await crearUsuario(form);
      toast.success(`Usuario ${usuario.email} creado.`);
      setModal(false);
    } catch (error) {
      setErrores({ email: error.message });
    }
  };

  const alternar = async (usuario) => {
    if (usuario.activo) {
      const ok = await confirmar({
        title: `¿Desactivar a ${usuario.nombre}?`,
        message: 'No podrá iniciar sesión hasta que lo vuelvas a activar.',
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

  return (
    <>
      <PageHeader
        title="Usuarios"
        subtitle="Crea cuentas para el personal y asigna su rol."
        actions={<Button icon={faUserPlus} onClick={abrir}>Nuevo usuario</Button>}
      />

      <p className={styles.notice}>
        <FontAwesomeIcon icon={faCircleInfo} />
        Modo demostración: los usuarios se guardan en este navegador. Con el backend se guardarán en la base de datos y las contraseñas cifradas.
      </p>

      <Card padded={false}>
        <Table
          caption="Usuarios"
          columns={[
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
            { key: 'creado', header: 'Creado', render: (u) => (u.creado ? formatearFecha(u.creado) : 'Inicial') },
            { key: 'activo', header: 'Estado', render: (u) => <Badge tone={u.activo ? 'success' : 'neutral'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge> },
            {
              key: 'acciones',
              header: '',
              className: 'actions',
              render: (u) => (
                <Button size="sm" variant="secondary" onClick={() => alternar(u)} disabled={u.id === sesion.id}>
                  {u.activo ? 'Desactivar' : 'Activar'}
                </Button>
              ),
            },
          ]}
          rows={usuarios}
        />
      </Card>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Nuevo usuario"
        description="Comparte la contraseña temporal con la persona por un medio seguro."
        footer={(
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" form="form-usuario">Crear usuario</Button>
          </>
        )}
      >
        <form id="form-usuario" onSubmit={guardar} noValidate className={styles.form}>
          <Field label="Nombre" value={form.nombre} onChange={cambiar('nombre')} error={errores.nombre} />
          <Field label="Correo" type="email" placeholder="usuario@live.uleam.edu.ec" value={form.email} onChange={cambiar('email')} error={errores.email} />
          <FieldRow>
            <Field as="select" label="Rol" value={form.rol} onChange={cambiar('rol')} error={errores.rol}>
              <option value="">Seleccione…</option>
              {Object.values(ROLES).map((r) => <option key={r} value={r}>{NOMBRE_ROL[r]}</option>)}
            </Field>
            <Field label="Contraseña temporal" type="text" autoComplete="new-password" value={form.pass} onChange={cambiar('pass')} error={errores.pass} />
          </FieldRow>
        </form>
      </Modal>
    </>
  );
}

export default UsuariosPage;
