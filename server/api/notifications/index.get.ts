import { prisma } from "../../utils/db";
import { exigerUtilisateurActif } from "../../utils/session";

export default defineEventHandler(async (event) => {
    const utilisateur = await exigerUtilisateurActif(event);

    const listeNotifications = await prisma.notification.findMany({
        where: {
            utilisateurId: utilisateur.id,
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