-- CreateEnum
CREATE TYPE "FaceTimbre" AS ENUM ('RECTO', 'VERSO');

-- CreateTable
CREATE TABLE "PhotoTimbre" (
    "id" UUID NOT NULL,
    "timbreId" UUID NOT NULL,
    "face" "FaceTimbre" NOT NULL,
    "chemin" TEXT NOT NULL,
    "typeMime" TEXT NOT NULL,
    "tailleOctets" INTEGER NOT NULL,

    CONSTRAINT "PhotoTimbre_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhotoTimbre_timbreId_face_key" ON "PhotoTimbre"("timbreId", "face");

-- AddForeignKey
ALTER TABLE "PhotoTimbre" ADD CONSTRAINT "PhotoTimbre_timbreId_fkey" FOREIGN KEY ("timbreId") REFERENCES "Timbre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
