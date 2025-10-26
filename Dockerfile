FROM node:18-alpine

WORKDIR /app/backend

COPY backend/package*.json ./

RUN npm install --production --legacy-peer-deps

WORKDIR /app
COPY . .

EXPOSE 3035

CMD ["npm", "--prefix", "backend", "start"]