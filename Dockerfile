FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
COPY backend/package*.json ./backend/

RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 3000

CMD [ "npm", "--prefix", "backend", "start" ]