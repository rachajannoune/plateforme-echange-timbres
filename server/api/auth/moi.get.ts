import { prisma } from "../../utils/db";
import { lireSession } from "../../utils/session";

export default defineEventHandler(async (event) => {

    const session = await lireSession(event);
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

            message: "Session invalide.",
            details: null,
        };
    }
    if (utilisateur.statut === "SUSPENDU") {
        setResponseStatus(event, 403);

        return {
            code: 403,
            message: "Compte suspendu.",
            details: null,
        };
    }

    return {
        id: utilisateur.id,
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
        email: utilisateur.email,
        ville: utilisateur.ville,
        role: utilisateur.role,
        statut: utilisateur.statut,
        dateAcceptationChart: utilisateur.dateAcceptationChart,
        dateInscription: utilisateur.dateInscription,
    };
});