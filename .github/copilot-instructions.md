Purpose: Quickly onboard AI coding agents to the repository so they can be productive immediately.

Summary
- This repository is a multi-service "Unified FortiAP/Switch Dashboard".
- Major parts: API gateway (shared/api-gateway.js), Combined Dashboard (server.js / app.js), 3D visualizer + Python discovery (babylon_3d/).

Why this matters
- Backend services are Node.js/Express and a Python discovery service. Changes that affect APIs or data shapes must be coordinated across the gateway, dashboard server, and front-end `app.js`.

Important files to inspect first
- [server.js](server.js) — primary dashboard backend (API handlers, caching, fallback logic). Add API endpoints here or via the gateway.
- [app.js](app.js) — large client-side dashboard logic and UI interactions; DOM-first, imperative style.
- [shared/api-gateway.js](shared/api-gateway.js) — integration point between services and the Python discovery service.
- [shared/.env.example](shared/.env.example) — canonical environment vars (FortiGate credentials, ports, cache settings).
- [dashboard_data.yaml](dashboard_data.yaml) and /cache/*.json — fallback data sources used by the server.

Patterns & conventions (do not invent new patterns without team approval)
- API calls from front-end use relative /api/* endpoints served by the dashboard server (server.js). The server in turn calls FortiGate REST endpoints via makeFortiRequest().
- Use the existing MemoryCache class and `memoryCache` / `topologyCache` to add caching for new endpoints (TTL, startCleanup/stopCleanup are used globally).
- For new device transforms add a small transform function (see transformFortiAPData / transformFortiSwitchData) and keep the API handler small (call transform -> cache -> saveDataToCache).
- Error handling: APIs heavily rely on fallback to `dashboard_data.yaml` or cache JSON files. Keep that pattern consistent.

Developer workflows & commands
- Install: `npm install` and Python deps: `pip install -r babylon_3d/requirements.txt`.
- Run dashboard server only: `npm run dashboard` (port defaults to 13000).
- Full combined stack: use the shell scripts in the repo or `npm run combined` (runs gateway + dashboard + 3D app concurrently).
- Tests: `npm test` (Jest unit tests) and integration: `python test-integration.py`.
- Docker: `docker-compose up -d` or `npm run docker:build` then `npm run docker:run`.
- Lint & format: `npm run lint` / `npm run lint:fix` / `npm run format`.

Hot spots an agent should watch when changing behaviour
- Environment variables — changes to names or semantics require updates in `shared/.env.example`, `README.md`, and deployment scripts.
- API contract changes — update both `server.js` and client `app.js` plus any integration tests in `dev-tests/` and `test/`.
- Caching & TTL — cache files in `cache/` are used by the UI when API calls fail; keep their shape stable.

Recommended first-edit checklist
1. Read server.js and app.js for the specific endpoint and transform you're changing.
2. Update `shared/.env.example` and README if you add an environment variable.
3. Add or update unit tests in `test/` and integration checks used by `test-integration.py`.
4. Run `npm run lint` and `npm test` before proposing changes.

If something is unclear
- Ask which service should own a change (API gateway vs dashboard server vs python discovery). Many endpoints are duplicated in `shared/` and root-level `server.js`; prefer to follow the README architecture.

Quick examples
- Add an API handler that fetches a new FortiGate endpoint: call makeFortiRequest('/monitor/whatever'), create a transformX function, call memoryCache.set and saveDataToCache('fortiswitches', ...).
- Coordinate new UI fields: change `app.js` to consume the new /api/* endpoint and update index.html markup.

Done.