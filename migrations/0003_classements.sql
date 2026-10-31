-- Le classement du jour, outil interne (cf. worker/classement.js).
-- Une ligne par jour et par pays ; `compteurs` est un objet JSON
-- { "<personnalité>:<rang>": nombre d'envois }. Aucune donnée sur la personne
-- qui a envoyé : les rangs d'un même envoi ne sont reliés entre eux par rien.
-- Une seule ligne par jour, pour qu'un envoi ne coûte qu'UNE écriture D1.
CREATE TABLE classements (
  jour      TEXT NOT NULL,  -- AAAA-MM-JJ, en UTC
  pays      TEXT NOT NULL CHECK (pays IN ('fr', 'es')),
  compteurs TEXT NOT NULL CHECK (json_valid(compteurs)),
  PRIMARY KEY (jour, pays)
) WITHOUT ROWID;
