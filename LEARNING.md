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
