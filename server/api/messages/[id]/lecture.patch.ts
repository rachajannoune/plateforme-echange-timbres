import { prisma } from "../../../utils/db";
import { exigerUtilisateurActif } from "../../../utils/session";

export default defineEventHandler(async (event) => {
    const user = await exigerUtilisateurActif(event);

    const identif = getRouterParam(event, "id");

    if (!identif) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Identifiant du message manquant.",
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
            message: "Identifiant du message invalide.",
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
    }
    const echange = await prisma.echange.findUnique({
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
        user.id !== echange.proposantId &&
        user.id !== echange.destinataireId
    ) {
        setResponseStatus(event, 403);

        return {
            code: 403,
            message: "Vous n'êtes pas autorisé à modifier ce message.",
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
    
    const modification = await prisma.message.updateMany({
        where: {
            id: identif,
            dateLecture: null,
        },
        data: {
            dateLecture: new Date(),
        },
    });

    if (modification.count !== 1) {
        setResponseStatus(event, 409);

        return {
            code: 409,
            message: "Ce message a déjà été marqué comme lu.",
            details: null,
        };
    }

    const messageMisAJour = await prisma.message.findUnique({
        where: {
            id: identif,
        },
    });
    return {
        code: 200,
        message: "Message marqué comme lu.",
        details: messageMisAJour,
    };

});

