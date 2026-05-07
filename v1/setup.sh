cp .env.example .env

docker compose up -d

npm install --cache .npm-cache


npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:studio
npm run dev
npm run build

echo "Building and pushing Docker image..."
docker buildx build --platform linux/amd64,linux/arm64 -t sk963/tribelingo-gateway:latest --push .