# crypto.randomUUID needs 15+, even numbers are LTS
FROM node:16.14

RUN mkdir -p /app
WORKDIR /app

COPY package.json yarn.lock /app/
RUN yarn install --frozen-lockfile

COPY index.ts /app/index.ts
COPY tsconfig.json /app/tsconfig.json
COPY config.ts /app/config.ts
COPY jest.config.js /app/jest.config.js

RUN ./node_modules/.bin/tsc

# CMD ./service.ts
