import { EtapeEchange } from "~/generated/prisma/enums";
import { prisma } from "../../../../utils/db";
import { exigerUtilisateurActif } from "../../../../utils/session";

export default defineEventHandler(async (event) => {
    const utilisateur = await exigerUtilisateurActif(event);

    const identif = getRouterParam(event, "id");
    const body = await readBody(event);

    const contenu =
        typeof body?.contenu === "string"
            ? body.contenu.trim()
            : "";
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
        utilisateur.id !== echange.proposantId &&
        utilisateur.id !== echange.destinataireId
    ) {
        setResponseStatus(event, 403);

        return {
            code: 403,
            message: "Vous n'êtes pas autorisé à consulter cette conversation.",
            details: null,
        };
    }
    if (
        echange.etape === EtapeEchange.CONCLU ||
        echange.etape === EtapeEchange.ANNULE ||
        echange.etape === EtapeEchange.REJETE ||
        echange.etape === EtapeEchange.REFUSE
    ) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Cette conversation est en lecture seule.",
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

    const messageCree = await prisma.$transaction(async (tx) => {

        const verification = await tx.echange.updateMany({
            where: {
                id: identif,
                etape: {
                    notIn: [
                        EtapeEchange.CONCLU,
                        EtapeEchange.ANNULE,
                        EtapeEchange.REJETE,
                        EtapeEchange.REFUSE,
                    ],
                },
            },
            data: {
                version: {
                    increment: 1,
                },
            },
        });

        if (verification.count !== 1) {
            throw createError({
                statusCode: 409,
                statusMessage: "Cette conversation est en lecture seule.",
            });
        }

        const message = await tx.message.create({
            data: {
                echangeId: identif,
                auteurId: utilisateur.id,
                contenu,
            },
        });

        const notifier =
            utilisateur.id === echange.proposantId
                ? echange.destinataireId
                : echange.proposantId;

        await tx.notification.create({
            data: {
                utilisateurId: notifier,
                echangeId: identif,
                type: "MESSAGE",
                titre: "Nouveau message reçu",
                contenu,
            },
        });

        return message;
    });

    setResponseStatus(event, 201);

    return {
        code: 201,
        message: "Message envoyé avec succès.",
        details: messageCree,
    };
});