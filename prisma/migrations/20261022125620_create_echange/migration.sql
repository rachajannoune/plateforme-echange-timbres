-- CreateEnum
CREATE TYPE "EtapeEchange" AS ENUM ('EN_ATTENTE', 'ACCEPTE', 'TIMBRES_ENVOYES', 'TIMBRES_RECUS', 'EXPERTISE', 'VALIDE', 'RENVOI_CROISE', 'CONCLU', 'REFUSE', 'ANNULE', 'REJETE');

-- CreateTable
CREATE TABLE "Echange" (
    "id" UUID NOT NULL,
    "proposantId" UUID NOT NULL,
    "destinataireId" UUID NOT NULL,
    "timbreOffertId" UUID NOT NULL,
    "timbreDemandeId" UUID NOT NULL,
    "etape" "EtapeEchange" NOT NULL DEFAULT 'EN_ATTENTE',
    "motifAnnulation" TEXT,
    "motifRejet" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateAcceptation" TIMESTAMP(3),
    "dateLimiteEnvoi" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Echange_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Echange" ADD CONSTRAINT "Echange_proposantId_fkey" FOREIGN KEY ("proposantId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Echange" ADD CONSTRAINT "Echange_destinataireId_fkey" FOREIGN KEY ("destinataireId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Echange" ADD CONSTRAINT "Echange_timbreOffertId_fkey" FOREIGN KEY ("timbreOffertId") REFERENCES "Timbre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Echange" ADD CONSTRAINT "Echange_timbreDemandeId_fkey" FOREIGN KEY ("timbreDemandeId") REFERENCES "Timbre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
