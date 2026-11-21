import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { faCircleExclamation, faUsers } from '@fortawesome/free-solid-svg-icons';
import { Button, Card, EmptyState, PageHeader, SearchInput, Table } from '../../components/ui';
import { useDiferido } from '../../hooks/useDiferido';
import { useRecurso } from '../../hooks/useRecurso';
import { listarPacientes } from '../../services/recepcionApi';
import { edadTexto, formatearFecha } from '../../utils/formato';
import styles from './Pacientes.module.css';

function PacientesPage() {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const buscar = useDiferido(busqueda);

  const { datos, cargando, error, recargar } = useRecurso(
    () => listarPacientes({ buscar }),
    [buscar],
    { inicial: { pacientes: [], total: 0 } },
  );
  const { pacientes, total } = datos;

  return (
    <>
      <PageHeader title="Pacientes" subtitle="Busca un paciente para ver su ficha completa." />
      <Card padded={false}>
        <div className={styles.toolbar}>
          <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre, apellido o cédula" />
          <p className="muted">
            {total} {total === 1 ? 'paciente' : 'pacientes'}{total > pacientes.length && ` (mostrando ${pacientes.length})`}
          </p>
        </div>
        {error && !pacientes.length ? (
          <EmptyState icon={faCircleExclamation} title="No se pudo cargar la lista" text={error.message}
            action={<Button variant="secondary" onClick={recargar}>Reintentar</Button>} />
        ) : cargando && !pacientes.length ? (
          <EmptyState compact title="Cargando pacientes…" />
        ) : (
          <Table
            caption="Pacientes"
            onRowClick={(p) => navigate(`/pacientes/${p.cedula}`)}
            rowKey="cedula"
            columns={[
              { key: 'nombre', header: 'Nombre', className: 'strong', render: (p) => `${p.apellidos} ${p.nombres}` },
              { key: 'cedula', header: 'Cédula' },
              { key: 'edad', header: 'Edad', render: (p) => edadTexto(p.fechaNacimiento) },
              { key: 'telefono', header: 'Teléfono' },
              { key: 'citas', header: 'Citas', align: 'right' },
              { key: 'ultimaCita', header: 'Última cita', render: (p) => (p.ultimaCita ? formatearFecha(p.ultimaCita) : '—') },
            ]}
            rows={pacientes}
            empty={(
              <EmptyState
                icon={faUsers}
                title={buscar ? 'Ningún paciente coincide' : 'Aún no hay pacientes'}
                text={buscar ? 'Revisa el nombre o la cédula.' : 'Se agregan al agendar una cita o con el registro rápido.'}
              />
            )}
          />
        )}
      </Card>
    </>
  );
}

export default PacientesPage;
