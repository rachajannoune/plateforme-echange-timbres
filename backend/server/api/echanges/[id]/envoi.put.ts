import { prisma } from "../../../utils/db";
import { exigerUtilisateurActif } from "../../../utils/session";

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

    const uuidValide =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identif);

    if (!uuidValide) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Identifiant de l'échange invalide.",
            details: null,
        };
    }

    const utilisateur = await exigerUtilisateurActif(event);
    const session = utilisateur.id;

    if (utilisateur.role !== "MEMBRE") {
        setResponseStatus(event, 403);

        return {
            code: 403,
            message: "Action réservée aux membres.",
            details: null,
        };
    }
    const findEchange = await prisma.echange.findUnique({
        where: {
            id: identif,
        },
    });

    if (!findEchange) {
        setResponseStatus(event, 404);

        return {
            code: 404,
            message: "Échange introuvable.",
            details: null,
        };
    }

    if (
        session !== findEchange.destinataireId &&
        session !== findEchange.proposantId
    ) {
        setResponseStatus(event, 403);

        return {
            code: 403,
            message: "Vous n'êtes pas autorisé à déclarer un envoi pour cet échange.",
            details: null,
        };
    }

    if (findEchange.etape !== "ACCEPTE") {
        setResponseStatus(event, 409);

        return {
            code: 409,
            message: "L'envoi ne peut être déclaré que pour un échange accepté.",
            details: null,
        };
    }

    const body = await readBody(event);

    if (!body ||
        typeof body.numeroSuivi !== "string" ||
        body.numeroSuivi.trim() === ""
    ) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Le numéro de suivi est obligatoire et doit être valide.",
            details: null,
        };
    }

    const timbreId =
        session === findEchange.proposantId
            ? findEchange.timbreOffertId
            : findEchange.timbreDemandeId;

    const resultat = await prisma.$transaction(async (tx) => {
        
        // Empêcher deux déclarations de modifier le même échange simultanément.
        const verification = await tx.echange.updateMany({
            where: {
                id: identif,
                etape: "ACCEPTE",
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
                statusMessage: "L'échange ne permet plus de déclarer un envoi.",
            });
        }

        // Vérifier si ce membre a déjà déclaré son colis.
        const envoiExistant = await tx.envoi.findFirst({
            where: {
                echangeId: identif,
                timbreId: timbreId,
                sens: "ALLER",
            },
        });

        if (envoiExistant) {
            throw createError({
                statusCode: 409,
                statusMessage: "L'envoi de ce timbre a déjà été déclaré.",
            });
        }

        const nouvelEnvoi = await tx.envoi.create({
            data: {
                echangeId: identif,
                timbreId: timbreId,
                sens: "ALLER",
                numeroSuivi: body.numeroSuivi.trim(),
                dateEnvoi: new Date(),
            },
        });

        const nombreEnvoisAller = await tx.envoi.count({
            where: {
                echangeId: identif,
                sens: "ALLER",
            },
        });

        if (nombreEnvoisAller === 2) {

            const miseAjour = await tx.echange.updateMany({
                where: {
                    id: identif,
                    etape: "ACCEPTE"
                },
                data: {
                    etape: "TIMBRES_ENVOYES",
                    version: {
                        increment: 1,
                    },
                },
            });
            if (miseAjour.count !== 1) {
                throw createError({
                    statusCode: 409,
                    statusMessage: "L'échange ne permet plus de déclarer cet envoi.",
                });
            }
            await tx.notification.create({
                data: {
                    utilisateurId: findEchange.proposantId,
                    echangeId: identif,
                    type: "ECHANGE",
                    titre: "Timbres envoyés",
                    contenu: "Les deux timbres ont été déclarés comme envoyés.",
                },
            });

            await tx.notification.create({
                data: {
                    utilisateurId: findEchange.destinataireId,
                    echangeId: identif,
                    type: "ECHANGE",
                    titre: "Timbres envoyés",
                    contenu: "Les deux timbres ont été déclarés comme envoyés.",
                },
            });
        }

        return nouvelEnvoi;
    });

    return {
        code: 200,
        message: "Envoi déclaré avec succès.",
        details: resultat,
    };
});