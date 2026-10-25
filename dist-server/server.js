// server.ts
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { XMLParser } from "fast-xml-parser";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = process.env.PORT || 3e3;
app.use(express.json());
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (KHS-GojungNote-Client/1.0)";
var LIST_URL = "https://www.khs.go.kr/cha/SearchKindOpenapiList.do";
var DETAIL_URL = "https://www.khs.go.kr/cha/SearchKindOpenapiDt.do";
var EVENT_URL = "https://www.khs.go.kr/cha/openapi/selectEventListOpenapi.do";
var REGION_CODES = {
  "\uC11C\uC6B8": "11",
  "\uBD80\uC0B0": "21",
  "\uB300\uAD6C": "22",
  "\uC778\uCC9C": "23",
  "\uAD11\uC8FC": "24",
  "\uB300\uC804": "25",
  "\uC6B8\uC0B0": "26",
  "\uACBD\uAE30": "31",
  "\uAC15\uC6D0": "32",
  "\uCDA9\uBD81": "33",
  "\uCDA9\uB0A8": "34",
  "\uC804\uBD81": "35",
  "\uC804\uB0A8": "36",
  "\uACBD\uBD81": "37",
  "\uACBD\uB0A8": "38",
  "\uC81C\uC8FC": "39",
  "\uC138\uC885": "45"
};
function cleanText(val) {
  if (val === null || val === void 0) return "";
  let str = String(val);
  str = str.replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1");
  str = str.replace(/<br\s*\/?>/gi, "\n");
  str = str.replace(/<\/?(?:p|div|li|ul|ol|h[1-6])[^>]*>/gi, "\n");
  str = str.replace(/<[^>]+>/g, "");
  str = str.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  str = str.replace(/[ \t\f\v]+/g, " ");
  str = str.replace(/\n\s+/g, "\n");
  str = str.replace(/\n{3,}/g, "\n\n");
  return str.trim();
}
var parser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  parseTagValue: false,
  // Keep raw strings to handle CDATA
  cdataPropName: "__cdata"
});
function extractText(val) {
  if (val === null || val === void 0) return "";
  if (typeof val === "object") {
    if (val.__cdata !== void 0) return cleanText(val.__cdata);
    if (val["#text"] !== void 0) return cleanText(val["#text"]);
  }
  return cleanText(val);
}
async function fetchWithDiagnostics(urlStr, timeoutMs = 15e3) {
  const startTime = Date.now();
  let controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(urlStr, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/xml, text/xml, */*"
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;
    const body = await res.text();
    return {
      statusCode: res.status,
      durationMs,
      contentType: res.headers.get("content-type") || "",
      body
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;
    let errorCategory = "UNKNOWN";
    let errorMessage = err.message || String(err);
    if (err.name === "AbortError" || durationMs >= timeoutMs) {
      errorCategory = "UPSTREAM_TIMEOUT";
      errorMessage = `\uAD6D\uAC00\uC720\uC0B0\uCCAD \uACF5\uC2DD \uC11C\uBC84 \uC751\uB2F5 \uC9C0\uC5F0 (\uC694\uCCAD \uB300\uAE30\uC2DC\uAC04 ${timeoutMs}ms \uCD08\uACFC)`;
    } else if (err.code === "ENOTFOUND" || err.code === "ECONNREFUSED" || err.code === "ECONNRESET") {
      errorCategory = "NETWORK_CONNECTION_ERROR";
      errorMessage = `\uACF5\uC2DD \uC11C\uBC84 \uB124\uD2B8\uC6CC\uD06C \uC5F0\uACB0 \uC2E4\uD328 (${err.code})`;
    } else if (urlStr.includes("NaN") || urlStr.includes("undefined")) {
      errorCategory = "URL_PARAM_ERROR";
      errorMessage = `\uC694\uCCAD URL \uB610\uB294 \uD30C\uB77C\uBBF8\uD130 \uAD6C\uC131 \uC624\uB958`;
    }
    return {
      statusCode: 0,
      durationMs,
      contentType: "",
      body: "",
      error: errorMessage,
      errorCategory
    };
  }
}
app.get("/api/heritage/diagnostics", async (req, res) => {
  const query = req.query.query || "\uACBD\uBCF5\uAD81";
  const encodedQuery = encodeURIComponent(query);
  const targetUrl = `${LIST_URL}?ccbaCncl=N&ccbaMnm1=${encodedQuery}&pageUnit=10&pageIndex=1`;
  const fetchRes = await fetchWithDiagnostics(targetUrl, 15e3);
  if (fetchRes.error || fetchRes.statusCode !== 200) {
    return res.status(fetchRes.statusCode || 502).json({
      success: false,
      testedQuery: query,
      targetUrl,
      statusCode: fetchRes.statusCode,
      durationMs: fetchRes.durationMs,
      contentType: fetchRes.contentType,
      error: fetchRes.error || `HTTP \uC624\uB958 \uC0C1\uD0DC\uCF54\uB4DC: ${fetchRes.statusCode}`,
      errorCategory: fetchRes.errorCategory || "UNKNOWN",
      diagnosis: {
        urlValid: true,
        networkConnected: fetchRes.statusCode > 0,
        upstreamServerAvailable: false,
        note: fetchRes.errorCategory === "UPSTREAM_TIMEOUT" ? "\uAD6D\uAC00\uC720\uC0B0\uCCAD \uACF5\uC2DD \uC11C\uBC84\uC758 \uC751\uB2F5 \uC9C0\uC5F0\uC73C\uB85C \uD310\uB2E8\uB429\uB2C8\uB2E4." : fetchRes.errorCategory === "NETWORK_CONNECTION_ERROR" ? "\uC678\uBD80 \uACF5\uC2DD \uC11C\uBC84\uC640\uC758 \uB124\uD2B8\uC6CC\uD06C \uC5F0\uACB0\uC5D0 \uBB38\uC81C\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4." : "\uD655\uC778\uD560 \uC218 \uC5C6\uB294 \uC6D0\uC778(\uD655\uC778\uB418\uC9C0 \uC54A\uC74C)\uC785\uB2C8\uB2E4."
      }
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
        error: "\uC751\uB2F5 XML\uC5D0 <result> \uB8E8\uD2B8 \uD0DC\uADF8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.",
        errorCategory: "UNKNOWN",
        rawPreview: fetchRes.body.slice(0, 300)
      });
    }
    const totalCnt = parseInt(extractText(root.totalCnt) || "0", 10);
    const pageIndex = parseInt(extractText(root.pageIndex) || "1", 10);
    const pageUnit = parseInt(extractText(root.pageUnit) || "10", 10);
    let rawItems = root.item;
    if (!rawItems) rawItems = [];
    else if (!Array.isArray(rawItems)) rawItems = [rawItems];
    const previewItems = rawItems.slice(0, 3).map((item) => ({
      name: extractText(item.ccbaMnm1),
      nameHanja: extractText(item.ccbaMnm2),
      heritageType: extractText(item.ccmaName),
      province: extractText(item.ccbaCtcdNm),
      district: extractText(item.ccsiName),
      admin: extractText(item.ccbaAdmin),
      heritageCode: {
        kind: extractText(item.ccbaKdcd),
        number: extractText(item.ccbaAsno),
        province: extractText(item.ccbaCtcd)
      }
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
        latencyLevel: fetchRes.durationMs < 2e3 ? "\uB9E4\uC6B0 \uC591\uD638 (FAST)" : fetchRes.durationMs < 5e3 ? "\uBCF4\uD1B5 (NORMAL)" : "\uC9C0\uC5F0 (SLOW)",
        verifiedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      testedQuery: query,
      targetUrl,
      statusCode: fetchRes.statusCode,
      durationMs: fetchRes.durationMs,
      contentType: fetchRes.contentType,
      error: `XML \uD30C\uC2F1 \uC2E4\uD328: ${err.message}`,
      errorCategory: "UNKNOWN"
    });
  }
});
app.get("/api/heritage/search", async (req, res) => {
  const query = (req.query.query || "").trim();
  const regionRaw = (req.query.region || "").trim();
  const page = parseInt(req.query.page || "1", 10) || 1;
  const limit = Math.min(Math.max(parseInt(req.query.limit || "12", 10) || 12, 1), 100);
  let ccbaCtcd = "";
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
    ccbaCncl: "N"
  });
  if (query) {
    params.append("ccbaMnm1", query);
  }
  if (ccbaCtcd) {
    params.append("ccbaCtcd", ccbaCtcd);
  }
  const targetUrl = `${LIST_URL}?${params.toString()}`;
  const fetchRes = await fetchWithDiagnostics(targetUrl, 2e4);
  if (fetchRes.error || fetchRes.statusCode !== 200) {
    return res.status(fetchRes.statusCode || 502).json({
      error: fetchRes.error || `\uACF5\uC2DD API \uC624\uB958 (${fetchRes.statusCode})`,
      category: fetchRes.errorCategory,
      targetUrl,
      durationMs: fetchRes.durationMs
    });
  }
  try {
    const parsed = parser.parse(fetchRes.body);
    const root = parsed.result;
    if (!root) {
      return res.status(502).json({
        error: "\uACF5\uC2DD API \uC751\uB2F5 \uD615\uC2DD\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.",
        targetUrl
      });
    }
    const totalCnt = parseInt(extractText(root.totalCnt) || "0", 10);
    let rawItems = root.item;
    if (!rawItems) rawItems = [];
    else if (!Array.isArray(rawItems)) rawItems = [rawItems];
    const items = rawItems.map((item) => ({
      name: extractText(item.ccbaMnm1),
      nameHanja: extractText(item.ccbaMnm2),
      heritageType: extractText(item.ccmaName),
      province: extractText(item.ccbaCtcdNm),
      district: extractText(item.ccsiName),
      admin: extractText(item.ccbaAdmin),
      latitude: parseFloat(extractText(item.latitude)) || null,
      longitude: parseFloat(extractText(item.longitude)) || null,
      designatedStatus: extractText(item.ccbaCncl) || "N",
      updatedAt: extractText(item.regDt),
      heritageCode: {
        kind: extractText(item.ccbaKdcd),
        number: extractText(item.ccbaAsno),
        province: extractText(item.ccbaCtcd)
      },
      imageUrl: extractText(item.imageUrl) || ""
    }));
    return res.json({
      totalResults: totalCnt,
      page,
      pageSize: limit,
      totalPages: Math.ceil(totalCnt / limit),
      items,
      source: {
        url: targetUrl,
        officialPortalName: "\uAD6D\uAC00\uC720\uC0B0\uCCAD(Korea Heritage Service)",
        fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
        durationMs: fetchRes.durationMs
      }
    });
  } catch (err) {
    return res.status(500).json({
      error: `\uACB0\uACFC \uCC98\uB9AC \uC624\uB958: ${err.message}`,
      targetUrl
    });
  }
});
app.get("/api/heritage/detail", async (req, res) => {
  const kind = (req.query.kind || "").trim();
  const asno = (req.query.asno || "").trim();
  const ctcd = (req.query.province_code || req.query.ctcd || "").trim();
  if (!kind || !asno || !ctcd) {
    return res.status(400).json({
      error: "\uC0C1\uC138 \uC870\uD68C\uC5D0\uB294 kind(\uC885\uBAA9\uCF54\uB4DC), asno(\uC9C0\uC815\uBC88\uD638), ctcd(\uC2DC\uB3C4\uCF54\uB4DC)\uAC00 \uBAA8\uB450 \uD544\uC694\uD569\uB2C8\uB2E4."
    });
  }
  const params = new URLSearchParams({
    ccbaKdcd: kind,
    ccbaAsno: asno,
    ccbaCtcd: ctcd
  });
  const targetUrl = `${DETAIL_URL}?${params.toString()}`;
  const fetchRes = await fetchWithDiagnostics(targetUrl, 2e4);
  if (fetchRes.error || fetchRes.statusCode !== 200) {
    return res.status(fetchRes.statusCode || 502).json({
      error: fetchRes.error || `\uACF5\uC2DD API \uC0C1\uC138 \uC870\uD68C \uC624\uB958 (${fetchRes.statusCode})`,
      category: fetchRes.errorCategory,
      targetUrl,
      durationMs: fetchRes.durationMs
    });
  }
  try {
    const parsed = parser.parse(fetchRes.body);
    const root = parsed.result;
    if (!root || !root.item) {
      return res.status(404).json({
        error: "\uD574\uB2F9 \uAD6D\uAC00\uC720\uC0B0\uC758 \uC0C1\uC138 \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.",
        targetUrl
      });
    }
    const item = root.item;
    const name = extractText(item.ccbaMnm1);
    if (!name) {
      return res.status(404).json({
        error: "\uAD6D\uAC00\uC720\uC0B0 \uC0C1\uC138 \uBA85\uCE6D\uC774 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.",
        targetUrl
      });
    }
    const classifications = [
      extractText(item.gcodeName),
      extractText(item.bcodeName),
      extractText(item.mcodeName),
      extractText(item.scodeName)
    ].filter(Boolean);
    const detailData = {
      name,
      nameHanja: extractText(item.ccbaMnm2),
      heritageType: extractText(item.ccmaName),
      classifications,
      quantity: extractText(item.ccbaQuan),
      designatedDate: extractText(item.ccbaAsdt),
      // e.g. 19850108
      province: extractText(item.ccbaCtcdNm),
      district: extractText(item.ccsiName),
      address: extractText(item.ccbaLcad),
      era: extractText(item.ccceName),
      // 시대
      ownership: extractText(item.ccbaPoss),
      // 소유자
      admin: extractText(item.ccbaAdmin),
      // 관리자
      description: extractText(item.content),
      imageUrl: extractText(item.imageUrl),
      latitude: parseFloat(extractText(root.latitude)) || parseFloat(extractText(item.latitude)) || null,
      longitude: parseFloat(extractText(root.longitude)) || parseFloat(extractText(item.longitude)) || null,
      heritageCode: {
        kind: extractText(root.ccbaKdcd) || kind,
        number: extractText(root.ccbaAsno) || asno,
        province: extractText(root.ccbaCtcd) || ctcd,
        cpno: extractText(root.ccbaCpno)
      },
      source: {
        url: targetUrl,
        officialPortalUrl: `https://www.heritage.go.kr/main/?v=${encodeURIComponent(name)}`,
        officialGuideUrl: "https://www.khs.go.kr/html/HtmlPage.do?mn=NS_04_04_03&pg=%2Fpublicinfo%2Fpbinfo3_0201.jsp",
        fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
        durationMs: fetchRes.durationMs
      }
    };
    return res.json(detailData);
  } catch (err) {
    return res.status(500).json({
      error: `\uC0C1\uC138 \uC815\uBCF4 \uBD84\uC11D \uC2E4\uD328: ${err.message}`,
      targetUrl
    });
  }
});
app.get("/api/heritage/events", async (req, res) => {
  const year = req.query.year || (/* @__PURE__ */ new Date()).getFullYear().toString();
  const month = req.query.month || String((/* @__PURE__ */ new Date()).getMonth() + 1).padStart(2, "0");
  const region = (req.query.region || "").trim();
  const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10) || 20, 1), 100);
  const params = new URLSearchParams({
    searchYear: year,
    searchMonth: month.padStart(2, "0")
  });
  const targetUrl = `${EVENT_URL}?${params.toString()}`;
  const fetchRes = await fetchWithDiagnostics(targetUrl, 2e4);
  if (fetchRes.error || fetchRes.statusCode !== 200) {
    return res.status(fetchRes.statusCode || 502).json({
      error: fetchRes.error || `\uD589\uC0AC API \uC624\uB958 (${fetchRes.statusCode})`,
      category: fetchRes.errorCategory,
      targetUrl
    });
  }
  try {
    const parsed = parser.parse(fetchRes.body);
    const root = parsed.result;
    let rawItems = root?.item;
    if (!rawItems) rawItems = [];
    else if (!Array.isArray(rawItems)) rawItems = [rawItems];
    let events = rawItems.map((item) => ({
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
      url: extractText(item.subPath)
    }));
    if (region) {
      events = events.filter((e) => e.province.includes(region) || e.district.includes(region));
    }
    return res.json({
      year,
      month,
      totalCount: events.length,
      events: events.slice(0, limit),
      source: {
        url: targetUrl,
        fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
        durationMs: fetchRes.durationMs
      }
    });
  } catch (err) {
    return res.status(500).json({
      error: `\uD589\uC0AC \uC815\uBCF4 \uBD84\uC11D \uC2E4\uD328: ${err.message}`,
      targetUrl
    });
  }
});
var SILLOK_BASE_URL = "https://sillok.history.go.kr";
var SILLOK_SEARCH_URL = `${SILLOK_BASE_URL}/search/searchResultList.do`;
var SILLOK_KING_ACCESSION_YEARS = {
  "\uD0DC\uC870": 1392,
  "\uC815\uC885": 1399,
  "\uD0DC\uC885": 1401,
  "\uC138\uC885": 1418,
  "\uBB38\uC885": 1450,
  "\uB2E8\uC885": 1452,
  "\uC138\uC870": 1455,
  "\uC608\uC885": 1468,
  "\uC131\uC885": 1469,
  "\uC5F0\uC0B0\uAD70": 1494,
  "\uC911\uC885": 1506,
  "\uC778\uC885": 1545,
  "\uBA85\uC885": 1545,
  "\uC120\uC870": 1567,
  "\uC120\uC870\uC218\uC815": 1567,
  "\uAD11\uD574\uAD70": 1608,
  "\uAD11\uD574\uAD70\uC911\uCD08\uBCF8": 1608,
  "\uAD11\uD574\uAD70\uC815\uCD08\uBCF8": 1608,
  "\uC778\uC870": 1623,
  "\uD6A8\uC885": 1649,
  "\uD604\uC885": 1659,
  "\uD604\uC885\uAC1C\uC218": 1659,
  "\uC219\uC885": 1674,
  "\uC219\uC885\uBCF4\uAD90\uC815\uC624": 1674,
  "\uACBD\uC885": 1720,
  "\uACBD\uC885\uC218\uC815": 1720,
  "\uC601\uC870": 1724,
  "\uC815\uC870": 1776,
  "\uC21C\uC870": 1800,
  "\uD5CC\uC885": 1834,
  "\uCCA0\uC885": 1849,
  "\uACE0\uC885": 1863,
  "\uC21C\uC885": 1907,
  "\uC21C\uC885\uBD80\uB85D": 1910
};
var SILLOK_KING_ALIASES = {
  "\uD0DC\uC870\uC2E4\uB85D": "\uD0DC\uC870",
  "\uC815\uC885\uC2E4\uB85D": "\uC815\uC885",
  "\uD0DC\uC885\uC2E4\uB85D": "\uD0DC\uC885",
  "\uC138\uC885\uC2E4\uB85D": "\uC138\uC885",
  "\uBB38\uC885\uC2E4\uB85D": "\uBB38\uC885",
  "\uB2E8\uC885\uC2E4\uB85D": "\uB2E8\uC885",
  "\uC138\uC870\uC2E4\uB85D": "\uC138\uC870",
  "\uC608\uC885\uC2E4\uB85D": "\uC608\uC885",
  "\uC131\uC885\uC2E4\uB85D": "\uC131\uC885",
  "\uC5F0\uC0B0\uAD70\uC77C\uAE30": "\uC5F0\uC0B0\uAD70",
  "\uC911\uC885\uC2E4\uB85D": "\uC911\uC885",
  "\uC778\uC885\uC2E4\uB85D": "\uC778\uC885",
  "\uBA85\uC885\uC2E4\uB85D": "\uBA85\uC885",
  "\uC120\uC870\uC2E4\uB85D": "\uC120\uC870",
  "\uC120\uC870\uC218\uC815\uC2E4\uB85D": "\uC120\uC870\uC218\uC815",
  "\uAD11\uD574\uAD70\uC77C\uAE30": "\uAD11\uD574\uAD70",
  "\uC778\uC870\uC2E4\uB85D": "\uC778\uC870",
  "\uD6A8\uC885\uC2E4\uB85D": "\uD6A8\uC885",
  "\uD604\uC885\uC2E4\uB85D": "\uD604\uC885",
  "\uD604\uC885\uAC1C\uC218\uC2E4\uB85D": "\uD604\uC885\uAC1C\uC218",
  "\uC219\uC885\uC2E4\uB85D": "\uC219\uC885",
  "\uC219\uC885\uBCF4\uAD90\uC815\uC624\uC2E4\uB85D": "\uC219\uC885\uBCF4\uAD90\uC815\uC624",
  "\uACBD\uC885\uC2E4\uB85D": "\uACBD\uC885",
  "\uACBD\uC885\uC218\uC815\uC2E4\uB85D": "\uACBD\uC885\uC218\uC815",
  "\uC601\uC870\uC2E4\uB85D": "\uC601\uC870",
  "\uC815\uC870\uC2E4\uB85D": "\uC815\uC870",
  "\uC21C\uC870\uC2E4\uB85D": "\uC21C\uC870",
  "\uD5CC\uC885\uC2E4\uB85D": "\uD5CC\uC885",
  "\uCCA0\uC885\uC2E4\uB85D": "\uCCA0\uC885",
  "\uACE0\uC885\uC2E4\uB85D": "\uACE0\uC885",
  "\uC21C\uC885\uC2E4\uB85D": "\uC21C\uC885",
  "\uC21C\uC885\uC2E4\uB85D\uBD80\uB85D": "\uC21C\uC885\uBD80\uB85D"
};
function normalizeKingName(name) {
  if (!name) return null;
  const cleaned = name.trim().replace(/\s+/g, "");
  if (!cleaned) return null;
  return SILLOK_KING_ALIASES[cleaned] || cleaned;
}
function parseSillokTitle(titleRaw) {
  const cleaned = cleanText(titleRaw).replace(/^\d+\.\s*/, "");
  let articleTitle = cleaned;
  if (cleaned.includes("/")) {
    articleTitle = cleaned.split("/")[1].trim();
  }
  const metaMatch = cleaned.match(/,\s*([^\s,]+)\s+(즉위년|\d+년)/);
  if (!metaMatch) {
    return { king: null, regnalYear: null, gregorianYear: null, articleTitle, fullTitle: cleaned };
  }
  const king = normalizeKingName(metaMatch[1]);
  const yearToken = metaMatch[2];
  const regnalYear = yearToken === "\uC989\uC704\uB144" ? 0 : parseInt(yearToken.replace("\uB144", ""), 10);
  const accessionYear = king ? SILLOK_KING_ACCESSION_YEARS[king] : void 0;
  let gregorianYear = null;
  if (accessionYear !== void 0) {
    gregorianYear = yearToken === "\uC989\uC704\uB144" ? accessionYear : accessionYear + regnalYear;
  }
  return { king, regnalYear, gregorianYear, articleTitle, fullTitle: cleaned };
}
async function fetchSillokSearchPage(query, searchType, pageIdx) {
  const postBody = new URLSearchParams({
    topSearchWord: query,
    pageIndex: String(pageIdx),
    initPageUnit: "0",
    type: searchType,
    sillokType: "S",
    topSearchWord_ime: `<span class="newbatang">${query}</span>`
  }).toString();
  const sillokRes = await fetch(SILLOK_SEARCH_URL, {
    method: "POST",
    headers: {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
      "Content-Type": "application/x-www-form-urlencoded",
      "Origin": SILLOK_BASE_URL,
      "Referer": `${SILLOK_BASE_URL}/main/main.do`,
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
    },
    body: postBody
  });
  if (!sillokRes.ok) {
    throw new Error(`\uC2E4\uB85D \uACF5\uC2DD \uC11C\uBC84 \uC751\uB2F5 \uC624\uB958 (HTTP ${sillokRes.status})`);
  }
  const html = await sillokRes.text();
  const totalMatch = html.match(/검색결과\s*<strong>(\d+)<\/strong>개/);
  const totalCount = totalMatch ? parseInt(totalMatch[1], 10) : 0;
  const categories = [];
  const catMatches = html.matchAll(/<a\s+href="javascript:searchCategory\('([^']*)'\);"\s+class="cate-item[^"]*">(.*?)<\/a>/gs);
  for (const match of catMatches) {
    const labelText = cleanText(match[2]);
    const m = labelText.match(/(.+?)\s*\((\d+)\)/);
    if (m) {
      categories.push({
        token: match[1],
        label: m[1].trim(),
        count: parseInt(m[2], 10)
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
      king: meta.king || void 0,
      regnal_year: meta.regnalYear !== null ? meta.regnalYear : void 0,
      gregorian_year: meta.gregorianYear || void 0,
      excerpt: cleanText(summaryRaw)
    };
  });
  return { totalCount, categories, items };
}
app.get("/api/sillok/search", async (req, res) => {
  const query = (req.query.query || req.query.keyword || "").trim();
  const rawKing = (req.query.king || "").trim();
  const rawYear = req.query.year ? parseInt(req.query.year, 10) : null;
  const searchType = (req.query.type || req.query.search_type || "k") === "w" ? "w" : "k";
  const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10) || 10, 1), 30);
  const requestedPage = Math.max(parseInt(req.query.page || "1", 10) || 1, 1);
  if (!query) {
    return res.status(400).json({ error: "\uAC80\uC0C9\uC5B4\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694." });
  }
  const filterKing = normalizeKingName(rawKing);
  const startTime = Date.now();
  try {
    let allFilteredItems = [];
    let firstPageReport = null;
    let currPage = requestedPage;
    const maxScanPages = filterKing || rawYear ? 5 : 1;
    for (let scan = 0; scan < maxScanPages; scan++) {
      const pageReport = await fetchSillokSearchPage(query, searchType, currPage);
      if (!firstPageReport) firstPageReport = pageReport;
      let pageItems = pageReport.items;
      if (filterKing) {
        pageItems = pageItems.filter((it) => it.king === filterKing || it.king && it.king.includes(filterKing));
      }
      if (rawYear) {
        pageItems = pageItems.filter((it) => it.gregorian_year === rawYear);
      }
      allFilteredItems.push(...pageItems);
      if (allFilteredItems.length >= limit || pageReport.items.length === 0) {
        break;
      }
      currPage++;
    }
    const durationMs = Date.now() - startTime;
    const slicedItems = allFilteredItems.slice(0, limit);
    return res.json({
      query,
      type: searchType,
      filters: {
        king: filterKing || void 0,
        year: rawYear || void 0,
        limit
      },
      total_results: firstPageReport ? firstPageReport.totalCount : 0,
      type_count: firstPageReport ? firstPageReport.totalCount : 0,
      returned_count: slicedItems.length,
      categories: firstPageReport ? firstPageReport.categories : [],
      items: slicedItems,
      source: {
        url: SILLOK_SEARCH_URL,
        officialPortalName: "\uAD6D\uC0AC\uD3B8\uCC2C\uC704\uC6D0\uD68C \uC870\uC120\uC655\uC870\uC2E4\uB85D",
        fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
        durationMs
      }
    });
  } catch (err) {
    let category = "UNKNOWN";
    if (err.name === "AbortError") category = "UPSTREAM_TIMEOUT";
    else if (err.code === "ENOTFOUND" || err.code === "ECONNRESET") category = "NETWORK_CONNECTION_ERROR";
    return res.status(502).json({
      error: `\uC870\uC120\uC655\uC870\uC2E4\uB85D \uAC80\uC0C9 \uC2E4\uD328: ${err.message}`,
      category
    });
  }
});
app.get("/api/sillok/detail", async (req, res) => {
  const articleId = (req.query.article_id || req.query.id || "").trim();
  if (!articleId) {
    return res.status(400).json({ error: "article_id\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4." });
  }
  const targetUrl = `${SILLOK_BASE_URL}/id/${articleId}`;
  const startTime = Date.now();
  try {
    let controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2e4);
    const sillokRes = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
        "Referer": SILLOK_SEARCH_URL
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!sillokRes.ok) {
      return res.status(sillokRes.status || 502).json({
        error: `\uC2E4\uB85D \uC0C1\uC138 \uD398\uC774\uC9C0 \uC870\uD68C \uC2E4\uD328 (HTTP ${sillokRes.status})`,
        targetUrl
      });
    }
    const html = await sillokRes.text();
    const durationMs = Date.now() - startTime;
    const titleHeadMatch = html.match(/<div\s+class="title">\s*<p\s+class="date">([\s\S]*?)<\/p>\s*<h3>([\s\S]*?)<\/h3>/);
    const leftMatch = html.match(/<div\s+class="view-item\s+left">[\s\S]*?<div\s+class="view-text">([\s\S]*?)<\/div>/);
    const rightMatch = html.match(/<div\s+class="view-item\s+right">[\s\S]*?<div\s+class="view-text">([\s\S]*?)<\/div>/);
    const classMatch = html.match(/<li\s+class="view_font02">\s*[【〖]분류[】〗]\s*(.*?)<\/li>/s);
    const header = titleHeadMatch ? cleanText(titleHeadMatch[1]) : "";
    const title = titleHeadMatch ? cleanText(titleHeadMatch[2]) : "";
    let translatedText = leftMatch ? cleanText(leftMatch[1]) : "";
    let originalText = rightMatch ? cleanText(rightMatch[1]) : "";
    const classification = classMatch ? cleanText(classMatch[1]) : void 0;
    translatedText = translatedText.replace(/[【〖](?:태백산사고본|국편영인본|분류)[】〗].*$/gs, "").trim();
    originalText = originalText.replace(/[【〖](?:태백산사고본|국편영인본|분류)[】〗].*$/gs, "").trim();
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
        officialPortalName: "\uAD6D\uC0AC\uD3B8\uCC2C\uC704\uC6D0\uD68C \uC870\uC120\uC655\uC870\uC2E4\uB85D",
        fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
        durationMs
      }
    });
  } catch (err) {
    return res.status(502).json({
      error: `\uC2E4\uB85D \uC0C1\uC138 \uAE30\uC0AC \uC870\uD68C \uC2E4\uD328: ${err.message}`,
      category: err.name === "AbortError" ? "UPSTREAM_TIMEOUT" : "UNKNOWN",
      targetUrl
    });
  }
});
var PROXY_BASE_URL = "https://k-skill-proxy.nomadamas.org";
app.get("/api/library/books", async (req, res) => {
  const keyword = (req.query.keyword || req.query.query || req.query.q || "").trim();
  const pageNo = Math.max(parseInt(req.query.page || req.query.pageNo || "1", 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.limit || req.query.pageSize || "10", 10) || 10, 1), 50);
  if (!keyword) {
    return res.status(400).json({ error: "\uB3C4\uC11C \uAC80\uC0C9\uC5B4\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694." });
  }
  const startTime = Date.now();
  const targetUrl = `${PROXY_BASE_URL}/v1/data4library/book-search?${new URLSearchParams({
    keyword,
    pageNo: String(pageNo),
    pageSize: String(pageSize)
  }).toString()}`;
  try {
    let controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15e3);
    const proxyRes = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "KHS-GojungNote-Client/1.0"
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!proxyRes.ok) {
      return res.status(proxyRes.status || 502).json({
        error: `\uB3C4\uC11C\uAD00 \uD504\uB85D\uC2DC \uC11C\uBC84 \uC624\uB958 (HTTP ${proxyRes.status})`,
        category: "SERVER_ERROR",
        targetUrl
      });
    }
    const data = await proxyRes.json();
    const durationMs = Date.now() - startTime;
    const responseObj = data.response || {};
    const numFound = responseObj.numFound || 0;
    const rawDocs = responseObj.docs || [];
    const books = rawDocs.map((d) => {
      const doc = d.doc || {};
      return {
        bookname: doc.bookname || "",
        authors: doc.authors || "",
        publisher: doc.publisher || "",
        publication_year: doc.publication_year || "",
        isbn13: doc.isbn13 || "",
        addition_symbol: doc.addition_symbol || "",
        vol: doc.vol || "",
        class_no: doc.class_no || "",
        class_nm: doc.class_nm || "",
        bookImageURL: doc.bookImageURL || "",
        bookDtlUrl: doc.bookDtlUrl || "",
        loan_count: doc.loan_count || "0"
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
        proxyName: data.proxy?.name || "k-skill-proxy",
        officialSource: "\uAD6D\uB9BD\uC911\uC559\uB3C4\uC11C\uAD00 \uB3C4\uC11C\uAD00 \uC815\uBCF4\uB098\uB8E8 (Data4Library)",
        fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
        durationMs
      }
    });
  } catch (err) {
    let category = "UNKNOWN";
    if (err.name === "AbortError") category = "UPSTREAM_TIMEOUT";
    else if (err.code === "ENOTFOUND" || err.code === "ECONNRESET") category = "NETWORK_CONNECTION_ERROR";
    return res.status(502).json({
      error: `\uB3C4\uC11C \uAC80\uC0C9 \uC2E4\uD328: ${err.message}`,
      category,
      targetUrl
    });
  }
});
app.get("/api/library/book-detail", async (req, res) => {
  const isbn13 = (req.query.isbn13 || req.query.isbn || "").trim().replace(/-/g, "");
  if (!isbn13) {
    return res.status(400).json({ error: "isbn13 \uBC88\uD638\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4." });
  }
  const startTime = Date.now();
  const targetUrl = `${PROXY_BASE_URL}/v1/data4library/book-detail?${new URLSearchParams({
    isbn13,
    loaninfoYN: "Y"
  }).toString()}`;
  try {
    let controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15e3);
    const proxyRes = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "KHS-GojungNote-Client/1.0"
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!proxyRes.ok) {
      return res.status(proxyRes.status || 502).json({
        error: `\uB3C4\uC11C \uC0C1\uC138 \uC870\uD68C \uC2E4\uD328 (HTTP ${proxyRes.status})`,
        category: "SERVER_ERROR",
        targetUrl
      });
    }
    const data = await proxyRes.json();
    const durationMs = Date.now() - startTime;
    const detailList = data.response?.detail || [];
    const bookDoc = detailList[0]?.book || {};
    const result = {
      bookname: bookDoc.bookname || "",
      authors: bookDoc.authors || "",
      publisher: bookDoc.publisher || "",
      publication_date: bookDoc.publication_date || "",
      publication_year: bookDoc.publication_year || "",
      isbn: bookDoc.isbn || "",
      isbn13: bookDoc.isbn13 || isbn13,
      class_no: bookDoc.class_no || "",
      class_nm: bookDoc.class_nm || "",
      description: bookDoc.description || "",
      bookImageURL: bookDoc.bookImageURL || "",
      loanInfo: data.response?.loanInfo || null,
      source: {
        url: targetUrl,
        officialPortalUrl: `https://data4library.kr/bookV?isbn13=${isbn13}`,
        fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
        durationMs
      }
    };
    return res.json(result);
  } catch (err) {
    return res.status(502).json({
      error: `\uB3C4\uC11C \uC0C1\uC138 \uC815\uBCF4 \uC870\uD68C \uC2E4\uD328: ${err.message}`,
      category: err.name === "AbortError" ? "UPSTREAM_TIMEOUT" : "UNKNOWN",
      targetUrl
    });
  }
});
app.get("/api/library/libraries", async (req, res) => {
  const isbn = (req.query.isbn || req.query.isbn13 || "").trim().replace(/-/g, "");
  const region = (req.query.region || "11").trim();
  const pageNo = Math.max(parseInt(req.query.page || "1", 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.limit || "10", 10) || 10, 1), 30);
  if (!isbn) {
    return res.status(400).json({ error: "isbn \uBC88\uD638\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4." });
  }
  const startTime = Date.now();
  const targetUrl = `${PROXY_BASE_URL}/v1/data4library/libraries-by-book?${new URLSearchParams({
    isbn,
    region,
    pageNo: String(pageNo),
    pageSize: String(pageSize)
  }).toString()}`;
  try {
    let controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15e3);
    const proxyRes = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "KHS-GojungNote-Client/1.0"
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!proxyRes.ok) {
      return res.status(proxyRes.status || 502).json({
        error: `\uC18C\uC7A5 \uB3C4\uC11C\uAD00 \uC870\uD68C \uC2E4\uD328 (HTTP ${proxyRes.status})`,
        category: "SERVER_ERROR",
        targetUrl
      });
    }
    const data = await proxyRes.json();
    const durationMs = Date.now() - startTime;
    const responseObj = data.response || {};
    const rawLibs = responseObj.libs || [];
    const numFound = responseObj.numFound || 0;
    const libraries = rawLibs.map((item) => {
      const lib = item.lib || {};
      return {
        libCode: lib.libCode || "",
        libName: lib.libName || "",
        address: lib.address || "",
        tel: lib.tel || "",
        fax: lib.fax || "",
        latitude: lib.latitude || "",
        longitude: lib.longitude || "",
        homepage: lib.homepage || "",
        closed: lib.closed || "",
        operatingTime: lib.operatingTime || ""
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
        fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
        durationMs
      }
    });
  } catch (err) {
    return res.status(502).json({
      error: `\uC18C\uC7A5 \uB3C4\uC11C\uAD00 \uC870\uD68C \uC2E4\uD328: ${err.message}`,
      category: err.name === "AbortError" ? "UPSTREAM_TIMEOUT" : "UNKNOWN",
      targetUrl
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }
  const server = http.createServer(app);
  server.listen(PORT, () => {
    console.log(`[\uACE0\uC99D\uB178\uD2B8] \uC11C\uBC84\uAC00 \uD3EC\uD2B8 ${PORT}\uC5D0\uC11C \uC2E4\uD589 \uC911\uC785\uB2C8\uB2E4.`);
  });
}
startServer();
