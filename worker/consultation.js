/**
 * La question du jour — le second et dernier rôle du Worker (08/10/2026).
 *
 * L'app affiche une question d'actualité par jour, lue dans
 * `/consultations.json` (fichier statique, signé sur le Mac de Louis : cf.
 * `elyzee27/scripts/consultations.mjs`). Ici, on ne fait que deux choses :
 * compter les avis, et rendre les résultats.
 *
 * ## Ce qui est gardé : des compteurs, rien d'autre
 *
 * Une ligne = (question, pour|contre, tranche de 10 minutes, nombre). Pas de
 * compte, pas d'identifiant d'appareil, pas d'adresse IP, pas d'horodatage à
 * la seconde. Une fuite de la base ne dirait rien sur personne.
 *
 * Le seul moment où un avis et une adresse IP sont ensemble, c'est pendant la
 * requête. D'où trois règles, à ne pas défaire :
 *
 * - l'avis voyage dans le CORPS de la requête (POST), jamais dans l'URL ;
 * - aucun `console.log`, nulle part dans ce fichier ;
 * - l'observabilité du Worker est COUPÉE (`wrangler.jsonc`) : pas de journal
 *   d'invocation, donc pas de trace de qui a appelé `/api/consultation/voter`.
 *   Une opinion politique est une donnée sensible (RGPD, art. 9) : on ne la
 *   met pas à côté d'une IP, même dans un journal qu'on ne lit jamais.
 *
 * ## Pourquoi des tranches de 10 minutes
 *
 * Pour pouvoir REPÉRER et RETIRER un bourrage sans rien savoir des votants.
 * Un script qui envoie 20 000 « contre » en une nuit se voit comme une ou deux
 * tranches énormes et à sens unique. Le Worker gèle alors l'affichage de la
 * question (« résultats en vérification ») ; Louis regarde, supprime les
 * tranches suspectes et dégèle à la main (commandes dans le README).
 *
 * ## Les garde-fous d'affichage, côté serveur
 *
 * - Sous `SEUIL_AFFICHAGE` avis, le serveur ne rend AUCUN chiffre : un « 100 %
 *   pour » à trois votants serait capturé et partagé. C'est l'esprit de
 *   `MIN_COMPARAISONS` dans l'app.
 * - Pourcentages entiers, total arrondi à la centaine inférieure.
 * - Rien du tout la veille et le jour du scrutin (loi du 19 juillet 1977,
 *   même dates que `elyzee27/src/lib/reserve.ts`, provisoires elles aussi).
 *   En Espagne, rien non plus les cinq jours sans sondage (art. 69.7 LOREG),
 *   par prudence — cf. `PAYS`.
 *
 * ## Un compteur par pays (18/10/2026)
 *
 * La France, l'Espagne et l'Italie ont chacune leur fichier signé et leurs
 * compteurs. La France garde ses adresses (`/consultations.json`,
 * `/api/consultation/voter`) et ses lignes en base (`question` = la date) :
 * rien ne bouge pour les apps installées. Les autres pays passent par
 * `/api/consultation/es/voter`… et leurs lignes sont préfixées
 * (`question` = `es:2026-10-18`), car la même date existe dans chaque pays.
 * Pas de migration : la colonne est déjà du texte.
 *
 * Ces garde-fous sont AUSSI dans l'app ; ils sont ici d'abord, parce que
 * l'adresse est publique et que n'importe qui peut l'appeler sans l'app.
 */

export const SEUIL_AFFICHAGE = 100;
const TRANCHE = 10 * 60;                 // secondes
/**
 * Seuils de détection d'un bourrage. Les VRAIES valeurs sont des secrets du
 * Worker (`wrangler secret put PIC_TRANCHE`, `PIC_SENS_MIN`, `PIC_SENS_PART`) :
 * le dépôt est public, et un seuil connu se contourne en votant juste en
 * dessous (audit V-03, 12/10/2026). Les valeurs ci-dessous ne servent que de
 * filet si un secret manque.
 */
function seuilsPic(env) {
  const nombre = (v, defaut) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : defaut);
  return {
    tranche: nombre(env?.PIC_TRANCHE, 1500),
    sensMin: nombre(env?.PIC_SENS_MIN, 300),
    sensPart: nombre(env?.PIC_SENS_PART, 0.9),
  };
}
/** On ne vote que sur les questions des 30 derniers jours (plus 1 pour les fuseaux). */
const FENETRE_JOURS = 30;
const MAX_IDS = 40;
const CACHE_FICHIER = 60 * 1000;         // ms

/**
 * Les pays, avec leurs dates de réserve — les MÊMES que `src/data/<pays>/reserve.ts`
 * dans l'app, à mettre à jour ensemble :
 * - `reserve` : veille et jour du vote, aucun résultat ;
 * - `sansSondage` : la période, plus longue, où la loi du pays interdit de
 *   publier un sondage. Les résultats y sont cachés aussi, par prudence.
 *
 * France : dates PROVISOIRES (décret attendu début 2027). Espagne : officielles
 * (RD 806/2026). Italie : AUCUNE date tant que le décret n'est pas publié — à
 * remplir AVANT le vote (silenzio elettorale, et 15 jours sans sondage).
 */
export const PAYS = {
  fr: {
    fichier: '/consultations.json',
    prefixe: '',
    reserve: [
      { debut: '2027-04-10T00:00:00+02:00', fin: '2027-04-11T20:00:00+02:00' },
      { debut: '2027-04-24T00:00:00+02:00', fin: '2027-04-25T20:00:00+02:00' }
    ],
    sansSondage: []
  },
  es: {
    fichier: '/consultations-es.json',
    prefixe: 'es:',
    reserve: [{ debut: '2026-11-28T00:00:00+01:00', fin: '2026-11-29T21:00:00+01:00' }],
    sansSondage: [{ debut: '2026-11-24T00:00:00+01:00', fin: '2026-11-29T21:00:00+01:00' }]
  },
  it: {
    fichier: '/consultations-it.json',
    prefixe: 'it:',
    reserve: [],
    sansSondage: []
  }
};

/** La ligne en base d'une question : la date en France, `es:<date>` ailleurs. */
export function cleQuestion(pays, id) {
  return PAYS[pays].prefixe + id;
}

const FORMAT_ID = /^\d{4}-\d{2}-\d{2}$/;

export async function voter(requete, env, { id, choix }, pays = 'fr') {
  if (typeof id !== 'string' || !FORMAT_ID.test(id)) return json({ erreur: 'question' }, 400);
  if (choix !== 'pour' && choix !== 'contre') return json({ erreur: 'choix' }, 400);

  // Limite par adresse, PAR QUESTION. La clé est un condensé du jour, de la
  // question et de l'adresse : le limiteur de Cloudflare ne voit jamais
  // l'adresse elle-même, et la clé change chaque jour. En IPv6, toute une
  // box ou tout un serveur a un /64 (2⁶⁴ adresses) : on compte le /64, pas
  // l'adresse, sinon un script en change à chaque vote (audit V-03). En IPv4,
  // la limite reste large : derrière le CGNAT d'un opérateur mobile, des
  // centaines de personnes partagent une adresse.
  const ip = adresseLimite(requete);
  const limiteur = ip.includes(':') ? env.LIMITE_VOTES_V6 : env.LIMITE_VOTES;
  const { success } = await limiteur.limit({ key: await condense(`${jourUTC()}|${cleQuestion(pays, id)}|${ip}`) });
  if (!success) return json({ erreur: 'trop' }, 429);

  const questions = await questionsPubliees(requete, env, pays);
  if (!questions.has(id) || !dansLaFenetre(id)) return json({ erreur: 'question' }, 404);

  const cle = cleQuestion(pays, id);
  const tranche = Math.floor(Date.now() / 1000 / TRANCHE);
  await env.DB.prepare(
    `INSERT INTO votes (question, choix, tranche, n) VALUES (?1, ?2, ?3, 1)
     ON CONFLICT (question, choix, tranche) DO UPDATE SET n = n + 1`
  ).bind(cle, choix, tranche).run();

  const { results } = await env.DB.prepare(
    'SELECT choix, n FROM votes WHERE question = ?1 AND tranche = ?2'
  ).bind(cle, tranche).all();
  if (estUnPic(results, seuilsPic(env))) {
    await env.DB.prepare('INSERT OR IGNORE INTO gels (question, depuis) VALUES (?1, ?2)')
      .bind(cle, tranche).run();
  }
  return json({ ok: true });
}

export async function resultats(requete, env, { ids }, pays = 'fr') {
  // Lire coûte aussi (des lectures en base) : même limite par IP que le vote,
  // plus large, pour qu'un script ne puisse pas épuiser le quota gratuit de D1.
  const { success } = await env.LIMITE_LECTURES.limit({ key: await cleLimite(requete) });
  if (!success) return json({ erreur: 'trop' }, 429);

  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_IDS) {
    return json({ erreur: 'ids' }, 400);
  }
  const propres = [...new Set(ids.filter((id) => typeof id === 'string' && FORMAT_ID.test(id)))];
  if (propres.length === 0) return json({ erreur: 'ids' }, 400);

  if (resultatsCoupes(new Date(), pays)) {
    return json({ resultats: Object.fromEntries(propres.map((id) => [id, { etat: 'reserve' }])) });
  }

  // On répond par date (ce que l'app connaît), on lit par ligne en base.
  const cles = propres.map((id) => cleQuestion(pays, id));
  const trous = cles.map((_, i) => `?${i + 1}`).join(', ');
  const [comptes, gels] = await env.DB.batch([
    env.DB.prepare(
      `SELECT question, choix, SUM(n) AS n FROM votes WHERE question IN (${trous}) GROUP BY question, choix`
    ).bind(...cles),
    env.DB.prepare(`SELECT question FROM gels WHERE question IN (${trous})`).bind(...cles)
  ]);

  const geles = new Set(gels.results.map((l) => l.question));
  const sortie = {};
  for (const id of propres) {
    const cle = cleQuestion(pays, id);
    if (geles.has(cle)) { sortie[id] = { etat: 'gele' }; continue; }
    let pour = 0, contre = 0;
    for (const l of comptes.results) {
      if (l.question !== cle) continue;
      if (l.choix === 'pour') pour = l.n; else if (l.choix === 'contre') contre = l.n;
    }
    sortie[id] = publiable(pour, contre);
  }
  return json({ resultats: sortie });
}

/**
 * L'ÉVOLUTION d'une question : la part de « pour » au fil du temps, en
 * cumulé. Ajoutée le 10/10/2026 pour l'historique de l'app.
 *
 * Une courbe trop fine trahirait des votes : si le total passe de 140 à 141
 * entre deux points et que la part bouge, on sait dans quel sens a voté la
 * personne de 14 h 03. D'où trois règles :
 * - rien sous `SEUIL_AFFICHAGE` avis cumulés, comme partout ;
 * - un nouveau point seulement après `PAS_AVIS` avis de plus ET au moins une
 *   heure (`PAS_TRANCHES`) : chaque pas mélange assez de monde pour que
 *   personne n'y soit reconnaissable ;
 * - au plus `MAX_POINTS` points, en gardant toujours le dernier.
 */
export async function evolution(requete, env, { id }, pays = 'fr') {
  const { success } = await env.LIMITE_LECTURES.limit({ key: await cleLimite(requete) });
  if (!success) return json({ erreur: 'trop' }, 429);
  if (typeof id !== 'string' || !FORMAT_ID.test(id)) return json({ erreur: 'question' }, 400);
  if (resultatsCoupes(new Date(), pays)) return json({ evolution: { etat: 'reserve' } });

  const questions = await questionsPubliees(requete, env, pays);
  if (!questions.has(id)) return json({ erreur: 'question' }, 404);

  const cle = cleQuestion(pays, id);
  const [lignes, gel] = await env.DB.batch([
    env.DB.prepare('SELECT tranche, choix, n FROM votes WHERE question = ?1 ORDER BY tranche').bind(cle),
    env.DB.prepare('SELECT 1 FROM gels WHERE question = ?1').bind(cle),
  ]);
  if (gel.results.length > 0) return json({ evolution: { etat: 'gele' } });
  return json({ evolution: serie(lignes.results) });
}

const PAS_AVIS = 25;
const PAS_TRANCHES = 6;          // 6 × 10 min = 1 h
const MAX_POINTS = 60;

/** Les points publiables d'une série de compteurs (lignes triées par tranche). */
export function serie(lignes) {
  const parTranche = new Map();
  for (const l of lignes) {
    const c = parTranche.get(l.tranche) ?? { pour: 0, contre: 0 };
    if (l.choix === 'pour') c.pour += l.n; else if (l.choix === 'contre') c.contre += l.n;
    parTranche.set(l.tranche, c);
  }
  let pour = 0, contre = 0;
  let dernier = null;           // { tranche, total }
  let points = [];
  for (const tranche of [...parTranche.keys()].sort((a, b) => a - b)) {
    const c = parTranche.get(tranche);
    pour += c.pour;
    contre += c.contre;
    const total = pour + contre;
    if (total < SEUIL_AFFICHAGE) continue;
    if (dernier && (total - dernier.total < PAS_AVIS || tranche - dernier.tranche < PAS_TRANCHES)) continue;
    points.push({ t: new Date((tranche + 1) * TRANCHE * 1000).toISOString(), pour: Math.round((pour / total) * 100) });
    dernier = { tranche, total };
  }
  if (points.length === 0) return { etat: 'sous-seuil' };
  if (points.length > MAX_POINTS) {
    const pas = Math.ceil(points.length / MAX_POINTS);
    const garde = points.filter((_, i) => i % pas === 0);
    if (garde.at(-1) !== points.at(-1)) garde.push(points.at(-1));
    points = garde;
  }
  return { etat: 'ok', points };
}

/** Ce qu'on a le droit de montrer d'un compte brut. */
export function publiable(pour, contre) {
  const total = pour + contre;
  if (total < SEUIL_AFFICHAGE) return { etat: 'sous-seuil' };
  const pctPour = Math.round((pour / total) * 100);
  return { etat: 'ok', pour: pctPour, contre: 100 - pctPour, environ: Math.floor(total / 100) * 100 };
}

/** Une tranche trop grosse, ou déjà grosse et presque à sens unique. */
export function estUnPic(lignes, seuils = seuilsPic()) {
  let pour = 0, contre = 0;
  for (const l of lignes) {
    if (l.choix === 'pour') pour = l.n; else if (l.choix === 'contre') contre = l.n;
  }
  const total = pour + contre;
  if (total > seuils.tranche) return true;
  return total >= seuils.sensMin && Math.max(pour, contre) / total >= seuils.sensPart;
}

function dansUnePeriode(periodes, maintenant) {
  const t = maintenant.getTime();
  return periodes.some((p) => t >= Date.parse(p.debut) && t <= Date.parse(p.fin));
}

export function enReserve(maintenant, pays = 'fr') {
  return dansUnePeriode(PAYS[pays].reserve, maintenant);
}

/** Réserve, ou jours où la loi du pays interdit de publier un sondage. */
export function resultatsCoupes(maintenant, pays = 'fr') {
  return enReserve(maintenant, pays) || dansUnePeriode(PAYS[pays].sansSondage, maintenant);
}

/* ------------------------------------------------------------------ */

/** Un cache par pays : le fichier espagnol ne doit jamais valider une date française. */
const caches = {};

/**
 * Les identifiants des questions réellement publiées. Sans ce contrôle,
 * n'importe qui remplirait la base de questions inventées.
 *
 * La signature n'est pas revérifiée ici : le fichier vient du même
 * déploiement que ce code. C'est l'APP qui la vérifie — elle seule reçoit le
 * fichier par un chemin qu'un tiers pourrait détourner.
 */
async function questionsPubliees(requete, env, pays = 'fr') {
  const cache = caches[pays];
  if (cache && Date.now() - cache.lu < CACHE_FICHIER) return cache.ids;
  const rep = await env.ASSETS.fetch(new Request(new URL(PAYS[pays].fichier, requete.url)));
  // Pas encore de fichier pour ce pays : aucune question, donc aucun vote.
  if (!rep.ok) return new Set();
  const fichier = await rep.json();
  const contenu = JSON.parse(fichier.contenu);
  // Un fichier d'un autre pays posé à la mauvaise adresse ne compte pas.
  if ((contenu.pays ?? 'fr') !== pays) return new Set();
  caches[pays] = { lu: Date.now(), ids: new Set(contenu.questions.map((q) => q.date)) };
  return caches[pays].ids;
}

function dansLaFenetre(id) {
  const jour = Date.parse(id + 'T00:00:00Z');
  const maintenant = Date.now();
  return jour <= maintenant + 86400e3 && jour >= maintenant - FENETRE_JOURS * 86400e3;
}

/** La clé de limitation : un condensé jour + IP, jamais l'adresse elle-même. */
function cleLimite(requete) {
  return condense(jourUTC() + adresseLimite(requete));
}

/**
 * L'adresse qui sert de clé de limite : telle quelle en IPv4, réduite à son
 * préfixe /64 en IPv6 (les quatre premiers groupes, forme compressée
 * développée d'abord). Jamais stockée : elle n'entre que dans un condensé.
 */
export function adresseLimite(requete) {
  const ip = requete.headers.get('CF-Connecting-IP') ?? '';
  if (!ip.includes(':')) return ip;
  const [tete, queue = ''] = ip.split('::');
  const avant = tete ? tete.split(':') : [];
  const apres = ip.includes('::') && queue ? queue.split(':') : [];
  const groupes = ip.includes('::')
    ? [...avant, ...Array(Math.max(0, 8 - avant.length - apres.length)).fill('0'), ...apres]
    : ip.split(':');
  return groupes.slice(0, 4).map((g) => (g || '0').toLowerCase().replace(/^0+(?=.)/, '')).join(':') + '::/64';
}

async function condense(texte) {
  const octets = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte));
  return [...new Uint8Array(octets)].slice(0, 16).map((o) => o.toString(16).padStart(2, '0')).join('');
}

function jourUTC() { return new Date().toISOString().slice(0, 10); }

function json(objet, statut = 200) {
  return new Response(JSON.stringify(objet), {
    status: statut,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
