import { prisma } from "../../../utils/db";
import { exigerUtilisateurActif } from "../../../utils/session";

export default defineEventHandler(async (event) => {
    const utilisateur = await exigerUtilisateurActif(event);

    const identif = getRouterParam(event, "id");

    if (!identif) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Identifiant de la notification manquant.",
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
            message: "Identifiant de la notification invalide.",
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
    if (utilisateur.id !== notification.utilisateurId) {
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
    const modification = await prisma.notification.updateMany({
        where: {
            id: identif,
            utilisateurId: utilisateur.id,
            lue: false,
        },
        data: {
            lue: true,
        },
    });

    if (modification.count !== 1) {
        setResponseStatus(event, 409);

        return {
            code: 409,
            message: "Cette notification a déjà été marquée comme lue.",
            details: null,
        };
    }

    const notificationMiseAJour = await prisma.notification.findUnique({
        where: {
            id: identif,
        },
    });
    return {
        code: 200,
        message: "Notification marquée comme lue.",
        details: notificationMiseAJour,
    };

});

