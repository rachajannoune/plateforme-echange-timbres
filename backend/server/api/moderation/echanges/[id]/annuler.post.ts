import { prisma } from "../../../../utils/db";
import { exigerUtilisateurActif } from "../../../../utils/session";
import { EtapeEchange } from "../../../../../generated/prisma/enums";

export default defineEventHandler(async (event) => {

    const identif = getRouterParam(event, "id");
    const body = await readBody(event);
    const motifannulation = body?.motif;

    if (!identif) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Identifiant de l'échange manquant.",
            details: null,
        };
    }

    const uuidValide =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identif);

    if (!uuidValide) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Identifiant de l'échange invalide.",
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

    if (
        echange.etape !== EtapeEchange.EN_ATTENTE &&
        echange.etape !== EtapeEchange.ACCEPTE
    ) {
        setResponseStatus(event, 409);

        return {
            code: 409,
            message: "Cet échange ne peut pas être annulé par cette procédure.",
            details: null,
        };
    }

    if (
        typeof motifannulation !== "string" ||
        motifannulation.trim() === ""
    ) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Le motif d'annulation est obligatoire.",
            details: null,
        };
    }

    const echangeMisAJour = await prisma.$transaction(async (tx) => {

        // Protéger l'annulation contre deux actions simultanées.
        const verification = await tx.echange.updateMany({
            where: {
                id: identif,
                etape: {
                    in: [
                        EtapeEchange.EN_ATTENTE,
                        EtapeEchange.ACCEPTE,
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
                statusMessage: "Cet échange ne peut plus être annulé.",
            });
        }

        // Récupérer les envois déclarés pour cet échange.
        const envois = await tx.envoi.findMany({
            where: {
                echangeId: identif,
                sens: "ALLER",
            },
        });

        if (envois.length >= 2) {
            throw createError({
                statusCode: 409,
                statusMessage: "Les deux colis ont déjà été envoyés.",
            });
        }

        // Vérifier le délai lorsqu'un seul colis a été envoyé.
        if (envois.length === 1) {

            const dateActuelle = new Date();

            if (
                !echange.dateLimiteEnvoi ||
                dateActuelle.getTime() <= echange.dateLimiteEnvoi.getTime()
            ) {
                throw createError({
                    statusCode: 409,
                    statusMessage: "Le délai d'envoi n'est pas encore dépassé.",
                });
            }
        }

        // Identifier le timbre envoyé.
        let offertEnvoye = false;
        let demandeEnvoye = false;

        for (const envoi of envois) {

            if (envoi.timbreId === echange.timbreOffertId) {
                offertEnvoye = true;
            }

            if (envoi.timbreId === echange.timbreDemandeId) {
                demandeEnvoye = true;
            }
        }

        // Libérer le timbre offert s'il n'a pas été envoyé.
        if (!offertEnvoye) {
            await tx.timbre.updateMany({
                where: {
                    id: echange.timbreOffertId,
                    statut: {
                        in: ["RESERVE", "EN_ECHANGE"],
                    },
                },
                data: {
                    statut: "DISPONIBLE",
                    version: {
                        increment: 1,
                    },
                },
            });
        }

        // Vérifier les autres propositions concernant le timbre demandé.
        const autreProposition = await tx.echange.findFirst({
            where: {
                timbreDemandeId: echange.timbreDemandeId,
                etape: EtapeEchange.EN_ATTENTE,
                id: {
                    not: identif,
                },
            },
        });

        // Libérer le timbre demandé uniquement s'il n'a pas été envoyé
        // et qu'aucune autre proposition n'existe.
        if (!demandeEnvoye && !autreProposition) {
            await tx.timbre.updateMany({
                where: {
                    id: echange.timbreDemandeId,
                    statut: {
                        in: ["EN_ATTENTE", "EN_ECHANGE"],
                    },
                },
                data: {
                    statut: "DISPONIBLE",
                    version: {
                        increment: 1,
                    },
                },
            });
        }

        return await tx.echange.update({
            where: {
                id: identif,
            },
            data: {
                etape: EtapeEchange.ANNULE,
                motifAnnulation: motifannulation.trim(),
                version: {
                    increment: 1,
                },
            },
        });
    });

    return {
        code: 200,
        message: "Échange annulé avec succès.",
        details: echangeMisAJour,
    };
});