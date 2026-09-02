-- El alta de taxista se rompía a partir del SEGUNDO que se registrase.
--
-- `drivers.license_number` es UNIQUE y NOT NULL, y el trigger
-- handle_new_user() insertaba el literal 'PENDING' cuando no había número.
-- Así que el primer taxista que se registraba ocupaba 'PENDING' y todos los
-- siguientes chocaban con la clave única. El fallo llegaba al usuario como
-- «Database error creating new user» y el alta se deshacía entera.
--
-- Y ocurría INCLUSO si el taxista aportaba su número: el trigger solo lee
-- raw_user_meta_data, donde la ruta de registro no lo metía, así que insertaba
-- 'PENDING' pase lo que pase. Comprobado con un INSERT en auth.users dentro de
-- una transacción deshecha: duplicate key value violates unique constraint
-- "drivers_license_number_unique", con licenseNumber presente en la metadata.
--
-- El arreglo es dejar de inventarse un valor. NULL es lo que significa de
-- verdad «todavía no lo ha dado», y Postgres admite varios NULL en una columna
-- UNIQUE, que es justo el comportamiento que hace falta. La restricción única
-- se mantiene: dos taxistas no pueden compartir licencia.
ALTER TABLE public.drivers
  ALTER COLUMN license_number DROP NOT NULL,
  ALTER COLUMN license_city   DROP NOT NULL;

-- Los 'PENDING' que hubiera pasan a NULL: no son un número de licencia, y en
-- el panel se mostraban como si lo fueran.
UPDATE public.drivers SET license_number = NULL WHERE license_number = 'PENDING';
UPDATE public.drivers SET license_city   = NULL WHERE license_city   = 'PENDING';

COMMENT ON COLUMN public.drivers.license_number IS
  'Número de licencia municipal. NULL mientras el taxista no lo haya aportado; UNIQUE admite varios NULL, que es lo que permite más de un alta pendiente.';
