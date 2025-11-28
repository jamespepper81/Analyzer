# GitHub Workflows for BitSleuth Analyzer

## Auto-close Won't Do Issues Workflow

The `auto-close-wont-do.yml` workflow automatically closes issues when their status is set to "Won't Do" in GitHub Projects v2.

### Triggers

- **`schedule`** - Automatic trigger At 00:00 on every 10th day-of-month:
  - Checks all open issues in the repository
  - Closes any issues with "Won't Do" status
  - Runs continuously without manual intervention
- **`workflow_dispatch`** - Manual trigger with inputs:
  - `issue_number` (required) - The issue number to check and close if Won't Do
- **`issues`** - Fallback trigger on issue events (rarely fires for project status changes):
  - `edited` - When issue title, body, or other fields are edited
  - `labeled` - When a label is added to an issue
  - `unlabeled` - When a label is removed from an issue

### How It Works

1. **Scheduled Run (At 00:00 on every 10th day-of-month):**
   - Automatically checks all open issues in the repository
   - Queries each issue's status in GitHub Projects v2
   - Closes any issues with "Won't Do" status
   
2. **Manual Trigger:**
   - Checks a specific issue number provided by the user
   - Useful for immediate closure without waiting for scheduled run
   
3. **Issue Event Trigger (Fallback):**
   - Triggers when an issue is edited or labeled
   - Provides immediate response when other issue changes are made

4. **For each issue with "Won't Do" status:**
   - Closes the issue with `state_reason: 'not_planned'`
   - Adds a comment explaining the automatic closure

### Important Notes

⚠️ **Projects V2 Events Not Supported**: The `projects_v2_item` event is NOT supported as a workflow trigger by GitHub Actions. While this event exists as a webhook, it cannot be used in the `on:` section of workflow files.

**Solution Implemented:**
- Uses a **scheduled trigger (At 00:00 on every 10th day-of-month)** to automatically check all open issues
- This ensures issues are closed within 00:00 on every 10th day-of-month of status change to "Won't Do"
- No manual intervention required after setting status to "Won't Do"

**Permissions:**
- `issues: write` - Required to close issues and add comments
- `repository-projects: read` - Required to read GitHub Projects v2 data via GraphQL API
- `contents: read` - Standard permission for workflow operations

⚠️ **Organization-level Projects V2 Access:**

The default `GITHUB_TOKEN` **cannot** read organization-level Projects V2 items. If your issues are in an organization project (not a repository project), the workflow will report "Issue #X is not in any project" even though it is.

**Solutions:**

1. **For Repository-level Projects:**
   - No additional setup needed
   - The default `GITHUB_TOKEN` works automatically
   - This is the recommended approach for public repositories

2. **For Organization-level Projects:**
   - Create a fine-grained PAT with `read:org` and `read:project` scopes
   - Go to **Settings > Developer settings > Personal access tokens > Fine-grained tokens**
   - Create a token with:
     - `read:org` permission (to read organization data)
     - `read:project` permission (to read Projects V2 data)
   - Add it as a repository secret named `PROJECT_TOKEN`
   - **The workflow automatically uses PROJECT_TOKEN when available**
   - Works for both scheduled and manual triggers

### Usage

#### Automatic Closure (Recommended)
1. Set an issue's status to "Won't Do" in your GitHub Projects v2 board
2. Wait up to 10th day-of-month for the scheduled workflow to run
3. The workflow will automatically detect and close the issue

#### Manual Trigger (Immediate Closure)
For immediate closure without waiting for the scheduled run:
1. Set the issue status to "Won't Do" in the project board
2. Go to **Actions** tab
3. Select **Auto-close Won't Do Issues**
4. Click **Run workflow**
5. Enter the issue number
6. The workflow will immediately check and close the issue if "Won't Do"

### Testing

To test the workflow:
1. Set an issue's status to "Won't Do" in the project board
2. Option A: Wait up to 00:00 on every 10th day-of-month for automatic closure
3. Option B: Manually trigger the workflow with the issue number for immediate testing

### Troubleshooting

**Issue not closing automatically:**
- Verify the issue is in a GitHub Projects v2 board
- Check that the Status field is set exactly to "Won't Do" (case-sensitive)
- Ensure the workflow has proper permissions (issues: write, repository-projects: read)
- Review workflow logs in the Actions tab for errors

**"Issue #X is not in any project. Skipping." error:**

This error appears when the workflow cannot access the project data. Common causes:

1. **Organization-level project (Most Common):**
   - Your issues are in an **organization project**, not a repository project
   - The default `GITHUB_TOKEN` lacks permissions to read organization projects
   - **Solution:** Either:
     - Move issues to a repository-level project, OR
     - Set up a PAT with `read:org` and `read:project` scopes (see instructions above)

2. **Issue not actually in a project:**
   - Check that the issue is actually added to a Projects V2 board
   - Classic Projects (V1) are not supported

3. **Permission issue:**
   - Verify `repository-projects: read` permission is in the workflow
   - Check workflow run logs for GraphQL errors

**How to tell if you have org-level vs repo-level projects:**
- Repository projects: URL like `https://github.com/owner/repo/projects/1`
- Organization projects: URL like `https://github.com/orgs/org-name/projects/1`

**GraphQL returns empty projectItems:**
- This usually indicates an organization-level project
- The workflow now logs detailed debug information
- Check the workflow logs for the `totalCount` value
- If `totalCount > 0` but no items returned, it's an org project permission issue

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
