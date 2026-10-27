import { prisma } from "../../utils/db";
import { lireSession } from "../../utils/session";
import { unlink } from "node:fs/promises";
import { join } from "node:path";

export default defineEventHandler(async (event) => {

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

    const session = lireSession(event);

    if (!session) {
        setResponseStatus(event, 401);

        return {
            code: 401,
            message: "Connexion expirée. Veuillez vous reconnecter.",
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

    if (timbre.proprietaireId !== session) {
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

    for (const photo of timbre.photos) {

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

    await prisma.photoTimbre.deleteMany({
        where: {
            timbreId: identif,
        },
    });

    await prisma.timbre.delete({
        where: {
            id: identif,
        },
    });

    return {
        code: 200,
        message: "Timbre supprimé avec succès.",
        details: null,
    };
});