import Fastify from 'fastify';

const app = Fastify({ logger: true });

// Platzhalter-Endpunkt. Die echten Routen (Auth, Fächer, Chats, …) kommen ab
// Phase 3 / Phase 4 des UMSETZUNGSPLAN.md und folgen backend-planning.md §4.
app.get('/health', async () => ({ status: 'ok', service: 'lesify-api' }));

const port = Number(process.env.PORT ?? 3000);

app
  .listen({ port, host: '0.0.0.0' })
  .then(() => app.log.info(`lesify-api läuft auf :${port}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
