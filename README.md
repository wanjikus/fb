# fb (Puppeteer)

This repository contains a small script that opens https://www.facebook.com, waits for the login page to load, prints the page title and current URL, and saves a screenshot.

Important: This script does NOT perform login. Automating logins to Facebook may violate their terms of service.

Files:

- `open_fb.js` — Node.js script using Puppeteer (supports `--headless` flag)
- `package.json` — project metadata and scripts

Quick start

1. Install dependencies:

```bash
npm install
```

2. Run with visible Chrome (default):

```bash
npm start
```

3. Run headless:

```bash
npm run headless
```

The script will save a screenshot to `facebook_home.png` in the current directory.

Notes

- Puppeteer will download a Chromium binary when you install it. If you prefer to use a system Chrome/Chromium, install `puppeteer-core` and add a `executablePath` to the launch options in `open_fb.js`.
- If running in CI or a locked-down container, you may need to enable `--no-sandbox` / `--disable-dev-shm-usage` (already provided in the script launch options).

Using a remote Chrome

- Instead of running Chromium inside this container (which requires additional system libraries), you can connect to a remote Chrome/Chromium instance that exposes the DevTools Protocol.
- Start Chrome on the host (or another machine) with remote debugging enabled. Example (on the host):

```bash
google-chrome --remote-debugging-address=0.0.0.0 --remote-debugging-port=9222 \
	--no-sandbox --disable-dev-shm-usage
```

- Then set one of these environment variables before running the script in this container:

	- `BROWSER_WS_ENDPOINT` — the WebSocket debugger URL (e.g. `ws://host:9222/devtools/browser/<id>`). Puppeteer will connect using this endpoint.
	- `BROWSER_URL` — the HTTP DevTools URL (e.g. `http://host:9222`). Puppeteer will connect using this URL.
	- `CHROME_EXECUTABLE` — path to a local Chrome/Chromium executable to launch inside the container (if you install the system libraries).

Example using `BROWSER_URL`:

```bash
BROWSER_URL=http://host.docker.internal:9222 npm run headless
```

Example using `BROWSER_WS_ENDPOINT`:

```bash
BROWSER_WS_ENDPOINT=ws://host.docker.internal:9222/devtools/browser/<id> npm run headless
```

Notes:

- If you use a remote Chrome, the script will `connect()` and will `disconnect()` on completion (it will not attempt to close the remote browser).
- If you prefer to avoid the bundled Chromium download entirely, switch to `puppeteer-core` and adjust `package.json` and the script accordingly.

Login with credentials (securely)

- I will not accept credentials directly in chat. To run an automated login you can provide credentials securely to the container using environment variables.
- Export the credentials in your shell (this keeps them out of chat logs):

```bash
export FB_EMAIL='your-email@example.com'
export FB_PASSWORD='your-password'
npm run login
```

- Alternatively you can provide them inline (less secure because they may end up in shell history):

```bash
FB_EMAIL='you@example.com' FB_PASSWORD='hunter2' npm run login
```

- The script will attempt to log in and save a screenshot to `facebook_loggedin.png`. If two-factor authentication or other verification is required the automated login may not succeed.

- If you want me to run the login here in the container, export the `FB_EMAIL` and `FB_PASSWORD` environment variables in the terminal then tell me to `proceed` — I will not ask you to paste credentials in chat.
