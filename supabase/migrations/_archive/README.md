# Migraciones archivadas (001–032)

**Estos ficheros no describen la base de datos actual. No los uses como
referencia y no los ejecutes.**

## Por qué están aquí

`supabase_migrations.schema_migrations` estaba **vacía**: ninguna de estas 32
migraciones se aplicó nunca con el CLI de Supabase. El esquema se construyó
ejecutando SQL crudo (probablemente con `scripts/apply-migration.mjs`, que no
registra nada en la tabla de historial).

Consecuencia: estos ficheros y la BD real divergieron sin que nadie lo notara.

## Por qué importa

No es un problema académico. Fue exactamente lo que mantuvo oculto un agujero
de seguridad crítico:

- `002_rls_policies.sql` activa RLS en 13 tablas y crea políticas. **Nunca se
  aplicó.** Cualquiera que leyera el fichero daría el RLS por resuelto, pero
  esas 13 tablas estaban sin proteger.
- `005_fix_schema_and_grants.sql` y `030_fix_missing_grants.sql` hacen
  `GRANT ALL ON ALL TABLES TO anon, authenticated`. Estas **sí** se aplicaron.
  Resultado: toda la BD era legible y escribible con la clave anon, que es
  pública porque viaja en el bundle del cliente.

Se corrigió en `20260831111338_rls_hardening.sql`.

## El estado real

Está en `../20260831000000_baseline_schema.sql`, generada con
`supabase db dump` contra la BD, más las migraciones posteriores. A partir de
ahí, historial local y remoto coinciden y `supabase db push` funciona.

## Qué conservan de valor

Solo el contexto histórico: el *porqué* de algunas decisiones y el orden en que
se pensaron. Para saber qué hay en la BD, la baseline; para saber por qué,
`git log`.
