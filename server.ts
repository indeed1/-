import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { XMLParser } from 'fast-xml-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (KHS-GojungNote-Client/1.0)';
const LIST_URL = 'https://www.khs.go.kr/cha/SearchKindOpenapiList.do';
const DETAIL_URL = 'https://www.khs.go.kr/cha/SearchKindOpenapiDt.do';
const EVENT_URL = 'https://www.khs.go.kr/cha/openapi/selectEventListOpenapi.do';

const REGION_CODES: Record<string, string> = {
  '서울': '11',
  '부산': '21',
  '대구': '22',
  '인천': '23',
  '광주': '24',
  '대전': '25',
  '울산': '26',
  '경기': '31',
  '강원': '32',
  '충북': '33',
  '충남': '34',
  '전북': '35',
  '전남': '36',
  '경북': '37',
  '경남': '38',
  '제주': '39',
  '세종': '45',
};

// Clean HTML tags and entities
function cleanText(val: any): string {
  if (val === null || val === undefined) return '';
  let str = String(val);
  str = str.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1');
  str = str.replace(/<br\s*\/?>/gi, '\n');
  str = str.replace(/<\/?(?:p|div|li|ul|ol|h[1-6])[^>]*>/gi, '\n');
  str = str.replace(/<[^>]+>/g, '');
  str = str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  str = str.replace(/[ \t\f\v]+/g, ' ');
  str = str.replace(/\n\s+/g, '\n');
  str = str.replace(/\n{3,}/g, '\n\n');
  return str.trim();
}

const parser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  parseTagValue: false, // Keep raw strings to handle CDATA
  cdataPropName: '__cdata',
});

function extractText(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    if (val.__cdata !== undefined) return cleanText(val.__cdata);
    if (val['#text'] !== undefined) return cleanText(val['#text']);
  }
  return cleanText(val);
}

// Fetch helper with timeout and diagnostics
interface FetchResult {
  statusCode: number;
  durationMs: number;
  contentType: string;
  body: string;
  error?: string;
  errorCategory?: 'URL_PARAM_ERROR' | 'NETWORK_CONNECTION_ERROR' | 'UPSTREAM_TIMEOUT' | 'UNKNOWN';
}

async function fetchWithDiagnostics(urlStr: string, timeoutMs = 15000): Promise<FetchResult> {
  const startTime = Date.now();
  let controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(urlStr, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/xml, text/xml, */*',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;
    const body = await res.text();

    return {
      statusCode: res.status,
      durationMs,
      contentType: res.headers.get('content-type') || '',
      body,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;

    let errorCategory: FetchResult['errorCategory'] = 'UNKNOWN';
    let errorMessage = err.message || String(err);

    if (err.name === 'AbortError' || durationMs >= timeoutMs) {
      errorCategory = 'UPSTREAM_TIMEOUT';
      errorMessage = `국가유산청 공식 서버 응답 지연 (요청 대기시간 ${timeoutMs}ms 초과)`;
    } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
      errorCategory = 'NETWORK_CONNECTION_ERROR';
      errorMessage = `공식 서버 네트워크 연결 실패 (${err.code})`;
    } else if (urlStr.includes('NaN') || urlStr.includes('undefined')) {
      errorCategory = 'URL_PARAM_ERROR';
      errorMessage = `요청 URL 또는 파라미터 구성 오류`;
    }

    return {
      statusCode: 0,
      durationMs,
      contentType: '',
      body: '',
      error: errorMessage,
      errorCategory,
    };
  }
}

// 1. API: Test connection and diagnostic check
app.get('/api/heritage/diagnostics', async (req, res) => {
  const query = (req.query.query as string) || '경복궁';
  const encodedQuery = encodeURIComponent(query);
  const targetUrl = `${LIST_URL}?ccbaCncl=N&ccbaMnm1=${encodedQuery}&pageUnit=10&pageIndex=1`;

  const fetchRes = await fetchWithDiagnostics(targetUrl, 15000);

  if (fetchRes.error || fetchRes.statusCode !== 200) {
    return res.status(fetchRes.statusCode || 502).json({
      success: false,
      testedQuery: query,
      targetUrl,
      statusCode: fetchRes.statusCode,
      durationMs: fetchRes.durationMs,
      contentType: fetchRes.contentType,
      error: fetchRes.error || `HTTP 오류 상태코드: ${fetchRes.statusCode}`,
      errorCategory: fetchRes.errorCategory || 'UNKNOWN',
      diagnosis: {
        urlValid: true,
        networkConnected: fetchRes.statusCode > 0,
        upstreamServerAvailable: false,
        note: fetchRes.errorCategory === 'UPSTREAM_TIMEOUT' 
          ? '국가유산청 공식 서버의 응답 지연으로 판단됩니다.'
          : fetchRes.errorCategory === 'NETWORK_CONNECTION_ERROR'
          ? '외부 공식 서버와의 네트워크 연결에 문제가 발생했습니다.'
          : '확인할 수 없는 원인(확인되지 않음)입니다.',
      },
    });
  }

  try {
    const parsed = parser.parse(fetchRes.body);
    const root = parsed.result;
    if (!root) {
      return res.status(502).json({
        success: false,
        testedQuery: query,
        targetUrl,
        statusCode: fetchRes.statusCode,
        durationMs: fetchRes.durationMs,
        contentType: fetchRes.contentType,
        error: '응답 XML에 <result> 루트 태그가 없습니다.',
        errorCategory: 'UNKNOWN',
        rawPreview: fetchRes.body.slice(0, 300),
      });
    }

    const totalCnt = parseInt(extractText(root.totalCnt) || '0', 10);
    const pageIndex = parseInt(extractText(root.pageIndex) || '1', 10);
    const pageUnit = parseInt(extractText(root.pageUnit) || '10', 10);

    let rawItems = root.item;
    if (!rawItems) rawItems = [];
    else if (!Array.isArray(rawItems)) rawItems = [rawItems];

    const previewItems = rawItems.slice(0, 3).map((item: any) => ({
      name: extractText(item.ccbaMnm1),
      nameHanja: extractText(item.ccbaMnm2),
      heritageType: extractText(item.ccmaName),
      province: extractText(item.ccbaCtcdNm),
      district: extractText(item.ccsiName),
      admin: extractText(item.ccbaAdmin),
      heritageCode: {
        kind: extractText(item.ccbaKdcd),
        number: extractText(item.ccbaAsno),
        province: extractText(item.ccbaCtcd),
      },
    }));

    return res.json({
      success: true,
      testedQuery: query,
      targetUrl,
      statusCode: fetchRes.statusCode,
      durationMs: fetchRes.durationMs,
      contentType: fetchRes.contentType,
      totalCount: totalCnt,
      pageIndex,
      pageUnit,
      receivedItemsCount: rawItems.length,
      previewItems,
      diagnosis: {
        urlValid: true,
        parametersValid: true,
        networkConnected: true,
        upstreamServerAvailable: true,
        latencyLevel: fetchRes.durationMs < 2000 ? '매우 양호 (FAST)' : fetchRes.durationMs < 5000 ? '보통 (NORMAL)' : '지연 (SLOW)',
        verifiedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      testedQuery: query,
      targetUrl,
      statusCode: fetchRes.statusCode,
      durationMs: fetchRes.durationMs,
      contentType: fetchRes.contentType,
      error: `XML 파싱 실패: ${err.message}`,
      errorCategory: 'UNKNOWN',
    });
  }
});

// 2. API: Search Heritage Items
app.get('/api/heritage/search', async (req, res) => {
  const query = (req.query.query as string || '').trim();
  const regionRaw = (req.query.region as string || '').trim();
  const page = parseInt(req.query.page as string || '1', 10) || 1;
  const limit = Math.min(Math.max(parseInt(req.query.limit as string || '12', 10) || 12, 1), 100);

  let ccbaCtcd = '';
  if (regionRaw) {
    if (REGION_CODES[regionRaw]) {
      ccbaCtcd = REGION_CODES[regionRaw];
    } else if (Object.values(REGION_CODES).includes(regionRaw)) {
      ccbaCtcd = regionRaw;
    }
  }

  const params = new URLSearchParams({
    pageUnit: String(limit),
    pageIndex: String(page),
    ccbaCncl: 'N',
  });

  if (query) {
    params.append('ccbaMnm1', query);
  }
  if (ccbaCtcd) {
    params.append('ccbaCtcd', ccbaCtcd);
  }

  const targetUrl = `${LIST_URL}?${params.toString()}`;
  const fetchRes = await fetchWithDiagnostics(targetUrl, 20000);

  if (fetchRes.error || fetchRes.statusCode !== 200) {
    return res.status(fetchRes.statusCode || 502).json({
      error: fetchRes.error || `공식 API 오류 (${fetchRes.statusCode})`,
      category: fetchRes.errorCategory,
      targetUrl,
      durationMs: fetchRes.durationMs,
    });
  }

  try {
    const parsed = parser.parse(fetchRes.body);
    const root = parsed.result;
    if (!root) {
      return res.status(502).json({
        error: '공식 API 응답 형식이 올바르지 않습니다.',
        targetUrl,
      });
    }

    const totalCnt = parseInt(extractText(root.totalCnt) || '0', 10);
    let rawItems = root.item;
    if (!rawItems) rawItems = [];
    else if (!Array.isArray(rawItems)) rawItems = [rawItems];

    const items = rawItems.map((item: any) => ({
      name: extractText(item.ccbaMnm1),
      nameHanja: extractText(item.ccbaMnm2),
      heritageType: extractText(item.ccmaName),
      province: extractText(item.ccbaCtcdNm),
      district: extractText(item.ccsiName),
      admin: extractText(item.ccbaAdmin),
      latitude: parseFloat(extractText(item.latitude)) || null,
      longitude: parseFloat(extractText(item.longitude)) || null,
      designatedStatus: extractText(item.ccbaCncl) || 'N',
      updatedAt: extractText(item.regDt),
      heritageCode: {
        kind: extractText(item.ccbaKdcd),
        number: extractText(item.ccbaAsno),
        province: extractText(item.ccbaCtcd),
      },
      imageUrl: extractText(item.imageUrl) || '',
    }));

    return res.json({
      totalResults: totalCnt,
      page,
      pageSize: limit,
      totalPages: Math.ceil(totalCnt / limit),
      items,
      source: {
        url: targetUrl,
        officialPortalName: '국가유산청(Korea Heritage Service)',
        fetchedAt: new Date().toISOString(),
        durationMs: fetchRes.durationMs,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      error: `결과 처리 오류: ${err.message}`,
      targetUrl,
    });
  }
});

// 3. API: Detail Heritage Item
app.get('/api/heritage/detail', async (req, res) => {
  const kind = (req.query.kind as string || '').trim();
  const asno = (req.query.asno as string || '').trim();
  const ctcd = (req.query.province_code as string || req.query.ctcd as string || '').trim();

  if (!kind || !asno || !ctcd) {
    return res.status(400).json({
      error: '상세 조회에는 kind(종목코드), asno(지정번호), ctcd(시도코드)가 모두 필요합니다.',
    });
  }

  const params = new URLSearchParams({
    ccbaKdcd: kind,
    ccbaAsno: asno,
    ccbaCtcd: ctcd,
  });

  const targetUrl = `${DETAIL_URL}?${params.toString()}`;
  const fetchRes = await fetchWithDiagnostics(targetUrl, 20000);

  if (fetchRes.error || fetchRes.statusCode !== 200) {
    return res.status(fetchRes.statusCode || 502).json({
      error: fetchRes.error || `공식 API 상세 조회 오류 (${fetchRes.statusCode})`,
      category: fetchRes.errorCategory,
      targetUrl,
      durationMs: fetchRes.durationMs,
    });
  }

  try {
    const parsed = parser.parse(fetchRes.body);
    const root = parsed.result;
    if (!root || !root.item) {
      return res.status(404).json({
        error: '해당 국가유산의 상세 정보를 찾을 수 없습니다.',
        targetUrl,
      });
    }

    const item = root.item;
    const name = extractText(item.ccbaMnm1);
    if (!name) {
      return res.status(404).json({
        error: '국가유산 상세 명칭이 비어 있습니다.',
        targetUrl,
      });
    }

    const classifications = [
      extractText(item.gcodeName),
      extractText(item.bcodeName),
      extractText(item.mcodeName),
      extractText(item.scodeName),
    ].filter(Boolean);

    const detailData = {
      name,
      nameHanja: extractText(item.ccbaMnm2),
      heritageType: extractText(item.ccmaName),
      classifications,
      quantity: extractText(item.ccbaQuan),
      designatedDate: extractText(item.ccbaAsdt), // e.g. 19850108
      province: extractText(item.ccbaCtcdNm),
      district: extractText(item.ccsiName),
      address: extractText(item.ccbaLcad),
      era: extractText(item.ccceName), // 시대
      ownership: extractText(item.ccbaPoss), // 소유자
      admin: extractText(item.ccbaAdmin), // 관리자
      description: extractText(item.content),
      imageUrl: extractText(item.imageUrl),
      latitude: parseFloat(extractText(root.latitude)) || parseFloat(extractText(item.latitude)) || null,
      longitude: parseFloat(extractText(root.longitude)) || parseFloat(extractText(item.longitude)) || null,
      heritageCode: {
        kind: extractText(root.ccbaKdcd) || kind,
        number: extractText(root.ccbaAsno) || asno,
        province: extractText(root.ccbaCtcd) || ctcd,
        cpno: extractText(root.ccbaCpno),
      },
      source: {
        url: targetUrl,
        officialPortalUrl: `https://www.heritage.go.kr/main/?v=${encodeURIComponent(name)}`,
        officialGuideUrl: 'https://www.khs.go.kr/html/HtmlPage.do?mn=NS_04_04_03&pg=%2Fpublicinfo%2Fpbinfo3_0201.jsp',
        fetchedAt: new Date().toISOString(),
        durationMs: fetchRes.durationMs,
      },
    };

    return res.json(detailData);
  } catch (err: any) {
    return res.status(500).json({
      error: `상세 정보 분석 실패: ${err.message}`,
      targetUrl,
    });
  }
});

// 4. API: Heritage Events
app.get('/api/heritage/events', async (req, res) => {
  const year = req.query.year as string || new Date().getFullYear().toString();
  const month = req.query.month as string || String(new Date().getMonth() + 1).padStart(2, '0');
  const region = (req.query.region as string || '').trim();
  const limit = Math.min(Math.max(parseInt(req.query.limit as string || '20', 10) || 20, 1), 100);

  const params = new URLSearchParams({
    searchYear: year,
    searchMonth: month.padStart(2, '0'),
  });

  const targetUrl = `${EVENT_URL}?${params.toString()}`;
  const fetchRes = await fetchWithDiagnostics(targetUrl, 20000);

  if (fetchRes.error || fetchRes.statusCode !== 200) {
    return res.status(fetchRes.statusCode || 502).json({
      error: fetchRes.error || `행사 API 오류 (${fetchRes.statusCode})`,
      category: fetchRes.errorCategory,
      targetUrl,
    });
  }

  try {
    const parsed = parser.parse(fetchRes.body);
    const root = parsed.result;
    let rawItems = root?.item;
    if (!rawItems) rawItems = [];
    else if (!Array.isArray(rawItems)) rawItems = [rawItems];

    let events = rawItems.map((item: any) => ({
      title: extractText(item.subTitle),
      description: extractText(item.subContent),
      startDate: extractText(item.sDate),
      endDate: extractText(item.eDate),
      displayDate: extractText(item.subDate),
      province: extractText(item.sido),
      district: extractText(item.gugun),
      venue: extractText(item.subDesc),
      organizer: extractText(item.groupName),
      audience: extractText(item.subDesc_2),
      fee: extractText(item.subDesc_3),
      contact: extractText(item.contact),
      url: extractText(item.subPath),
    }));

    if (region) {
      events = events.filter((e: any) => e.province.includes(region) || e.district.includes(region));
    }

    return res.json({
      year,
      month,
      totalCount: events.length,
      events: events.slice(0, limit),
      source: {
        url: targetUrl,
        fetchedAt: new Date().toISOString(),
        durationMs: fetchRes.durationMs,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      error: `행사 정보 분석 실패: ${err.message}`,
      targetUrl,
    });
  }
});

// ============================================================================
// 5. API: Joseon Sillok Search (조선왕조실록 검색)
// ============================================================================
const SILLOK_BASE_URL = 'https://sillok.history.go.kr';
const SILLOK_SEARCH_URL = `${SILLOK_BASE_URL}/search/searchResultList.do`;

const SILLOK_KING_ACCESSION_YEARS: Record<string, number> = {
  '태조': 1392,
  '정종': 1399,
  '태종': 1401,
  '세종': 1418,
  '문종': 1450,
  '단종': 1452,
  '세조': 1455,
  '예종': 1468,
  '성종': 1469,
  '연산군': 1494,
  '중종': 1506,
  '인종': 1545,
  '명종': 1545,
  '선조': 1567,
  '선조수정': 1567,
  '광해군': 1608,
  '광해군중초본': 1608,
  '광해군정초본': 1608,
  '인조': 1623,
  '효종': 1649,
  '현종': 1659,
  '현종개수': 1659,
  '숙종': 1674,
  '숙종보궐정오': 1674,
  '경종': 1720,
  '경종수정': 1720,
  '영조': 1724,
  '정조': 1776,
  '순조': 1800,
  '헌종': 1834,
  '철종': 1849,
  '고종': 1863,
  '순종': 1907,
  '순종부록': 1910,
};

const SILLOK_KING_ALIASES: Record<string, string> = {
  '태조실록': '태조',
  '정종실록': '정종',
  '태종실록': '태종',
  '세종실록': '세종',
  '문종실록': '문종',
  '단종실록': '단종',
  '세조실록': '세조',
  '예종실록': '예종',
  '성종실록': '성종',
  '연산군일기': '연산군',
  '중종실록': '중종',
  '인종실록': '인종',
  '명종실록': '명종',
  '선조실록': '선조',
  '선조수정실록': '선조수정',
  '광해군일기': '광해군',
  '인조실록': '인조',
  '효종실록': '효종',
  '현종실록': '현종',
  '현종개수실록': '현종개수',
  '숙종실록': '숙종',
  '숙종보궐정오실록': '숙종보궐정오',
  '경종실록': '경종',
  '경종수정실록': '경종수정',
  '영조실록': '영조',
  '정조실록': '정조',
  '순조실록': '순조',
  '헌종실록': '헌종',
  '철종실록': '철종',
  '고종실록': '고종',
  '순종실록': '순종',
  '순종실록부록': '순종부록',
};

function normalizeKingName(name?: string): string | null {
  if (!name) return null;
  const cleaned = name.trim().replace(/\s+/g, '');
  if (!cleaned) return null;
  return SILLOK_KING_ALIASES[cleaned] || cleaned;
}

function parseSillokTitle(titleRaw: string) {
  const cleaned = cleanText(titleRaw).replace(/^\d+\.\s*/, '');
  let articleTitle = cleaned;
  if (cleaned.includes('/')) {
    articleTitle = cleaned.split('/')[1].trim();
  }

  const metaMatch = cleaned.match(/,\s*([^\s,]+)\s+(즉위년|\d+년)/);
  if (!metaMatch) {
    return { king: null, regnalYear: null, gregorianYear: null, articleTitle, fullTitle: cleaned };
  }

  const king = normalizeKingName(metaMatch[1]);
  const yearToken = metaMatch[2];
  const regnalYear = yearToken === '즉위년' ? 0 : parseInt(yearToken.replace('년', ''), 10);
  const accessionYear = king ? SILLOK_KING_ACCESSION_YEARS[king] : undefined;
  let gregorianYear: number | null = null;
  if (accessionYear !== undefined) {
    gregorianYear = yearToken === '즉위년' ? accessionYear : accessionYear + regnalYear;
  }

  return { king, regnalYear, gregorianYear, articleTitle, fullTitle: cleaned };
}

async function fetchSillokSearchPage(query: string, searchType: string, pageIdx: number, pageUnit: number = 20) {
  const postBody = new URLSearchParams({
    topSearchWord: query,
    pageIndex: String(pageIdx),
    initPageUnit: String(pageUnit),
    pageUnit: String(pageUnit),
    type: searchType,
    sillokType: 'S',
    topSearchWord_ime: `<span class="newbatang">${query}</span>`,
  }).toString();

  const sillokRes = await fetch(SILLOK_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Origin': SILLOK_BASE_URL,
      'Referer': `${SILLOK_BASE_URL}/main/main.do`,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      'Cookie': `sillok_op_search_pageUnit=${pageUnit}`,
    },
    body: postBody,
  });

  if (!sillokRes.ok) {
    throw new Error(`실록 공식 서버 응답 오류 (HTTP ${sillokRes.status})`);
  }

  const html = await sillokRes.text();
  const totalMatch = html.match(/검색결과\s*<strong>(\d+)<\/strong>개/);
  const totalCount = totalMatch ? parseInt(totalMatch[1], 10) : 0;

  const countKMatch = html.match(/<input[^>]+id="countK"[^>]+value="([^"]*)"/);
  const countWMatch = html.match(/<input[^>]+id="countW"[^>]+value="([^"]*)"/);
  const countK = countKMatch ? parseInt(countKMatch[1], 10) : totalCount;
  const countW = countWMatch ? parseInt(countWMatch[1], 10) : totalCount;

  const typeCount = searchType === 'w' ? countW : countK;

  const categories: Array<{ label: string; count: number; token: string }> = [];
  const catMatches = html.matchAll(/<a\s+href="javascript:searchCategory\('([^']*)'\);"\s+class="cate-item[^"]*">(.*?)<\/a>/gs);
  for (const match of catMatches) {
    const labelText = cleanText(match[2]);
    const m = labelText.match(/(.+?)\s*\((\d+)\)/);
    if (m) {
      categories.push({
        token: match[1],
        label: m[1].trim(),
        count: parseInt(m[2], 10),
      });
    }
  }

  const itemMatches = [...html.matchAll(/<div\s+class="result-box">[\s\S]*?<a\s+href="javascript:goView\('([^']+)',\s*\d+\);"\s+class="subject">([\s\S]*?)<\/a>\s*<p\s+class="text">([\s\S]*?)<\/p>/gs)];
  const items = itemMatches.map((m) => {
    const articleId = m[1];
    const titleRaw = m[2];
    const summaryRaw = m[3];
    const meta = parseSillokTitle(titleRaw);

    return {
      article_id: articleId,
      url: `${SILLOK_BASE_URL}/id/${articleId}`,
      title: meta.fullTitle,
      article_title: meta.articleTitle,
      summary: cleanText(summaryRaw),
      king: meta.king || undefined,
      regnal_year: meta.regnalYear !== null ? meta.regnalYear : undefined,
      gregorian_year: meta.gregorianYear || undefined,
      excerpt: cleanText(summaryRaw),
    };
  });

  return { totalCount, countK, countW, typeCount, categories, items };
}

// Search Joseon Sillok
app.get('/api/sillok/search', async (req, res) => {
  const query = (req.query.query as string || req.query.keyword as string || '').trim();
  const rawKing = (req.query.king as string || '').trim();
  const rawYear = req.query.year ? parseInt(req.query.year as string, 10) : null;
  const searchType = ((req.query.type as string || req.query.search_type as string || 'k') === 'w' ? 'w' : 'k');
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize as string || req.query.limit as string || '20', 10) || 20, 1), 100);
  const requestedPage = Math.max(parseInt(req.query.page as string || '1', 10) || 1, 1);

  if (!query) {
    return res.status(400).json({ error: '검색어를 입력해 주세요.' });
  }

  const filterKing = normalizeKingName(rawKing);
  const startTime = Date.now();

  try {
    // Case 1: Simple pagination without King/Year filter (Direct 1:1 Page mapping)
    if (!filterKing && !rawYear) {
      const pageReport = await fetchSillokSearchPage(query, searchType, requestedPage, pageSize);
      const durationMs = Date.now() - startTime;
      const totalResults = pageReport.typeCount || pageReport.totalCount || 0;
      const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));

      return res.json({
        query,
        type: searchType,
        filters: {
          king: undefined,
          year: undefined,
          page: requestedPage,
          pageSize,
        },
        total_results: totalResults,
        type_count: pageReport.typeCount,
        total_all: pageReport.totalCount,
        page: requestedPage,
        pageSize,
        totalPages,
        returned_count: pageReport.items.length,
        categories: pageReport.categories,
        items: pageReport.items,
        source: {
          url: SILLOK_SEARCH_URL,
          officialPortalName: '국사편찬위원회 조선왕조실록',
          fetchedAt: new Date().toISOString(),
          durationMs,
        },
      });
    }

    // Case 2: Filtered by King and/or Year
    let allFilteredItems: any[] = [];
    let firstPageReport: any = null;
    const targetOffset = (requestedPage - 1) * pageSize;
    const targetCount = requestedPage * pageSize;
    const scanPageSize = 50;
    let currOfficialPage = 1;
    let officialTotalPages = 1;

    // Fetch first page
    firstPageReport = await fetchSillokSearchPage(query, searchType, 1, scanPageSize);
    const officialTotal = firstPageReport.typeCount || firstPageReport.totalCount || 0;
    officialTotalPages = Math.max(1, Math.ceil(officialTotal / scanPageSize));

    let pageItems = firstPageReport.items.filter((it: any) => {
      if (filterKing && it.king !== filterKing && !(it.king && it.king.includes(filterKing))) return false;
      if (rawYear && it.gregorian_year !== rawYear) return false;
      return true;
    });
    allFilteredItems.push(...pageItems);

    // Fetch subsequent pages if more are needed to fulfill requested page
    while (currOfficialPage < officialTotalPages && currOfficialPage < 20) {
      if (allFilteredItems.length >= targetCount) {
        break;
      }
      currOfficialPage++;
      const nextReport = await fetchSillokSearchPage(query, searchType, currOfficialPage, scanPageSize);
      if (nextReport.items.length === 0) break;

      const filtered = nextReport.items.filter((it: any) => {
        if (filterKing && it.king !== filterKing && !(it.king && it.king.includes(filterKing))) return false;
        if (rawYear && it.gregorian_year !== rawYear) return false;
        return true;
      });
      allFilteredItems.push(...filtered);
    }

    // Determine total filtered count
    let totalFilteredResults = allFilteredItems.length;
    if (filterKing && !rawYear && firstPageReport.categories) {
      const cat = firstPageReport.categories.find(
        (c: any) => c.label.includes(filterKing) || filterKing.includes(c.label.replace('실록', ''))
      );
      if (cat && cat.count > 0) {
        totalFilteredResults = cat.count;
      }
    }

    const durationMs = Date.now() - startTime;
    const pagedItems = allFilteredItems.slice(targetOffset, targetOffset + pageSize);
    const totalPages = Math.max(1, Math.ceil(totalFilteredResults / pageSize));

    return res.json({
      query,
      type: searchType,
      filters: {
        king: filterKing || undefined,
        year: rawYear || undefined,
        page: requestedPage,
        pageSize,
      },
      total_results: totalFilteredResults,
      type_count: totalFilteredResults,
      total_all: firstPageReport.totalCount,
      page: requestedPage,
      pageSize,
      totalPages,
      returned_count: pagedItems.length,
      categories: firstPageReport.categories,
      items: pagedItems,
      source: {
        url: SILLOK_SEARCH_URL,
        officialPortalName: '국사편찬위원회 조선왕조실록',
        fetchedAt: new Date().toISOString(),
        durationMs,
      },
    });
  } catch (err: any) {
    let category = 'UNKNOWN';
    if (err.name === 'AbortError') category = 'UPSTREAM_TIMEOUT';
    else if (err.code === 'ENOTFOUND' || err.code === 'ECONNRESET') category = 'NETWORK_CONNECTION_ERROR';

    return res.status(502).json({
      error: `조선왕조실록 검색 실패: ${err.message}`,
      category,
    });
  }
});

// Sillok Article Detail
app.get('/api/sillok/detail', async (req, res) => {
  const articleId = (req.query.article_id as string || req.query.id as string || '').trim();
  if (!articleId) {
    return res.status(400).json({ error: 'article_id가 필요합니다.' });
  }

  const targetUrl = `${SILLOK_BASE_URL}/id/${articleId}`;
  const startTime = Date.now();

  try {
    let controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const sillokRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
        'Referer': SILLOK_SEARCH_URL,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!sillokRes.ok) {
      return res.status(sillokRes.status || 502).json({
        error: `실록 상세 페이지 조회 실패 (HTTP ${sillokRes.status})`,
        targetUrl,
      });
    }

    const html = await sillokRes.text();
    const durationMs = Date.now() - startTime;

    const titleHeadMatch = html.match(/<div\s+class="title">\s*<p\s+class="date">([\s\S]*?)<\/p>\s*<h3>([\s\S]*?)<\/h3>/);
    const leftMatch = html.match(/<div\s+class="view-item\s+left">[\s\S]*?<div\s+class="view-text">([\s\S]*?)<\/div>/);
    const rightMatch = html.match(/<div\s+class="view-item\s+right">[\s\S]*?<div\s+class="view-text">([\s\S]*?)<\/div>/);
    const classMatch = html.match(/<li\s+class="view_font02">\s*[【〖]분류[】〗]\s*(.*?)<\/li>/s);

    const header = titleHeadMatch ? cleanText(titleHeadMatch[1]) : '';
    const title = titleHeadMatch ? cleanText(titleHeadMatch[2]) : '';
    let translatedText = leftMatch ? cleanText(leftMatch[1]) : '';
    let originalText = rightMatch ? cleanText(rightMatch[1]) : '';
    const classification = classMatch ? cleanText(classMatch[1]) : undefined;

    // Filter footer notes from translated/original text
    translatedText = translatedText.replace(/[【〖](?:태백산사고본|국편영인본|분류)[】〗].*$/gs, '').trim();
    originalText = originalText.replace(/[【〖](?:태백산사고본|국편영인본|분류)[】〗].*$/gs, '').trim();

    return res.json({
      article_id: articleId,
      url: targetUrl,
      header,
      title,
      translated_text: translatedText,
      original_text: originalText,
      classification,
      source: {
        url: targetUrl,
        officialPortalName: '국사편찬위원회 조선왕조실록',
        fetchedAt: new Date().toISOString(),
        durationMs,
      },
    });
  } catch (err: any) {
    return res.status(502).json({
      error: `실록 상세 기사 조회 실패: ${err.message}`,
      category: err.name === 'AbortError' ? 'UPSTREAM_TIMEOUT' : 'UNKNOWN',
      targetUrl,
    });
  }
});

// ============================================================================
// 6. API: Library Book Search (국립중앙도서관 Data4Library 프록시)
// ============================================================================
const PROXY_BASE_URL = 'https://k-skill-proxy.nomadamas.org';

// Book Search
app.get('/api/library/books', async (req, res) => {
  const keyword = (req.query.keyword as string || req.query.query as string || req.query.q as string || '').trim();
  const pageNo = Math.max(parseInt(req.query.page as string || req.query.pageNo as string || '1', 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.limit as string || req.query.pageSize as string || '10', 10) || 10, 1), 50);

  if (!keyword) {
    return res.status(400).json({ error: '도서 검색어를 입력해 주세요.' });
  }

  const startTime = Date.now();
  const targetUrl = `${PROXY_BASE_URL}/v1/data4library/book-search?${new URLSearchParams({
    keyword,
    pageNo: String(pageNo),
    pageSize: String(pageSize),
  }).toString()}`;

  try {
    let controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const proxyRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'KHS-GojungNote-Client/1.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!proxyRes.ok) {
      return res.status(proxyRes.status || 502).json({
        error: `도서관 프록시 서버 오류 (HTTP ${proxyRes.status})`,
        category: 'SERVER_ERROR',
        targetUrl,
      });
    }

    const data: any = await proxyRes.json();
    const durationMs = Date.now() - startTime;

    const responseObj = data.response || {};
    const numFound = responseObj.numFound || 0;
    const rawDocs = responseObj.docs || [];

    const books = rawDocs.map((d: any) => {
      const doc = d.doc || {};
      return {
        bookname: doc.bookname || '',
        authors: doc.authors || '',
        publisher: doc.publisher || '',
        publication_year: doc.publication_year || '',
        isbn13: doc.isbn13 || '',
        addition_symbol: doc.addition_symbol || '',
        vol: doc.vol || '',
        class_no: doc.class_no || '',
        class_nm: doc.class_nm || '',
        bookImageURL: doc.bookImageURL || '',
        bookDtlUrl: doc.bookDtlUrl || '',
        loan_count: doc.loan_count || '0',
      };
    });

    return res.json({
      totalResults: numFound,
      page: pageNo,
      pageSize,
      totalPages: Math.ceil(numFound / pageSize),
      books,
      source: {
        url: targetUrl,
        proxyName: data.proxy?.name || 'k-skill-proxy',
        officialSource: '국립중앙도서관 도서관 정보나루 (Data4Library)',
        fetchedAt: new Date().toISOString(),
        durationMs,
      },
    });
  } catch (err: any) {
    let category = 'UNKNOWN';
    if (err.name === 'AbortError') category = 'UPSTREAM_TIMEOUT';
    else if (err.code === 'ENOTFOUND' || err.code === 'ECONNRESET') category = 'NETWORK_CONNECTION_ERROR';

    return res.status(502).json({
      error: `도서 검색 실패: ${err.message}`,
      category,
      targetUrl,
    });
  }
});

// Book Detail
app.get('/api/library/book-detail', async (req, res) => {
  const isbn13 = (req.query.isbn13 as string || req.query.isbn as string || '').trim().replace(/-/g, '');
  if (!isbn13) {
    return res.status(400).json({ error: 'isbn13 번호가 필요합니다.' });
  }

  const startTime = Date.now();
  const targetUrl = `${PROXY_BASE_URL}/v1/data4library/book-detail?${new URLSearchParams({
    isbn13,
    loaninfoYN: 'Y',
  }).toString()}`;

  try {
    let controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const proxyRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'KHS-GojungNote-Client/1.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!proxyRes.ok) {
      return res.status(proxyRes.status || 502).json({
        error: `도서 상세 조회 실패 (HTTP ${proxyRes.status})`,
        category: 'SERVER_ERROR',
        targetUrl,
      });
    }

    const data: any = await proxyRes.json();
    const durationMs = Date.now() - startTime;

    const detailList = data.response?.detail || [];
    const bookDoc = detailList[0]?.book || {};

    const result = {
      bookname: bookDoc.bookname || '',
      authors: bookDoc.authors || '',
      publisher: bookDoc.publisher || '',
      publication_date: bookDoc.publication_date || '',
      publication_year: bookDoc.publication_year || '',
      isbn: bookDoc.isbn || '',
      isbn13: bookDoc.isbn13 || isbn13,
      class_no: bookDoc.class_no || '',
      class_nm: bookDoc.class_nm || '',
      description: bookDoc.description || '',
      bookImageURL: bookDoc.bookImageURL || '',
      loanInfo: data.response?.loanInfo || null,
      source: {
        url: targetUrl,
        officialPortalUrl: `https://data4library.kr/bookV?isbn13=${isbn13}`,
        fetchedAt: new Date().toISOString(),
        durationMs,
      },
    };

    return res.json(result);
  } catch (err: any) {
    return res.status(502).json({
      error: `도서 상세 정보 조회 실패: ${err.message}`,
      category: err.name === 'AbortError' ? 'UPSTREAM_TIMEOUT' : 'UNKNOWN',
      targetUrl,
    });
  }
});

// Libraries Holding Book
app.get('/api/library/libraries', async (req, res) => {
  const isbn = (req.query.isbn as string || req.query.isbn13 as string || '').trim().replace(/-/g, '');
  const region = (req.query.region as string || '11').trim(); // Default 서울 (11)
  const pageNo = Math.max(parseInt(req.query.page as string || '1', 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.limit as string || '10', 10) || 10, 1), 30);

  if (!isbn) {
    return res.status(400).json({ error: 'isbn 번호가 필요합니다.' });
  }

  const startTime = Date.now();
  const targetUrl = `${PROXY_BASE_URL}/v1/data4library/libraries-by-book?${new URLSearchParams({
    isbn,
    region,
    pageNo: String(pageNo),
    pageSize: String(pageSize),
  }).toString()}`;

  try {
    let controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const proxyRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'KHS-GojungNote-Client/1.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!proxyRes.ok) {
      return res.status(proxyRes.status || 502).json({
        error: `소장 도서관 조회 실패 (HTTP ${proxyRes.status})`,
        category: 'SERVER_ERROR',
        targetUrl,
      });
    }

    const data: any = await proxyRes.json();
    const durationMs = Date.now() - startTime;

    const responseObj = data.response || {};
    const rawLibs = responseObj.libs || [];
    const numFound = responseObj.numFound || 0;

    const libraries = rawLibs.map((item: any) => {
      const lib = item.lib || {};
      return {
        libCode: lib.libCode || '',
        libName: lib.libName || '',
        address: lib.address || '',
        tel: lib.tel || '',
        fax: lib.fax || '',
        latitude: lib.latitude || '',
        longitude: lib.longitude || '',
        homepage: lib.homepage || '',
        closed: lib.closed || '',
        operatingTime: lib.operatingTime || '',
      };
    });

    return res.json({
      totalResults: numFound,
      page: pageNo,
      pageSize,
      region,
      libraries,
      source: {
        url: targetUrl,
        fetchedAt: new Date().toISOString(),
        durationMs,
      },
    });
  } catch (err: any) {
    return res.status(502).json({
      error: `소장 도서관 조회 실패: ${err.message}`,
      category: err.name === 'AbortError' ? 'UPSTREAM_TIMEOUT' : 'UNKNOWN',
      targetUrl,
    });
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const server = http.createServer(app);
  server.listen(PORT, () => {
    console.log(`[고증노트] 서버가 포트 ${PORT}에서 실행 중입니다.`);
  });
}

startServer();
