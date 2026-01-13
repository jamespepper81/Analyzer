
'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ExplorerNode } from '@/components/ui/explorer-node';
import { IconContainer } from '@/components/ui/icon-container';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Network, Loader2, AlertCircle, GitGraph, ListTree } from 'lucide-react';
import { getAddressData, getTransactionData, getAddressStats } from '@/lib/blockchain-api';
import type { AddressInfo, Transaction } from '@/lib/types';
import dynamic from 'next/dynamic';
import { FullPageLoader } from '@/components/ui/loader';
import { Separator } from '@/components/ui/separator';
import { useWallet } from '@/contexts/wallet-context';

const formSchema = z.object({
  identifier: z.string().min(10, {
    error: 'Please enter a valid Bitcoin address or transaction ID.',
  }),
});

type InterestLevel = 'high' | 'medium' | 'low';
type GraphNode = { id: string; type: 'address' | 'transaction'; color: string; val: number; depth: number, interestLevel: InterestLevel, value?: number };
type GraphLink = { source: string | GraphNode; target: string | GraphNode; value: number };

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
    ssr: false,
    loading: () => <FullPageLoader />
});

// Function to determine the forensic "interest level" of a node.
const getNodeInterestLevel = (
  type: 'address' | 'transaction',
  nodeInfo: any
): InterestLevel => {
  if (!nodeInfo) return 'low';

  if (type === 'address') {
    const txCount = (nodeInfo as AddressInfo).n_tx ?? 0;
    if (txCount >= 100) return 'high'; // Address with many transactions
    if (txCount >= 20) return 'medium';
    return 'low';
  }

  if (type === 'transaction') {
    const tx = nodeInfo as Transaction;
    const inputCount = tx.inputs?.length || 0;
    const outputCount = tx.outputs?.length || 0;
    // High fee rate could indicate urgency or complex script
    const feeRate = tx.fee > 0 && tx.size > 0 ? tx.fee / tx.size : 0;

    if (inputCount > 50 || outputCount > 50) return 'high'; // "Fan-out" or "consolidation" transaction
    if (feeRate > 200 && tx.fee > 100000) return 'high'; // Very high fee rate
    if (inputCount > 10 || outputCount > 10) return 'medium';
    if (feeRate > 100) return 'medium';
    return 'low';
  }

  return 'low';
};

const INTEREST_COLORS = {
    high: '#dc2626', // red-600
    medium: '#f59e0b', // amber-500
    low: {
        address: '#F7931A', // Bitcoin orange
        transaction: '#FF69B4',
    }
}

// Function to calculate node size based on balance for a more intuitive visualization
const calculateNodeSize = (balanceInSats: number) => {
    if (balanceInSats <= 0) return 4;
    // Use a logarithmic scale to prevent extreme size differences
    // Clamp the value between a min and max size
    const size = Math.log2(balanceInSats / 1e3 + 1) * 1.5;
    return Math.max(4, Math.min(25, size));
};


export default function DiscoverPage() {
  const [rootIdentifier, setRootIdentifier] = useState<{ identifier: string; type: 'address' | 'transaction' } | null>(null);
  const [activeTab, setActiveTab] = useState('list');

  // State for the graph view
  const fgRef = useRef<any>(null);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[], links: GraphLink[] }>({ nodes: [], links: [] });
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [processedIds, setProcessedIds] = useState(new Set());
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const { fiatPrice, currency } = useWallet();


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      identifier: '',
    },
  });
  
  const resetGraph = () => {
    setGraphData({ nodes: [], links: [] });
    setProcessedIds(new Set());
    setGraphError(null);
  };

  const fetchAndExpandNode = useCallback(async (identifier: string, type: 'address' | 'transaction', depth: number) => {
    if (processedIds.has(identifier)) return;
    
    // Prevent excessive depth expansion to maintain performance
    if (depth > 3) {
      console.warn('Maximum expansion depth reached');
      return;
    }

    setIsLoadingGraph(true);
    setGraphError(null);
    setProcessedIds(prev => new Set(prev).add(identifier));

    let newNodes: GraphNode[] = [];
    let newLinks: GraphLink[] = [];

    if (type === 'address') {
        const { data, error } = await getAddressData(identifier);
        if (error) {
            setGraphError(error);
            setIsLoadingGraph(false);
            return;
        }
        if (!data) {
            setIsLoadingGraph(false);
            return;
        }
        
        const transactions = data.transactions.slice(0, 5); // Limit expansion
        for (const tx of transactions) {
            try {
                const { data: txInfo, error: txInfoError } = await getTransactionData(tx.id);
                if (txInfoError) continue;

            const interestLevel = getNodeInterestLevel('transaction', txInfo);
            const color = interestLevel === 'low' ? INTEREST_COLORS.low.transaction : INTEREST_COLORS[interestLevel];
            
            newNodes.push({ id: tx.id, type: 'transaction', color, val: 8, depth: depth + 1, interestLevel });
            newLinks.push({ source: identifier, target: tx.id, value: 1 });
            } catch (error) {
                console.warn(`Failed to fetch transaction ${tx.id}:`, error);
                continue;
            }
        }
    } else { // type === 'transaction'
        const { data, error } = await getTransactionData(identifier);
        if (error) {
            setGraphError(error);
            setIsLoadingGraph(false);
            return;
        }
        if (!data) {
            setIsLoadingGraph(false);
            return;
        }

        const inputs = data.inputs.slice(0, 3);
        const outputs = data.outputs.slice(0, 3);

        for (const input of inputs) {
          if (input.address) {
            try {
                const { data: addrInfo, error: addrInfoError } = await getAddressStats(input.address);
                if (addrInfoError) continue;

            const interestLevel = getNodeInterestLevel('address', addrInfo);
            const color = interestLevel === 'low' ? INTEREST_COLORS.low.address : INTEREST_COLORS[interestLevel];
            const balance = (addrInfo as AddressInfo)?.balance ?? 0;
            
            newNodes.push({ id: input.address, type: 'address', color, val: calculateNodeSize(balance), depth: depth + 1, interestLevel, value: balance });
            newLinks.push({ source: input.address, target: identifier, value: 1 });
            } catch (error) {
                console.warn(`Failed to fetch address ${input.address}:`, error);
                continue;
            }
          }
        }

        for (const output of outputs) {
          if (output.address) {
            try {
                const { data: addrInfo, error: addrInfoError } = await getAddressStats(output.address);
                if (addrInfoError) continue;
            
            const interestLevel = getNodeInterestLevel('address', addrInfo);
            const color = interestLevel === 'low' ? INTEREST_COLORS.low.address : INTEREST_COLORS[interestLevel];
            const balance = (addrInfo as AddressInfo)?.balance ?? 0;

            newNodes.push({ id: output.address, type: 'address', color, val: calculateNodeSize(balance), depth: depth + 1, interestLevel, value: balance });
            newLinks.push({ source: identifier, target: output.address, value: 1 });
            } catch (error) {
                console.warn(`Failed to fetch address ${output.address}:`, error);
                continue;
            }
          }
        }
    }

    setGraphData(prev => {
        // De-duplicate nodes, keeping the latest one if IDs collide
        const allNodes = [...prev.nodes, ...newNodes];
        const uniqueNodes = Array.from(new Map(allNodes.map(node => [node.id, node])).values());

        // De-duplicate links, ensuring consistent key generation
        const allLinks = [...prev.links, ...newLinks];
        const uniqueLinks = Array.from(new Map(allLinks.map(link => {
            const sourceId = typeof link.source === 'object' && link.source !== null ? (link.source as GraphNode).id : link.source;
            const targetId = typeof link.target === 'object' && link.target !== null ? (link.target as GraphNode).id : link.target;
            // Re-create the link object with string IDs to ensure consistency for the graph library
            return [`${sourceId}-${targetId}`, { ...link, source: sourceId, target: targetId }];
        })).values());

        return {
            nodes: uniqueNodes,
            links: uniqueLinks
        };
    });

    setIsLoadingGraph(false);
  }, [processedIds]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    const identifier = values.identifier.trim();
    // Simple validation for txid vs address
    const type = identifier.length === 64 && /^[0-9a-fA-F]+$/.test(identifier) ? 'transaction' : 'address';
    
    setRootIdentifier({ identifier, type });
    resetGraph();

    // The useEffect for `activeTab` will handle the initial graph load,
    // so we don't need to duplicate the logic here.
  }

  useEffect(() => {
    // If we switch to the graph tab and there's a root identifier set,
    // but the graph is empty, we should initialize it. This allows
    // switching between views without re-entering the ID.
    const initializeGraph = async () => {
        if (activeTab === 'graph' && rootIdentifier && graphData.nodes.length === 0) {
            const { identifier, type } = rootIdentifier;
            
            let nodeInfo;
            let nodeValue = 0;
            if (type === 'address') {
                const { data, error } = await getAddressStats(identifier);
                if (error) { setGraphError(error); return; }
                nodeInfo = data;
                nodeValue = (nodeInfo as AddressInfo)?.balance ?? 0;
            } else {
                const { data, error } = await getTransactionData(identifier);
                if (error) { setGraphError(error); return; }
                nodeInfo = data;
                nodeValue = (nodeInfo as Transaction)?.inputs.reduce((sum, i) => sum + (i.value ?? 0), 0);
            }

            const interestLevel = getNodeInterestLevel(type, nodeInfo);
            const color = interestLevel === 'low' ? INTEREST_COLORS.low[type] : INTEREST_COLORS[interestLevel];
            
            const rootNode: GraphNode = {
                id: identifier,
                type: type,
                color,
                val: type === 'address' ? calculateNodeSize(nodeValue) : 8,
                depth: 0,
                interestLevel,
                value: type === 'address' ? nodeValue : undefined
            };
            setGraphData({ nodes: [rootNode], links: [] });
            await fetchAndExpandNode(identifier, type, 0);
        }
    }
    if (rootIdentifier) {
        initializeGraph();
    }
  }, [activeTab, rootIdentifier, graphData.nodes.length, fetchAndExpandNode]);

  useEffect(() => {
    if (fgRef.current) {
        // Increase repulsion strength to push nodes further apart. A more negative number is stronger.
        fgRef.current.d3Force('charge').strength(-200);

        // Increase the ideal distance between linked nodes.
        fgRef.current.d3Force('link').distance(80);
    }
  }, []);

  const renderNode = (node: any, ctx: CanvasRenderingContext2D) => {
    const label = `${node.id.substring(0, 6)}...${node.id.substring(node.id.length - 4)}`;
    const fontSize = node.val / 3.5; // Scale font size with node size
    ctx.font = `${fontSize}px Inter`;
    
    // Draw circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
    ctx.fillStyle = node.color || 'rgba(255,255,255,0.8)';
    ctx.fill();

    // Draw text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FAFAFA'; // Use a light, readable color for text
    ctx.fillText(label, node.x, node.y);
  };


  return (
    <div className="space-y-6">
       <Card className="border-2 shadow-md">
          <CardHeader className="bg-gradient-to-br from-primary/5 via-transparent to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <IconContainer variant="primary">
                <Network className="h-5 w-5" />
              </IconContainer>
              BitSeek Transaction Explorer
            </CardTitle>
            <CardDescription className="mt-2">
                Enter a Bitcoin address or transaction ID to begin exploring its history. You can switch between a simple list view and an interactive graph view.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-4">
                <FormField
                  control={form.control}
                  name="identifier"
                  render={({ field }) => (
                    <FormItem className="flex-grow">
                      <FormLabel>Address or Transaction ID</FormLabel>
                      <FormControl>
                        <Input placeholder="bc1q..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="shadow-sm hover:shadow-md transition-shadow">Explore</Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        {rootIdentifier ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="list"><ListTree className="mr-2 h-4 w-4"/>List View</TabsTrigger>
                <TabsTrigger value="graph"><GitGraph className="mr-2 h-4 w-4"/>Graph View</TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="mt-4 space-y-4">
                 <Card className="border-2 shadow-md">
                    <CardHeader className="bg-gradient-to-br from-blue-500/5 via-transparent to-transparent border-b">
                        <CardTitle className="flex items-center gap-2">
                          <IconContainer variant="blue">
                            <AlertCircle className="h-5 w-5" />
                          </IconContainer>
                          Forensic Legend
                        </CardTitle>
                        <CardDescription className="mt-2">
                            Nodes are color-coded to help you spot interesting activity at a glance.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="flex items-start gap-4">
                            <div className="mt-1 h-3 w-3 flex-shrink-0 rounded-full bg-destructive" />
                            <div>
                                <p className="font-bold text-card-foreground">High Interest (Red):</p>
                                <ul className="list-disc pl-5 text-muted-foreground">
                                    <li>Address with 100+ transactions.</li>
                                    <li>Transaction with 50+ inputs/outputs or a very high fee rate.</li>
                                </ul>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="mt-1 h-3 w-3 flex-shrink-0 rounded-full bg-amber-500" />
                            <div>
                                <p className="font-bold text-card-foreground">Medium Interest (Amber):</p>
                                <ul className="list-disc pl-5 text-muted-foreground">
                                    <li>Address with 20-99 transactions.</li>
                                    <li>Transaction with 10+ inputs/outputs or a high fee rate.</li>
                                </ul>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="mt-1 h-3 w-3 flex-shrink-0 rounded-full bg-primary" />
                            <div>
                                <p className="font-bold text-card-foreground">Low Interest (Default):</p>
                                <ul className="list-disc pl-5 text-muted-foreground">
                                    <li>Standard activity levels.</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                 <Card className="border-2 shadow-md">
                    <CardHeader className="bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent border-b">
                        <CardTitle className="flex items-center gap-2">
                          <IconContainer variant="emerald">
                            <ListTree className="h-5 w-5" />
                          </IconContainer>
                          Exploration List
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="p-4 rounded-lg bg-background">
                           <ExplorerNode type={rootIdentifier.type} identifier={rootIdentifier.identifier} depth={0} />
                        </div>
                    </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="graph" className="mt-4 overflow-hidden">
                 <Card>
                    <CardHeader>
                        <CardTitle>Exploration Graph</CardTitle>
                        <CardDescription>Click nodes to expand them. Drag nodes to rearrange the layout.</CardDescription>
                    </CardHeader>
                    <CardContent className="relative h-[600px] rounded-lg border bg-card-foreground/5 p-0 overflow-hidden">
                        {graphError ? (
                           <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                              <AlertCircle className="h-12 w-12 text-destructive" />
                              <h1 className="text-2xl font-bold">Graph Error</h1>
                              <p className="text-muted-foreground">{graphError}</p>
                           </div>
                        ) : (
                          <>
                            <ForceGraph2D
                              ref={fgRef}
                              graphData={graphData}
                              nodeId="id"
                              nodeVal="val"
                              nodeCanvasObject={renderNode}
                              nodePointerAreaPaint={(node, color, ctx) => {
                                ctx.fillStyle = color;
                                ctx.beginPath();
                                ctx.arc(node.x!, node.y!, (node as any).val, 0, 2 * Math.PI, false);
                                ctx.fill();
                              }}
                              onNodeClick={(node) => {
                                const { id, type, depth } = node as GraphNode;
                                fetchAndExpandNode(id, type, depth);
                              }}
                              onNodeHover={node => setHoveredNode(node as GraphNode || null)}
                              linkWidth={1.5}
                              linkColor={() => 'rgba(255, 255, 255, 0.4)'}
                              linkDirectionalArrowLength={5}
                              linkDirectionalArrowRelPos={0.5}
                              linkDirectionalParticles={2}
                              linkDirectionalParticleWidth={2}
                              linkDirectionalParticleColor={() => 'rgba(255, 255, 255, 0.6)'}
                              cooldownTicks={100}
                              onEngineStop={() => (fgRef.current as any)?.zoomToFit(400, 100)}
                            />
                            {isLoadingGraph && (
                                <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-background/80 p-2 pr-3 text-sm text-muted-foreground backdrop-blur-sm">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Loading graph data...</span>
                                </div>
                            )}
                            <div className="absolute top-4 left-4 w-60 space-y-2 rounded-lg border border-border/50 bg-background/80 p-3 text-xs text-card-foreground shadow-lg backdrop-blur-sm">
                                <h4 className="font-bold text-sm">Graph Legend</h4>
                                <div className="flex items-start gap-2">
                                    <div className="mt-1 h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: INTEREST_COLORS.high }} />
                                    <div><p className="font-bold">High Interest:</p><p className="text-muted-foreground">High activity or unusual transaction.</p></div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <div className="mt-1 h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: INTEREST_COLORS.medium }} />
                                    <div><p className="font-bold">Medium Interest:</p><p className="text-muted-foreground">Moderately active address or transaction.</p></div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <div className="mt-1 h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: INTEREST_COLORS.low.address }} />
                                    <div><p className="font-bold">Address:</p><p className="text-muted-foreground">Node size reflects the address balance.</p></div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <div className="mt-1 h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: INTEREST_COLORS.low.transaction }} />
                                    <div><p className="font-bold">Transaction:</p><p className="text-muted-foreground">A standard, low-interest transaction.</p></div>
                                </div>
                                <Separator className="my-2 bg-border/50" />
                                <div className="text-muted-foreground space-y-1">
                                    <p>• Click any node to expand it.</p>
                                    <p>• Drag nodes to rearrange the view.</p>
                                </div>
                            </div>
                            {hoveredNode && (
                                <div className="pointer-events-none absolute bottom-4 left-4 max-w-sm break-words rounded-lg bg-background/80 p-2 text-xs text-card-foreground backdrop-blur-sm shadow-lg border border-border/50">
                                    <p className="font-bold capitalize">{hoveredNode.interestLevel} Interest {hoveredNode.type}</p>
                                    <p className="font-mono">{hoveredNode.id}</p>
                                    {hoveredNode.type === 'address' && hoveredNode.value !== undefined && fiatPrice > 0 && (
                                        <div className="mt-1 border-t border-border/50 pt-1">
                                            <p className="font-bold">Balance: {(hoveredNode.value / 1e8).toFixed(8)} BTC</p>
                                            <p className="text-muted-foreground">{new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((hoveredNode.value / 1e8) * fiatPrice)}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                          </>
                        )}
                    </CardContent>
                 </Card>
              </TabsContent>
          </Tabs>
        ) : (
            <div className="flex flex-col items-center justify-center gap-4 text-center h-96 rounded-lg border-2 border-dashed">
                <Network className="h-16 w-16 text-muted-foreground" />
                <h3 className="text-xl font-bold">Start Exploring</h3>
                <p className="text-muted-foreground">Enter a Bitcoin address or transaction ID above to visualize its connections.</p>
            </div>
        )}
    </div>
  );
}
