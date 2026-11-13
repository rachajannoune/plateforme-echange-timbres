import { prisma } from "../../utils/db";
import { scryptSync, timingSafeEqual } from "node:crypto";
import { creerSession } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  if (
    !body ||
    typeof body !== "object" ||
    typeof body.email !== "string" ||
    body.email.trim().length === 0 ||
    typeof body.motDePasse !== "string" ||
    body.motDePasse.length === 0
  ) {
    setResponseStatus(event, 400);

    return {
      code: 400,
      message: "Email et mot de passe obligatoires ou invalides.",
      details: null,
    };
  }

  const utilisateur = await prisma.utilisateur.findUnique({
    where: {
      email: body.email.trim(),
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
    const parts = input.split("$");

    if (parts.length !== 3 || !parts[1] || !parts[2]) {
      return null;
    }

    return {
      sel: parts[1],
      hash: parts[2],
    };
  }

  const resultat = extractSaltAndHash(utilisateur.motDePasseHash);

  if (!resultat) {
    setResponseStatus(event, 500);

    return {
      code: 500,
      message: "Erreur interne.",
      details: null,
    };
  }

  const { sel, hash } = resultat;

  const hashCalcule = scryptSync(
    body.motDePasse,
    sel,
    64,
  );

  const hashStocke = Buffer.from(hash, "hex");

  const motDePasseValide =
    /^[0-9a-f]{128}$/i.test(hash) &&
    hashStocke.length === hashCalcule.length &&
    timingSafeEqual(hashCalcule, hashStocke);

  if (!motDePasseValide) {
    setResponseStatus(event, 401);

    return {
      code: 401,
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

  await creerSession(event, utilisateur.id);

  return {
    id: utilisateur.id,
    prenom: utilisateur.prenom,
    nom: utilisateur.nom,
    email: utilisateur.email,
    role: utilisateur.role,
    statut: utilisateur.statut,
  };
});