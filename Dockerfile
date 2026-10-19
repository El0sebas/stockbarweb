# Web StockBar (React + Vite) compilada y servida con nginx.
# nginx también reenvía /api a la API, así la web y la API comparten
# origen y el frontend usa '/api' sin VITE_API_URL (ver nginx.conf).
FROM node:24-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
