import { prisma } from "../../../../utils/db";
import { lireSession } from "../../../../utils/session";
import { EtapeEchange } from "../../../../../generated/prisma/enums";


export default defineEventHandler(async (event) => {
    const identif = getRouterParam(event, "id");
    const body = await readBody(event);
    const motifannulation = body.motif;

    if (!identif) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Identifiant de l'échange manquant.",
            details: null,
        };
    }

    const uuidValide =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            identif,
        );

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

    const utilisateur = await prisma.utilisateur.findUnique({
        where: {
            id: session,
        },
    });

    if (!utilisateur) {
        setResponseStatus(event, 401);

        return {
            code: 401,
            message: "Connexion expirée. Veuillez vous reconnecter.",
            details: null,
        };
    }

    if (utilisateur.role !== "MODERATEUR") {
        setResponseStatus(event, 403);

        return {
            code: 403,
            message: "Vous n'êtes pas autorisé à accéder à cette ressource.",
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
    if (
        EtapeEchange.ACCEPTE&&
        EtapeEchange.TIMBRES_ENVOYES &&
        EtapeEchange.TIMBRES_RECUS &&
        EtapeEchange.VALIDE
    ) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Cet échange ne peut pas être annulé.",
            details: null,
        };
    }

    if (!motifannulation) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Le motif d'annulation est obligatoire.",
            details: null,
        };
    }
    const echangeMisAJour = await prisma.$transaction(
        async (tx) => {

            await tx.timbre.update({
                where: {
                    id: echange.timbreDemandeId,
                },
                data: {
                    statut: "DISPONIBLE",
                },
            });

            await tx.timbre.update({
                where: {
                    id: echange.timbreOffertId,
                },
                data: {
                    statut: "DISPONIBLE",
                },
            });

            return await tx.echange.update({
                where: {
                    id: identif,
                },
                data: {
                    etape: EtapeEchange.ANNULE,

                    motifAnnulation: motifannulation,

                    version: {
                        increment: 1,
                    },
                },
            });
        },
    );

    return {
        code: 200,
        message: "Échange annulé avec succès.",
        details: echangeMisAJour,
    };
});

