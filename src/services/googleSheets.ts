

'use server';

import { google } from 'googleapis';
import type { FeedbackOutput } from '@/ai/flows/feedback-flow';

/**
 * Appends a new row of processed feedback data to the configured Google Sheet.
 * This function requires GOOGLE_SHEETS_ID, GOOGLE_SHEETS_CLIENT_EMAIL, and
 * GOOGLE_SHEETS_PRIVATE_KEY to be set in the environment variables.
 *
 * @param feedbackData The structured feedback object to be added to the sheet.
 */
export async function appendToSheet(feedbackData: FeedbackOutput): Promise<void> {
  const { category, summary, sentiment, originalFeedback, ipAddress } = feedbackData;

  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
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
    console.warn('[Google Sheets] Credentials not configured. Missing:', {
      hasSpreadsheetId: !!spreadsheetId,
      hasClientEmail: !!client_email,
      hasPrivateKey: !!private_key,
      privateKeyPrefix: private_key?.substring(0, 30) || 'undefined'
    });
    console.warn('Google Sheets feedback export is disabled. Feedback will still be processed by AI.');
    return; // Exit gracefully
  }
  
  // Log successful credential loading (without exposing sensitive data)
  console.log('[Google Sheets] Credentials loaded successfully', {
    spreadsheetId: spreadsheetId.substring(0, 10) + '...',
    clientEmail: client_email.substring(0, 20) + '...',
    privateKeyLength: private_key.length
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
    
    console.log('[Google Sheets] Feedback successfully written to sheet', {
      updatedRange: response.data.updates?.updatedRange,
      updatedRows: response.data.updates?.updatedRows,
      category: category
    });
  } catch (error: any) {
    console.error('[Google Sheets] Error writing feedback to sheet:', {
      errorMessage: error.message,
      errorCode: error.code,
      errorStatus: error.status,
      errorName: error.name
    });
    
    let userMessage = 'Failed to write to Google Sheet. Please check the server logs for details.';
    let troubleshootingHint = '';
    
    if (error.code === 403 || error.message?.includes('PERMISSION_DENIED')) {
        userMessage = "Permission denied. Please ensure your service account has 'Editor' access to the Google Sheet and that the Sheets API is enabled in your Google Cloud project.";
        troubleshootingHint = `Check: 1) Sheet is shared with ${process.env.GOOGLE_SHEETS_CLIENT_EMAIL?.substring(0, 30)}... 2) Sheets API is enabled in Google Cloud Console`;
    } else if (error.code === 404) {
        userMessage = "Spreadsheet not found. Please verify the GOOGLE_SHEETS_ID in your environment variables is correct.";
        troubleshootingHint = `Spreadsheet ID: ${process.env.GOOGLE_SHEETS_ID?.substring(0, 20)}...`;
    } else if (error.message?.includes('Unable to parse range')) {
        userMessage = "Invalid range. Please ensure the target sheet is named 'Sheet1' or update the range in the code.";
        troubleshootingHint = 'Check that the sheet tab is named exactly "Sheet1" (case-sensitive)';
    } else if (error.message?.includes('invalid_grant') || error.message?.includes('invalid_client')) {
        userMessage = "Invalid credentials. The private key or client email may be incorrect.";
        troubleshootingHint = 'Verify the private key format includes BEGIN/END markers and has proper newlines';
    }

    // Do not throw the error to the client, just log it. This is an optional feature.
    console.error(`[Google Sheets] ${userMessage}`);
    if (troubleshootingHint) {
      console.error(`[Google Sheets] Troubleshooting: ${troubleshootingHint}`);
    }
  }
}
