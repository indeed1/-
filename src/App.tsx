import React, { useState, useEffect } from 'react';
import {
  Search, BookOpen, Activity, FolderKanban, ShieldCheck, Sparkles,
  MapPin, CheckCircle2, AlertCircle, ExternalLink, ChevronLeft, ChevronRight,
  Filter, Bookmark, Copy, Check, RefreshCw, ScrollText, Library, Calendar,
  Building2, BookCopy
} from 'lucide-react';
import {
  HeritageSummaryItem, SearchResponse, CreatorProject, SavedHeritageNote,
  SillokArticle, SillokSearchResponse, LibraryBook, LibrarySearchResponse
} from './types';
import { DiagnosticInspector } from './components/DiagnosticInspector';
import { HeritageDetailModal } from './components/HeritageDetailModal';
import { SillokDetailModal } from './components/SillokDetailModal';
import { LibraryDetailModal } from './components/LibraryDetailModal';
import { SavedNotesView } from './components/SavedNotesView';
import { ProjectManagerModal } from './components/ProjectManagerModal';

const HERITAGE_REGIONS = [
  { name: '전국', code: '' },
  { name: '서울', code: '11' },
  { name: '경기', code: '31' },
  { name: '강원', code: '32' },
  { name: '충북', code: '33' },
  { name: '충남', code: '34' },
  { name: '전북', code: '35' },
  { name: '전남', code: '36' },
  { name: '경북', code: '37' },
  { name: '경남', code: '38' },
  { name: '부산', code: '21' },
  { name: '대구', code: '22' },
  { name: '인천', code: '23' },
  { name: '광주', code: '24' },
  { name: '대전', code: '25' },
  { name: '울산', code: '26' },
  { name: '제주', code: '39' },
  { name: '세종', code: '45' },
];

const HERITAGE_TAGS = ['경복궁', '창덕궁', '숭례문', '근정전', '불국사', '석굴암', '조선왕조실록', '훈민정음'];

const SILLOK_KINGS = [
  { name: '전체 왕대', value: '' },
  { name: '태조 (1392~1398)', value: '태조' },
  { name: '정종 (1399~1400)', value: '정종' },
  { name: '태종 (1401~1418)', value: '태종' },
  { name: '세종 (1418~1450)', value: '세종' },
  { name: '문종 (1450~1452)', value: '문종' },
  { name: '단종 (1452~1455)', value: '단종' },
  { name: '세조 (1455~1468)', value: '세조' },
  { name: '예종 (1468~1469)', value: '예종' },
  { name: '성종 (1469~1494)', value: '성종' },
  { name: '연산군 (1494~1506)', value: '연산군' },
  { name: '중종 (1506~1544)', value: '중종' },
  { name: '인종 (1544~1545)', value: '인종' },
  { name: '명종 (1545~1567)', value: '명종' },
  { name: '선조 (1567~1608)', value: '선조' },
  { name: '광해군 (1608~1623)', value: '광해군' },
  { name: '인조 (1623~1649)', value: '인조' },
  { name: '효종 (1649~1659)', value: '효종' },
  { name: '현종 (1659~1674)', value: '현종' },
  { name: '숙종 (1674~1720)', value: '숙종' },
  { name: '경종 (1720~1724)', value: '경종' },
  { name: '영조 (1724~1776)', value: '영조' },
  { name: '정조 (1776~1800)', value: '정조' },
  { name: '순조 (1800~1834)', value: '순조' },
  { name: '헌종 (1834~1849)', value: '헌종' },
  { name: '철종 (1849~1863)', value: '철종' },
  { name: '고종 (1863~1907)', value: '고종' },
  { name: '순종 (1907~1910)', value: '순종' },
];

const SILLOK_TAGS = ['훈민정음', '집현전', '측우기', '임진왜란', '대동법', '수원화성', '한양천도'];
const LIBRARY_TAGS = ['조선왕조실록', '한국사', '전통 건축', '궁궐', '복식사', '조선시대사'];

// Initial default projects for creators
const INITIAL_PROJECTS: CreatorProject[] = [
  {
    id: 'proj-1',
    title: '조선 전기 궁궐 및 관아 고증',
    description: '15세기 조선 왕실 중심 법궁 건축과 의례 공간 고증',
    badge: '🏯',
    color: '#B83A24',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'proj-2',
    title: '전통 단청 및 복식 시각 자료',
    description: '사극 웹툰 연재를 위한 색채, 의복, 장신구 유물 아카이브',
    badge: '🎨',
    color: '#23456C',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'search' | 'notes' | 'diagnostics'>('search');

  // Search Type: 'heritage' (국가유산) | 'sillok' (조선왕조실록) | 'library' (도서관 도서)
  const [searchCategory, setSearchCategory] = useState<'heritage' | 'sillok' | 'library'>('heritage');

  // 1. Heritage Search State
  const [searchQuery, setSearchQuery] = useState('경복궁');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [page, setPage] = useState(1);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [searchError, setSearchError] = useState<{ message: string; category?: string } | null>(null);
  const [activeHeritageCode, setActiveHeritageCode] = useState<{
    kind: string;
    asno: string;
    ctcd: string;
  } | null>(null);

  // 2. Joseon Sillok Search State
  const [sillokQuery, setSillokQuery] = useState('훈민정음');
  const [sillokKing, setSillokKing] = useState('세종');
  const [sillokYear, setSillokYear] = useState('1443');
  const [sillokType, setSillokType] = useState<'k' | 'w'>('k');
  const [sillokPage, setSillokPage] = useState(1);
  const [sillokPageSize, setSillokPageSize] = useState(20);
  const [sillokLoading, setSillokLoading] = useState(false);
  const [isAppendingSillok, setIsAppendingSillok] = useState(false);
  const [sillokResponse, setSillokResponse] = useState<SillokSearchResponse | null>(null);
  const [sillokError, setSillokError] = useState<{ message: string; category?: string } | null>(null);
  const [activeSillokArticleId, setActiveSillokArticleId] = useState<string | null>(null);

  // 3. Library Books Search State
  const [libraryQuery, setLibraryQuery] = useState('조선왕조실록');
  const [libraryPage, setLibraryPage] = useState(1);
  const [libraryLimit, setLibraryLimit] = useState(10);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryResponse, setLibraryResponse] = useState<LibrarySearchResponse | null>(null);
  const [libraryError, setLibraryError] = useState<{ message: string; category?: string } | null>(null);
  const [activeBookIsbn, setActiveBookIsbn] = useState<string | null>(null);
  const [activeBookObj, setActiveBookObj] = useState<LibraryBook | undefined>(undefined);

  // Projects & Notes in localStorage
  const [projects, setProjects] = useState<CreatorProject[]>(() => {
    const saved = localStorage.getItem('gojung_projects');
    return saved ? JSON.parse(saved) : INITIAL_PROJECTS;
  });

  const [savedNotes, setSavedNotes] = useState<SavedHeritageNote[]>(() => {
    const saved = localStorage.getItem('gojung_notes');
    return saved ? JSON.parse(saved) : [];
  });

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('gojung_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('gojung_notes', JSON.stringify(savedNotes));
  }, [savedNotes]);

  // Execute Heritage Search
  const handleHeritageSearch = async (
    queryToSearch: string = searchQuery,
    targetPage: number = 1,
    regionCode: string = selectedRegion
  ) => {
    setSearchLoading(true);
    setSearchError(null);
    setPage(targetPage);

    try {
      const params = new URLSearchParams({
        query: queryToSearch.trim(),
        region: regionCode,
        page: String(targetPage),
        limit: '12',
      });

      const res = await fetch(`/api/heritage/search?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw { message: data.error || '검색 요청에 실패했습니다.', category: data.category || 'SERVER_ERROR' };
      }

      setSearchResponse(data);
    } catch (err: any) {
      setSearchError({
        message: err.message || '국가유산 데이터를 불러오는 중 오류가 발생했습니다.',
        category: err.category || 'NETWORK_CONNECTION_ERROR',
      });
    } finally {
      setSearchLoading(false);
    }
  };

  // Execute Sillok Search with pagination and load-more support
  const handleSillokSearch = async (
    queryToSearch: string = sillokQuery,
    kingFilter: string = sillokKing,
    yearFilter: string = sillokYear,
    searchTypeFilter: 'k' | 'w' = sillokType,
    targetPage: number = 1,
    pageSize: number = sillokPageSize,
    append: boolean = false
  ) => {
    setSillokLoading(true);
    setSillokError(null);
    if (append) {
      setIsAppendingSillok(true);
    } else {
      setSillokPage(targetPage);
    }

    try {
      const params = new URLSearchParams({
        query: queryToSearch.trim(),
        king: kingFilter,
        type: searchTypeFilter,
        page: String(targetPage),
        pageSize: String(pageSize),
      });
      if (yearFilter.trim()) {
        params.append('year', yearFilter.trim());
      }

      const res = await fetch(`/api/sillok/search?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw { message: data.error || '실록 검색 요청에 실패했습니다.', category: data.category || 'SERVER_ERROR' };
      }

      if (append && sillokResponse) {
        setSillokResponse({
          ...data,
          items: [...sillokResponse.items, ...data.items],
          returned_count: sillokResponse.items.length + data.items.length,
          page: targetPage,
        });
        setSillokPage(targetPage);
      } else {
        setSillokResponse(data);
        setSillokPage(targetPage);
      }
    } catch (err: any) {
      setSillokError({
        message: err.message || '조선왕조실록 검색 중 오류가 발생했습니다.',
        category: err.category || 'NETWORK_CONNECTION_ERROR',
      });
    } finally {
      setSillokLoading(false);
      setIsAppendingSillok(false);
    }
  };

  // Execute Library Book Search
  const handleLibrarySearch = async (
    keywordToSearch: string = libraryQuery,
    targetPage: number = 1
  ) => {
    setLibraryLoading(true);
    setLibraryError(null);
    setLibraryPage(targetPage);

    try {
      const params = new URLSearchParams({
        keyword: keywordToSearch.trim(),
        page: String(targetPage),
        limit: String(libraryLimit),
      });

      const res = await fetch(`/api/library/books?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw { message: data.error || '도서 검색 요청에 실패했습니다.', category: data.category || 'SERVER_ERROR' };
      }

      setLibraryResponse(data);
    } catch (err: any) {
      setLibraryError({
        message: err.message || '도서관 도서 검색 중 오류가 발생했습니다.',
        category: err.category || 'NETWORK_CONNECTION_ERROR',
      });
    } finally {
      setLibraryLoading(false);
    }
  };

  // Run initial searches on mount
  useEffect(() => {
    handleHeritageSearch('경복궁', 1, '');
  }, []);

  // Note actions
  const handleSaveNote = (noteData: Omit<SavedHeritageNote, 'id' | 'savedAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    setSavedNotes((prev) => {
      const existingIdx = prev.findIndex((n) => n.heritageCodeKey === noteData.heritageCodeKey);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          ...noteData,
          updatedAt: now,
        };
        return updated;
      }
      return [
        {
          id: `note-${Date.now()}`,
          ...noteData,
          savedAt: now,
          updatedAt: now,
        },
        ...prev,
      ];
    });
  };

  const handleUpdateNote = (updatedNote: SavedHeritageNote) => {
    setSavedNotes((prev) => prev.map((n) => (n.id === updatedNote.id ? updatedNote : n)));
  };

  const handleDeleteNote = (noteId: string) => {
    setSavedNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const handleAddProject = (newProj: Omit<CreatorProject, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const created: CreatorProject = {
      id: `proj-${Date.now()}`,
      ...newProj,
      createdAt: now,
      updatedAt: now,
    };
    setProjects((prev) => [...prev, created]);
  };

  const handleDeleteProject = (projId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projId));
    setSavedNotes((prev) => prev.filter((n) => n.projectId !== projId));
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1E2229] flex flex-col font-sans selection:bg-[#B83A24]/15 selection:text-[#B83A24]">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E6E0D4] shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
            {/* Logo & Identity */}
            <div className="flex items-center gap-3">
              <div className="stamp-seal w-10 h-10 rounded-lg text-lg font-editorial shrink-0 shadow-xs">
                考
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-editorial text-xl sm:text-2xl font-black text-[#1E2229] tracking-tight">
                    고증노트
                  </h1>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#FAF7F2] text-[#545C69] border border-[#D5CEBF] font-medium hidden sm:inline-block">
                    Ver 2.0
                  </span>
                </div>
                <p className="text-xs text-[#545C69] font-medium hidden md:block">
                  창작자를 위한 국가유산 · 조선왕조실록 · 도서관 자료 조사·고증 아카이브
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 bg-[#F0ECE1] p-1 rounded-xl border border-[#D5CEBF]">
              <button
                onClick={() => setActiveTab('search')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'search'
                    ? 'bg-white text-[#1E2229] shadow-2xs'
                    : 'text-[#545C69] hover:text-[#1E2229]'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>자료 검색</span>
              </button>

              <button
                onClick={() => setActiveTab('notes')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'notes'
                    ? 'bg-white text-[#1E2229] shadow-2xs'
                    : 'text-[#545C69] hover:text-[#1E2229]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>내 고증노트</span>
                {savedNotes.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#B83A24] text-white text-[10px] font-mono">
                    {savedNotes.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('diagnostics')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'diagnostics'
                    ? 'bg-white text-[#1E2229] shadow-2xs'
                    : 'text-[#545C69] hover:text-[#1E2229]'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-[#B83A24]" />
                <span className="hidden sm:inline">공식 API</span>
                <span>연결 진단</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* TAB 1: Search View */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            {/* Search Category Mode Selector Bar */}
            <div className="bg-[#FFFFFF] border border-[#E6E0D4] rounded-2xl p-2 shadow-xs flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setSearchCategory('heritage')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    searchCategory === 'heritage'
                      ? 'bg-[#B83A24] text-white shadow-xs'
                      : 'text-[#545C69] hover:text-[#1E2229] hover:bg-[#FAF7F2]'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>🏛️ 국가유산 검색</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSearchCategory('sillok');
                    if (!sillokResponse && !sillokLoading) {
                      handleSillokSearch('훈민정음', '세종', '1443', 'k');
                    }
                  }}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    searchCategory === 'sillok'
                      ? 'bg-[#1E2229] text-white shadow-xs'
                      : 'text-[#545C69] hover:text-[#1E2229] hover:bg-[#FAF7F2]'
                  }`}
                >
                  <ScrollText className="w-4 h-4" />
                  <span>📜 조선왕조실록 검색</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSearchCategory('library');
                    if (!libraryResponse && !libraryLoading) {
                      handleLibrarySearch('조선왕조실록', 1);
                    }
                  }}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    searchCategory === 'library'
                      ? 'bg-[#23456C] text-white shadow-xs'
                      : 'text-[#545C69] hover:text-[#1E2229] hover:bg-[#FAF7F2]'
                  }`}
                >
                  <Library className="w-4 h-4" />
                  <span>📚 도서관 도서 검색</span>
                </button>
              </div>

              <div className="hidden lg:flex items-center gap-2 text-xs text-[#545C69] pr-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-medium">공식 실시간 연동 활성화</span>
              </div>
            </div>

            {/* ------------------- 1. HERITAGE SEARCH SECTION ------------------- */}
            {searchCategory === 'heritage' && (
              <div className="space-y-6">
                <div className="bg-[#FFFFFF] border border-[#E6E0D4] rounded-2xl p-5 sm:p-7 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="font-editorial text-xl font-bold text-[#1E2229]">
                        국가유산청 공식 아카이브 고증 검색
                      </h2>
                      <p className="text-xs text-[#545C69] mt-0.5">
                        국보, 보물, 사적, 민속자료 등 10만여 건의 공식 문화유산 등록 데이터를 실시간 검색합니다.
                      </p>
                    </div>

                    <button
                      onClick={() => setActiveTab('diagnostics')}
                      className="inline-flex items-center gap-1.5 text-xs text-[#23456C] hover:underline font-medium"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>실시간 API 연결 상태 확인하기</span>
                    </button>
                  </div>

                  {/* Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleHeritageSearch(searchQuery, 1, selectedRegion);
                    }}
                    className="flex flex-col sm:flex-row gap-2.5"
                  >
                    <div className="sm:w-36 shrink-0">
                      <select
                        value={selectedRegion}
                        onChange={(e) => {
                          setSelectedRegion(e.target.value);
                          handleHeritageSearch(searchQuery, 1, e.target.value);
                        }}
                        className="w-full px-3 py-2.5 bg-[#FAF7F2] border border-[#D5CEBF] rounded-xl text-xs font-semibold text-[#1E2229] focus:outline-none focus:ring-2 focus:ring-[#B83A24] cursor-pointer"
                      >
                        {HERITAGE_REGIONS.map((r) => (
                          <option key={r.code} value={r.code}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="국가유산명을 입력하세요 (예: 경복궁, 숭례문, 근정전, 첨성대)"
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#FAF7F2] border border-[#D5CEBF] rounded-xl text-[#1E2229] placeholder:text-[#838C99] focus:outline-none focus:ring-2 focus:ring-[#B83A24]"
                      />
                      <Search className="w-4 h-4 text-[#838C99] absolute left-3.5 top-3" />
                    </div>

                    <button
                      type="submit"
                      disabled={searchLoading}
                      className="px-6 py-2.5 bg-[#B83A24] hover:bg-[#A32F1A] text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {searchLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                      <span>검색</span>
                    </button>
                  </form>

                  {/* Quick Tags */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E6E0D4] text-xs">
                    <span className="font-semibold text-[#545C69]">추천 고증 키워드:</span>
                    {HERITAGE_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setSearchQuery(tag);
                          handleHeritageSearch(tag, 1, selectedRegion);
                        }}
                        className={`px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                          searchQuery === tag
                            ? 'bg-[#B83A24] text-white font-medium'
                            : 'bg-[#FAF7F2] hover:bg-[#EAE4D7] text-[#1E2229] border border-[#E6E0D4]'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Result Meta Banner */}
                {searchResponse && !searchLoading && (
                  <div className="flex flex-wrap items-center justify-between gap-3 px-2 text-xs text-[#545C69]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#1E2229]">
                        공식 DB 검색 결과 총 <strong className="text-[#B83A24]">{searchResponse.totalResults}건</strong>
                      </span>
                      <span>·</span>
                      <span>페이지 {searchResponse.page} / {searchResponse.totalPages || 1}</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-mono">
                      <span>출처: 국가유산청(KHS) Open API</span>
                      <span>·</span>
                      <span>응답 속도: {searchResponse.source.durationMs}ms</span>
                    </div>
                  </div>
                )}

                {/* Loading State */}
                {searchLoading && (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-10 h-10 border-3 border-[#B83A24] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="font-editorial text-[#1E2229] text-base">
                      국가유산청 공식 API로부터 고증 데이터를 조회하고 있습니다...
                    </p>
                  </div>
                )}

                {/* Error Banner */}
                {searchError && !searchLoading && (
                  <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-2">
                    <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
                    <h4 className="font-semibold text-rose-900">검색 결과를 가져오지 못했습니다</h4>
                    <p className="text-xs text-rose-700">[{searchError.category || '오류'}] {searchError.message}</p>
                  </div>
                )}

                {/* Heritage Cards Grid */}
                {!searchLoading && searchResponse && searchResponse.items.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {searchResponse.items.map((item, idx) => {
                      const isSaved = savedNotes.some(
                        (n) => n.heritageCodeKey === `${item.heritageCode.kind}-${item.heritageCode.number}-${item.heritageCode.province}`
                      );

                      return (
                        <div
                          key={idx}
                          className="bg-[#FFFFFF] border border-[#E6E0D4] hover:border-[#B83A24]/40 hover:shadow-md rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 group"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="stamp-seal text-xs px-2 py-0.5 rounded">
                                {item.heritageType}
                              </span>
                              <span className="text-[11px] font-mono text-[#545C69]">
                                {item.heritageCode.kind}-{item.heritageCode.number.slice(0, 6)}
                              </span>
                            </div>

                            <div>
                              <h3
                                onClick={() =>
                                  setActiveHeritageCode({
                                    kind: item.heritageCode.kind,
                                    asno: item.heritageCode.number,
                                    ctcd: item.heritageCode.province,
                                  })
                                }
                                className="font-editorial text-lg font-bold text-[#1E2229] group-hover:text-[#B83A24] transition-colors cursor-pointer line-clamp-1"
                              >
                                {item.name}
                              </h3>
                              {item.nameHanja && (
                                <p className="text-xs font-editorial text-[#545C69] truncate">
                                  {item.nameHanja}
                                </p>
                              )}
                            </div>

                            <div className="space-y-1.5 text-xs text-[#545C69] pt-2 border-t border-[#E6E0D4]">
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-[#B83A24] shrink-0" />
                                <span className="truncate">{item.province} {item.district || ''}</span>
                              </div>
                              <div className="text-[11px] text-[#838C99] truncate">
                                관리: {item.admin || '해당 지자체'}
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 mt-4 border-t border-[#E6E0D4] flex items-center justify-between gap-2">
                            {isSaved ? (
                              <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-1 rounded flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                보관됨
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#838C99]">미보관</span>
                            )}

                            <button
                              onClick={() =>
                                setActiveHeritageCode({
                                  kind: item.heritageCode.kind,
                                  asno: item.heritageCode.number,
                                  ctcd: item.heritageCode.province,
                                })
                              }
                              className="px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#B83A24] hover:text-white text-[#1E2229] text-xs font-semibold rounded-lg border border-[#D5CEBF] transition-all cursor-pointer flex items-center gap-1"
                            >
                              <span>고증 상세 보기</span>
                              <span>&rarr;</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Empty State */}
                {!searchLoading && searchResponse && searchResponse.items.length === 0 && (
                  <div className="p-16 text-center bg-[#FFFFFF] border border-[#E6E0D4] rounded-2xl space-y-3">
                    <Search className="w-10 h-10 text-[#C9C2B2] mx-auto" />
                    <h3 className="font-editorial text-lg font-bold text-[#1E2229]">검색 조건에 맞는 국가유산이 없습니다</h3>
                    <p className="text-xs text-[#545C69]">검색어를 변경하거나 지역 필터를 '전국'으로 조정해 보세요.</p>
                  </div>
                )}

                {/* Pagination */}
                {searchResponse && searchResponse.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <button
                      disabled={page <= 1 || searchLoading}
                      onClick={() => handleHeritageSearch(searchQuery, page - 1, selectedRegion)}
                      className="px-3 py-1.5 rounded-lg border border-[#D5CEBF] bg-[#FFFFFF] hover:bg-[#FAF7F2] text-xs font-semibold disabled:opacity-40 cursor-pointer flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" /> 이전
                    </button>
                    <span className="text-xs font-mono font-medium text-[#545C69] px-3">
                      {page} / {searchResponse.totalPages}
                    </span>
                    <button
                      disabled={page >= searchResponse.totalPages || searchLoading}
                      onClick={() => handleHeritageSearch(searchQuery, page + 1, selectedRegion)}
                      className="px-3 py-1.5 rounded-lg border border-[#D5CEBF] bg-[#FFFFFF] hover:bg-[#FAF7F2] text-xs font-semibold disabled:opacity-40 cursor-pointer flex items-center gap-1"
                    >
                      다음 <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ------------------- 2. JOSEON SILLOK SEARCH SECTION ------------------- */}
            {searchCategory === 'sillok' && (
              <div className="space-y-6">
                <div className="bg-[#FFFFFF] border border-[#E6E0D4] rounded-2xl p-5 sm:p-7 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="font-editorial text-xl font-bold text-[#1E2229] flex items-center gap-2">
                        <ScrollText className="w-5 h-5 text-[#B83A24]" />
                        조선왕조실록(朝鮮王朝實錄) 공식 사료 검색
                      </h2>
                      <p className="text-xs text-[#545C69] mt-0.5">
                        국사편찬위원회 공식 정본 실록(태조~순종 472년간 역사 기록)의 국역문 및 원문 한자를 실시간 검색합니다.
                      </p>
                    </div>

                    <a
                      href="https://sillok.history.go.kr"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#23456C] hover:underline font-mono"
                    >
                      <span>국사편찬위원회 공식 실록 포털</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Filters Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSillokSearch(sillokQuery, sillokKing, sillokYear, sillokType, 1, sillokPageSize, false);
                    }}
                    className="space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      {/* Keyword Input */}
                      <div className="sm:col-span-5 relative">
                        <input
                          type="text"
                          value={sillokQuery}
                          onChange={(e) => setSillokQuery(e.target.value)}
                          placeholder="실록 검색어 입력 (예: 훈민정음, 이순신, 집현전, 측우기)"
                          className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#FAF7F2] border border-[#D5CEBF] rounded-xl text-[#1E2229] focus:outline-none focus:ring-2 focus:ring-[#B83A24]"
                        />
                        <Search className="w-4 h-4 text-[#838C99] absolute left-3.5 top-3" />
                      </div>

                      {/* King Selector */}
                      <div className="sm:col-span-3">
                        <select
                          value={sillokKing}
                          onChange={(e) => {
                            setSillokKing(e.target.value);
                            handleSillokSearch(sillokQuery, e.target.value, sillokYear, sillokType, 1, sillokPageSize, false);
                          }}
                          className="w-full px-3 py-2.5 bg-[#FAF7F2] border border-[#D5CEBF] rounded-xl text-xs font-semibold text-[#1E2229] focus:outline-none focus:ring-2 focus:ring-[#B83A24] cursor-pointer"
                        >
                          {SILLOK_KINGS.map((k) => (
                            <option key={k.value} value={k.value}>
                              {k.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Gregorian Year Input */}
                      <div className="sm:col-span-2">
                        <input
                          type="number"
                          value={sillokYear}
                          onChange={(e) => setSillokYear(e.target.value)}
                          placeholder="서기 연도 (예: 1443)"
                          className="w-full px-3 py-2.5 bg-[#FAF7F2] border border-[#D5CEBF] rounded-xl text-xs font-semibold text-[#1E2229] focus:outline-none focus:ring-2 focus:ring-[#B83A24]"
                        />
                      </div>

                      {/* Submit Button */}
                      <div className="sm:col-span-2">
                        <button
                          type="submit"
                          disabled={sillokLoading}
                          className="w-full py-2.5 bg-[#1E2229] hover:bg-[#343A46] text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          {sillokLoading ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Search className="w-4 h-4" />
                          )}
                          <span>실록 검색</span>
                        </button>
                      </div>
                    </div>

                    {/* Secondary Filters: Type & PageSize */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E6E0D4] text-xs">
                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-[#545C69]">검색 모드:</span>
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="sillokType"
                            checked={sillokType === 'k'}
                            onChange={() => {
                              setSillokType('k');
                              handleSillokSearch(sillokQuery, sillokKing, sillokYear, 'k', 1, sillokPageSize, false);
                            }}
                            className="text-[#B83A24]"
                          />
                          <span>📖 국역문 검색 (현대어)</span>
                        </label>
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="sillokType"
                            checked={sillokType === 'w'}
                            onChange={() => {
                              setSillokType('w');
                              handleSillokSearch(sillokQuery, sillokKing, sillokYear, 'w', 1, sillokPageSize, false);
                            }}
                            className="text-[#B83A24]"
                          />
                          <span>📜 원문 한자 검색 (原文)</span>
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[#545C69] font-medium">페이지당:</span>
                        <select
                          value={sillokPageSize}
                          onChange={(e) => {
                            const newSize = parseInt(e.target.value, 10);
                            setSillokPageSize(newSize);
                            handleSillokSearch(sillokQuery, sillokKing, sillokYear, sillokType, 1, newSize, false);
                          }}
                          className="px-2.5 py-1 bg-[#FAF7F2] border border-[#D5CEBF] rounded text-xs font-semibold cursor-pointer"
                        >
                          <option value={20}>20개씩 보기 (기본)</option>
                          <option value={50}>50개씩 보기</option>
                        </select>
                      </div>
                    </div>
                  </form>

                  {/* Quick Sillok Tags */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E6E0D4] text-xs">
                    <span className="font-semibold text-[#545C69]">추천 실록 키워드:</span>
                    {SILLOK_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setSillokQuery(tag);
                          handleSillokSearch(tag, sillokKing, sillokYear, sillokType, 1, sillokPageSize, false);
                        }}
                        className={`px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                          sillokQuery === tag
                            ? 'bg-[#1E2229] text-white font-medium'
                            : 'bg-[#FAF7F2] hover:bg-[#EAE4D7] text-[#1E2229] border border-[#E6E0D4]'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sillok Meta Banner */}
                {sillokResponse && !sillokLoading && (
                  <div className="flex flex-wrap items-center justify-between gap-3 px-2 text-xs text-[#545C69]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[#1E2229]">
                        실록 검색 결과: 전체 <strong className="text-[#B83A24]">{sillokResponse.total_results.toLocaleString()}건</strong>
                        {sillokResponse.total_all && sillokResponse.total_all !== sillokResponse.total_results && (
                          <span className="text-[#838C99] font-normal"> (원문+국역 합계 {sillokResponse.total_all.toLocaleString()}건)</span>
                        )}
                      </span>
                      <span>·</span>
                      <span className="font-medium text-[#1E2229]">
                        현재 페이지 <strong className="text-[#1E2229]">{sillokPage}</strong> / {sillokResponse.totalPages || 1}
                        <span className="text-[#545C69] font-normal"> (현재 {sillokResponse.returned_count}건 표시 중)</span>
                      </span>
                      {sillokResponse.filters.king && (
                        <span className="px-1.5 py-0.5 bg-[#FAF7F2] border border-[#E6E0D4] rounded">
                          왕: {sillokResponse.filters.king}
                        </span>
                      )}
                      {sillokResponse.filters.year && (
                        <span className="px-1.5 py-0.5 bg-[#FAF7F2] border border-[#E6E0D4] rounded">
                          서기 {sillokResponse.filters.year}년
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      <span>출처: 국사편찬위원회 조선왕조실록</span>
                      <span>·</span>
                      <span>{sillokResponse.source?.durationMs}ms</span>
                    </div>
                  </div>
                )}

                {/* Loading State */}
                {sillokLoading && (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-10 h-10 border-3 border-[#1E2229] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="font-editorial text-[#1E2229] text-base">
                      국사편찬위원회 조선왕조실록 데이터베이스를 검색하고 있습니다...
                    </p>
                  </div>
                )}

                {/* Error Banner */}
                {sillokError && !sillokLoading && (
                  <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-2">
                    <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
                    <h4 className="font-semibold text-rose-900">실록 검색 결과를 가져오지 못했습니다</h4>
                    <p className="text-xs text-rose-700">[{sillokError.category || '오류'}] {sillokError.message}</p>
                  </div>
                )}

                {/* Sillok Cards List */}
                {!sillokLoading && sillokResponse && sillokResponse.items.length > 0 && (
                  <div className="space-y-4">
                    {sillokResponse.items.map((item, idx) => {
                      const isSaved = savedNotes.some(
                        (n) => n.heritageCodeKey === `sillok-${item.article_id}`
                      );

                      return (
                        <div
                          key={idx}
                          className="bg-[#FFFFFF] border border-[#E6E0D4] hover:border-[#1E2229]/40 hover:shadow-md rounded-2xl p-5 sm:p-6 transition-all space-y-3 group"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6E0D4] pb-3">
                            <div className="flex items-center gap-2">
                              <span className="stamp-seal text-xs px-2 py-0.5 rounded">
                                {item.king ? `${item.king}실록` : '실록 기사'}
                              </span>
                              {item.gregorian_year && (
                                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#FAF7F2] border border-[#D5CEBF] text-[#1E2229] font-semibold">
                                  서기 {item.gregorian_year}년 {item.regnal_year ? `(${item.king} ${item.regnal_year}년)` : ''}
                                </span>
                              )}
                            </div>

                            <span className="font-mono text-[11px] text-[#545C69]">
                              ID: {item.article_id}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h3
                              onClick={() => setActiveSillokArticleId(item.article_id)}
                              className="font-editorial text-lg sm:text-xl font-bold text-[#1E2229] group-hover:text-[#B83A24] transition-colors cursor-pointer"
                            >
                              {item.article_title || item.title}
                            </h3>
                            <p className="text-xs font-editorial text-[#545C69]">
                              {item.title}
                            </p>
                          </div>

                          {item.summary && (
                            <div className="p-3.5 bg-[#FAF7F2] border border-[#E6E0D4] rounded-xl text-xs text-[#1E2229] leading-relaxed font-serif line-clamp-3">
                              {item.summary}
                            </div>
                          )}

                          <div className="pt-2 flex items-center justify-between gap-2 text-xs">
                            {isSaved ? (
                              <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-1 rounded flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                보관됨
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#838C99]">미보관</span>
                            )}

                            <div className="flex items-center gap-2">
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1.5 text-xs text-[#545C69] hover:text-[#1E2229] rounded border border-[#D5CEBF] flex items-center gap-1"
                              >
                                <span>공식 원문</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                              <button
                                onClick={() => setActiveSillokArticleId(item.article_id)}
                                className="px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#1E2229] hover:text-white text-[#1E2229] text-xs font-semibold rounded-lg border border-[#D5CEBF] transition-all cursor-pointer flex items-center gap-1"
                              >
                                <span>기사 전문 보기</span>
                                <span>&rarr;</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Empty Sillok State */}
                {!sillokLoading && sillokResponse && sillokResponse.items.length === 0 && (
                  <div className="p-16 text-center bg-[#FFFFFF] border border-[#E6E0D4] rounded-2xl space-y-3">
                    <ScrollText className="w-10 h-10 text-[#C9C2B2] mx-auto" />
                    <h3 className="font-editorial text-lg font-bold text-[#1E2229]">
                      조건에 일치하는 실록 기사가 없습니다
                    </h3>
                    <p className="text-xs text-[#545C69]">
                      왕대 필터나 서기 연도 조건을 변경하거나 검색어를 넓혀보세요.
                    </p>
                  </div>
                )}

                {/* Sillok Pagination & Load More Controls */}
                {!sillokLoading && sillokResponse && sillokResponse.totalPages > 1 && (
                  <div className="space-y-4 pt-4 border-t border-[#E6E0D4]">
                    {/* Navigation Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FFFFFF] border border-[#E6E0D4] rounded-xl p-3 shadow-2xs">
                      {/* Prev Button */}
                      <button
                        disabled={sillokPage <= 1 || sillokLoading}
                        onClick={() => handleSillokSearch(sillokQuery, sillokKing, sillokYear, sillokType, sillokPage - 1, sillokPageSize, false)}
                        className="px-3 py-1.5 rounded-lg border border-[#D5CEBF] bg-[#FAF7F2] hover:bg-[#EAE4D7] text-xs font-semibold disabled:opacity-40 cursor-pointer flex items-center gap-1"
                      >
                        <ChevronLeft className="w-4 h-4" /> 이전 페이지
                      </button>

                      {/* Numbered Page Buttons */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {(() => {
                          const total = sillokResponse.totalPages;
                          const current = sillokPage;
                          let start = Math.max(1, current - 2);
                          let end = Math.min(total, start + 4);
                          if (end - start < 4) {
                            start = Math.max(1, end - 4);
                          }
                          const pageBtns = [];

                          if (start > 1) {
                            pageBtns.push(
                              <button
                                key={1}
                                onClick={() => handleSillokSearch(sillokQuery, sillokKing, sillokYear, sillokType, 1, sillokPageSize, false)}
                                className={`w-8 h-8 rounded-lg text-xs font-mono font-medium transition-colors ${current === 1 ? 'bg-[#1E2229] text-white font-bold' : 'hover:bg-[#FAF7F2] text-[#545C69] border border-[#D5CEBF]'}`}
                              >
                                1
                              </button>
                            );
                            if (start > 2) {
                              pageBtns.push(<span key="dots-start" className="text-xs text-[#838C99] px-1">...</span>);
                            }
                          }

                          for (let p = start; p <= end; p++) {
                            pageBtns.push(
                              <button
                                key={p}
                                onClick={() => handleSillokSearch(sillokQuery, sillokKing, sillokYear, sillokType, p, sillokPageSize, false)}
                                className={`w-8 h-8 rounded-lg text-xs font-mono font-medium transition-colors ${
                                  current === p
                                    ? 'bg-[#1E2229] text-white font-bold shadow-xs'
                                    : 'hover:bg-[#FAF7F2] text-[#545C69] border border-[#D5CEBF]'
                                }`}
                              >
                                {p}
                              </button>
                            );
                          }

                          if (end < total) {
                            if (end < total - 1) {
                              pageBtns.push(<span key="dots-end" className="text-xs text-[#838C99] px-1">...</span>);
                            }
                            pageBtns.push(
                              <button
                                key={total}
                                onClick={() => handleSillokSearch(sillokQuery, sillokKing, sillokYear, sillokType, total, sillokPageSize, false)}
                                className={`w-8 h-8 rounded-lg text-xs font-mono font-medium transition-colors ${current === total ? 'bg-[#1E2229] text-white font-bold' : 'hover:bg-[#FAF7F2] text-[#545C69] border border-[#D5CEBF]'}`}
                              >
                                {total}
                              </button>
                            );
                          }

                          return pageBtns;
                        })()}
                      </div>

                      {/* Next Button */}
                      <button
                        disabled={sillokPage >= sillokResponse.totalPages || sillokLoading}
                        onClick={() => handleSillokSearch(sillokQuery, sillokKing, sillokYear, sillokType, sillokPage + 1, sillokPageSize, false)}
                        className="px-3 py-1.5 rounded-lg border border-[#D5CEBF] bg-[#FAF7F2] hover:bg-[#EAE4D7] text-xs font-semibold disabled:opacity-40 cursor-pointer flex items-center gap-1"
                      >
                        다음 페이지 <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Load More Button (더 보기) if not on last page */}
                    {sillokPage < sillokResponse.totalPages && (
                      <div className="text-center pt-2">
                        <button
                          disabled={sillokLoading}
                          onClick={() => handleSillokSearch(sillokQuery, sillokKing, sillokYear, sillokType, sillokPage + 1, sillokPageSize, true)}
                          className="px-6 py-2.5 bg-[#FAF7F2] hover:bg-[#EAE4D7] text-[#1E2229] text-xs font-semibold rounded-xl border border-[#D5CEBF] transition-all cursor-pointer inline-flex items-center gap-2 shadow-2xs disabled:opacity-50"
                        >
                          {isAppendingSillok ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>+</span>}
                          <span>다음 페이지 결과 더 보기 (현재 목록 아래에 {sillokPageSize}건 추가 로드)</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ------------------- 3. LIBRARY BOOKS SEARCH SECTION ------------------- */}
            {searchCategory === 'library' && (
              <div className="space-y-6">
                <div className="bg-[#FFFFFF] border border-[#E6E0D4] rounded-2xl p-5 sm:p-7 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="font-editorial text-xl font-bold text-[#1E2229] flex items-center gap-2">
                        <Library className="w-5 h-5 text-[#23456C]" />
                        국립중앙도서관 정보나루(Data4Library) 도서 검색
                      </h2>
                      <p className="text-xs text-[#545C69] mt-0.5">
                        전국 공공도서관 장서 1억 권 이상의 서지 정보, 출판 정보 및 지역별 소장 도서관을 실시간 검색합니다.
                      </p>
                    </div>

                    <a
                      href="https://www.data4library.kr"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#23456C] hover:underline font-mono"
                    >
                      <span>도서관 정보나루 공식 포털</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleLibrarySearch(libraryQuery, 1);
                    }}
                    className="flex flex-col sm:flex-row gap-2.5"
                  >
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={libraryQuery}
                        onChange={(e) => setLibraryQuery(e.target.value)}
                        placeholder="도서명, 저자, 또는 연구 주제를 입력하세요 (예: 조선왕조실록, 한국사, 궁궐건축)"
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#FAF7F2] border border-[#D5CEBF] rounded-xl text-[#1E2229] placeholder:text-[#838C99] focus:outline-none focus:ring-2 focus:ring-[#23456C]"
                      />
                      <Search className="w-4 h-4 text-[#838C99] absolute left-3.5 top-3" />
                    </div>

                    <button
                      type="submit"
                      disabled={libraryLoading}
                      className="px-6 py-2.5 bg-[#23456C] hover:bg-[#1A3452] text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {libraryLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                      <span>도서 검색</span>
                    </button>
                  </form>

                  {/* Quick Library Tags */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E6E0D4] text-xs">
                    <span className="font-semibold text-[#545C69]">추천 도서 키워드:</span>
                    {LIBRARY_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setLibraryQuery(tag);
                          handleLibrarySearch(tag, 1);
                        }}
                        className={`px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                          libraryQuery === tag
                            ? 'bg-[#23456C] text-white font-medium'
                            : 'bg-[#FAF7F2] hover:bg-[#EAE4D7] text-[#1E2229] border border-[#E6E0D4]'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Library Meta Banner */}
                {libraryResponse && !libraryLoading && (
                  <div className="flex flex-wrap items-center justify-between gap-3 px-2 text-xs text-[#545C69]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#1E2229]">
                        공식 도서관 DB 검색 결과: 총 <strong className="text-[#23456C]">{libraryResponse.totalResults}건</strong>
                      </span>
                      <span>·</span>
                      <span>페이지 {libraryResponse.page} / {libraryResponse.totalPages || 1}</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-mono">
                      <span>출처: 국립중앙도서관 도서관 정보나루</span>
                      <span>·</span>
                      <span>{libraryResponse.source?.durationMs}ms</span>
                    </div>
                  </div>
                )}

                {/* Loading State */}
                {libraryLoading && (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-10 h-10 border-3 border-[#23456C] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="font-editorial text-[#1E2229] text-base">
                      국립중앙도서관 정보나루에서 도서 서지 정보를 조회하고 있습니다...
                    </p>
                  </div>
                )}

                {/* Error Banner */}
                {libraryError && !libraryLoading && (
                  <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-2">
                    <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
                    <h4 className="font-semibold text-rose-900">도서 검색 결과를 가져오지 못했습니다</h4>
                    <p className="text-xs text-rose-700">[{libraryError.category || '오류'}] {libraryError.message}</p>
                  </div>
                )}

                {/* Books Grid */}
                {!libraryLoading && libraryResponse && libraryResponse.books.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {libraryResponse.books.map((book, idx) => {
                      const isSaved = savedNotes.some(
                        (n) => n.heritageCodeKey === `book-${book.isbn13}`
                      );

                      return (
                        <div
                          key={idx}
                          className="bg-[#FFFFFF] border border-[#E6E0D4] hover:border-[#23456C]/40 hover:shadow-md rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 group"
                        >
                          <div className="flex gap-4 items-start">
                            {/* Book Thumbnail */}
                            <div className="w-20 h-28 shrink-0 rounded-lg overflow-hidden border border-[#E6E0D4] bg-[#F6F2EA] flex items-center justify-center">
                              {book.bookImageURL ? (
                                <img
                                  src={book.bookImageURL}
                                  alt={book.bookname}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <BookCopy className="w-6 h-6 text-[#838C99] opacity-60" />
                              )}
                            </div>

                            {/* Details */}
                            <div className="space-y-1.5 min-w-0 flex-1">
                              <span className="stamp-seal text-[10px] px-2 py-0.5 rounded">
                                {book.class_nm ? book.class_nm.split('>')[0].trim() : '도서'}
                              </span>

                              <h3
                                onClick={() => {
                                  setActiveBookIsbn(book.isbn13);
                                  setActiveBookObj(book);
                                }}
                                className="font-editorial text-base font-bold text-[#1E2229] group-hover:text-[#23456C] transition-colors cursor-pointer line-clamp-2"
                                title={book.bookname}
                              >
                                {book.bookname}
                              </h3>

                              <div className="text-xs text-[#545C69] space-y-0.5">
                                <div className="truncate" title={book.authors}>저자: {book.authors || '저자 미상'}</div>
                                <div className="truncate">출판: {book.publisher} ({book.publication_year || '연도 미상'})</div>
                                <div className="font-mono text-[11px] text-[#838C99]">ISBN: {book.isbn13}</div>
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 mt-4 border-t border-[#E6E0D4] flex items-center justify-between gap-2">
                            {isSaved ? (
                              <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-1 rounded flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                보관됨
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#838C99]">미보관</span>
                            )}

                            <button
                              onClick={() => {
                                setActiveBookIsbn(book.isbn13);
                                setActiveBookObj(book);
                              }}
                              className="px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#23456C] hover:text-white text-[#1E2229] text-xs font-semibold rounded-lg border border-[#D5CEBF] transition-all cursor-pointer flex items-center gap-1"
                            >
                              <span>상세 및 소장 도서관</span>
                              <span>&rarr;</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Empty State */}
                {!libraryLoading && libraryResponse && libraryResponse.books.length === 0 && (
                  <div className="p-16 text-center bg-[#FFFFFF] border border-[#E6E0D4] rounded-2xl space-y-3">
                    <Library className="w-10 h-10 text-[#C9C2B2] mx-auto" />
                    <h3 className="font-editorial text-lg font-bold text-[#1E2229]">
                      검색 조건에 맞는 도서가 없습니다
                    </h3>
                    <p className="text-xs text-[#545C69]">검색어를 다른 단어로 변경해 보세요.</p>
                  </div>
                )}

                {/* Pagination */}
                {libraryResponse && libraryResponse.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <button
                      disabled={libraryPage <= 1 || libraryLoading}
                      onClick={() => handleLibrarySearch(libraryQuery, libraryPage - 1)}
                      className="px-3 py-1.5 rounded-lg border border-[#D5CEBF] bg-[#FFFFFF] hover:bg-[#FAF7F2] text-xs font-semibold disabled:opacity-40 cursor-pointer flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" /> 이전
                    </button>
                    <span className="text-xs font-mono font-medium text-[#545C69] px-3">
                      {libraryPage} / {libraryResponse.totalPages}
                    </span>
                    <button
                      disabled={libraryPage >= libraryResponse.totalPages || libraryLoading}
                      onClick={() => handleLibrarySearch(libraryQuery, libraryPage + 1)}
                      className="px-3 py-1.5 rounded-lg border border-[#D5CEBF] bg-[#FFFFFF] hover:bg-[#FAF7F2] text-xs font-semibold disabled:opacity-40 cursor-pointer flex items-center gap-1"
                    >
                      다음 <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Saved Research Notes View */}
        {activeTab === 'notes' && (
          <SavedNotesView
            projects={projects}
            notes={savedNotes}
            onOpenDetail={(kind, asno, ctcd) => {
              if (kind === 'sillok') {
                setActiveSillokArticleId(asno);
              } else if (kind === 'book') {
                setActiveBookIsbn(asno);
              } else {
                setActiveHeritageCode({ kind, asno, ctcd });
              }
            }}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            onOpenNewProject={() => setIsProjectModalOpen(true)}
          />
        )}

        {/* TAB 3: Diagnostics View */}
        {activeTab === 'diagnostics' && (
          <div className="space-y-6">
            <DiagnosticInspector
              initialQuery={searchQuery || '경복궁'}
              onSelectHeritage={(kind, asno, ctcd) =>
                setActiveHeritageCode({ kind, asno, ctcd })
              }
            />

            <div className="bg-[#FFFFFF] border border-[#E6E0D4] rounded-xl p-5 text-xs space-y-3">
              <h4 className="font-editorial font-bold text-sm text-[#1E2229] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#2D6A4F]" />
                고증노트 3대 공식 학술 데이터 소스 검증 현황
              </h4>
              <ul className="space-y-2 text-[#545C69] list-disc list-inside">
                <li>
                  <strong className="text-[#1E2229]">1. 국가유산청 공식 Open API:</strong> 10만여 건의 국보·보물·사적 등 실시간 XML 엔드포인트 연계 (200 OK, '경복궁' 11건 검증 완료).
                </li>
                <li>
                  <strong className="text-[#1E2229]">2. 국사편찬위원회 조선왕조실록:</strong> 공식 실록 포털(sillok.history.go.kr)에 Node.js 파서 연계, 태조~순종 472년 기사 및 국역문/원문 한자 대역 조회 ('훈민정음', 세종, 1443년 kda_12512030_002 기사 검증 완료).
                </li>
                <li>
                  <strong className="text-[#1E2229]">3. 국립중앙도서관 도서관 정보나루:</strong> Data4Library 공식 프록시(k-skill-proxy) 연계, 도서 서지 및 전국 17개 시도 공공도서관 실시간 소장 현황 조회 ('조선왕조실록' 480건 및 소장 도서관 검증 완료).
                </li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#E6E0D4] bg-[#FAF7F2] py-6 text-center text-xs text-[#545C69]">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-editorial text-[#1E2229]">
            고증노트 (考證 Note) - 국가유산청 · 국사편찬위원회 · 국립중앙도서관 공식 데이터 기반
          </p>
          <p className="text-[11px] text-[#838C99]">
            본 서비스는 공식 공공 데이터 및 학술 아카이브를 실시간으로 직접 연계하며, 창작자의 역사 고증과 서지 연구를 지원합니다.
          </p>
        </div>
      </footer>

      {/* 1. Heritage Detail Modal */}
      {activeHeritageCode && (
        <HeritageDetailModal
          kind={activeHeritageCode.kind}
          asno={activeHeritageCode.asno}
          ctcd={activeHeritageCode.ctcd}
          onClose={() => setActiveHeritageCode(null)}
          projects={projects}
          savedNotes={savedNotes}
          onSaveNote={handleSaveNote}
        />
      )}

      {/* 2. Sillok Detail Modal */}
      {activeSillokArticleId && (
        <SillokDetailModal
          articleId={activeSillokArticleId}
          onClose={() => setActiveSillokArticleId(null)}
          projects={projects}
          savedNotes={savedNotes}
          onSaveNote={handleSaveNote}
        />
      )}

      {/* 3. Library Book Detail Modal */}
      {activeBookIsbn && (
        <LibraryDetailModal
          isbn13={activeBookIsbn}
          initialBook={activeBookObj}
          onClose={() => {
            setActiveBookIsbn(null);
            setActiveBookObj(undefined);
          }}
          projects={projects}
          savedNotes={savedNotes}
          onSaveNote={handleSaveNote}
        />
      )}

      {/* Project Manager Modal */}
      {isProjectModalOpen && (
        <ProjectManagerModal
          projects={projects}
          onClose={() => setIsProjectModalOpen(false)}
          onAddProject={handleAddProject}
          onDeleteProject={handleDeleteProject}
        />
      )}
    </div>
  );
}
