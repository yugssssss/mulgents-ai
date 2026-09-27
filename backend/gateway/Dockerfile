FROM node

WORKDIR /app

# Root dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Gateway dependencies
COPY gateway/package*.json ./gateway/
RUN cd gateway && npm install --omit=dev

# Source
COPY gateway ./gateway
COPY shared ./shared

WORKDIR /app/gateway

EXPOSE 8000

CMD ["npm","start"]