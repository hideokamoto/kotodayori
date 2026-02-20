# Deployment Guide - Tayori Documentation Site

This guide explains how to deploy the Tayori documentation site to Cloudflare Workers (Pages).

## Prerequisites

- Cloudflare account with Workers/Pages enabled
- Access to the GitHub repository
- Node.js 18+ and pnpm installed (for local deployment)

## Method 1: Cloudflare Dashboard (Recommended)

This method uses Cloudflare's GitHub integration for automatic deployments.

### Initial Setup

1. **Go to Cloudflare Dashboard**
   - Navigate to Workers & Pages
   - Click "Create application"
   - Select "Pages" → "Connect to Git"

2. **Connect Repository**
   - Select `hideokamoto/stripe-webhook-router`
   - Grant necessary permissions

3. **Configure Build Settings**

   ```
   Framework preset: None (or select Astro, then override settings below)

   Production branch: main

   Build command:
   cd docs && pnpm install && pnpm build

   Build output directory:
   docs/dist

   Root directory (Build directory):
   / (leave as root - DO NOT set to "docs/")
   ```

4. **Set Environment Variables**

   ```
   NODE_VERSION = 18
   ```

   Or use Node.js 20 or 22 if preferred.

5. **Deploy**
   - Click "Save and Deploy"
   - Initial build will start automatically

### Why These Settings?

**Build Command**: `cd docs && pnpm install && pnpm build`
- `cd docs`: Navigate to the docs package directory
- `pnpm install`: Install dependencies (respects pnpm workspace from root)
- `pnpm build`: Run Astro build (outputs to `docs/dist`)

**Root Directory**: `/` (repository root)
- **Important**: Do NOT set this to `docs/`
- Reason: pnpm workspace configuration (`pnpm-workspace.yaml`) is at the repository root
- Setting root to `docs/` would break workspace dependency resolution

**Build Output**: `docs/dist`
- Path is relative to repository root
- Matches the output of `astro build` run from `docs/` directory

### Automatic Deployments

Once configured, deployments happen automatically:
- **Production**: Pushes to `main` branch → Production deployment
- **Preview**: Pull requests → Preview deployment

## Method 2: Wrangler CLI (Manual/CI)

For manual deployments or CI/CD pipelines.

### Prerequisites

```bash
# Install dependencies
cd docs
pnpm install
```

### Authentication

```bash
# Login to Cloudflare (opens browser)
pnpm wrangler login

# Or use API token for CI/CD
export CLOUDFLARE_API_TOKEN=your_token_here
```

### Deploy Commands

**Production Deployment**:
```bash
# From repository root
cd docs
pnpm run deploy

# Or manually
pnpm build
pnpm wrangler pages deploy dist
```

**Preview Deployment**:
```bash
cd docs
pnpm run deploy:preview
```

### Using from Repository Root

If you prefer to run commands from the repository root:

```bash
# Add to root package.json scripts
pnpm --filter tayori-docs deploy
```

## CI/CD Setup (GitHub Actions)

Example GitHub Actions workflow (`.github/workflows/deploy-docs.yml`):

```yaml
name: Deploy Documentation

on:
  push:
    branches:
      - main
    paths:
      - 'docs/**'
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build documentation
        run: |
          cd docs
          pnpm build

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy docs/dist --project-name=tayori-docs
```

Required secrets:
- `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

## Verifying Deployment

After deployment:

1. Check the deployment URL (provided in Cloudflare Dashboard or CLI output)
2. Verify:
   - Site loads correctly
   - Navigation works
   - Search functionality works (Starlight feature)
   - All documentation pages are accessible

## Custom Domain (Optional)

To use a custom domain:

1. In Cloudflare Dashboard, go to your Pages project
2. Navigate to "Custom domains"
3. Add your domain (e.g., `docs.tayori.dev`)
4. Follow DNS configuration instructions
5. Wait for SSL certificate provisioning (automatic)

## Troubleshooting

### Build Fails: "Cannot find module"

**Cause**: pnpm workspace not resolving correctly

**Solution**: Ensure build command starts with `cd docs` and root directory is `/`

### Build Fails: "pnpm: command not found"

**Cause**: Cloudflare builder doesn't have pnpm

**Solution**: Add to build command:
```bash
npm install -g pnpm && cd docs && pnpm install && pnpm build
```

Or set environment variable:
```
ENABLE_PNPM = true
```

### 404 on All Pages Except Home

**Cause**: SPA routing not configured

**Solution**: Already configured in `wrangler.jsonc`:
```json
"assets": {
  "not_found_handling": "404-page"
}
```

### Build Output Directory Not Found

**Cause**: Output path is relative to wrong directory

**Solution**: Use `docs/dist` (from repository root), not just `dist`

## Notes

- **Compatibility Date**: Set to `2026-02-20` in `wrangler.jsonc` (can be updated)
- **Node Version**: Docs require Node.js 18+ (specified in `package.json`)
- **Build Time**: Typically 1-2 minutes for clean builds
- **Astro Output**: Static site (SSG), no server-side rendering needed

## Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Astro Deployment Guide](https://docs.astro.build/en/guides/deploy/)
- [pnpm Workspace Documentation](https://pnpm.io/workspaces)
