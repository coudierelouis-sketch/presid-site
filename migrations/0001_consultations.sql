-- La question du jour : des compteurs, et rien d'autre (cf. worker/consultation.js).
-- Une ligne = une question, un sens, une tranche de 10 minutes. Aucune donnée
-- sur la personne qui a répondu.
CREATE TABLE votes (
  question TEXT    NOT NULL,  -- la date de la question, AAAA-MM-JJ
  choix    TEXT    NOT NULL CHECK (choix IN ('pour', 'contre')),
  tranche  INTEGER NOT NULL,  -- secondes epoch / 600
  n        INTEGER NOT NULL,
  PRIMARY KEY (question, choix, tranche)
);

-- Questions dont l'affichage est suspendu après un pic anormal. Dégel manuel.
CREATE TABLE gels (
  question TEXT    PRIMARY KEY,
  depuis   INTEGER NOT NULL   -- tranche où le pic a été vu
);
