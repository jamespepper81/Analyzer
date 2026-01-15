
'use server';
/**
 * @fileOverview A flow for fetching and formatting Bitcoin news.
 * 
 * - getNews - A function that fetches the latest Bitcoin news.
 * - NewsOutput - The return type for the getNews function.
 */

import { z } from '@genkit-ai/core';
import { getLatestBitcoinNews } from '@/lib/newsService';
import type { NewsArticle } from '@/lib/types';

const NewsOutputSchema = z.object({
    news: z.string().describe("A Markdown-formatted string containing the latest Bitcoin news headlines and summaries."),
});
export type NewsOutput = z.infer<typeof NewsOutputSchema>;

export async function getNews(): Promise<NewsOutput> {
    try {
        const articles = await getLatestBitcoinNews();

        if (articles.length === 0 || (articles.length === 1 && (articles[0].title.includes('Error') || articles[0].title.includes('Misconfigured')))) {
            const errorMessage = articles[0]?.summary || "I looked for recent news but couldn't find any articles.";
            const formattedNews = `**${articles[0]?.title || 'No Articles Found'}**\n\n${errorMessage}`;
            return { news: formattedNews };
        }

        const formattedNews = articles.map(article => `**${article.title}**\n\n${article.summary}`).join('\n\n---\n\n');
        return { news: `Here are the latest Bitcoin headlines:\n\n${formattedNews}` };
    } catch (e: any) {
        console.error("Error in getNews flow:", e);
        return { news: `**Error**\n\nAn unexpected error occurred while fetching news: ${e.message}` };
    }
}
