-- CreateEnum
CREATE TYPE "RoleUtilisateur" AS ENUM ('MEMBRE', 'MODERATEUR');

-- CreateEnum
CREATE TYPE "StatutUtilisateur" AS ENUM ('ACTIF', 'SUSPENDU');

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" UUID NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasseHash" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "role" "RoleUtilisateur" NOT NULL DEFAULT 'MEMBRE',
    "statut" "StatutUtilisateur" NOT NULL DEFAULT 'ACTIF',
    "dateAcceptationChart" TIMESTAMP(3) NOT NULL,
    "dateInscription" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");
