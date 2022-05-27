# [**@ladjs/koa-simple-ratelimit**](https://github.com/ladjs/koa-simple-ratelimit)

[![build status](https://img.shields.io/travis/ladjs/koa-simple-ratelimit.svg)](https://travis-ci.org/ladjs/koa-simple-ratelimit)
[![code coverage](https://img.shields.io/codecov/c/github/ladjs/koa-simple-ratelimit.svg)](https://codecov.io/gh/ladjs/koa-simple-ratelimit)
[![code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![made with lass](https://img.shields.io/badge/made_with-lass-95CC28.svg)](https://lass.js.org)
[![license](https://img.shields.io/github/license/ladjs/koa-simple-ratelimit.svg)](LICENSE)

> **Fork of koa-simple-ratelimit with better tests and options.** Rate limiter middleware for koa v2. Differs from [koa-ratelimit](https://github.com/koajs/ratelimit) by not depending on [ratelimiter](https://github.com/tj/node-ratelimiter) and using redis ttl (time to live) to handle expiration time remaining. This creates only one entry in redis instead of the three that node-ratelimiter does.


## Table of Contents

* [Install](#install)
* [Example](#example)
* [Options](#options)
* [Responses](#responses)
* [License](#license)


## Install

```sh
npm install @ladjs/koa-simple-ratelimit
```


## Example

```js
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
```


## Options

* `max` (Number) number of max requests within `duration` (defaults to `2500`)
* `duration` (Number) duration of limit in milliseconds (defaults to `3600000`)
* `throw` (Boolean) whether or not to throw an error with `ctx.throw` (defaults to `false`)
* `prefix` (String) redis key prefix (defaults to `limit`)
* `id` (Function) function accepting an argument `ctx` that returns an id to compare requests with (defaults to `ip` via `ctx.ip`)
* `allowlist` (Array) an array of ids to allowlist (defaults to `[]`)
* `blocklist` (Array) an array of ids to blocklist (defaults to `[]`)
* `logger` (Function) a logger to log database errors with (to prevent app middleware requests from failing due to database connection issues) - set this value to `false` to disable the logger output
* `headers` (Object) containing keys `remaining`, `reset`, and `total` which set the headers on the HTTP request to `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `X-RateLimit-Limit` by default respectively
* `errorMessage` (Function) a function accepting an argument `exp` which is the number of milliseconds until limitation expiry (see code for default)


## Responses

Example 200 with header fields:

```sh
HTTP/1.1 200 OK
X-Powered-By: koa
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1384377793
Content-Type: text/plain; charset=utf-8
Content-Length: 6
Date: Wed, 13 Nov 2013 21:22:13 GMT
Connection: keep-alive

Stuff!
```

Example 429 response:

```sh
HTTP/1.1 429 Too Many Requests
X-Powered-By: koa
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1384377716
Content-Type: text/plain; charset=utf-8
Content-Length: 39
Retry-After: 7
Date: Wed, 13 Nov 2013 21:21:48 GMT
Connection: keep-alive

Rate limit exceeded, retry in 8 seconds
```


## License

[MIT](LICENSE) © Scott Cooper
