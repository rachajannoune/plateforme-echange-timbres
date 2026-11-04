import { prisma } from "../../../../utils/db";
import { lireSession } from "../../../../utils/session";

export default defineEventHandler(async (event) => {
    const identif = getRouterParam(event, "id");
    const body = await readBody(event);

    const contenu = body.contenu?.trim();

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
        session !== echange.proposantId &&
        session !== echange.destinataireId
    ) {
        setResponseStatus(event, 403);

        return {
            code: 403,
            message: "Vous n'êtes pas autorisé à consulter cette conversation.",
            details: null,
        };
    }

    if (!contenu) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Le contenu du message est obligatoire.",
            details: null,
        };
    }

    const messageCree = await prisma.message.create({
        data: {
            echangeId: identif,
            auteurId: session,
            contenu,
        },
    });

    const notifier =
        session === echange.proposantId
            ? echange.destinataireId
            : echange.proposantId;

    await prisma.notification.create({
        data: {
            utilisateurId: notifier,
            echangeId: identif,
            type: "MESSAGE",
            titre: "Nouveau message reçu",
            contenu,
        },
    });

    setResponseStatus(event, 201);

    return {
        code: 201,
        message: "Message envoyé avec succès.",
        details: messageCree,
    };
});