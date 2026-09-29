/**
 * presid.app/verifier#<certificat> — la page vers laquelle pointe le bouton
 * « Afficher le diplôme » de LinkedIn.
 *
 * Le certificat est dans l'adresse, après le « # » : un navigateur n'envoie
 * jamais cette partie au serveur, donc le nom de la personne ne finit dans
 * aucun journal d'accès. La page le transmet dans le corps d'une requête au
 * Worker, qui vérifie la signature et renvoie ce qu'elle garantit.
 */
(function () {
  var verdict = document.getElementById('verdict');
  var zone = document.getElementById('resultat');

  function echapper(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function date(iso) {
    var p = String(iso).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function note(n) { return Number(n).toLocaleString('fr-FR'); }

  // Même lien que sur la page de la certification (citoyen.js) : la page
  // entreprise Presid (linkedin.com/company/presidapp) comme émetteur.
  var LINKEDIN_ORG = '143659983';
  function lienLinkedIn(d) {
    var j = String(d.date).split('-');
    var p = {
      startTask: 'CERTIFICATION_NAME',
      name: 'Citoyen éclairé',
      organizationId: LINKEDIN_ORG,
      issueYear: +j[0],
      issueMonth: +j[1],
      certUrl: 'https://presid.app/verifier#' + c,
      certId: d.id
    };
    return 'https://www.linkedin.com/profile/add?' + Object.keys(p).map(function (k) {
      return k + '=' + encodeURIComponent(p[k]);
    }).join('&');
  }

  function invalide(texte) {
    verdict.className = 'verdict invalide';
    verdict.innerHTML = '<span class="verdict-rond" aria-hidden="true">✕</span>' +
      '<div><strong>Certificat non reconnu</strong><p>' + texte + '</p></div>';
    zone.innerHTML = '<p class="chapo">Un certificat Citoyen éclairé authentique s\'ouvre depuis le lien complet que son titulaire a partagé. ' +
      'En cas de doute, écrivez à <a href="mailto:louis.coudiere@presid.app">louis.coudiere@presid.app</a>.</p>';
  }

  // Changer ce qui suit le « # » ne recharge pas la page : on le fait, sinon
  // elle continuerait d'afficher le certificat précédent.
  window.addEventListener('hashchange', function () { location.reload(); });

  var c = decodeURIComponent(location.hash.slice(1));
  if (!c) {
    invalide('Cette adresse ne contient aucun certificat.');
    return;
  }

  fetch('/api/verifier', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ c: c })
  }).then(function (r) { return r.json(); }).then(function (d) {
    if (!d.valide) {
      invalide('Ce lien a été modifié, ou il n\'a pas été délivré par presid.');
      return;
    }
    document.title = 'Certificat de ' + d.nom + ' — presid';
    verdict.className = 'verdict valide';
    verdict.innerHTML = '<span class="verdict-rond" aria-hidden="true">✓</span>' +
      '<div><strong>Certificat authentique</strong><p>Délivré et signé par presid. Son contenu n\'a pas été modifié.</p></div>';
    zone.innerHTML =
      '<div class="certificat">' +
        '<div class="certificat-haut"><div class="mini-sceau"><span><img src="images/sigle.png" alt=""></span></div>' +
        '<div>Certification<strong>Citoyen éclairé</strong></div></div>' +
        '<p class="certificat-nom">' + echapper(d.nom) + '</p>' +
        '<p class="certificat-ligne">a obtenu la note de <strong>' + note(d.note) + '/20</strong>' +
          (d.mention ? ', mention <strong>' + echapper(d.mention.toLowerCase()) + '</strong>' : '') +
          ', le ' + date(d.date) + '.</p>' +
        '<p class="certificat-ligne certificat-id">Identifiant du certificat : <strong>' + echapper(d.id) + '</strong></p>' +
        '<div class="certificat-pied"><span>Émetteur : presid</span><span>Sans expiration</span><span>Examen : ' + d.examen + '/40</span></div>' +
      '</div>' +
      '<h2>Ce que ce certificat atteste</h2>' +
      '<ul class="liste">' +
        '<li><strong>Les institutions.</strong> Le fonctionnement des institutions françaises et européennes.</li>' +
        '<li><strong>Qui décide quoi.</strong> La répartition des pouvoirs entre l\'État, le Parlement, l\'Union européenne et les collectivités.</li>' +
        '<li><strong>Le vote.</strong> Le déroulement des élections et les droits de l\'électeur.</li>' +
        '<li><strong>L\'information.</strong> Distinguer un fait d\'une opinion, vérifier une source, repérer une manipulation.</li>' +
      '</ul>' +
      '<p class="chapo">Huit modules et un examen de 40 questions tirées au hasard, corrigé par le serveur de presid : ' +
        '30 bonnes réponses au moins pour être certifié. Aucune question ne porte sur une opinion.</p>' +
      '<div class="pour-titulaire">' +
        '<div><strong>C\'est votre certificat ?</strong>' +
        '<p>Un clic, et LinkedIn ouvre la rubrique « Licences et certifications » de votre profil, déjà remplie : ' +
        'nom, émetteur, date, identifiant et lien de vérification. Il ne reste qu\'à enregistrer.</p></div>' +
        '<a class="bouton linkedin" target="_blank" rel="noopener" href="' + echapper(lienLinkedIn(d)) + '">Ajouter à mon profil LinkedIn</a>' +
      '</div>' +
      '<div class="actions"><a class="bouton fantome" href="citoyen.html">Passer la certification</a></div>';
  }).catch(function () {
    invalide('Le serveur de vérification ne répond pas. Réessayez dans un instant.');
  });
})();
