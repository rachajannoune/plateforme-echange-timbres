
import type { H3Event } from "h3";
import { setCookie, getCookie, deleteCookie } from "h3";

export function creerSession(
  event: H3Event,
  utilisateurId: string,
) {
  setCookie(
    event,
    "session",
    utilisateurId,
    {
      httpOnly: true,
      sameSite: "strict",
      secure: false,
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    },
  );
}

export function lireSession(
  event: H3Event,
) {
  return getCookie(event, "session");
}

export function supprimerSession(
  event: H3Event,
) {
  deleteCookie(event, "session");
}