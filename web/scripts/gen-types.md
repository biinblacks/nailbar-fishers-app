# Regenerating `lib/database.types.ts`

Against your Supabase project (recommended once it exists):

```bash
npx supabase login
npx supabase gen types typescript --project-id <project-ref> --schema public > lib/database.types.ts
```

Against any Postgres that has the migrations applied (what was used to create the
committed file, no Docker required):

```bash
PG_META_DB_URL=postgresql://user:pass@host:5432/db PG_META_PORT=8085 \
  npx --yes -p @supabase/postgres-meta node node_modules/@supabase/postgres-meta/dist/server/server.js &
curl -s "http://127.0.0.1:8085/generators/typescript?included_schemas=public&detect_one_to_one_relationships=true" \
  > lib/database.types.ts
```

Then prepend the header comment (`/* eslint-disable */`) and run `npm run typecheck`.
