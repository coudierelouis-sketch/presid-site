-- Le TOTAL par question et par sens (20/10/2026). Les résultats ne lisent plus
-- que ces deux lignes par question, au lieu de toutes les tranches de 10 min :
-- relire les tranches à chaque ouverture de l'app avait atteint le plafond
-- quotidien de lectures de D1 (5 M) le 19/10, et les avis échouaient en 500.
-- Les tranches restent : la courbe d'évolution et la détection des pics les lisent.
CREATE TABLE totaux (
  question TEXT    NOT NULL,
  choix    TEXT    NOT NULL CHECK (choix IN ('pour', 'contre')),
  n        INTEGER NOT NULL,
  PRIMARY KEY (question, choix)
);

INSERT INTO totaux (question, choix, n)
  SELECT question, choix, SUM(n) FROM votes GROUP BY question, choix;
