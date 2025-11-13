import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import type { FeedbackOutput } from '@/ai/flows/feedback-flow';

/**
 * POST /api/feedback
 * Submits feedback to Google Sheets
 * 
 * Request body: { feedbackData: FeedbackOutput }
 * Response: { success: true } or { error: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const feedbackData: FeedbackOutput = body.feedbackData;

    if (!feedbackData) {
      return NextResponse.json(
        { error: 'Missing feedback data' },
        { status: 400 }
      );
    }

    const { category, summary, sentiment, originalFeedback, ipAddress } = feedbackData;

    // Get environment variables
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID_FEEDBACK || process.env.GOOGLE_SHEETS_ID;
    const client_email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    let private_key = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

    // Handle escaped newlines in private key
    if (private_key && private_key.includes('\\n')) {
      private_key = private_key.replace(/\\n/g, '\n');
    }

    // Check if credentials are configured
    if (!spreadsheetId || !client_email || !private_key) {
      const missingVars: string[] = [];
      if (!spreadsheetId) missingVars.push('GOOGLE_SHEETS_ID_FEEDBACK or GOOGLE_SHEETS_ID');
      if (!client_email) missingVars.push('GOOGLE_SHEETS_CLIENT_EMAIL');
      if (!private_key) missingVars.push('GOOGLE_SHEETS_PRIVATE_KEY');

      console.warn('[Feedback API] ⚠️  Google Sheets not configured. Missing:', missingVars.join(', '));
      
      // Return success anyway - Google Sheets is optional
      return NextResponse.json({ 
        success: true,
        warning: 'Feedback processed but not saved to Google Sheets (credentials not configured)'
      });
    }

    // Validate private key format
    if (!private_key.includes('-----BEGIN PRIVATE KEY-----') || !private_key.includes('-----END PRIVATE KEY-----')) {
      console.error('[Feedback API] ❌ Invalid private key format');
      return NextResponse.json({ 
        success: true,
        warning: 'Feedback processed but not saved to Google Sheets (invalid private key format)'
      });
    }

    // Authenticate with Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email,
        private_key,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Prepare row data
    const newRow = [
      new Date().toISOString(),
      ipAddress || 'N/A',
      category,
      sentiment,
      summary,
      originalFeedback,
      JSON.stringify(feedbackData, null, 2),
    ];

    // Append to sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [newRow],
      },
    });

    console.log('[Feedback API] ✅ Feedback successfully written to sheet', {
      updatedRange: response.data.updates?.updatedRange,
      updatedRows: response.data.updates?.updatedRows,
      category,
      sentiment,
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Feedback API] Error:', {
      errorMessage: error.message,
      errorCode: error.code,
      errorStatus: error.status,
      errorName: error.name,
    });

    // Categorize error for better debugging
    let errorCategory = 'Unknown Error';
    let troubleshootingHint = '';

    if (error.code === 403 || error.message?.includes('PERMISSION_DENIED')) {
      errorCategory = 'Permission Denied';
      troubleshootingHint = 'Share the Google Sheet with the service account and grant Editor permissions';
    } else if (error.code === 404 || error.message?.includes('Requested entity was not found')) {
      errorCategory = 'Spreadsheet Not Found';
      troubleshootingHint = 'Verify GOOGLE_SHEETS_ID_FEEDBACK in environment variables';
    } else if (error.message?.includes('Unable to parse range')) {
      errorCategory = 'Invalid Range';
      troubleshootingHint = 'Ensure sheet tab is named "Sheet1"';
    } else if (error.message?.includes('invalid_grant') || error.message?.includes('invalid_client')) {
      errorCategory = 'Invalid Credentials';
      troubleshootingHint = 'Check private key format and client email';
    }

    console.error(`[Feedback API] ❌ ${errorCategory}: ${troubleshootingHint}`);

    // Return error response
    return NextResponse.json(
      { 
        error: `Failed to save feedback to Google Sheets: ${errorCategory}`,
        details: troubleshootingHint 
      },
      { status: 500 }
    );
  }
}
