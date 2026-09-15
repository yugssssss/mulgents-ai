FROM node

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY services/agent/package*.json ./services/agent/
RUN cd services/agent && npm ci --omit=dev

COPY services/agent ./services/agent
COPY shared ./shared

WORKDIR /app/services/agent

EXPOSE 8003

CMD ["npm","start"]