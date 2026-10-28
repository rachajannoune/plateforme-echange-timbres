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

    const identif = getRouterParam(event, "id");

    if (!identif) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Identifiant de l'utilisateur manquant.",
            details: null,
        };
    }

    const uuidValide =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identif);

    if (!uuidValide) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Identifiant de l'utilisateur invalide.",
            details: null,
        };
    }

    const utilisateur = await prisma.utilisateur.findUnique({
        where: {
            id: identif,
        },
        select: {
            id: true,
            prenom: true,
            ville: true,
            dateInscription: true,
        },
    });

    if (!utilisateur) {
        setResponseStatus(event, 404);

        return {
            code: 404,
            message: "Utilisateur introuvable.",
            details: null,
        };
    }

    return {
        id: utilisateur.id,
        prenom: utilisateur.prenom,
        ville: utilisateur.ville,
        anciennete: utilisateur.dateInscription,
    };
});