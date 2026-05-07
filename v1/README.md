# Gateway API (TypeScript)

## Setup

- Copy env file:

```bash
cp .env.example .env
```

- Start dependencies (Postgres + Redis):

```bash
docker compose up -d
```

- Install deps, generate Prisma client, run migrations:

```bash
npm install
# or
npm install --cache .npm-cache

npm run prisma:generate
npm run prisma:migrate:dev

# checking the db schema 
npm run prisma:studio
```

- Run the API:

```bash
npm run dev
```


## API docs 
cheeck : `http://localhost:4000/api/docs`
