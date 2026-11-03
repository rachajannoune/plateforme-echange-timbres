import { prisma } from "../../../../utils/db";
import { lireSession } from "../../../../utils/session";
import { ResultatExpertise, EtapeEchange } from "../../../../../generated/prisma/enums";


export default defineEventHandler(async (event) => {
    const identif = getRouterParam(event, "id");
    const body = await readBody(event);


    const resultatOffert = body.resultatOffert;
    const resultatDemande = body.resultatDemande;

    const motif = body.motif;

    const etatCorrige = body.etatCorrige;

    const coteCorrigee = body.coteCorrigee;

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

    if (echange.etape !== EtapeEchange.TIMBRES_RECUS) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Cet échange ne peut pas être expertisé.",
            details: null,
        };
    }

    if (
        resultatOffert !== ResultatExpertise.CONFORME &&
        resultatOffert !== ResultatExpertise.NON_CONFORME
    ) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Le résultat de l'expertise du timbre offert est invalide.",
            details: null,
        };
    }

    if (
        resultatDemande !== ResultatExpertise.CONFORME &&
        resultatDemande !== ResultatExpertise.NON_CONFORME
    ) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Le résultat de l'expertise du timbre demandé est invalide.",
            details: null,
        };
    }
    if (
        (resultatDemande === ResultatExpertise.NON_CONFORME ||
            resultatOffert === ResultatExpertise.NON_CONFORME) &&
        !motif
    ) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Le motif est obligatoire en cas de non-conformité.",
            details: null,
        };
    }
    const etapeFinale =
        resultatOffert === ResultatExpertise.CONFORME &&
            resultatDemande === ResultatExpertise.CONFORME
            ? EtapeEchange.VALIDE
            : EtapeEchange.REJETE;
    const echangeMisAJour = await prisma.$transaction(
        async (tx) => {

            await tx.expertise.createMany({
                data: [
                    {
                        echangeId: identif,
                        timbreId: echange.timbreDemandeId,
                        resultat: resultatDemande,

                        motif:
                            resultatDemande === ResultatExpertise.NON_CONFORME
                                ? motif
                                : null,

                        etatCorrige:
                            resultatDemande === ResultatExpertise.NON_CONFORME
                                ? etatCorrige
                                : null,

                        coteCorrigee:
                            resultatDemande === ResultatExpertise.NON_CONFORME
                                ? coteCorrigee
                                : null,
                    },

                    {
                        echangeId: identif,
                        timbreId: echange.timbreOffertId,
                        resultat: resultatOffert,

                        motif:
                            resultatOffert === ResultatExpertise.NON_CONFORME
                                ? motif
                                : null,

                        etatCorrige:
                            resultatOffert === ResultatExpertise.NON_CONFORME
                                ? etatCorrige
                                : null,

                        coteCorrigee:
                            resultatOffert === ResultatExpertise.NON_CONFORME
                                ? coteCorrigee
                                : null,
                    },
                ],
            });

            if (etapeFinale === EtapeEchange.VALIDE) {
                await tx.timbre.update({
                    where: {
                        id: echange.timbreOffertId,
                    },
                    data: {
                        expertise: true,
                    },
                });

                await tx.timbre.update({
                    where: {
                        id: echange.timbreDemandeId,
                    },
                    data: {
                        expertise: true,
                    },
                });
            }

            if (
                resultatOffert === ResultatExpertise.NON_CONFORME
            ) {
                await tx.timbre.update({
                    where: {
                        id: echange.timbreOffertId,
                    },
                    data: {
                        statut: "SUSPENDU",
                    },
                });
            }

            if (
                resultatDemande === ResultatExpertise.NON_CONFORME
            ) {
                await tx.timbre.update({
                    where: {
                        id: echange.timbreDemandeId,
                    },
                    data: {
                        statut: "SUSPENDU",
                    },
                });
            }

            return await tx.echange.update({
                where: {
                    id: identif,
                },
                data: {
                    etape: etapeFinale,

                    version: {
                        increment: 1,
                    },
                },
            });
        },
    );

    return {
        code: 200,
        message: "Expertise enregistrée avec succès.",
        details: echangeMisAJour,
    };

});

