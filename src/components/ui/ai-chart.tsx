
'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area, ScatterChart, Scatter, ZAxis, Treemap, RadialBarChart, RadialBar, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useMemo, useId } from 'react';

// Pre-defined colors for pie chart slices to ensure visual consistency.
const COLORS = [
  'hsl(var(--chart-1, var(--primary)))',
  'hsl(var(--chart-2, 191 97% 50%))',
  'hsl(var(--chart-3, 48 96% 53%))',
  'hsl(var(--chart-4, 280 77% 60%))',
  'hsl(var(--chart-5, 140 71% 45%))',
  '#7c3aed',
  '#22c55e',
  '#0ea5e9',
  '#f59e0b',
];

const GRID_COLOR = 'hsl(var(--border))';
const MUTED_COLOR = 'hsl(var(--muted-foreground))';
const PRIMARY_COLOR = 'hsl(var(--primary))';

// Helper to render custom labels on pie slices.
const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Don't render labels for very small slices to avoid clutter.
  if (percent < 0.05) return null;

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[11px] font-semibold drop-shadow-sm">
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
        <div className="rounded-xl border border-border/80 bg-gradient-to-br from-background/95 via-background/90 to-muted/80 px-3 py-2 shadow-lg shadow-black/5">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col space-y-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Address</span>
              <span className="font-mono text-xs font-semibold text-foreground">{displayName}</span>
            </div>
            <div className="flex flex-col space-y-1 text-right">
               <span className="text-xs uppercase tracking-wide text-muted-foreground">Balance</span>
               <span className="font-mono text-sm font-semibold text-foreground">{Number(value).toFixed(8)} BTC</span>
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
            <div className="rounded-xl border border-border/80 bg-gradient-to-br from-background/95 via-background/90 to-muted/80 px-3 py-2 shadow-lg shadow-black/5">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
                <div className="text-lg font-semibold text-foreground">
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
      <div className="rounded-xl border border-border/80 bg-gradient-to-br from-background/95 via-background/90 to-muted/80 px-3 py-2 shadow-lg shadow-black/5 text-xs">
          {data.name && <div className="mb-1 text-sm font-semibold text-foreground">{data.name}</div>}
          {data.x !== undefined && <p className="flex items-center gap-1">x: <span className="font-semibold text-foreground">{data.x.toLocaleString()}</span></p>}
          {data.y !== undefined && <p className="flex items-center gap-1">y: <span className="font-semibold text-foreground">{data.y.toLocaleString()}</span></p>}
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
      <div className="rounded-xl border border-border/80 bg-gradient-to-br from-background/95 via-background/90 to-muted/80 px-3 py-2 shadow-lg shadow-black/5">
        <div className="flex flex-col space-y-1">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">UTXO</span>
          <span className="font-mono text-xs font-semibold text-foreground">{name}</span>
        </div>
        <div className="mt-2 flex flex-col space-y-1">
           <span className="text-xs uppercase tracking-wide text-muted-foreground">Value</span>
           <span className="font-mono text-sm font-semibold text-foreground">{Number(value).toLocaleString()} sats</span>
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
        <div className="rounded-xl border border-border/80 bg-gradient-to-br from-background/95 via-background/90 to-muted/80 px-3 py-2 shadow-lg shadow-black/5">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: data.fill }} />
            <span className="text-muted-foreground">{data.payload.name}:</span>
            <span className="font-semibold">{data.value}</span>
          </div>
        </div>
      );
    }
    return null;
  };


export function AiChart({ chart }: { chart: any }) {
  const { type, data, config, title } = chart;
  const gradientId = useId();
  const height = config?.height ?? 320;

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
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={110}
                innerRadius={55}
                fill={PRIMARY_COLOR}
                dataKey={dataKey}
                nameKey={nameKey}
                paddingAngle={2}
              >
                {data.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} cursor={{ fill: 'hsl(var(--muted)/30%)' }} />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'bar':
        const { bar, xAxis } = config || {};
        if (!bar?.dataKey || !xAxis?.dataKey) {
            return <p className="text-destructive text-center">Invalid configuration for bar chart.</p>;
        }
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
              <defs>
                <linearGradient id={`${gradientId}-bar`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PRIMARY_COLOR} stopOpacity={0.95} />
                  <stop offset="95%" stopColor={PRIMARY_COLOR} stopOpacity={0.45} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID_COLOR} strokeOpacity={0.25} strokeDasharray="4 6" vertical={false} />
              <XAxis dataKey={xAxis.dataKey} tickLine={false} axisLine={false} stroke={MUTED_COLOR} fontSize={12} interval={0} angle={-25} textAnchor="end" />
              <YAxis tickLine={false} axisLine={false} stroke={MUTED_COLOR} fontSize={12} tickFormatter={(value) => `${value.toLocaleString()}`} />
              <Tooltip cursor={{ fill: 'hsl(var(--muted)/25%)' }} content={<CustomXYTooltip />} />
              <Bar dataKey={bar.dataKey} fill={`url(#${gradientId}-bar)`} radius={[10, 10, 8, 8]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        const { line, xAxis: lineXAxis } = config || {};
        if (!line?.dataKey || !lineXAxis?.dataKey) {
            return <p className="text-destructive text-center">Invalid configuration for line chart.</p>;
        }
        return (
            <ResponsiveContainer width="100%" height={height}>
              <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                <defs>
                  <linearGradient id={`${gradientId}-line`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PRIMARY_COLOR} stopOpacity={0.95} />
                    <stop offset="95%" stopColor={PRIMARY_COLOR} stopOpacity={0.15} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID_COLOR} strokeOpacity={0.25} strokeDasharray="4 6" vertical={false} />
                <XAxis dataKey={lineXAxis.dataKey} tickLine={false} axisLine={false} stroke={MUTED_COLOR} fontSize={12} interval={0} angle={-25} textAnchor="end" />
                <YAxis tickLine={false} axisLine={false} stroke={MUTED_COLOR} fontSize={12} tickFormatter={(value) => `${value.toLocaleString()}`} />
                <Tooltip cursor={{ stroke: 'hsl(var(--muted))', strokeDasharray: '4 4' }} content={<CustomXYTooltip />} />
                <Area type="monotone" dataKey={line.dataKey} stroke="transparent" fill={`url(#${gradientId}-line)`} />
                <Line dataKey={line.dataKey} type="monotone" stroke={PRIMARY_COLOR} strokeWidth={2.5} dot={{ r: 4, fill: PRIMARY_COLOR, strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
        );
      case 'area':
        const { area, xAxis: areaXAxis } = config || {};
        if (!area?.dataKey || !areaXAxis?.dataKey) {
            return <p className="text-destructive text-center">Invalid configuration for area chart.</p>;
        }
        return (
            <ResponsiveContainer width="100%" height={height}>
                <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                <defs>
                    <linearGradient id={`${gradientId}-area`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PRIMARY_COLOR} stopOpacity={0.65}/>
                        <stop offset="100%" stopColor={PRIMARY_COLOR} stopOpacity={0.08}/>
                    </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID_COLOR} strokeOpacity={0.25} strokeDasharray="4 6" vertical={false} />
                <XAxis dataKey={areaXAxis.dataKey} tickLine={false} axisLine={false} stroke={MUTED_COLOR} fontSize={12} interval={0} angle={-25} textAnchor="end" />
                <YAxis tickLine={false} axisLine={false} stroke={MUTED_COLOR} fontSize={12} tickFormatter={(value) => typeof value === 'number' ? value.toLocaleString() : ''} />
                <Tooltip cursor={{ stroke: 'hsl(var(--muted))', strokeDasharray: '4 4' }} content={<CustomXYTooltip />} />
                <Area dataKey={area.dataKey} type="monotone" stroke={PRIMARY_COLOR} fill={`url(#${gradientId}-area)`} strokeWidth={2.25} />
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
            <ResponsiveContainer width="100%" height={height}>
                <ScatterChart margin={{ top: 16, right: 20, bottom: 40, left: 10 }}>
                    <CartesianGrid stroke={GRID_COLOR} strokeOpacity={0.25} strokeDasharray="4 6" />
                    <XAxis
                        type="number"
                        dataKey="x"
                        name={scatter?.xAxisLabel}
                        label={{ value: scatter?.xAxisLabel, position: 'insideBottom', offset: -40 }}
                        tickLine={false}
                        axisLine={false}
                        stroke={MUTED_COLOR}
                        fontSize={12}
                    />
                    <YAxis
                        type="number"
                        dataKey="y"
                        name={scatter?.yAxisLabel}
                        label={{ value: scatter?.yAxisLabel, angle: -90, position: 'insideLeft' }}
                        tickLine={false}
                        axisLine={false}
                        stroke={MUTED_COLOR}
                        fontSize={12}
                    />
                    <ZAxis type="category" dataKey="name" name="name"/>
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomScatterTooltip />} />
                    <Scatter name="Points" data={data} fill={PRIMARY_COLOR} opacity={0.75} shape="circle" />
                </ScatterChart>
            </ResponsiveContainer>
        );
      case 'treemap':
        if (!config?.treemap?.dataKey || !config?.treemap?.nameKey) {
            return <p className="text-destructive text-center">Invalid configuration for treemap.</p>;
        }
        const { dataKey: treemapDataKey, nameKey: treemapNameKey } = config.treemap;
        return (
            <ResponsiveContainer width="100%" height={height}>
                <Treemap
                    data={data}
                    dataKey={treemapDataKey}
                    nameKey={treemapNameKey}
                    aspectRatio={4 / 3}
                    stroke="hsl(var(--background))"
                    fill={PRIMARY_COLOR}
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
            <ResponsiveContainer width="100%" height={height}>
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
                        label={{ position: 'insideStart', fill: '#fff', fontSize: '12px', fontWeight: 600 }}
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
          <ResponsiveContainer width="100%" height={height}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
              <PolarGrid stroke={GRID_COLOR} strokeOpacity={0.3} />
              <PolarAngleAxis dataKey={radarConfig.angleKey} stroke={MUTED_COLOR} tickLine={false} />
              <PolarRadiusAxis stroke={MUTED_COLOR} tickLine={false} />
              <Radar name="Wallet" dataKey={radarConfig.dataKey} stroke={PRIMARY_COLOR} fill={PRIMARY_COLOR} fillOpacity={0.45} />
              <Tooltip content={<CustomXYTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        );
      default:
        return <p className="text-destructive">Unsupported chart type: {type}</p>;
    }
  }, [type, data, config, gradientId, height]);

  return (
    <Card className="relative overflow-hidden border-border/80 bg-gradient-to-br from-background/80 via-background/70 to-muted/60 shadow-xl shadow-black/10 backdrop-blur supports-[backdrop-filter]:backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.08),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(14,165,233,0.07),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />

      {title && (
        <CardHeader className="relative z-10 pb-3">
          <CardTitle className="text-lg font-semibold tracking-tight text-foreground">{title}</CardTitle>
          <CardDescription className="text-xs uppercase tracking-[0.2em] text-muted-foreground">AI visualization</CardDescription>
        </CardHeader>
      )}

      <CardContent className="relative z-10 px-4 pb-5">
        <div className="rounded-2xl border border-border/70 bg-card/60 p-3 shadow-inner shadow-black/5">
          {chartContent}
        </div>
      </CardContent>
    </Card>
  );
}
