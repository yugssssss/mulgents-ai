FROM node

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY services/billing/package*.json ./services/billing/
RUN cd services/billing && npm ci --omit=dev

COPY services/billing ./services/billing
COPY shared ./shared

WORKDIR /app/services/billing

EXPOSE 8004

CMD ["npm","start"]