FROM node:18-alpine

WORKDIR /app

# Install bash
RUN apk add --no-cache bash curl wget nano

COPY package*.json ./
RUN npm install --production

COPY . .

ENV NODE_ENV=production
ENV LLM_PORT=3000

EXPOSE 3000

CMD ["node", "index.js"]
