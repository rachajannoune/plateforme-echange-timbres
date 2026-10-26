-- CreateEnum
CREATE TYPE "RareteTimbre" AS ENUM ('COURANT', 'RECHERCHE', 'RARE');

-- CreateEnum
CREATE TYPE "EtatTimbre" AS ENUM ('NEUF', 'NEUF_SANS_GOMME', 'OBLITERE');

-- CreateEnum
CREATE TYPE "StatutTimbre" AS ENUM ('DISPONIBLE', 'EN_ATTENTE', 'RESERVE', 'EN_ECHANGE', 'SUSPENDU');

-- CreateTable
CREATE TABLE "Timbre" (
    "id" UUID NOT NULL,
    "proprietaireId" UUID NOT NULL,
    "titre" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "pays" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "valeurFaciale" TEXT NOT NULL,
    "coteEstimee" INTEGER NOT NULL,
    "couleurImpression" TEXT NOT NULL,
    "rarete" "RareteTimbre" NOT NULL,
    "etat" "EtatTimbre" NOT NULL,
    "referenceCatalogue" TEXT,
    "statut" "StatutTimbre" NOT NULL DEFAULT 'DISPONIBLE',
    "expertise" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "dateDepot" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Timbre_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Timbre" ADD CONSTRAINT "Timbre_proprietaireId_fkey" FOREIGN KEY ("proprietaireId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
