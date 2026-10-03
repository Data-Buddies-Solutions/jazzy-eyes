export const paginationError = 'page must be a positive integer and limit must be between 1 and 100.';

export function parsePagination(params: URLSearchParams): { page: number; limit: number; skip: number } | null {
  const pageValue = params.get('page') ?? '1';
  const limitValue = params.get('limit') ?? '20';
  if (!/^[1-9]\d*$/.test(pageValue) || !/^[1-9]\d*$/.test(limitValue)) return null;
  const page = Number(pageValue);
  const limit = Number(limitValue);
  const skip = (page - 1) * limit;
  if (!Number.isSafeInteger(page) || page > 2_147_483_647 || !Number.isSafeInteger(limit) || limit > 100 || skip > 2_147_483_647) return null;
  return { page, limit, skip };
}
