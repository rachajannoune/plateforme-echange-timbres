import { lireSession, supprimerSession } from "../../utils/session";

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

    supprimerSession(event);

    return {
        code: 200,
        message: "Déconnexion réussie.",
        details: null,
    };
});