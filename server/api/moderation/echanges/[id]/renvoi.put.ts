import { prisma } from "../../../../utils/db";
import { exigerUtilisateurActif } from "../../../../utils/session";
import { EtapeEchange } from "../../../../../generated/prisma/enums";


export default defineEventHandler(async (event) => {
    const identif = getRouterParam(event, "id");
    const body = await readBody(event);
    if (!body || typeof body !== "object") {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Les informations  de renvoi sont obligatoires.",
            details: null,
        };

    }

    const numeroSuiviOffert = body.numeroSuiviOffert
    const numeroSuiviDemande = body.numeroSuiviDemande

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

    if (echange.etape !== EtapeEchange.VALIDE &&
        echange.etape !== EtapeEchange.REJETE
    ) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Cet échange n'est pas dans un état permettant le renvoi.",
            details: null,
        };
    }
    if (typeof numeroSuiviDemande !== "string" || numeroSuiviDemande.trim() === "") {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Le numéro de suivi du timbre demandé est obligatoire.",
            details: null,
        };
    }
    if (typeof numeroSuiviOffert !== "string" || numeroSuiviOffert.trim() === "") {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Le numéro de suivi du timbre offert est obligatoire.",
            details: null,
        };
    }
    const echangeMisAJour = await prisma.$transaction(
        async (tx) => {
            const verification = await tx.echange.updateMany({
                where: {
                    id: identif,
                    etape: {
                        in: [EtapeEchange.VALIDE, EtapeEchange.REJETE]
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
                    statusMessage: "Le renvoi a déjà été enregistré ou n'est plus autorisé.",
                });
            }
            await tx.envoi.createMany({
                data: [
                    {
                        echangeId: identif,
                        timbreId: echange.timbreOffertId,
                        sens: "RETOUR",
                        numeroSuivi: numeroSuiviOffert.trim(),
                        dateEnvoi: new Date(),
                    },

                    {
                        echangeId: identif,
                        timbreId: echange.timbreDemandeId,
                        sens: "RETOUR",
                        numeroSuivi: numeroSuiviDemande.trim(),
                        dateEnvoi: new Date(),
                    },
                ],
            });

            if (echange.etape === EtapeEchange.VALIDE) {
                await tx.timbre.update({
                    where: {
                        id: echange.timbreDemandeId,
                    },
                    data: {
                        proprietaireId: echange.proposantId,
                        statut: "DISPONIBLE",
                    },
                });

                await tx.timbre.update({
                    where: {
                        id: echange.timbreOffertId,
                    },
                    data: {
                        proprietaireId: echange.destinataireId,
                        statut: "DISPONIBLE",
                    },
                });
            }


            if (echange.etape === EtapeEchange.REJETE) {
                await tx.timbre.updateMany({
                    where: {
                        id: {
                            in: [
                                echange.timbreOffertId,
                                echange.timbreDemandeId,
                            ],
                        },
                        statut: "EN_ECHANGE",
                    },
                    data: {
                        statut: "DISPONIBLE",
                    },
                });
            }
            return await tx.echange.update({
                where: {
                    id: identif,
                },
                data: {
                    etape: EtapeEchange.CONCLU,
                    version: {
                        increment: 1,
                    },
                },
            });
        },
    );
    return {
        code: 200,
        message: "Renvoi enregistré avec succès.",
        details: echangeMisAJour,
    };
});

