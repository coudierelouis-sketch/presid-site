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
