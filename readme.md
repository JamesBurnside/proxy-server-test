# Proxy Server

This is a simple proxy server that forwards requests to child servers. It spawns child servers bassed on the version and variant of the request.

## Local Setup

### Prerequisites

- Node.js
- npm

### Setup

1. Clone the repository
2. Run `npm install`

### Running the server

1. Run `npm start`

### Test routes

1. Open a browser and navigate to `http://localhost:3000/version?version=<VERSION>&variant=<VARIANT>`
   - Replace `<VERSION>` with the version number (`1.0.0` or `1.2.3`)
   - Replace `<VARIANT>` with the variant number (`call` or `chat`)
2. You should see a response that was from the child server (the response is the child server's SKU)
