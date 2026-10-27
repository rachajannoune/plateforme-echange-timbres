import { prisma } from "../../utils/db";

export default defineEventHandler(async (event) => {

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

    const theme = query.theme
        ? String(query.theme)
        : undefined;

    const raretesValides = [
        "COURANT",
        "RECHERCHE",
        "RARE",
    ] as const;

    const rarete = query.rarete &&
        raretesValides.includes(
            query.rarete as typeof raretesValides[number]
        )
        ? query.rarete as typeof raretesValides[number]
        : undefined;

    const statutsValides = [
        "DISPONIBLE",
        "EN_ATTENTE",
        "RESERVE",
        "EN_ECHANGE",
    ] as const;

    const statut = query.statut &&
        statutsValides.includes(
            query.statut as typeof statutsValides[number]
        )
        ? query.statut as typeof statutsValides[number]
        : undefined;

    const ville = query.ville
        ? String(query.ville)
        : undefined;

    const titre = query.titre
        ? String(query.titre)
        : undefined;

    const timbres = await prisma.timbre.findMany({
        where: {
            statut: statut
                ? statut
                : {
                    not: "SUSPENDU",
                },

            theme: theme,
            rarete: rarete,

            proprietaire: {
                ville: ville,
            },

            titre: titre
                ? {
                    contains: titre,
                    mode: "insensitive",
                }
                : undefined,
        },

        include: {
            proprietaire: {
                select: {
                    id: true,
                    prenom: true,
                    ville: true,
                },
            },

            photos: {
                select: {
                    id: true,
                    face: true,
                    chemin: true,
                    typeMime: true,
                },
            },
        },

        skip: skip,
        take: taille,
    });

    const total = await prisma.timbre.count({
        where: {
            statut: statut
                ? statut
                : {
                    not: "SUSPENDU",
                },

            theme: theme,
            rarete: rarete,

            proprietaire: {
                ville: ville,
            },

            titre: titre
                ? {
                    contains: titre,
                    mode: "insensitive",
                }
                : undefined,
        },
    });

    return {
        page,
        taille,
        total,
        items: timbres,
    };
});