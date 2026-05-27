
'use server';

import { VALID_CURRENCIES } from '@/lib/types';
import type { MarketPageData, MarketData, MarketChartPoint, Currency, FearAndGreedIndex, CandlestickDataPoint } from '@/lib/types';
import { fetchJson } from './blockchain-api';

export async function getMarketPageData(range: string = '1', currency: Currency = 'USD'): Promise<{ data: MarketPageData | null; error: string | null; }> {
    try {
        if (!(VALID_CURRENCIES as readonly string[]).includes(currency)) {
            return { data: null, error: 'Invalid currency.' };
        }
        const currencyCode = currency.toLowerCase();
        const daysForChart = Math.max(1, parseInt(range, 10) || 1);

        let revalidateInSeconds = 60;
        if (daysForChart > 90) {
            revalidateInSeconds = 3600;
        }

        const [marketDataResponse, chartDataResponse, candlestickDataResponse, fearAndGreedResponse] = await Promise.all([
            fetchJson('coingecko', '/api/v3/coins/markets', { vs_currency: currencyCode, ids: 'bitcoin' }, {}, 60),
            fetchJson('coingecko', '/api/v3/coins/bitcoin/market_chart', { vs_currency: currencyCode, days: String(daysForChart) }, {}, revalidateInSeconds),
            fetchJson('coingecko', '/api/v3/coins/bitcoin/ohlc', { vs_currency: currencyCode, days: String(daysForChart) }, {}, revalidateInSeconds),
            fetchJson('alternative_me', '/fng/', { limit: '1' }, {}, 3600),
        ]);

        const marketInfo = marketDataResponse[0];
        if (!marketInfo) {
            return { data: null, error: 'Could not fetch market data for Bitcoin.' };
        }

        const marketData: MarketData = {
            price: marketInfo.current_price,
            price_change_24h: marketInfo.price_change_24h,
            price_change_percentage_24h: marketInfo.price_change_percentage_24h,
            market_cap: marketInfo.market_cap,
            market_cap_rank: marketInfo.market_cap_rank,
            high_24h: marketInfo.high_24h,
            low_24h: marketInfo.low_24h,
            total_volume: marketInfo.total_volume,
            circulating_supply: marketInfo.circulating_supply,
            total_supply: marketInfo.total_supply,
            ath: marketInfo.ath,
            atl: marketInfo.atl,
            last_updated: marketInfo.last_updated,
        };

        const chartData: MarketChartPoint[] = (chartDataResponse?.prices ?? []).map((p: [number, number]) => ({
            timestamp: p[0],
            price: p[1],
        }));

        const candlestickData: CandlestickDataPoint[] = (Array.isArray(candlestickDataResponse) ? candlestickDataResponse : []).map((d: number[]) => ({
            time: d[0],
            open: d[1],
            high: d[2],
            low: d[3],
            close: d[4],
        }));

        const fngData = fearAndGreedResponse?.data?.[0];
        let fearAndGreed: FearAndGreedIndex;
        if (!fngData) {
            console.error('Could not fetch Fear & Greed Index.');
            fearAndGreed = { value: 0, value_classification: "Error", timestamp: new Date().toISOString() };
        } else {
            fearAndGreed = {
                value: parseInt(fngData.value, 10),
                value_classification: fngData.value_classification,
                timestamp: new Date(parseInt(fngData.timestamp, 10) * 1000).toISOString(),
            };
        }

        const pageData: MarketPageData = {
            marketData,
            chartData,
            candlestickData,
            fearAndGreed,
        };

        return { data: pageData, error: null };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred while fetching market data.';
        return { data: null, error: message };
    }
}
