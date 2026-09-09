/**
 * Le deck du héros : une vraie carte, qu'on prend et qu'on jette.
 *
 * ## Pourquoi c'est manipulable
 *
 * Louis, 09/09/2026 : « est-ce que la personne peut swiper les cartes sur le
 * site ? genre dans le vide, on ne retient rien, mais elle swipe ». C'est le
 * meilleur argumentaire possible pour cette app en particulier : le geste se
 * démontre en trois secondes, et le fait que rien n'en sorte se démontre en
 * même temps. Aucun compteur, aucun stockage, aucune requête — le seul état
 * qui existe est l'ordre des huit cartes en mémoire, perdu au rechargement.
 *
 * ## Les règles du mouvement
 *
 * - Horizontal seulement au doigt. `touch-action: pan-y` laisse la page
 *   défiler normalement : un visiteur qui pose son pouce sur la carte pour
 *   faire défiler la page doit pouvoir le faire. « J'adore » et « Je déteste »
 *   passent par les boutons et les flèches du clavier, jamais par un geste
 *   vertical qui volerait le défilement.
 * - Une carte part si elle a franchi 90 px OU si elle a été lancée
 *   (0,6 px/ms) : sans le second critère, un petit coup sec rapide revient en
 *   place alors qu'il a l'air parti.
 * - La démonstration automatique alterne gauche et droite. Toujours vers la
 *   droite, elle ferait dire « Pour » à huit énoncés dont certains
 *   s'opposent — l'app n'approuve rien, la démo non plus.
 * - Elle rend la main pendant 12 s dès qu'on touche à quoi que ce soit, et se
 *   tait quand le deck sort de l'écran ou que l'onglet passe à l'arrière-plan.
 */
(function () {
  var pile = document.querySelector('.pile');
  if (!pile) return;

  var cartes = [].slice.call(pile.querySelectorAll('.sujet'));
  if (cartes.length < 3) return;

  var boutons = {};
  [].forEach.call(document.querySelectorAll('.votes [data-vote]'), function (b) {
    boutons[b.getAttribute('data-vote')] = b;
  });

  var reduit = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var SEUIL = 90;      // px parcourus au-delà desquels la carte part
  var LANCE = 0.6;     // px/ms : un coup sec compte autant qu'une longue course
  var REPOS = 12000;   // ms de silence de la démo après un geste

  var ordre = cartes.slice();
  var occupe = false;     // une carte est en cours de sortie
  var tirage = null;      // prise en main courante
  var derniere = 0;       // horodatage du dernier geste du visiteur
  var enVue = true;

  function placer() {
    ordre.forEach(function (c, i) {
      c.classList.remove('p0', 'p1', 'p2');
      if (i < 3) c.classList.add('p' + i);
      // Une seule carte est lue à voix haute : celle du dessus.
      c.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
    });
  }

  /** Marque le bouton visé pendant la prise en main (null = aucun). */
  function viser(nom) {
    Object.keys(boutons).forEach(function (cle) {
      boutons[cle].classList.toggle('vise', cle === nom);
    });
  }

  function nomDuVote(dx, dy) {
    if (dy) return dy < 0 ? 'adore' : 'deteste';
    return dx > 0 ? 'pour' : 'contre';
  }

  function sortir(dx, dy) {
    if (occupe) return;
    occupe = true;
    derniere = performance.now();

    var carte = ordre[0];
    var nom = nomDuVote(dx, dy);
    viser(nom);

    carte.classList.remove('tire');
    carte.classList.add('sort');
    carte.style.transform =
      'translate(' + (dx * 135) + '%,' + (dy * 135) + '%) rotate(' + (dx * 15) + 'deg)';
    carte.style.opacity = '0';

    setTimeout(function () {
      viser(null);
      // Remise au fond de la pile SANS transition, sinon la carte reviendrait
      // en glissant depuis l'endroit où elle est sortie.
      carte.classList.add('mute');
      carte.classList.remove('sort');
      carte.style.transform = '';
      carte.style.opacity = '';
      ordre.push(ordre.shift());
      placer();
      void carte.offsetWidth; // on force le calcul avant de rendre la transition
      carte.classList.remove('mute');
      occupe = false;
    }, reduit ? 0 : 430);
  }

  /* --- la prise en main --- */

  pile.addEventListener('pointerdown', function (e) {
    if (occupe || tirage) return;
    var carte = ordre[0];
    if (!carte.contains(e.target)) return;
    tirage = { x: e.clientX, dx: 0, vx: 0, t: performance.now(), id: e.pointerId };
    carte.setPointerCapture(e.pointerId);
    carte.classList.add('tire');
    derniere = performance.now();
  });

  pile.addEventListener('pointermove', function (e) {
    if (!tirage || e.pointerId !== tirage.id) return;
    var carte = ordre[0];
    var dx = e.clientX - tirage.x;
    var t = performance.now();
    tirage.vx = (dx - tirage.dx) / Math.max(1, t - tirage.t);
    tirage.dx = dx;
    tirage.t = t;
    var rot = Math.max(-16, Math.min(16, dx / 12));
    carte.style.transform = 'translate(' + dx + 'px,0) rotate(' + rot + 'deg)';
    viser(Math.abs(dx) > 40 ? (dx > 0 ? 'pour' : 'contre') : null);
  });

  function relacher(e) {
    if (!tirage || (e && e.pointerId !== tirage.id)) return;
    var carte = ordre[0];
    var dx = tirage.dx, vx = tirage.vx;
    tirage = null;
    derniere = performance.now();
    viser(null);

    if (Math.abs(dx) > SEUIL || Math.abs(vx) > LANCE) {
      carte.style.transform = ''; // sortir() repose la transformation complète
      sortir(dx > 0 || (dx === 0 && vx > 0) ? 1 : -1, 0);
      return;
    }
    // Sous le seuil : la carte revient à sa place.
    carte.classList.remove('tire');
    carte.style.transform = '';
  }

  pile.addEventListener('pointerup', relacher);
  pile.addEventListener('pointercancel', relacher);

  /* --- clavier et boutons : le même geste, sans doigt --- */

  var TOUCHES = {
    ArrowLeft:  [-1, 0], ArrowRight: [1, 0],
    ArrowUp:    [0, -1], ArrowDown:  [0, 1]
  };
  pile.addEventListener('keydown', function (e) {
    var d = TOUCHES[e.key];
    if (!d) return;
    e.preventDefault();
    sortir(d[0], d[1]);
  });

  var DIRECTIONS = { contre: [-1, 0], pour: [1, 0], adore: [0, -1], deteste: [0, 1] };
  Object.keys(boutons).forEach(function (cle) {
    boutons[cle].addEventListener('click', function () {
      var d = DIRECTIONS[cle];
      sortir(d[0], d[1]);
    });
  });

  /* --- la démonstration, tant que personne n'y touche --- */

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entrees) {
      enVue = entrees[0].isIntersecting;
    }, { threshold: 0.3 }).observe(pile);
  }

  var sens = 1;
  setInterval(function () {
    if (reduit || document.hidden || !enVue || occupe || tirage) return;
    if (performance.now() - derniere < REPOS) return;
    sortir(sens, 0);
    sens = -sens; // ni tout « Pour », ni tout « Contre »
  }, 4000);

  placer();
})();
