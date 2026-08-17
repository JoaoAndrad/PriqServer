// Servidor customizado (Express) para hospedagem na SquareCloud.
// A SquareCloud roda um processo Node genérico (não é ambiente tipo Vercel),
// então o Next.js é servido através de um app Express próprio em vez de `next start`.

const express = require("express");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT) || 3000;

const app = next({ dev });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = express();

    // Deixa o Next.js (App Router + Route Handlers) tratar todas as rotas,
    // incluindo /api/*, estáticos de /public e as páginas.
    server.all(/.*/, (req, res) => handle(req, res));

    server.listen(port, () => {
      console.log(`> Priquito rodando na porta ${port} (${dev ? "dev" : "produção"})`);
    });
  })
  .catch((err) => {
    console.error("Falha ao iniciar o servidor:", err);
    process.exit(1);
  });
