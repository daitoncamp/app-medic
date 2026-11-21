import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { faUsers } from '@fortawesome/free-solid-svg-icons';
import { Card, EmptyState, PageHeader, SearchInput, Table } from '../../components/ui';
import { useClinica } from '../../hooks/useClinica';
import { obtenerListaPacientes } from '../../services/clinica';
import { formatearFecha } from '../../utils/formato';
import styles from './Pacientes.module.css';

function PacientesPage() {
  const datos = useClinica();
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState('');

  const texto = busqueda.trim().toLowerCase();
  const pacientes = obtenerListaPacientes(datos).filter((p) =>
    !texto || p.nombre?.toLowerCase().includes(texto) || p.cedula.includes(texto));

  return (
    <>
      <PageHeader title="Pacientes" subtitle="Busca un paciente para ver su ficha completa." />
      <Card padded={false}>
        <div className={styles.toolbar}>
          <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre o cédula" />
          <p className="muted">{pacientes.length} {pacientes.length === 1 ? 'paciente' : 'pacientes'}</p>
        </div>
        <Table
          caption="Pacientes"
          onRowClick={(p) => navigate(`/pacientes/${p.cedula}`)}
          rowKey="cedula"
          columns={[
            { key: 'nombre', header: 'Nombre', className: 'strong' },
            { key: 'cedula', header: 'Cédula' },
            { key: 'edad', header: 'Edad', render: (p) => (p.edad ? `${p.edad} años` : '—') },
            { key: 'telefono', header: 'Teléfono' },
            { key: 'citas', header: 'Citas', align: 'right' },
            { key: 'ultimaCita', header: 'Última cita', render: (p) => (p.ultimaCita ? formatearFecha(p.ultimaCita) : '—') },
          ]}
          rows={pacientes}
          empty={(
            <EmptyState
              icon={faUsers}
              title={texto ? 'Ningún paciente coincide' : 'Aún no hay pacientes'}
              text={texto ? 'Revisa el nombre o la cédula.' : 'Se agregan al agendar una cita o con el registro rápido.'}
            />
          )}
        />
      </Card>
    </>
  );
}

export default PacientesPage;
