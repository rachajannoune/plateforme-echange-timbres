import { prisma } from "../../utils/db";
import { lireSession } from "../../utils/session";

export default defineEventHandler(async (event) => {
    const session = lireSession(event);
    const query = getQuery(event);

    const pageDemandee = Number(query.page);
    const tailleDemandee = Number(query.taille);
    const page =
        Number.isInteger(pageDemandee) && pageDemandee > 0
            ? pageDemandee
            : 1;

    const taille =
        Number.isInteger(tailleDemandee) &&
            tailleDemandee > 0 &&
            tailleDemandee <= 50
            ? tailleDemandee
            : 10;

    const skip = (page - 1) * taille;
    if (!session) {
        setResponseStatus(event, 401);

        return {
            code: 401,
            message: "Connexion expirée. Veuillez vous reconnecter.",
            details: null,
        };
    }

    if (query.type !== "recues" && query.type !== "envoyees") {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Le type doit être 'recues' ou 'envoyees'.",
            details: null,
        };
    }

    const filtre = query.type === "recues"
        ? { destinataireId: session }
        : { proposantId: session };

    const echanges = await prisma.echange.findMany({
        where: filtre,

        include: {
            timbreOffert: {
                select: {
                    id: true,
                    titre: true,
                    statut: true,
                    rarete: true,
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
                select: {
                    id: true,
                    titre: true,
                    statut: true,
                    rarete: true,
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
                    ville: true
                },
            },

            destinataire: {
                select: {
                    id: true,
                    prenom: true,
                    ville: true
                },

            },
            _count: {
                select: {
                    messages: {
                        where: {
                            auteurId: {
                                not: session,
                            },
                            dateLecture: null,
                            masque: false,
                        },
                    },
                },
            },
        },

        skip: skip,
        take: taille,
    });


    const total = await prisma.echange.count({
        where: filtre,

    });

    return {
        page,
        taille,
        total,
        items: echanges,
    };
});