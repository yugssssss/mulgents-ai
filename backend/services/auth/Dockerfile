FROM node

WORKDIR /app

# Root dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Auth dependencies
COPY services/auth/package*.json ./services/auth/
RUN cd services/auth && npm install --omit=dev

# Source
COPY services/auth ./services/auth
COPY shared ./shared

WORKDIR /app/services/auth

EXPOSE 8001

CMD ["npm","start"]