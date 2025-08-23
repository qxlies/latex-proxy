FROM node:18-alpine

WORKDIR /root/putter_api/lapi/backend
COPY backend/package*.json ./
RUN npm install --legacy-peer-deps

WORKDIR /root/putter_api/lapi
COPY . .

EXPOSE 3000

CMD ["npm", "--prefix", "backend", "start"]