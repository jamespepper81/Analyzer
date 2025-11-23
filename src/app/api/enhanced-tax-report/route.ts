import { NextRequest, NextResponse } from 'next/server';
import { getEnhancedTaxReport } from '@/ai/flows/enhanced-tax-report-flow';
import type { EnhancedTaxReportInput } from '@/ai/flows/enhanced-tax-report-flow';

/**
 * POST /api/enhanced-tax-report
 * Generates an enhanced tax report with multiple accounting methods
 * 
 * Request body: EnhancedTaxReportInput
 * Response: EnhancedTaxReportOutput or { error: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body: EnhancedTaxReportInput = await request.json();

    // Validate required fields
    if (!body.walletData || !body.startDate || !body.endDate || !body.currency) {
      return NextResponse.json(
        { error: 'Missing required fields: walletData, startDate, endDate, currency' },
        { status: 400 }
      );
    }

    // Generate the enhanced tax report using the server function
    const report = await getEnhancedTaxReport(body);

    return NextResponse.json(report);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[Enhanced Tax Report API] Error:', {
      errorMessage,
      errorStack,
    });

    return NextResponse.json(
      { 
        error: 'Failed to generate enhanced tax report',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
