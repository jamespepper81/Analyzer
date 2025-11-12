
'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area, ScatterChart, Scatter, ZAxis, Treemap, RadialBarChart, RadialBar, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useMemo } from 'react';

// Pre-defined colors for pie chart slices to ensure visual consistency.
const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#82ca9d',
  '#ffc658',
];

// Helper to render custom labels on pie slices.
const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Don't render labels for very small slices to avoid clutter.
  if (percent < 0.05) return null;

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// A custom tooltip to format address labels and values nicely for pie charts.
const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const value = payload[0].value;
      const name = data.name;
      // Truncate long addresses for display
      const displayName = name.length > 20 ? `${name.substring(0, 10)}...${name.substring(name.length - 10)}` : name;
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col space-y-1">
              <span className="text-sm text-muted-foreground">Address</span>
              <span className="font-mono text-xs font-bold">{displayName}</span>
            </div>
            <div className="flex flex-col space-y-1">
               <span className="text-sm text-muted-foreground">Balance</span>
               <span className="font-mono text-xs font-bold">{Number(value).toFixed(8)} BTC</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

// Custom tooltip for bar and line charts
const CustomXYTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0];
        return (
            <div className="rounded-lg border bg-background p-2 shadow-sm">
                <div className="font-medium text-muted-foreground">{label}</div>
                <div className="font-bold text-foreground">
                    {data.value ? data.value.toLocaleString() : ''}
                </div>
            </div>
        );
    }
    return null;
};

// Custom tooltip for scatter plots, assuming 'x', 'y', and 'name' data keys as per the AI prompt instructions.
const CustomScatterTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm text-xs">
          {data.name && <div className="font-bold mb-1">{data.name}</div>}
          {data.x !== undefined && <p>x: <span className="font-semibold">{data.x.toLocaleString()}</span></p>}
          {data.y !== undefined && <p>y: <span className="font-semibold">{data.y.toLocaleString()}</span></p>}
      </div>
    );
  }
  return null;
};

// Custom tooltip for treemaps, assuming 'size' data key as per the AI prompt instructions.
const CustomTreemapTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const value = data.size; // Treemap uses the dataKey, which we'll call 'size'
    const name = data.name;
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="flex flex-col space-y-1">
          <span className="text-sm text-muted-foreground">UTXO</span>
          <span className="font-mono text-xs font-bold">{name}</span>
        </div>
        <div className="flex flex-col space-y-1 mt-1">
           <span className="text-sm text-muted-foreground">Value</span>
           <span className="font-mono text-xs font-bold">{Number(value).toLocaleString()} sats</span>
        </div>
      </div>
    );
  }
  return null;
};

// Custom tooltip for radial bar charts.
const CustomRadialTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.fill }} />
            <span className="text-sm text-muted-foreground">{data.payload.name}:</span>
            <span className="font-bold">{data.value}</span>
          </div>
        </div>
      );
    }
    return null;
  };


export function AiChart({ chart }: { chart: any }) {
  const { type, data, config, title } = chart;

  const chartContent = useMemo(() => {
    if (!data || data.length === 0) {
      return <p className="text-center text-muted-foreground">No data available for this chart.</p>;
    }

    switch (type) {
      case 'pie':
        if (!config?.pie?.dataKey || !config?.pie?.nameKey) {
            return <p className="text-destructive text-center">Invalid configuration for pie chart.</p>;
        }
        const { dataKey, nameKey } = config.pie;
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={110}
                innerRadius={50}
                fill="#8884d8"
                dataKey={dataKey}
                nameKey={nameKey}
                paddingAngle={2}
              >
                {data.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'bar':
        const { bar, xAxis } = config || {};
        if (!bar?.dataKey || !xAxis?.dataKey) {
            return <p className="text-destructive text-center">Invalid configuration for bar chart.</p>;
        }
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey={xAxis.dataKey} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} interval={0} angle={-35} textAnchor="end" />
              <YAxis tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `${value.toLocaleString()}`} />
              <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<CustomXYTooltip />} />
              <Bar dataKey={bar.dataKey} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        const { line, xAxis: lineXAxis } = config || {};
        if (!line?.dataKey || !lineXAxis?.dataKey) {
            return <p className="text-destructive text-center">Invalid configuration for line chart.</p>;
        }
        return (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey={lineXAxis.dataKey} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} interval={0} angle={-35} textAnchor="end" />
                <YAxis tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `${value.toLocaleString()}`} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<CustomXYTooltip />} />
                <Line dataKey={line.dataKey} type="monotone" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
        );
      case 'area':
        const { area, xAxis: areaXAxis } = config || {};
        if (!area?.dataKey || !areaXAxis?.dataKey) {
            return <p className="text-destructive text-center">Invalid configuration for area chart.</p>;
        }
        return (
            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 50 }}>
                <defs>
                    <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey={areaXAxis.dataKey} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} interval={0} angle={-35} textAnchor="end" />
                <YAxis tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => typeof value === 'number' ? value.toLocaleString() : ''} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<CustomXYTooltip />} />
                <Area dataKey={area.dataKey} type="monotone" stroke="hsl(var(--primary))" fill="url(#fillValue)" strokeWidth={2} />
                </AreaChart>
            </ResponsiveContainer>
        );
      case 'scatter':
        const { scatter } = config || {};
        // The data keys 'x' and 'y' are fixed by the prompt instructions
        if (!data.every((d: any) => Object.prototype.hasOwnProperty.call(d, 'x') && Object.prototype.hasOwnProperty.call(d, 'y'))) {
            return <p className="text-destructive text-center">Invalid data for scatter chart. Must contain 'x' and 'y' keys.</p>;
        }
        return (
            <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 50, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3"/>
                    <XAxis 
                        type="number" 
                        dataKey="x" 
                        name={scatter?.xAxisLabel}
                        label={{ value: scatter?.xAxisLabel, position: 'insideBottom', offset: -40 }}
                        tickLine={false} 
                        axisLine={false} 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12}
                    />
                    <YAxis 
                        type="number" 
                        dataKey="y" 
                        name={scatter?.yAxisLabel}
                        label={{ value: scatter?.yAxisLabel, angle: -90, position: 'insideLeft' }}
                        tickLine={false} 
                        axisLine={false} 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12}
                    />
                    <ZAxis type="category" dataKey="name" name="name"/>
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomScatterTooltip />} />
                    <Scatter name="Points" data={data} fill="hsl(var(--primary))" opacity={0.7} />
                </ScatterChart>
            </ResponsiveContainer>
        );
      case 'treemap':
        if (!config?.treemap?.dataKey || !config?.treemap?.nameKey) {
            return <p className="text-destructive text-center">Invalid configuration for treemap.</p>;
        }
        const { dataKey: treemapDataKey, nameKey: treemapNameKey } = config.treemap;
        return (
            <ResponsiveContainer width="100%" height={300}>
                <Treemap
                    data={data}
                    dataKey={treemapDataKey}
                    nameKey={treemapNameKey}
                    aspectRatio={4 / 3}
                    stroke="hsl(var(--background))"
                    fill="hsl(var(--primary))"
                    isAnimationActive={false}
                >
                  <Tooltip content={<CustomTreemapTooltip />} />
                </Treemap>
            </ResponsiveContainer>
        );
      case 'radial':
        const { radial } = config || {};
        if (!radial?.dataKey || !radial?.nameKey) {
            return <p className="text-destructive text-center">Invalid configuration for radial bar chart.</p>;
        }
        return (
            <ResponsiveContainer width="100%" height={300}>
                <RadialBarChart 
                    cx="50%" 
                    cy="50%" 
                    innerRadius="10%" 
                    outerRadius="80%" 
                    data={data}
                    startAngle={180}
                    endAngle={-180}
                >
                    <RadialBar
                        dataKey={radial.dataKey}
                        background
                        label={{ position: 'insideStart', fill: '#fff', fontSize: '12px' }}
                    >
                      {data.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </RadialBar>
                    <Legend iconSize={10} wrapperStyle={{fontSize: "12px"}}/>
                    <Tooltip content={<CustomRadialTooltip />} />
                </RadialBarChart>
            </ResponsiveContainer>
        );
      case 'radar':
        const { radar: radarConfig } = config || {};
        if (!radarConfig?.dataKey || !radarConfig?.angleKey) {
            return <p className="text-destructive text-center">Invalid configuration for radar chart.</p>;
        }
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey={radarConfig.angleKey} />
              <PolarRadiusAxis />
              <Radar name="Wallet" dataKey={radarConfig.dataKey} stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        );
      default:
        return <p className="text-destructive">Unsupported chart type: {type}</p>;
    }
  }, [type, data, config]);

  return (
    <Card className="bg-card/50 border-border/50">
      {title && 
        <CardHeader>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <CardDescription>Generated by AI</CardDescription>
        </CardHeader>
      }
      <CardContent>
        {chartContent}
      </CardContent>
    </Card>
  );
}
