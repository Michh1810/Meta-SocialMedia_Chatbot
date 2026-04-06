# Learning Notes — auto-reply-tool

## Why `server.js` is the entry point

When you run `npm start`, Node.js reads `package.json` first. Inside it:

```json
"scripts": {
    "start": "node server.js"
}
```

This tells Node.js: **"start by running server.js"**. That's it. The file isn't magic — it's just the one `package.json` points to.

`server.js` then imports everything else it needs:

```js
const db = require('./services/database');
const messenger = require('./services/messenger');
const instagram = require('./services/instagram');
const tiktok = require('./services/tiktok');
```

Nothing in `services/` or `public/` runs on its own. They only run because `server.js` loaded them.

### Why is it outside the other folders?

It sits at the root because it's in charge of everything. It imports from `services/` and serves files from `public/`. Putting it above those folders makes that relationship visually clear.

```
server.js          ← runs first, in charge of everything
├── services/      ← logic that server.js calls
└── public/        ← UI files that server.js serves to the browser
```

---

## Middleware — what happens before your route logic runs

After Express is created (`const app = express()`), the next block registers **middleware**:

```js
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
```

**Middleware** is just a function that runs on every incoming request *before* your route handler gets it. Think of it as a pipeline — each request passes through these steps in order.

```
Incoming request
  → express.json()         parse JSON body
  → express.urlencoded()   parse form body
  → express.static()       serve files if matched
  → your route handler     e.g. GET /api/stats
```

### Line by line

**`express.json()`**
When a client sends a POST request with a JSON body (e.g. `{"message": "Xin chào"}`), HTTP delivers it as raw text. This middleware reads that text and converts it into a JavaScript object at `req.body`. Without it, `req.body` would be `undefined`.

**`express.urlencoded({ extended: true })`**
Same idea, but for HTML form submissions. A form sends data as `key=value&key2=value2`. This parses that format into `req.body` too. The `extended: true` option allows nested objects in the form data.

**`express.static('public')`**
If the request URL matches a file inside the `public/` folder, Express serves that file immediately and stops — no route handler runs. This is how the browser loads `index.html`, CSS, and JS files. `path.join(__dirname, 'public')` builds an absolute path so it works no matter where you run the server from.

### Why order matters

These three `app.use()` calls run **in the order they are written**. If a static file matches the URL, the request stops there. If not, it continues to the next middleware, then to your routes.

---

## The database initialization middleware (lines 18–26)

```js
app.use(async (req, res, next) => {
  try {
    await db.initDatabase();
    next();
  } catch (error) {
    console.error('Database initialization failed:', error);
    res.status(500).json({ error: 'Database initialization failed' });
  }
});
```

This is a **custom middleware** that runs on every request. It ensures the database is ready before any route handler tries to use it.

**Why is this needed?**

The server is deployed on Vercel (serverless). Unlike a normal server that boots once and stays running, a serverless function can be woken up from scratch for each request. The database might not be initialized yet. So this middleware calls `db.initDatabase()` on every request as a safety check — the function is written to be idempotent (safe to call multiple times; it only does real work once).

**What is `next()`?**

`next` is a callback passed to every middleware function by Express. Calling `next()` means "I'm done, pass the request to the next middleware or route handler." If you forget to call `next()`, the request hangs forever because nothing sends a response.

**The pattern:**
```
try {
  await doSetup();
  next();          // success → keep going
} catch (error) {
  res.status(500)  // failure → stop here and respond with an error
}
```
