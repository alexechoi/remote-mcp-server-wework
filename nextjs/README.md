# WeWork MCP SaaS

Vercel project root: `nextjs`

## Environment

Copy `.env.example` to `.env.local` for local development and configure the same values in Vercel:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `CREDENTIAL_ENCRYPTION_KEY`
- `OAUTH_TOKEN_SECRET`

Generate an encryption key with:

```bash
openssl rand -base64 32
```

## Local Development

```bash
npm install
npm run dev
```

## Claude Connector

After deploying, add this remote MCP URL in Claude:

```text
https://your-domain.example/api/mcp
```

Claude will use the app's OAuth endpoints to connect the signed-in Firebase user to their encrypted WeWork credentials.
