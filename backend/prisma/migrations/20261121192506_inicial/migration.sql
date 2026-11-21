-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'RECEPCIONISTA', 'ENFERMERA', 'ODONTOLOGA');

-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('FEMENINO', 'MASCULINO', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoCita" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'PREPARADA', 'ATENDIDA', 'NO_ASISTIO', 'ANULADA');

-- CreateEnum
CREATE TYPE "TipoAntecedente" AS ENUM ('ENFERMEDAD', 'MEDICACION', 'ALERGIA', 'CIRUGIA', 'EMBARAZO', 'HABITO', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoAlerta" AS ENUM ('SIGNOS_VITALES', 'ALERGIA', 'ANTECEDENTE');

-- CreateEnum
CREATE TYPE "Severidad" AS ENUM ('CRITICA', 'ALTA', 'MODERADA');

-- CreateEnum
CREATE TYPE "EstadoProcedimiento" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'COMPLETADO');

-- CreateEnum
CREATE TYPE "EstadoDiente" AS ENUM ('SANO', 'CARIES', 'TRATADO', 'OBSERVACION', 'AUSENTE');

-- CreateEnum
CREATE TYPE "CaraDiente" AS ENUM ('OCLUSAL', 'MESIAL', 'DISTAL', 'VESTIBULAR', 'LINGUAL', 'COMPLETA');

-- CreateEnum
CREATE TYPE "CanalRecordatorio" AS ENUM ('CORREO', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "EstadoRecordatorio" AS ENUM ('PENDIENTE', 'ENVIADO', 'FALLIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "AccionAuditoria" AS ENUM ('LOGIN', 'LOGIN_FALLIDO', 'LOGOUT', 'VER', 'CREAR', 'ACTUALIZAR', 'ANULAR', 'DESCARGAR');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "debeCambiarPassword" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAcceso" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pacientes" (
    "id" TEXT NOT NULL,
    "cedula" VARCHAR(10) NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "fechaNacimiento" DATE NOT NULL,
    "sexo" "Sexo" NOT NULL,
    "telefono" VARCHAR(15),
    "correo" TEXT,
    "direccion" TEXT,
    "contactoEmergenciaNombre" TEXT,
    "contactoEmergenciaTelefono" VARCHAR(15),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pacientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "antecedentes" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "tipo" "TipoAntecedente" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "registradoPorId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "antecedentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citas" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "duracionMin" INTEGER NOT NULL DEFAULT 30,
    "tipoConsulta" TEXT NOT NULL,
    "estado" "EstadoCita" NOT NULL DEFAULT 'PENDIENTE',
    "motivo" TEXT,
    "confirmadaEn" TIMESTAMP(3),
    "llegadaEn" TIMESTAMP(3),
    "preparadaEn" TIMESTAMP(3),
    "atendidaEn" TIMESTAMP(3),
    "anuladaEn" TIMESTAMP(3),
    "motivoAnulacion" TEXT,
    "anuladaPorId" TEXT,
    "creadaPorId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "citas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signos_vitales" (
    "id" TEXT NOT NULL,
    "citaId" TEXT NOT NULL,
    "presionSistolica" INTEGER NOT NULL,
    "presionDiastolica" INTEGER NOT NULL,
    "pulso" INTEGER NOT NULL,
    "temperatura" DECIMAL(4,1) NOT NULL,
    "frecuenciaRespiratoria" INTEGER,
    "saturacionO2" INTEGER,
    "pesoKg" DECIMAL(5,2),
    "tallaCm" DECIMAL(5,1),
    "observaciones" TEXT,
    "edadMeses" INTEGER NOT NULL,
    "registradoPorId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signos_vitales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas_medicas" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "citaId" TEXT,
    "signosVitalesId" TEXT,
    "tipo" "TipoAlerta" NOT NULL,
    "signo" TEXT,
    "severidad" "Severidad" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertas_medicas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnosticos" (
    "id" TEXT NOT NULL,
    "citaId" TEXT NOT NULL,
    "piezas" INTEGER[],
    "procedimiento" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "notas" TEXT,
    "estado" "EstadoProcedimiento" NOT NULL DEFAULT 'EN_PROCESO',
    "odontologoId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnosticos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marcas_odontograma" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "citaId" TEXT NOT NULL,
    "pieza" INTEGER NOT NULL,
    "cara" "CaraDiente" NOT NULL DEFAULT 'COMPLETA',
    "estado" "EstadoDiente" NOT NULL,
    "registradoPorId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marcas_odontograma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recetas" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "citaId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "odontologoId" TEXT NOT NULL,
    "indicaciones" TEXT,
    "anuladaEn" TIMESTAMP(3),
    "motivoAnulacion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recetas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receta_medicamentos" (
    "id" TEXT NOT NULL,
    "recetaId" TEXT NOT NULL,
    "medicamento" TEXT NOT NULL,
    "dosis" TEXT NOT NULL,
    "frecuencia" TEXT NOT NULL,
    "duracion" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "receta_medicamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consentimientos" (
    "id" TEXT NOT NULL,
    "citaId" TEXT NOT NULL,
    "procedimiento" TEXT NOT NULL,
    "textoAceptado" TEXT NOT NULL,
    "firmanteNombre" TEXT NOT NULL,
    "firmanteCedula" VARCHAR(10) NOT NULL,
    "esRepresentante" BOOLEAN NOT NULL DEFAULT false,
    "aceptadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "odontologoId" TEXT NOT NULL,

    CONSTRAINT "consentimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recordatorios" (
    "id" TEXT NOT NULL,
    "citaId" TEXT NOT NULL,
    "canal" "CanalRecordatorio" NOT NULL,
    "programadoPara" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoRecordatorio" NOT NULL DEFAULT 'PENDIENTE',
    "enviadoEn" TIMESTAMP(3),
    "error" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recordatorios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "accion" "AccionAuditoria" NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT,
    "detalle" JSONB,
    "ip" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "pacientes_cedula_key" ON "pacientes"("cedula");

-- CreateIndex
CREATE INDEX "pacientes_apellidos_nombres_idx" ON "pacientes"("apellidos", "nombres");

-- CreateIndex
CREATE INDEX "antecedentes_pacienteId_idx" ON "antecedentes"("pacienteId");

-- CreateIndex
CREATE INDEX "citas_inicio_idx" ON "citas"("inicio");

-- CreateIndex
CREATE INDEX "citas_pacienteId_idx" ON "citas"("pacienteId");

-- CreateIndex
CREATE INDEX "citas_estado_idx" ON "citas"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "signos_vitales_citaId_key" ON "signos_vitales"("citaId");

-- CreateIndex
CREATE INDEX "alertas_medicas_pacienteId_idx" ON "alertas_medicas"("pacienteId");

-- CreateIndex
CREATE INDEX "alertas_medicas_creadoEn_idx" ON "alertas_medicas"("creadoEn");

-- CreateIndex
CREATE INDEX "diagnosticos_citaId_idx" ON "diagnosticos"("citaId");

-- CreateIndex
CREATE INDEX "marcas_odontograma_pacienteId_idx" ON "marcas_odontograma"("pacienteId");

-- CreateIndex
CREATE UNIQUE INDEX "marcas_odontograma_citaId_pieza_cara_key" ON "marcas_odontograma"("citaId", "pieza", "cara");

-- CreateIndex
CREATE UNIQUE INDEX "recetas_numero_key" ON "recetas"("numero");

-- CreateIndex
CREATE INDEX "recetas_pacienteId_idx" ON "recetas"("pacienteId");

-- CreateIndex
CREATE INDEX "consentimientos_citaId_idx" ON "consentimientos"("citaId");

-- CreateIndex
CREATE INDEX "recordatorios_estado_programadoPara_idx" ON "recordatorios"("estado", "programadoPara");

-- CreateIndex
CREATE INDEX "auditoria_entidad_entidadId_idx" ON "auditoria"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "auditoria_usuarioId_idx" ON "auditoria"("usuarioId");

-- CreateIndex
CREATE INDEX "auditoria_creadoEn_idx" ON "auditoria"("creadoEn");

-- AddForeignKey
ALTER TABLE "antecedentes" ADD CONSTRAINT "antecedentes_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antecedentes" ADD CONSTRAINT "antecedentes_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citas" ADD CONSTRAINT "citas_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citas" ADD CONSTRAINT "citas_creadaPorId_fkey" FOREIGN KEY ("creadaPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citas" ADD CONSTRAINT "citas_anuladaPorId_fkey" FOREIGN KEY ("anuladaPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signos_vitales" ADD CONSTRAINT "signos_vitales_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "citas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signos_vitales" ADD CONSTRAINT "signos_vitales_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_medicas" ADD CONSTRAINT "alertas_medicas_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_medicas" ADD CONSTRAINT "alertas_medicas_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "citas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_medicas" ADD CONSTRAINT "alertas_medicas_signosVitalesId_fkey" FOREIGN KEY ("signosVitalesId") REFERENCES "signos_vitales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnosticos" ADD CONSTRAINT "diagnosticos_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "citas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnosticos" ADD CONSTRAINT "diagnosticos_odontologoId_fkey" FOREIGN KEY ("odontologoId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marcas_odontograma" ADD CONSTRAINT "marcas_odontograma_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marcas_odontograma" ADD CONSTRAINT "marcas_odontograma_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "citas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marcas_odontograma" ADD CONSTRAINT "marcas_odontograma_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recetas" ADD CONSTRAINT "recetas_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "citas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recetas" ADD CONSTRAINT "recetas_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recetas" ADD CONSTRAINT "recetas_odontologoId_fkey" FOREIGN KEY ("odontologoId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receta_medicamentos" ADD CONSTRAINT "receta_medicamentos_recetaId_fkey" FOREIGN KEY ("recetaId") REFERENCES "recetas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consentimientos" ADD CONSTRAINT "consentimientos_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "citas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consentimientos" ADD CONSTRAINT "consentimientos_odontologoId_fkey" FOREIGN KEY ("odontologoId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recordatorios" ADD CONSTRAINT "recordatorios_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "citas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
