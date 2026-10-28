import { prisma } from "../../utils/db";
import { lireSession } from "../../utils/session";

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

    const echange = await prisma.echange.findUnique({
        where: {
            id: identif,
        },
        include: {
            timbreOffert: {
                include: {
                    photos: {
                        select: {
                            id: true,
                            face: true,
                            chemin: true,
                            typeMime: true,
                        },
                    },
                },
            },

            timbreDemande: {
                include: {
                    photos: {
                        select: {
                            id: true,
                            face: true,
                            chemin: true,
                            typeMime: true,
                        },
                    },
                },
            },

            proposant: {
                select: {
                    id: true,
                    prenom: true,
                    ville: true,
                },
            },

            destinataire: {
                select: {
                    id: true,
                    prenom: true,
                    ville: true,
                },
            },

            envois: {
                select: {
                    id: true,
                    timbreId: true,
                    sens: true,
                    numeroSuivi: true,
                    dateEnvoi: true,
                    dateReception: true,
                    etatColis: true,
                },
            },
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

    if (
        echange.proposantId !== session &&
        echange.destinataireId !== session
    ) {
        setResponseStatus(event, 403);

        return {
            code: 403,
            message: "Vous n'êtes pas autorisé à consulter cet échange.",
            details: null,
        };
    }

    return echange;
});