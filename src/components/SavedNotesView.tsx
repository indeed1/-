import React, { useState } from 'react';
import {
  FolderKanban, BookmarkCheck, Search, Download, Trash2, Edit3, Tag,
  FileText, ExternalLink, Filter, Sparkles, Check, CheckCircle2, Clock, Eye
} from 'lucide-react';
import { CreatorProject, SavedHeritageNote } from '../types';

interface SavedNotesViewProps {
  projects: CreatorProject[];
  notes: SavedHeritageNote[];
  onOpenDetail: (kind: string, asno: string, ctcd: string) => void;
  onUpdateNote: (note: SavedHeritageNote) => void;
  onDeleteNote: (noteId: string) => void;
  onOpenNewProject: () => void;
}

export const SavedNotesView: React.FC<SavedNotesViewProps> = ({
  projects,
  notes,
  onOpenDetail,
  onUpdateNote,
  onDeleteNote,
  onOpenNewProject,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Filter notes
  const filteredNotes = notes.filter((n) => {
    if (selectedProjectId !== 'all' && n.projectId !== selectedProjectId) return false;
    if (selectedStatus !== 'all' && n.verificationStatus !== selectedStatus) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = n.heritage.name.toLowerCase().includes(q);
      const matchNote = n.creatorNote.toLowerCase().includes(q);
      const matchTag = n.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchName && !matchNote && !matchTag) return false;
    }
    return true;
  });

  const activeProject = projects.find((p) => p.id === selectedProjectId);

  // Export to Markdown
  const handleExportMarkdown = () => {
    let md = `# [고증노트] ${activeProject ? activeProject.title : '전체 창작 고증 아카이브'}\n\n`;
    md += `생성일: ${new Date().toLocaleDateString('ko-KR')}\n`;
    md += `보관 항목 수: ${filteredNotes.length}건\n\n---\n\n`;

    filteredNotes.forEach((n, idx) => {
      const h = n.heritage;
      md += `## ${idx + 1}. ${h.name} (${h.nameHanja || ''})\n`;
      md += `- **구분/종목**: ${h.heritageType} (코드: ${h.heritageCode.kind}-${h.heritageCode.number})\n`;
      md += `- **시대**: ${h.era || '기록 없음'}\n`;
      md += `- **소재지**: ${h.address || `${h.province} ${h.district || ''}`}\n`;
      md += `- **고증 상태**: ${n.verificationStatus === 'verified' ? '✅ 고증 완료' : n.verificationStatus === 'investigating' ? '🔍 추가 조사 필요' : '📖 배경 참고'}\n`;
      md += `- **씬 태그**: ${n.tags.map((t) => `#${t}`).join(' ')}\n\n`;
      md += `### ✍️ 창작자 고증 메모\n> ${n.creatorNote || '(작성된 메모 없음)'}\n\n`;
      md += `### 🏛️ 공식 역사 해설 요약\n${h.description.slice(0, 300)}...\n\n`;
      md += `- **출처**: 국가유산청 공식 포털 (${h.source?.officialPortalUrl || 'https://www.heritage.go.kr'})\n\n---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `고증노트_${activeProject ? activeProject.title.replace(/\s+/g, '_') : '전체자료'}_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStartEdit = (note: SavedHeritageNote) => {
    setEditingNoteId(note.id);
    setEditContent(note.creatorNote);
  };

  const handleSaveEdit = (note: SavedHeritageNote) => {
    onUpdateNote({
      ...note,
      creatorNote: editContent,
      updatedAt: new Date().toISOString(),
    });
    setEditingNoteId(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Controls */}
      <div className="bg-[#FFFFFF] border border-[#E6E0D4] rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-editorial text-2xl font-bold text-[#1E2229] flex items-center gap-2">
              <FolderKanban className="w-6 h-6 text-[#B83A24]" />
              창작자 연구 고증노트 아카이브
            </h2>
            <p className="text-xs text-[#545C69] mt-1">
              공식 국가유산청 데이터와 창작자의 연출 메모를 프로젝트별로 분류하여 관리합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenNewProject}
              className="px-3.5 py-1.5 bg-[#FAF7F2] hover:bg-[#EAE4D7] text-xs font-semibold text-[#1E2229] border border-[#D5CEBF] rounded-lg transition-colors cursor-pointer"
            >
              + 새 프로젝트 추가
            </button>
            <button
              onClick={handleExportMarkdown}
              disabled={filteredNotes.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1E2229] hover:bg-[#343A46] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>마크다운 내보내기 (.md)</span>
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 border-t border-[#E6E0D4]">
          {/* Project Tab Selector */}
          <div className="sm:col-span-5">
            <label className="block text-xs font-medium text-[#545C69] mb-1">프로젝트 선택</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-[#FAF7F2] border border-[#D5CEBF] rounded-lg text-[#1E2229] font-medium focus:ring-1 focus:ring-[#B83A24]"
            >
              <option value="all">📂 전체 프로젝트 ({notes.length}건)</option>
              {projects.map((p) => {
                const count = notes.filter((n) => n.projectId === p.id).length;
                return (
                  <option key={p.id} value={p.id}>
                    {p.badge} {p.title} ({count}건)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Verification Status Filter */}
          <div className="sm:col-span-3">
            <label className="block text-xs font-medium text-[#545C69] mb-1">고증 상태</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-[#FAF7F2] border border-[#D5CEBF] rounded-lg text-[#1E2229] font-medium"
            >
              <option value="all">전체 상태</option>
              <option value="verified">✅ 고증 완료</option>
              <option value="investigating">🔍 추가 조사 필요</option>
              <option value="referenced">📖 배경 참고</option>
            </select>
          </div>

          {/* Search Term */}
          <div className="sm:col-span-4">
            <label className="block text-xs font-medium text-[#545C69] mb-1">메모/명칭 검색</label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="유산명, 메모, 태그 검색..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF7F2] border border-[#D5CEBF] rounded-lg text-[#1E2229]"
              />
              <Search className="w-3.5 h-3.5 text-[#838C99] absolute left-2.5 top-2" />
            </div>
          </div>
        </div>
      </div>

      {/* Notes List / Grid */}
      {filteredNotes.length === 0 ? (
        <div className="p-12 text-center bg-[#FFFFFF] border border-[#E6E0D4] rounded-xl space-y-3">
          <BookmarkCheck className="w-12 h-12 text-[#C9C2B2] mx-auto" />
          <h3 className="font-editorial text-lg font-bold text-[#1E2229]">
            보관된 고증 자료가 없습니다
          </h3>
          <p className="text-xs text-[#545C69] max-w-md mx-auto">
            자료 검색 화면에서 원하는 국가유산(예: 경복궁, 숭례문, 첨성대 등)을 검색한 후,
            상세 보기에서 <strong>[프로젝트에 저장]</strong> 버튼을 눌러 나만의 고증 메모를 남겨보세요.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotes.map((note) => {
            const h = note.heritage;
            const project = projects.find((p) => p.id === note.projectId);
            const isEditing = editingNoteId === note.id;

            return (
              <div
                key={note.id}
                className="bg-[#FFFFFF] border border-[#E6E0D4] hover:border-[#D5CEBF] rounded-xl p-5 shadow-2xs transition-all space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E6E0D4] pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="stamp-seal text-[11px] px-2 py-0.5 rounded">
                        {h.heritageType}
                      </span>
                      <span className="font-editorial text-lg font-bold text-[#1E2229] hover:text-[#B83A24] cursor-pointer"
                        onClick={() => onOpenDetail(h.heritageCode.kind, h.heritageCode.number, h.heritageCode.province)}
                      >
                        {h.name}
                      </span>
                      {h.nameHanja && (
                        <span className="text-sm font-editorial text-[#545C69]">
                          ({h.nameHanja})
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#545C69]">
                      <span>시대: <strong className="text-[#1E2229] font-editorial">{h.era || '기록 없음'}</strong></span>
                      <span>·</span>
                      <span>소재지: {h.address || `${h.province} ${h.district || ''}`}</span>
                      <span>·</span>
                      <span className="font-mono text-[11px]">코드: {h.heritageCode.kind}-{h.heritageCode.number.slice(0, 6)}</span>
                    </div>
                  </div>

                  {/* Actions & Status Badge */}
                  <div className="flex items-center gap-2">
                    {/* Status selector */}
                    <select
                      value={note.verificationStatus}
                      onChange={(e) =>
                        onUpdateNote({
                          ...note,
                          verificationStatus: e.target.value as any,
                          updatedAt: new Date().toISOString(),
                        })
                      }
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium border cursor-pointer ${
                        note.verificationStatus === 'verified'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : note.verificationStatus === 'investigating'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-blue-50 text-blue-800 border-blue-300'
                      }`}
                    >
                      <option value="verified">✅ 고증 완료</option>
                      <option value="investigating">🔍 추가 조사 필요</option>
                      <option value="referenced">📖 배경 참고</option>
                    </select>

                    <button
                      onClick={() => onOpenDetail(h.heritageCode.kind, h.heritageCode.number, h.heritageCode.province)}
                      className="p-1.5 text-[#545C69] hover:text-[#1E2229] hover:bg-[#FAF7F2] rounded-lg transition-colors cursor-pointer"
                      title="공식 상세 정보 보기"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onDeleteNote(note.id)}
                      className="p-1.5 text-[#838C99] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="노트 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Creator Note & Scene Notes */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Photo Thumbnail */}
                  <div className="md:col-span-3">
                    <div
                      onClick={() => onOpenDetail(h.heritageCode.kind, h.heritageCode.number, h.heritageCode.province)}
                      className="rounded-lg overflow-hidden border border-[#E6E0D4] bg-[#F6F2EA] aspect-4/3 cursor-pointer group relative"
                    >
                      {h.imageUrl ? (
                        <img
                          src={h.imageUrl}
                          alt={h.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs text-[#838C99]">
                          공식 사진 없음
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Note Content */}
                  <div className="md:col-span-9 space-y-3">
                    <div className="bg-[#FAF7F2] border border-[#E6E0D4] rounded-lg p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs text-[#545C69]">
                        <span className="font-semibold text-[#1E2229] flex items-center gap-1.5">
                          <Edit3 className="w-3.5 h-3.5 text-[#B83A24]" />
                          창작자 고증 메모 및 연출 계획
                        </span>
                        {!isEditing && (
                          <button
                            onClick={() => handleStartEdit(note)}
                            className="text-[#23456C] hover:underline font-medium cursor-pointer"
                          >
                            메모 수정
                          </button>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2 pt-1">
                          <textarea
                            rows={3}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full p-2.5 text-xs bg-white border border-[#D5CEBF] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#B83A24]"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingNoteId(null)}
                              className="px-2.5 py-1 text-xs text-[#545C69] hover:bg-[#EAE4D7] rounded"
                            >
                              취소
                            </button>
                            <button
                              onClick={() => handleSaveEdit(note)}
                              className="px-3 py-1 bg-[#B83A24] text-white text-xs font-semibold rounded"
                            >
                              저장
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-[#1E2229] whitespace-pre-line leading-relaxed font-sans">
                          {note.creatorNote || (
                            <span className="text-[#838C99] italic">
                              기록된 창작 메모가 없습니다. '메모 수정'을 눌러 고증 포인트를 적어보세요.
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Tags & Project Info */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {project && (
                          <span className="px-2 py-0.5 rounded bg-[#FAF7F2] border border-[#E6E0D4] text-[#1E2229] font-medium text-[11px]">
                            {project.badge} {project.title}
                          </span>
                        )}
                        {note.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-full bg-[#EAE4D7] text-[#1E2229] text-[11px]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      <span className="text-[11px] font-mono text-[#838C99]">
                        저장일: {new Date(note.savedAt).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
