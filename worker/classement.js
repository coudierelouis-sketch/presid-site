/**
 * Le classement du jour — un outil INTERNE de Louis (31/10/2026).
 *
 * Une fois par jour, l'app envoie TOUT son classement, dans l'ordre (5
 * personnalités au moins), cf. `elyzee27/src/lib/classementDuJour.ts`. Le but : voir si la
 * communication de presid touche tout le monde ou un seul camp. Rien de ce
 * qui est compté ici ne revient dans l'app ni sur le site : seul
 * `elyzee27/scripts/classements.mjs` le lit, avec la clé `STATS_CLE`.
 *
 * ## Ce qui est gardé : des compteurs, rien d'autre
 *
 * Une ligne par jour et par pays, qui porte tous les compteurs du jour :
 * `{ "melenchon:1": 412, "melenchon:2": 380, … }` (personnalité, rang →
 * nombre d'envois). Les rangs d'un même envoi y sont des compteurs
 * indépendants : la base ne sait pas qu'ils viennent du même téléphone, et
 * ne garde ni l'ordre complet, ni identifiant, ni adresse IP, ni heure. Le
 * nombre d'envois du jour se déduit des rangs 1 (un par envoi).
 *
 * ## Pourquoi une seule ligne par jour
 *
 * Pour tenir 80 000 utilisateurs dans le forfait gratuit de D1 (100 000
 * lignes écrites par jour, partagées avec la question du jour). Une ligne par
 * personnalité et par rang coûtait ~20 écritures par envoi, soit 5 000
 * envois par jour au plus ; ici, chaque envoi est UNE mise à jour (un seul
 * UPSERT qui incrémente tous ses compteurs d'un coup, atomique).
 *
 * Mêmes règles que la question du jour (`consultation.js`), pour la même
 * raison — un classement politique est une opinion politique (RGPD, art. 9) :
 * le classement voyage dans le corps, aucun `console.log`, observabilité coupée.
 *
 * ## Pourquoi une clé pour lire
 *
 * Le dépôt est public et l'adresse aussi. Sans clé, n'importe qui lirait un
 * « classement des utilisateurs de presid » et le publierait comme un sondage
 * (loi du 19 juillet 1977) — ce qu'il n'est pas : personne n'est tiré au sort.
 * `wrangler secret put STATS_CLE` ; sans secret posé, la lecture n'existe pas.
 */
import { adresseLimite } from './consultation.js';

/** Bornes du nombre de rangs d'un envoi : `MIN_CLASSES`, `MAX_CLASSES` dans l'app. */
export const MIN_CLASSES = 5;
export const MAX_CLASSES = 60;
/** Un identifiant de personnalité : `melenchon`, `dupontaignan`, `feijoo`… */
const FORMAT_CANDIDAT = /^[a-z][a-z0-9-]{1,39}$/;
/** Combien de jours la lecture rend au plus. */
const MAX_JOURS = 120;

/** Le classement reçu, ou `null` s'il n'a pas la forme exacte d'un classement de l'app. */
export function lireClassement(ordre) {
  if (!Array.isArray(ordre) || ordre.length < MIN_CLASSES || ordre.length > MAX_CLASSES) return null;
  if (!ordre.every((id) => typeof id === 'string' && FORMAT_CANDIDAT.test(id))) return null;
  if (new Set(ordre).size !== ordre.length) return null;
  return ordre;
}

export async function envoyer(requete, env, { classement }, pays = 'fr') {
  const propre = lireClassement(classement);
  if (!propre) return json({ erreur: 'classement' }, 400);

  // Limite par adresse, à part de celle des avis (`wrangler.jsonc`) : la clé
  // est un condensé du jour et de l'adresse, jamais l'adresse elle-même.
  // L'app réessaie le lendemain d'un 429 : un envoi refusé n'est pas perdu.
  const ip = adresseLimite(requete);
  const limiteur = ip.includes(':') ? env.LIMITE_CLASSEMENTS_V6 : env.LIMITE_CLASSEMENTS;
  const { success } = await limiteur.limit({ key: await condense(`${jourUTC()}|classement|${pays}|${ip}`) });
  if (!success) return json({ erreur: 'trop' }, 429);

  const { sql, valeurs } = requeteEnvoi(jourUTC(), pays, propre);
  await env.DB.prepare(sql).bind(...valeurs).run();
  return json({ ok: true });
}

/**
 * L'UPSERT d'un envoi : crée la ligne du jour avec des 1, ou ajoute 1 à
 * chaque compteur `"<id>:<rang>"`. Les chemins JSON passent en paramètres
 * (?3, ?4…), jamais collés dans le SQL ; 60 rangs au plus, sous la limite de
 * 100 paramètres de D1.
 */
export function requeteEnvoi(jour, pays, ordre) {
  const chemins = ordre.map((id, i) => `$."${id}:${i + 1}"`);
  const params = chemins.map((_, i) => `?${i + 3}`);
  const creation = `json_set('{}', ${params.map((p) => `${p}, 1`).join(', ')})`;
  const ajout = `json_set(compteurs, ${params.map((p) => `${p}, coalesce(json_extract(compteurs, ${p}), 0) + 1`).join(', ')})`;
  return {
    sql: `INSERT INTO classements (jour, pays, compteurs) VALUES (?1, ?2, ${creation})
          ON CONFLICT (jour, pays) DO UPDATE SET compteurs = ${ajout}`,
    valeurs: [jour, pays, ...chemins],
  };
}

/** Les compteurs d'un jour, `{ "id:rang": n }`, en `{ id: [n au rang 1, n au rang 2…] }`. */
export function rangsDepuisCompteurs(compteurs) {
  const rangs = {};
  for (const [cle, n] of Object.entries(compteurs)) {
    const [id, rang] = cle.split(':');
    const r = Number(rang);
    if (!FORMAT_CANDIDAT.test(id) || !Number.isInteger(r) || r < 1 || r > MAX_CLASSES) continue;
    const ligne = rangs[id] ?? [];
    while (ligne.length < r) ligne.push(0);
    ligne[r - 1] = n;
    rangs[id] = ligne;
  }
  return rangs;
}

/**
 * Les compteurs bruts, jour par jour : `{ jours: [{ jour, rangs: { id: [n1, n2…] } }] }`,
 * `rangs[id][i]` = nombre d'envois qui placent `id` au rang i + 1.
 * Le calcul (classement moyen, répartition) se fait dans le script, pas ici.
 */
export async function statistiques(requete, env, { cle, depuis }, pays = 'fr') {
  if (!env.STATS_CLE) return json({ erreur: 'introuvable' }, 404);
  const { success } = await env.LIMITE_LECTURES.limit({ key: await condense(`${jourUTC()}|stats|${adresseLimite(requete)}`) });
  if (!success) return json({ erreur: 'trop' }, 429);
  if (typeof cle !== 'string' || !(await egales(cle, env.STATS_CLE))) return json({ erreur: 'cle' }, 403);
  const debut = typeof depuis === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(depuis)
    ? depuis
    : new Date(Date.now() - MAX_JOURS * 86400e3).toISOString().slice(0, 10);

  const { results } = await env.DB.prepare(
    `SELECT jour, compteurs FROM classements
     WHERE pays = ?1 AND jour >= ?2 ORDER BY jour`
  ).bind(pays, debut).all();

  const jours = results.slice(-MAX_JOURS).map((l) => ({ jour: l.jour, rangs: rangsDepuisCompteurs(JSON.parse(l.compteurs)) }));
  return json({ pays, jours });
}

/** Compare deux chaînes sans que le temps de réponse trahisse le préfixe commun. */
async function egales(a, b) {
  const [ha, hb] = await Promise.all([a, b].map((s) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))));
  const x = new Uint8Array(ha), y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/* ------------------------------------------------------------------ */

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
