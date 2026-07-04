'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Info } from 'lucide-react';
import BasicReportPage from './basic-page';
import EnhancedReportPage from './enhanced-page';

export default function ReportWrapper() {
  const [activeView, setActiveView] = useState<'enhanced' | 'basic'>('enhanced');

  return (
    <div className="space-y-6">
      <Alert className="bg-gradient-to-r from-warning/10 via-primary/10 to-warning/5 border-warning/30 shadow-md">
        <Sparkles className="h-5 w-5 text-warning" />
        <AlertTitle className="text-lg font-bold">Enhanced Tax Reporting</AlertTitle>
        <AlertDescription className="leading-relaxed">
          Professional-grade Bitcoin tax reporting with multiple accounting methods and jurisdiction-specific rules.
          This tool helps you understand your tax obligations and optimize your tax strategy.
        </AlertDescription>
      </Alert>

      <Alert variant="default" className="border-info/30 bg-gradient-to-r from-info/10 to-cyan-500/5 shadow-sm">
        <AlertTitle className="text-sm font-semibold flex items-center gap-2">
          <Info className="h-4 w-4" />
          Tax Professional Disclaimer
        </AlertTitle>
        <AlertDescription className="text-xs leading-relaxed mt-2">
          This tool provides informational tax calculations only. It is NOT tax, legal, or financial advice.
          Tax laws are complex and vary by jurisdiction. Always consult a qualified tax professional or CPA
          before making tax-related decisions or filing returns. BitSleuth is not responsible for any errors,
          omissions, or tax consequences resulting from use of this tool.
        </AlertDescription>
      </Alert>

      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'enhanced' | 'basic')} className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto md:mx-0 grid-cols-2 shadow-md">
          <TabsTrigger value="enhanced" className="data-[state=active]:shadow-sm transition-all">
            <Sparkles className="h-4 w-4 mr-2" />
            Enhanced Tax Report
          </TabsTrigger>
          <TabsTrigger value="basic" className="data-[state=active]:shadow-sm transition-all">Basic Report</TabsTrigger>
        </TabsList>

        <TabsContent value="enhanced" className="mt-6">
          <EnhancedReportPage />
        </TabsContent>

        <TabsContent value="basic" className="mt-6">
          <BasicReportPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
