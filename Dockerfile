FROM oven/bun:1-alpine

WORKDIR /app

COPY server.js .
COPY index.html .
COPY js/ ./js/

ENV PORT=443

EXPOSE 443

CMD ["bun", "server.js"]
