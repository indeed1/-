import React, { useState, useEffect } from 'react';
import {
  X, ExternalLink, Bookmark, Check, Copy, BookOpen, ScrollText,
  Calendar, Award, AlertCircle, Share2
} from 'lucide-react';
import { SillokArticle, SillokDetail, CreatorProject, SavedHeritageNote } from '../types';

interface SillokDetailModalProps {
  articleId: string;
  onClose: () => void;
  projects: CreatorProject[];
  savedNotes: SavedHeritageNote[];
  onSaveNote: (note: Omit<SavedHeritageNote, 'id' | 'savedAt' | 'updatedAt'>) => void;
}

export const SillokDetailModal: React.FC<SillokDetailModalProps> = ({
  articleId,
  onClose,
  projects,
  savedNotes,
  onSaveNote,
}) => {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<SillokDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTextView, setActiveTextView] = useState<'translated' | 'original' | 'both'>('translated');

  // Scrap / Note State
  const [isScrapOpen, setIsScrapOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [creatorNote, setCreatorNote] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<SavedHeritageNote['verificationStatus']>('verified');
  const [sceneTagInput, setSceneTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['실록고증', '원문참조']);
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const existingNote = savedNotes.find(
    (n) => n.heritageCodeKey === `sillok-${articleId}`
  );

  useEffect(() => {
    let isMounted = true;
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/sillok/detail?article_id=${encodeURIComponent(articleId)}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || '실록 기사 상세 정보를 불러올 수 없습니다.');
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
        if (isMounted) setError(err.message || '실록 기사를 불러오는 중 오류가 발생했습니다.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [articleId, existingNote]);

  const handleCopyCitation = () => {
    if (!detail) return;
    const text = `[조선왕조실록 사료] ${detail.header} / ${detail.title}. 출처: 국사편찬위원회 조선왕조실록(${detail.url})`;
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
      heritageCodeKey: `sillok-${articleId}`,
      categoryType: 'sillok',
      heritage: {
        name: detail.title || detail.header,
        nameHanja: '',
        heritageType: '조선왕조실록 기사',
        classifications: detail.classification ? [detail.classification] : ['조선왕조실록'],
        province: '조선',
        district: detail.header,
        era: detail.header,
        description: detail.translated_text || detail.original_text,
        heritageCode: {
          kind: 'sillok',
          number: articleId,
          province: 'KR',
        },
        latitude: null,
        longitude: null,
        source: {
          url: detail.url,
          officialPortalUrl: detail.url,
          officialGuideUrl: 'https://sillok.history.go.kr',
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

  return (
    <div className="fixed inset-0 z-50 bg-[#1E2229]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#FFFFFF] border border-[#E6E0D4] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#FAF7F2] border-b border-[#E6E0D4] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="stamp-seal text-xs px-2.5 py-0.5 rounded">
              조선왕조실록
            </span>
            <span className="text-xs font-mono text-[#545C69]">
              기사 ID: {articleId}
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
                  <span className="text-emerald-700 font-semibold">인용문 복사됨!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#545C69]" />
                  <span>실록 인용문 복사</span>
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

        {/* Content */}
        <div className="overflow-y-auto p-5 sm:p-8 space-y-6 flex-1">
          {loading && (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-[#B83A24] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="font-editorial text-[#1E2229] text-base">
                국사편찬위원회 공식 조선왕조실록 원문을 조회하고 있습니다...
              </p>
            </div>
          )}

          {error && (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
              <h4 className="font-semibold text-rose-900">실록 기사를 불러오지 못했습니다</h4>
              <p className="text-xs text-rose-700 max-w-md mx-auto">{error}</p>
              <button
                onClick={() => window.open(`https://sillok.history.go.kr/id/${articleId}`, '_blank')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-xs font-medium cursor-pointer"
              >
                공식 실록 페이지 직접 열기 <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}

          {detail && (
            <>
              {/* Scrap Panel */}
              {isScrapOpen && (
                <div className="p-5 bg-[#FAF7F2] border-2 border-[#B83A24]/30 rounded-xl space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-[#E6E0D4] pb-2">
                    <h4 className="font-editorial font-bold text-sm text-[#1E2229] flex items-center gap-1.5">
                      <ScrollText className="w-4 h-4 text-[#B83A24]" />
                      창작 프로젝트 실록 사료 메모 기록
                    </h4>
                    <span className="text-xs text-[#545C69]">
                      사극 대사, 역사적 사건 연출, 인물 대화문 고증용
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
                      고증 메모 & 작품 적용 계획
                    </label>
                    <textarea
                      rows={3}
                      value={creatorNote}
                      onChange={(e) => setCreatorNote(e.target.value)}
                      placeholder="예: 제5화 세종과 집현전 학사들의 훈민정음 반포 직전 비밀 회의 씬에서 왕의 언문 28자 창제 명분 대사로 직접 인용."
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
                        placeholder="태그 입력 후 Enter (예: 훈민정음, 세종25년, 어문학)"
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

              {/* Header Titles */}
              <div className="space-y-2 border-b border-[#E6E0D4] pb-4">
                <div className="text-xs font-medium text-[#B83A24] flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{detail.header}</span>
                </div>
                <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-[#1E2229]">
                  {detail.title || '조선왕조실록 기사'}
                </h2>
                {detail.classification && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-xs text-[#545C69]">분류:</span>
                    <span className="px-2 py-0.5 bg-[#F6F2EA] border border-[#E6E0D4] rounded text-xs font-medium text-[#1E2229]">
                      {detail.classification}
                    </span>
                  </div>
                )}
              </div>

              {/* Text Mode Selector Tabs */}
              <div className="flex items-center justify-between border-b border-[#E6E0D4] pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTextView('translated')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      activeTextView === 'translated'
                        ? 'bg-[#1E2229] text-white'
                        : 'bg-[#FAF7F2] text-[#545C69] hover:text-[#1E2229]'
                    }`}
                  >
                    📖 국역문 보기 (한글)
                  </button>
                  <button
                    onClick={() => setActiveTextView('original')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      activeTextView === 'original'
                        ? 'bg-[#1E2229] text-white'
                        : 'bg-[#FAF7F2] text-[#545C69] hover:text-[#1E2229]'
                    }`}
                  >
                    📜 원문 한자 보기 (原文)
                  </button>
                  <button
                    onClick={() => setActiveTextView('both')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      activeTextView === 'both'
                        ? 'bg-[#1E2229] text-white'
                        : 'bg-[#FAF7F2] text-[#545C69] hover:text-[#1E2229]'
                    }`}
                  >
                    대역 보기 (국역 + 원문)
                  </button>
                </div>

                <a
                  href={detail.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#23456C] hover:underline font-mono"
                >
                  <span>공식 실록 사이트 원문 열기</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Text Content Area */}
              {activeTextView === 'both' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 bg-[#FCFBF8] border border-[#E6E0D4] rounded-xl space-y-2">
                    <h4 className="font-editorial font-bold text-sm text-[#B83A24] border-b border-[#E6E0D4] pb-1">
                      국역문 (한국어 번역)
                    </h4>
                    <div className="text-sm text-[#1E2229] leading-relaxed font-serif whitespace-pre-line">
                      {detail.translated_text || '번역문이 제공되지 않는 기사입니다.'}
                    </div>
                  </div>

                  <div className="p-5 bg-[#FAF7F2] border border-[#E6E0D4] rounded-xl space-y-2">
                    <h4 className="font-editorial font-bold text-sm text-[#23456C] border-b border-[#E6E0D4] pb-1">
                      원문 (漢字 原文)
                    </h4>
                    <div className="text-sm text-[#1E2229] leading-relaxed font-serif whitespace-pre-line">
                      {detail.original_text || '원문이 제공되지 않는 기사입니다.'}
                    </div>
                  </div>
                </div>
              ) : activeTextView === 'translated' ? (
                <div className="p-6 bg-[#FCFBF8] border border-[#E6E0D4] rounded-xl text-base text-[#1E2229] leading-relaxed font-serif whitespace-pre-line notebook-ruled">
                  {detail.translated_text || '번역문이 제공되지 않는 기사입니다.'}
                </div>
              ) : (
                <div className="p-6 bg-[#FAF7F2] border border-[#E6E0D4] rounded-xl text-base text-[#1E2229] leading-relaxed font-serif whitespace-pre-line notebook-ruled">
                  {detail.original_text || '원문이 제공되지 않는 기사입니다.'}
                </div>
              )}

              {/* Citation Footer */}
              <div className="p-4 bg-[#F6F2EA] border border-[#E6E0D4] rounded-xl text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-[#1E2229]">
                  <span>🏛️ 출처: 국사편찬위원회 조선왕조실록 데이터베이스</span>
                  <span className="font-mono text-[#545C69]">실시간 연계</span>
                </div>
                <p className="text-[11px] text-[#545C69]">
                  본 기사는 국사편찬위원회(National Institute of Korean History) 공식 웹사이트의 정본 실록 데이터입니다.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
