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

    if (session !== findEchange.destinataireId) {
        setResponseStatus(event, 403);

        return {
            code: 403,
            message: "Seul le destinataire peut refuser cette proposition.",
            details: null,
        };
    }

    if (findEchange.etape !== "EN_ATTENTE") {
        setResponseStatus(event, 409);

        return {
            code: 409,
            message: "Cette proposition ne peut plus être refusée.",
            details: null,
        };
    }

    const resultat = await prisma.$transaction(async (tx) => {

        const refus = await tx.echange.updateMany({
            where: {
                id: identif,
                etape: "EN_ATTENTE",
                destinataireId: session,
            },
            data: {
                etape: "REFUSE",
                version: {
                    increment: 1,
                },
            },
        });

        if (refus.count !== 1) {
            throw createError({
                statusCode: 409,
                statusMessage: "Cette proposition ne peut plus être refusée.",
            });
        }
        const echangeRefuse = await tx.echange.findUniqueOrThrow({
            where: {
                id: identif,
            },
        });
        await tx.timbre.updateMany({
            where: {
                id: findEchange.timbreOffertId,
                statut: "RESERVE",
            },
            data: {
                statut: "DISPONIBLE",
                version: {
                    increment: 1,
                },
            },
        });

        const autreProposition = await tx.echange.findFirst({
            where: {
                timbreDemandeId: findEchange.timbreDemandeId,
                etape: "EN_ATTENTE",
                id: {
                    not: identif,
                },
            },
        });


        if (!autreProposition) {
            await tx.timbre.updateMany({
                where: {
                    id: findEchange.timbreDemandeId,
                    statut: "EN_ATTENTE",
                },
                data: {
                    statut: "DISPONIBLE",
                    version: {
                        increment: 1,
                    },
                },
            });
        }

        await tx.notification.create({
            data: {
                utilisateurId: findEchange.proposantId,
                echangeId: identif,
                type: "ECHANGE",
                titre: "Proposition refusée",
                contenu: "Votre proposition d'échange a été refusée.",
            },
        });

        return echangeRefuse;
    });

    return {
        code: 200,
        message: "Proposition refusée avec succès.",
        details: resultat,
    };
});