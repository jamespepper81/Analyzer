

'use server';

import { google } from 'googleapis';
import type { FeedbackOutput } from '@/ai/flows/feedback-flow';

/**
 * Appends a new row of processed feedback data to the configured Google Sheet.
 * This function requires GOOGLE_SHEETS_ID_FEEDBACK (or GOOGLE_SHEETS_ID), GOOGLE_SHEETS_CLIENT_EMAIL, and
 * GOOGLE_SHEETS_PRIVATE_KEY to be set in the environment variables.
 *
 * @param feedbackData The structured feedback object to be added to the sheet.
 */
export async function appendToSheet(feedbackData: FeedbackOutput): Promise<void> {
  const { category, summary, sentiment, originalFeedback, ipAddress } = feedbackData;

  const spreadsheetId = process.env.GOOGLE_SHEETS_ID_FEEDBACK || process.env.GOOGLE_SHEETS_ID;
  const client_email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  // The private key can come from .env file or Google Cloud Secret Manager.
  // Handle both escaped newlines (\n as text) and actual newlines.
  let private_key = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  
  // If the private key has escaped newlines (common in .env files), convert them to actual newlines
  if (private_key && private_key.includes('\\n')) {
    private_key = private_key.replace(/\\n/g, '\n');
  }

  if (!spreadsheetId || !client_email || !private_key) {
    // Log a warning for developers but don't crash the app.
    // The feedback is still processed by the AI, it's just not saved to the sheet.
    const missingVars: string[] = [];
    if (!spreadsheetId) missingVars.push('GOOGLE_SHEETS_ID_FEEDBACK or GOOGLE_SHEETS_ID');
    if (!client_email) missingVars.push('GOOGLE_SHEETS_CLIENT_EMAIL');
    if (!private_key) missingVars.push('GOOGLE_SHEETS_PRIVATE_KEY');
    
    console.warn('[Google Sheets] ⚠️  Configuration incomplete - Google Sheets export disabled');
    console.warn(`[Google Sheets] Missing environment variables: ${missingVars.join(', ')}`);
    console.warn('[Google Sheets] To enable Google Sheets export:');
    console.warn('  1. Create a Google Cloud service account');
    console.warn('  2. Enable the Google Sheets API');
    console.warn('  3. Add these environment variables to your .env file:');
    missingVars.forEach(varName => {
      console.warn(`     - ${varName}`);
    });
    console.warn('[Google Sheets] Feedback is still processed by AI and returned to the user.\n');
    return; // Exit gracefully
  }
  
  // Validate private key format
  if (!private_key.includes('-----BEGIN PRIVATE KEY-----') || !private_key.includes('-----END PRIVATE KEY-----')) {
    console.error('[Google Sheets] ❌ Invalid private key format');
    console.error('[Google Sheets] The private key must include BEGIN and END markers');
    console.error('[Google Sheets] Expected format: -----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n');
    console.error('[Google Sheets] Check your .env file and ensure newlines are escaped as \\n\n');
    return; // Exit gracefully
  }
  
  // Log successful credential loading (without exposing sensitive data)
  console.log('[Google Sheets] ✅ Credentials loaded successfully', {
    spreadsheetId: spreadsheetId.substring(0, 10) + '...',
    clientEmail: client_email.substring(0, 20) + '...',
    privateKeyLength: private_key.length,
    hasBeginMarker: private_key.includes('-----BEGIN PRIVATE KEY-----'),
    hasEndMarker: private_key.includes('-----END PRIVATE KEY-----')
  });

  try {
    // Authenticate with Google using the individual service account credential components.
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email,
        private_key,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Prepare the row data in the correct order for the sheet.
    // New column order: Timestamp, IP Address, Category, Sentiment, Summary, Full Feedback, Full JSON
    const newRow = [
      new Date().toISOString(),
      ipAddress || 'N/A', // Add IP address
      category,
      sentiment,
      summary,
      originalFeedback,
      JSON.stringify(feedbackData, null, 2), // Full JSON for debugging/backup
    ];

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      // The range where new data will be appended. 'Sheet1' is the default name.
      range: 'Sheet1!A1',
      // How the input data should be interpreted.
      valueInputOption: 'USER_ENTERED',
      // The data to append.
      requestBody: {
        values: [newRow],
      },
    });
    
    console.log('[Google Sheets] ✅ Feedback successfully written to sheet', {
      updatedRange: response.data.updates?.updatedRange,
      updatedRows: response.data.updates?.updatedRows,
      category: category,
      sentiment: sentiment,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    // Detailed error logging for debugging
    console.error('[Google Sheets] Error writing feedback to sheet:', {
      errorMessage: error.message,
      errorCode: error.code,
      errorStatus: error.status,
      errorName: error.name,
      errorStack: error.stack?.split('\n')[0] // First line of stack trace
    });
    
    // Categorize the error and provide actionable guidance
    let errorCategory;
    let troubleshootingSteps: string[] = [];
    
    if (error.code === 403 || error.message?.includes('PERMISSION_DENIED')) {
        errorCategory = 'Permission Denied';
        troubleshootingSteps = [
          `Share the Google Sheet with service account: ${client_email}`,
          'Grant "Editor" permissions to the service account',
          'Verify the Sheets API is enabled in your Google Cloud project',
          'Check the Google Cloud Console > APIs & Services > Enabled APIs'
        ];
    } else if (error.code === 404 || error.message?.includes('Requested entity was not found')) {
        errorCategory = 'Spreadsheet Not Found';
        troubleshootingSteps = [
          `Verify GOOGLE_SHEETS_ID: ${spreadsheetId?.substring(0, 20)}...`,
          'Ensure the spreadsheet exists and is accessible',
          'Check that the spreadsheet ID is correct in your .env file'
        ];
    } else if (error.message?.includes('Unable to parse range')) {
        errorCategory = 'Invalid Range';
        troubleshootingSteps = [
          'Ensure the target sheet tab is named exactly "Sheet1" (case-sensitive)',
          'Open the spreadsheet and verify the sheet tab name',
          'If using a different name, update the range in googleSheets.ts'
        ];
    } else if (error.message?.includes('invalid_grant') || error.message?.includes('invalid_client')) {
        errorCategory = 'Invalid Credentials';
        troubleshootingSteps = [
          'Verify GOOGLE_SHEETS_CLIENT_EMAIL is correct',
          'Check that GOOGLE_SHEETS_PRIVATE_KEY includes -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----',
          'Ensure newlines in the private key are properly escaped as \\n in .env file',
          'Regenerate service account key from Google Cloud Console if needed'
        ];
    } else if (error.message?.includes('API key not valid') || error.message?.includes('API_KEY_INVALID')) {
        errorCategory = 'Invalid API Key';
        troubleshootingSteps = [
          'Verify the service account credentials are correctly configured',
          'Check that the API key restrictions in Google Cloud Console allow Sheets API',
          'Ensure the service account has not been deleted'
        ];
    } else {
        errorCategory = 'Unexpected Error';
        troubleshootingSteps = [
          'Check the error message above for specific details',
          'Verify all environment variables are set correctly',
          'Ensure the Google Sheets API is enabled in your project',
          'Check server logs for additional context'
        ];
    }

    // Log actionable error information
    console.error(`\n[Google Sheets] ❌ ${errorCategory}`);
    console.error('[Google Sheets] Troubleshooting Steps:');
    troubleshootingSteps.forEach((step, index) => {
      console.error(`  ${index + 1}. ${step}`);
    });
    console.error('[Google Sheets] Note: This is an optional feature. Feedback is still processed by AI.\n');
    
    // Don't throw - this is optional functionality that shouldn't break the user experience
  }
}
