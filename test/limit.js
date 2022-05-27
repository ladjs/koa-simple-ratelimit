const test = require('ava');
const request = require('supertest');
const delay = require('delay');
const Redis = require('ioredis-mock');
const Koa = require('koa');

const ratelimit = require('..');

const rateLimitDuration = 300;
const goodBody = 'Num times hit: ';
let guard = 0;

test.before((t) => {
  const app = new Koa();

  app.use(
    ratelimit({
      duration: rateLimitDuration,
      db: new Redis(),
      max: 1
    })
  );

  app.use((ctx) => {
    guard += 1;
    ctx.body = `${goodBody}${guard}`;
  });

  t.context.app = app;
});

test.beforeEach(async (t) => {
  guard = 0;
  await delay(rateLimitDuration);
  await request(t.context.app.callback()).get('/').expect(200, `${goodBody}1`);
  t.is(guard, 1);
});

test('should respond with 429 when rate limit is exceeded', async (t) => {
  await request(t.context.app.callback())
    .get('/')
    .expect('X-RateLimit-Remaining', '0')
    .expect(429);
  t.pass();
});

test('should not yield downstream if ratelimit is exceeded', async (t) => {
  await request(t.context.app.callback()).get('/').expect(429);
  t.is(guard, 1);
});
