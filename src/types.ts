export interface HeritageCode {
  kind: string; // ccbaKdcd (종목코드, e.g. 11: 국보, 12: 보물, 13: 사적)
  number: string; // ccbaAsno (지정번호)
  province: string; // ccbaCtcd (시도코드)
  cpno?: string;
}

export interface HeritageSummaryItem {
  name: string;
  nameHanja?: string;
  heritageType: string; // 국보, 보물, 사적 등
  province: string;
  district?: string;
  admin?: string;
  latitude: number | null;
  longitude: number | null;
  designatedStatus: string;
  updatedAt?: string;
  heritageCode: HeritageCode;
  imageUrl?: string;
}

export interface HeritageDetailItem {
  name: string;
  nameHanja?: string;
  heritageType: string;
  classifications: string[];
  quantity?: string;
  designatedDate?: string; // YYYYMMDD
  province: string;
  district?: string;
  address?: string;
  era?: string; // 시대 (e.g. 조선 고종 4년(1867))
  ownership?: string;
  admin?: string;
  description: string;
  imageUrl?: string;
  latitude: number | null;
  longitude: number | null;
  heritageCode: HeritageCode;
  source: {
    url: string;
    officialPortalUrl: string;
    officialGuideUrl: string;
    fetchedAt: string;
    durationMs: number;
  };
}

export interface SearchResponse {
  totalResults: number;
  page: number;
  pageSize: number;
  totalPages: number;
  items: HeritageSummaryItem[];
  source: {
    url: string;
    officialPortalName: string;
    fetchedAt: string;
    durationMs: number;
  };
}

export interface DiagnosticResult {
  success: boolean;
  testedQuery: string;
  targetUrl: string;
  statusCode: number;
  durationMs: number;
  contentType: string;
  totalCount?: number;
  pageIndex?: number;
  pageUnit?: number;
  receivedItemsCount?: number;
  previewItems?: Array<{
    name: string;
    nameHanja?: string;
    heritageType: string;
    province: string;
    district?: string;
    admin?: string;
    heritageCode: HeritageCode;
  }>;
  diagnosis?: {
    urlValid: boolean;
    parametersValid?: boolean;
    networkConnected: boolean;
    upstreamServerAvailable: boolean;
    latencyLevel?: string;
    verifiedAt: string;
    note?: string;
  };
  error?: string;
  errorCategory?: 'URL_PARAM_ERROR' | 'NETWORK_CONNECTION_ERROR' | 'UPSTREAM_TIMEOUT' | 'UNKNOWN';
}

export interface CreatorProject {
  id: string;
  title: string;
  description: string;
  color: string;
  badge: string;
  createdAt: string;
  updatedAt: string;
}

// ----------------- 조선왕조실록 관련 타입 -----------------
export interface SillokCategory {
  label: string;
  count: number;
  token: string;
}

export interface SillokDetail {
  article_id: string;
  url: string;
  header: string;
  title: string;
  translated_text: string;
  original_text: string;
  classification?: string;
}

export interface SillokArticle {
  article_id: string;
  url: string;
  title: string;
  article_title: string;
  summary: string;
  king?: string;
  regnal_year?: number;
  gregorian_year?: number;
  excerpt?: string;
  detail?: SillokDetail;
}

export interface SillokSearchResponse {
  query: string;
  type: string;
  filters: {
    king?: string;
    year?: number;
    page: number;
    pageSize: number;
    limit?: number;
  };
  total_results: number;
  type_count: number;
  total_all?: number;
  page: number;
  pageSize: number;
  totalPages: number;
  returned_count: number;
  categories: SillokCategory[];
  items: SillokArticle[];
  source?: {
    url: string;
    fetchedAt: string;
    durationMs: number;
  };
}

// ----------------- 도서관 도서 검색 관련 타입 -----------------
export interface LibraryBook {
  bookname: string;
  authors: string;
  publisher: string;
  publication_year?: string;
  isbn13: string;
  addition_symbol?: string;
  vol?: string;
  class_no?: string;
  class_nm?: string;
  bookImageURL?: string;
  bookDtlUrl?: string;
  loan_count?: string;
}

export interface LibraryBookDetail {
  bookname: string;
  authors: string;
  publisher: string;
  publication_date?: string;
  publication_year?: string;
  isbn?: string;
  isbn13: string;
  class_no?: string;
  class_nm?: string;
  description?: string;
  bookImageURL?: string;
  loanInfo?: any;
}

export interface LibraryHolding {
  libCode: string;
  libName: string;
  address: string;
  tel?: string;
  fax?: string;
  latitude?: string;
  longitude?: string;
  homepage?: string;
  closed?: string;
  operatingTime?: string;
  hasBook?: string;
  loanAvailable?: string;
}

export interface LibrarySearchResponse {
  totalResults: number;
  page: number;
  pageSize: number;
  totalPages: number;
  books: LibraryBook[];
  source?: {
    url: string;
    fetchedAt: string;
    durationMs: number;
  };
}

// ----------------- 통합 저장 연구 노트 타입 -----------------
export type ResearchCategoryType = 'heritage' | 'sillok' | 'library';

export interface SavedHeritageNote {
  id: string;
  projectId: string;
  heritageCodeKey: string; // kind-number-province OR sillok-articleId OR book-isbn13
  categoryType?: ResearchCategoryType; // default: 'heritage'
  heritage: HeritageDetailItem;
  // Optional extra payloads for Sillok or Books
  sillokArticle?: SillokArticle;
  libraryBook?: LibraryBook;
  creatorNote: string;
  verificationStatus: 'verified' | 'investigating' | 'referenced'; // 고증완료 | 추가조사필요 | 배경참고
  tags: string[];
  sceneReference?: string; // e.g. "제3화 대궐 진하례 씬"
  savedAt: string;
  updatedAt: string;
}
