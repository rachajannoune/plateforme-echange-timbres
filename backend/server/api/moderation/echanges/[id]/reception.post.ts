import { prisma } from "../../../../utils/db";
import { exigerUtilisateurActif } from "../../../../utils/session";

export default defineEventHandler(async (event) => {

    const identif = getRouterParam(event, "id");

    if (!identif) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Identifiant de l'échange manquant.",
            details: null,
        };
    }

    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(identif)) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Identifiant de l'échange invalide.",
            details: null,
        };
    }

    const utilisateur = await exigerUtilisateurActif(event);

    if (utilisateur.role !== "MODERATEUR") {
        setResponseStatus(event, 403);

        return {
            code: 403,
            message: "Vous n'êtes pas autorisé à accéder à cette ressource.",
            details: null,
        };
    }

    const body = await readBody(event);

    if (
        !body ||
        typeof body.timbreId !== "string" ||
        !uuidRegex.test(body.timbreId)
    ) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Identifiant du timbre invalide ou manquant.",
            details: null,
        };
    }

    const echange = await prisma.echange.findUnique({
        where: {
            id: identif,
        },
    });

    if (!echange) {
        setResponseStatus(event, 404);

        return {
            code: 404,
            message: "Échange introuvable.",
            details: null,
        };
    }

    if (echange.etape !== "TIMBRES_ENVOYES") {
        setResponseStatus(event, 409);

        return {
            code: 409,
            message: "Cet échange ne peut pas être réceptionné.",
            details: null,
        };
    }

    if (
        body.timbreId !== echange.timbreOffertId &&
        body.timbreId !== echange.timbreDemandeId
    ) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Ce timbre ne fait pas partie de cet échange.",
            details: null,
        };
    }

    const resultat = await prisma.$transaction(async (tx) => {

        // Synchroniser les réceptions de cet échange.
        const verification = await tx.echange.updateMany({
            where: {
                id: identif,
                etape: "TIMBRES_ENVOYES",
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
                statusMessage: "Cet échange ne peut plus être réceptionné.",
            });
        }

        // Enregistrer uniquement le colis arrivé.
        const reception = await tx.envoi.updateMany({
            where: {
                echangeId: identif,
                timbreId: body.timbreId,
                sens: "ALLER",
                dateReception: null,
            },
            data: {
                dateReception: new Date(),
            },
        });

        if (reception.count !== 1) {
            throw createError({
                statusCode: 409,
                statusMessage: "Ce colis est introuvable ou déjà réceptionné.",
            });
        }

        // Vérifier si les deux colis ont été reçus.
        const nombreColisRecus = await tx.envoi.count({
            where: {
                echangeId: identif,
                sens: "ALLER",
                dateReception: {
                    not: null,
                },
            },
        });

        if (nombreColisRecus === 2) {

            const miseAJour = await tx.echange.updateMany({
                where: {
                    id: identif,
                    etape: "TIMBRES_ENVOYES",
                },
                data: {
                    etape: "TIMBRES_RECUS",
                    version: {
                        increment: 1,
                    },
                },
            });

            if (miseAJour.count !== 1) {
                throw createError({
                    statusCode: 409,
                    statusMessage: "L'échange ne peut plus passer à l'expertise.",
                });
            }
        }

        return await tx.echange.findUniqueOrThrow({
            where: {
                id: identif,
            },
        });
    });

    return {
        code: 200,
        message: "Réception enregistrée avec succès.",
        details: resultat,
    };
});