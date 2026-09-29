/**
 * Le contenu de la certification « Citoyen éclairé » — le socle.
 *
 * VERSION DE TRAVAIL, À RELIRE PAR LE COMITÉ AVANT TOUTE MISE EN LIGNE.
 * Même règle que pour les positions de l'app : rien sans source. Les
 * articles de la Constitution cités ici ont été relus le 28/09/2026 sur le
 * texte intégral publié par le Conseil constitutionnel (lien dans `sources`).
 * Ce qui ne vient pas de la Constitution est listé dans README.md, rubrique
 * « Citoyen éclairé — à revérifier ».
 *
 * ## Format
 *
 * `**mot**` met un mot en valeur (surlignage jaune posé au pinceau).
 * Écrans d'un module :
 *   cours   { sur, titre, texte, faits?: [{ v, l }] }
 *   mots    { sur, titre, texte?, mots: [{ m, d }] }
 *   duo     { sur, titre, a: { t, d }, b: { t, d } }
 *   vf      { q, r: true|false, e }
 *   qcm     { q, c: [bonne, fausse, fausse, fausse], e }   ← la BONNE
 *           réponse est toujours la première ; l'ordre est mélangé à
 *           l'affichage. Quatre choix partout : à trois, on devine trop.
 *   ordre   { q, items: [dans le bon ordre], e }
 *   piege   { mythe, verite }
 * La banque de l'examen final n'est PLUS ici : elle vit dans
 * worker/banque.js, côté serveur, pour que les réponses ne soient pas
 * lisibles dans le navigateur. Ses questions ne reprennent jamais celles des
 * modules — l'examen ne doit pas se réussir de mémoire.
 * Règle de rythme : jamais plus de deux écrans de cours d'affilée.
 */
window.CITOYEN = {
  /* Qui écrit, qui relit. Le comité est vide tant qu'il n'est pas constitué :
     la page le dit plutôt que d'afficher des noms qui n'ont rien validé. */
  equipe: {
    redaction: 'Louis Coudière, éditeur de presid',
    comite: []   // { nom, titre } — s'affichent sur la page et le certificat
  },

  /* Le lexique : chaque terme devient cliquable la première fois qu'il
     apparaît dans un écran. `re` doit attraper les formes fléchies. */
  glossaire: [
    { terme: 'Suffrages exprimés', re: 'suffrages? exprimés', d: 'Les bulletins valables pour un candidat ou une réponse. Les votes blancs et nuls n\'en font pas partie.' },
    { terme: 'Majorité absolue', re: 'majorité absolue', d: 'Plus de la moitié des voix prises en compte : 50 % plus une voix au moins.' },
    { terme: 'Promulguer', re: 'promulgu\\w*', d: 'Signer une loi définitivement adoptée pour la rendre applicable. C\'est le rôle du Président.' },
    { terme: 'Contreseing', re: 'contresign\\w*|contreseing', d: 'La signature d\'un ministre ou du Premier ministre ajoutée à celle du Président. Elle engage leur responsabilité.' },
    { terme: 'Navette', re: 'navette', d: 'Les allers-retours d\'un texte entre l\'Assemblée et le Sénat, jusqu\'à ce qu\'ils votent la même version.' },
    { terme: 'Amendement', re: 'amendements?', d: 'Une modification d\'un texte de loi, proposée et votée pendant son examen.' },
    { terme: 'Motion de censure', re: 'motions? de censure', d: 'Un vote des députés qui, s\'il est adopté, oblige le Gouvernement à démissionner.' },
    { terme: 'Commission mixte paritaire', re: 'commission mixte paritaire', d: 'Sept députés et sept sénateurs réunis pour trouver un compromis quand les deux chambres ne s\'accordent pas.' },
    { terme: 'Ordonnance', re: 'ordonnances?', d: 'Un texte pris par le Gouvernement dans le domaine de la loi, avec l\'autorisation du Parlement ou de la Constitution.' },
    { terme: 'Suffrage indirect', re: 'suffrage indirect', d: 'Une élection où les citoyens ne votent pas eux-mêmes : ce sont des élus qui votent, comme pour les sénateurs.' },
    { terme: 'Grands électeurs', re: 'grands électeurs', d: 'Les élus (surtout locaux) qui élisent les sénateurs.' },
    { terme: 'Inamovible', re: 'inamovibles?', d: 'Qu\'on ne peut pas déplacer ni révoquer sans son accord, sauf procédure disciplinaire.' },
    { terme: 'Contrôle de légalité', re: 'contrôle de légalité', d: 'La vérification par le préfet que les décisions des collectivités respectent la loi.' },
    { terme: 'Transposer', re: 'transpos\\w*', d: 'Traduire une directive européenne dans la loi nationale, dans un délai fixé.' },
    { terme: 'Majorité qualifiée', re: 'majorité qualifiée', d: 'Au Conseil de l\'UE : 55 % des États représentant au moins 65 % de la population européenne.' },
    { terme: 'Souveraineté', re: 'souveraineté', d: 'Le pouvoir suprême de décider. En France, il appartient au peuple (article 3).' },
    { terme: 'Préambule', re: 'préambule', d: 'Le texte d\'introduction d\'une Constitution, qui énonce ses principes et renvoie à d\'autres textes.' },
    { terme: 'Marge d\'erreur', re: 'marges? d\'erreur', d: 'L\'écart possible entre le résultat d\'un sondage et la réalité, dû au fait qu\'on n\'interroge qu\'un échantillon.' }
  ],

  modules: [
    /* ------------------------------------------------------------------ */
    {
      id: 'fondements',
      titre: 'Les fondements de la République',
      court: 'Sur quels textes et quels principes tout repose.',
      teinte: 'rouge',
      objectif: 'Savoir d\'où vient l\'autorité de la République : ses textes, ses principes, ses symboles.',
      ecrans: [
        { t: 'cours', sur: 'Le texte', titre: 'Une Constitution depuis 1958',
          texte: 'La Ve République repose sur la **Constitution du 4 octobre 1958**, approuvée par référendum. Elle dit qui détient le pouvoir, comment il s\'exerce et comment on le contrôle. Elle a été révisée **plus de vingt fois** depuis.',
          faits: [{ v: '1958', l: 'adoptée par référendum' }, { v: '89', l: 'l\'article qui permet de la réviser' }] },
        { t: 'cours', sur: 'Le bloc de constitutionnalité', titre: 'Elle ne travaille pas seule',
          texte: 'Son préambule renvoie à trois autres textes : la **Déclaration des droits de l\'homme et du citoyen de 1789**, le **préambule de 1946** (droit de grève, droit syndical, protection de la santé) et la **Charte de l\'environnement de 2004**. Ensemble, ils ont la même force que la Constitution.' },
        { t: 'qcm', q: 'Lequel de ces textes a la même force que la Constitution ?',
          c: ['Le préambule de 1946', 'Le Code civil de 1804', 'La loi de 1905', 'Le traité de Rome'],
          e: 'Le préambule de 1946 garantit notamment le droit de grève et le droit syndical. Le Code civil et la loi de 1905 sont des lois ordinaires, qu\'une autre loi peut modifier.' },
        { t: 'mots', sur: 'Article premier', titre: 'Quatre mots qui tiennent tout',
          texte: '« La France est une République indivisible, laïque, démocratique et sociale. »',
          mots: [
            { m: 'Indivisible', d: 'Une seule loi et un seul peuple sur tout le territoire.' },
            { m: 'Laïque', d: 'L\'État ne dépend d\'aucune religion et respecte toutes les croyances.' },
            { m: 'Démocratique', d: 'La souveraineté appartient au peuple, qui l\'exerce par ses représentants et par le référendum.' },
            { m: 'Sociale', d: 'La République organise une solidarité : protection sociale, santé, éducation.' }
          ] },
        { t: 'vf', q: 'La devise « Liberté, Égalité, Fraternité » est inscrite dans la Constitution.', r: true,
          e: 'Article 2, avec la langue (le français), l\'emblème (le drapeau tricolore) et l\'hymne (La Marseillaise).' },
        { t: 'cours', sur: 'La laïcité', titre: 'Ce que dit vraiment la loi de 1905',
          texte: 'La loi de **1905** sépare les Églises et l\'État : la République garantit la **liberté de conscience** et ne reconnaît, ne salarie ni ne subventionne aucun culte (l\'Alsace-Moselle garde un régime particulier). La **neutralité** s\'impose à l\'État et à ses agents. Les citoyens, eux, restent libres de croire et de le montrer, dans les limites fixées par la loi.' },
        { t: 'qcm', q: 'Qui est tenu à la neutralité religieuse ?',
          c: ['L\'agent de mairie au guichet', 'L\'usager venu chercher un document', 'Le passant dans la rue', 'L\'étudiant à la bibliothèque universitaire'],
          e: 'La neutralité s\'impose au service public et à ceux qui le font fonctionner, pas aux personnes qui s\'y adressent.' },
        { t: 'cours', sur: 'Article 89', titre: 'Changer la Constitution',
          texte: 'Une révision doit être votée **dans les mêmes termes** par l\'Assemblée nationale et le Sénat, puis approuvée par **référendum** — ou, si elle vient du Président, par le Parlement réuni en **Congrès**, à la majorité des **trois cinquièmes**. Une seule chose ne peut jamais être révisée : **la forme républicaine** du gouvernement.' },
        { t: 'vf', q: 'On pourrait réviser la Constitution pour rétablir une monarchie.', r: false,
          e: 'Le dernier alinéa de l\'article 89 l\'interdit : la forme républicaine du gouvernement ne peut faire l\'objet d\'une révision.' },
        { t: 'vf', q: 'Selon l\'article 2, la langue de la République est le français.', r: true,
          e: 'C\'est le tout premier alinéa de l\'article 2, ajouté en 1992.' },
        { t: 'piege', mythe: 'La laïcité interdit les signes religieux partout.',
          verite: 'Non. La neutralité vise l\'**État et ses agents**. Les usagers sont libres, sauf exceptions prévues par la loi : les **élèves** des écoles, collèges et lycées publics depuis 2004, et la **dissimulation du visage** dans l\'espace public depuis 2010.' }
      ],
      sources: [
        { titre: 'Texte intégral de la Constitution (Conseil constitutionnel)', url: 'https://www.conseil-constitutionnel.fr/le-bloc-de-constitutionnalite/texte-integral-de-la-constitution-du-4-octobre-1958-en-vigueur' }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'executif',
      titre: 'Le pouvoir exécutif',
      court: 'Le Président, le Gouvernement, et qui décide quoi.',
      teinte: 'bleu',
      objectif: 'Distinguer ce que fait le Président de ce que fait le Gouvernement.',
      ecrans: [
        { t: 'cours', sur: 'Un exécutif à deux têtes', titre: 'Président et Gouvernement',
          texte: 'Le pouvoir exécutif a **deux têtes** : le **Président de la République**, élu par les Français, et le **Gouvernement**, dirigé par le Premier ministre. Les juristes parlent d\'exécutif bicéphale.' },
        { t: 'cours', sur: 'Le Président', titre: 'Élu directement, pour cinq ans',
          texte: 'Il est élu au **suffrage universel direct** depuis la réforme de **1962**, pour **cinq ans** depuis le référendum de **2000**. Depuis **2008**, nul ne peut faire plus de **deux mandats consécutifs**.',
          faits: [{ v: '5', l: 'ans de mandat' }, { v: '2', l: 'mandats consécutifs au plus' }, { v: '500', l: 'parrainages d\'élus pour être candidat' }] },
        { t: 'qcm', q: 'Combien de parrainages d\'élus faut-il pour être candidat à la présidentielle ?',
          c: ['500', '100', '1 000', '10 000'],
          e: 'Des signatures de maires, de parlementaires ou d\'autres élus, venant d\'au moins 30 départements ou collectivités d\'outre-mer.' },
        { t: 'cours', sur: 'Article 7', titre: 'Deux tours, quatorze jours',
          texte: 'Il faut la **majorité absolue des suffrages exprimés**. Si personne ne l\'obtient au premier tour, un **second tour** a lieu **quatorze jours** plus tard entre les deux candidats arrivés en tête.' },
        { t: 'vf', q: 'Un candidat qui obtient 50,1 % des suffrages exprimés au premier tour est élu sans second tour.', r: true,
          e: 'La majorité absolue au premier tour suffit (article 7). Ce n\'est encore jamais arrivé sous la Ve République.' },
        { t: 'mots', sur: 'Article 19', titre: 'Ce qu\'il signe seul',
          texte: 'La plupart des actes du Président doivent être contresignés par le Premier ministre. Quelques-uns, non :',
          mots: [
            { m: 'Nommer le Premier ministre', d: 'Article 8. Il choisit, mais l\'Assemblée peut ensuite renverser le Gouvernement.' },
            { m: 'Dissoudre l\'Assemblée', d: 'Article 12. Après avoir consulté, sans avoir à suivre leur avis, le Premier ministre et les présidents des assemblées.' },
            { m: 'Soumettre un texte au référendum', d: 'Article 11. Sur proposition du Gouvernement ou des deux assemblées.' },
            { m: 'Les pouvoirs exceptionnels', d: 'Article 16. En cas de menace grave et immédiate sur les institutions.' },
            { m: 'Saisir le Conseil constitutionnel', d: 'Article 61. Et y nommer trois membres (article 56).' }
          ] },
        { t: 'vf', q: 'Le Président peut dissoudre l\'Assemblée nationale deux fois dans la même année.', r: false,
          e: 'Article 12 : il ne peut y avoir de nouvelle dissolution dans l\'année qui suit les élections.' },
        { t: 'cours', sur: 'Article 20', titre: 'Le Gouvernement gouverne',
          texte: 'Le Gouvernement « **détermine et conduit la politique de la nation** ». Il dispose de l\'administration et de la force armée. Le Premier ministre dirige son action et assure l\'exécution des lois. Surtout, le Gouvernement est **responsable devant l\'Assemblée**, qui peut le renverser.' },
        { t: 'qcm', q: 'Qui peut renverser le Gouvernement ?',
          c: ['L\'Assemblée nationale', 'Le Sénat', 'Le Conseil constitutionnel', 'Le Conseil d\'État'],
          e: 'Par une motion de censure (article 49). Le Sénat, lui, ne le peut pas : c\'est la grande différence entre les deux chambres.' },
        { t: 'cours', sur: 'La cohabitation', titre: 'Quand les deux têtes s\'opposent',
          texte: 'Si la majorité de l\'Assemblée n\'est pas du camp du Président, celui-ci doit nommer un Premier ministre qu\'elle accepte. Le centre du pouvoir bascule alors vers Matignon. C\'est arrivé trois fois : **1986-1988**, **1993-1995** et **1997-2002**.' },
        { t: 'qcm', q: 'Qui est « chef des armées » selon la Constitution ?',
          c: ['Le Président de la République', 'Le Premier ministre', 'Le ministre des Armées', 'Le chef d\'état-major des armées'],
          e: 'Article 15. Le Premier ministre, lui, est responsable de la défense nationale (article 21) : les deux se partagent le domaine.' },
        { t: 'piege', mythe: 'Le Président fait les lois.',
          verite: 'Non. Il les **promulgue** dans les quinze jours et peut demander une nouvelle délibération, mais c\'est le **Parlement qui vote la loi** (articles 10 et 24). Le « domaine réservé » en diplomatie et en défense est une pratique politique, pas un article de la Constitution.' }
      ],
      sources: [
        { titre: 'Constitution, articles 5 à 23', url: 'https://www.conseil-constitutionnel.fr/le-bloc-de-constitutionnalite/texte-integral-de-la-constitution-du-4-octobre-1958-en-vigueur' },
        { titre: 'Élections (Service-public.fr)', url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/N47' }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'parlement',
      titre: 'Le Parlement et la loi',
      court: 'Comment un texte devient une loi, et le 49.3.',
      teinte: 'jaune',
      objectif: 'Suivre un texte de son dépôt à sa publication, et comprendre le contrôle du Gouvernement.',
      ecrans: [
        { t: 'cours', sur: 'Article 24', titre: 'Voter, contrôler, évaluer',
          texte: 'Le Parlement **vote la loi**, **contrôle l\'action du Gouvernement** et **évalue les politiques publiques**. Il a deux chambres, qui ne sont ni élues de la même façon ni aussi puissantes l\'une que l\'autre.',
          faits: [{ v: '577', l: 'députés' }, { v: '348', l: 'sénateurs' }] },
        { t: 'duo', sur: 'Deux chambres', titre: 'Assemblée ou Sénat ?',
          a: { t: 'Assemblée nationale', d: 'Élue au suffrage direct pour 5 ans. Elle peut renverser le Gouvernement et, en cas de désaccord, elle a le dernier mot.' },
          b: { t: 'Sénat', d: 'Élu au suffrage indirect, par des élus surtout locaux, pour 6 ans et renouvelé par moitié. Il représente les collectivités territoriales.' } },
        { t: 'vf', q: 'Le Sénat peut renverser le Gouvernement par une motion de censure.', r: false,
          e: 'Seule l\'Assemblée nationale le peut (article 49). C\'est aussi elle qui a le dernier mot sur la loi.' },
        { t: 'cours', sur: 'Le point de départ', titre: 'Projet ou proposition ?',
          texte: 'Un texte qui vient du Gouvernement est un **projet de loi**. S\'il vient d\'un député ou d\'un sénateur, c\'est une **proposition de loi**. Dans les deux cas, il est d\'abord examiné en **commission**, puis débattu en **séance publique**, où l\'on vote les amendements puis le texte.' },
        { t: 'ordre', q: 'Remettez le parcours d\'une loi dans l\'ordre.',
          items: ['Dépôt du texte', 'Examen en commission', 'Débat et vote en séance', 'Navette entre les deux chambres', 'Promulgation par le Président', 'Publication au Journal officiel'],
          e: 'Entre le vote définitif et la promulgation, le Conseil constitutionnel peut être saisi : la promulgation attend alors sa décision.' },
        { t: 'cours', sur: 'Article 45', titre: 'Quand les chambres ne s\'entendent pas',
          texte: 'Le texte fait la **navette** jusqu\'à être voté dans les mêmes termes. En cas de blocage, une **commission mixte paritaire** — sept députés, sept sénateurs — cherche un compromis. Si elle échoue, le Gouvernement peut demander à l\'**Assemblée nationale de statuer définitivement**.' },
        { t: 'cours', sur: 'Article 47', titre: 'Le budget, chaque automne',
          texte: 'Le Parlement vote la **loi de finances** — recettes et dépenses de l\'État — et la **loi de financement de la sécurité sociale**. Les délais sont serrés : sans décision au bout de **70 jours**, le Gouvernement peut appliquer son projet de loi de finances par ordonnance.' },
        { t: 'qcm', q: 'Que fixe la « loi de finances » ?',
          c: ['Les recettes et les dépenses de l\'État', 'Les règles des banques', 'Le salaire des ministres', 'Le fonctionnement de la Bourse'],
          e: 'Elle est votée chaque automne pour l\'année suivante. La sécurité sociale a sa propre loi de financement.' },
        { t: 'cours', sur: 'Article 49, alinéa 3', titre: 'Le 49.3, sans détour',
          texte: 'Le Premier ministre engage la responsabilité du Gouvernement sur un texte, qui est alors **adopté sans vote** — sauf si une **motion de censure**, déposée dans les **24 heures**, recueille la **majorité des députés**. C\'est possible sans limite pour les budgets, et **une fois par session** pour un autre texte.' },
        { t: 'qcm', q: 'Combien de voix faut-il pour adopter une motion de censure ?',
          c: ['La majorité des membres de l\'Assemblée : 289 si tous les sièges sont pourvus', 'La majorité des députés présents', 'Les trois cinquièmes des députés', 'Les deux tiers des députés'],
          e: 'Seuls les votes favorables à la censure sont comptés : s\'abstenir revient, de fait, à laisser vivre le Gouvernement.' },
        { t: 'vf', q: 'Un gouvernement a déjà été renversé par une motion de censure sous la Ve République.', r: true,
          e: 'C\'est arrivé en 1962 (gouvernement Pompidou) et en décembre 2024 (gouvernement Barnier).' },
        { t: 'piege', mythe: 'Le 49.3 permet de se passer du Parlement.',
          verite: 'Pas vraiment. Le texte passe sans vote, mais les députés peuvent répondre par une **motion de censure** et **renverser le Gouvernement**. Le 49.3 est un pari : le Gouvernement met sa propre existence en jeu.' }
      ],
      sources: [
        { titre: 'Constitution, articles 24 à 51-2', url: 'https://www.conseil-constitutionnel.fr/le-bloc-de-constitutionnalite/texte-integral-de-la-constitution-du-4-octobre-1958-en-vigueur' },
        { titre: 'Assemblée nationale', url: 'https://www.assemblee-nationale.fr/' },
        { titre: 'Sénat', url: 'https://www.senat.fr/' }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'justice',
      titre: 'La justice et le contrôle',
      court: 'Qui juge, et qui contrôle ceux qui décident.',
      teinte: 'sable',
      objectif: 'Savoir quel juge saisir, et qui contrôle les lois et l\'argent public.',
      ecrans: [
        { t: 'duo', sur: 'Deux ordres de juridiction', titre: 'La justice coupée en deux',
          a: { t: 'Ordre judiciaire', d: 'Les litiges entre personnes et les infractions. Au sommet : la Cour de cassation.' },
          b: { t: 'Ordre administratif', d: 'Les litiges avec l\'administration. Au sommet : le Conseil d\'État.' } },
        { t: 'qcm', q: 'Votre mairie refuse votre permis de construire. Vers quel juge vous tourner ?',
          c: ['Le tribunal administratif', 'Le tribunal judiciaire', 'Le Conseil constitutionnel', 'La Cour des comptes'],
          e: 'C\'est une décision de l\'administration : elle se conteste devant le juge administratif.' },
        { t: 'cours', sur: 'Article 64', titre: 'Des juges qu\'on ne déplace pas',
          texte: 'Le Président est **garant de l\'indépendance de l\'autorité judiciaire**, assisté du **Conseil supérieur de la magistrature**, qui intervient dans la nomination et la discipline des magistrats. Les juges du siège sont **inamovibles** : on ne peut pas les muter pour une décision qui dérange.' },
        { t: 'qcm', q: 'Selon la Constitution, qui est garant de l\'indépendance de l\'autorité judiciaire ?',
          c: ['Le Président de la République', 'Le ministre de la Justice', 'Le Premier ministre', 'Le Parlement'],
          e: 'Article 64. Il est assisté par le Conseil supérieur de la magistrature.' },
        { t: 'cours', sur: 'Article 56', titre: 'Le Conseil constitutionnel',
          texte: 'Il vérifie que les lois respectent la Constitution. **Neuf membres** nommés pour **neuf ans**, sans renouvellement : trois par le Président de la République, trois par le président de l\'Assemblée, trois par le président du Sénat. Les anciens Présidents en sont membres de droit.',
          faits: [{ v: '9', l: 'membres' }, { v: '9', l: 'ans, non renouvelables' }, { v: '3', l: 'ans entre deux renouvellements' }] },
        { t: 'qcm', q: 'Combien de membres nommés siègent au Conseil constitutionnel ?',
          c: ['9', '12', '15', '577'],
          e: 'Neuf membres nommés, auxquels s\'ajoutent de droit les anciens Présidents de la République.' },
        { t: 'duo', sur: 'Deux portes d\'entrée', titre: 'Avant ou après la loi',
          a: { t: 'Avant : article 61', d: 'Avant la promulgation, le Président, le Premier ministre, les présidents des assemblées, ou 60 députés ou 60 sénateurs peuvent lui soumettre une loi.' },
          b: { t: 'Après : la QPC', d: 'Depuis 2010, lors d\'un procès, chacun peut contester une loi déjà en vigueur. Le Conseil d\'État ou la Cour de cassation filtre, le Conseil constitutionnel tranche.' } },
        { t: 'vf', q: 'Un simple citoyen peut obtenir l\'abrogation d\'une loi déjà en vigueur.', r: true,
          e: 'Par une question prioritaire de constitutionnalité (QPC), soulevée à l\'occasion d\'un procès.' },
        { t: 'mots', sur: 'Les gardiens', titre: 'Ceux qui contrôlent en dehors des tribunaux',
          mots: [
            { m: 'Défenseur des droits', d: 'Discriminations, droits des enfants, litiges avec les services publics. Saisine gratuite.' },
            { m: 'Cour des comptes', d: 'Contrôle l\'usage de l\'argent public et assiste le Parlement et le Gouvernement.' },
            { m: 'CNIL', d: 'Protège les données personnelles.' },
            { m: 'Arcom', d: 'Régule l\'audiovisuel et le numérique, veille au pluralisme.' }
          ] },
        { t: 'qcm', q: 'Vous pensez avoir été discriminé à l\'embauche. Qui pouvez-vous saisir gratuitement ?',
          c: ['Le Défenseur des droits', 'La Cour des comptes', 'L\'Arcom', 'Le Conseil constitutionnel'],
          e: 'La lutte contre les discriminations fait partie de ses missions, et le saisir ne coûte rien.' },
        { t: 'piege', mythe: 'Le Conseil constitutionnel juge si une loi est bonne.',
          verite: 'Non. Il vérifie seulement qu\'elle est **conforme à la Constitution**. Une loi peut être coûteuse, maladroite ou impopulaire et parfaitement constitutionnelle. Juger si elle est bonne, c\'est le rôle du débat politique et du vote.' }
      ],
      sources: [
        { titre: 'Constitution, articles 56 à 71-1', url: 'https://www.conseil-constitutionnel.fr/le-bloc-de-constitutionnalite/texte-integral-de-la-constitution-du-4-octobre-1958-en-vigueur' },
        { titre: 'La QPC (Conseil constitutionnel)', url: 'https://www.conseil-constitutionnel.fr/decisions/la-qpc' }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'territoires',
      titre: 'Les collectivités territoriales',
      court: 'Commune, département, région : qui s\'occupe de quoi.',
      teinte: 'vert',
      objectif: 'Savoir à quel échelon s\'adresser pour ce qui compte au quotidien.',
      ecrans: [
        { t: 'cours', sur: 'Une République décentralisée', titre: 'Des conseils élus, partout',
          texte: 'L\'organisation de la France est **décentralisée** (article 1er). Communes, départements et régions **s\'administrent librement** par des **conseils élus**. Et aucune collectivité n\'exerce de **tutelle** sur une autre (article 72).',
          faits: [{ v: '35000', l: 'communes, environ' }, { v: '101', l: 'départements' }, { v: '18', l: 'régions, outre-mer compris' }] },
        { t: 'mots', sur: 'Qui fait quoi', titre: 'Chaque échelon a ses missions',
          mots: [
            { m: 'Commune', d: 'État civil, écoles maternelles et élémentaires, urbanisme local.' },
            { m: 'Intercommunalité', d: 'Collecte des déchets, développement économique local, souvent les transports.' },
            { m: 'Département', d: 'Action sociale (RSA, aide sociale à l\'enfance, autonomie), collèges, routes départementales.' },
            { m: 'Région', d: 'Lycées, trains régionaux, développement économique, formation professionnelle.' }
          ] },
        { t: 'qcm', q: 'Qui entretient les bâtiments de votre collège ?',
          c: ['Le département', 'La région', 'La commune', 'L\'État'],
          e: 'Collèges au département, lycées à la région, écoles à la commune.' },
        { t: 'qcm', q: 'Qui organise les trains régionaux ?',
          c: ['La région', 'L\'État', 'Le département', 'La SNCF, seule'],
          e: 'La région est l\'autorité organisatrice des transports ferroviaires régionaux : elle décide de l\'offre et la finance, puis confie l\'exploitation à une entreprise.' },
        { t: 'cours', sur: 'L\'intercommunalité', titre: 'Des communes qui se regroupent',
          texte: 'Les communes se regroupent en **communautés de communes**, **d\'agglomération** ou en **métropoles**, auxquelles elles transfèrent des compétences. Ces structures sont dirigées par des **conseillers communautaires**, le plus souvent élus en même temps que les conseillers municipaux.' },
        { t: 'qcm', q: 'Qui s\'occupe le plus souvent de la collecte de vos poubelles ?',
          c: ['L\'intercommunalité', 'La région', 'Le département', 'L\'État'],
          e: 'La collecte des déchets ménagers est une compétence des intercommunalités, pas de la commune seule.' },
        { t: 'cours', sur: 'Le représentant de l\'État', titre: 'Le préfet',
          texte: 'Dans chaque département et chaque région, le **préfet** représente l\'État. Il fait appliquer les politiques nationales, gère les crises et exerce le **contrôle de légalité** : s\'il estime qu\'une décision locale est illégale, il peut la porter devant le **juge administratif**.' },
        { t: 'vf', q: 'Le préfet peut annuler lui-même une décision d\'un conseil municipal.', r: false,
          e: 'Depuis les lois de décentralisation de 1982, il ne peut que la déférer au tribunal administratif, qui tranche.' },
        { t: 'cours', sur: 'Des statuts à part', titre: 'Pas de règle sans exception',
          texte: '**Paris** exerce à la fois les compétences d\'une commune et d\'un département. La **métropole de Lyon** remplace le département sur son territoire. La **Corse** est une collectivité unique. Et les **outre-mer** relèvent de régimes variés.' },
        { t: 'vf', q: 'À Paris, une même collectivité exerce les compétences de la commune et du département.', r: true,
          e: 'Depuis 2019, la Ville de Paris est une collectivité à statut particulier qui cumule les deux.' },
        { t: 'piege', mythe: 'Le maire décide de tout dans sa ville.',
          verite: 'Non. Beaucoup de compétences — déchets, développement économique, souvent transports ou plan d\'urbanisme — sont passées à l\'**intercommunalité**. Et les collèges, les lycées ou le RSA ne relèvent pas de la commune.' }
      ],
      sources: [
        { titre: 'Constitution, articles 72 à 75-1', url: 'https://www.conseil-constitutionnel.fr/le-bloc-de-constitutionnalite/texte-integral-de-la-constitution-du-4-octobre-1958-en-vigueur' },
        { titre: 'Collectivités locales (ministère)', url: 'https://www.collectivites-locales.gouv.fr/' }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'europe',
      titre: 'L\'Union européenne',
      court: 'Ce qui se décide à 27, et comment la France y pèse.',
      teinte: 'ciel',
      objectif: 'Comprendre qui décide quoi à l\'échelle européenne, et la place de la France.',
      ecrans: [
        { t: 'cours', sur: 'Un pouvoir partagé', titre: 'Vingt-sept pays, des règles communes',
          texte: 'La France a confié certaines compétences à l\'**Union européenne**. L\'Union ne peut agir que dans les domaines que les traités lui attribuent : c\'est le principe d\'**attribution**.',
          faits: [{ v: '27', l: 'États membres' }, { v: '720', l: 'eurodéputés' }, { v: '81', l: 'élus en France' }] },
        { t: 'qcm', q: 'Combien l\'Union européenne compte-t-elle d\'États membres ?',
          c: ['27', '28', '25', '46'],
          e: 'Elle en comptait 28 avant le départ du Royaume-Uni, en 2020. 46, c\'est le Conseil de l\'Europe, une autre organisation.' },
        { t: 'mots', sur: 'Les institutions', titre: 'Qui fait quoi à l\'Union',
          mots: [
            { m: 'Commission européenne', d: 'Propose les textes et veille à leur application. Un commissaire par pays.' },
            { m: 'Parlement européen', d: 'Élu directement tous les cinq ans. Vote les textes et le budget avec le Conseil.' },
            { m: 'Conseil de l\'UE', d: 'Les ministres des 27. Vote les textes avec le Parlement.' },
            { m: 'Conseil européen', d: 'Les chefs d\'État ou de gouvernement. Fixe le cap, ne vote pas les lois.' },
            { m: 'Cour de justice', d: 'Veille à ce que le droit européen soit appliqué partout de la même façon.' }
          ] },
        { t: 'vf', q: 'Le Conseil européen et le Conseil de l\'Union européenne sont la même institution.', r: false,
          e: 'Le Conseil européen réunit les chefs d\'État ou de gouvernement ; le Conseil de l\'UE, les ministres. Et le Conseil de l\'Europe est une autre organisation, extérieure à l\'Union.' },
        { t: 'duo', sur: 'Deux types de textes', titre: 'Règlement ou directive ?',
          a: { t: 'Règlement', d: 'S\'applique directement, tel quel, dans les 27 pays.' },
          b: { t: 'Directive', d: 'Fixe un objectif. Chaque pays doit la transposer dans sa propre loi, dans un délai donné.' } },
        { t: 'qcm', q: 'Un texte européen s\'applique tel quel dans les 27 pays dès son entrée en vigueur. C\'est…',
          c: ['Un règlement', 'Une directive', 'Une recommandation', 'Un avis'],
          e: 'Le règlement n\'a besoin d\'aucune loi nationale. La directive, elle, fixe un objectif que chaque pays traduit dans son droit.' },
        { t: 'cours', sur: 'Le partage des compétences', titre: 'Qui décide de quoi',
          texte: 'Certaines compétences sont **exclusives** à l\'Union : politique commerciale, union douanière, concurrence, monnaie pour la zone euro. D\'autres sont **partagées** : marché intérieur, agriculture, environnement, énergie, transports. D\'autres restent pour l\'essentiel **nationales** : éducation, organisation du système de santé, impôt sur le revenu.' },
        { t: 'vf', q: 'L\'organisation des hôpitaux français est décidée à Bruxelles.', r: false,
          e: 'L\'organisation du système de santé reste une compétence nationale ; l\'Union ne fait qu\'appuyer et coordonner.' },
        { t: 'qcm', q: 'Qui négocie les accords commerciaux avec les pays hors de l\'Union ?',
          c: ['L\'Union européenne', 'Chaque État, séparément', 'L\'Organisation mondiale du commerce', 'Le Conseil de l\'Europe'],
          e: 'La politique commerciale est une compétence exclusive : la Commission négocie, puis le Conseil et le Parlement européen se prononcent.' },
        { t: 'cours', sur: 'La voix de la France', titre: 'Trois façons de peser',
          texte: 'La France vote au **Conseil de l\'UE** par ses ministres — souvent à la **majorité qualifiée** : 55 % des États représentant 65 % de la population. Elle y compte aussi par ses **81 eurodéputés** et son **commissaire**. Et le Parlement français contrôle la position du Gouvernement sur les textes européens.' },
        { t: 'piege', mythe: 'L\'Union impose ses lois sans que la France ait son mot à dire.',
          verite: 'Non. La plupart des textes sont adoptés à la fois par les **ministres des 27**, dont le ministre français, et par le **Parlement européen**, où siègent des élus français. La France peut être mise en minorité, mais elle vote.' }
      ],
      sources: [
        { titre: 'Institutions et organes de l\'UE (europa.eu)', url: 'https://european-union.europa.eu/institutions-law-budget/institutions-and-bodies_fr' },
        { titre: 'Traité sur le fonctionnement de l\'UE, articles 2 à 6 (EUR-Lex)', url: 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:12012E/TXT' }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'participer',
      titre: 'Voter et participer',
      court: 'Ses droits d\'électeur, et comment agir entre deux élections.',
      teinte: 'ambre',
      objectif: 'Connaître ses droits d\'électeur et ses moyens d\'agir.',
      ecrans: [
        { t: 'mots', sur: 'Le calendrier', titre: 'Qui élit-on, et pour combien de temps ?',
          mots: [
            { m: 'Présidentielle · 5 ans', d: 'Suffrage direct, deux tours.' },
            { m: 'Législatives · 5 ans', d: 'Un député par circonscription. Plus tôt en cas de dissolution.' },
            { m: 'Européennes · 5 ans', d: 'En France, une seule liste nationale, à la proportionnelle.' },
            { m: 'Municipales · 6 ans', d: 'Les conseillers municipaux élisent ensuite le maire.' },
            { m: 'Départementales et régionales · 6 ans', d: 'Les conseils qui gèrent collèges, lycées, action sociale, trains régionaux.' },
            { m: 'Sénatoriales · 6 ans', d: 'Élus par des grands électeurs, renouvelés par moitié tous les trois ans.' }
          ] },
        { t: 'cours', sur: 'Article 3', titre: 'Qui peut voter ?',
          texte: 'Tout Français **majeur** jouissant de ses droits civils et politiques. À **18 ans**, les jeunes recensés sont **inscrits automatiquement** sur les listes. Les citoyens de l\'Union qui vivent en France peuvent voter aux **municipales** et aux **européennes**.' },
        { t: 'vf', q: 'Une citoyenne allemande qui vit à Lyon peut voter aux élections municipales.', r: true,
          e: 'Les citoyens de l\'Union résidant en France votent aux municipales et aux européennes, pas aux autres scrutins.' },
        { t: 'cours', sur: 'La procuration', titre: 'Voter sans être là',
          texte: 'On peut confier son vote à un autre électeur par **procuration**. Depuis **2022**, cette personne peut être inscrite dans une autre commune que la vôtre — mais elle vote dans **votre** bureau de vote.' },
        { t: 'vf', q: 'Avec une procuration, la personne qui vote pour vous le fait dans son propre bureau de vote.', r: false,
          e: 'Elle doit se rendre dans votre bureau de vote à vous, même si elle est inscrite ailleurs.' },
        { t: 'cours', sur: 'Le vote blanc', titre: 'Compté, mais pas exprimé',
          texte: 'Depuis **2014**, les bulletins blancs sont **décomptés à part** des nuls et figurent dans les résultats. Mais ils n\'entrent pas dans les **suffrages exprimés** : ils ne comptent pas pour calculer une majorité.' },
        { t: 'qcm', q: '100 votants : 10 votes blancs, 50 voix pour A, 40 pour B. A a-t-il la majorité absolue des suffrages exprimés ?',
          c: ['Oui : 50 voix sur 90 exprimés', 'Non : 50 voix sur 100 votants', 'Non : il faut la moitié des inscrits', 'Impossible de le dire'],
          e: 'Les blancs ne sont pas des suffrages exprimés : A obtient 50 sur 90, soit environ 55,6 %.' },
        { t: 'cours', sur: 'Entre deux élections', titre: 'Signer, proposer, s\'engager',
          texte: 'On peut signer une **pétition** au Parlement : au Sénat, **100 000 signatures en six mois** la transmettent à la Conférence des présidents, qui décide des suites. On peut aussi participer à une **convention citoyenne**, être **tiré au sort** comme juré d\'assises, ou s\'engager dans une association, un syndicat ou un parti.' },
        { t: 'qcm', q: 'Combien de signatures en six mois une pétition au Sénat doit-elle réunir pour être examinée par la Conférence des présidents ?',
          c: ['100 000', '10 000', '1 million', '500'],
          e: 'Au-delà de ce seuil, la Conférence des présidents peut décider d\'une mission de contrôle, d\'un débat ou de l\'inscription d\'un texte.' },
        { t: 'cours', sur: 'Article 11', titre: 'Le référendum d\'initiative partagée',
          texte: 'Un référendum peut naître d\'une initiative d\'**un cinquième des parlementaires**, soutenue par **un dixième des électeurs inscrits** — près de **5 millions** de personnes. Si le Parlement ne l\'examine pas dans le délai prévu, le Président la soumet au référendum.' },
        { t: 'vf', q: 'Des citoyens peuvent lancer seuls un référendum d\'initiative partagée, sans parlementaires.', r: false,
          e: 'L\'initiative vient forcément d\'un cinquième des membres du Parlement. Les électeurs, eux, la soutiennent.' },
        { t: 'piege', mythe: 'Le vote blanc compte comme un vote.',
          verite: 'À moitié. Il est **recensé et publié** depuis 2014, mais il n\'entre pas dans les **suffrages exprimés**. Une vague de votes blancs ne peut donc pas, à elle seule, annuler une élection.' }
      ],
      sources: [
        { titre: 'Élections (Service-public.fr)', url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/N47' },
        { titre: 'e-pétitions du Sénat', url: 'https://petitions.senat.fr/' },
        { titre: 'Constitution, articles 3 et 11', url: 'https://www.conseil-constitutionnel.fr/le-bloc-de-constitutionnalite/texte-integral-de-la-constitution-du-4-octobre-1958-en-vigueur' }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'information',
      titre: 'S\'informer et vérifier',
      court: 'Faire le tri : sources, sondages, images, biais.',
      teinte: 'lilas',
      objectif: 'Faire le tri dans l\'information politique, et savoir vérifier avant de partager.',
      ecrans: [
        { t: 'cours', sur: 'Trois natures', titre: 'Fait, opinion, analyse',
          texte: 'Un **fait** se vérifie. Une **opinion** se discute. Une **analyse** relie des faits par un raisonnement. Le premier réflexe, devant un texte ou une vidéo : savoir lequel des trois on est en train de lire.' },
        { t: 'qcm', q: '« Cette réforme est une catastrophe pour les jeunes. » C\'est…',
          c: ['Une opinion', 'Un fait', 'Une source', 'Une analyse chiffrée'],
          e: 'C\'est un jugement. Il peut s\'appuyer sur des faits, mais il reste discutable.' },
        { t: 'cours', sur: 'La source primaire', titre: 'Remonter au document',
          texte: 'Face à une citation ou un chiffre, cherchez le **document d\'origine** : la loi au **Journal officiel** ou sur **Légifrance**, le **compte rendu** des débats de l\'Assemblée et du Sénat, le **résultat nominatif** d\'un scrutin, le **programme** publié par le candidat. C\'est ce que fait presid pour chaque position qu\'il affiche.' },
        { t: 'qcm', q: 'Pour savoir comment un député a voté sur un texte, le plus fiable est…',
          c: ['Le scrutin public publié par l\'Assemblée', 'Ce qu\'il en dit sur les réseaux sociaux', 'Un éditorial', 'Un sondage'],
          e: 'Les scrutins publics sont nominatifs et en ligne : c\'est la source primaire, celle que presid utilise.' },
        { t: 'cours', sur: 'Les sondages', titre: 'Une photo, pas une prédiction',
          texte: 'Un sondage mesure l\'opinion **à une date donnée**, avec une **marge d\'erreur** : sur 1 000 personnes, elle est d\'environ **3 points** autour de 50 %. Regardez aussi la **question exacte**, la **date** et la **taille de l\'échantillon**. La **Commission des sondages** contrôle les sondages électoraux.' },
        { t: 'vf', q: 'Sur 1 000 sondés, un candidat à 51 % contre 49 % est clairement en tête.', r: false,
          e: 'L\'écart est bien plus petit que la marge d\'erreur : les deux peuvent en réalité être à égalité, ou dans l\'ordre inverse.' },
        { t: 'cours', sur: 'Images et vidéos', titre: 'Vraie, détournée ou fabriquée',
          texte: 'Une image peut être **authentique mais détournée** — autre date, autre pays, autre contexte — ou **fabriquée** par une IA. Les réflexes : **recherche d\'image inversée**, vérifier la date et le lieu, et se méfier de ce qui déclenche une émotion très forte.' },
        { t: 'vf', q: 'Une image fabriquée par une IA peut être impossible à distinguer d\'une vraie photo à l\'œil nu.', r: true,
          e: 'D\'où l\'importance de remonter à la source et de croiser avant de partager, plutôt que de se fier à son œil.' },
        { t: 'mots', sur: 'Nos propres pièges', titre: 'Les biais qui nous trompent',
          mots: [
            { m: 'Biais de confirmation', d: 'On retient ce qui conforte ce qu\'on pense déjà.' },
            { m: 'Bulle de filtre', d: 'Les algorithmes montrent surtout ce qui nous ressemble.' },
            { m: 'Effet de vérité illusoire', d: 'Une affirmation répétée finit par sembler vraie.' },
            { m: 'Biais d\'autorité', d: 'On croit une information parce que celui qui la dit paraît légitime.' }
          ] },
        { t: 'qcm', q: 'Vos réseaux ne vous montrent que des contenus qui vont dans votre sens. C\'est…',
          c: ['Une bulle de filtre', 'L\'effet de vérité illusoire', 'Le biais d\'autorité', 'Une marge d\'erreur'],
          e: 'Les algorithmes vous montrent ce qui vous retient, souvent ce qui vous ressemble. Aller chercher d\'autres sources, c\'est en sortir.' },
        { t: 'qcm', q: 'Une vidéo choc circule, sans date ni source. Premier réflexe ?',
          c: ['Chercher son origine avant de la partager', 'La partager pour alerter ses proches', 'La croire si elle a beaucoup de vues', 'La commenter pour donner son avis'],
          e: 'Le nombre de vues ne dit rien de la véracité. Retrouver la source d\'origine, c\'est souvent trente secondes.' },
        { t: 'cours', sur: 'La réserve électorale', titre: 'Silence la veille du vote',
          texte: 'La veille et le jour du scrutin, il est interdit de **publier des sondages** et de diffuser de la **propagande électorale**. C\'est pour cela que presid suspend le partage de résultats pendant ces deux jours.' },
        { t: 'piege', mythe: 'Un sondage à 51 contre 49, c\'est une avance.',
          verite: 'Pas forcément. Avec une marge d\'erreur d\'environ **3 points**, les deux candidats peuvent être à égalité — ou dans l\'ordre inverse. L\'écart est **non significatif**.' }
      ],
      sources: [
        { titre: 'Commission des sondages', url: 'https://www.commission-des-sondages.fr/' },
        { titre: 'Assemblée nationale : comptes rendus et scrutins', url: 'https://www.assemblee-nationale.fr/' }
      ]
    }
  ]
};
