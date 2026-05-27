# WeWork MCP SaaS

This repository is split into two projects:

- `mcp/` contains the original local WeWork MCP server fork. It still builds and runs as a stdio MCP server.
- `nextjs/` contains the Vercel-hosted SaaS app for non-technical users and Claude remote connector support.

For Vercel, set the project root directory to `nextjs`.

## Local MCP

```bash
cd mcp
mise run test
mise run build
./dist/mcp-server-wework
```

## SaaS App

```bash
cd nextjs
npm install
npm run dev
```
