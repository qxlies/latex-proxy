FROM node:18-alpine

WORKDIR /root/putter_api/lapi/

COPY backend/package*.json ./backend/

WORKDIR /root/putter_api/lapi/backend
RUN npm install --legacy-peer-deps

WORKDIR /root/putter_api/lapi/
COPY . .

EXPOSE 3000

CMD [ "npm", "--prefix", "backend", "start" ]