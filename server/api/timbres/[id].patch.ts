import { prisma } from "../../utils/db";
import { lireSession } from "../../utils/session";

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
            message: "Vous n'êtes pas autorisé à modifier ce timbre.",
            details: null,
        };
    }

    if (
        timbre.statut !== "DISPONIBLE" &&
        timbre.statut !== "SUSPENDU"
    ) {
        setResponseStatus(event, 409);

        return {
            code: 409,
            message: "Ce timbre ne peut pas être modifié dans son état actuel.",
            details: null,
        };
    }
    const body = await readBody(event);

    if (!body || typeof body !== "object") {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Les données de modification sont invalides.",
            details: null,
        };
    }

    if (
        (body.titre !== undefined &&
            (typeof body.titre !== "string" ||
                body.titre.trim() === "")) ||

        (body.theme !== undefined &&
            (typeof body.theme !== "string" ||
                body.theme.trim() === "")) ||

        (body.pays !== undefined &&
            (typeof body.pays !== "string" ||
                body.pays.trim() === "")) ||

        (body.valeurFaciale !== undefined &&
            (typeof body.valeurFaciale !== "string" ||
                body.valeurFaciale.trim() === "")) ||

        (body.couleurImpression !== undefined &&
            (typeof body.couleurImpression !== "string" ||
                body.couleurImpression.trim() === ""))
    ) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Un ou plusieurs champs fournis sont invalides.",
            details: null,
        };
    }


    if (
        body.annee !== undefined &&
        (!Number.isInteger(body.annee) || body.annee <= 0)
    ) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "L'année du timbre est invalide.",
            details: null,
        };
    }

    if (
        body.coteEstimee !== undefined &&
        (!Number.isInteger(body.coteEstimee) ||
            body.coteEstimee < 0)
    ) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "La cote estimée est invalide.",
            details: null,
        };
    }

    const raretesValides = [
        "COURANT",
        "RECHERCHE",
        "RARE",
    ] as const;

    if (
        body.rarete !== undefined &&
        !raretesValides.includes(
            body.rarete as typeof raretesValides[number]
        )
    ) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "La rareté du timbre est invalide.",
            details: null,
        };
    }

    const etatsValides = [
        "NEUF",
        "NEUF_SANS_GOMME",
        "OBLITERE",
    ] as const;

    if (
        body.etat !== undefined &&
        !etatsValides.includes(
            body.etat as typeof etatsValides[number]
        )
    ) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "L'état du timbre est invalide.",
            details: null,
        };
    }

    if (
        body.referenceCatalogue !== undefined &&
        body.referenceCatalogue !== null &&
        typeof body.referenceCatalogue !== "string"
    ) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "La référence catalogue est invalide.",
            details: null,
        };
    }
    const updateTimbre = await prisma.timbre.update({
        where: {
            id: identif,
        },
        data: {
            titre: body.titre,
            theme: body.theme,
            pays: body.pays,
            annee: body.annee,
            valeurFaciale: body.valeurFaciale,
            coteEstimee: body.coteEstimee,
            couleurImpression: body.couleurImpression,

            rarete: body.rarete as
                typeof raretesValides[number] | undefined,

            etat: body.etat as
                typeof etatsValides[number] | undefined,

            referenceCatalogue: body.referenceCatalogue,

            version: {
                increment: 1,
            },
        },
    });
    return {
        code: 200,
        message: "Timbre modifié avec succès.",
        details: updateTimbre,
    };

});