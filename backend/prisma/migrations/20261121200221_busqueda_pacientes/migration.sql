-- AlterTable
ALTER TABLE "pacientes" ADD COLUMN     "textoBusqueda" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "pacientes_textoBusqueda_idx" ON "pacientes"("textoBusqueda");
