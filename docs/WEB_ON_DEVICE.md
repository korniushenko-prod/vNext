# Web On Device

## Stage 28 purpose

Stage 28 adds the first real browser-facing web interface on the ESP32 target.

Stage 30 RC keeps that same on-device surface and does not add new pages.

The OLED still shows only IP information with:

- `STA IP > AP IP > ---`

Open the IP shown on the OLED in a browser.

## Routes

- `GET /` -> dashboard
- `GET /flow` -> flow page
- `GET /rules` -> rules page

## API

Dashboard:

- `GET /api/dashboard/data`
- `POST /api/dashboard/start`
- `POST /api/dashboard/stop`
- `POST /api/dashboard/trip`
- `POST /api/dashboard/reset`

Flow:

- `GET /api/flow/list`
- `GET /api/flow/{id}/status`
- `GET /api/flow/{id}/trend`
- `GET /api/flow/{id}/history`
- `POST /api/flow/{id}/batch/start`
- `POST /api/flow/{id}/batch/stop`
- `POST /api/flow/{id}/batch/reset`
- `POST /api/flow/{id}/trip-total/reset`

Rules:

- `GET /api/rules/list`
- `GET /api/rules/{id}`

## Safety limits

Stage 28 does not expose:

- rule mutation routes on hardware
- program editor routes on hardware
- template apply routes on hardware
- raw relay/GPIO routes
- auth/TLS/HTTPS

## Failure behavior

If the HTTP server fails to start:

- the device remains in safe status mode
- OLED and serial remain the fallback diagnostics path
