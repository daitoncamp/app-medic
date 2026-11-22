// ==================== AUDITORÍA ====================
// Registra quién hizo qué. Un fallo al auditar no debe tumbar la petición,
// pero sí queda en la consola del servidor.

import type { Request } from 'express';
import type { AccionAuditoria, Prisma } from '@prisma/client';
import { prisma, type Db } from './prisma.ts';

export interface Registro {
  accion: AccionAuditoria;
  /** Tabla o concepto afectado: 'Cita', 'Paciente', 'CierreDelDia'… */
  entidad: string;
  entidadId?: string | null;
  detalle?: Prisma.InputJsonValue | null;
  /** Por defecto, el usuario de la sesión */
  usuarioId?: string | null;
}

/** req puede ser {} en tareas sin petición (cierre automático) */
export async function auditar(
  req: { ip?: string; usuario?: Request['usuario'] },
  { accion, entidad, entidadId = null, detalle = null, usuarioId }: Registro,
  db: Db = prisma,
): Promise<void> {
  try {
    await db.auditoria.create({
      data: {
        usuarioId: usuarioId ?? req.usuario?.id ?? null,
        accion,
        entidad,
        entidadId,
        detalle: detalle ?? undefined,
        ip: req.ip,
      },
    });
  } catch (error) {
    console.error('No se pudo registrar la auditoría:', error instanceof Error ? error.message : error);
  }
}
