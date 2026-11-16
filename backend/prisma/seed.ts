import "dotenv/config";
import { scryptSync, randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });


function hasher(motDePasse: string): string {
  const sel = randomBytes(16).toString("hex");
  const hash = scryptSync(motDePasse, sel, 64).toString("hex");

  return `scrypt$${sel}$${hash}`;
}

// Générateur pseudo-aléatoire reproductible
function mulberry32(graine: number) {
  let a = graine;

  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;

    let t = Math.imul(a ^ (a >>> 15), 1 | a);

    t =
      (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^
      t;

    return (
      ((t ^ (t >>> 14)) >>> 0) /
      4294967296
    );
  };
}

const alea = mulberry32(2026);

type Etat =
  | "NEUF"
  | "NEUF_SANS_GOMME"
  | "OBLITERE";

function etatAleatoire(): Etat {
  const r = alea();

  if (r < 0.35) return "NEUF";
  if (r < 0.6) return "NEUF_SANS_GOMME";

  return "OBLITERE";
}

function referenceAleatoire(): string | null {
  if (alea() < 0.5) {
    return null;
  }

  return `Yvert n° ${Math.floor(
    100 + alea() * 4900,
  )}`;
}

function dateDepotAleatoire(): Date {
  const jours = Math.floor(alea() * 90);

  return new Date(
    Date.now() -
      jours * 24 * 60 * 60 * 1000,
  );
}


const utilisateurs = [
  {
    prenom: "Camille",
    nom: "Roux",
    email: "camille@example.test",
    motDePasse: "Camille123!",
    ville: "Lyon",
    role: "MEMBRE" as const,
    since: 2019,
  },

  {
    prenom: "Élodie",
    nom: "Lambert",
    email: "elodie@example.test",
    motDePasse: "Elodie123!",
    ville: "Nantes",
    role: "MEMBRE" as const,
    since: 2016,
  },

  {
    prenom: "Marc",
    nom: "Trémaux",
    email: "marc@example.test",
    motDePasse: "Marc123!",
    ville: "Strasbourg",
    role: "MEMBRE" as const,
    since: 2011,
  },

  {
    prenom: "Sofia",
    nom: "Marchetti",
    email: "sofia@example.test",
    motDePasse: "Sofia123!",
    ville: "Marseille",
    role: "MEMBRE" as const,
    since: 2021,
  },

  {
    prenom: "Hugo",
    nom: "Vidal",
    email: "hugo@example.test",
    motDePasse: "Hugo123!",
    ville: "Bordeaux",
    role: "MEMBRE" as const,
    since: 2014,
  },

  {
    prenom: "René",
    nom: "Fabre",
    email: "rene@example.test",
    motDePasse: "Rene123!",
    ville: "Lille",
    role: "MEMBRE" as const,
    since: 2008,
  },

  {
    prenom: "Paul",
    nom: "Martin",
    email: "moderateur@example.test",
    motDePasse: "Moderateur123!",
    ville: "Lyon",
    role: "MODERATEUR" as const,
    since: 2024,
  },
];

/* ======================================================
   CORRESPONDANCE data.js -> UTILISATEUR
====================================================== */

const proprietaires = {
  me: "camille@example.test",
  elodie: "elodie@example.test",
  marc: "marc@example.test",
  sofia: "sofia@example.test",
  hugo: "hugo@example.test",
  rene: "rene@example.test",
};

/* ======================================================
   TIMBRES
====================================================== */

type TimbreSeed = {
  owner: keyof typeof proprietaires;
  titre: string;
  theme: string;
  valeurFaciale: string;
  annee: number;
  couleurImpression: string;

  rarete:
    | "COURANT"
    | "RECHERCHE"
    | "RARE";

  coteEstimee: number;
};

const timbres: TimbreSeed[] = [
  {
    owner: "elodie",
    titre: "Marianne de l’avenir",
    theme: "PROFIL · MARIANNE",
    valeurFaciale: "Lettre Verte",
    annee: 2023,
    couleurImpression: "#1f7a52",
    rarete: "RECHERCHE",
    coteEstimee: 4,
  },

  {
    owner: "marc",
    titre: "Tour Eiffel",
    theme: "MONUMENT · PARIS",
    valeurFaciale: "0,95 €",
    annee: 1939,
    couleurImpression: "#b0472f",
    rarete: "RARE",
    coteEstimee: 180,
  },

  {
    owner: "sofia",
    titre: "Mont-Saint-Michel",
    theme: "PATRIMOINE",
    valeurFaciale: "1,50 €",
    annee: 1966,
    couleurImpression: "#2a5b8f",
    rarete: "RECHERCHE",
    coteEstimee: 24,
  },

  {
    owner: "hugo",
    titre: "Concorde",
    theme: "AVIATION",
    valeurFaciale: "3,00 F",
    annee: 1969,
    couleurImpression: "#36506b",
    rarete: "RARE",
    coteEstimee: 65,
  },

  {
    owner: "rene",
    titre: "Coquelicots",
    theme: "FLORE · NATURE",
    valeurFaciale: "0,46 €",
    annee: 1962,
    couleurImpression: "#c0473b",
    rarete: "COURANT",
    coteEstimee: 8,
  },

  {
    owner: "marc",
    titre: "Cézanne — Sainte-Victoire",
    theme: "ART · TABLEAU",
    valeurFaciale: "2,20 €",
    annee: 1996,
    couleurImpression: "#7a5a35",
    rarete: "RECHERCHE",
    coteEstimee: 18,
  },

  {
    owner: "elodie",
    titre: "Phare de Cordouan",
    theme: "PHARE · GIRONDE",
    valeurFaciale: "1,28 €",
    annee: 2009,
    couleurImpression: "#23607a",
    rarete: "COURANT",
    coteEstimee: 6,
  },

  {
    owner: "sofia",
    titre: "Le Petit Prince",
    theme: "ILLUSTRATION",
    valeurFaciale: "3,00 F",
    annee: 1998,
    couleurImpression: "#3a6ab0",
    rarete: "RARE",
    coteEstimee: 42,
  },

  {
    owner: "hugo",
    titre: "Jeux Olympiques",
    theme: "SPORT · PARIS",
    valeurFaciale: "1,80 €",
    annee: 2024,
    couleurImpression: "#b53d6a",
    rarete: "COURANT",
    coteEstimee: 5,
  },

  {
    owner: "rene",
    titre: "Croix-Rouge",
    theme: "SOLIDARITÉ",
    valeurFaciale: "12 + 3 F",
    annee: 1955,
    couleurImpression: "#a23a30",
    rarete: "RARE",
    coteEstimee: 95,
  },

  {
    owner: "elodie",
    titre: "Jardin de Monet",
    theme: "ART · GIVERNY",
    valeurFaciale: "0,98 €",
    annee: 2010,
    couleurImpression: "#3f7a5b",
    rarete: "COURANT",
    coteEstimee: 7,
  },

  {
    owner: "marc",
    titre: "Métropolitain",
    theme: "PARIS · 1900",
    valeurFaciale: "2,40 €",
    annee: 2000,
    couleurImpression: "#5a4a8f",
    rarete: "RECHERCHE",
    coteEstimee: 14,
  },

  // Timbres appartenant à Camille

  {
    owner: "me",
    titre: "Semeuse de Roty",
    theme: "ALLÉGORIE",
    valeurFaciale: "25 c",
    annee: 1907,
    couleurImpression: "#1f7a52",
    rarete: "RECHERCHE",
    coteEstimee: 22,
  },

  {
    owner: "me",
    titre: "Château de Chambord",
    theme: "PATRIMOINE",
    valeurFaciale: "5,00 F",
    annee: 1952,
    couleurImpression: "#7a5a35",
    rarete: "RECHERCHE",
    coteEstimee: 16,
  },

  {
    owner: "me",
    titre: "Sabine de Gandon",
    theme: "PROFIL",
    valeurFaciale: "1,00 F",
    annee: 1977,
    couleurImpression: "#b0472f",
    rarete: "COURANT",
    coteEstimee: 4,
  },

  {
    owner: "me",
    titre: "Carte de France",
    theme: "CARTOGRAPHIE",
    valeurFaciale: "0,50 €",
    annee: 2003,
    couleurImpression: "#2a5b8f",
    rarete: "COURANT",
    coteEstimee: 3,
  },

  {
    owner: "me",
    titre: "Vendanges",
    theme: "TERROIR",
    valeurFaciale: "0,69 €",
    annee: 2007,
    couleurImpression: "#8a3b6a",
    rarete: "RECHERCHE",
    coteEstimee: 11,
  },

  {
    owner: "me",
    titre: "Aéropostale",
    theme: "AVIATION",
    valeurFaciale: "4,50 F",
    annee: 1968,
    couleurImpression: "#36506b",
    rarete: "RARE",
    coteEstimee: 58,
  },
];


async function main() {
  /* ====================================================
     UTILISATEURS
  ==================================================== */

  console.log("Insertion des utilisateurs...");

  for (const {
    since,
    motDePasse,
    ...utilisateur
  } of utilisateurs) {
    const motDePasseHash =
      hasher(motDePasse);

    const resultat =
      await prisma.utilisateur.upsert({
        where: {
          email: utilisateur.email,
        },

        /*
          Important :

          Si l'utilisateur existe déjà dans la base,
          on met à jour son mot de passe.

          Cela permet de corriger les anciens comptes
          qui utilisaient tous Password123!.
        */
        update: {
          prenom: utilisateur.prenom,
          nom: utilisateur.nom,
          ville: utilisateur.ville,
          role: utilisateur.role,
          statut: "ACTIF",
          motDePasseHash,
        },

        create: {
          ...utilisateur,

          motDePasseHash,

          statut: "ACTIF",

          dateAcceptationChart:
            new Date(),

          dateInscription:
            new Date(
              `${since}-01-01T00:00:00Z`,
            ),
        },
      });

    console.log(
      `Utilisateur vérifié : ${resultat.prenom} ${resultat.nom} (${resultat.role})`,
    );
  }

  /* ====================================================
     TIMBRES
  ==================================================== */

  console.log("Insertion des timbres...");

  for (const timbre of timbres) {
    const proprietaire =
      await prisma.utilisateur.findUnique({
        where: {
          email:
            proprietaires[timbre.owner],
        },
      });

    if (!proprietaire) {
      throw new Error(
        `Propriétaire introuvable pour le timbre : ${timbre.titre}`,
      );
    }

    /*
      Valeurs synthétiques utilisées uniquement
      pour compléter les données de développement.
    */

    const etat = etatAleatoire();

    const referenceCatalogue =
      referenceAleatoire();

    const dateDepot =
      dateDepotAleatoire();

    /*
      Éviter de recréer les 18 timbres
      lorsqu'on relance le seed.
    */

    const existant =
      await prisma.timbre.findFirst({
        where: {
          titre: timbre.titre,
          proprietaireId:
            proprietaire.id,
        },
      });

    if (existant) {
      console.log(
        `Timbre déjà présent : ${timbre.titre}`,
      );

      continue;
    }

    await prisma.timbre.create({
      data: {
        proprietaireId:
          proprietaire.id,

        titre: timbre.titre,
        theme: timbre.theme,

        pays: "France",

        annee: timbre.annee,

        valeurFaciale:
          timbre.valeurFaciale,

        coteEstimee:
          timbre.coteEstimee,

        couleurImpression:
          timbre.couleurImpression,

        rarete: timbre.rarete,

        etat,

        referenceCatalogue,

        statut: "DISPONIBLE",

        dateDepot,

        /*
          Valeurs automatiques définies
          dans schema.prisma :

          expertise = false
          version = 1
        */
      },
    });

    console.log(
      `Timbre créé : ${timbre.titre} (${etat})`,
    );
  }

  /* ====================================================
     FIN
  ==================================================== */

  console.log("");
  console.log(
    "Seed terminé avec succès.",
  );

  console.log("");
  console.log(
    "=== COMPTES DE DEMONSTRATION ===",
  );

  console.log(
    "Camille : camille@example.test / Camille123!",
  );

  console.log(
    "Élodie  : elodie@example.test / Elodie123!",
  );

  console.log(
    "Marc    : marc@example.test / Marc123!",
  );

  console.log(
    "Sofia   : sofia@example.test / Sofia123!",
  );

  console.log(
    "Hugo    : hugo@example.test / Hugo123!",
  );

  console.log(
    "René    : rene@example.test / Rene123!",
  );

  console.log(
    "Modérateur : moderateur@example.test / Moderateur123!",
  );
}

/* ======================================================
   EXECUTION
====================================================== */

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(
      "Erreur pendant le seed :",
      error,
    );

    await prisma.$disconnect();

    process.exit(1);
  });