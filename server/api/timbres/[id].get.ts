import { prisma } from "../../utils/db";

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
    const timbre = await prisma.timbre.findUnique({
        where: {
            id: identif,
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
    });
    if (!timbre) {
        setResponseStatus(event, 404);

        return {
            code: 404,

            message: "Timbre introuvable.",
            details: null,
        };
    }

    if (timbre.statut === "SUSPENDU") {
        setResponseStatus(event, 404);

        return {
            code: 404,
            message: "Timbre introuvable.",
            details: null,
        };
    }

    return timbre;
});