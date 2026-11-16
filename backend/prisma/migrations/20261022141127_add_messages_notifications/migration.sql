-- CreateEnum
CREATE TYPE "TypeNotification" AS ENUM ('ECHANGE', 'MESSAGE', 'SYSTEME');

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL,
    "echangeId" UUID NOT NULL,
    "auteurId" UUID NOT NULL,
    "contenu" TEXT NOT NULL,
    "dateEnvoi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateLecture" TIMESTAMP(3),
    "masque" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "utilisateurId" UUID NOT NULL,
    "echangeId" UUID,
    "type" "TypeNotification" NOT NULL,
    "titre" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "lue" BOOLEAN NOT NULL DEFAULT false,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_echangeId_fkey" FOREIGN KEY ("echangeId") REFERENCES "Echange"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_echangeId_fkey" FOREIGN KEY ("echangeId") REFERENCES "Echange"("id") ON DELETE SET NULL ON UPDATE CASCADE;
