const test = require('ava');
const sinon = require('sinon');

const ratelimit = require('..');

test('it should throw an error on get err', async (t) => {
  const logger = { error() {} };
  const spy = sinon.spy(logger, 'error');
  const ctx = { ip: 'test', async set() {} };
  await t.notThrowsAsync(
    ratelimit({
      db: {
        async get() {
          throw new Error('get');
        }
      },
      logger
    })(ctx, () => {})
  );
  t.true(
    spy.calledWith(
      sinon.match.instanceOf(Error).and(sinon.match.has('message', 'get'))
    )
  );
});

test('it should throw an error on set err', async (t) => {
  const logger = { error() {} };
  const spy = sinon.spy(logger, 'error');
  const ctx = { ip: 'test', async set() {} };
  await t.notThrowsAsync(
    ratelimit({
      db: {
        async get() {
          return null;
        },
        async set() {
          throw new Error('set');
        },
        async pttl() {},
        async decr() {}
      },
      logger
    })(ctx, () => {})
  );
  t.true(
    spy.calledWith(
      sinon.match.instanceOf(Error).and(sinon.match.has('message', 'set'))
    )
  );
});

test('it should throw an error on pttl err', async (t) => {
  const logger = { error() {} };
  const spy = sinon.spy(logger, 'error');
  const ctx = { ip: 'test', async set() {} };
  await t.notThrowsAsync(
    ratelimit({
      db: {
        async get() {
          return '2';
        },
        async set() {
          return '2';
        },
        async pttl() {
          throw new Error('pttl');
        }
      },
      logger
    })(ctx, () => {})
  );
  t.true(
    spy.calledWith(
      sinon.match.instanceOf(Error).and(sinon.match.has('message', 'pttl'))
    )
  );
});

test('it should throw an error on decr err', async (t) => {
  const logger = { error() {} };
  const spy = sinon.spy(logger, 'error');
  const ctx = { ip: 'test', async set() {} };
  await t.notThrowsAsync(
    ratelimit({
      db: {
        async get() {
          return '2';
        },
        async set() {
          return '1';
        },
        async pttl() {},
        async decr() {
          throw new Error('decr');
        }
      },
      logger
    })(ctx, () => {})
  );
  t.true(
    spy.calledWith(
      sinon.match.instanceOf(Error).and(sinon.match.has('message', 'decr'))
    )
  );
});

test('it should throw an error on stuck on expiry err', async (t) => {
  const logger = { error() {} };
  const db = {
    async get() {
      return '0';
    },
    async set() {
      throw new Error('set');
    },
    async pttl() {
      return -1;
    },
    async decr() {}
  };
  const spy1 = sinon.spy(db, 'set');
  const spy2 = sinon.spy(logger, 'error');
  const ctx = { ip: 'test', async set() {} };
  await t.notThrowsAsync(
    ratelimit({
      db,
      logger
    })(ctx, () => {})
  );
  t.true(spy1.calledWith('limit:test:count', 2499, 'PX', 3_600_000, 'NX'));
  t.true(
    spy2.calledWith(
      sinon.match.instanceOf(Error).and(sinon.match.has('message', 'set'))
    )
  );
});
