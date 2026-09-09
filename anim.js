/**
 * La rivière du site, et le comptage des chiffres.
 *
 * Deux règles qui viennent de l'app et qu'on ne rediscute pas ici :
 * le dépli fait 280 ms avec 70 ms par rang (PAS_CASCADE), et il ne rebondit
 * jamais. Le reste est de la plomberie : poser le rang de chaque élément,
 * puis déclencher la coulée quand la section entre dans l'écran.
 *
 * Le HTML reste lisible sans JavaScript : c'est `anime`, posé dans le <head>,
 * qui masque les éléments, et ce même script d'amorce les redonne au bout de
 * 1,5 s si ce fichier n'a jamais tourné.
 */
(function () {
  var PAS = 70; // ms, comme PAS_CASCADE dans src/components/CarteSection.tsx
  var CONTENEURS = '.grille, .chiffres, .contacts, .liste';
  var reduit = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var rivieres = [].slice.call(document.querySelectorAll('.riviere'));

  /* Le rang court d'un bout à l'autre de la section : le titre, puis le
     chapô, puis les cartes une à une — un seul mouvement, pas un par bloc. */
  rivieres.forEach(function (riviere) {
    var rang = 0;
    [].forEach.call(riviere.children, function (enfant) {
      // Le décor de fond ne prend pas de rang : il est là avant la rivière.
      if (enfant.classList.contains('confettis')) return;
      if (enfant.matches(CONTENEURS)) {
        [].forEach.call(enfant.children, function (carte) {
          carte.style.setProperty('--rang', rang++);
        });
      } else {
        enfant.style.setProperty('--rang', rang++);
      }
    });
  });

  /** Compte de 0 jusqu'à la valeur écrite dans le HTML. */
  function compter(el) {
    var cible = parseInt(el.getAttribute('data-compte'), 10);
    if (isNaN(cible)) return;
    if (reduit) { el.textContent = cible; return; }

    var duree = 900;
    var depart = null;
    el.textContent = '0';

    function pas(horodatage) {
      if (depart === null) depart = horodatage;
      var t = Math.min((horodatage - depart) / duree, 1);
      // Même courbe que le dépli : décélérée, sans dépassement.
      var p = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(cible * p);
      if (t < 1) requestAnimationFrame(pas);
      else el.textContent = cible;
    }
    requestAnimationFrame(pas);
  }

  function couler(riviere) {
    riviere.classList.add('coule');
    [].forEach.call(riviere.querySelectorAll('[data-compte]'), compter);
  }

  if (!('IntersectionObserver' in window)) {
    rivieres.forEach(couler);
    return;
  }

  var observateur = new IntersectionObserver(function (entrees) {
    entrees.forEach(function (entree) {
      if (!entree.isIntersecting) return;
      couler(entree.target);
      observateur.unobserve(entree.target); // une rivière ne coule qu'une fois
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });

  rivieres.forEach(function (riviere) { observateur.observe(riviere); });
})();
