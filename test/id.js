const test = require('ava');
const request = require('supertest');
const Redis = require('ioredis-mock');
const Koa = require('koa');

const ratelimit = require('..');

const rateLimitDuration = 300;

test('should allow specifying a custom `id` function', async (t) => {
  const app = new Koa();

  app.use(
    ratelimit({
      db: new Redis(),
      duration: rateLimitDuration,
      max: 1,
      id: (ctx) => ctx.request.header.foo
    })
  );

  const res = await request(app.callback()).get('/').set('foo', 'bar');

  t.is(res.header['x-ratelimit-remaining'], '0');
});

test('should not limit if `id` returns `false`', async (t) => {
  const app = new Koa();

  app.use(
    ratelimit({
      db: new Redis(),
      duration: rateLimitDuration,
      id: () => false,
      max: 5
    })
  );

  const res = await request(app.callback()).get('/');

  t.true(typeof res.header['x-ratelimit-remaining'] === 'undefined');
});

test('should limit using the `id` value', async (t) => {
  const app = new Koa();

  app.use(
    ratelimit({
      db: new Redis(),
      duration: rateLimitDuration,
      max: 1,
      id: (ctx) => ctx.request.header.foo
    })
  );

  app.use((ctx) => {
    ctx.body = ctx.request.header.foo;
  });

  await request(app.callback()).get('/').set('foo', 'buz').expect(200, 'buz');
  await request(app.callback()).get('/').set('foo', 'buz').expect(429);
  t.pass();
});

test('should allowlist using the `id` value', async (t) => {
  const app = new Koa();

  app.use(
    ratelimit({
      db: new Redis(),
      max: 1,
      id: (ctx) => ctx.header.foo,
      allowlist: ['bar']
    })
  );

  app.use((ctx) => {
    ctx.body = ctx.header.foo;
  });

  await request(app.callback()).get('/').set('foo', 'bar').expect(200, 'bar');
  await request(app.callback()).get('/').set('foo', 'bar').expect(200, 'bar');
  t.pass();
});

test('should blocklist using the `id` value', async (t) => {
  const app = new Koa();

  app.use(
    ratelimit({
      db: new Redis(),
      max: 1,
      id: (ctx) => ctx.header.foo,
      blocklist: ['bar']
    })
  );

  app.use((ctx) => {
    ctx.body = ctx.header.foo;
  });

  await request(app.callback()).get('/').set('foo', 'okay').expect(200, 'okay');
  await request(app.callback()).get('/').set('foo', 'bar').expect(403);
  t.pass();
});
