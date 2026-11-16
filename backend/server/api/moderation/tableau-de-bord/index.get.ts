import { prisma } from "../../../utils/db";
import { exigerUtilisateurActif } from "../../../utils/session";

export default defineEventHandler(async (event) => {


    const utilisateur = await exigerUtilisateurActif(event);
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