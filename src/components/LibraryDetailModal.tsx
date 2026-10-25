import React, { useState, useEffect } from 'react';
import {
  X, ExternalLink, Bookmark, Check, Copy, BookOpen, MapPin, Phone,
  Clock, Calendar, AlertCircle, Building2, Search, RefreshCw
} from 'lucide-react';
import { LibraryBook, LibraryBookDetail, LibraryHolding, CreatorProject, SavedHeritageNote } from '../types';

interface LibraryDetailModalProps {
  isbn13: string;
  initialBook?: LibraryBook;
  onClose: () => void;
  projects: CreatorProject[];
  savedNotes: SavedHeritageNote[];
  onSaveNote: (note: Omit<SavedHeritageNote, 'id' | 'savedAt' | 'updatedAt'>) => void;
}

const REGION_LIST = [
  { name: '서울', code: '11' },
  { name: '경기', code: '31' },
  { name: '부산', code: '21' },
  { name: '대구', code: '22' },
  { name: '인천', code: '23' },
  { name: '광주', code: '24' },
  { name: '대전', code: '25' },
  { name: '울산', code: '26' },
  { name: '강원', code: '32' },
  { name: '충북', code: '33' },
  { name: '충남', code: '34' },
  { name: '전북', code: '35' },
  { name: '전남', code: '36' },
  { name: '경북', code: '37' },
  { name: '경남', code: '38' },
  { name: '제주', code: '39' },
  { name: '세종', code: '45' },
];

export const LibraryDetailModal: React.FC<LibraryDetailModalProps> = ({
  isbn13,
  initialBook,
  onClose,
  projects,
  savedNotes,
  onSaveNote,
}) => {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<LibraryBookDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Holding Libraries state
  const [selectedRegion, setSelectedRegion] = useState('11'); // 서울 default
  const [libsLoading, setLibsLoading] = useState(false);
  const [libraries, setLibraries] = useState<LibraryHolding[]>([]);
  const [totalLibsCount, setTotalLibsCount] = useState(0);

  // Scrap state
  const [isScrapOpen, setIsScrapOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [creatorNote, setCreatorNote] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<SavedHeritageNote['verificationStatus']>('referenced');
  const [sceneTagInput, setSceneTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['참고도서', '서지조사']);
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const existingNote = savedNotes.find(
    (n) => n.heritageCodeKey === `book-${isbn13}`
  );

  // Fetch Book Detail
  useEffect(() => {
    let isMounted = true;
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/library/book-detail?isbn13=${encodeURIComponent(isbn13)}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || '도서 상세 정보를 불러올 수 없습니다.');
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
        if (isMounted) setError(err.message || '도서 상세 정보 조회 중 오류가 발생했습니다.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [isbn13, existingNote]);

  // Fetch Holding Libraries
  const fetchLibraries = async (regionCode: string) => {
    setLibsLoading(true);
    try {
      const res = await fetch(`/api/library/libraries?isbn=${encodeURIComponent(isbn13)}&region=${regionCode}&limit=15`);
      const data = await res.json();
      if (res.ok) {
        setLibraries(data.libraries || []);
        setTotalLibsCount(data.totalResults || 0);
      } else {
        setLibraries([]);
        setTotalLibsCount(0);
      }
    } catch {
      setLibraries([]);
      setTotalLibsCount(0);
    } finally {
      setLibsLoading(false);
    }
  };

  useEffect(() => {
    if (isbn13) {
      fetchLibraries(selectedRegion);
    }
  }, [isbn13, selectedRegion]);

  const handleCopyCitation = () => {
    const bookTitle = detail?.bookname || initialBook?.bookname || '';
    const author = detail?.authors || initialBook?.authors || '';
    const publisher = detail?.publisher || initialBook?.publisher || '';
    const year = detail?.publication_year || initialBook?.publication_year || '';
    const text = `[참고도서 서지정보] ${author}, 《${bookTitle}》, ${publisher}, ${year}년 (ISBN: ${isbn13}). 출처: 국립중앙도서관 도서관 정보나루`;
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
    const bookTitle = detail?.bookname || initialBook?.bookname || '도서';
    if (!selectedProjectId) return;

    onSaveNote({
      projectId: selectedProjectId,
      heritageCodeKey: `book-${isbn13}`,
      categoryType: 'library',
      heritage: {
        name: bookTitle,
        nameHanja: '',
        heritageType: '참고 문헌 / 도서',
        classifications: detail?.class_nm ? [detail.class_nm] : ['참고도서'],
        province: '국립중앙도서관',
        district: detail?.publisher || initialBook?.publisher || '',
        era: detail?.publication_year ? `${detail.publication_year}년 간행` : '',
        description: detail?.description || `${detail?.authors || initialBook?.authors || ''} 저, ${detail?.publisher || initialBook?.publisher || ''} 출판.`,
        imageUrl: detail?.bookImageURL || initialBook?.bookImageURL,
        heritageCode: {
          kind: 'book',
          number: isbn13,
          province: 'KR',
        },
        latitude: null,
        longitude: null,
        source: {
          url: `https://data4library.kr/bookV?isbn13=${isbn13}`,
          officialPortalUrl: `https://data4library.kr/bookV?isbn13=${isbn13}`,
          officialGuideUrl: 'https://data4library.kr',
          fetchedAt: new Date().toISOString(),
          durationMs: 0,
        },
      },
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

  const currentBook = detail || initialBook;

  return (
    <div className="fixed inset-0 z-50 bg-[#1E2229]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#FFFFFF] border border-[#E6E0D4] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#FAF7F2] border-b border-[#E6E0D4] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="stamp-seal text-xs px-2.5 py-0.5 rounded">
              도서관 정보나루
            </span>
            <span className="text-xs font-mono text-[#545C69]">
              ISBN-13: {isbn13}
            </span>
            {existingNote && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium border border-emerald-200">
                내 프로젝트 보관 중
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCitation}
              className="text-xs font-medium text-[#1E2229] hover:bg-[#EAE4D7] px-3 py-1.5 rounded-lg border border-[#D5CEBF] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedCitation ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">서지 인용 복사됨!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#545C69]" />
                  <span>서지 인용 복사</span>
                </>
              )}
            </button>
            <button
              onClick={() => setIsScrapOpen(!isScrapOpen)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#B83A24] hover:bg-[#A32F1A] text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{existingNote ? '메모 수정' : '프로젝트에 담기'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#545C69] hover:text-[#1E2229] hover:bg-[#EAE4D7] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto p-5 sm:p-8 space-y-6 flex-1">
          {/* Scrap Panel */}
          {isScrapOpen && (
            <div className="p-5 bg-[#FAF7F2] border-2 border-[#B83A24]/30 rounded-xl space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-[#E6E0D4] pb-2">
                <h4 className="font-editorial font-bold text-sm text-[#1E2229] flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#B83A24]" />
                  창작 프로젝트 참고 도서 메모 기록
                </h4>
                <span className="text-xs text-[#545C69]">
                  도서관 대출 및 사료 검토용
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-[#545C69] mb-1">저장할 프로젝트</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D5CEBF] rounded-lg text-[#1E2229]"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#545C69] mb-1">고증 상태</label>
                  <select
                    value={verificationStatus}
                    onChange={(e) => setVerificationStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-[#D5CEBF] rounded-lg text-[#1E2229]"
                  >
                    <option value="verified">✅ 고증 완료 (원작 반영 확정)</option>
                    <option value="investigating">🔍 추가 조사 필요 (교차 검증 중)</option>
                    <option value="referenced">📖 배경 참고 (비주얼/분위기 참조)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#545C69] mb-1">
                  도서 메모 & 참고 챕터
                </label>
                <textarea
                  rows={3}
                  value={creatorNote}
                  onChange={(e) => setCreatorNote(e.target.value)}
                  placeholder="예: 3장 '조선 전기 왕실 제례와 악기' 부분 대출 후 참고 예정. 인근 구립 도서관 소장 여부 확인 완료."
                  className="w-full p-3 bg-white border border-[#D5CEBF] rounded-lg text-sm text-[#1E2229]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#545C69] mb-1">태그</label>
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
                    placeholder="태그 입력 후 Enter (예: 역사서, 대출희망, 3권참조)"
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

          {/* Book Info Top Banner */}
          {currentBook && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start border-b border-[#E6E0D4] pb-6">
              {/* Cover Image */}
              <div className="md:col-span-4 flex justify-center">
                <div className="w-44 h-64 rounded-xl overflow-hidden border border-[#E6E0D4] bg-[#F6F2EA] shadow-md flex items-center justify-center">
                  {currentBook.bookImageURL ? (
                    <img
                      src={currentBook.bookImageURL}
                      alt={currentBook.bookname}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="text-center p-4 text-[#838C99]">
                      <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">표지 이미지 없음</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bibliographic Info */}
              <div className="md:col-span-8 space-y-3">
                <h2 className="font-editorial text-2xl font-bold text-[#1E2229] leading-snug">
                  {currentBook.bookname}
                </h2>

                <div className="space-y-1.5 text-xs text-[#545C69]">
                  <div>저자: <strong className="text-[#1E2229]">{currentBook.authors || '저자 미상'}</strong></div>
                  <div>출판사: <strong className="text-[#1E2229]">{currentBook.publisher || '정보 없음'}</strong></div>
                  <div>발행연도: <strong className="text-[#1E2229]">{currentBook.publication_year || '정보 없음'}</strong></div>
                  <div>ISBN-13: <strong className="text-[#1E2229] font-mono">{isbn13}</strong></div>
                  {currentBook.class_nm && (
                    <div>분류(KDC): <span className="text-[#23456C] font-medium">{currentBook.class_nm}</span></div>
                  )}
                </div>

                <div className="pt-2">
                  <a
                    href={`https://data4library.kr/bookV?isbn13=${isbn13}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#23456C] hover:underline font-mono"
                  >
                    <span>도서관 정보나루 공식 상세 보기</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Book Synopsis / Description */}
          {detail?.description && (
            <div className="space-y-2">
              <h3 className="font-editorial text-base font-bold text-[#1E2229] flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#B83A24]" />
                책 소개 및 주요 내용
              </h3>
              <div className="p-5 bg-[#FCFBF8] border border-[#E6E0D4] rounded-xl text-sm text-[#1E2229] leading-relaxed whitespace-pre-line font-sans">
                {detail.description}
              </div>
            </div>
          )}

          {/* Holding Libraries Section */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6E0D4] pb-2">
              <div>
                <h3 className="font-editorial text-lg font-bold text-[#1E2229] flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#23456C]" />
                  전국 공공도서관 소장 현황
                </h3>
                <p className="text-xs text-[#545C69] mt-0.5">
                  지역을 선택하여 본 도서를 소장하고 있는 공공도서관 목록을 확인하세요.
                </p>
              </div>

              {/* Region Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-[#545C69]">지역 선택:</label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="px-3 py-1.5 bg-[#FAF7F2] border border-[#D5CEBF] rounded-lg text-xs font-semibold text-[#1E2229] cursor-pointer"
                >
                  {REGION_LIST.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Caution banner */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">대출 및 열람 유의사항: </span>
                도서관 정보나루의 소장 데이터와 개별 도서관의 실제 대출 가능 상태는 실시간 동기화 시차로 다를 수 있습니다.
                방문 전 도서관 홈페이지 또는 전화로 대출 가능 여부를 확인하세요.
              </div>
            </div>

            {/* Libraries List */}
            {libsLoading ? (
              <div className="py-8 text-center text-xs text-[#545C69] flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#B83A24]" />
                <span>선택하신 지역의 소장 도서관을 조회하고 있습니다...</span>
              </div>
            ) : libraries.length === 0 ? (
              <div className="p-6 bg-[#FAF7F2] border border-[#E6E0D4] rounded-xl text-center text-xs text-[#545C69]">
                해당 지역에 등록된 소장 도서관이 없거나 조회가 지원되지 않습니다. 다른 지역을 선택해 보세요.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-[#545C69]">
                  총 <strong className="text-[#B83A24]">{totalLibsCount}개소</strong> 도서관에서 소장 중 (상위 15개소 표시)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {libraries.map((lib, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-[#FAF7F2] border border-[#E6E0D4] rounded-xl text-xs space-y-1.5 hover:border-[#D5CEBF] transition-colors"
                    >
                      <div className="flex items-center justify-between font-semibold text-[#1E2229]">
                        <span className="truncate" title={lib.libName}>{lib.libName}</span>
                        {lib.homepage && (
                          <a
                            href={lib.homepage}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-[#23456C] hover:underline flex items-center gap-0.5 shrink-0"
                          >
                            <span>홈페이지</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      <div className="text-[#545C69] flex items-start gap-1">
                        <MapPin className="w-3 h-3 text-[#B83A24] shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{lib.address}</span>
                      </div>

                      {lib.tel && (
                        <div className="text-[#545C69] flex items-center gap-1 font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-[#2D6A4F] shrink-0" />
                          <span>{lib.tel}</span>
                        </div>
                      )}

                      {lib.operatingTime && lib.operatingTime !== '-' && (
                        <div className="text-[11px] text-[#838C99] flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span className="truncate">{lib.operatingTime}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
