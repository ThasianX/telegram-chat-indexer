FROM node:20-alpine

WORKDIR /app

COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile --production

COPY . .

RUN yarn build

ENV LOG_LEVEL=INFO

CMD ["node", "dist/index.js"]