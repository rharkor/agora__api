FROM node
WORKDIR /usr/api
COPY package.json .
RUN npm install --quiet
COPY . .

CMD npm run start
