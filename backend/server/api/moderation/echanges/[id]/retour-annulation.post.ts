import { prisma } from "../../../../utils/db";
import { exigerUtilisateurActif } from "../../../../utils/session";
import { EtapeEchange } from "../../../../../generated/prisma/enums";

export default defineEventHandler(async (event) => {

    const identif = getRouterParam(event, "id");
    const body = await readBody(event);

    const timbreId = body?.timbreId;
    const action = body?.action;
    const numeroSuivi = body?.numeroSuivi;

    if (!identif) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Identifiant de l'échange manquant.",
            details: null,
        };
    }

    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(identif)) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Identifiant de l'échange invalide.",
            details: null,
        };
    }

    if (typeof timbreId !== "string" || !uuidRegex.test(timbreId)) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Identifiant du timbre invalide.",
            details: null,
        };
    }

    // Les trois actions sont des valeurs du body, pas des enums Prisma.
    if (
        action !== "RECEPTION" &&
        action !== "RENVOI" &&
        action !== "CONFIRMATION"
    ) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "L'action doit être RECEPTION, RENVOI ou CONFIRMATION.",
            details: null,
        };
    }

    if (
        action === "RENVOI" &&
        (
            typeof numeroSuivi !== "string" ||
            numeroSuivi.trim() === ""
        )
    ) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Le numéro de suivi du retour est obligatoire.",
            details: null,
        };
    }

    const utilisateur = await exigerUtilisateurActif(event);

    if (utilisateur.role !== "MODERATEUR") {
        setResponseStatus(event, 403);

        return {
            code: 403,
            message: "Vous n'êtes pas autorisé à accéder à cette ressource.",
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

    if (echange.etape !== EtapeEchange.ANNULE) {
        setResponseStatus(event, 409);

        return {
            code: 409,
            message: "Cet échange n'est pas dans un état permettant le retour d'annulation.", details: null,
        };
    }

    if (
        timbreId !== echange.timbreOffertId &&
        timbreId !== echange.timbreDemandeId
    ) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Ce timbre ne fait pas partie de cet échange.",
            details: null,
        };
    }

    const resultat = await prisma.$transaction(async (tx) => {

        // Empêcher deux opérations simultanées sur le même échange.
        const verification = await tx.echange.updateMany({
            where: {
                id: identif,
                etape: EtapeEchange.ANNULE,
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
                statusMessage: "Cet échange ne permet plus cette opération.",
            });
        }

        // Vérifier que le timbre avait réellement été envoyé.
        const findColis = await tx.envoi.findFirst({
            where: {
                echangeId: identif,
                timbreId: timbreId,
                sens: "ALLER",
            },
        });

        if (!findColis) {
            throw createError({
                statusCode: 404,
                statusMessage: "Aucun colis envoyé n'a été trouvé pour ce timbre.",
            });
        }

        if (action === "RECEPTION") {

            // Enregistrer l'arrivée du colis au back-office.
            const reception = await tx.envoi.updateMany({
                where: {
                    id: findColis.id,
                    dateReception: null,
                },
                data: {
                    dateReception: new Date(),
                },
            });

            if (reception.count !== 1) {
                throw createError({
                    statusCode: 409,
                    statusMessage: "Ce colis a déjà été réceptionné.",
                });
            }

            return await tx.envoi.findUniqueOrThrow({
                where: {
                    id: findColis.id,
                },
            });
        }

        if (action === "RENVOI") {

            // Le colis doit être arrivé avant son renvoi.
            if (!findColis.dateReception) {
                throw createError({
                    statusCode: 409,
                    statusMessage: "Le colis n'a pas encore été réceptionné au back-office.",
                });
            }

            // Empêcher deux renvois du même timbre.
            const retourExistant = await tx.envoi.findFirst({
                where: {
                    echangeId: identif,
                    timbreId: timbreId,
                    sens: "RETOUR",
                },
            });

            if (retourExistant) {
                throw createError({
                    statusCode: 409,
                    statusMessage: "Un retour a déjà été enregistré pour ce timbre.",
                });
            }

            return await tx.envoi.create({
                data: {
                    echangeId: identif,
                    timbreId: timbreId,
                    sens: "RETOUR",
                    numeroSuivi: numeroSuivi.trim(),
                    dateEnvoi: new Date(),
                },
            });
        }

        // Vérifier qu'un retour a été enregistré avant sa confirmation.
        const retourExistant = await tx.envoi.findFirst({
            where: {
                echangeId: identif,
                timbreId: timbreId,
                sens: "RETOUR",
            },
        });

        if (!retourExistant) {
            throw createError({
                statusCode: 409,
                statusMessage: "Aucun retour n'a été enregistré pour ce timbre.",
            });
        }

        // Confirmer la réception du colis par le propriétaire.
        const confirmation = await tx.envoi.updateMany({
            where: {
                id: retourExistant.id,
                dateReception: null,
            },
            data: {
                dateReception: new Date(),
            },
        });

        if (confirmation.count !== 1) {
            throw createError({
                statusCode: 409,
                statusMessage: "Le retour de ce timbre a déjà été confirmé.",
            });
        }

        // Rendre le timbre disponible après confirmation uniquement.
        const liberation = await tx.timbre.updateMany({
            where: {
                id: timbreId,
                statut: "EN_ECHANGE",

            },
            data: {
                statut: "DISPONIBLE",
                version: {
                    increment: 1,
                },
            },
        });

        if (liberation.count !== 1) {
            throw createError({
                statusCode: 409,
                statusMessage: "Le timbre ne peut pas être libéré.",
            });
        }

        return await tx.timbre.findUniqueOrThrow({
            where: {
                id: timbreId,
            },
        });
    });

    return {
        code: 200,
        message:
            action === "RECEPTION"
                ? "Réception enregistrée avec succès."
                : action === "RENVOI"
                    ? "Retour enregistré avec succès."
                    : "Retour confirmé avec succès.",
        details: resultat,
    };
});