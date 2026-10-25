import React, { useState } from 'react';
import { X, FolderPlus, Trash2, Check, FolderKanban } from 'lucide-react';
import { CreatorProject } from '../types';

interface ProjectManagerModalProps {
  projects: CreatorProject[];
  onClose: () => void;
  onAddProject: (project: Omit<CreatorProject, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDeleteProject: (projectId: string) => void;
}

const BADGES = ['📜', '🏯', '⚔️', '🎨', '📖', '⛩️', '🏺', '👑', '🗺️', '🎭'];
const COLORS = [
  '#B83A24', // vermilion
  '#23456C', // indigo
  '#2D6A4F', // celadon
  '#B5832C', // ochre
  '#4A4E69', // slate
  '#7A306C', // plum
];

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  projects,
  onClose,
  onAddProject,
  onDeleteProject,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBadge, setSelectedBadge] = useState('📜');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddProject({
      title: title.trim(),
      description: description.trim(),
      badge: selectedBadge,
      color: selectedColor,
    });

    setTitle('');
    setDescription('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1E2229]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E6E0D4] w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 bg-[#FAF7F2] border-b border-[#E6E0D4] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-[#B83A24]" />
            <h3 className="font-editorial text-lg font-bold text-[#1E2229]">
              창작 프로젝트 관리
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#545C69] hover:bg-[#EAE4D7] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Add New Project Form */}
          <form onSubmit={handleSubmit} className="p-4 bg-[#FAF7F2] border border-[#E6E0D4] rounded-xl space-y-3">
            <h4 className="font-editorial font-bold text-sm text-[#1E2229] flex items-center gap-1.5">
              <FolderPlus className="w-4 h-4 text-[#B83A24]" />
              새 창작 프로젝트 개설
            </h4>

            <div>
              <label className="block text-xs font-medium text-[#545C69] mb-1">
                프로젝트명 (웹툰, 소설, 각본 제목)
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 조선 초기 궁궐 암투물 시나리오"
                className="w-full px-3 py-1.5 text-xs bg-white border border-[#D5CEBF] rounded-lg text-[#1E2229]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#545C69] mb-1">
                작품 설명 / 고증 목표
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="예: 15세기 초 한양 천도 전후 궁궐 배치 및 복식 고증"
                className="w-full px-3 py-1.5 text-xs bg-white border border-[#D5CEBF] rounded-lg text-[#1E2229]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium text-[#545C69] mb-1">아이콘</label>
                <div className="flex flex-wrap gap-1">
                  {BADGES.map((b) => (
                    <button
                      type="button"
                      key={b}
                      onClick={() => setSelectedBadge(b)}
                      className={`w-7 h-7 rounded text-sm flex items-center justify-center transition-transform ${
                        selectedBadge === b ? 'bg-[#EAE4D7] scale-110 border border-[#B83A24]' : 'hover:bg-[#EAE4D7]/50'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#545C69] mb-1">식별 색상</label>
                <div className="flex gap-2 items-center pt-1">
                  {COLORS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className="w-6 h-6 rounded-full flex items-center justify-center transition-transform"
                      style={{ backgroundColor: c }}
                    >
                      {selectedColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#B83A24] hover:bg-[#A32F1A] text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
              >
                + 프로젝트 생성
              </button>
            </div>
          </form>

          {/* Existing Projects List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[#545C69] uppercase tracking-wider">
              등록된 프로젝트 목록 ({projects.length})
            </h4>

            <div className="space-y-2">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="p-3 bg-white border border-[#E6E0D4] rounded-lg flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                      style={{ backgroundColor: `${p.color}20`, color: p.color }}
                    >
                      {p.badge}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-[#1E2229] truncate">{p.title}</div>
                      {p.description && (
                        <div className="text-[11px] text-[#545C69] truncate">{p.description}</div>
                      )}
                    </div>
                  </div>

                  {projects.length > 1 && (
                    <button
                      onClick={() => onDeleteProject(p.id)}
                      className="p-1.5 text-[#838C99] hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      title="프로젝트 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
