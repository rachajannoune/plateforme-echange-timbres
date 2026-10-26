-- CreateEnum
CREATE TYPE "ResultatExpertise" AS ENUM ('CONFORME', 'NON_CONFORME');

-- CreateTable
CREATE TABLE "Expertise" (
    "id" UUID NOT NULL,
    "echangeId" UUID NOT NULL,
    "timbreId" UUID NOT NULL,
    "resultat" "ResultatExpertise" NOT NULL,
    "motif" TEXT,
    "etatCorrige" "EtatTimbre",
    "coteCorrigee" INTEGER,
    "dateExpertise" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expertise_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Expertise" ADD CONSTRAINT "Expertise_echangeId_fkey" FOREIGN KEY ("echangeId") REFERENCES "Echange"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expertise" ADD CONSTRAINT "Expertise_timbreId_fkey" FOREIGN KEY ("timbreId") REFERENCES "Timbre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
