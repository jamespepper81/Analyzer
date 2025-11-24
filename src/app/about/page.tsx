import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IconContainer } from '@/components/ui/icon-container';
import { ThemeToggle } from '@/components/theme-toggle';
import { 
  Brain, 
  Shield, 
  Eye, 
  BarChart3, 
  Lock, 
  Zap,
  Bitcoin,
  CheckCircle,
  ArrowRight,
  Users,
  Globe,
  Target,
  Lightbulb
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'About BitSleuth - AI Bitcoin Wallet Analyzer | Security & Privacy Tool',
  description: 'Learn about BitSleuth, the leading AI-powered Bitcoin wallet analyzer. Discover how our advanced security analysis, privacy tools, and transaction insights help Bitcoin users worldwide.',
  keywords: [
    'Bitcoin wallet analyzer',
    'Bitcoin security tool',
    'AI Bitcoin analysis',
    'Bitcoin wallet scanner',
    'Bitcoin privacy analyzer',
    'Bitcoin security audit',
    'Bitcoin wallet insights',
    'Bitcoin transaction analysis',
    'Bitcoin privacy tool',
    'Bitcoin wallet checker'
  ],
  openGraph: {
    title: 'About BitSleuth - AI Bitcoin Wallet Analyzer | Security & Privacy Tool',
    description: 'Learn about BitSleuth, the leading AI-powered Bitcoin wallet analyzer. Discover how our advanced security analysis, privacy tools, and transaction insights help Bitcoin users worldwide.',
    type: 'website',
  },
};

const capabilities = [
  {
    icon: Brain,
    title: 'AI-Powered Analysis',
    description: 'Advanced machine learning algorithms analyze Bitcoin wallet patterns, behaviors, and security postures to provide intelligent insights and recommendations.',
    features: [
      'Pattern recognition in transaction flows',
      'Anomaly detection for suspicious activity',
      'Predictive analysis for security risks',
      'Intelligent recommendations for wallet optimization'
    ]
  },
  {
    icon: Shield,
    title: 'Comprehensive Security Assessment',
    description: 'Multi-layered security analysis covering all aspects of Bitcoin wallet security, from address reuse to dust attack detection.',
    features: [
      'Address reuse detection and analysis',
      'Dust attack identification and prevention',
      'OpSec risk assessment and scoring',
      'Security vulnerability scanning'
    ]
  },
  {
    icon: Eye,
    title: 'Privacy Analysis & Protection',
    description: 'Deep privacy analysis to identify potential leaks and provide recommendations for maintaining Bitcoin privacy best practices.',
    features: [
      'Privacy leak detection and analysis',
      'Transaction graph analysis',
      'Address clustering and deanonymization risk assessment',
      'Privacy improvement recommendations'
    ]
  },
  {
    icon: BarChart3,
    title: 'Advanced Transaction Analytics',
    description: 'Comprehensive transaction analysis with visualizations, performance metrics, and behavioral insights.',
    features: [
      'Transaction flow visualization',
      'Performance and profitability analysis',
      'Volume and frequency pattern analysis',
      'Historical trend analysis and reporting'
    ]
  }
];

const useCases = [
  {
    title: 'Bitcoin Security Auditing',
    description: 'Professional security auditors use BitSleuth to assess Bitcoin wallet security for clients, identifying vulnerabilities and providing comprehensive security reports.',
    icon: Target
  },
  {
    title: 'Privacy-Conscious Bitcoin Users',
    description: 'Privacy-focused Bitcoin users rely on BitSleuth to analyze their wallet privacy practices and get recommendations for maintaining anonymity.',
    icon: Eye
  },
  {
    title: 'Bitcoin Developers & Researchers',
    description: 'Developers and researchers use BitSleuth to analyze Bitcoin transaction patterns, study wallet behaviors, and conduct blockchain research.',
    icon: Lightbulb
  },
  {
    title: 'Bitcoin Portfolio Management',
    description: 'Bitcoin holders use BitSleuth to track their portfolio performance, analyze transaction patterns, and optimize their Bitcoin holdings.',
    icon: BarChart3
  }
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header with Theme Toggle */}
      <header className="absolute top-0 right-0 p-4 z-10">
        <ThemeToggle />
      </header>
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-4">
            <Brain className="w-3 h-3 mr-1" />
            AI-Powered Bitcoin Analysis
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            About <span className="text-primary">BitSleuth</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            BitSleuth is the most advanced AI-powered Bitcoin wallet analyzer, designed to provide comprehensive 
            security insights, privacy analysis, and transaction intelligence for Bitcoin users worldwide. 
            Our cutting-edge technology helps users understand their Bitcoin wallet's security posture and optimize their privacy practices.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/">
                Try BitSleuth Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/landing">
                Learn More
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
          <p className="text-lg text-muted-foreground mb-8">
            To democratize Bitcoin security and privacy analysis by providing powerful, accessible tools 
            that help every Bitcoin user understand and improve their wallet's security posture. We believe 
            that security and privacy should be accessible to everyone, not just technical experts.
          </p>
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <Card className="border-2 shadow-md">
              <CardHeader className="text-center bg-gradient-to-br from-blue-500/5 via-transparent to-transparent">
                <div className="flex justify-center mb-2">
                  <IconContainer variant="blue">
                    <Globe className="h-5 w-5" />
                  </IconContainer>
                </div>
                <CardTitle>Global Access</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Available worldwide with support for all major Bitcoin wallet types and formats.
                </p>
              </CardContent>
            </Card>
            <Card className="border-2 shadow-md">
              <CardHeader className="text-center bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent">
                <div className="flex justify-center mb-2">
                  <IconContainer variant="emerald">
                    <Lock className="h-5 w-5" />
                  </IconContainer>
                </div>
                <CardTitle>Privacy First</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Your private keys never leave your device. We only analyze public blockchain data.
                </p>
              </CardContent>
            </Card>
            <Card className="border-2 shadow-md">
              <CardHeader className="text-center bg-gradient-to-br from-amber-500/5 via-transparent to-transparent">
                <div className="flex justify-center mb-2">
                  <IconContainer variant="amber">
                    <Zap className="h-5 w-5" />
                  </IconContainer>
                </div>
                <CardTitle>Instant Results</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Get comprehensive analysis results in seconds, not hours or days.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section className="container mx-auto px-4 py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Advanced Capabilities</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              BitSleuth combines cutting-edge AI technology with deep Bitcoin expertise to provide 
              insights that go far beyond basic wallet analysis.
            </p>
          </div>
          <div className="grid lg:grid-cols-2 gap-8">
            {capabilities.map((capability, index) => (
              <Card key={index} className="h-full border-2 shadow-md">
                <CardHeader className="bg-gradient-to-br from-primary/5 via-transparent to-transparent border-b">
                  <div className="flex items-center gap-3 mb-2">
                    <IconContainer variant="primary">
                      <capability.icon className="h-5 w-5" />
                    </IconContainer>
                    <CardTitle className="text-xl">{capability.title}</CardTitle>
                  </div>
                  <CardDescription className="text-base">
                    {capability.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {capability.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Who Uses BitSleuth?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              BitSleuth serves a diverse community of Bitcoin users, from individual holders to 
              professional security auditors and researchers.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {useCases.map((useCase, index) => (
              <Card key={index} className="border-2 shadow-md">
                <CardHeader className="bg-gradient-to-br from-primary/5 via-transparent to-transparent border-b">
                  <div className="flex items-center gap-3">
                    <IconContainer variant="primary">
                      <useCase.icon className="h-5 w-5" />
                    </IconContainer>
                    <CardTitle className="text-lg">{useCase.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{useCase.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="container mx-auto px-4 py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Powered by Advanced Technology</h2>
          <p className="text-lg text-muted-foreground mb-8">
            BitSleuth leverages state-of-the-art AI and machine learning technologies, 
            combined with comprehensive Bitcoin blockchain data, to provide the most 
            accurate and insightful wallet analysis available.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-2 shadow-md">
              <CardHeader className="text-center bg-gradient-to-br from-primary/5 via-transparent to-transparent">
                <div className="flex justify-center mb-2">
                  <IconContainer variant="primary">
                    <Brain className="h-5 w-5" />
                  </IconContainer>
                </div>
                <CardTitle className="text-sm">AI & ML</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Advanced artificial intelligence and machine learning algorithms
                </p>
              </CardContent>
            </Card>
            <Card className="border-2 shadow-md">
              <CardHeader className="text-center bg-gradient-to-br from-orange-500/5 via-transparent to-transparent">
                <div className="flex justify-center mb-2">
                  <IconContainer variant="orange">
                    <Bitcoin className="h-5 w-5" />
                  </IconContainer>
                </div>
                <CardTitle className="text-sm">Bitcoin Expertise</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Deep understanding of Bitcoin's security model and privacy considerations
                </p>
              </CardContent>
            </Card>
            <Card className="border-2 shadow-md">
              <CardHeader className="text-center bg-gradient-to-br from-blue-500/5 via-transparent to-transparent">
                <div className="flex justify-center mb-2">
                  <IconContainer variant="blue">
                    <Globe className="h-5 w-5" />
                  </IconContainer>
                </div>
                <CardTitle className="text-sm">Blockchain Data</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Comprehensive access to Bitcoin blockchain data from multiple sources
                </p>
              </CardContent>
            </Card>
            <Card className="border-2 shadow-md">
              <CardHeader className="text-center bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent">
                <div className="flex justify-center mb-2">
                  <IconContainer variant="emerald">
                    <Shield className="h-5 w-5" />
                  </IconContainer>
                </div>
                <CardTitle className="text-sm">Security Focus</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Built with security and privacy as core principles
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to Analyze Your Bitcoin Wallet?</h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of Bitcoin users who trust BitSleuth for their wallet security analysis. 
            Get started in seconds with just your Bitcoin XPUB key.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/">
                Start Analysis Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/landing">
                Learn More
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
