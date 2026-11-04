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
    const message = await prisma.message.findUnique({
        where: {
            id: identif,
        },
    });
    if (!message) {
        setResponseStatus(event, 404);

        return {
            code: 404,
            message: "Message introuvable.",
            details: null,
        };
    } const echange = await prisma.echange.findUnique({
        where: {
            id: message.echangeId,
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
        session !== echange.proposantId &&
        session !== echange.destinataireId
    ) {
        setResponseStatus(event, 403);

        return {
            code: 403,
            message:"Vous n'êtes pas autorisé à modifier ce message.",
            details: null,
        };
    }
    if (message.dateLecture) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Le message est déjà marqué comme lu.",
            details: null,
        };
    }
    const messageMisAJour = await prisma.message.update({
        where: {
            id: identif,
        },
        data: {
            dateLecture: new Date(),
        },
    });
    return {
        code: 200,
        message: "Message marqué comme lu.",
        details: messageMisAJour,
    };

});

