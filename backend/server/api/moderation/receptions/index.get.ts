import { prisma } from "../../../utils/db";
import { exigerUtilisateurActif } from "../../../utils/session";

export default defineEventHandler(async (event) => {

    const utilisateur = await exigerUtilisateurActif(event);
    if (utilisateur.role !== "MODERATEUR") {
        setResponseStatus(event, 403);

        return {
            code: 403,
            message: "Vous n'êtes pas autorisé à accéder à cette ressource.",
            details: null,
        };
    }

    const listesReceptionsEnAttente =
        await prisma.echange.findMany({
            where: {
                etape: "TIMBRES_ENVOYES",
            },

            orderBy: {
                dateCreation: "asc",
            },

            include: {
                proposant: {
                    select: {
                        id: true,
                        prenom: true,
                        nom: true,
                    },
                },

                destinataire: {
                    select: {
                        id: true,
                        prenom: true,
                        nom: true,
                    },
                },

                timbreOffert: {
                    select: {
                        id: true,
                        titre: true,
                        etat: true,
                        coteEstimee: true,

                        photos: {
                            where: {
                                face: "RECTO",
                            },
                            select: {
                                chemin: true,
                            },
                        },
                    },
                },

                timbreDemande: {
                    select: {
                        id: true,
                        titre: true,
                        etat: true,
                        coteEstimee: true,

                        photos: {
                            where: {
                                face: "RECTO",
                            },
                            select: {
                                chemin: true,
                            },
                        },
                    },
                },

                envois: {
                    select: {
                        id: true,
                        numeroSuivi: true,
                        dateEnvoi: true,
                        sens: true,
                        timbreId :true
                    },
                },
            },
        });

    return {
        code: 200,
        message: "Liste des réceptions récupérée avec succès.",
        details: listesReceptionsEnAttente,
    };
});