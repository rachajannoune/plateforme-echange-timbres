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

    if (session !== findEchange.destinataireId) {
        setResponseStatus(event, 403);

        return {
            code: 403,
            message: "Seul le destinataire peut accepter cette proposition.",
            details: null,
        };
    }

    if (findEchange.etape !== "EN_ATTENTE") {
        setResponseStatus(event, 409);

        return {
            code: 409,
            message: "Cette proposition ne peut plus être acceptée.",
            details: null,
        };
    }

    const timbres = await prisma.timbre.findMany({
        where: {
            id: {
                in: [
                    findEchange.timbreOffertId,
                    findEchange.timbreDemandeId,
                ],
            },
        },
    });

    const timbreOffert = timbres.find(
        (timbre) => timbre.id === findEchange.timbreOffertId
    );

    const timbreDemande = timbres.find(
        (timbre) => timbre.id === findEchange.timbreDemandeId
    );

    if (!timbreOffert || !timbreDemande) {
        setResponseStatus(event, 404);

        return {
            code: 404,
            message: "Un ou plusieurs timbres de l'échange sont introuvables.",
            details: null,
        };
    }

    if (
        timbreDemande.statut === "RESERVE" ||
        timbreDemande.statut === "EN_ECHANGE"
    ) {
        setResponseStatus(event, 409);

        return {
            code: 409,
            message: "Le timbre demandé ne peut pas participer à cet échange dans son état actuel.",
            details: null,
        };
    }

    if (timbreOffert.statut !== "RESERVE") {
        setResponseStatus(event, 409);

        return {
            code: 409,
            message: "Le timbre offert n'est plus réservé pour cette proposition.",
            details: null,
        };
    }

    const dateAcceptation = new Date();

    const dateLimiteEnvoi = new Date(dateAcceptation);
    dateLimiteEnvoi.setDate(
        dateLimiteEnvoi.getDate() + 3
    );

    const resultat = await prisma.$transaction(async (tx) => {

        const echangeAccepte = await tx.echange.update({
            where: {
                id: identif,
            },
            data: {
                etape: "ACCEPTE",
                dateAcceptation: dateAcceptation,
                dateLimiteEnvoi: dateLimiteEnvoi,
                version: {
                    increment: 1,
                },
            },
        });

        await tx.timbre.updateMany({
            where: {
                id: {
                    in: [
                        findEchange.timbreOffertId,
                        findEchange.timbreDemandeId,
                    ],
                },
            },
            data: {
                statut: "EN_ECHANGE",
            },
        });

        const propositionsConcurrents =
            await tx.echange.findMany({
                where: {
                    id: {
                        not: identif,
                    },
                    etape: "EN_ATTENTE",
                    OR: [
                        {
                            timbreOffertId: {
                                in: [
                                    findEchange.timbreOffertId,
                                    findEchange.timbreDemandeId,
                                ],
                            },
                        },
                        {
                            timbreDemandeId: {
                                in: [
                                    findEchange.timbreOffertId,
                                    findEchange.timbreDemandeId,
                                ],
                            },
                        },
                    ],
                },
                select: {
                    id: true,
                    timbreOffertId: true,
                },
            });

        await tx.echange.updateMany({
            where: {
                id: {
                    in: propositionsConcurrents.map(
                        (proposition) => proposition.id
                    ),
                },
            },
            data: {
                etape: "ANNULE",
                motifAnnulation:
                    "Proposition annulée automatiquement car un échange concurrent a été accepté.",
            },
        });

        const timbresAReLiberer =
            propositionsConcurrents
                .map((proposition) => proposition.timbreOffertId)
                .filter(
                    (timbreId) =>
                        timbreId !== findEchange.timbreOffertId &&
                        timbreId !== findEchange.timbreDemandeId
                );

        if (timbresAReLiberer.length > 0) {
            await tx.timbre.updateMany({
                where: {
                    id: {
                        in: timbresAReLiberer,
                    },
                },
                data: {
                    statut: "DISPONIBLE",
                },
            });
        }
        await tx.notification.create({
            data: {
                utilisateurId: findEchange.proposantId,
                echangeId: identif,
                type: "ECHANGE",
                titre: "Proposition acceptée",
                contenu: "Votre proposition d'échange a été acceptée.",
            },
        });
        return echangeAccepte;
    });

    return {
        code: 200,
        message: "Proposition acceptée avec succès.",
        details: resultat,
    };
});