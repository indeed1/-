import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Globe, Clock, FileCode2, ExternalLink } from 'lucide-react';
import { DiagnosticResult } from '../types';

interface DiagnosticInspectorProps {
  initialQuery?: string;
  onSelectHeritage?: (kind: string, asno: string, ctcd: string) => void;
}

export const DiagnosticInspector: React.FC<DiagnosticInspectorProps> = ({
  initialQuery = '경복궁',
  onSelectHeritage,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [autoTested, setAutoTested] = useState(false);

  const runDiagnostics = async (searchQuery: string = query) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/heritage/diagnostics?query=${encodeURIComponent(searchQuery)}`);
      const data: DiagnosticResult = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({
        success: false,
        testedQuery: searchQuery,
        targetUrl: 'https://www.khs.go.kr/cha/SearchKindOpenapiList.do',
        statusCode: 0,
        durationMs: 0,
        contentType: '',
        error: `서버 통신 실패: ${err.message}`,
        errorCategory: 'NETWORK_CONNECTION_ERROR',
        diagnosis: {
          urlValid: true,
          networkConnected: false,
          upstreamServerAvailable: false,
          verifiedAt: new Date().toISOString(),
          note: '로컬 Node.js 백엔드와의 통신에 실패했습니다.',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!autoTested) {
      runDiagnostics('경복궁');
      setAutoTested(true);
    }
  }, [autoTested]);

  return (
    <div className="bg-[#FFFFFF] border border-[#E6E0D4] rounded-xl shadow-xs overflow-hidden">
      {/* Header Banner */}
      <div className="p-5 bg-gradient-to-r from-[#F6F2EA] to-[#FAF7F2] border-b border-[#E6E0D4] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#B83A24]/10 text-[#B83A24] rounded-lg">
              <Activity className="w-5 h-5" />
            </span>
            <h3 className="font-editorial text-lg font-bold text-[#1E2229]">
              국가유산청 공식 Open API 실시간 연결 진단기
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
              Live Inspector
            </span>
          </div>
          <p className="text-xs text-[#545C69] mt-1">
            공식 엔드포인트에 실제 HTTP 요청을 전송하여 상태 코드, 응답 소요 시간, 데이터 형식을 정밀 검증합니다.
          </p>
        </div>

        {/* Query Input & Action */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runDiagnostics(query)}
              placeholder="검증할 검색어 (기본: 경복궁)"
              className="px-3 py-1.5 text-sm bg-white border border-[#D5CEBF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B83A24] text-[#1E2229] w-48 shadow-2xs font-mono"
            />
          </div>
          <button
            onClick={() => runDiagnostics(query)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1E2229] hover:bg-[#343A46] text-[#FAF7F2] text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? '검증 중...' : '실시간 진단 실행'}</span>
          </button>
        </div>
      </div>

      {/* Main Diagnostic Body */}
      <div className="p-5 space-y-5">
        {/* Status Indicators Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* HTTP Status Code */}
          <div className="p-3.5 rounded-lg border border-[#E6E0D4] bg-[#FAF7F2]/60 flex flex-col justify-between">
            <span className="text-xs font-medium text-[#545C69] flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#23456C]" /> HTTP 응답 코드
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-2xl font-mono font-bold ${
                result?.statusCode === 200 ? 'text-emerald-700' : result?.statusCode ? 'text-amber-600' : 'text-rose-600'
              }`}>
                {result?.statusCode || (loading ? '...' : '0')}
              </span>
              <span className="text-xs text-[#545C69]">
                {result?.statusCode === 200 ? '200 OK (성공)' : result?.statusCode ? '오류 응답' : '연결 안 됨'}
              </span>
            </div>
          </div>

          {/* Response Latency */}
          <div className="p-3.5 rounded-lg border border-[#E6E0D4] bg-[#FAF7F2]/60 flex flex-col justify-between">
            <span className="text-xs font-medium text-[#545C69] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#B5832C]" /> 요청 소요 시간
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-[#1E2229]">
                {result ? `${result.durationMs}ms` : loading ? '...' : '-'}
              </span>
              <span className="text-xs text-[#545C69]">
                {result?.diagnosis?.latencyLevel || '측정 대기'}
              </span>
            </div>
          </div>

          {/* Response Format */}
          <div className="p-3.5 rounded-lg border border-[#E6E0D4] bg-[#FAF7F2]/60 flex flex-col justify-between">
            <span className="text-xs font-medium text-[#545C69] flex items-center gap-1.5">
              <FileCode2 className="w-3.5 h-3.5 text-[#2D6A4F]" /> 응답 포맷
            </span>
            <div className="mt-2">
              <div className="text-sm font-mono font-semibold text-[#1E2229] truncate" title={result?.contentType}>
                {result?.contentType ? result.contentType.split(';')[0] : loading ? '...' : '-'}
              </div>
              <span className="text-xs text-[#545C69]">공식 XML UTF-8</span>
            </div>
          </div>

          {/* Result Count */}
          <div className="p-3.5 rounded-lg border border-[#E6E0D4] bg-[#FAF7F2]/60 flex flex-col justify-between">
            <span className="text-xs font-medium text-[#545C69] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#B83A24]" /> 검색 결과 개수
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-[#B83A24]">
                {result?.totalCount !== undefined ? `${result.totalCount}건` : loading ? '...' : '-'}
              </span>
              <span className="text-xs text-[#545C69]">공식 DB 등록수</span>
            </div>
          </div>
        </div>

        {/* Detailed Diagnostics Breakdown */}
        {result && (
          <div className={`p-4 rounded-lg border text-sm ${
            result.success
              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
              : 'bg-rose-50/70 border-rose-200 text-rose-950'
          }`}>
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1.5 w-full">
                <div className="font-semibold flex items-center justify-between">
                  <span>
                    {result.success
                      ? `공식 API 검증 성공: '${result.testedQuery}' 기준 총 ${result.totalCount}건의 실데이터 응답을 확인했습니다.`
                      : `공식 API 검증 실패: [${result.errorCategory || '원인 미확인'}] ${result.error}`}
                  </span>
                  <span className="text-xs font-mono text-[#545C69]">
                    {result.diagnosis?.verifiedAt && new Date(result.diagnosis.verifiedAt).toLocaleTimeString('ko-KR')}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 text-xs border-t border-current/10">
                  <div>
                    <span className="font-medium">URL 및 파라미터 상태: </span>
                    <span className={result.diagnosis?.urlValid ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                      {result.diagnosis?.urlValid ? '정상 규격 구성' : '파라미터 오류 발생'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">네트워크 연결: </span>
                    <span className={result.diagnosis?.networkConnected ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                      {result.diagnosis?.networkConnected ? '정상 통신 (ESTABLISHED)' : '연결 실패'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">국가유산청 서버 상태: </span>
                    <span className={result.diagnosis?.upstreamServerAvailable ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                      {result.diagnosis?.upstreamServerAvailable ? '응답 서비스 정상 운영' : '응답 지연 또는 제한'}
                    </span>
                  </div>
                </div>

                {result.diagnosis?.note && (
                  <p className="text-xs mt-1 text-[#545C69]">{result.diagnosis.note}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Live URL & Verified Items Preview */}
        {result?.success && result.previewItems && result.previewItems.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#545C69]">
              <span className="font-medium text-[#1E2229]">실제 수신된 공식 데이터 표본 (3건 미리보기):</span>
              <a
                href={result.targetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[#23456C] hover:underline font-mono"
              >
                <span>호출된 공식 XML 원문 열기</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {result.previewItems.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectHeritage?.(item.heritageCode.kind, item.heritageCode.number, item.heritageCode.province)}
                  className="p-3 bg-[#FAF7F2] hover:bg-[#F2ECE0] border border-[#E6E0D4] rounded-lg text-xs cursor-pointer transition-colors group"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="px-1.5 py-0.5 bg-[#B83A24]/10 text-[#B83A24] font-semibold rounded text-[11px]">
                      {item.heritageType}
                    </span>
                    <span className="font-mono text-[10px] text-[#545C69]">
                      코드 {item.heritageCode.kind}-{item.heritageCode.number.slice(0, 6)}
                    </span>
                  </div>
                  <div className="font-editorial font-bold text-sm text-[#1E2229] group-hover:text-[#B83A24] transition-colors truncate">
                    {item.name}
                  </div>
                  {item.nameHanja && (
                    <div className="text-[11px] text-[#545C69] truncate mb-1">
                      {item.nameHanja}
                    </div>
                  )}
                  <div className="text-[11px] text-[#545C69] flex items-center justify-between mt-2 pt-1.5 border-t border-[#E6E0D4]">
                    <span>{item.province} {item.district || ''}</span>
                    <span className="text-[#23456C] font-medium group-hover:underline">상세 보기 &rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
