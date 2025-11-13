FROM node:20-bookworm-slim AS frontend-build

WORKDIR /app/frontend-react

COPY frontend-react/package*.json ./
RUN npm ci

ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}

COPY frontend-react ./
RUN npm run build

FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps || npm install --production --legacy-peer-deps

COPY backend ./

WORKDIR /app
COPY --from=frontend-build /app/frontend-react/dist ./frontend-react/dist

EXPOSE 3000

CMD ["npm", "--prefix", "backend", "start"]