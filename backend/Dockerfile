# API StockBar — imagen de producción: compila TypeScript y ejecuta solo dist/.
# La configuración llega por variables de entorno del proveedor cloud (ver
# .env.example y /docs/DESPLIEGUE.md); nunca se copia un .env a la imagen.
FROM node:24-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:24-slim
ENV NODE_ENV=production UPLOAD_DIR=/data/uploads
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# Facturas de compra: montar aquí un volumen persistente.
RUN mkdir -p /data/uploads && chown node:node /data/uploads
VOLUME /data/uploads
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "dist/server.js"]
