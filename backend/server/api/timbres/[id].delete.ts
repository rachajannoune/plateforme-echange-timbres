import { prisma } from "../../utils/db";
import { exigerUtilisateurActif } from "../../utils/session";
import { unlink } from "node:fs/promises";
import { join } from "node:path";

export default defineEventHandler(async (event) => {
    const utilisateur = await exigerUtilisateurActif(event);

    const identif = getRouterParam(event, "id");

    if (!identif) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Identifiant du timbre manquant.",
            details: null,
        };
    }

    const uuidValide =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identif);

    if (!uuidValide) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Identifiant du timbre invalide.",
            details: null,
        };
    }

    const timbre = await prisma.timbre.findUnique({
        where: {
            id: identif,
        },
        include: {
            photos: {
                select: {
                    chemin: true,
                },
            },
        },
    });

    if (!timbre) {
        setResponseStatus(event, 404);

        return {
            code: 404,
            message: "Timbre introuvable.",
            details: null,
        };
    }

    if (timbre.proprietaireId !== utilisateur.id) {
        setResponseStatus(event, 403);

        return {
            code: 403,
            message: "Vous n'êtes pas autorisé à supprimer ce timbre.",
            details: null,
        };
    }

    if (timbre.statut !== "DISPONIBLE") {
        setResponseStatus(event, 409);

        return {
            code: 409,
            message: "Ce timbre ne peut être supprimé que lorsqu'il est disponible.",
            details: null,
        };
    }

    const photos = await prisma.$transaction(async (tx) => {

        const verification = await tx.timbre.updateMany({
            where: {
                id: identif,
                proprietaireId: utilisateur.id,
                statut: "DISPONIBLE",
            },
            data: {
                version: {
                    increment: 1,
                },
            },
        });

        if (verification.count !== 1) {
            throw createError({
                statusCode: 409,
                statusMessage: "Le timbre ne peut plus être supprimé.",
            });
        }

        const echangeExistant = await tx.echange.findFirst({
            where: {
                OR: [
                    {
                        timbreOffertId: identif,
                    },
                    {
                        timbreDemandeId: identif,
                    },
                ],
            },
        });

        if (echangeExistant) {
            throw createError({
                statusCode: 409,
                statusMessage: "Ce timbre possède un historique d'échange et ne peut pas être supprimé.",
            });
        }

        await tx.photoTimbre.deleteMany({
            where: {
                timbreId: identif,
            },
        });

        const suppression = await tx.timbre.deleteMany({
            where: {
                id: identif,
                proprietaireId: utilisateur.id,
                statut: "DISPONIBLE",
            },
        });

        if (suppression.count !== 1) {
            throw createError({
                statusCode: 409,
                statusMessage: "Le timbre ne peut plus être supprimé.",
            });
        }

        return timbre.photos;
    });

    for (const photo of photos) {

        const cheminFichier = join(
            process.cwd(),
            "public",
            photo.chemin,
        );

        try {
            await unlink(cheminFichier);
        } catch {
            // Le fichier peut déjà ne plus exister.
        }
    }

    return {
        code: 200,
        message: "Timbre supprimé avec succès.",
        details: null,
    };
});