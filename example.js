const Koa = require('koa');
const Redis = require('ioredis-mock');

const ratelimit = require('.');

const app = new Koa();

app.use(
  ratelimit({
    db: new Redis(),
    duration: 60_000,
    max: 100
  })
);

app.use((ctx) => {
  ctx.body = 'Stuff!';
});

app.listen(4000);

console.log('listening on port http://localhost:4000');

module.exports = app;
