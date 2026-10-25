import React, { useState, useEffect } from 'react';
import {
  X, ExternalLink, Bookmark, CheckCircle2, Copy, Check, MapPin, Calendar, Building2,
  Tag, Compass, ShieldCheck, AlertCircle, Share2, Sparkles, BookOpen
} from 'lucide-react';
import { HeritageDetailItem, CreatorProject, SavedHeritageNote } from '../types';

interface HeritageDetailModalProps {
  kind: string;
  asno: string;
  ctcd: string;
  onClose: () => void;
  projects: CreatorProject[];
  savedNotes: SavedHeritageNote[];
  onSaveNote: (note: Omit<SavedHeritageNote, 'id' | 'savedAt' | 'updatedAt'>) => void;
}

export const HeritageDetailModal: React.FC<HeritageDetailModalProps> = ({
  kind,
  asno,
  ctcd,
  onClose,
  projects,
  savedNotes,
  onSaveNote,
}) => {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<HeritageDetailItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Scrap / Note State
  const [isScrapOpen, setIsScrapOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [creatorNote, setCreatorNote] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<SavedHeritageNote['verificationStatus']>('investigating');
  const [sceneTagInput, setSceneTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['배경고증']);
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Check if already saved
  const existingNote = savedNotes.find(
    (n) => n.heritageCodeKey === `${kind}-${asno}-${ctcd}`
  );

  useEffect(() => {
    let isMounted = true;
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/heritage/detail?kind=${kind}&asno=${asno}&ctcd=${ctcd}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || '상세 정보를 불러올 수 없습니다.');
        }
        if (isMounted) {
          setDetail(data);
          if (existingNote) {
            setSelectedProjectId(existingNote.projectId);
            setCreatorNote(existingNote.creatorNote);
            setVerificationStatus(existingNote.verificationStatus);
            setTags(existingNote.tags);
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || '상세 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [kind, asno, ctcd, existingNote]);

  const handleCopyCitation = () => {
    if (!detail) return;
    const formattedDate = new Date().toISOString().split('T')[0];
    const text = `[국가유산 고증자료] ${detail.name}${detail.nameHanja ? ` (${detail.nameHanja})` : ''} - ${detail.heritageType} | 시대: ${detail.era || '기록 없음'} | 소재지: ${detail.address || `${detail.province} ${detail.district || ''}`} | 출처: 국가유산청 공식 데이터(${detail.source.officialPortalUrl}) | 수신일: ${formattedDate}`;
    navigator.clipboard.writeText(text);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2500);
  };

  const handleAddTag = () => {
    if (sceneTagInput.trim() && !tags.includes(sceneTagInput.trim())) {
      setTags([...tags, sceneTagInput.trim()]);
      setSceneTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSaveToProject = () => {
    if (!detail || !selectedProjectId) return;
    onSaveNote({
      projectId: selectedProjectId,
      heritageCodeKey: `${kind}-${asno}-${ctcd}`,
      heritage: detail,
      creatorNote,
      verificationStatus,
      tags,
    });
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsScrapOpen(false);
    }, 1200);
  };

  // Format designated date e.g. 19850108 -> 1985년 1월 8일
  const formatDesignatedDate = (raw?: string) => {
    if (!raw || raw.length !== 8) return raw || '지정일 정보 없음';
    const y = raw.substring(0, 4);
    const m = parseInt(raw.substring(4, 6), 10);
    const d = parseInt(raw.substring(6, 8), 10);
    return `${y}년 ${m}월 ${d}일 지정`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1E2229]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#FFFFFF] border border-[#E6E0D4] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#FAF7F2] border-b border-[#E6E0D4] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="stamp-seal text-xs px-2.5 py-0.5 rounded">
              {detail?.heritageType || '국가유산'}
            </span>
            <div className="text-xs font-mono text-[#545C69]">
              종목 {kind} · 호수 {asno} · 지역 {ctcd}
            </div>
            {existingNote && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> 내 프로젝트 보관 중
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCitation}
              className="text-xs font-medium text-[#1E2229] hover:bg-[#EAE4D7] px-3 py-1.5 rounded-lg border border-[#D5CEBF] flex items-center gap-1.5 transition-colors cursor-pointer"
              title="창작 문서용 인용 문구 복사"
            >
              {copiedCitation ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">인용문 복사됨!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#545C69]" />
                  <span>인용문 복사</span>
                </>
              )}
            </button>
            <button
              onClick={() => setIsScrapOpen(!isScrapOpen)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#B83A24] hover:bg-[#A32F1A] text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{existingNote ? '고증 메모 수정' : '프로젝트에 저장'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#545C69] hover:text-[#1E2229] hover:bg-[#EAE4D7] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="overflow-y-auto p-5 sm:p-8 space-y-6 flex-1">
          {loading && (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-[#B83A24] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="font-editorial text-[#1E2229] text-base">
                국가유산청 공식 상세 데이터베이스를 조회하고 있습니다...
              </p>
              <p className="text-xs text-[#545C69]">종목코드: {kind}, 지정번호: {asno}</p>
            </div>
          )}

          {error && (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
              <h4 className="font-semibold text-rose-900">상세 정보를 불러오지 못했습니다</h4>
              <p className="text-xs text-rose-700 max-w-md mx-auto">{error}</p>
              <button
                onClick={() => window.open(`https://www.khs.go.kr/cha/SearchKindOpenapiDt.do?ccbaKdcd=${kind}&ccbaAsno=${asno}&ccbaCtcd=${ctcd}`, '_blank')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-xs font-medium cursor-pointer"
              >
                공식 API 직접 응답 열기 <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}

          {detail && (
            <>
              {/* Scrap & Note Panel (Collapsible) */}
              {isScrapOpen && (
                <div className="p-5 bg-[#FAF7F2] border-2 border-[#B83A24]/30 rounded-xl space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-[#E6E0D4] pb-2">
                    <h4 className="font-editorial font-bold text-sm text-[#1E2229] flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-[#B83A24]" />
                      창작 프로젝트 고증 메모 기록
                    </h4>
                    <span className="text-xs text-[#545C69]">
                      소설, 웹툰, 시나리오, 일러스트 고증 정리용
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Project Selector */}
                    <div>
                      <label className="block font-medium text-[#545C69] mb-1">저장할 프로젝트</label>
                      <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#D5CEBF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B83A24] text-[#1E2229]"
                      >
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Verification Status */}
                    <div>
                      <label className="block font-medium text-[#545C69] mb-1">고증 상태</label>
                      <select
                        value={verificationStatus}
                        onChange={(e) => setVerificationStatus(e.target.value as any)}
                        className="w-full px-3 py-2 bg-white border border-[#D5CEBF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B83A24] text-[#1E2229]"
                      >
                        <option value="verified">✅ 고증 완료 (원작 반영 확정)</option>
                        <option value="investigating">🔍 추가 조사 필요 (교차 검증 중)</option>
                        <option value="referenced">📖 배경 참고 (비주얼/분위기 참조)</option>
                      </select>
                    </div>
                  </div>

                  {/* Creator Notes Textarea */}
                  <div>
                    <label className="block text-xs font-medium text-[#545C69] mb-1">
                      고증 메모 & 창작 적용 아이디어
                    </label>
                    <textarea
                      rows={3}
                      value={creatorNote}
                      onChange={(e) => setCreatorNote(e.target.value)}
                      placeholder="예: 3화 경복궁 참배 장면에서 근정전 월대 구조와 답도(봉황석) 묘사 필요. 당시 단청 색감 및 왕의 동선 고증용으로 인용."
                      className="w-full p-3 bg-white border border-[#D5CEBF] rounded-lg text-sm text-[#1E2229] placeholder:text-[#838C99] focus:outline-none focus:ring-2 focus:ring-[#B83A24]"
                    />
                  </div>

                  {/* Scene Tags */}
                  <div>
                    <label className="block text-xs font-medium text-[#545C69] mb-1">씬 / 키워드 태그</label>
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[#EAE4D7] text-[#1E2229]"
                        >
                          <span>#{tag}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="text-[#545C69] hover:text-[#B83A24]"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={sceneTagInput}
                        onChange={(e) => setSceneTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                        placeholder="태그 입력 후 Enter (예: 궁궐건축, 3화, 단청)"
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#D5CEBF] rounded-lg text-[#1E2229]"
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="px-3 py-1.5 bg-[#EAE4D7] hover:bg-[#D5CEBF] text-xs font-medium rounded-lg text-[#1E2229]"
                      >
                        태그 추가
                      </button>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end gap-2 pt-2 border-t border-[#E6E0D4]">
                    <button
                      type="button"
                      onClick={() => setIsScrapOpen(false)}
                      className="px-3 py-1.5 text-xs text-[#545C69] hover:bg-[#EAE4D7] rounded-lg"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveToProject}
                      disabled={saveSuccess}
                      className="px-4 py-1.5 bg-[#B83A24] hover:bg-[#A32F1A] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs"
                    >
                      {saveSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>저장 완료!</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3.5 h-3.5" />
                          <span>{existingNote ? '메모 변경 저장' : '프로젝트에 담기'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Title & Core Meta */}
              <div className="space-y-2 border-b border-[#E6E0D4] pb-5">
                <div className="flex flex-wrap items-baseline gap-3">
                  <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-[#1E2229]">
                    {detail.name}
                  </h2>
                  {detail.nameHanja && (
                    <span className="text-lg sm:text-xl font-editorial text-[#545C69]">
                      ({detail.nameHanja})
                    </span>
                  )}
                </div>

                {/* Classification Breadcrumbs */}
                {detail.classifications && detail.classifications.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#545C69]">
                    <span className="font-medium text-[#1E2229]">유형 분류:</span>
                    {detail.classifications.map((cls, idx) => (
                      <React.Fragment key={idx}>
                        <span className="px-2 py-0.5 bg-[#FAF7F2] border border-[#E6E0D4] rounded text-[11px] font-medium text-[#1E2229]">
                          {cls}
                        </span>
                        {idx < detail.classifications.length - 1 && <span>&rsaquo;</span>}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>

              {/* Image & Quick Attributes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* Photo (if available) */}
                <div className="md:col-span-5 space-y-2">
                  <div className="rounded-xl overflow-hidden border border-[#E6E0D4] bg-[#F6F2EA] aspect-4/3 relative flex items-center justify-center">
                    {detail.imageUrl ? (
                      <img
                        src={detail.imageUrl}
                        alt={detail.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-center p-6 text-[#838C99]">
                        <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-editorial">공식 아카이브 사진 준비 중</p>
                      </div>
                    )}
                  </div>
                  {detail.imageUrl && (
                    <p className="text-[11px] text-[#838C99] text-center">
                      사진 출처: 국가유산청(Korea Heritage Service) 공식 기록 사진
                    </p>
                  )}
                </div>

                {/* Key Research Attributes */}
                <div className="md:col-span-7 bg-[#FAF7F2] border border-[#E6E0D4] rounded-xl p-4.5 space-y-3 text-xs">
                  <h4 className="font-editorial font-bold text-sm text-[#1E2229] flex items-center gap-1.5 border-b border-[#E6E0D4] pb-2">
                    <ShieldCheck className="w-4 h-4 text-[#2D6A4F]" />
                    국가유산 지정 및 역사 고증 개요
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[#545C69] block mb-0.5">조성 시대 (Era)</span>
                      <span className="font-semibold text-sm text-[#1E2229] font-editorial">
                        {detail.era || '시대 미상 / 전승 기록 참조'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#545C69] block mb-0.5">지정 일자</span>
                      <span className="font-medium text-[#1E2229]">
                        {formatDesignatedDate(detail.designatedDate)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#545C69] block mb-0.5">수량</span>
                      <span className="font-medium text-[#1E2229]">{detail.quantity || '1건'}</span>
                    </div>

                    <div>
                      <span className="text-[#545C69] block mb-0.5">관리 기관</span>
                      <span className="font-medium text-[#1E2229] truncate block" title={detail.admin}>
                        {detail.admin || '해당 지자체'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E6E0D4] space-y-1.5">
                    <div>
                      <span className="text-[#545C69] block mb-0.5 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#B83A24]" /> 소재지 주소
                      </span>
                      <span className="font-medium text-[#1E2229] block">
                        {detail.address || `${detail.province} ${detail.district || ''}`}
                      </span>
                    </div>

                    {detail.latitude && detail.longitude && (
                      <div className="flex items-center gap-3 text-[11px] font-mono text-[#545C69] pt-1">
                        <span>위도(Lat): {detail.latitude.toFixed(6)}</span>
                        <span>경도(Lng): {detail.longitude.toFixed(6)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Historical Description (Editorial Research Style) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#E6E0D4] pb-2">
                  <h3 className="font-editorial text-lg font-bold text-[#1E2229] flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#B83A24]" />
                    역사 및 학술 고증 해설 (국가유산청 공식 등록 자료)
                  </h3>
                  <span className="text-xs text-[#545C69] font-mono">
                    Official Historical Context
                  </span>
                </div>

                <div className="p-6 bg-[#FCFBF8] border border-[#E6E0D4] rounded-xl text-[#1E2229] leading-relaxed text-sm sm:text-base whitespace-pre-line notebook-ruled font-serif">
                  {detail.description || '등록된 상세 해설이 없습니다.'}
                </div>
              </div>

              {/* Official Sources & Verification Provenance */}
              <div className="p-4 bg-[#F6F2EA] border border-[#E6E0D4] rounded-xl text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1E2229] flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-[#23456C]" />
                    공식 출처 및 학술 데이터 출처 보증 (Provenance)
                  </span>
                  <span className="text-[11px] font-mono text-[#545C69]">
                    조회 시각: {new Date(detail.source.fetchedAt).toLocaleString('ko-KR')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#545C69]">
                  <a
                    href={detail.source.officialPortalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2 bg-white rounded border border-[#D5CEBF] hover:text-[#B83A24] transition-colors"
                  >
                    <span>국가유산청 공식 포털 상세 페이지</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <a
                    href={detail.source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2 bg-white rounded border border-[#D5CEBF] hover:text-[#23456C] transition-colors font-mono"
                  >
                    <span>공식 Open API XML 원본 보기 ({detail.source.durationMs}ms)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <p className="text-[10px] text-[#838C99] pt-1 border-t border-[#E6E0D4]">
                  * 본 정보는 대한민국 국가유산청(Korea Heritage Service)의 공개 Open API를 통해 실시간으로 수신된 데이터입니다.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
