# presid.app — le site

Site statique de l'application **presid** (App Store `id6800288453`).
Quatre pages publiques, une page de repli pour les liens de comparaison,
zéro script de mesure, zéro requête vers un tiers.

```
index.html              accueil (pitch, captures, méthode, chiffres, contact)
assistance.html         URL d'assistance déclarée sur les fiches App Store / Play
confidentialite.html    politique de confidentialité (URL déclarée sur les fiches)
mentions-legales.html   éditeur, hébergeur, indépendance   ⚠️ SIREN + adresse à compléter
duo.html                repli du lien de comparaison (/duo?c=CODE)
style.css               tokens repris de src/lib/theme.ts — direction « 2c Riso confetti »
fonts/                  Bricolage Grotesque en woff2, hébergée ici (OFL 1.1)
images/                 captures recadrées depuis elyzee27/docs/store, icône, image de partage
_headers                en-têtes Cloudflare Pages
.well-known/            fichier d'association Apple
```

## La règle qui gouverne le contenu

Les chiffres du corpus affichés sur l'accueil sont **datés** et recomptés dans
`elyzee27/src/data/` : 20 sujets, 341 propositions, 156 positions, 21
personnalités classables au 8 septembre 2026. Ne jamais publier un chiffre
qu'on n'a pas recompté — la fiche Play a déjà menti sur ce point pendant un
mois, et c'est le premier chiffre qu'un journaliste vérifie.

La politique de confidentialité **décrit ce que le code fait vraiment**. Elle ne
mentionne pas la comparaison entre proches tant que la 1.0.4 n'est pas en
vente : la version publique reste la 1.0.2.

## Déploiement — Cloudflare Pages

GitHub Pages ne convient plus : il ne sert pas les dossiers en point (Jekyll) et
envoie un fichier sans extension en `application/octet-stream`, ce qui empêche
définitivement le lien universel Apple. Cloudflare Pages règle les deux, avec
`_headers`.

1. Cloudflare → **Workers & Pages** → *Create* → *Pages* → *Connect to Git* →
   dépôt `coudierelouis-sketch/presid-site`.
2. Framework preset : *None*. Build command : vide. Output directory : `/`.
3. *Custom domains* → `presid.app` et `www.presid.app`. Le DNS se pose tout
   seul si le domaine est enregistré dans le même compte Cloudflare.

Le dépôt reste sur GitHub : Pages se contente d'y lire.

## Les deux adresses e-mail

`louis.coudiere@presid.app` et `victor.parcollet@presid.app`, via **Cloudflare
Email Routing** (gratuit, illimité) :

1. Cloudflare → domaine `presid.app` → **Email** → *Email Routing* → *Get started*.
   Les enregistrements MX et SPF sont posés automatiquement.
2. *Destination addresses* : ajouter la boîte personnelle de chacun. **Chaque
   destinataire doit cliquer le lien de vérification** reçu dans sa propre
   boîte — sans ça, la redirection ne s'active pas.
3. *Routing rules* : `louis.coudiere@presid.app` → boîte de Louis,
   `victor.parcollet@presid.app` → boîte de Victor.
4. Laisser le *catch-all* sur **Drop** : une adresse fourre-tout sur un domaine
   public se fait moissonner en quelques semaines.

Email Routing **redirige** : pour *répondre* depuis l'adresse, ajouter
`smtp.gmail.com` ou l'expédition personnalisée du client de messagerie, sinon la
réponse partira de l'adresse personnelle et l'anonymat de l'adresse est perdu.

## Ce qui reste à faire après la mise en ligne

- **Mentions légales** : SIREN et adresse de l'entrepreneur individuel.
- **App Store Connect** : remplacer l'URL d'assistance
  (`https://presid.app/assistance`), l'URL de confidentialité
  (`https://presid.app/confidentialite`) et l'adresse de contact.
- **Fiche Play** : mêmes URL, au moment de la création du compte.
- **Lien universel (A6)** : le fichier d'association est en place, mais il ne
  sert à rien tant que l'app n'a pas la capacité *Associated Domains* et
  `associatedDomains: ["applinks:presid.app"]` — donc un build natif iOS. Côté
  Android, `assetlinks.json` attend le SHA-256 du certificat de signature Play.

## Citoyen éclairé — la certification (version de travail, 28/09/2026)

```
citoyen.html        la page : parcours, 8 modules, examen, certificat
citoyen-data.js     TOUT le contenu (cours, quiz, banque d'examen, sources)
citoyen.js          le lecteur plein écran, les quiz, l'examen, le certificat
citoyen.css         styles propres à la page (s'ajoute à style.css)
```

**Pas encore publique** : `noindex`, absente du sitemap et de la nav des
autres pages. Le bouton LinkedIn est grisé (`CERTIFICATION_OUVERTE = false`
dans `citoyen.js`) tant qu'il n'y a ni relecture du comité, ni page de
vérification, ni page entreprise LinkedIn.

La progression et le nom restent dans le localStorage du navigateur : aucune
requête, comme le reste du site.

### À revérifier avant ouverture

Les articles de la Constitution cités ont été relus sur le texte intégral du
Conseil constitutionnel le 28/09/2026. Tout le reste est à confirmer sur
source, puis à faire relire par le comité :

- Constitution révisée « plus de vingt fois » (25 au dernier décompte connu) ;
- dates : suffrage direct 1962, quinquennat 2000, deux mandats 2008,
  QPC 2010, vote blanc 2014, procuration hors commune 2022 ;
- cohabitations 1986-88, 1993-95, 1997-2002 ; censures 1962 et déc. 2024
  (vérifier qu'aucune autre n'a eu lieu depuis) ;
- ~35 000 communes, 101 départements, 18 régions ;
- Parlement européen 720 sièges, 81 pour la France (2024-2029) ;
  majorité qualifiée 55 % / 65 % ;
- CMP à 7 + 7 ; e-pétitions Sénat 100 000 en 6 mois (vérifié sur
  petitions.senat.fr) ; RIP « près de 5 millions » ;
- marge d'erreur ≈ 3 points pour 1 000 sondés ; interdiction de publier un
  sondage la veille et le jour du scrutin ;
- répartition des compétences des collectivités (déchets à
  l'intercommunalité, TER à la région, RSA au département) ;
- ajoutés le 28/09 avec les nouvelles questions : parrainages venant d'au
  moins 30 départements ; aucune élection gagnée au 1er tour sous la Ve ;
  langue française à l'article 2 depuis 1992 ; Ville de Paris
  commune + département depuis 2019 ; Conseil de l'Europe à 46 États ;
  UE à 28 avant 2020.

### Ce qui a changé après les tests du 28/09 (deux profils : 22 ans, 46 ans)

- **Note sur 20** : examen 75 %, quiz de module 25 %, et seul le **premier
  essai** d'un module compte. Chaque mention exige aussi un score à
  l'examen (Assez bien 30/40, Bien 33, Très bien 36) — sans ça, un examen
  tout juste réussi décrochait « Très bien ».
- **5 à 6 questions par module** (41 au total), QCM à **4 choix**, jamais
  plus de deux écrans de cours d'affilée.
- **Reprise** au dernier écran après fermeture, et bouton **Précédent**
  (modules seulement ; à l'examen, une réponse donnée est donnée). Une
  réponse réaffichée n'est jamais recomptée.
- **« Lire la suite ↓ »** remplace « Continuer » tant qu'un écran trop haut
  n'a pas été lu jusqu'en bas.
- **Partage** : story 1080×1920 générée dans le navigateur (partage natif
  sur téléphone, téléchargement sinon) et « Défier un ami ». Lien vers
  l'app presid en fin de module (un sur deux) et de résultat.
- **Crédibilité** : section « Qui a écrit ces modules » (le comité s'affiche
  dès que `equipe.comite` est rempli dans `citoyen-data.js`, et sur les
  certificats), lexique de 18 termes cliquables dans les modules,
  certificat téléchargeable en PNG A4 paysage en plus de l'impression/PDF.
- Clé de stockage passée à `presid.citoyen.v2` (les totaux ont changé).

## Le serveur de la certification (29/09/2026)

Décision de Louis : la certification est **officielle et vérifiable**, comme
un certificat Coursera sur LinkedIn (identifiant + « Afficher le diplôme »).
Un identifiant ne prouve rien s'il se fabrique dans le navigateur : l'examen
est donc tiré, corrigé et signé par un **Worker Cloudflare**.

```
worker/index.js     les routes /api/* (tout le reste reste statique)
worker/banque.js    la banque d'examen AVEC les réponses — jamais servie
verifier.html/.js   presid.app/verifier#<certificat> : la page « Afficher le diplôme »
```

| route | rôle |
| --- | --- |
| `POST /api/examen/debut` | tire 5 questions par module, mélange les choix, ouvre une session KV (2 h) |
| `POST /api/examen/repondre` | corrige une question ; la première réponse est définitive |
| `POST /api/examen/terminer` | compte, calcule la note, remet un jeton signé si ≥ 30/40 |
| `POST /api/certificat` | jeton + nom → certificat signé (3 par examen réussi au plus) |
| `POST /api/verifier` | vérifie la signature d'un certificat |

- **Rien de nominatif n'est stocké.** KV ne garde que la session anonyme
  (2 h) et un compteur sans nom (30 j). Le nom vit dans le lien, après le
  `#`, que les navigateurs n'envoient jamais : il n'apparaît dans aucun
  journal. La politique de confidentialité a été réécrite en conséquence.
- **Secret** : `CERT_CLE`, posé par `wrangler secret put CERT_CLE`. Le
  changer invalide TOUS les certificats déjà délivrés — ne jamais le faire.
- **KV** : namespace `EXAMENS` (id dans `wrangler.jsonc`).
- **Local** : `.dev.vars` (clé de test, ignorée par git ET par les assets),
  et `wrangler dev --persist-to <hors du dossier>` : sinon chaque écriture
  KV fait recharger le serveur en boucle.
- **LinkedIn** : l'émetteur est la page existante « Presid »,
  https://www.linkedin.com/company/presidapp (id `143659983`), dans
  `LINKEDIN_ORG` (`citoyen.js` et `verifier.js`). Un doublon `presid-app`
  (id 146641772) créé par erreur le 29/09/2026 a été désactivé le jour même.
- **Un clic vers LinkedIn** : le lien `linkedin.com/profile/add` ouvre le
  formulaire « Licences et certifications » déjà rempli (nom, émetteur
  Presid avec logo, date, identifiant, URL) ; le titulaire n'a qu'à cliquer
  « Enregistrer ». Il est proposé en fin d'examen, sur la page
  /citoyen au retour, et sur la page de vérification. LinkedIn n'offre
  aucune API pour l'écrire sans ce dernier clic.
- Les quiz de module (25 % de la note) restent dans le navigateur, donc
  déclaratifs ; l'effet d'une triche est borné, car chaque mention exige
  aussi un score d'examen que seul le serveur connaît.

## La question du jour (08/10/2026)

L'app lit `/consultations.json` (fichier SIGNÉ, ne jamais l'éditer à la main)
et envoie les avis à `/api/consultation/*`. Ce que le serveur garde et
pourquoi : en-tête de `worker/consultation.js`.

### En ligne depuis le 08/10/2026

Base D1 `presid-consultations` créée (WEUR), schéma appliqué, Worker déployé.
Vérifié en ligne ce jour-là : fichiers internes en 404 (worker, migrations,
brouillons, README, .git), fichier des questions signé et valide, vote en
text/plain refusé (415), requête énorme refusée (413), injection dans l'id
refusée (400), limite par IP active (429 après une rafale), certification
intacte.

**Confidentialité** : la version qui décrit la question du jour (consentement
explicite avant toute connexion, retrait dans Profil, Cloudflare sous-traitant)
est en ligne depuis le 12/10/2026, pour la 1.0.6. L'ancienne est gardée dans
`brouillons/confidentialite-avant-1.0.6.html` (non servi).

### Publier une question

Dans `~/elyzee27` : écrire la question dans `docs/consultations/questions.json`, puis

```
node scripts/consultations.mjs publier             # vérifie, signe, écrit consultations.json ici
cd ~/presid-site && npx wrangler deploy
```

On peut programmer plusieurs jours d'avance : une question n'apparaît qu'à sa date.

### Espagne et Italie (préparé le 18/10/2026, PAS ENCORE DÉPLOYÉ)

Chaque pays a son fichier et ses compteurs : `/consultations-es.json` et
`/api/consultation/es/*`, `/consultations-it.json` et `/api/consultation/it/*`.
En base, les lignes espagnoles et italiennes sont préfixées (`es:2026-10-18`),
la France ne change pas. Pas de migration de schéma.

```
node scripts/consultations.mjs publier --pays es   # écrit consultations-es.json ici
node scripts/consultations.mjs publier --pays it
cd ~/presid-site && npx wrangler deploy
```

Déployer le Worker AVANT ou EN MÊME TEMPS que le premier fichier espagnol :
l'app 1.0.8 vote sur `/api/consultation/es/voter`, que l'ancien Worker ne
connaît pas (404, avis perdu — mais jamais compté chez les Français).

Pour surveiller ou dégeler une question espagnole, mêmes commandes que
ci-dessous avec `question='es:2026-11-02'`.

Réserve : les dates sont dans `PAYS` (`worker/consultation.js`), en double
avec `elyzee27/src/data/<pays>/reserve.ts`. Espagne : aucun pourcentage du
6/10 (convocation) au 29/11 21 h, heure de Madrid — option (b) de l'avis
juridique, retenue par Louis le 18/10/2026 ; les avis restent comptés.
Italie : AUCUNE date, à remplir dès le décret de convocation.

### Quand une question est gelée (« résultats en vérification »)

Le Worker gèle l'affichage d'une question dès qu'une tranche de 10 minutes
dépasse un seuil d'avis, ou un seuil plus bas presque à sens unique. Les
valeurs réelles sont des SECRETS du Worker (`PIC_TRANCHE`, `PIC_SENS_MIN`,
`PIC_SENS_PART`, posés par `wrangler secret put`) : ce dépôt est public, et un
seuil connu se contourne (audit V-03, 12/10/2026). Les limites de débit sont
par question et, en IPv6, par préfixe /64 (`wrangler.jsonc`).

```
# voir les tranches de la question
npx wrangler d1 execute presid-consultations --remote --command \
  "SELECT choix, tranche, n, datetime(tranche*600,'unixepoch') AS debut FROM votes WHERE question='2026-10-12' ORDER BY tranche"
# retirer une tranche jugée frauduleuse
npx wrangler d1 execute presid-consultations --remote --command \
  "DELETE FROM votes WHERE question='2026-10-12' AND tranche=2985754"
# dégeler
npx wrangler d1 execute presid-consultations --remote --command \
  "DELETE FROM gels WHERE question='2026-10-12'"
```

Les dates de réserve électorale sont en double : `worker/consultation.js` et
`elyzee27/src/lib/reserve.ts`. Les mettre à jour ensemble à la publication
du décret.

### Le classement du jour (outil interne, 31/10/2026)

L'app envoie une fois par jour tout son classement à `/api/classement/envoyer`
(`/api/classement/es/envoyer` pour l'Espagne) ; `worker/classement.js` n'en
garde que des compteurs (jour, pays, personnalité, rang). La lecture
(`/api/classement/stats`) exige la clé `STATS_CLE` et n'existe pas tant
qu'elle n'est pas posée. Le rapport se fait sur le Mac :
`node elyzee27/scripts/classements.mjs` (France et Espagne dans la même page).

Mise en route, AVANT la sortie de l'app qui envoie :

```
npx wrangler d1 migrations apply presid-consultations --remote   # table classements
openssl rand -hex 24                     # la clé : la noter, le script la demandera
npx wrangler secret put STATS_CLE        # et la coller ici
npx wrangler deploy
```

Quota : chaque envoi est UNE écriture D1 (une ligne par jour et par pays,
dont on incrémente les compteurs), sur le même plafond quotidien que la
question du jour : 100 000 lignes écrites par jour au forfait gratuit.
