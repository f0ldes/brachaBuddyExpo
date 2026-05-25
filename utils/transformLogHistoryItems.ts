/**
 * Transforms log data from API response to the format needed for historyItems state
 * @param {Array} logs - Array of log objects from the API
 * @returns {Array} - Transformed array matching the historyItems structure
 */

interface HistoryItem {
    id: string | number;
    text: string;
    img: any;
    timestamp?: string;
    description?: string;
}

interface BlessingContent {
    name?: string;
    brachaHebrew?: string;
    brachaEnglish?: string;
    coversFoods?: string[];
    description?: string;
}

interface ParsedContent {
    isFood?: boolean;
    // New (multi-food) shape
    recognizedFoods?: string[];
    blessings?: BlessingContent[];
    // Legacy (single-food) shape
    foodName?: string;
    bracha?: string;
    brachaHebrew?: string;
    brachaEnglish?: string;
    description?: string;
}

interface LogItem {
    id: string;
    image?: {
      type: string;
      size: number;
      sample: string;
    };
    imageUrl?: string;
    timestamp?: string;
    content: string | ParsedContent;
    originalFileName?: string;
    mimeType?: string;
    userInfo?: {
      ip: string;
      userAgent: string;
      country: string;
      city: string;
      timezone: string;
      referer: string;
    };
    success?: boolean;
    processingTimeMs?: number;
    error?: string | null;
    createdAt?: {
      _seconds: number;
      _nanoseconds: number;
    };
    imageBase64?: string | null;
}
  
/**
 * Transforms log data from API response to the format needed for historyItems state
 * @param logs - Array of log objects from the API
 * @returns Transformed array matching the historyItems structure
 */
const transformLogsIntoHistoryItems = (logs : LogItem[] ): HistoryItem[] => {
    if (!logs || !Array.isArray(logs)) {
        return [];
    }

    return logs.map((log: LogItem) => {
        let parsedContent: ParsedContent = typeof log.content === 'object' ? log.content as ParsedContent : {foodName: '',bracha: '' ,description: ''};

        if (typeof log.content === 'string') {
            try {
                parsedContent = JSON.parse(log.content) as ParsedContent;
            } catch (error) {
                console.error('Error parsing log content:', error);
                parsedContent = { foodName: 'Unknown', bracha: '', description: ''}
            }
        }


        // Prefer the new multi-food shape, fall back to the legacy single-food fields.
        const foodText = parsedContent?.recognizedFoods?.length
            ? parsedContent.recognizedFoods.join(', ')
            : parsedContent?.foodName || '';

        const brachaDisplay = parsedContent?.blessings?.length
            ? parsedContent.blessings
                  .map(b => b.brachaEnglish || b.name)
                  .filter(Boolean)
                  .join(', ')
            : parsedContent?.brachaEnglish || parsedContent?.bracha || '';

        const text = foodText
            ? `${foodText}${brachaDisplay ? ` - ${brachaDisplay}` : ''}`
            : 'Unknown Item';

        const description = parsedContent?.blessings?.length
            ? parsedContent.blessings
                  .map(b => b.description)
                  .filter(Boolean)
                  .join(' ')
            : parsedContent?.description;

        return {
            id: log.id || Math.random().toString(36).substring(2, 9),
            text: text,
            img: log.imageUrl,
            description: description
        }
    })
}

export default transformLogsIntoHistoryItems;