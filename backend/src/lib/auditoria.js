// ==================== AUDITORÍA ====================
// Registra quién hizo qué. Un fallo al auditar no debe tumbar la petición,
// pero sí queda en la consola del servidor.

import { prisma } from './prisma.js';

export async function auditar(req, { accion, entidad, entidadId = null, detalle = null, usuarioId }, db = prisma) {
  try {
    await db.auditoria.create({
      data: {
        usuarioId: usuarioId ?? req.usuario?.id ?? null,
        accion,
        entidad,
        entidadId,
        detalle,
        ip: req.ip,
      },
    });
  } catch (error) {
    console.error('No se pudo registrar la auditoría:', error.message);
  }
}
