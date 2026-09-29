/**
 * presid.app/citoyen — le parcours « Citoyen éclairé ».
 *
 * Un module = une suite d'écrans (cours, quiz, idée reçue) joués dans un
 * lecteur plein écran. L'examen = 5 questions par module, tirées dans la
 * banque, jamais celles vues pendant le module.
 *
 * ## Ce qui est gardé, et où
 *
 * La progression, l'écran où l'on s'est arrêté et le nom tapé pour le
 * certificat restent dans le localStorage de CE navigateur, et nulle part
 * ailleurs : aucune requête, comme le reste du site. Si le stockage est
 * bloqué (navigation privée), tout fonctionne, sans mémoire d'une visite à
 * l'autre.
 *
 * ## La note (tests du 28/09/2026)
 *
 * Deux profils testés ont montré un barème injuste : 30/40 à l'examen et
 * « Très bien » grâce à des quiz de module qu'on pouvait refaire jusqu'au
 * sans-faute. D'où trois règles :
 *   - seul le PREMIER essai d'un module compte ;
 *   - l'examen pèse 75 % de la note ;
 *   - chaque mention exige aussi un score minimal à l'examen (MENTIONS).
 *
 * ## Mouvement
 *
 * Mêmes règles que l'accueil : courbes décélérées, 70 ms par rang, aucun
 * rebond. Le texte monte mot par mot (14 ms d'écart), les mots-clés reçoivent
 * le surlignage jaune ensuite. Tout saute si l'on a demandé moins d'animations.
 */
(function () {
  var D = window.CITOYEN;
  if (!D) return;
  var MODULES = D.modules;

  var PAR_MODULE = 5;        // questions par module à l'examen
  var SEUIL = 30;            // bonnes réponses sur 40 pour être certifié
  var POIDS_EXAMEN = 0.75;   // le reste : le premier essai des quiz de module
  // Une mention demande la note ET le score d'examen. Sans le second, un
  // examen tout juste réussi décrochait « Très bien ».
  var MENTIONS = [
    { nom: 'Très bien', note: 16, examen: 36 },
    { nom: 'Bien', note: 14, examen: 33 },
    { nom: 'Assez bien', note: 12, examen: 30 }
  ];
  var CLE = 'presid.citoyen.v2';
  var APP = 'https://apps.apple.com/fr/app/id6800288453';
  var ADRESSE = 'https://presid.app/citoyen';
  // La page entreprise Presid sur LinkedIn (linkedin.com/company/presidapp).
  // C'est cet identifiant qui fait apparaître le logo de presid comme
  // émetteur sur les profils.
  var LINKEDIN_ORG = '143659983';

  var reduit = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     stockage
     ------------------------------------------------------------------ */
  function lire() {
    try { return JSON.parse(localStorage.getItem(CLE)) || {}; } catch (e) { return {}; }
  }
  function ecrire() {
    try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) { /* navigation privée */ }
  }
  var etat = lire();
  etat.modules = etat.modules || {};
  etat.encours = etat.encours || {};

  /* ------------------------------------------------------------------
     utilitaires
     ------------------------------------------------------------------ */
  function $(sel, racine) { return (racine || document).querySelector(sel); }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function bouton(cls, texte, action) {
    var b = el('button', cls, texte);
    b.type = 'button';
    if (action) b.addEventListener('click', action);
    return b;
  }
  function echapper(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function formater(s) {
    return echapper(s).replace(/\*\*(.+?)\*\*/g, '<strong class="cle">$1</strong>');
  }
  function melanger(liste) {
    var a = liste.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function deuxChiffres(n) { return (n < 10 ? '0' : '') + n; }
  function estQuestion(e) { return e.t === 'vf' || e.t === 'qcm' || e.t === 'ordre'; }
  function nbQuestions(m) { return m.ecrans.filter(estQuestion).length; }
  function minutes(m) { return m.ecrans.length + 3; }
  function dureeTexte(min) {
    if (min < 60) return min + ' min';
    var h = Math.floor(min / 60), r = min % 60;
    return h + ' h' + (r ? ' ' + deuxChiffres(Math.round(r / 5) * 5) : '');
  }
  function ecrireNote(n) { return n.toLocaleString('fr-FR'); }
  function aujourdhui() { return new Date().toISOString().slice(0, 10); }
  function dateLongue() {
    return new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  /** La note sur 20, au demi-point, et sa mention. */
  function noteFinale(bonsExamen, totalExamen) {
    var modBons = 0, modTotal = 0;
    MODULES.forEach(function (m) {
      var r = etat.modules[m.id];
      var n = nbQuestions(m);
      modTotal += n;
      if (r && r.fait) modBons += Math.min(r.bons, n);
    });
    var brut = 20 * (POIDS_EXAMEN * bonsExamen / totalExamen + (1 - POIDS_EXAMEN) * modBons / modTotal);
    var note = Math.round(brut * 2) / 2;
    var mention = '', plafond = null;
    for (var k = 0; k < MENTIONS.length; k++) {
      var m = MENTIONS[k];
      if (note >= m.note && bonsExamen >= m.examen) { mention = m.nom; break; }
      // La note y était, l'examen non : on le dit, pour que ce soit juste ET lisible.
      if (note >= m.note && !plafond) plafond = m;
    }
    return { note: note, mention: mention, plafond: plafond, modBons: modBons, modTotal: modTotal };
  }

  var SVG = {
    ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l5 5 9-11"/></svg>',
    ko: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg>'
  };

  /**
   * Découpe le texte d'un élément en mots animés. Les balises internes
   * (mots-clés, termes du lexique) sont conservées ; chaque mot reçoit son
   * rang `--i`, chaque mot-clé le rang de son premier mot `--d`.
   */
  function decouper(racine, base) {
    if (reduit || racine.classList.contains('joue')) return 0;
    var n = 0;
    var marcheur = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT);
    var noeuds = [];
    while (marcheur.nextNode()) noeuds.push(marcheur.currentNode);
    noeuds.forEach(function (t) {
      var parent = t.parentNode;
      var cle = parent.closest ? parent.closest('.cle, .surligne') : null;
      if (cle && !cle.style.getPropertyValue('--d')) cle.style.setProperty('--d', n);
      var frag = document.createDocumentFragment();
      t.nodeValue.split(/(\s+)/).forEach(function (p) {
        if (!p) return;
        if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
        var sp = document.createElement('span');
        sp.className = 'm';
        sp.style.setProperty('--i', n++);
        sp.textContent = p;
        frag.appendChild(sp);
      });
      parent.replaceChild(frag, t);
    });
    racine.style.setProperty('--base', (base || 0) + 'ms');
    racine.classList.add('joue');
    return n;
  }

  /** Compte de 0 jusqu'à la cible, en décéléré, sans dépassement. */
  function compter(noeud, cible, retard, suffixe, pas05) {
    suffixe = suffixe || '';
    function ecrit(v) { noeud.innerHTML = v.toLocaleString('fr-FR') + suffixe; }
    function arrondi(v) { return pas05 ? Math.round(v * 2) / 2 : Math.round(v); }
    if (reduit) { ecrit(cible); return; }
    ecrit(0);
    setTimeout(function () {
      var duree = 1000, depart = null;
      function pas(h) {
        if (depart === null) depart = h;
        var t = Math.min((h - depart) / duree, 1);
        ecrit(arrondi(cible * (1 - Math.pow(1 - t, 3))));
        if (t < 1) requestAnimationFrame(pas);
      }
      requestAnimationFrame(pas);
    }, retard || 0);
  }

  /** Des aplats ronds qui s'écartent du centre : la réussite, en riso. */
  function eclats(parent) {
    if (reduit) return;
    var COULEURS = ['#FFE066', '#FF5A3D', '#2B3BD6', '#A6D75B', '#8ADEFF', '#FFB02E'];
    var boite = el('div', 'eclats');
    for (var k = 0; k < 30; k++) {
      var i = el('i');
      var angle = Math.random() * Math.PI * 2;
      var dist = 110 + Math.random() * 190;
      var taille = 8 + Math.random() * 22;
      i.style.width = i.style.height = taille + 'px';
      i.style.background = COULEURS[k % COULEURS.length];
      i.style.setProperty('--x', Math.cos(angle) * dist + 'px');
      i.style.setProperty('--y', Math.sin(angle) * dist * 0.75 + 'px');
      i.style.setProperty('--retard', Math.round(Math.random() * 180) + 'ms');
      boite.appendChild(i);
    }
    parent.appendChild(boite);
    setTimeout(function () { boite.remove(); }, 1700);
  }

  /* ------------------------------------------------------------------
     le lexique
     Chaque terme devient cliquable la première fois qu'il apparaît dans un
     écran. On ne touche ni aux boutons, ni à la carte qu'on swipe, ni aux
     titres : un mot cliquable dans une réponse de QCM serait un piège.
     ------------------------------------------------------------------ */
  var LEXIQUE = (D.glossaire || []).map(function (g) {
    return { terme: g.terme, d: g.d, re: new RegExp('(^|[^\\wÀ-ÿ])(' + g.re + ')(?![\\wÀ-ÿ])', 'i') };
  });
  var EXCLUS = 'button, .vf-carte, .choix, .reserve, .emplacements, h2, .sur, .q-titre, .intro-num, .intro-meta, .terme, .fin-score, .bilan, .certificat, .champ-nom, .note-finale, .sources, .pont-app, .reprise';

  function lexique(racine, vus) {
    var marcheur = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT, {
      acceptNode: function (t) {
        return t.parentNode.closest(EXCLUS) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var noeuds = [];
    while (marcheur.nextNode()) noeuds.push(marcheur.currentNode);
    LEXIQUE.forEach(function (g, k) {
      if (vus[k]) return;
      for (var i = 0; i < noeuds.length; i++) {
        var t = noeuds[i];
        var m = g.re.exec(t.nodeValue);
        if (!m) continue;
        var debut = m.index + m[1].length;
        var suite = t.splitText(debut);
        var reste = suite.splitText(m[2].length);
        var b = el('button', 'terme');
        b.type = 'button';
        b.setAttribute('data-g', k);
        b.setAttribute('aria-label', m[2] + ' : voir la définition');
        b.appendChild(suite);
        reste.parentNode.insertBefore(b, reste);
        noeuds.splice(i, 1, t, reste);
        vus[k] = true;
        break;
      }
    });
  }

  var bulle = el('div', 'bulle');
  bulle.setAttribute('role', 'tooltip');
  bulle.hidden = true;
  document.body.appendChild(bulle);
  var bulleDe = null;

  function montrerBulle(b) {
    var g = LEXIQUE[b.getAttribute('data-g')];
    if (!g) return;
    if (bulleDe === b && !bulle.hidden) return cacherBulle();
    bulle.innerHTML = '<strong>' + echapper(g.terme) + '</strong><span>' + echapper(g.d) + '</span>';
    bulle.hidden = false;
    var r = b.getBoundingClientRect();
    var larg = Math.min(320, window.innerWidth - 24);
    bulle.style.width = larg + 'px';
    var gauche = Math.max(12, Math.min(r.left + r.width / 2 - larg / 2, window.innerWidth - larg - 12));
    var haut = r.bottom + 10;
    bulle.style.left = gauche + 'px';
    bulle.style.top = haut + 'px';
    // Pas de place en dessous : la bulle passe au-dessus du mot.
    if (haut + bulle.offsetHeight > window.innerHeight - 12) {
      bulle.style.top = Math.max(12, r.top - bulle.offsetHeight - 10) + 'px';
    }
    bulleDe = b;
  }
  function cacherBulle() { bulle.hidden = true; bulleDe = null; }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('.terme');
    if (t) { e.preventDefault(); montrerBulle(t); return; }
    if (!bulle.contains(e.target)) cacherBulle();
  });
  window.addEventListener('resize', cacherBulle);

  /* ------------------------------------------------------------------
     l'accueil
     ------------------------------------------------------------------ */
  var liste = $('#liste-modules');
  var barres = $('#progression');

  MODULES.forEach(function (m, i) {
    var b = el('button', 'module t-' + m.teinte);
    b.type = 'button';
    b.style.setProperty('--i', i);
    b.innerHTML =
      '<span class="module-num">' + deuxChiffres(i + 1) + '</span>' +
      '<h3>' + echapper(m.titre) + '</h3>' +
      '<p>' + echapper(m.court) + '</p>' +
      '<span class="module-pied"><span class="module-duree">≈ ' + minutes(m) + ' min · ' + nbQuestions(m) + ' questions</span>' +
      '<span class="statut">À faire</span></span>';
    b.addEventListener('click', function () { ouvrirModule(i, b); });
    liste.appendChild(b);
    barres.appendChild(el('i'));
  });

  // La durée totale se déduit du contenu, pour ne jamais mentir.
  var total = MODULES.reduce(function (acc, m) { return acc + minutes(m); }, 0) + 15;
  var metaDuree = document.querySelectorAll('.meta li')[1];
  if (metaDuree) metaDuree.innerHTML = '<strong>≈ ' + dureeTexte(total) + '</strong> au total';

  // Le lexique complet, en bas de page.
  var boiteLexique = $('#lexique');
  if (boiteLexique) {
    D.glossaire.slice().sort(function (a, b) { return a.terme.localeCompare(b.terme, 'fr'); }).forEach(function (g) {
      boiteLexique.appendChild(el('div', 'lexique-item', '<dt>' + echapper(g.terme) + '</dt><dd>' + echapper(g.d) + '</dd>'));
    });
  }

  // Qui écrit, qui relit. Le comité s'affiche dès qu'il a des noms.
  var boiteEquipe = $('#equipe');
  if (boiteEquipe) {
    var comite = (D.equipe && D.equipe.comite) || [];
    boiteEquipe.innerHTML =
      '<div class="carte"><h3>Rédaction</h3><p>' + echapper(D.equipe.redaction) + '. Chaque affirmation renvoie à une source officielle, listée à la fin de chaque module.</p></div>' +
      '<div class="carte' + (comite.length ? ' vert' : ' sable') + '"><h3>Relecture</h3><p>' + (comite.length
        ? comite.map(function (c) { return '<strong>' + echapper(c.nom) + '</strong>, ' + echapper(c.titre); }).join('<br>')
        : 'Un comité d\'universitaires (droit public, science politique) est en cours de constitution. Leurs noms s\'afficheront ici et sur chaque certificat, et les modules seront mis à jour après leur relecture.') + '</p></div>';
  }

  function majAccueil() {
    var faits = 0;
    MODULES.forEach(function (m, i) {
      var r = etat.modules[m.id];
      var carte = liste.children[i];
      var statut = $('.statut', carte);
      var fait = !!(r && r.fait);
      var enCours = !fait && etat.encours[m.id];
      if (fait) faits++;
      statut.classList.toggle('fait', fait);
      statut.classList.toggle('encours', !!enCours);
      statut.textContent = fait ? 'Terminé · ' + Math.min(r.bons, nbQuestions(m)) + '/' + nbQuestions(m)
        : enCours ? 'En cours' : 'À faire';
      barres.children[i].classList.toggle('fait', fait);
    });
    $('#progression-texte').textContent =
      faits + (faits > 1 ? ' modules terminés' : ' module terminé') + ' sur ' + MODULES.length;
    var b = $('#examen-carte .bouton');
    if (etat.examen && etat.examen.note != null) {
      b.textContent = 'Repasser · meilleure note ' + ecrireNote(etat.examen.note) + '/20';
    }
    // Revenir chercher son certificat, sans repasser l'examen.
    var c = etat.certificat;
    var zone = $('#mon-certificat');
    if (c && zone) {
      zone.hidden = false;
      zone.innerHTML = '<span>Votre certificat <strong>' + echapper(c.id) + '</strong> · ' +
        '<a href="' + echapper(c.url) + '" target="_blank" rel="noopener">le voir</a></span>' +
        '<a class="bouton linkedin" href="' + echapper(lienLinkedIn(c)) + '" target="_blank" rel="noopener">Ajouter à mon profil LinkedIn</a>';
    }
  }
  majAccueil();

  document.addEventListener('click', function (e) {
    var cible = e.target.closest('[data-ouvrir]');
    if (!cible) return;
    var quoi = cible.getAttribute('data-ouvrir');
    if (quoi === 'examen') return ouvrirExamen(cible);
    // « Commencer » reprend au premier module pas encore terminé.
    for (var i = 0; i < MODULES.length; i++) {
      if (!(etat.modules[MODULES[i].id] || {}).fait) return ouvrirModule(i, cible);
    }
    ouvrirExamen(cible);
  });

  // Le titre du héros monte mot par mot au chargement.
  [].forEach.call(document.querySelectorAll('.cit-hero [data-anime]'), function (n, k) {
    decouper(n, k * 220);
  });

  /* ------------------------------------------------------------------
     le lecteur
     ------------------------------------------------------------------ */
  var L = {
    racine: $('#lecteur'), scene: $('#scene'), titre: $('#lecteur-titre'),
    compte: $('#lecteur-compte'), barre: $('#lecteur-barre i'),
    bas: $('.lecteur-bas'), bouton: $('#continuer'), precedent: $('#precedent')
  };
  var s = null;           // la séance en cours
  var declencheur = null; // l'élément à qui rendre le focus à la fermeture

  function ouvrirModule(index, depuis, aZero) {
    var m = MODULES[index];
    var ecrans = [{ t: 'intro' }].concat(m.ecrans, [{ t: 'fin' }]);
    s = {
      mode: 'module', index: index, module: m, teinte: m.teinte, ecrans: ecrans,
      i: 0, bons: 0, total: nbQuestions(m), reponses: {},
      dejaFait: !!(etat.modules[m.id] || {}).fait
    };
    // Reprise : là où l'on s'était arrêté, avec les réponses déjà données.
    var enc = etat.encours[m.id];
    if (aZero) { delete etat.encours[m.id]; ecrire(); }
    else if (enc && enc.i > 0 && enc.i < ecrans.length - 1) {
      s.i = enc.i;
      s.bons = enc.bons || 0;
      s.reponses = enc.reponses || {};
      s.reprise = true;
    }
    demarrer(depuis, '#module-' + (index + 1));
  }

  /**
   * L'examen est tiré ET corrigé par le serveur (worker/) : le navigateur ne
   * reçoit que les énoncés, jamais les réponses. Tant que les questions
   * n'arrivent pas, l'écran d'introduction attend.
   */
  function ouvrirExamen(depuis) {
    s = {
      mode: 'examen', teinte: 'encre', ecrans: [{ t: 'examenIntro' }],
      i: 0, bons: 0, total: PAR_MODULE * MODULES.length, reponses: {},
      parModule: MODULES.map(function () { return 0; }), chargement: true
    };
    var seance = s;
    demarrer(depuis, '#examen');
    api('examen/debut', {}).then(function (r) {
      if (s !== seance) return;
      s.session = r.session;
      s.total = r.questions.length;
      s.ecrans = [{ t: 'examenIntro' }].concat(r.questions, [{ t: 'resultat' }]);
      s.chargement = false;
      if (s.i === 0) afficher(true);
    }, function () {
      if (s !== seance) return;
      s.chargement = false;
      s.horsLigne = true;
      if (s.i === 0) afficher(true);
    });
  }

  function api(chemin, corps) {
    return fetch('/api/' + chemin, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corps)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        return r.ok ? j : Promise.reject(j);
      });
    });
  }

  function demarrer(depuis, ancre) {
    var dejaOuvert = !L.racine.hidden;
    if (!dejaOuvert) declencheur = depuis || null;
    L.racine.className = 'lecteur t-' + s.teinte;
    L.racine.hidden = false;
    document.body.classList.add('lit');
    try { history.replaceState(null, '', ancre); } catch (e) { /* file:// */ }
    afficher(!dejaOuvert);
    // Le focus va sur « Continuer », pas sur la croix : sinon la première
    // touche Entrée referme le module qu'on vient d'ouvrir.
    if (!dejaOuvert) L.bouton.focus({ preventScroll: true });
  }

  function fermer() {
    if (L.racine.hidden) return;
    cacherBulle();
    function fin() {
      L.racine.hidden = true;
      L.racine.classList.remove('part');
      L.scene.innerHTML = '';
      document.body.classList.remove('lit');
      s = null;
      if (declencheur && declencheur.focus) declencheur.focus({ preventScroll: true });
    }
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    majAccueil();
    if (reduit) return fin();
    L.racine.classList.add('part');
    setTimeout(fin, 220);
  }
  $('#fermer').addEventListener('click', fermer);

  /** Garde l'écran courant d'un module, pour reprendre après une coupure. */
  function sauverEncours() {
    if (!s || s.mode !== 'module') return;
    var dernier = s.ecrans.length - 1;
    if (s.i > 0 && s.i < dernier) {
      etat.encours[s.module.id] = { i: s.i, bons: s.bons, reponses: s.reponses };
    } else if (s.i === dernier) {
      delete etat.encours[s.module.id];
    }
    ecrire();
  }

  function afficher(premier) {
    var ancien = L.scene.firstElementChild;
    cacherBulle();
    function construire() {
      if (!s) return;
      L.scene.innerHTML = '';
      L.scene.scrollTop = 0;
      var e = s.ecrans[s.i];
      var ecran = el('div', 'ecran' + (e.mi != null ? ' t-' + MODULES[e.mi].teinte : ''));
      s.pret = true;
      s.repondu = false;
      s.clavier = null;
      s.lireSuite = false;
      s.libelle = 'Continuer';
      s.termes = {};
      RENDUS[e.t](ecran, e);

      if (s.reprise) {
        s.reprise = false;
        var bandeau = el('div', 'reprise',
          '<span>On reprend là où vous vous étiez arrêté.</span>');
        bandeau.appendChild(bouton('lien', 'Recommencer le module', function () {
          ouvrirModule(s.index, null, true);
        }));
        ecran.insertBefore(bandeau, ecran.firstChild);
      }

      [].forEach.call(ecran.children, function (c, r) { c.style.setProperty('--r', r); });
      L.scene.appendChild(ecran);
      lexique(ecran, s.termes);
      // Le texte d'un bloc commence à monter quand son bloc s'est déplié.
      [].forEach.call(ecran.querySelectorAll('[data-anime]'), function (n) {
        var bloc = n;
        while (bloc.parentNode !== ecran && bloc.parentNode) bloc = bloc.parentNode;
        var rang = parseInt(bloc.style.getPropertyValue('--r'), 10) || 0;
        decouper(n, rang * 70 + 80);
      });
      if (s.rejouer) { var rj = s.rejouer; s.rejouer = null; rj(); }
      sauverEncours();
      majChrome();
      requestAnimationFrame(verifierDefilement);
    }
    if (ancien && !premier && !reduit) {
      ancien.classList.add('sort');
      setTimeout(construire, 190);
    } else {
      construire();
    }
  }

  /* Un écran de cours plus haut que la fenêtre ne se passe pas sans avoir
     été lu jusqu'en bas : « Continuer » devient « Lire la suite », qui fait
     défiler. Sur téléphone, la moitié des listes passait inaperçue. */
  var LECTURE = { intro: 1, cours: 1, mots: 1, duo: 1, examenIntro: 1 };
  function resteADefiler() {
    return L.scene.scrollHeight - L.scene.clientHeight - L.scene.scrollTop;
  }
  function verifierDefilement() {
    if (!s || L.racine.hidden) return;
    var e = s.ecrans[s.i];
    var avant = s.lireSuite;
    s.lireSuite = !!(LECTURE[e.t] && s.pret && resteADefiler() > 24);
    if (avant !== s.lireSuite) majChrome();
  }
  L.scene.addEventListener('scroll', function () {
    cacherBulle();
    if (s && s.lireSuite && resteADefiler() <= 24) { s.lireSuite = false; majChrome(); }
  }, { passive: true });
  window.addEventListener('resize', function () { requestAnimationFrame(verifierDefilement); });

  function majChrome() {
    var n = s.ecrans.length;
    var e = s.ecrans[s.i];
    if (s.mode === 'module') {
      L.titre.innerHTML = '<span>Module ' + (s.index + 1) + ' ·</span> ' + echapper(s.module.titre);
      L.compte.textContent = (s.i + 1) + ' / ' + n;
    } else {
      L.titre.innerHTML = '<span>Examen final ·</span> Citoyen éclairé';
      var q = s.i;  // l'écran 0 est l'introduction
      L.compte.textContent = (q >= 1 && q <= s.total) ? 'Question ' + q + ' / ' + s.total : '';
    }
    L.barre.style.transform = 'scaleX(' + (s.i / (n - 1)) + ')';
    var fin = e.t === 'fin' || e.t === 'resultat';
    L.bas.classList.toggle('cache', fin);
    // Revenir en arrière : dans un module seulement. À l'examen, une réponse
    // donnée est donnée.
    L.precedent.hidden = !(s.mode === 'module' && s.i > 0 && !fin);
    L.bouton.disabled = !s.pret;
    L.bouton.textContent = s.lireSuite ? 'Lire la suite ↓' : s.libelle;
    L.bouton.classList.toggle('suite', !!s.lireSuite);
    var aide = $('.aide', L.bas);
    if (!aide) { aide = el('span', 'aide'); L.bas.insertBefore(aide, L.bouton); }
    aide.textContent = s.lireSuite ? 'Encore un peu de lecture'
      : s.pret ? 'Entrée ↵'
      : e.t === 'vf' ? '← Faux · Vrai →'
      : e.t === 'qcm' ? 'Touches 1 à 4' : '';
  }

  function continuer() {
    if (!s) return;
    if (s.lireSuite) {
      L.scene.scrollBy({ top: L.scene.clientHeight * 0.7, behavior: reduit ? 'auto' : 'smooth' });
      return;
    }
    if (!s.pret) return;
    if (s.i < s.ecrans.length - 1) { s.i++; afficher(false); }
  }
  function reculer() {
    if (!s || s.mode !== 'module' || s.i === 0) return;
    s.i--;
    afficher(false);
  }
  L.bouton.addEventListener('click', continuer);
  L.precedent.addEventListener('click', reculer);

  document.addEventListener('keydown', function (e) {
    if (!s || L.racine.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      if (!bulle.hidden) cacherBulle(); else fermer();
      return;
    }
    var dansChamp = /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
    if (dansChamp) return;
    if (s.clavier && s.clavier(e)) { e.preventDefault(); return; }
    if (e.key === 'Enter' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A') {
      e.preventDefault();
      continuer();
    }
  });

  /**
   * Une réponse est donnée. Si cet écran a déjà reçu une réponse (on est
   * revenu en arrière, ou on reprend), elle est réaffichée mais pas recomptée.
   */
  function repondre(bon, mi, trace) {
    if (s.repondu) return false;
    s.repondu = true;
    s.pret = true;
    var deja = !!s.reponses[s.i];
    if (!deja) {
      s.reponses[s.i] = Object.assign({ bon: bon }, trace);
      if (bon) {
        s.bons++;
        if (s.mode === 'examen') s.parModule[mi]++;
      }
      sauverEncours();
    }
    majChrome();
    return !deja;
  }

  /** Envoie une réponse d'examen au serveur, qui la corrige et la garde. */
  function corriger(valeur) {
    s.repondu = true;
    var seance = s, ecranI = s.i;
    return api('examen/repondre', { session: s.session, i: s.i - 1, v: valeur }).then(function (res) {
      if (seance.reponses[ecranI]) return res;
      seance.reponses[ecranI] = { bon: res.bon };
      if (res.bon) seance.bons++;
      if (s === seance && s.i === ecranI) { s.pret = true; majChrome(); }
      return res;
    });
  }

  /** Le serveur ne répond pas, ou la session a expiré : on le dit, et on propose la suite. */
  function horsLigne(ecran, erreur, reessayer) {
    var expiree = erreur && erreur.erreur === 'session';
    var r = el('div', 'retour rate',
      '<div class="retour-icone">' + SVG.ko + '</div><div><strong>' +
      (expiree ? 'Session expirée.' : 'Problème de connexion.') + '</strong><p>' +
      (expiree ? 'Un examen doit être terminé dans les deux heures. Il faut le recommencer.'
        : 'Le serveur de presid ne répond pas. Vérifiez votre connexion, puis réessayez : votre réponse n\'est pas perdue.') + '</p></div>');
    var suite = el('div', 'fin-actions');
    suite.appendChild(expiree
      ? bouton('bouton', 'Recommencer l\'examen', function () { ouvrirExamen(declencheur); })
      : bouton('bouton', 'Réessayer', reessayer || function () { afficher(true); }));
    $('div:last-child', r).appendChild(suite);
    ajouterRetour(ecran, r);
  }

  var BRAVO = ['Exact.', 'Bien vu.', 'C\'est ça.', 'Tout juste.'];
  function retour(bon, texte) {
    var titre = bon ? BRAVO[Math.floor(Math.random() * BRAVO.length)] : 'Pas tout à fait.';
    var r = el('div', 'retour ' + (bon ? 'bon' : 'rate'));
    r.innerHTML = '<div class="retour-icone">' + (bon ? SVG.ok : SVG.ko) + '</div>' +
      '<div><strong>' + titre + '</strong>' + (texte ? '<p>' + formater(texte) + '</p>' : '') + '</div>';
    var p = $('p', r);
    if (p) { lexique(p, s.termes); decouper(p, 120); }
    return r;
  }

  function ajouterRetour(ecran, noeud, instant) {
    ecran.appendChild(noeud);
    if (instant) { noeud.classList.add('fige'); return; }
    // Sur un petit écran, le retour tombe sous la ligne de flottaison.
    setTimeout(function () {
      noeud.scrollIntoView({ behavior: reduit ? 'auto' : 'smooth', block: 'nearest' });
      L.bouton.focus({ preventScroll: true });
    }, 60);
  }

  /** L'explication d'une question d'examen ratée : la réponse, et où la revoir. */
  function rappel(e, reponse) {
    return 'La bonne réponse : ' + reponse + '. C\'est dans le module ' + (e.mi + 1) + ', « ' + MODULES[e.mi].titre + ' ».';
  }

  /* ------------------------------------------------------------------
     les écrans
     ------------------------------------------------------------------ */
  function sur(texte) { return el('p', 'sur', echapper(texte)); }
  function titre(texte) {
    var h = el('h2', null, formater(texte));
    h.setAttribute('data-anime', '');
    return h;
  }
  function paragraphe(cls, html) {
    var p = el('p', cls, html);
    p.setAttribute('data-anime', '');
    return p;
  }

  var RENDUS = {
    intro: function (ecran) {
      var m = s.module;
      ecran.appendChild(el('div', 'intro-num', deuxChiffres(s.index + 1) + '<small>/ ' + deuxChiffres(MODULES.length) + '</small>'));
      ecran.appendChild(titre(m.titre));
      ecran.appendChild(paragraphe('texte-cours', formater(m.objectif)));
      ecran.appendChild(el('div', 'intro-meta',
        '<span>≈ ' + minutes(m) + ' min</span><span>' + m.ecrans.length + ' écrans</span><span>' + s.total + ' questions</span>'));
      if (s.dejaFait) {
        var r = etat.modules[m.id];
        ecran.appendChild(el('p', 'note-essai', 'Déjà terminé avec ' + Math.min(r.bons, s.total) + '/' + s.total +
          '. Vous pouvez le refaire autant que vous voulez : seul ce premier essai compte pour la note.'));
      }
      s.libelle = 'C\'est parti';
    },

    cours: function (ecran, e) {
      ecran.appendChild(sur(e.sur));
      ecran.appendChild(titre(e.titre));
      ecran.appendChild(paragraphe('texte-cours', formater(e.texte)));
      if (e.faits) {
        var g = el('div', 'faits');
        e.faits.forEach(function (f, k) {
          var c = el('div', 'fait', '<div class="v"></div><div class="l">' + echapper(f.l) + '</div>');
          var v = $('.v', c);
          var n = parseInt(f.v, 10);
          // Une année ne se compte pas : 0 → 1958 n'a aucun sens.
          if (isNaN(n) || (n > 1800 && n < 2100)) v.textContent = f.v;
          else compter(v, n, 500 + k * 120);
          g.appendChild(c);
        });
        ecran.appendChild(g);
      }
    },

    mots: function (ecran, e) {
      ecran.appendChild(sur(e.sur));
      ecran.appendChild(titre(e.titre));
      if (e.texte) ecran.appendChild(paragraphe('citation', echapper(e.texte)));
      var l = el('div', 'mots-liste');
      e.mots.forEach(function (m, k) {
        var item = el('div', 'mot-item', '<strong>' + echapper(m.m) + '</strong><span>' + formater(m.d) + '</span>');
        item.style.setProperty('--i', k);
        l.appendChild(item);
      });
      ecran.appendChild(l);
    },

    duo: function (ecran, e) {
      ecran.appendChild(sur(e.sur));
      ecran.appendChild(titre(e.titre));
      ecran.appendChild(el('div', 'duo',
        '<div class="duo-carte"><strong>' + echapper(e.a.t) + '</strong><span>' + formater(e.a.d) + '</span></div>' +
        '<div class="duo-ou">ou</div>' +
        '<div class="duo-carte"><strong>' + echapper(e.b.t) + '</strong><span>' + formater(e.b.d) + '</span></div>'));
    },

    vf: function (ecran, e) {
      s.pret = false;
      ecran.appendChild(el('p', 'q-titre', s.mode === 'examen' ? echapper(MODULES[e.mi].titre) + ' · vrai ou faux ?' : 'Vrai ou faux ?'));
      var zone = el('div', 'vf-zone');
      zone.innerHTML = '<div class="vf-dos"></div>';
      var carte = el('div', 'vf-carte',
        '<span class="tampon vrai">VRAI</span><span class="tampon faux">FAUX</span><p>' + echapper(e.q) + '</p>');
      carte.tabIndex = 0;
      carte.setAttribute('role', 'group');
      carte.setAttribute('aria-label', 'Affirmation : ' + e.q + '. Flèche droite pour vrai, gauche pour faux.');
      zone.appendChild(carte);
      ecran.appendChild(zone);

      var boutons = el('div', 'vf-boutons',
        '<button type="button" class="faux">' + SVG.ko + ' Faux</button>' +
        '<button type="button" class="vrai">' + SVG.ok + ' Vrai</button>');
      ecran.appendChild(boutons);
      var aide = el('p', 'vf-aide', 'Glissez la carte vers la droite pour vrai, vers la gauche pour faux.');
      ecran.appendChild(aide);
      var bFaux = $('.faux', boutons), bVrai = $('.vrai', boutons);
      var tVrai = $('.tampon.vrai', carte), tFaux = $('.tampon.faux', carte);

      function viser(dx) {
        tVrai.style.opacity = Math.max(0, Math.min(1, dx / 90));
        tFaux.style.opacity = Math.max(0, Math.min(1, -dx / 90));
        bVrai.classList.toggle('vise', dx > 40);
        bFaux.classList.toggle('vise', dx < -40);
      }

      /** La carte figée, tamponnée de la BONNE réponse, puis le retour. */
      function figer(verite, bon, instant, texte) {
        var figee = el('div', 'vf-carte figee' + (instant ? ' fige' : ''),
          '<span class="tampon ' + (verite ? 'vrai' : 'faux') + '" style="opacity:1">' + (verite ? 'VRAI' : 'FAUX') + '</span><p>' + echapper(e.q) + '</p>');
        zone.replaceChild(figee, zone.lastChild);
        aide.remove();
        ajouterRetour(ecran, retour(bon, texte), instant);
      }

      /** La carte part du côté choisi ; la promesse se tient quand elle est sortie. */
      function sortir(valeur) {
        if (reduit) return Promise.resolve();
        var dir = valeur ? 1 : -1;
        viser(dir * 90);
        carte.classList.remove('tire');
        carte.classList.add('sort');
        carte.style.transform = 'translate(' + dir * 140 + '%,0) rotate(' + dir * 16 + 'deg)';
        carte.style.opacity = '0';
        return new Promise(function (ok) { setTimeout(ok, 380); });
      }

      function choisir(valeur, instant) {
        if (s.repondu) return;
        bFaux.disabled = bVrai.disabled = true;
        if (s.mode === 'examen') {
          Promise.all([corriger(valeur), sortir(valeur)]).then(function (x) {
            var res = x[0];
            figer(res.bonne === 'vrai', res.bon, false, res.bon ? '' : rappel(e, res.bonne));
          }, function (err) { horsLigne(ecran, err); });
          return;
        }
        var bon = valeur === e.r;
        repondre(bon, e.mi, { v: valeur });
        if (instant) { figer(e.r, bon, true, e.e); return; }
        sortir(valeur).then(function () { figer(e.r, bon, false, e.e); });
      }

      bFaux.addEventListener('click', function () { choisir(false); });
      bVrai.addEventListener('click', function () { choisir(true); });
      s.clavier = function (ev) {
        if (s.repondu) return false;
        if (ev.key === 'ArrowRight') { choisir(true); return true; }
        if (ev.key === 'ArrowLeft') { choisir(false); return true; }
        return false;
      };

      // Le geste : même physique que le deck de l'accueil.
      var prise = null;
      carte.addEventListener('pointerdown', function (ev) {
        if (s.repondu) return;
        prise = { x: ev.clientX, dx: 0, vx: 0, t: performance.now(), id: ev.pointerId };
        carte.setPointerCapture(ev.pointerId);
        carte.classList.add('tire');
      });
      carte.addEventListener('pointermove', function (ev) {
        if (!prise || ev.pointerId !== prise.id) return;
        var dx = ev.clientX - prise.x, t = performance.now();
        prise.vx = (dx - prise.dx) / Math.max(1, t - prise.t);
        prise.dx = dx; prise.t = t;
        carte.style.transform = 'translate(' + dx + 'px,0) rotate(' + Math.max(-16, Math.min(16, dx / 12)) + 'deg)';
        viser(dx);
      });
      function lacher(ev) {
        if (!prise || (ev && ev.pointerId !== prise.id)) return;
        var dx = prise.dx, vx = prise.vx;
        prise = null;
        if (Math.abs(dx) > 90 || Math.abs(vx) > 0.6) { choisir(dx > 0 || (dx === 0 && vx > 0)); return; }
        carte.classList.remove('tire');
        carte.style.transform = '';
        viser(0);
      }
      carte.addEventListener('pointerup', lacher);
      carte.addEventListener('pointercancel', lacher);

      var trace = s.reponses[s.i];
      if (trace) s.rejouer = function () { choisir(trace.v, true); };
    },

    qcm: function (ecran, e) {
      s.pret = false;
      ecran.appendChild(el('p', 'q-titre', s.mode === 'examen' ? echapper(MODULES[e.mi].titre) : 'À vous'));
      ecran.appendChild(paragraphe('q-enonce', echapper(e.q)));
      var boite = el('div', 'choix');
      var examen = s.mode === 'examen';
      // Dans un module, la bonne réponse est la première des données : on
      // mélange ici. À l'examen, le serveur a déjà mélangé et garde la réponse.
      var ordre = examen ? e.c.map(function (_, k) { return k; }) : melanger(e.c.map(function (_, k) { return k; }));
      var boutons = ordre.map(function (k, pos) {
        var b = el('button', null,
          '<span class="lettre">' + 'ABCD'[pos] + '</span><span>' + echapper(e.c[k]) + '</span>' +
          '<span class="marque-rep">' + (examen ? '' : k === 0 ? SVG.ok : SVG.ko) + '</span>');
        b.type = 'button';
        b.style.setProperty('--i', pos);
        b.addEventListener('click', function () { choisir(k, b); });
        boite.appendChild(b);
        return b;
      });
      ecran.appendChild(boite);

      function choisir(k, b, instant) {
        if (s.repondu) return;
        if (examen) {
          boutons.forEach(function (x) { x.disabled = true; });
          b.classList.add('attente');
          corriger(k).then(function (res) {
            b.classList.remove('attente');
            boutons.forEach(function (x, pos) {
              var juste = e.c[ordre[pos]] === res.bonne;
              $('.marque-rep', x).innerHTML = juste ? SVG.ok : SVG.ko;
              if (juste) x.classList.add('juste');
              else if (x !== b) x.classList.add('eteint');
            });
            if (!res.bon) b.classList.add('faux');
            ajouterRetour(ecran, retour(res.bon, res.bon ? '' : rappel(e, res.bonne)));
          }, function (err) {
            b.classList.remove('attente');
            horsLigne(ecran, err);
          });
          return;
        }
        var bon = k === 0;
        repondre(bon, e.mi, { k: k });
        boutons.forEach(function (x, pos) {
          x.disabled = true;
          if (ordre[pos] === 0) x.classList.add('juste');
          else if (x !== b) x.classList.add('eteint');
        });
        if (!bon) b.classList.add('faux');
        var texte = s.mode === 'examen' ? (bon ? '' : rappel(e, e.c[0])) : e.e;
        ajouterRetour(ecran, retour(bon, texte), instant);
      }
      s.clavier = function (ev) {
        var n = parseInt(ev.key, 10);
        if (s.repondu || !(n >= 1 && n <= boutons.length)) return false;
        boutons[n - 1].click();
        return true;
      };
      var trace = s.reponses[s.i];
      if (trace) s.rejouer = function () { choisir(trace.k, boutons[ordre.indexOf(trace.k)], true); };
    },

    ordre: function (ecran, e) {
      s.pret = false;
      ecran.appendChild(el('p', 'q-titre', 'Dans l\'ordre'));
      ecran.appendChild(paragraphe('q-enonce', echapper(e.q)));
      var cases = el('ol', 'emplacements');
      e.items.forEach(function () { cases.appendChild(el('li', null, '<span>…</span>')); });
      ecran.appendChild(cases);
      var reserve = el('div', 'reserve');
      var ordre;
      do { ordre = melanger(e.items.map(function (_, k) { return k; })); }
      while (ordre.every(function (k, pos) { return k === pos; }));
      var prochain = 0, erreurs = 0;

      function poser(k) {
        var li = cases.children[prochain];
        li.innerHTML = '<span>' + echapper(e.items[k]) + '</span>';
        li.classList.add('plein');
        prochain++;
      }
      function terminer(nbErreurs, instant) {
        repondre(nbErreurs <= 1, e.mi, { erreurs: nbErreurs });
        reserve.remove();
        var bilan = nbErreurs === 0 ? 'Sans une erreur. '
          : nbErreurs + (nbErreurs > 1 ? ' erreurs en route. ' : ' erreur en route. ');
        ajouterRetour(ecran, retour(nbErreurs <= 1, bilan + (e.e || '')), instant);
      }

      ordre.forEach(function (k, pos) {
        var b = el('button', null, echapper(e.items[k]));
        b.type = 'button';
        b.style.setProperty('--i', pos);
        b.addEventListener('click', function () {
          if (s.repondu) return;
          if (k !== prochain) {
            erreurs++;
            b.classList.add('rate');
            setTimeout(function () { b.classList.remove('rate'); }, 450);
            return;
          }
          b.classList.add('pris');
          poser(k);
          if (prochain === e.items.length) terminer(erreurs, false);
        });
        reserve.appendChild(b);
      });
      ecran.appendChild(reserve);

      var trace = s.reponses[s.i];
      if (trace) s.rejouer = function () {
        e.items.forEach(function (_, k) { poser(k); });
        terminer(trace.erreurs, true);
      };
    },

    piege: function (ecran, e) {
      s.pret = false;
      var p = el('div', 'piege',
        '<div class="piege-carte"><p class="piege-sur">Idée reçue</p>' +
        '<p class="piege-mythe">' + echapper(e.mythe) + '</p>' +
        '<span class="piege-tampon">PAS SI SIMPLE</span></div>' +
        '<div class="piege-verite" hidden><p>' + formater(e.verite) + '</p></div>');
      ecran.appendChild(p);
      var b = bouton('bouton fantome demeler', 'Démêler le vrai du faux');
      ecran.appendChild(b);
      function reveler(instant) {
        if (s.pret) return;
        p.classList.add('revele');
        if (instant) p.classList.add('fige');
        var v = $('.piege-verite', p);
        v.hidden = false;
        if (!instant) decouper($('p', v), 150);
        b.remove();
        s.pret = true;
        s.reponses[s.i] = { vu: true };
        sauverEncours();
        majChrome();
        if (instant) return;
        setTimeout(function () {
          v.scrollIntoView({ behavior: reduit ? 'auto' : 'smooth', block: 'nearest' });
          L.bouton.focus({ preventScroll: true });
        }, 60);
      }
      b.addEventListener('click', function () { reveler(false); });
      s.clavier = function (ev) {
        if (ev.key === 'Enter' && !s.pret) { reveler(false); return true; }
        return false;
      };
      if (s.reponses[s.i]) s.rejouer = function () { reveler(true); };
    },

    fin: function (ecran) {
      var m = s.module;
      var r = etat.modules[m.id];
      // Premier essai : il est gardé. Les suivants ne le remplacent jamais.
      if (!r || !r.fait) {
        etat.modules[m.id] = { fait: true, bons: s.bons, total: s.total, le: aujourdhui() };
      } else {
        r.dernier = { bons: s.bons, le: aujourdhui() };
      }
      delete etat.encours[m.id];
      ecrire();

      ecran.classList.add('fin');
      ecran.appendChild(sur('Module ' + (s.index + 1) + ' terminé'));
      var score = el('div', 'fin-score');
      ecran.appendChild(score);
      compter(score, s.bons, 300, '<small>/' + s.total + '</small>');
      var parfait = s.bons === s.total;
      var message = parfait ? 'Un sans-faute. Ce module est acquis.'
        : s.bons + ' bonne' + (s.bons > 1 ? 's' : '') + ' réponse' + (s.bons > 1 ? 's' : '') + ' sur ' + s.total + '. Ce module compte pour 5 questions à l\'examen : revoyez-le quand vous voulez.';
      if (s.dejaFait) message += ' Votre premier essai (' + Math.min(r.bons, s.total) + '/' + s.total + ') reste celui qui compte pour la note.';
      ecran.appendChild(paragraphe('texte-cours', echapper(message)));

      var actions = el('div', 'fin-actions');
      var suivant = MODULES[s.index + 1];
      var principal = bouton('bouton', suivant ? 'Module ' + (s.index + 2) + ' : ' + echapper(suivant.titre) : 'Passer l\'examen final', function () {
        if (suivant) ouvrirModule(s.index + 1, declencheur);
        else ouvrirExamen(declencheur);
      });
      actions.appendChild(principal);
      actions.appendChild(bouton('bouton fantome', 'Revenir au parcours', fermer));
      ecran.appendChild(actions);

      ecran.appendChild(el('div', 'sources', '<strong>Sources du module</strong><ul>' +
        m.sources.map(function (x) {
          return '<li><a href="' + echapper(x.url) + '" target="_blank" rel="noopener">' + echapper(x.titre) + '</a></li>';
        }).join('') + '</ul>'));
      // Le pont vers l'app, une fois sur deux modules : pas à chaque écran.
      if (s.index % 2 === 1) ecran.appendChild(pontApp());

      if (s.bons / s.total >= 0.5) setTimeout(function () { eclats(ecran); }, 250);
      setTimeout(function () { principal.focus({ preventScroll: true }); }, 400);
    },

    examenIntro: function (ecran) {
      ecran.appendChild(sur('Examen final'));
      ecran.appendChild(titre(s.total + ' questions pour devenir citoyen éclairé'));
      ecran.appendChild(paragraphe('texte-cours', formater(
        'Cinq questions par module, tirées au hasard, jamais celles des modules. Il faut **' + SEUIL +
        ' bonnes réponses** pour être certifié. Pas de chrono, et pas de retour en arrière : une réponse donnée est donnée.')));
      var faits = MODULES.filter(function (m) { return (etat.modules[m.id] || {}).fait; }).length;
      ecran.appendChild(el('div', 'intro-meta',
        '<span>' + s.total + ' questions</span><span>' + SEUIL + ' pour réussir</span><span>' + faits + '/' + MODULES.length + ' modules faits</span>'));
      ecran.appendChild(el('div', 'bareme',
        '<strong>La note sur 20</strong>' +
        '<p>Examen 75 %, premier essai des quiz de module 25 %. Une mention demande la note <em>et</em> un score à l\'examen :</p>' +
        '<ul>' + MENTIONS.slice().reverse().map(function (m) {
          return '<li><b>' + m.nom + '</b><span>' + m.note + '/20 et ' + m.examen + '/40</span></li>';
        }).join('') + '</ul>'));
      s.libelle = 'Commencer l\'examen';
      if (s.chargement) { s.pret = false; s.libelle = 'Préparation de l\'examen…'; }
      if (s.horsLigne) {
        s.pret = false;
        s.horsLigne = false;
        horsLigne(ecran, null, function () { ouvrirExamen(declencheur); });
      }
    },

    resultat: function (ecran) {
      ecran.classList.add('fin');
      var attente = el('div', 'correction', '<span class="correction-rond"></span><p>Correction de votre examen…</p>');
      ecran.appendChild(attente);
      // Le premier essai des modules se fait dans le navigateur : on le déclare.
      var mod = noteFinale(0, 1);
      var seance = s;
      function demander() {
        api('examen/terminer', { session: seance.session, modules: { bons: mod.modBons, total: mod.modTotal } }).then(function (r) {
          if (s !== seance) return;
          attente.remove();
          remplirResultat(ecran, r, mod);
        }, function (err) {
          if (s !== seance) return;
          attente.remove();
          horsLigne(ecran, err, function () { afficher(true); });
        });
      }
      demander();
    }
  };

  function remplirResultat(ecran, r, mod) {
    var reussi = r.reussi;
    var n = { note: r.note, mention: r.mention, plafond: r.plafond, modBons: mod.modBons, modTotal: mod.modTotal };
    s.bons = r.bons;
    s.total = r.total;
    s.parModule = r.parModule;
    s.note = n;
    s.jeton = r.jeton || null;
    etat.examen = etat.examen || {};
    if (etat.examen.meilleur == null || s.bons > etat.examen.meilleur) etat.examen.meilleur = s.bons;
    if (reussi && (etat.examen.note == null || n.note > etat.examen.note)) etat.examen.note = n.note;
    if (reussi) etat.examen.reussi = aujourdhui();
    ecrire();

    ecran.appendChild(sur(reussi ? 'Examen réussi' : 'Pas encore'));
    var score = el('div', 'fin-score');
    ecran.appendChild(score);
    compter(score, s.bons, 300, '<small>/' + s.total + '</small>');
    var manque = SEUIL - s.bons;
    var phrase = paragraphe('texte-cours', echapper(reussi
      ? 'Vous êtes citoyen éclairé.'
      : 'Il vous manquait ' + manque + ' bonne' + (manque > 1 ? 's' : '') + ' réponse' + (manque > 1 ? 's' : '') + '. Revoyez les modules les plus fragiles, puis retentez votre chance.'));
    ecran.appendChild(phrase);

    // La note totale : l'examen et les modules, sur 20.
    var bloc = el('div', 'note-finale' + (reussi ? '' : ' ratee'),
      '<div class="note-gauche"><span class="note-sur">Note finale</span>' +
      '<span class="note-valeur"><b></b><small>/20</small></span>' +
      (reussi && n.mention ? '<span class="note-mention">Mention ' + n.mention + '</span>' : '') + '</div>' +
      '<div class="note-detail">' +
        '<div><span>Examen</span><b>' + s.bons + '/' + s.total + '</b><em>75 %</em></div>' +
        '<div><span>Quiz des modules</span><b>' + n.modBons + '/' + n.modTotal + '</b><em>25 %</em></div>' +
      '</div>' +
      (reussi && n.plafond ? '<p class="note-plafond">La mention ' + n.plafond.nom.toLowerCase() + ' demande aussi ' + n.plafond.examen + '/40 à l\'examen.</p>' : '') +
      (reussi ? '' : '<p class="note-plafond">La note n\'est retenue qu\'une fois l\'examen réussi.</p>'));
    ecran.appendChild(bloc);
    compter($('.note-valeur b', bloc), n.note, 700, '', true);

    // Partager : la story pour qui a réussi, le défi pour tout le monde.
    var partage = el('div', 'partage');
    if (reussi) partage.appendChild(bouton('bouton', 'Partager en story', function () { partagerStory(this, n); }));
    partage.appendChild(bouton('bouton fantome', 'Défier un ami', function () { defier(this, n, reussi); }));
    ecran.appendChild(partage);

    // Le bilan, module par module.
    var bilan = el('div', 'bilan');
    MODULES.forEach(function (m, k) {
      var ligne = el('div', 'bilan-ligne t-' + m.teinte,
        '<span>' + deuxChiffres(k + 1) + ' · ' + echapper(m.titre) + '</span><span class="bilan-piste"><i></i></span><b>' + s.parModule[k] + '/' + PAR_MODULE + '</b>');
      bilan.appendChild(ligne);
      setTimeout(function () {
        $('.bilan-piste i', ligne).style.transform = 'scaleX(' + s.parModule[k] / PAR_MODULE + ')';
      }, 350 + k * 70);
    });
    ecran.appendChild(bilan);

    if (reussi && s.jeton) {
      ecran.appendChild(certificat());
      setTimeout(function () { eclats(ecran); }, 300);
    }

    var actions = el('div', 'fin-actions');
    if (!reussi) {
      // Les deux modules les plus faibles, à revoir en un clic.
      s.parModule.map(function (x, k) { return { n: x, k: k }; })
        .sort(function (a, b) { return a.n - b.n; }).slice(0, 2)
        .forEach(function (f) {
          actions.appendChild(bouton('bouton', 'Revoir le module ' + (f.k + 1), function () { ouvrirModule(f.k, declencheur, true); }));
        });
    }
    actions.appendChild(bouton('bouton fantome', 'Repasser l\'examen', function () { ouvrirExamen(declencheur); }));
    actions.appendChild(bouton('bouton fantome', 'Revenir au parcours', fermer));
    ecran.appendChild(actions);
    ecran.appendChild(pontApp());

    // Construit après coup : on pose les rangs et on lance le texte à la main.
    [].forEach.call(ecran.children, function (c, rang) { c.style.setProperty('--r', rang); });
    decouper(phrase, 3 * 70 + 80);
  }

  /** Le lien vers l'app : même univers, même geste. */
  function pontApp() {
    var a = el('a', 'pont-app',
      '<span class="pont-rond"><img src="images/sigle.png" alt=""></span>' +
      '<span class="pont-texte"><strong>Et maintenant, situez vos idées</strong>' +
      '<span>Dans l\'app presid, swipez des sujets et découvrez quelles personnalités pensent comme vous, preuves à l\'appui.</span></span>' +
      '<span class="pont-fleche" aria-hidden="true">→</span>');
    a.href = APP;
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  }

  /* ------------------------------------------------------------------
     les images : story à partager, certificat à télécharger
     Dessinées dans un canvas, dans la DA du site : crème, aplats ronds en
     multiply, Bricolage Grotesque. Rien ne part vers un serveur.
     ------------------------------------------------------------------ */
  var POLICE = '"Bricolage Grotesque", -apple-system, "Segoe UI", sans-serif';
  var C = {
    creme: '#FFFAF0', encre: '#1B1B2E', encre2: '#6F6A80', encre3: '#8D86A8', bord: '#E7DFCC',
    bleu: '#2B3BD6', rouge: '#FF5A3D', jaune: '#FFE066', vert: '#A6D75B', ciel: '#8ADEFF', surJaune: '#7A6317'
  };

  /* Le P de l'App Store, découpé de l'icône de l'app (images/sigle.png). */
  var sigle = null;
  function sigleCharge() {
    if (sigle) return sigle;
    sigle = new Promise(function (ok) {
      var img = new Image();
      img.onload = function () { ok(img); };
      img.onerror = function () { ok(null); };
      img.src = 'images/sigle.png';
    });
    return sigle;
  }
  function policePrete() {
    if (!document.fonts || !document.fonts.load) return sigleCharge().then(function () {});
    return Promise.all([
      sigleCharge(),
      document.fonts.load('800 100px "Bricolage Grotesque"'),
      document.fonts.load('600 40px "Bricolage Grotesque"'),
      document.fonts.load('500 40px "Bricolage Grotesque"')
    ]).catch(function () {});
  }
  function toile(l, h) {
    var c = document.createElement('canvas');
    c.width = l; c.height = h;
    return c;
  }
  function rond(x, cx, cy, r, couleur) {
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fillStyle = couleur; x.fill();
  }
  function rectArrondi(x, gx, gy, l, h, r) {
    x.beginPath();
    x.moveTo(gx + r, gy);
    x.arcTo(gx + l, gy, gx + l, gy + h, r);
    x.arcTo(gx + l, gy + h, gx, gy + h, r);
    x.arcTo(gx, gy + h, gx, gy, r);
    x.arcTo(gx, gy, gx + l, gy, r);
    x.closePath();
  }
  function texte(x, t, gx, gy, poids, taille, couleur, espace) {
    x.font = poids + ' ' + taille + 'px ' + POLICE;
    x.fillStyle = couleur;
    if ('letterSpacing' in x) x.letterSpacing = (espace || 0) + 'px';
    x.fillText(t, gx, gy);
    var larg = x.measureText(t).width;
    if ('letterSpacing' in x) x.letterSpacing = '0px';
    return larg;
  }
  /** Une pilule de texte ; renvoie sa largeur. */
  function pilule(x, t, gx, gy, taille, fond, encre, centre) {
    x.font = '700 ' + taille + 'px ' + POLICE;
    var l = x.measureText(t).width + taille * 1.3;
    var h = taille * 1.9;
    var depart = centre ? gx - l / 2 : gx;
    rectArrondi(x, depart, gy - h / 2, l, h, h / 2);
    x.fillStyle = fond; x.fill();
    x.fillStyle = encre;
    x.textBaseline = 'middle';
    x.fillText(t, depart + taille * 0.65, gy + taille * 0.04);
    x.textBaseline = 'alphabetic';
    return l;
  }
  /** Réduit la taille jusqu'à ce que le texte tienne dans la largeur. */
  function ajuster(x, t, poids, taille, largeur) {
    do { x.font = poids + ' ' + taille + 'px ' + POLICE; taille -= 4; }
    while (x.measureText(t).width > largeur && taille > 24);
    return taille + 4;
  }
  function marque(x, gx, gy, taille) {
    var l = texte(x, 'presid', gx, gy, 800, taille, C.encre, -taille * 0.04);
    texte(x, '.', gx + l, gy, 800, taille, C.rouge);
  }
  function versBlob(c) {
    return new Promise(function (ok) { c.toBlob(ok, 'image/png'); });
  }
  function telecharger(blob, nom) {
    var url = URL.createObjectURL(blob);
    var a = el('a');
    a.href = url; a.download = nom;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function confirmer(b, libelle) {
    var avant = b.textContent;
    b.textContent = libelle;
    setTimeout(function () { b.textContent = avant; }, 2200);
  }

  /** La story : 1080 × 1920, la note en très gros. */
  function imageStory(n) {
    return policePrete().then(function () {
      var c = toile(1080, 1920), x = c.getContext('2d');
      x.fillStyle = C.creme; x.fillRect(0, 0, 1080, 1920);
      x.globalCompositeOperation = 'multiply';
      rond(x, 880, 330, 330, C.jaune);
      rond(x, 150, 1560, 240, C.ciel);
      rond(x, 960, 1620, 120, C.rouge);
      rond(x, 250, 470, 80, C.vert);
      x.globalCompositeOperation = 'source-over';

      marque(x, 90, 170, 76);
      texte(x, 'CERTIFICATION', 90, 640, 700, 36, C.encre3, 6);
      texte(x, 'Citoyen éclairé', 90, 740, 800, 104, C.encre, -3);
      texte(x, 'J\'ai obtenu', 90, 880, 600, 52, C.encre2);
      var valeur = ecrireNote(n.note);
      var l = texte(x, valeur, 76, 1230, 800, 360, C.encre, -18);
      texte(x, '/20', 76 + l + 10, 1230, 800, 130, C.encre3, -4);
      if (n.mention) pilule(x, 'Mention ' + n.mention, 90, 1340, 46, C.jaune, C.encre);
      texte(x, 'Et toi, tu ferais combien ?', 90, 1560, 800, 66, C.encre, -1);
      pilule(x, 'presid.app/citoyen', 540, 1770, 44, C.bleu, C.creme, true);
      return versBlob(c);
    });
  }

  function partagerStory(b, n) {
    var nom = 'presid-citoyen-eclaire.png';
    imageStory(n).then(function (blob) {
      var fichier = null;
      try { fichier = new File([blob], nom, { type: 'image/png' }); } catch (e) {}
      if (fichier && navigator.canShare && navigator.canShare({ files: [fichier] })) {
        return navigator.share({ files: [fichier], text: 'J\'ai obtenu ' + ecrireNote(n.note) + '/20 à la certification Citoyen éclairé. Et toi ? ' + ADRESSE })
          .catch(function () {});
      }
      // Pas de partage de fichier (ordinateur) : l'image se télécharge.
      telecharger(blob, nom);
      confirmer(b, 'Image téléchargée');
    });
  }

  function defier(b, n, reussi) {
    var t = reussi
      ? 'J\'ai eu ' + ecrireNote(n.note) + '/20 à la certification Citoyen éclairé de presid. Tu fais mieux ?'
      : 'Je teste la certification Citoyen éclairé de presid : 8 modules et un examen. Tu tentes ?';
    if (navigator.share) {
      navigator.share({ title: 'Citoyen éclairé', text: t, url: ADRESSE }).catch(function () {});
      return;
    }
    var fait = function () { confirmer(b, 'Lien copié'); };
    if (navigator.clipboard) navigator.clipboard.writeText(t + ' ' + ADRESSE).then(fait, fait);
  }

  /** Le certificat : 2000 × 1414 (A4 paysage), prêt à imprimer ou à joindre. */
  function imageCertificat(cert) {
    return policePrete().then(sigleCharge).then(function (img) {
      var c = toile(2000, 1414), x = c.getContext('2d');
      x.fillStyle = C.creme; x.fillRect(0, 0, 2000, 1414);
      rectArrondi(x, 60, 60, 1880, 1294, 56);
      x.fillStyle = '#FFFFFF'; x.fill();
      x.lineWidth = 3; x.strokeStyle = C.bord; x.stroke();
      x.save();
      rectArrondi(x, 60, 60, 1880, 1294, 56); x.clip();
      x.globalCompositeOperation = 'multiply';
      rond(x, 1800, 180, 340, C.jaune);
      rond(x, 1640, 1260, 130, C.ciel);
      rond(x, 1880, 1010, 60, C.rouge);
      x.restore();

      rond(x, 270, 300, 120, C.bleu);
      rond(x, 270, 300, 80, C.jaune);
      // Le P de l'icône, centré sur le disque jaune comme sur l'App Store.
      if (img) {
        var hs = 88, ls = hs * img.width / img.height;
        x.drawImage(img, 270 - ls / 2, 300 - hs / 2, ls, hs);
      }
      texte(x, 'CERTIFICATION', 440, 270, 700, 34, C.encre3, 6);
      texte(x, 'Citoyen éclairé', 440, 360, 800, 88, C.encre, -2);

      texte(x, 'est décernée à', 200, 610, 500, 44, C.encre2);
      var taille = ajuster(x, cert.nom, 800, 150, 1560);
      texte(x, cert.nom, 196, 760, 800, taille, C.encre, -taille * 0.03);
      var ligne = 'pour avoir obtenu la note de ' + ecrireNote(cert.note) + '/20' +
        (cert.mention ? ', mention ' + cert.mention.toLowerCase() : '') + ', à l\'examen du socle.';
      texte(x, ligne, 200, 880, 500, 46, C.encre);
      texte(x, 'Le ' + dateLisible(cert.date) + '.', 200, 950, 500, 46, C.encre2);

      var comite = (D.equipe && D.equipe.comite) || [];
      if (comite.length) {
        texte(x, 'Contenus relus par ' + comite.map(function (m) { return m.nom; }).join(', ') + '.', 200, 1050, 500, 36, C.encre2);
      }
      var gx = 200;
      ['Émetteur : presid', 'Sans expiration', 'Identifiant : ' + cert.id].forEach(function (p) {
        gx += pilule(x, p, gx, 1170, 34, '#F1ECE0', C.encre) + 16;
      });
      texte(x, 'Vérifier : presid.app/verifier — identifiant ' + cert.id, 200, 1270, 500, 30, C.encre2);
      return versBlob(c);
    });
  }

  function dateLisible(iso) {
    var p = String(iso || '').split('-');
    if (p.length !== 3) return dateLongue();
    return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  var ERREURS_CERTIFICAT = {
    nom: 'Ce nom n\'est pas accepté : lettres, espaces, traits d\'union et apostrophes, de 2 à 60 signes.',
    limite: 'Trois certificats ont déjà été délivrés pour cet examen. Repassez l\'examen pour en obtenir un nouveau.',
    jeton: 'Ce résultat d\'examen n\'est plus valable. Repassez l\'examen.'
  };

  /* ------------------------------------------------------------------
     le bloc certificat de l'écran de résultat
     Le nom part UNE fois vers le serveur, qui signe et le renvoie sans le
     garder. Le certificat vit ensuite dans son lien de vérification.
     ------------------------------------------------------------------ */
  function certificat() {
    var n = s.note;
    var jeton = s.jeton;
    var bloc = el('div', 'champ-nom');
    var comite = (D.equipe && D.equipe.comite) || [];
    bloc.innerHTML =
      '<label for="nom-certificat">Votre nom, tel qu\'il apparaîtra sur le certificat</label>' +
      '<input id="nom-certificat" type="text" autocomplete="name" maxlength="60" placeholder="Prénom Nom">' +
      '<small>Envoyé une seule fois au serveur de presid pour signer le certificat, puis oublié : il n\'est stocké nulle part, sauf dans le lien du certificat que vous choisissez de partager.</small>' +
      '<div class="certificat">' +
        '<div class="certificat-haut"><div class="mini-sceau"><span><img src="images/sigle.png" alt=""></span></div>' +
        '<div>Certification<strong>Citoyen éclairé</strong></div></div>' +
        '<p class="certificat-nom vide">Votre nom</p>' +
        '<p class="certificat-ligne">a obtenu la note de <strong>' + ecrireNote(n.note) + '/20</strong>' +
          (n.mention ? ', mention <strong>' + n.mention.toLowerCase() + '</strong>' : '') + ', le ' + dateLongue() + '.</p>' +
        (comite.length ? '<p class="certificat-ligne">Contenus relus par ' + echapper(comite.map(function (m) { return m.nom; }).join(', ')) + '.</p>' : '') +
        '<p class="certificat-ligne certificat-id" hidden></p>' +
        '<div class="certificat-pied"><span>Émetteur : presid</span><span>Sans expiration</span><span>Institutions · Vote · Information</span></div>' +
      '</div>' +
      '<div class="fin-actions" data-avant>' +
        '<button type="button" class="bouton" data-obtenir>Obtenir mon certificat</button>' +
      '</div>' +
      '<div class="fin-actions" data-apres hidden>' +
        '<a class="bouton linkedin" data-linkedin target="_blank" rel="noopener">Ajouter à LinkedIn</a>' +
        '<a class="bouton fantome" data-voir target="_blank" rel="noopener">Voir la page de vérification</a>' +
        '<button type="button" class="bouton fantome" data-telecharger>Télécharger</button>' +
        '<button type="button" class="bouton fantome" data-imprimer>Imprimer ou PDF</button>' +
      '</div>' +
      '<small class="note-linkedin" data-message hidden></small>';

    var champ = $('input', bloc), nom = $('.certificat-nom', bloc);
    var avant = $('[data-avant]', bloc), apres = $('[data-apres]', bloc);
    var obtenir = $('[data-obtenir]', bloc), message = $('[data-message]', bloc);
    var cert = null;

    function dire(t) { message.textContent = t || ''; message.hidden = !t; }
    function maj() {
      var v = champ.value.trim();
      nom.textContent = v || 'Votre nom';
      nom.classList.toggle('vide', !v);
      etat.nom = v;
      ecrire();
      // Le nom a changé après délivrance : le certificat affiché n'est plus le bon.
      if (cert && v !== cert.nom) { avant.hidden = false; obtenir.textContent = 'Mettre à jour le nom'; }
      else if (cert) avant.hidden = true;
    }
    function montrer(c) {
      cert = c;
      nom.textContent = c.nom;
      var id = $('.certificat-id', bloc);
      id.innerHTML = 'Identifiant du certificat : <strong>' + echapper(c.id) + '</strong>';
      id.hidden = false;
      $('[data-linkedin]', bloc).href = lienLinkedIn(c);
      $('[data-voir]', bloc).href = c.url;
      avant.hidden = true;
      apres.hidden = false;
      dire('');
    }

    champ.value = etat.nom || '';
    champ.addEventListener('input', maj);
    maj();

    obtenir.addEventListener('click', function () {
      var v = champ.value.trim();
      if (v.length < 2) {
        champ.focus(); champ.classList.add('attention');
        setTimeout(function () { champ.classList.remove('attention'); }, 1200);
        return;
      }
      obtenir.disabled = true;
      obtenir.textContent = 'Signature en cours…';
      api('certificat', { jeton: jeton, nom: v }).then(function (c) {
        obtenir.disabled = false;
        etat.certificat = c;
        ecrire();
        montrer(c);
      }, function (err) {
        obtenir.disabled = false;
        obtenir.textContent = 'Obtenir mon certificat';
        dire(ERREURS_CERTIFICAT[err && err.erreur] || 'Le serveur ne répond pas. Réessayez dans un instant.');
      });
    });
    $('[data-telecharger]', bloc).addEventListener('click', function () {
      var b = this;
      imageCertificat(cert).then(function (blob) {
        telecharger(blob, 'certificat-citoyen-eclaire-' + cert.id + '.png');
        confirmer(b, 'Téléchargé');
      });
    });
    $('[data-imprimer]', bloc).addEventListener('click', function () {
      var zone = $('#impression');
      zone.innerHTML = '';
      zone.appendChild($('.certificat', bloc).cloneNode(true));
      window.print();
    });
    return bloc;
  }

  /**
   * Le lien « Ajouter au profil » de LinkedIn : il pré-remplit la rubrique
   * Licences et certifications — nom, émetteur, date, identifiant et URL du
   * certificat. C'est l'URL qui fait apparaître « Afficher le diplôme ».
   */
  function lienLinkedIn(cert) {
    var d = String(cert.date).split('-');
    var p = {
      startTask: 'CERTIFICATION_NAME',
      name: 'Citoyen éclairé',
      issueYear: +d[0],
      issueMonth: +d[1],
      certUrl: cert.url,
      certId: cert.id
    };
    if (LINKEDIN_ORG) p.organizationId = LINKEDIN_ORG;
    else p.organizationName = 'presid';
    return 'https://www.linkedin.com/profile/add?' + Object.keys(p).map(function (k) {
      return k + '=' + encodeURIComponent(p[k]);
    }).join('&');
  }

  /* ------------------------------------------------------------------
     lien direct : /citoyen#module-3, /citoyen#examen
     ------------------------------------------------------------------ */
  function suivreAncre() {
    var ancre = location.hash;
    var m = /^#module-(\d)$/.exec(ancre);
    if (m && MODULES[m[1] - 1]) ouvrirModule(m[1] - 1);
    else if (ancre === '#examen') ouvrirExamen();
  }
  suivreAncre();
  // replaceState ne déclenche pas cet événement : seuls un lien ou la barre
  // d'adresse le font, jamais le lecteur lui-même.
  window.addEventListener('hashchange', suivreAncre);
})();
