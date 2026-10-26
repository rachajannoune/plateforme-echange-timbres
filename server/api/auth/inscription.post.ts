import { randomBytes, scryptSync } from "node:crypto";
import { prisma } from "../../utils/db";

export default defineEventHandler(async (event) => {

  const body = await readBody(event);

  if (!body || typeof body !== "object") {
    setResponseStatus(event, 400);

    return {
      code: "DONNEES_INVALIDES",
      message: "Les données d'inscription sont manquantes.",
      details: null,
    };
  }



  const prenom =
    typeof body.prenom === "string"
      ? body.prenom.trim()
      : "";

  const nom =
    typeof body.nom === "string"
      ? body.nom.trim()
      : "";

  const email =
    typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : "";

  const ville =
    typeof body.ville === "string"
      ? body.ville.trim()
      : "";

  const motDePasse =
    typeof body.motDePasse === "string"
      ? body.motDePasse
      : "";

  const acceptationCharte =
    body.acceptationCharte === true;

  if (
    !prenom ||
    !nom ||
    !email ||
    !ville ||
    !motDePasse
  ) {
    setResponseStatus(event, 400);

    return {
      code: "CHAMPS_MANQUANTS",
      message: "Tous les champs obligatoires doivent être renseignés.",
      details: null,
    };
  }

  const emailValide =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!emailValide) {
    setResponseStatus(event, 400);

    return {
      code: "EMAIL_INVALIDE",
      message: "L'adresse e-mail n'est pas valide.",
      details: null,
    };
  }

  if (motDePasse.length < 8) {
    setResponseStatus(event, 400);

    return {
      code: "MOT_DE_PASSE_TROP_COURT",
      message: "Le mot de passe doit contenir au moins 8 caractères.",
      details: null,
    };
  }

  if (!acceptationCharte) {
    setResponseStatus(event, 400);

    return {
      code: "CHARTE_NON_ACCEPTEE",
      message: "L'acceptation de la charte est obligatoire.",
      details: null,
    };
  }



  const utilisateurExistant =
    await prisma.utilisateur.findUnique({
      where: {
        email,
      },
    });

  if (utilisateurExistant) {
    setResponseStatus(event, 409);

    return {
      code: "EMAIL_DEJA_UTILISE",
      message: "Cette adresse e-mail est déjà utilisée.",
      details: null,
    };
  }


  const sel = randomBytes(16).toString("hex");

  const hash = scryptSync(
    motDePasse,
    sel,
    64,
  ).toString("hex");

  const motDePasseHash =
    `scrypt$${sel}$${hash}`;


  const utilisateur =await prisma.utilisateur.create({
      data: {
        prenom,
        nom,
        email,
        motDePasseHash,
        ville,
        dateAcceptationChart: new Date(),
      },
    });

 

  setResponseStatus(event, 201);

  return {
    id: utilisateur.id,
    prenom: utilisateur.prenom,
    nom: utilisateur.nom,
    email: utilisateur.email,
    ville: utilisateur.ville,
    role: utilisateur.role,
    statut: utilisateur.statut,
    dateAcceptationChart:utilisateur.dateAcceptationChart,
    dateInscription:utilisateur.dateInscription,
  };
});