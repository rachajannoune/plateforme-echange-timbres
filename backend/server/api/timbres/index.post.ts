import { prisma } from "../../utils/db";
import { exigerUtilisateurActif } from "../../utils/session";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export default defineEventHandler(async (event) => {
    const utilisateur = await exigerUtilisateurActif(event);


    const files = await readMultipartFormData(event);

    const recto = files?.find(
        (partie) => partie.name === "recto"
    );

    const verso = files?.find(
        (partie) => partie.name === "verso"
    );

    const partieTitre = files?.find(
        (partie) => partie.name === "titre"
    );

    const titre = partieTitre
        ? partieTitre.data.toString("utf8").trim()
        : "";

    const partieTheme = files?.find(
        (partie) => partie.name === "theme"
    );

    const theme = partieTheme
        ? partieTheme.data.toString("utf8").trim()
        : "";

    const partiePays = files?.find(
        (partie) => partie.name === "pays"
    );

    const pays = partiePays
        ? partiePays.data.toString("utf8").trim()
        : "";

    const partieAnnee = files?.find(
        (partie) => partie.name === "annee"
    );

    const annee = partieAnnee
        ? Number(partieAnnee.data.toString("utf8"))
        : 0;

    const partieCoteEstimee = files?.find(
        (partie) => partie.name === "coteEstimee"
    );

    const coteEstimee = partieCoteEstimee
        ? Number(partieCoteEstimee.data.toString("utf8"))
        : -1;

    const partieValeurFaciale = files?.find(
        (partie) => partie.name === "valeurFaciale"
    );

    const valeurFaciale = partieValeurFaciale
        ? partieValeurFaciale.data.toString("utf8").trim()
        : "";

    const partieCouleurImpression = files?.find(
        (partie) => partie.name === "couleurImpression"
    );

    const couleurImpression = partieCouleurImpression
        ? partieCouleurImpression.data.toString("utf8").trim()
        : "";

    const partieRarete = files?.find(
        (partie) => partie.name === "rarete"
    );

    const rarete = partieRarete
        ? partieRarete.data.toString("utf8").trim()
        : "";

    const partieEtat = files?.find(
        (partie) => partie.name === "etat"
    );

    const etat = partieEtat
        ? partieEtat.data.toString("utf8").trim()
        : "";

    const partieReferenceCatalogue = files?.find(
        (partie) => partie.name === "referenceCatalogue"
    );

    const referenceCatalogue = partieReferenceCatalogue
        ? partieReferenceCatalogue.data.toString("utf8").trim() || null
        : null;

    if (
        !titre ||
        !theme ||
        !pays ||
        !partieAnnee ||
        !valeurFaciale ||
        !partieCoteEstimee ||
        !couleurImpression ||
        !rarete ||
        !etat ||
        !recto ||
        !verso
    ) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Tous les champs obligatoires doivent être renseignés.",
            details: null,
        };
    }

    if (!Number.isInteger(annee) || annee <= 0) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "L'année du timbre est invalide.",
            details: null,
        };
    }

    if (
        !Number.isInteger(coteEstimee) ||
        coteEstimee < 0
    ) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "La cote estimée est invalide.",
            details: null,
        };
    }

    const raretesValides = [
        "COURANT",
        "RECHERCHE",
        "RARE",
    ] as const;

    if (
        !raretesValides.includes(
            rarete as typeof raretesValides[number]
        )
    ) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "La rareté du timbre est invalide.",
            details: null,
        };
    }

    const etatsValides = [
        "NEUF",
        "NEUF_SANS_GOMME",
        "OBLITERE",
    ] as const;

    if (
        !etatsValides.includes(
            etat as typeof etatsValides[number]
        )
    ) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "L'état du timbre est invalide.",
            details: null,
        };
    }

    const typesImagesValides = [
        "image/jpeg",
        "image/png",
        "image/webp",
    ];

    if (
        !recto.type ||
        !typesImagesValides.includes(recto.type) ||
        !verso.type ||
        !typesImagesValides.includes(verso.type)
    ) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Les photos doivent être au format JPEG, PNG ou WebP.",
            details: null,
        };
    }

    const tailleMax = 5 * 1024 * 1024;

    // CORRECTION 1 : refuser les fichiers vides.
    if (
        recto.data.length === 0 ||
        verso.data.length === 0 ||
        recto.data.length > tailleMax ||
        verso.data.length > tailleMax
    ) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Chaque photo doit avoir une taille comprise entre 1 octet et 5 Mo.",
            details: null,
        };
    }
    const typeMimeRecto = recto.type;
    const typeMimeVerso = verso.type;

    // CORRECTION 2 : vérifier le contenu réel des images.
    function verifierImage(data: Buffer, type: string) {

        if (type === "image/jpeg") {
            return (
                data.length >= 4 &&
                data[0] === 0xff &&
                data[1] === 0xd8 &&
                data[2] === 0xff &&
                data[data.length - 2] === 0xff &&
                data[data.length - 1] === 0xd9
            );
        }

        if (type === "image/png") {
            return (
                data.length >= 8 &&
                data.subarray(0, 8).equals(
                    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
                )
            );
        }

        if (type === "image/webp") {
            return (
                data.length >= 12 &&
                data.toString("ascii", 0, 4) === "RIFF" &&
                data.toString("ascii", 8, 12) === "WEBP"
            );
        }

        return false;
    }

    if (
        !verifierImage(recto.data, recto.type) ||
        !verifierImage(verso.data, verso.type)
    ) {
        setResponseStatus(event, 400);

        return {
            code: 400,
            message: "Le contenu des photos est invalide.",
            details: null,
        };
    }

    const dossierUploads = join(
        process.cwd(),
        "public",
        "uploads",
        "timbres"
    );

    await mkdir(dossierUploads, {
        recursive: true,
    });

    const extensionRecto =
        recto.type === "image/png"
            ? ".png"
            : recto.type === "image/webp"
                ? ".webp"
                : ".jpg";

    const extensionVerso =
        verso.type === "image/png"
            ? ".png"
            : verso.type === "image/webp"
                ? ".webp"
                : ".jpg";

    const nomRecto =
        `${randomUUID()}-recto${extensionRecto}`;

    const nomVerso =
        `${randomUUID()}-verso${extensionVerso}`;

    const fichierRecto = join(dossierUploads, nomRecto);
    const fichierVerso = join(dossierUploads, nomVerso);

    const cheminRecto =
        `/uploads/timbres/${nomRecto}`;

    const cheminVerso =
        `/uploads/timbres/${nomVerso}`;

    // CORRECTION 3 : nettoyer les fichiers si une erreur survient.
    try {

        await writeFile(
            fichierRecto,
            recto.data,
            { flag: "wx" }
        );

        await writeFile(
            fichierVerso,
            verso.data,
            { flag: "wx" }
        );

        // Créer le timbre et ses photos dans une transaction Prisma.
        const timbreCree = await prisma.$transaction(async (tx) => {

            const timbre = await tx.timbre.create({
                data: {
                    proprietaireId: utilisateur.id,
                    titre,
                    theme,
                    pays,
                    annee,
                    valeurFaciale,
                    coteEstimee,
                    couleurImpression,
                    rarete: rarete as typeof raretesValides[number],
                    etat: etat as typeof etatsValides[number],
                    referenceCatalogue,
                },
            });

            await tx.photoTimbre.createMany({
                data: [
                    {
                        timbreId: timbre.id,
                        face: "RECTO",
                        chemin: cheminRecto,
                        typeMime: typeMimeRecto, 
                        tailleOctets: recto.data.length,
                    },
                    {
                        timbreId: timbre.id,
                        face: "VERSO",
                        chemin: cheminVerso,
                        typeMime: typeMimeVerso,
                        tailleOctets: verso.data.length,
                    },
                ],
            });

            return await tx.timbre.findUnique({
                where: {
                    id: timbre.id,
                },
                include: {
                    photos: {
                        select: {
                            id: true,
                            face: true,
                            chemin: true,
                            typeMime: true,
                            tailleOctets: true,
                        },
                    },
                },
            });
        });

        setResponseStatus(event, 201);

        return {
            code: 201,
            message: "Timbre ajouté avec succès.",
            details: timbreCree,
        };

    } catch (erreur) {

        await unlink(fichierRecto).catch(() => { });
        await unlink(fichierVerso).catch(() => { });

        throw erreur;
    }
});