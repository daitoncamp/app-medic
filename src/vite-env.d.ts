/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Dirección de la API en producción (por defecto, /api en el mismo servidor) */
  readonly VITE_API_URL?: string;
}
