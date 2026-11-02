import { prisma } from "../../../utils/db";
import { lireSession } from "../../../utils/session";

export default defineEventHandler(async (event) => {

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

    const nombreReceptionsEnAttente = await prisma.echange.count({
        where: {
            etape: "TIMBRES_ENVOYES",
        },
    });

    const nombreExpertisesEnAttente = await prisma.echange.count({
        where: {
            etape: "TIMBRES_RECUS",
        },
    });

    const nombreRenvoisEnAttente = await prisma.echange.count({
        where: {
            etape: "VALIDE",
        },
    });

    return {
        code: 200,
        message: "Tableau de bord récupéré avec succès.",
        details: {
            receptionsEnAttente: nombreReceptionsEnAttente,
            expertisesEnAttente: nombreExpertisesEnAttente,
            renvoisEnAttente: nombreRenvoisEnAttente,
        },
    };
});