// req.usuario: lo deja el middleware autenticar (src/middlewares/auth.ts)
import type { Usuario } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      usuario?: Usuario;
    }
  }
}

export {};
