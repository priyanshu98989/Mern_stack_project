function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parsePagination(query = {}, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

function parseSort(query = {}, allowed = [], fallback = '-createdAt') {
  const raw = query.sort || fallback;
  const [fieldRaw, dirRaw] = String(raw).split(':');
  const dir = dirRaw === 'asc' || dirRaw === '1' ? 1 : -1;
  if (allowed.length && !allowed.includes(fieldRaw)) {
    const [fbField, fbDir] = String(fallback).replace(/^-/, '').split(':');
    const fbDirection = fallback.startsWith('-') || fbDir === 'desc' ? -1 : 1;
    return { [fbField]: fbDirection };
  }
  return { [fieldRaw]: dir };
}

function paginationMeta(total, page, limit) {
  return { total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
}

module.exports = { escapeRegex, parsePagination, parseSort, paginationMeta };
