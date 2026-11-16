-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "jetonHash" CHAR(64) NOT NULL,
    "utilisateurId" UUID NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateExpiration" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_jetonHash_key" ON "Session"("jetonHash");

-- CreateIndex
CREATE INDEX "Session_utilisateurId_idx" ON "Session"("utilisateurId");

-- CreateIndex
CREATE INDEX "Session_dateExpiration_idx" ON "Session"("dateExpiration");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;
