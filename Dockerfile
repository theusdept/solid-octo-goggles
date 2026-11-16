FROM node:24.22.1-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --omit=dev
COPY runtime ./runtime
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3000
CMD ["node", "runtime/index.js"]
