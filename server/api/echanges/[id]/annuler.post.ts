import { prisma } from "../../../utils/db";
import { lireSession } from "../../../utils/session";

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

    const session = lireSession(event);

    if (!session) {
        setResponseStatus(event, 401);

        return {
            code: 401,
            message: "Connexion expirée. Veuillez vous reconnecter.",
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

    if (session !== findEchange.proposantId) {
        setResponseStatus(event, 403);

        return {
            code: 403,
            message: "Seul le proposant peut annuler cette proposition.",
            details: null,
        };
    }

    if (findEchange.etape !== "EN_ATTENTE") {
        setResponseStatus(event, 409);

        return {
            code: 409,
            message: "Cette proposition ne peut plus être annulée.",
            details: null,
        };
    }

    const resultat = await prisma.$transaction(async (tx) => {

        const echangeAnnule = await tx.echange.update({
            where: {
                id: identif,
            },
            data: {
                etape: "ANNULE",
                version: {
                    increment: 1,
                },
            },
        });

        await tx.timbre.update({
            where: {
                id: findEchange.timbreOffertId,
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
            await tx.timbre.update({
                where: {
                    id: findEchange.timbreDemandeId,
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
                utilisateurId: findEchange.destinataireId,
                echangeId: identif,
                type: "ECHANGE",
                titre: "Proposition annulée",
                contenu:
                    "La proposition d'échange a été annulée par le proposant.",
            },
        });

        return echangeAnnule;
    });

    return {
        code: 200,
        message: "Proposition annulée avec succès.",
        details: resultat,
    };
});