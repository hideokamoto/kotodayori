# create-kotodayori

Scaffolding tool for creating Kotodayori webhook handler projects.

## Usage

Create a new Kotodayori project with interactive prompts:

```bash
npx create-kotodayori
```

### With Options

Specify the framework:

```bash
npx create-kotodayori --fw=hono
```

Specify project name and framework:

```bash
npx create-kotodayori my-webhook-handler --fw=hono
```

Specify package manager:

```bash
npx create-kotodayori --fw=hono --pm=pnpm
```

Skip dependency installation:

```bash
npx create-kotodayori --fw=hono --skip-install
```

### All Options

```bash
npx create-kotodayori [project-name] [options]

Options:
  --fw, --framework <framework>     Framework to use (hono, express, lambda, eventbridge)
  --pm, --package-manager <pm>      Package manager to use (pnpm, npm, yarn, bun)
  --skip-install                    Skip installing dependencies
  -h, --help                        Display help message
  -v, --version                     Display version number
```

## Supported Frameworks

- ✅ **Hono** - Modern web framework for edge computing
- 🚧 **Express** - Coming soon
- 🚧 **AWS Lambda** - Coming soon
- 🚧 **AWS EventBridge** - Coming soon

## What Gets Created

A new Kotodayori project includes:

- **TypeScript setup** - Full TypeScript configuration
- **Webhook handlers** - Example payment and subscription handlers
- **Type safety** - All Stripe event types fully typed
- **Development tools** - Hot reload, build scripts, and type checking
- **Environment setup** - `.env.example` with necessary configuration
- **Documentation** - README with setup and deployment instructions

## Example

```bash
$ npx create-kotodayori

? Project name: my-webhook-handler
? Select framework: Hono
? Select package manager: pnpm
? Install dependencies? Yes

Creating Kotodayori + Hono project...

✔ Template files created
✔ Dependencies installed successfully
✔ Project created successfully! 🎉

Next steps:

  1. Navigate to your project:
  cd my-webhook-handler

  2. Set up environment variables:
  cp .env.example .env
  Then edit .env with your Stripe API keys

  3. Start the development server:
  pnpm dev

  4. Test webhooks with Stripe CLI:
  stripe listen --forward-to localhost:3000/webhook
  stripe trigger payment_intent.succeeded
```

## Requirements

- Node.js >= 18
- pnpm, npm, yarn, or bun

## License

MIT
