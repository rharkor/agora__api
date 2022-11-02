FROM node:7.7.2-alpine
WORKDIR /usr/api
COPY package.json .
RUN npm install --quiet
COPY . .

CMD npm run start
