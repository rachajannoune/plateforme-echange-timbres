import { prisma } from "../../utils/db";
import { scryptSync } from "node:crypto";
import { creerSession } from "../../utils/session";


export default defineEventHandler(async (event) => {

    const body = await readBody(event);
    if (!body.email || !body.motDePasse) {
        setResponseStatus(event, 400);

        return {
            code: 400,

            message: "Email et mot de passe obligatoires.",
            details: null,
        };
    }
    const utilisateur = await prisma.utilisateur.findUnique({
        where: {
            email: body.email,
        },
    });

    if (!utilisateur) {
        setResponseStatus(event, 401);

        return {
            code: 401,

            message: "Identifiants invalides.",
            details: null,
        };
    }

    function extractSaltAndHash(input: string) {
        const parts = input.split('$');
        if (parts.length !== 3) {
            return null;
        }
        return {
            sel: parts[1],
            hash: parts[2]
        };
    }
    const resultat = extractSaltAndHash(utilisateur.motDePasseHash)
    if (!resultat) {
        setResponseStatus(event, 500);

        return {
            code: 500,

            message: "Erreur interne.",
            details: null,
        };
    }
    const { sel, hash } = resultat;
    const hashCalculer = scryptSync(
        body.motDePasse as string,
        sel as string,
        64,
    ).toString("hex");

    if (hashCalculer !== hash) {
        setResponseStatus(event, 401);

        return {
            message: "Identifiants invalides.",
            details: null,
        };
    }
    if (utilisateur.statut === "SUSPENDU") {
        setResponseStatus(event, 403);

        return {
            code: 403,

            message: "Compte suspendu.",
            details: null,
        };
    }
    creerSession(event, utilisateur.id,);
    return {
        id: utilisateur.id,
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
        email: utilisateur.email,
        role: utilisateur.role,
        statut: utilisateur.statut,
    };
});