-- ERA — Stamp identity migration (run once on an existing era_db).
-- The app also adds these columns automatically on first start if they are missing.
-- Each activity gets its own passport-stamp design: shape + ink colour + emblem.
USE era_db;

ALTER TABLE Activity
  ADD COLUMN stampShape VARCHAR(20) NULL,
  ADD COLUMN stampColor VARCHAR(20) NULL,
  ADD COLUMN stampIcon VARCHAR(30) NULL;

-- Signature identities for the six demo experiences
UPDATE Activity SET stampShape='scalloped', stampColor='emerald',    stampIcon='matcha'   WHERE image='/So_Matcha_Experience_Riyadh.png'  AND stampIcon IS NULL;
UPDATE Activity SET stampShape='circle',    stampColor='indigo',     stampIcon='stars'    WHERE image='/Stargazing_Experience_AlUla.png'  AND stampIcon IS NULL;
UPDATE Activity SET stampShape='hexagon',   stampColor='terracotta', stampIcon='tennis'   WHERE image='/Jeddah_Tennis.png'                AND stampIcon IS NULL;
UPDATE Activity SET stampShape='octagon',   stampColor='crimson',    stampIcon='palette'  WHERE image='/Louvre_Art_Experience_Paris.png'  AND stampIcon IS NULL;
UPDATE Activity SET stampShape='shield',    stampColor='rose',       stampIcon='lotus'    WHERE image='/Alo_Yoga_Experience_London.png'   AND stampIcon IS NULL;
UPDATE Activity SET stampShape='sunburst',  stampColor='gold',       stampIcon='pyramids' WHERE image='/Pyramids_Equestrian_Egypt.png'    AND stampIcon IS NULL;
