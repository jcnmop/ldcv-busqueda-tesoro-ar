# Backend Supabase (tabla de posiciones en vivo)

Con el backend `local` cada celular guarda su propio resultado y el tablero solo ve
los equipos de ese navegador. Para proyectar una tabla en vivo con todos los equipos
hace falta un backend compartido. Supabase (plan gratuito) alcanza de sobra.

## 1. Crear el proyecto

1. https://supabase.com → New project (región más cercana: East US).
2. Anotar **Project URL** y **anon public key** (Settings → API).

## 2. Crear las tablas

SQL Editor → pegar y ejecutar:

```sql
create table if not exists equipos (
  equipo_id text primary key,
  nombre text not null,
  puntos integer not null default 0,
  estaciones_completadas integer not null default 0,
  total_estaciones integer not null default 0,
  inicio_ms bigint,
  fin_ms bigint,
  duracion_ms bigint,
  actualizado_ms bigint
);

create table if not exists completadas (
  equipo_id text not null references equipos(equipo_id) on delete cascade,
  estacion_id text not null,
  puntos integer not null default 0,
  inicio_ms bigint,
  fin_ms bigint,
  completado boolean,
  detalle jsonb,
  primary key (equipo_id, estacion_id)
);

-- Políticas: la app usa la clave anónima. Permitimos insertar/actualizar y leer.
-- Es una competencia universitaria: el riesgo aceptado es que alguien con la clave
-- (que va en el JS público) pueda escribir. Mitigación: borrar las tablas al terminar
-- y validar el resultado final en la mesa del LDCV con la pantalla del celular.
alter table equipos enable row level security;
alter table completadas enable row level security;

create policy "leer equipos" on equipos for select using (true);
create policy "escribir equipos" on equipos for insert with check (true);
create policy "actualizar equipos" on equipos for update using (true) with check (true);

create policy "leer completadas" on completadas for select using (true);
create policy "escribir completadas" on completadas for insert with check (true);
```

## 3. Configurar la app

Crear `.env` (copiando `.env.example`):

```
VITE_BACKEND=supabase
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_CLAVE_EVENTO=una-clave-nueva-para-el-dia-del-evento
```

Reconstruir y publicar (`npm run build`). Si las credenciales fallan, la app **cae
automáticamente al backend local** y lo avisa en la consola; el juego nunca se detiene.

## 4. El día del evento

- Vaciar las tablas antes de empezar: `truncate completadas, equipos;`
- Abrir `/tablero.html` en la pantalla del evento. Se actualiza sola cada 5 s.
- Exportar resultados al final: Table Editor → equipos → Export CSV.

## Alternativa sin Supabase

Si no se quiere crear la cuenta: quedarse en `local`, y al final cada equipo presenta
la pantalla final en la mesa. El organizador anota el puntaje. Funciona, pero sin
tabla en vivo.
