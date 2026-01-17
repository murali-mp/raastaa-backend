/**
 * Encode cursor data to base64 string (with timestamp)
 */
export function encodeCursorWithTimestamp(data: { timestamp: Date; id: string }): string {
  return Buffer.from(
    JSON.stringify({ t: data.timestamp.toISOString(), i: data.id })
  ).toString('base64');
}

/**
 * Encode a simple string cursor
 */
export function encodeCursor(id: string): string {
  return Buffer.from(id).toString('base64');
}

/**
 * Decode cursor from base64 string
 */
export function decodeCursor(cursor: string): string | null {
  try {
    return Buffer.from(cursor, 'base64').toString('utf-8');
  } catch {
    return null;
  }
}

/**
 * Decode cursor with timestamp
 */
export function decodeCursorWithTimestamp(cursor: string): { timestamp: Date; id: string } | null {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
    return {
      timestamp: new Date(decoded.t),
      id: decoded.i,
    };
  } catch {
    return null;
  }
}

/**
 * Encode a simple offset cursor
 */
export function encodeOffsetCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ o: offset })).toString('base64');
}

/**
 * Decode an offset cursor
 */
export function decodeOffsetCursor(cursor: string): number | null {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
    return decoded.o;
  } catch {
    return null;
  }
}

/**
 * Create a paginated result
 */
export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount?: number;
}

export function createPaginatedResult<T extends { created_at: Date; uuid: string }>(
  items: T[],
  limit: number,
  totalCount?: number
): PaginatedResult<T> {
  const hasMore = items.length > limit;
  const paginatedItems = hasMore ? items.slice(0, limit) : items;
  
  let nextCursor: string | null = null;
  if (hasMore && paginatedItems.length > 0) {
    const lastItem = paginatedItems[paginatedItems.length - 1];
    if (lastItem) {
      nextCursor = encodeCursor(lastItem.uuid);
    }
  }

  return {
    items: paginatedItems,
    nextCursor,
    hasMore,
    totalCount,
  };
}

/**
 * Apply cursor-based pagination to Prisma query options
 */
export function applyCursorPagination(
  cursor: string | undefined,
  limit: number
): {
  take: number;
  skip?: number;
  cursor?: { uuid: string };
} {
  const options: { take: number; skip?: number; cursor?: { uuid: string } } = {
    take: limit + 1,
  };

  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      options.cursor = { uuid: decoded };
      options.skip = 1;
    }
  }

  return options;
}
