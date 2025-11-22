/**
 * @fileOverview Tax report export utilities for CSV and formatted text output
 * Generates exports compatible with tax software and accountant review
 */

import { format } from 'date-fns';
import JSZip from 'jszip';
import type { EnhancedTaxReportOutput, DisposalDetail, IncomeDetail, TaxLotDetail } from './types';

/**
 * Convert data to CSV format
 */
function arrayToCSV(data: any[][]): string {
  return data.map(row => 
    row.map(cell => {
      const str = String(cell ?? '');
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  ).join('\n');
}

/**
 * Generate CSV for capital gains (Form 8949 compatible for US)
 */
export function generateCapitalGainsCSV(
  disposals: DisposalDetail[],
  jurisdiction: string,
  currency: string
): string {
  const headers = [
    'Description',
    'Date Acquired',
    'Date Sold',
    'Proceeds',
    'Cost Basis',
    'Gain/Loss',
    'Term',
    'Amount (BTC)'
  ];

  const rows = disposals.map(disposal => {
    const avgAcquisitionDate = disposal.lots.length > 0
      ? new Date(disposal.lots.reduce((sum, lot) => sum + new Date(lot.acquisitionDate).getTime(), 0) / disposal.lots.length)
      : new Date(disposal.date);
    
    const avgHoldingDays = disposal.lots.length > 0
      ? disposal.lots.reduce((sum, lot) => sum + lot.holdingPeriodDays, 0) / disposal.lots.length
      : 0;
    
    // Determine if long-term (US: 365 days)
    const isLongTerm = avgHoldingDays >= 365;
    const term = isLongTerm ? 'Long-term' : 'Short-term';
    
    return [
      `Bitcoin (${disposal.type})`,
      format(avgAcquisitionDate, 'MM/dd/yyyy'),
      format(new Date(disposal.date), 'MM/dd/yyyy'),
      disposal.proceeds.toFixed(2),
      disposal.costBasis.toFixed(2),
      disposal.realizedGain.toFixed(2),
      term,
      disposal.amount.toFixed(8)
    ];
  });

  return arrayToCSV([headers, ...rows]);
}

/**
 * Generate CSV for income events
 */
export function generateIncomeCSV(
  income: IncomeDetail[],
  currency: string
): string {
  const headers = [
    'Date',
    'Description',
    'Amount (BTC)',
    'Fair Market Value',
    'Currency'
  ];

  const rows = income.map(event => [
    format(new Date(event.date), 'MM/dd/yyyy'),
    `Bitcoin ${event.type}`,
    event.amount.toFixed(8),
    event.fairMarketValue.toFixed(2),
    currency
  ]);

  return arrayToCSV([headers, ...rows]);
}

/**
 * Generate CSV for tax lots (inventory)
 */
export function generateTaxLotsCSV(
  lots: TaxLotDetail[],
  currency: string
): string {
  const headers = [
    'Lot ID',
    'Date Acquired',
    'Amount (BTC)',
    'Cost Basis',
    'Cost Per Unit',
    'Current Value',
    'Unrealized Gain/Loss',
    'Holding Period (Days)',
    'Term',
    'Address'
  ];

  const rows = lots.map(lot => [
    lot.id,
    format(new Date(lot.date), 'MM/dd/yyyy'),
    lot.remaining.toFixed(8),
    lot.costBasis.toFixed(2),
    lot.costPerUnit.toFixed(2),
    lot.currentValue.toFixed(2),
    lot.unrealizedGain.toFixed(2),
    lot.holdingPeriodDays.toString(),
    lot.taxCategory === 'LONG_TERM' ? 'Long-term' : 'Short-term',
    lot.address || 'N/A'
  ]);

  return arrayToCSV([headers, ...rows]);
}

/**
 * Generate comprehensive tax summary CSV
 */
export function generateTaxSummaryCSV(
  report: EnhancedTaxReportOutput,
  currency: string
): string {
  const { summary } = report;
  
  const data = [
    ['Bitcoin Tax Report Summary'],
    ['Reporting Period', `${format(new Date(summary.startDate), 'MM/dd/yyyy')} to ${format(new Date(summary.endDate), 'MM/dd/yyyy')}`],
    ['Accounting Method', report.accountingMethod],
    ['Jurisdiction', report.jurisdiction],
    ['Currency', currency],
    [],
    ['Capital Gains Summary'],
    ['Short-term Capital Gains', summary.shortTermGains.toFixed(2)],
    ['Long-term Capital Gains', summary.longTermGains.toFixed(2)],
    ['Total Capital Gains', summary.totalCapitalGains.toFixed(2)],
    [],
    ['Income Summary'],
    ['Ordinary Income (Mining/Staking)', summary.ordinaryIncome.toFixed(2)],
    [],
    ['Portfolio Summary'],
    ['Starting Value', summary.startValue.toFixed(2)],
    ['Ending Value', summary.endValue.toFixed(2)],
    ['Cost Basis', summary.costBasis.toFixed(2)],
    ['Unrealized Gains/Losses', summary.unrealizedGains.toFixed(2)],
    [],
    ['Tax Optimization Opportunities'],
    ['Harvestable Short-term Losses', (-summary.harvestableShortTermLosses).toFixed(2)],
    ['Harvestable Long-term Losses', (-summary.harvestableLongTermLosses).toFixed(2)],
    [],
    ['Transaction Summary'],
    ['Total Inflow', summary.inflow.toFixed(2)],
    ['Total Outflow', summary.outflow.toFixed(2)],
    ['Deductible Fees', summary.deductibleFees.toFixed(2)],
  ];

  return arrayToCSV(data);
}

/**
 * Generate Form 8949 compatible data (US IRS)
 */
export function generateForm8949Data(
  disposals: DisposalDetail[],
  currency: string
): { shortTerm: string; longTerm: string } {
  const shortTermDisposals: DisposalDetail[] = [];
  const longTermDisposals: DisposalDetail[] = [];

  // Classify disposals by term
  for (const disposal of disposals) {
    const avgHoldingDays = disposal.lots.reduce((sum, lot) => sum + lot.holdingPeriodDays, 0) / disposal.lots.length;
    if (avgHoldingDays >= 365) {
      longTermDisposals.push(disposal);
    } else {
      shortTermDisposals.push(disposal);
    }
  }

  const headers = [
    'Description of Property',
    'Date Acquired',
    'Date Sold',
    'Proceeds',
    'Cost Basis',
    'Code',
    'Amount of Adjustment',
    'Gain or Loss'
  ];

  const formatDisposals = (disposalList: DisposalDetail[]) => {
    return disposalList.map(disposal => {
      const avgAcquisitionDate = disposal.lots.length > 0
        ? new Date(disposal.lots.reduce((sum, lot) => sum + new Date(lot.acquisitionDate).getTime(), 0) / disposal.lots.length)
        : new Date(disposal.date);
      
      return [
        `${disposal.amount.toFixed(8)} Bitcoin`,
        format(avgAcquisitionDate, 'MM/dd/yyyy'),
        format(new Date(disposal.date), 'MM/dd/yyyy'),
        disposal.proceeds.toFixed(2),
        disposal.costBasis.toFixed(2),
        '', // Code (blank for now)
        '0.00', // Adjustment (blank for now)
        disposal.realizedGain.toFixed(2)
      ];
    });
  };

  const shortTermRows = formatDisposals(shortTermDisposals);
  const longTermRows = formatDisposals(longTermDisposals);

  const shortTerm = arrayToCSV([
    ['Form 8949 - Part I - Short-Term Capital Gains and Losses'],
    headers,
    ...shortTermRows,
    [],
    ['Totals', '', '', 
      shortTermDisposals.reduce((sum, d) => sum + d.proceeds, 0).toFixed(2),
      shortTermDisposals.reduce((sum, d) => sum + d.costBasis, 0).toFixed(2),
      '',
      '0.00',
      shortTermDisposals.reduce((sum, d) => sum + d.realizedGain, 0).toFixed(2)
    ]
  ]);

  const longTerm = arrayToCSV([
    ['Form 8949 - Part II - Long-Term Capital Gains and Losses'],
    headers,
    ...longTermRows,
    [],
    ['Totals', '', '', 
      longTermDisposals.reduce((sum, d) => sum + d.proceeds, 0).toFixed(2),
      longTermDisposals.reduce((sum, d) => sum + d.costBasis, 0).toFixed(2),
      '',
      '0.00',
      longTermDisposals.reduce((sum, d) => sum + d.realizedGain, 0).toFixed(2)
    ]
  ]);

  return { shortTerm, longTerm };
}

/**
 * Generate a text-based tax report for printing/PDF
 */
export function generateTextReport(
  report: EnhancedTaxReportOutput,
  currency: string,
  currencySymbol: string
): string {
  const { summary } = report;
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('           BITCOIN TAX REPORT');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Report Period: ${format(new Date(summary.startDate), 'MMMM dd, yyyy')} - ${format(new Date(summary.endDate), 'MMMM dd, yyyy')}`);
  lines.push(`Accounting Method: ${report.accountingMethod}`);
  lines.push(`Tax Jurisdiction: ${report.jurisdiction}`);
  lines.push(`Currency: ${currency}`);
  lines.push('');
  lines.push('───────────────────────────────────────────────────────────');
  lines.push('CAPITAL GAINS SUMMARY');
  lines.push('───────────────────────────────────────────────────────────');
  lines.push(`Short-term Capital Gains:    ${currencySymbol}${summary.shortTermGains.toFixed(2)}`);
  lines.push(`Long-term Capital Gains:     ${currencySymbol}${summary.longTermGains.toFixed(2)}`);
  lines.push(`Total Capital Gains:         ${currencySymbol}${summary.totalCapitalGains.toFixed(2)}`);
  lines.push('');
  lines.push('───────────────────────────────────────────────────────────');
  lines.push('INCOME SUMMARY');
  lines.push('───────────────────────────────────────────────────────────');
  lines.push(`Ordinary Income:             ${currencySymbol}${summary.ordinaryIncome.toFixed(2)}`);
  lines.push(`  (Mining, Staking, Airdrops, etc.)`);
  lines.push('');
  lines.push('───────────────────────────────────────────────────────────');
  lines.push('PORTFOLIO SUMMARY');
  lines.push('───────────────────────────────────────────────────────────');
  lines.push(`Starting Value:              ${currencySymbol}${summary.startValue.toFixed(2)}`);
  lines.push(`Ending Value:                ${currencySymbol}${summary.endValue.toFixed(2)}`);
  lines.push(`Total Value Change:          ${currencySymbol}${summary.totalValueChange.toFixed(2)} (${summary.totalValueChangePercentage.toFixed(2)}%)`);
  lines.push(`Cost Basis:                  ${currencySymbol}${summary.costBasis.toFixed(2)}`);
  lines.push(`Unrealized Gains/Losses:     ${currencySymbol}${summary.unrealizedGains.toFixed(2)}`);
  lines.push('');
  lines.push('───────────────────────────────────────────────────────────');
  lines.push('TAX OPTIMIZATION');
  lines.push('───────────────────────────────────────────────────────────');
  lines.push(`Harvestable Short-term Losses: ${currencySymbol}${(-summary.harvestableShortTermLosses).toFixed(2)}`);
  lines.push(`Harvestable Long-term Losses:  ${currencySymbol}${(-summary.harvestableLongTermLosses).toFixed(2)}`);
  lines.push('');
  lines.push('───────────────────────────────────────────────────────────');
  lines.push('TRANSACTION SUMMARY');
  lines.push('───────────────────────────────────────────────────────────');
  lines.push(`Total Inflow:                ${currencySymbol}${summary.inflow.toFixed(2)}`);
  lines.push(`Total Outflow:               ${currencySymbol}${summary.outflow.toFixed(2)}`);
  lines.push(`Deductible Fees:             ${currencySymbol}${summary.deductibleFees.toFixed(2)}`);
  lines.push('');
  lines.push('───────────────────────────────────────────────────────────');
  lines.push('DISPOSAL DETAILS');
  lines.push('───────────────────────────────────────────────────────────');
  
  if (report.disposals.length === 0) {
    lines.push('No disposal events during this period.');
  } else {
    report.disposals.forEach((disposal, idx) => {
      const avgHoldingDays = disposal.lots.reduce((sum, lot) => sum + lot.holdingPeriodDays, 0) / disposal.lots.length;
      const term = avgHoldingDays >= 365 ? 'Long-term' : 'Short-term';
      
      lines.push(`${idx + 1}. ${format(new Date(disposal.date), 'MMM dd, yyyy')} - ${disposal.type}`);
      lines.push(`   Amount: ${disposal.amount.toFixed(8)} BTC`);
      lines.push(`   Proceeds: ${currencySymbol}${disposal.proceeds.toFixed(2)}`);
      lines.push(`   Cost Basis: ${currencySymbol}${disposal.costBasis.toFixed(2)}`);
      lines.push(`   Gain/Loss: ${currencySymbol}${disposal.realizedGain.toFixed(2)} (${term})`);
      lines.push('');
    });
  }

  lines.push('───────────────────────────────────────────────────────────');
  lines.push('INCOME DETAILS');
  lines.push('───────────────────────────────────────────────────────────');
  
  if (report.income.length === 0) {
    lines.push('No income events during this period.');
  } else {
    report.income.forEach((income, idx) => {
      lines.push(`${idx + 1}. ${format(new Date(income.date), 'MMM dd, yyyy')} - ${income.type}`);
      lines.push(`   Amount: ${income.amount.toFixed(8)} BTC`);
      lines.push(`   Fair Market Value: ${currencySymbol}${income.fairMarketValue.toFixed(2)}`);
      lines.push('');
    });
  }

  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('DISCLAIMER');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('This report is for informational purposes only and does not');
  lines.push('constitute tax, legal, or financial advice. Tax laws vary by');
  lines.push('jurisdiction and individual circumstances. Always consult');
  lines.push('with a qualified tax professional before making tax-related');
  lines.push('decisions.');
  lines.push('');
  lines.push(`Generated: ${format(new Date(), 'MMMM dd, yyyy HH:mm:ss')}`);
  lines.push('═══════════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Trigger browser download of a file
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export all tax data as a single ZIP file containing all reports
 */
export async function exportFullTaxPackage(
  report: EnhancedTaxReportOutput,
  currency: string,
  currencySymbol: string
) {
  try {
    const timestamp = format(new Date(), 'yyyy-MM-dd');
    
    // Create a new ZIP file
    const zip = new JSZip();
    
    // Generate all reports
    const summary = generateTaxSummaryCSV(report, currency);
    const capitalGains = generateCapitalGainsCSV(report.disposals, report.jurisdiction, currency);
    const income = generateIncomeCSV(report.income, currency);
    const lots = generateTaxLotsCSV(report.lots, currency);
    const textReport = generateTextReport(report, currency, currencySymbol);
    const form8949 = generateForm8949Data(report.disposals, currency);
    
    // Add all files to the ZIP
    zip.file(`bitcoin-tax-summary-${timestamp}.csv`, summary);
    zip.file(`bitcoin-capital-gains-${timestamp}.csv`, capitalGains);
    zip.file(`bitcoin-income-${timestamp}.csv`, income);
    zip.file(`bitcoin-tax-lots-${timestamp}.csv`, lots);
    zip.file(`bitcoin-tax-report-${timestamp}.txt`, textReport);
    
    // Add Form 8949 for US jurisdiction
    if (report.jurisdiction === 'US') {
      zip.file(`form-8949-short-term-${timestamp}.csv`, form8949.shortTerm);
      zip.file(`form-8949-long-term-${timestamp}.csv`, form8949.longTerm);
    }
    
    // Generate the ZIP file as a blob with compression
    const zipBlob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    
    // Download the ZIP file
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bitcoin-tax-package-${timestamp}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to generate tax package ZIP:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to generate tax package: ${errorMessage}`);
  }
}
