# Testing the Google Sheets Feedback Fix

## What Was Fixed

The feedback submission feature has been enhanced with:

1. **Better Secret Manager Support** - Handles private keys from Google Cloud Secret Manager correctly
   (both escaped and actual newlines)
2. **Comprehensive Logging** - Shows exactly what's happening at each step
3. **Detailed Error Messages** - Provides specific troubleshooting hints for each error type

## How to Test

### Step 1: Deploy the Fix

Deploy the updated code to your Firebase App Hosting environment:

```bash
git pull origin copilot/fix-feedback-submission-issue
firebase deploy --only hosting
```

### Step 2: Submit Test Feedback

1. Navigate to your deployed app: `https://your-app.web.app/feedback`
2. Enter at least 10 characters of feedback (required minimum)
3. Click "Send Feedback"
4. You should see a success message

### Step 3: Check the Logs

View the server logs to see detailed diagnostic information:

**Option A: Using gcloud CLI**
```bash
# View recent Google Sheets logs
gcloud logging read "resource.type=cloud_run_revision AND textPayload:'Google Sheets'" \
  --limit 50 \
  --project YOUR_PROJECT_ID \
  --format json

# Or view all recent logs
gcloud logging read "resource.type=cloud_run_revision" \
  --limit 100 \
  --project YOUR_PROJECT_ID
```

**Option B: Using Cloud Console**
1. Go to [Google Cloud Console > Logging](https://console.cloud.google.com/logs)
2. Select your project
3. Filter by:
   - Resource: Cloud Run Revision
   - Search: `Google Sheets`

### Step 4: Interpret the Logs

#### ✅ **Success Case** - Everything Working
You should see logs like this:
```
[Google Sheets] Credentials loaded successfully {
  spreadsheetId: "1a2b3c4d5e...",
  clientEmail: "your-service-account@...",
  privateKeyLength: 1704
}

[Google Sheets] Feedback successfully written to sheet {
  updatedRange: "Sheet1!A2:G2",
  updatedRows: 1,
  category: "Bug Report"
}
```

**If you see this:** ✅ Everything is working! Check your Google Sheet to confirm the feedback appeared.

#### ⚠️ **Missing Credentials**
```
[Google Sheets] Credentials not configured. Missing: {
  hasSpreadsheetId: true,
  hasClientEmail: true,
  hasPrivateKey: false,
  privateKeyPrefix: "undefined"
}
```

**What this means:** One or more secrets are not being loaded from Secret Manager.

**How to fix:**
1. Verify secrets exist in Secret Manager:
   ```bash
   gcloud secrets list --project YOUR_PROJECT_ID | grep GOOGLE_SHEETS
   ```

2. Check each secret has a value:
   ```bash
   gcloud secrets versions access latest --secret="GOOGLE_SHEETS_ID" --project YOUR_PROJECT_ID
   gcloud secrets versions access latest --secret="GOOGLE_SHEETS_CLIENT_EMAIL" --project YOUR_PROJECT_ID
   gcloud secrets versions access latest --secret="GOOGLE_SHEETS_PRIVATE_KEY" --project YOUR_PROJECT_ID | head -c 100
   ```

3. Verify Firebase App Hosting can access the secrets:
   - Go to IAM & Admin in Cloud Console
   - Find the service account used by Firebase App Hosting
   - Ensure it has the "Secret Manager Secret Accessor" role

4. Redeploy after fixing secrets

#### ❌ **Error: Permission Denied (403)**
```
[Google Sheets] Error writing feedback to sheet: {
  errorMessage: "The caller does not have permission",
  errorCode: 403
}
[Google Sheets] Permission denied...
[Google Sheets] Troubleshooting: Check: 1) Sheet is shared with service-account@your-project.iam.gserviceaccount.com...
```

**What this means:** The service account doesn't have access to the Google Sheet.

**How to fix:**
1. Open your Google Sheet
2. Click "Share" button (top right)
3. Add the service account email shown in the logs
4. Grant "Editor" access
5. Click "Send"
6. Try submitting feedback again (no redeploy needed)

#### ❌ **Error: Spreadsheet Not Found (404)**
```
[Google Sheets] Error writing feedback to sheet: {
  errorMessage: "Requested entity was not found",
  errorCode: 404
}
[Google Sheets] Spreadsheet not found...
[Google Sheets] Troubleshooting: Spreadsheet ID: 1a2b3c4d5e...
```

**What this means:** The spreadsheet ID in Secret Manager is incorrect or the sheet doesn't exist.

**How to fix:**
1. Get the correct spreadsheet ID from your Google Sheet URL:
   ```
   https://docs.google.com/spreadsheets/d/{THIS_IS_THE_SPREADSHEET_ID}/edit
   ```
2. Update the secret:
   ```bash
   echo -n "YOUR_CORRECT_SPREADSHEET_ID" | \
     gcloud secrets versions add GOOGLE_SHEETS_ID --data-file=- --project YOUR_PROJECT_ID
   ```
3. Redeploy to use the new secret version

#### ❌ **Error: Invalid Credentials (invalid_grant)**
```
[Google Sheets] Error writing feedback to sheet: {
  errorMessage: "invalid_grant: Invalid JWT Signature"
}
[Google Sheets] Invalid credentials...
[Google Sheets] Troubleshooting: Verify the private key format includes BEGIN/END markers...
```

**What this means:** The private key format is incorrect or incomplete.

**How to fix:**
1. Re-download the service account key from Google Cloud Console:
   - Go to IAM & Admin > Service Accounts
   - Click on your service account
   - Go to "Keys" tab
   - Add Key > Create new key > JSON
   - Download the JSON file

2. Extract the private key from the JSON:
   ```bash
   cat your-key-file.json | jq -r '.private_key'
   ```

3. Update the secret with the private key:
   ```bash
   # Method 1: Store with escaped newlines (recommended)
   cat your-key-file.json | jq -r '.private_key' | sed 's/$/\\n/g' | tr -d '\n' | \
     gcloud secrets versions add GOOGLE_SHEETS_PRIVATE_KEY --data-file=- --project YOUR_PROJECT_ID
   
   # Method 2: Store with actual newlines (also works)
   cat your-key-file.json | jq -r '.private_key' | \
     gcloud secrets versions add GOOGLE_SHEETS_PRIVATE_KEY --data-file=- --project YOUR_PROJECT_ID
   ```

4. Redeploy to use the new secret version

#### ❌ **Error: Sheet Not Found (Unable to parse range)**
```
[Google Sheets] Error writing feedback to sheet: {
  errorMessage: "Unable to parse range: Sheet1!A1"
}
[Google Sheets] Invalid range...
[Google Sheets] Troubleshooting: Check that the sheet tab is named exactly "Sheet1"...
```

**What this means:** The sheet tab is not named "Sheet1" (case-sensitive).

**How to fix:**
1. Open your Google Sheet
2. Right-click on the sheet tab at the bottom
3. Select "Rename"
4. Name it exactly "Sheet1" (case-sensitive)
5. Try submitting feedback again (no redeploy needed)

### Step 5: Verify in Google Sheet

If the logs show success, verify the feedback appears in your Google Sheet:

1. Open the Google Sheet
2. You should see a new row with:
   - Timestamp
   - IP Address
   - Category (Bug Report, Feature Request, etc.)
   - Sentiment (Positive, Negative, Neutral)
   - Summary (one-sentence AI-generated summary)
   - Full Feedback (original text)
   - Full JSON (complete feedback object)

### Common Issues and Solutions

#### Issue: Logs show success but no data in sheet
**Solution:** You might be looking at the wrong sheet or tab. Ensure:
- You're looking at the correct Google Sheet (match the spreadsheet ID)
- You're on the "Sheet1" tab
- Data is being appended (scroll down to see new rows)

#### Issue: Can't find any logs
**Solution:** 
1. Ensure you submitted feedback after deploying the fix
2. Wait 1-2 minutes for logs to appear
3. Try a broader search in Cloud Logging without filters
4. Check you're looking at the correct project

#### Issue: Multiple errors in logs
**Solution:** Fix them in order:
1. First fix missing credentials (if any)
2. Then fix permission denied (if needed)
3. Finally check for other errors

## Expected Behavior

### With Credentials Configured Correctly
- ✅ Feedback form submits successfully
- ✅ User sees success message
- ✅ Logs show "Credentials loaded successfully"
- ✅ Logs show "Feedback successfully written to sheet"
- ✅ New row appears in Google Sheet

### With Credentials Missing/Incorrect
- ✅ Feedback form still submits successfully
- ✅ User sees success message
- ⚠️ Logs show warning about missing/incorrect credentials
- ⚠️ No row added to Google Sheet
- ℹ️ Feedback is still processed by AI (not lost)

The feature is designed to fail gracefully - users can always submit feedback even if Google Sheets integration has issues.

## Need More Help?

See the comprehensive troubleshooting guide:
- [docs/GOOGLE_SHEETS_TROUBLESHOOTING.md](./GOOGLE_SHEETS_TROUBLESHOOTING.md)

Or check the code implementation:
- [src/services/googleSheets.ts](../src/services/googleSheets.ts)
