'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Sparkles } from 'lucide-react';
import BasicReportPage from './basic-page';
import EnhancedReportPage from './enhanced-page';

export default function ReportWrapper() {
  const [activeView, setActiveView] = useState<'enhanced' | 'basic'>('enhanced');

  return (
    <div className="space-y-6">
      <Alert className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <AlertTitle>Enhanced Tax Reporting</AlertTitle>
        <AlertDescription>
          Professional-grade Bitcoin tax reporting with multiple accounting methods and jurisdiction-specific rules.
          This tool helps you understand your tax obligations and optimize your tax strategy.
        </AlertDescription>
      </Alert>

      <Alert variant="default" className="border-blue-500/20 bg-blue-500/5">
        <AlertTitle className="text-sm font-semibold">Tax Professional Disclaimer</AlertTitle>
        <AlertDescription className="text-xs">
          This tool provides informational tax calculations only. It is NOT tax, legal, or financial advice.
          Tax laws are complex and vary by jurisdiction. Always consult a qualified tax professional or CPA
          before making tax-related decisions or filing returns. BitSleuth is not responsible for any errors,
          omissions, or tax consequences resulting from use of this tool.
        </AlertDescription>
      </Alert>

      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'enhanced' | 'basic')} className="w-full">
        <TabsList>
          <TabsTrigger value="enhanced">
            <Sparkles className="h-4 w-4 mr-2" />
            Enhanced Tax Report
          </TabsTrigger>
          <TabsTrigger value="basic">Basic Report</TabsTrigger>
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
