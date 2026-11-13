
import { H3Event,createError } from "h3";
import { setCookie, getCookie, deleteCookie } from "h3";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./db";

const dureeSession = 60 * 60 * 24;
const formatJeton = /^[0-9a-f]{64}$/;

function empreinteJeton(jeton: string) {
  return createHash("sha256").update(jeton).digest("hex");
}

export async function creerSession(
  event: H3Event,
  utilisateurId: string,
) {
  await supprimerSession(event);

  const jeton = randomBytes(32).toString("hex");
  const dateExpiration = new Date(Date.now() + dureeSession * 1000);

  await prisma.session.create({
    data: {
      jetonHash: empreinteJeton(jeton),
      utilisateurId,
      dateExpiration,
    },
  });

  setCookie(
    event,
    "session",
    jeton,
    {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: dureeSession,
      expires: dateExpiration,
      path: "/",
    },
  );
}

export async function lireSession(
  event: H3Event,
): Promise<string | undefined> {
  const jeton = getCookie(event, "session");

  if (!jeton) {
    return undefined;
  }

  if (!formatJeton.test(jeton)) {
    deleteCookie(event, "session", { path: "/" });
    return undefined;
  }

  const session = await prisma.session.findUnique({
    where: { jetonHash: empreinteJeton(jeton) },
    select: { utilisateurId: true, dateExpiration: true },
  });

  if (!session) {
    deleteCookie(event, "session", { path: "/" });
    return undefined;
  }

  if (session.dateExpiration.getTime() <= Date.now()) {
    await supprimerSession(event);
    return undefined;
  }

  return session.utilisateurId;
}

export async function supprimerSession(
  event: H3Event,
) {
  const jeton = getCookie(event, "session");

  if (jeton && formatJeton.test(jeton)) {
    await prisma.session.deleteMany({
      where: { jetonHash: empreinteJeton(jeton) },
    });
  }

  deleteCookie(event, "session", { path: "/" });
}
export async function exigerUtilisateurActif(event: H3Event) {
  // 1. Récupérer l'identifiant depuis la session sécurisée
  const utilisateurId = await lireSession(event);

  if (!utilisateurId) {
    throw createError({
      statusCode: 401,
      statusMessage: "Session invalide ou expirée.",
    });
  }

  // 2. Rechercher l'utilisateur dans PostgreSQL
  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: utilisateurId },
  });

  if (!utilisateur) {
    throw createError({
      statusCode: 401,
      statusMessage: "Utilisateur introuvable.",
    });
  }

  if (utilisateur.statut === "SUSPENDU") {
    throw createError({
      statusCode: 403,
      statusMessage: "Compte suspendu.",
    });
  }

  return utilisateur;
}