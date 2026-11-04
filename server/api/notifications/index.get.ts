import { prisma } from "../../utils/db";
import { lireSession } from "../../utils/session";

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
    const listeNotifications = await prisma.notification.findMany({
        where: {
            utilisateurId: session,
        },
        orderBy: {
            dateCreation: "desc",
        },
    });

    return {
        code: 200,
        message: "Notifications récupérées avec succès.",
        details: listeNotifications,
    };
});