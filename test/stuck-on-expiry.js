const test = require('ava');
const sinon = require('sinon');

const ratelimit = require('..');

test('it should reset if stuck on expiry', async (t) => {
  const db = {
    async get() {
      return '0';
    },
    async set() {},
    async pttl() {
      return -1;
    },
    async decr() {}
  };
  const spy = sinon.spy(db, 'set');
  const ctx = { ip: 'test', async set() {} };
  await t.notThrowsAsync(
    ratelimit({
      db
    })(ctx, () => {})
  );
  t.true(spy.calledWith('limit:test:count', 2499, 'PX', 3_600_000, 'NX'));
});
