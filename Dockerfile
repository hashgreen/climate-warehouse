FROM node:16.13

WORKDIR /usr/src/app
RUN npm install -g json
RUN npm install semver
COPY package*.json ./
COPY check_node_version.js ./
RUN json -I -f package.json -e "this.type=\"commonjs\""
COPY ./build ./build
RUN npm set-script prepare ""
RUN npm set-script postinstall ""
RUN npm set-script requirements-check ""
RUN npm install

VOLUME ["/root/.chia/mainnet/climate-warehouse"]
EXPOSE 31310
CMD [ "node", "./build/server.js" ]


