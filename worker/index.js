/**
 * Le serveur de presid.app : il fait la certification Citoyen éclairé et,
 * depuis le 08/10/2026, compte les avis de la question du jour
 * (`worker/consultation.js`, qui documente ce qu'il garde — des compteurs).
 * Tout le reste du site reste statique et part directement des fichiers
 * (`run_worker_first` ne route ici que /api/*).
 *
 * ## Pourquoi un serveur (décision de Louis, 29/09/2026)
 *
 * Un identifiant de certificat affiché sur LinkedIn ne prouve quelque chose
 * que s'il est impossible à fabriquer soi-même. Il faut donc que l'examen soit
 * corrigé ici, et que le certificat soit signé avec une clé que le navigateur
 * ne voit jamais (le secret CERT_CLE).
 *
 * ## Ce qui est gardé : presque rien
 *
 * - La session d'examen, dans KV : les questions tirées et, pour chacune,
 *   juste ou faux. AUCUN nom. Elle s'efface seule au bout de 2 h.
 * - Un compteur de certificats délivrés par examen réussi (3 au plus, pour
 *   corriger une faute de frappe dans le nom), sans nom lui non plus, 30 jours.
 * - Le nom n'est JAMAIS stocké : il est signé puis renvoyé. Il ne vit que dans
 *   le lien du certificat, après le « # », que les navigateurs n'envoient
 *   jamais au serveur — il ne peut donc pas finir dans un journal d'accès.
 *   La vérification se fait par POST, corps non journalisé. Aucun console.log
 *   de donnée ici.
 */
import { BANQUE } from './banque.js';
import { evolution, resultats, voter } from './consultation.js';

const PAR_MODULE = 5;
const SEUIL = 30;
const POIDS_EXAMEN = 0.75;
const MENTIONS = [
  { nom: 'Très bien', note: 16, examen: 36 },
  { nom: 'Bien', note: 14, examen: 33 },
  { nom: 'Assez bien', note: 12, examen: 30 }
];
const DUREE_SESSION = 2 * 60 * 60;        // secondes
const DUREE_COMPTEUR = 30 * 24 * 60 * 60;
const CERTIFICATS_PAR_EXAMEN = 3;
const ADRESSE_VERIF = 'https://presid.app/verifier#';
/** Octets. La plus grosse requête légitime (fin d'examen) en fait moins de 1 000. */
const TAILLE_MAX = 8 * 1024;

export default {
  async fetch(requete, env) {
    const url = new URL(requete.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(requete);
    if (requete.method !== 'POST') return json({ erreur: 'methode' }, 405);

    // JSON OBLIGATOIRE (08/10/2026). Sans cette règle, n'importe quel site
    // pouvait faire envoyer un avis par le navigateur de ses visiteurs : un
    // POST en text/plain part sans contrôle préalable du navigateur (CORS).
    // Exiger application/json force ce contrôle, et comme ce Worker ne répond
    // à aucun contrôle CORS, le navigateur bloque la requête venue d'ailleurs.
    // Les pages du site et l'app envoient déjà ce type.
    if (!(requete.headers.get('Content-Type') ?? '').startsWith('application/json')) {
      return json({ erreur: 'type' }, 415);
    }
    // Aucune requête légitime ne dépasse quelques centaines d'octets.
    const brut = await requete.text();
    if (brut.length > TAILLE_MAX) return json({ erreur: 'taille' }, 413);

    let corps;
    try { corps = JSON.parse(brut); } catch { return json({ erreur: 'corps' }, 400); }
    if (!corps || typeof corps !== 'object') return json({ erreur: 'corps' }, 400);

    // La question du jour : `/api/consultation/<action>` pour la France,
    // `/api/consultation/<pays>/<action>` pour les autres (cf. consultation.js).
    const consultation = /^\/api\/consultation\/(?:(es|it)\/)?(voter|resultats|evolution)$/.exec(url.pathname);

    try {
      if (consultation) {
        const [, pays = 'fr', action] = consultation;
        if (action === 'voter') return await voter(requete, env, corps, pays);
        if (action === 'resultats') return await resultats(requete, env, corps, pays);
        return await evolution(requete, env, corps, pays);
      }
      switch (url.pathname) {
        case '/api/examen/debut': return await debut(env);
        case '/api/examen/repondre': return await repondre(env, corps);
        case '/api/examen/terminer': return await terminer(env, corps);
        case '/api/certificat': return await delivrer(env, corps);
        case '/api/verifier': return await verifier(env, corps);
        default: return json({ erreur: 'introuvable' }, 404);
      }
    } catch {
      return json({ erreur: 'interne' }, 500);
    }
  }
};

/* ------------------------------------------------------------------ */
/* L'examen                                                           */
/* ------------------------------------------------------------------ */

/** Tire 5 questions par module, mélange les choix, ouvre une session. */
async function debut(env) {
  const id = hex(crypto.getRandomValues(new Uint8Array(16)));
  const tirage = [];      // ce que garde le serveur
  const questions = [];   // ce que voit le navigateur : jamais la réponse
  BANQUE.forEach((banque, m) => {
    melanger([...banque.keys()]).slice(0, PAR_MODULE).forEach((k) => {
      const q = banque[k];
      if (q.t === 'vf') {
        tirage.push({ m, k, b: q.r });
        questions.push({ mi: m, t: 'vf', q: q.q });
      } else {
        const ordre = melanger([...q.c.keys()]);
        tirage.push({ m, k, b: ordre.indexOf(0) });   // la bonne est la 1re de la banque
        questions.push({ mi: m, t: 'qcm', q: q.q, c: ordre.map((j) => q.c[j]) });
      }
    });
  });
  const session = { q: tirage, r: tirage.map(() => null) };
  await env.EXAMENS.put('s:' + id, JSON.stringify(session), { expirationTtl: DUREE_SESSION });
  return json({ session: id, questions });
}

/** Corrige UNE question. La première réponse est définitive. */
async function repondre(env, { session, i, v }) {
  const s = await lireSession(env, session);
  if (!s) return json({ erreur: 'session' }, 410);
  if (!Number.isInteger(i) || i < 0 || i >= s.q.length) return json({ erreur: 'question' }, 400);
  const t = s.q[i];
  const q = BANQUE[t.m][t.k];
  if (s.r[i] === null) {
    const bon = q.t === 'vf' ? v === t.b : v === t.b && Number.isInteger(v);
    s.r[i] = bon ? 1 : 0;
    await env.EXAMENS.put('s:' + session, JSON.stringify(s), { expirationTtl: DUREE_SESSION });
  }
  return json({ bon: s.r[i] === 1, bonne: q.t === 'vf' ? (q.r ? 'vrai' : 'faux') : q.c[0] });
}

/** Compte, calcule la note, et si l'examen est réussi, remet un jeton signé. */
async function terminer(env, { session, modules }) {
  const s = await lireSession(env, session);
  if (!s) return json({ erreur: 'session' }, 410);
  if (s.r.some((x) => x === null)) return json({ erreur: 'incomplet' }, 400);

  const bons = s.r.reduce((a, x) => a + x, 0);
  const parModule = BANQUE.map(() => 0);
  s.q.forEach((t, i) => { parModule[t.m] += s.r[i]; });

  // Les quiz des modules se font dans le navigateur : on prend ce qu'il
  // déclare, borné. L'effet est plafonné par construction — chaque mention
  // exige aussi un score d'EXAMEN, que seul ce serveur connaît.
  const mb = Number(modules && modules.bons), mt = Number(modules && modules.total);
  const ratioModules = mt > 0 && mb >= 0 ? Math.min(1, mb / mt) : 0;
  const n = noter(bons, s.q.length, ratioModules);
  const reussi = bons >= SEUIL;

  const resultat = { bons, total: s.q.length, parModule, reussi, note: n.note, mention: n.mention, plafond: n.plafond };
  if (reussi) {
    resultat.jeton = await signer(env, {
      x: session, e: bons, n: n.note, m: n.mention, d: aujourdhui()
    });
  }
  return json(resultat);
}

function noter(bons, total, ratioModules) {
  const brut = 20 * (POIDS_EXAMEN * bons / total + (1 - POIDS_EXAMEN) * ratioModules);
  const note = Math.round(brut * 2) / 2;
  let mention = '', plafond = null;
  for (const m of MENTIONS) {
    if (note >= m.note && bons >= m.examen) { mention = m.nom; break; }
    if (note >= m.note && !plafond) plafond = { nom: m.nom, examen: m.examen };
  }
  return { note, mention, plafond };
}

/* ------------------------------------------------------------------ */
/* Le certificat                                                      */
/* ------------------------------------------------------------------ */

/** Échange un jeton d'examen réussi + un nom contre un certificat signé. */
async function delivrer(env, { jeton, nom }) {
  const r = await ouvrir(env, jeton);
  if (!r) return json({ erreur: 'jeton' }, 400);
  const propre = nettoyerNom(nom);
  if (!propre) return json({ erreur: 'nom' }, 400);

  const cle = 'c:' + r.x;
  const deja = parseInt(await env.EXAMENS.get(cle), 10) || 0;
  if (deja >= CERTIFICATS_PAR_EXAMEN) return json({ erreur: 'limite' }, 429);
  await env.EXAMENS.put(cle, String(deja + 1), { expirationTtl: DUREE_COMPTEUR });

  const donnees = { v: 1, nom: propre, e: r.e, n: r.n, m: r.m, d: r.d };
  const charge = b64url(new TextEncoder().encode(JSON.stringify(donnees)));
  const sig = await hmac(env, charge);
  const id = identifiant(sig);
  const c = charge + '.' + b64url(sig);
  return json({ id, url: ADRESSE_VERIF + c, nom: propre, note: r.n, mention: r.m, date: r.d, examen: r.e });
}

/** La page /verifier envoie ici ce qu'elle a trouvé après le « # ». */
async function verifier(env, { c }) {
  if (typeof c !== 'string' || c.length > 2000) return json({ valide: false });
  const [charge, sig64] = c.split('.');
  if (!charge || !sig64) return json({ valide: false });
  let sig;
  try { sig = debase64url(sig64); } catch { return json({ valide: false }); }
  const cle = await cleHmac(env);
  const ok = await crypto.subtle.verify('HMAC', cle, sig, new TextEncoder().encode(charge));
  if (!ok) return json({ valide: false });
  const d = JSON.parse(new TextDecoder().decode(debase64url(charge)));
  return json({ valide: true, id: identifiant(sig), nom: d.nom, note: d.n, mention: d.m, examen: d.e, date: d.d });
}

/**
 * Lettres, espaces, traits d'union, apostrophes, points ; 2 à 60 signes.
 * Un nom qui contient autre chose est REFUSÉ, pas « nettoyé » : un
 * certificat au nom de « Camille bMartinb » ne serait bon pour personne.
 */
function nettoyerNom(nom) {
  if (typeof nom !== 'string') return '';
  const n = nom.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!/^[\p{L}\p{M} '’.\-]+$/u.test(n)) return '';
  return n.length >= 2 && n.length <= 60 ? n : '';
}

/* ------------------------------------------------------------------ */
/* Signature                                                          */
/* ------------------------------------------------------------------ */

let cleEnCache = null;
function cleHmac(env) {
  if (!cleEnCache) {
    cleEnCache = crypto.subtle.importKey(
      'raw', new TextEncoder().encode(env.CERT_CLE),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  }
  return cleEnCache;
}
async function hmac(env, texte) {
  const cle = await cleHmac(env);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cle, new TextEncoder().encode(texte)));
}
async function signer(env, objet) {
  const charge = b64url(new TextEncoder().encode(JSON.stringify(objet)));
  return charge + '.' + b64url(await hmac(env, charge));
}
async function ouvrir(env, jeton) {
  if (typeof jeton !== 'string') return null;
  const [charge, sig64] = jeton.split('.');
  if (!charge || !sig64) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await cleHmac(env), debase64url(sig64), new TextEncoder().encode(charge));
    return ok ? JSON.parse(new TextDecoder().decode(debase64url(charge))) : null;
  } catch { return null; }
}

/** 12 signes en base32 (A-Z, 2-7), tirés de la signature : l'identifiant affiché. */
function identifiant(sig) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, valeur = 0, out = '';
  for (const o of sig) {
    valeur = (valeur << 8) | o; bits += 8;
    while (bits >= 5 && out.length < 12) { out += A[(valeur >>> (bits - 5)) & 31]; bits -= 5; }
    if (out.length >= 12) break;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Utilitaires                                                        */
/* ------------------------------------------------------------------ */

async function lireSession(env, id) {
  if (typeof id !== 'string' || !/^[0-9a-f]{32}$/.test(id)) return null;
  const brut = await env.EXAMENS.get('s:' + id);
  return brut ? JSON.parse(brut) : null;
}
function melanger(a) {
  const alea = crypto.getRandomValues(new Uint32Array(a.length));
  for (let i = a.length - 1; i > 0; i--) {
    const j = alea[i] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function hex(octets) { return [...octets].map((o) => o.toString(16).padStart(2, '0')).join(''); }
function b64url(octets) {
  let s = '';
  octets.forEach((o) => { s += String.fromCharCode(o); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function debase64url(t) {
  const s = atob(t.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((t.length + 3) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}
function aujourdhui() { return new Date().toISOString().slice(0, 10); }
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
