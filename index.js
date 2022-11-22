const { debuglog } = require('util');

const ms = require('ms');
const multimatch = require('multimatch');

const debug = debuglog('@ladjs/koa-simple-ratelimit');

function ratelimit(options) {
  const opts = {
    db: false,
    max: 2500,
    duration: 3_600_000,
    throw: false,
    prefix: 'limit',
    id: (ctx) => ctx.ip,
    allowlist: [],
    blocklist: [],
    logger: console,
    headers: {
      remaining: 'X-RateLimit-Remaining',
      reset: 'X-RateLimit-Reset',
      total: 'X-RateLimit-Limit'
    },
    errorMessage: (exp) =>
      `Rate limit exceeded, retry in ${ms(exp, { long: true })}.`,
    ignoredPathGlobs: [],
    ...options
  };

  if (!opts.db) throw new Error('Redis connection instance missing');

  const {
    remaining = 'X-RateLimit-Remaining',
    reset = 'X-RateLimit-Reset',
    total = 'X-RateLimit-Limit'
  } = opts.headers || {};

  // eslint-disable-next-line func-names
  return async function rateLimitMiddleware(ctx, next) {
    // check against ignored/whitelisted paths
    if (
      Array.isArray(opts.ignoredPathGlobs) &&
      opts.ignoredPathGlobs.length > 0
    ) {
      const match = multimatch(ctx.path, opts.ignoredPathGlobs);
      if (Array.isArray(match) && match.length > 0) return next();
    }

    const id = opts.id(ctx);

    if (id === false) {
      return next();
    }

    if (opts.allowlist?.includes(id)) {
      return next();
    }

    if (opts.blocklist?.includes(id)) {
      return ctx.throw(403);
    }

    const prefix = opts.prefix ? opts.prefix : 'limit';
    const name = `${prefix}:${id}:count`;
    let cur;
    try {
      cur = await opts.db.get(name);
    } catch (err) {
      debug(err);
      if (opts.logger) opts.logger.error(err);
      return next();
    }

    const n = Math.floor(Number(cur));
    let t = Date.now();
    t += opts.duration;
    t = Math.floor(new Date(t).getTime() / 1000) || 0;

    const headers = {
      [remaining]: opts.max - 1,
      [reset]: t,
      [total]: opts.max
    };
    ctx.set(headers);

    // Not existing in redis
    if (!cur) {
      opts.db
        .set(name, opts.max - 1, 'PX', opts.duration, 'NX')
        .then()
        .catch((err) => {
          debug(err);
          if (opts.logger) opts.logger.error(err);
        });
      debug('remaining %s/%s %s', opts.max - 1, opts.max, id);
      return next();
    }

    let expires;
    try {
      expires = await opts.db.pttl(name);
    } catch (err) {
      debug(err);
      if (opts.logger) opts.logger.error(err);
      return next();
    }

    if (n - 1 >= 0) {
      // Existing in redis
      opts.db
        .decr(name)
        .then()
        .catch((err) => {
          debug(err);
          if (opts.logger) opts.logger.error(err);
        });
      ctx.set(remaining, n - 1);
      debug('remaining %s/%s %s', n - 1, opts.max, id);
      return next();
    }

    if (expires < 0) {
      debug(`${name} is stuck. Resetting.`);
      opts.db
        .set(name, opts.max - 1, 'PX', opts.duration, 'NX')
        .then()
        .catch((err) => {
          debug(err);
          if (opts.logger) opts.logger.error(err);
        });
      return next();
    }

    // User maxed
    debug('remaining %s/%s %s', remaining, opts.max, id);
    ctx.set(remaining, n);
    ctx.set('Retry-After', t);
    ctx.status = 429;
    ctx.body =
      typeof opts.errorMessage === 'function'
        ? opts.errorMessage(expires, ctx)
        : opts.errorMessage;

    if (opts.throw) {
      ctx.throw(ctx.status, ctx.body, { headers });
    }
  };
}

module.exports = ratelimit;
