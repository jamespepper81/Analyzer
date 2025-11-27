# GitHub Workflows for BitSleuth Analyzer

## Auto-close Won't Do Issues Workflow

The `auto-close-wont-do.yml` workflow automatically closes issues when their status is set to "Won't Do".

### Triggers

- **`workflow_dispatch`** - Manual trigger with inputs:
  - `issue_number` (required) - The issue number to process
  - `status` (optional, default: "Won't Do") - The status to validate before closing

### Important Notes

⚠️ **Projects V2 Events Not Supported**: The `projects_v2_item` event is NOT supported as a workflow trigger by GitHub Actions. While this event exists as a webhook, it cannot be used in the `on:` section of workflow files.

- GitHub Actions does not support `projects_v2_item` as a workflow trigger
- This workflow must be manually triggered using `workflow_dispatch`
- GitHub does not provide a native way to trigger workflows when GitHub Projects V2 status fields change

### Usage

To manually close an issue marked as "Won't Do":
1. Go to **Actions** tab
2. Select **Auto-close Won't Do Issues**
3. Click **Run workflow**
4. Enter the issue number

## Copilot Agent Testing Workflow

The `copilot-test.yml` workflow provides a standardized testing environment for Copilot agents with all necessary environment variables pre-configured.

### Setup Instructions

#### 1. Configure Repository Secrets

Go to **Settings > Secrets and variables > Actions > Repository secrets** and add:

**Firebase (Client-side):**
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

**Google Sheets (Server-side):**
- `GOOGLE_SHEETS_ID`
- `GOOGLE_SHEETS_CLIENT_EMAIL`
- `GOOGLE_SHEETS_PRIVATE_KEY`

**API Keys:**
- `CRYPTOCOMPARE_API_KEY` - For Bitcoin news
- `COINGECKO_API_KEY` - For price data and historical charts
- `BLOCKCHAIN_COM_API_KEY` - Blockchain.com API
- `BLOCKCHAIN_COM_API_SECRET` - Blockchain.com secret
- `TRM_LABS_API_KEY` - TRM Labs integration
- `CHAINABUSE_API_KEY` - ChainAbuse integration
- `NEXT_PUBLIC_CHAINABUSE_API_KEY` - ChainAbuse public key
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` - reCAPTCHA site key
- `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY` - reCAPTCHA enterprise key
- `OPENAI_API_KEY` - OpenAI ChatGPT AI for chat features

#### 2. Configure Repository Variables

Go to **Settings > Secrets and variables > Actions > Repository variables** and add:

- `TEST_XPUB` - Test Bitcoin XPUB for wallet testing
  - Example: `xpub5bTZy77KFNhRQa2AMzE1gS4sc643CA6aYRyZ7vswMRNeXbcuYFuWPtZEfEKpHWuEfKtTbMJugXPBkf6jHVOJ2nS2vkwWQtzMzjm2EAzMpP4`

### Usage

#### Automatic Triggers

The workflow runs automatically on:
- **Push** to `main` branch
- **Pull requests** to `main` or `develop` branches

#### Manual Trigger

You can also run the workflow manually:
1. Go to **Actions** tab in GitHub
2. Select **Copilot Agent Testing** workflow
3. Click **Run workflow**
4. Choose test type:
   - `full` - Complete build and validation
   - `ui` - UI-focused testing
   - `report` - Report page testing

### What the Workflow Does

1. **Checkout** - Clones the repository
2. **Setup Node.js** - Installs Node.js 20 with npm caching
3. **Install dependencies** - Runs `npm ci` for clean install
4. **Create .env.local** - Generates environment file from secrets
5. **Type check** - Validates TypeScript types
6. **Lint** - Runs ESLint checks
7. **Build** - Builds the Next.js application
8. **Verify XPUB** - Confirms test XPUB is configured
9. **Test summary** - Generates a summary of environment status

### Environment Variables Available

All environment variables from `apphosting.prd.yaml` are automatically available in the workflow and can be used by Copilot agents for testing.

### Copilot Agent Usage

Copilot agents can reference this workflow to:
- Access pre-configured environment variables
- Run tests with production-like configuration
- Validate changes against the full application stack
- Test report generation with real API keys

### Example: Testing Report Page

The workflow provides everything needed to test the Report page:
- `COINGECKO_API_KEY` for historical price data
- `TEST_XPUB` for wallet transaction data
- `OPENAI_API_KEY` for AI-powered insights

### Troubleshooting

**Build Failures:**
- Ensure all required secrets are configured
- Check that `TEST_XPUB` is a valid Bitcoin XPUB
- Verify API keys are active and not rate-limited

**Missing Environment Variables:**
- The workflow summary will show which variables are missing
- Add missing secrets/variables as documented above

### Security Notes

- Never commit secrets to the repository
- Use Repository secrets for sensitive data (API keys, private keys)
- Use Repository variables for non-sensitive data (TEST_XPUB, public config)
- Secrets are never exposed in workflow logs
