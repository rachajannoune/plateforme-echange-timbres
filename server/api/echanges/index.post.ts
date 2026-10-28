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

    const body = await readBody(event);

    if (!body.timbreOffertId || !body.timbreDemandeId) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Les identifiants des deux timbres sont obligatoires.",
            details: null,
        };
    }

    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    const timbreOffertValide = uuidRegex.test(body.timbreOffertId);
    const timbreDemandeValide = uuidRegex.test(body.timbreDemandeId);

    if (!timbreOffertValide || !timbreDemandeValide) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Identifiant de timbre invalide.",
            details: null,
        };
    }
    const timbres = await prisma.timbre.findMany({
        where: {
            id: {
                in: [
                    body.timbreOffertId,
                    body.timbreDemandeId,
                ],
            },
        },
    });
    const timbreOffert = timbres.find(
        (timbre) => timbre.id === body.timbreOffertId
    );

    const timbreDemande = timbres.find(
        (timbre) => timbre.id === body.timbreDemandeId
    );

    if (!timbreOffert || !timbreDemande) {
        setResponseStatus(event, 404);

        return {
            code: 404,
            message: "Un ou plusieurs timbres sont introuvables.",
            details: null,
        };
    }

    if (timbreDemande.proprietaireId === session) {
        setResponseStatus(event, 403);

        return {
            code: 403,
            message: "Vous ne pouvez pas demander l'un de vos propres timbres.",
            details: null,
        };
    }
    if (timbreOffert.proprietaireId !== session) {
        setResponseStatus(event, 403);

        return {
            code: 403,
            message: "Vous ne pouvez proposer qu'un timbre qui vous appartient.",
            details: null,
        };
    }
    if (
        timbreOffert.statut !== "DISPONIBLE" &&
        timbreOffert.statut !== "EN_ATTENTE"
    ) {
        setResponseStatus(event, 409);

        return {
            code: 409,
            message: "Le timbre offert n'est pas disponible pour un échange.",
            details: null,
        };
    }
    if (
        timbreDemande.statut !== "DISPONIBLE" &&
        timbreDemande.statut !== "EN_ATTENTE"
    ) {
        setResponseStatus(event, 409);

        return {
            code: 409,
            message: "Le timbre demandé n'est pas disponible pour un échange.",
            details: null,
        };
    }

    const findEchange = await prisma.echange.findFirst({
        where: {
            proposantId: session,
            timbreDemandeId: body.timbreDemandeId,
            etape: "EN_ATTENTE"
        },
    });
    if (findEchange) {
        setResponseStatus(event, 409);

        return {
            code: 409,
            message: "Vous avez déjà une proposition en attente pour ce timbre.",
            details: null,
        };

    }
    const createProposition = await prisma.$transaction(async (tx) => {

        const proposition = await tx.echange.create({
            data: {
                proposantId: session,
                destinataireId: timbreDemande.proprietaireId,
                timbreOffertId: body.timbreOffertId,
                timbreDemandeId: body.timbreDemandeId,
            },
        });

        await tx.timbre.update({
            where: {
                id: body.timbreDemandeId,
            },
            data: {
                statut: "EN_ATTENTE",
            },
        });

        await tx.timbre.update({
            where: {
                id: body.timbreOffertId,
            },
            data: {
                statut: "RESERVE",
            },
        });

        await tx.notification.create({
            data: {
                echangeId: proposition.id,
                utilisateurId: proposition.destinataireId,
                type: "ECHANGE",
                titre: "Nouvelle proposition d'échange",
                contenu: "Vous avez reçu une nouvelle proposition d'échange.",
            },
        });

        return proposition;
    });

    setResponseStatus(event, 201);

    return {
        code: 201,
        message: "Proposition d'échange créée avec succès.",
        details: createProposition,
    };
});