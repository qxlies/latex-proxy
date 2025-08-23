FROM node:18-alpine

WORKDIR /root/putter_api/lapi/

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 3035

CMD [ "npm", "--prefix", "backend", "start" ]
