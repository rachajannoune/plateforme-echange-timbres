-- CreateEnum
CREATE TYPE "SensEnvoi" AS ENUM ('ALLER', 'RETOUR');

-- CreateTable
CREATE TABLE "Envoi" (
    "id" UUID NOT NULL,
    "echangeId" UUID NOT NULL,
    "timbreId" UUID NOT NULL,
    "sens" "SensEnvoi" NOT NULL,
    "numeroSuivi" TEXT NOT NULL,
    "dateEnvoi" TIMESTAMP(3) NOT NULL,
    "dateReception" TIMESTAMP(3),
    "etatColis" TEXT,

    CONSTRAINT "Envoi_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Envoi" ADD CONSTRAINT "Envoi_echangeId_fkey" FOREIGN KEY ("echangeId") REFERENCES "Echange"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Envoi" ADD CONSTRAINT "Envoi_timbreId_fkey" FOREIGN KEY ("timbreId") REFERENCES "Timbre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
