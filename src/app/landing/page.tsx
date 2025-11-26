import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IconContainer } from '@/components/ui/icon-container';
import { ThemeToggle } from '@/components/theme-toggle';
import { 
  Shield, 
  Brain, 
  Eye,
  TrendingUp,
  Lock,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Bitcoin,
  Zap,
  Users,
  Globe
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'BitSleuth - Free AI Bitcoin Wallet Analyzer & Security Tool',
  description: 'The most advanced AI-powered Bitcoin wallet analyzer. Get comprehensive security insights, privacy analysis, and transaction patterns for any Bitcoin wallet. Free Bitcoin wallet scanner with AI technology.',
  keywords: [
    'Bitcoin wallet analyzer',
    'Bitcoin security tool',
    'AI Bitcoin analysis',
    'Bitcoin wallet scanner',
    'Bitcoin privacy analyzer',
    'free Bitcoin wallet checker',
    'Bitcoin security audit',
    'Bitcoin wallet insights',
    'Bitcoin transaction analysis',
    'Bitcoin privacy tool'
  ],
  openGraph: {
    title: 'BitSleuth - Free AI Bitcoin Wallet Analyzer & Security Tool',
    description: 'The most advanced AI-powered Bitcoin wallet analyzer. Get comprehensive security insights, privacy analysis, and transaction patterns for any Bitcoin wallet.',
    type: 'website',
  },
};

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Analysis',
    description: 'Advanced artificial intelligence analyzes your Bitcoin wallet for security vulnerabilities, privacy issues, and transaction patterns.',
  },
  {
    icon: Shield,
    title: 'Security Assessment',
    description: 'Comprehensive security analysis including address reuse detection, dust attack identification, and opsec risk evaluation.',
  },
  {
    icon: Eye,
    title: 'Privacy Analysis',
    description: 'Detailed privacy analysis to identify potential leaks and recommend best practices for Bitcoin privacy.',
  },
  {
    icon: BarChart3,
    title: 'Transaction Insights',
    description: 'Deep dive into your transaction history with visualizations, patterns, and performance analysis.',
  },
  {
    icon: TrendingUp,
    title: 'Market Integration',
    description: 'Real-time Bitcoin market data, mempool monitoring, and price analysis integrated with your wallet data.',
  },
  {
    icon: Lock,
    title: 'Secure & Private',
    description: 'Your private keys never leave your device. Only public blockchain data is analyzed for complete security.',
  },
];

const benefits = [
  'Identify security vulnerabilities in your Bitcoin wallet',
  'Detect address reuse and privacy leaks',
  'Analyze transaction patterns and behaviors',
  'Get AI-powered recommendations for better security',
  'Monitor real-time Bitcoin market conditions',
  'Generate comprehensive wallet reports',
  'Track UTXO management and optimization',
  'Access advanced Bitcoin analytics tools',
];

export default function LandingPage() {
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
            <Zap className="w-3 h-3 mr-1" />
            AI-Powered Bitcoin Analysis
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            The Most Advanced{' '}
            <span className="text-primary">Bitcoin Wallet Analyzer</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Get comprehensive AI-powered insights into your Bitcoin wallet's security, privacy, and transaction patterns. 
            The only tool you need to analyze any Bitcoin wallet instantly and securely.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/">
                Analyze Your Wallet
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/market">
                View Market Data
              </Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            <CheckCircle className="w-4 h-4 inline mr-1" />
            Free to use • No registration required • Your keys stay private
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Powerful Bitcoin Analysis Features</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            BitSleuth combines cutting-edge AI technology with comprehensive Bitcoin blockchain analysis 
            to provide insights you won't find anywhere else.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="h-full border-2 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="bg-gradient-to-br from-primary/5 via-transparent to-transparent">
                <IconContainer variant="primary">
                  <feature.icon className="h-5 w-5" />
                </IconContainer>
                <CardTitle className="text-lg mt-2">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose BitSleuth?</h2>
            <p className="text-muted-foreground">
              BitSleuth is the most comprehensive Bitcoin wallet analysis tool available, 
              trusted by Bitcoin users worldwide for security and privacy insights.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4">What You Get</h3>
              <ul className="space-y-3">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-6">
              <Card className="border-2 shadow-md">
                <CardHeader className="bg-gradient-to-br from-orange-500/5 via-transparent to-transparent border-b">
                  <CardTitle className="flex items-center gap-2">
                    <IconContainer variant="orange">
                      <Bitcoin className="h-5 w-5" />
                    </IconContainer>
                    Bitcoin Security Focus
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Built specifically for Bitcoin users, with deep understanding of Bitcoin's 
                    security model, privacy considerations, and best practices.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-2 shadow-md">
                <CardHeader className="bg-gradient-to-br from-blue-500/5 via-transparent to-transparent border-b">
                  <CardTitle className="flex items-center gap-2">
                    <IconContainer variant="blue">
                      <Globe className="h-5 w-5" />
                    </IconContainer>
                    Global Bitcoin Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Access to comprehensive Bitcoin blockchain data from multiple sources 
                    for the most accurate and up-to-date analysis.
                  </p>
                </CardContent>
              </Card>
            </div>
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
              <Link href="/discover">
                Explore Bitcoin Data
              </Link>
            </Button>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>10,000+ Users</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              <span>100% Secure</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-4 w-4" />
              <span>Instant Results</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Is BitSleuth safe to use?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes, BitSleuth is completely safe. We only analyze public blockchain data using your Bitcoin XPUB key. 
                  Your private keys never leave your device and are never transmitted to our servers.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>What is a Bitcoin XPUB key?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  An XPUB (Extended Public Key) is a public key that allows viewing wallet addresses and transaction history 
                  without exposing your private keys. It's safe to share and is commonly used for wallet analysis.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Do I need to create an account?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  No account required! BitSleuth works entirely in your browser. Simply enter your Bitcoin XPUB key 
                  and start analyzing your wallet immediately.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>What types of analysis does BitSleuth provide?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  BitSleuth provides comprehensive analysis including security assessment, privacy analysis, 
                  transaction pattern recognition, address reuse detection, dust attack identification, 
                  and AI-powered recommendations for better Bitcoin security.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
