import { Field, FieldRow } from '../../components/ui';
import { edadTexto } from '../../utils/formato';
import type { Errores, FormularioPaciente } from '../../types/dominio';

/** Evento mínimo de un campo: el de un input o uno armado a mano */
export type EventoCampo = { target: { value: string } };
export type CambiarCampo = (campo: keyof FormularioPaciente) => (e: EventoCampo) => void;

interface Props {
  form: FormularioPaciente;
  errores: Errores;
  cambiar: CambiarCampo;
  onCedula?: (cedula: string) => void;
  avisoCedula?: string;
}

/**
 * Campos del paciente compartidos por "Nueva cita" y "Registro rápido".
 * onCedula: se llama con la cédula completa para buscar al paciente.
 */
function CamposPaciente({ form, errores, cambiar, onCedula, avisoCedula }: Props) {
  const cambiarCedula = (e: EventoCampo) => {
    const cedula = e.target.value.replace(/\D/g, '').slice(0, 10);
    cambiar('cedula')({ target: { value: cedula } });
    if (cedula.length === 10) onCedula?.(cedula);
  };
  const edad = form.fechaNacimiento ? edadTexto(form.fechaNacimiento) : '';

  return (
    <>
      <FieldRow>
        <Field
          label="Cédula"
          inputMode="numeric"
          placeholder="10 dígitos"
          value={form.cedula}
          onChange={cambiarCedula}
          error={errores.cedula}
          hint={avisoCedula}
        />
        <Field label="Teléfono" inputMode="tel" placeholder="09xxxxxxxx" value={form.telefono} onChange={cambiar('telefono')} error={errores.telefono} />
      </FieldRow>
      <FieldRow>
        <Field label="Nombres" value={form.nombres} onChange={cambiar('nombres')} error={errores.nombres} />
        <Field label="Apellidos" value={form.apellidos} onChange={cambiar('apellidos')} error={errores.apellidos} />
      </FieldRow>
      <FieldRow columns={3}>
        <Field
          label="Fecha de nacimiento"
          type="date"
          max={new Date().toISOString().slice(0, 10)}
          value={form.fechaNacimiento}
          onChange={cambiar('fechaNacimiento')}
          error={errores.fechaNacimiento}
          hint={edad && !errores.fechaNacimiento ? `Edad: ${edad}` : undefined}
        />
        <Field as="select" label="Sexo" value={form.sexo} onChange={cambiar('sexo')} error={errores.sexo}>
          <option value="">Seleccione…</option>
          <option>Femenino</option>
          <option>Masculino</option>
          <option>Otro</option>
        </Field>
        <Field label="Correo (opcional)" type="email" placeholder="correo@ejemplo.com" value={form.correo} onChange={cambiar('correo')} error={errores.correo} />
      </FieldRow>
      <FieldRow>
        <Field
          label="Contacto de emergencia (opcional)"
          placeholder="Nombre y apellido"
          value={form.contactoEmergenciaNombre}
          onChange={cambiar('contactoEmergenciaNombre')}
          error={errores.contactoEmergenciaNombre}
        />
        <Field
          label="Teléfono del contacto"
          inputMode="tel"
          placeholder="09xxxxxxxx"
          value={form.contactoEmergenciaTelefono}
          onChange={(e) => cambiar('contactoEmergenciaTelefono')({ target: { value: e.target.value.replace(/\D/g, '').slice(0, 10) } })}
          error={errores.contactoEmergenciaTelefono}
        />
      </FieldRow>
    </>
  );
}

export default CamposPaciente;
