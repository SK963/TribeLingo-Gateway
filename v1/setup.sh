cp .env.example .env
cp .env.production .env

# docker compose up -d

npm install --cache .npm-cache


npm run prisma:generate
npmr run prisma:deploy
# for development
# npm run prisma:migrate:dev
# checking the schema and db status
# npm run prisma:studio

# for development 
# npm run dev
npm run build

npm run start

# echo "Building and pushing Docker image..."
# docker buildx build --platform linux/amd64,linux/arm64 -t sk963/tribelingo-gateway:latest --push .