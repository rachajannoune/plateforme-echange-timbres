import { prisma } from "../../../utils/db";
import { lireSession } from "../../../utils/session";

export default defineEventHandler(async (event) => {
    const identif = getRouterParam(event, "id");

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
    const notification = await prisma.notification.findUnique({
        where: {
            id: identif,
        },
    });
    if (!notification) {
        setResponseStatus(event, 404);

        return {
            code: 404,
            message: "notification introuvable.",
            details: null,
        };
    }
    if (session !== notification.utilisateurId) {
        setResponseStatus(event, 403
        );

        return {
            code: 403,
            message: "Vous n'êtes pas autorisé à modifier cette notification.",
            details: null,
        };
    }
    if (notification.lue) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Notification déjà marquée comme lue.",
            details: null,
        };
    }
    const notificationMiseAJour = await prisma.notification.update({
        where: {
            id: identif,
        },
        data: {
            lue: true,
        },
    });
    return {
        code: 200,
        message: "Notification marquée comme lue.",
        details: notificationMiseAJour,
    };

});

