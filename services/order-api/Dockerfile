FROM node:20-alpine

WORKDIR /app

# deps
COPY package*.json ./
RUN npm ci --omit=dev

# app
COPY . .

ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.js"]