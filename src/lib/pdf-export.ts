/**
 * @fileOverview PDF export utilities for tax reports
 * Generates professional PDF documents compatible with tax filing requirements
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { EnhancedTaxReportOutput, DisposalDetail, IncomeDetail, TaxLotDetail } from './types';

/**
 * Generate a comprehensive tax report PDF
 */
export function generateTaxReportPDF(
  report: EnhancedTaxReportOutput,
  currency: string,
  currencySymbol: string
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Helper to add page if needed
  const checkAddPage = (requiredSpace: number = 40) => {
    if (yPosition + requiredSpace > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
      return true;
    }
    return false;
  };

  // Helper to format currency
  const formatCurrency = (value: number) => {
    return `${currencySymbol}${value.toFixed(2)}`;
  };

  // ===== TITLE PAGE =====
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Bitcoin Tax Report', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${format(new Date(report.summary.startDate), 'MMMM dd, yyyy')} - ${format(new Date(report.summary.endDate), 'MMMM dd, yyyy')}`,
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  );

  yPosition += 10;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Accounting Method: ${report.accountingMethod}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;
  doc.text(`Tax Jurisdiction: ${report.jurisdiction}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;
  doc.text(`Currency: ${currency}`, pageWidth / 2, yPosition, { align: 'center' });

  doc.setTextColor(0);
  yPosition += 20;

  // ===== EXECUTIVE SUMMARY =====
  checkAddPage(60);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 14, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const summaryData = [
    ['Total Capital Gains', formatCurrency(report.summary.totalCapitalGains)],
    ['Short-term Capital Gains', formatCurrency(report.summary.shortTermGains)],
    ['Long-term Capital Gains', formatCurrency(report.summary.longTermGains)],
    ['Ordinary Income', formatCurrency(report.summary.ordinaryIncome)],
    ['Unrealized Gains/Losses', formatCurrency(report.summary.unrealizedGains)],
    ['Cost Basis', formatCurrency(report.summary.costBasis)],
    ['Deductible Fees', formatCurrency(report.summary.deductibleFees)],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Category', 'Amount']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 100 },
      1: { halign: 'right', cellWidth: 80 },
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // ===== CAPITAL GAINS SECTION =====
  checkAddPage();
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Capital Gains & Disposals', 14, yPosition);
  yPosition += 10;

  if (report.disposals.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('No disposal events during this period.', 14, yPosition);
    yPosition += 10;
  } else {
    const disposalData = report.disposals.map((disposal) => {
      const avgHoldingDays = disposal.lots.reduce((sum, lot) => sum + lot.holdingPeriodDays, 0) / disposal.lots.length;
      const term = avgHoldingDays >= report.jurisdictionRules.longTermHoldingPeriodDays ? 'Long' : 'Short';
      
      return [
        format(new Date(disposal.date), 'MM/dd/yyyy'),
        disposal.type,
        disposal.amount.toFixed(8),
        formatCurrency(disposal.proceeds),
        formatCurrency(disposal.costBasis),
        formatCurrency(disposal.realizedGain),
        term,
      ];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Date', 'Type', 'Amount (BTC)', 'Proceeds', 'Cost Basis', 'Gain/Loss', 'Term']],
      body: disposalData,
      theme: 'striped',
      headStyles: { fillColor: [52, 152, 219], textColor: 255 },
      styles: { fontSize: 8 },
      columnStyles: {
        2: { halign: 'right', fontStyle: 'normal' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right', fontStyle: 'bold' },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // ===== INCOME SECTION =====
  if (report.income.length > 0) {
    checkAddPage();
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Ordinary Income', 14, yPosition);
    yPosition += 10;

    const incomeData = report.income.map((income) => [
      format(new Date(income.date), 'MM/dd/yyyy'),
      income.type,
      income.amount.toFixed(8),
      formatCurrency(income.fairMarketValue),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Date', 'Type', 'Amount (BTC)', 'Fair Market Value']],
      body: incomeData,
      theme: 'striped',
      headStyles: { fillColor: [46, 204, 113], textColor: 255 },
      styles: { fontSize: 9 },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // ===== TAX LOTS SECTION =====
  if (report.lots.length > 0) {
    checkAddPage();
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Active Tax Lots', 14, yPosition);
    yPosition += 10;

    const lotsData = report.lots.map((lot) => {
      const isLongTerm = lot.holdingPeriodDays >= report.jurisdictionRules.longTermHoldingPeriodDays;
      
      return [
        format(new Date(lot.date), 'MM/dd/yyyy'),
        lot.remaining.toFixed(8),
        formatCurrency(lot.costPerUnit * lot.remaining),
        formatCurrency(lot.currentValue),
        formatCurrency(lot.unrealizedGain),
        isLongTerm ? 'Long' : 'Short',
      ];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Acquired', 'Amount (BTC)', 'Cost Basis', 'Current Value', 'Unrealized Gain', 'Term']],
      body: lotsData,
      theme: 'striped',
      headStyles: { fillColor: [155, 89, 182], textColor: 255 },
      styles: { fontSize: 8 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right', fontStyle: 'bold' },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // ===== TAX OPTIMIZATION SECTION =====
  checkAddPage(40);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Tax Optimization Opportunities', 14, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const optimizationData = [
    ['Harvestable Short-term Losses', formatCurrency(-report.summary.harvestableShortTermLosses)],
    ['Harvestable Long-term Losses', formatCurrency(-report.summary.harvestableLongTermLosses)],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Opportunity', 'Amount']],
    body: optimizationData,
    theme: 'grid',
    headStyles: { fillColor: [230, 126, 34], textColor: 255 },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { halign: 'right', cellWidth: 70 },
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // ===== DISCLAIMER =====
  checkAddPage(50);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Important Disclaimer', 14, yPosition);
  yPosition += 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const disclaimerText = [
    'This report is for informational purposes only and does not constitute tax, legal,',
    'or financial advice. Tax laws vary by jurisdiction and individual circumstances.',
    'Always consult with a qualified tax professional before making tax-related decisions.',
    '',
    'The calculations in this report are based on the information provided and the',
    'accounting method selected. Actual tax liability may differ based on additional',
    'factors not captured in this analysis.',
  ];

  disclaimerText.forEach((line) => {
    doc.text(line, 14, yPosition);
    yPosition += 5;
  });

  yPosition += 5;
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(
    `Generated: ${format(new Date(), 'MMMM dd, yyyy HH:mm:ss')}`,
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  );

  // Add page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - 14,
      pageHeight - 10,
      { align: 'right' }
    );
  }

  return doc;
}

/**
 * Generate Form 8949 PDF (US IRS)
 */
export function generateForm8949PDF(
  disposals: DisposalDetail[],
  currency: string,
  currencySymbol: string,
  taxYear: number
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // Classify disposals
  const shortTermDisposals = disposals.filter((d) => {
    const avgHoldingDays = d.lots.reduce((sum, lot) => sum + lot.holdingPeriodDays, 0) / d.lots.length;
    return avgHoldingDays < 365;
  });

  const longTermDisposals = disposals.filter((d) => {
    const avgHoldingDays = d.lots.reduce((sum, lot) => sum + lot.holdingPeriodDays, 0) / d.lots.length;
    return avgHoldingDays >= 365;
  });

  const formatCurrency = (value: number) => `${currencySymbol}${value.toFixed(2)}`;

  // ===== PART I - SHORT-TERM =====
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Form 8949 - Part I', 14, yPosition);
  yPosition += 7;
  doc.setFontSize(12);
  doc.text('Short-Term Capital Gains and Losses', 14, yPosition);
  yPosition += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tax Year: ${taxYear}`, 14, yPosition);
  yPosition += 10;

  if (shortTermDisposals.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.text('No short-term disposals.', 14, yPosition);
    yPosition += 10;
  } else {
    const shortTermData = shortTermDisposals.map((d) => {
      const avgAcquisitionDate = d.lots.length > 0
        ? new Date(d.lots.reduce((sum, lot) => sum + new Date(lot.acquisitionDate).getTime(), 0) / d.lots.length)
        : new Date(d.date);
      
      return [
        `${d.amount.toFixed(8)} BTC`,
        format(avgAcquisitionDate, 'MM/dd/yyyy'),
        format(new Date(d.date), 'MM/dd/yyyy'),
        formatCurrency(d.proceeds),
        formatCurrency(d.costBasis),
        '',
        '0.00',
        formatCurrency(d.realizedGain),
      ];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Description', 'Date Acquired', 'Date Sold', 'Proceeds', 'Cost Basis', 'Code', 'Adjustment', 'Gain/Loss']],
      body: shortTermData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 8 },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right', fontStyle: 'bold' },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // Totals
    const totalProceeds = shortTermDisposals.reduce((sum, d) => sum + d.proceeds, 0);
    const totalCostBasis = shortTermDisposals.reduce((sum, d) => sum + d.costBasis, 0);
    const totalGain = shortTermDisposals.reduce((sum, d) => sum + d.realizedGain, 0);

    doc.setFont('helvetica', 'bold');
    doc.text('Totals:', 14, yPosition);
    doc.text(formatCurrency(totalProceeds), 100, yPosition, { align: 'right' });
    doc.text(formatCurrency(totalCostBasis), 130, yPosition, { align: 'right' });
    doc.text(formatCurrency(totalGain), 190, yPosition, { align: 'right' });
  }

  // ===== PART II - LONG-TERM =====
  doc.addPage();
  yPosition = 20;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Form 8949 - Part II', 14, yPosition);
  yPosition += 7;
  doc.setFontSize(12);
  doc.text('Long-Term Capital Gains and Losses', 14, yPosition);
  yPosition += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tax Year: ${taxYear}`, 14, yPosition);
  yPosition += 10;

  if (longTermDisposals.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.text('No long-term disposals.', 14, yPosition);
  } else {
    const longTermData = longTermDisposals.map((d) => {
      const avgAcquisitionDate = d.lots.length > 0
        ? new Date(d.lots.reduce((sum, lot) => sum + new Date(lot.acquisitionDate).getTime(), 0) / d.lots.length)
        : new Date(d.date);
      
      return [
        `${d.amount.toFixed(8)} BTC`,
        format(avgAcquisitionDate, 'MM/dd/yyyy'),
        format(new Date(d.date), 'MM/dd/yyyy'),
        formatCurrency(d.proceeds),
        formatCurrency(d.costBasis),
        '',
        '0.00',
        formatCurrency(d.realizedGain),
      ];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Description', 'Date Acquired', 'Date Sold', 'Proceeds', 'Cost Basis', 'Code', 'Adjustment', 'Gain/Loss']],
      body: longTermData,
      theme: 'grid',
      headStyles: { fillColor: [46, 204, 113], textColor: 255 },
      styles: { fontSize: 8 },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right', fontStyle: 'bold' },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // Totals
    const totalProceeds = longTermDisposals.reduce((sum, d) => sum + d.proceeds, 0);
    const totalCostBasis = longTermDisposals.reduce((sum, d) => sum + d.costBasis, 0);
    const totalGain = longTermDisposals.reduce((sum, d) => sum + d.realizedGain, 0);

    doc.setFont('helvetica', 'bold');
    doc.text('Totals:', 14, yPosition);
    doc.text(formatCurrency(totalProceeds), 100, yPosition, { align: 'right' });
    doc.text(formatCurrency(totalCostBasis), 130, yPosition, { align: 'right' });
    doc.text(formatCurrency(totalGain), 190, yPosition, { align: 'right' });
  }

  return doc;
}

/**
 * Download PDF file
 */
export function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}
