import React, { useState } from 'react';
import { Category, Bookmark } from '../types';
import { DynamicIcon } from './DynamicIcon';
import { X, Plus, Trash2, ArrowUp, ArrowDown, Edit2, Check } from 'lucide-react';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  bookmarks: Bookmark[];
  onSaveCategories: (newCategories: Category[], updatedBookmarks?: Bookmark[]) => void;
}

const COMMON_ICONS = [
  'Folder',
  'Code',
  'Cloud',
  'Cpu',
  'Wrench',
  'Palette',
  'BookMarked',
  'Globe',
  'Github',
  'Star',
  'Heart',
  'Compass',
  'Zap',
  'Server',
  'Database',
  'Terminal',
  'BookOpen',
  'Layers',
];

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  categories,
  bookmarks,
  onSaveCategories,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Folder');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Check if childId is a descendant of parentCandidateId to avoid cycles
  const isDescendantOf = (parentCandidateId: string | null, childId: string): boolean => {
    if (!parentCandidateId) return false;
    let current = categories.find(c => c.id === childId);
    while (current && current.parentId) {
      if (current.parentId === parentCandidateId) return true;
      current = categories.find(c => c.id === current.parentId);
    }
    return false;
  };

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setIcon(cat.icon || 'Folder');
    setDescription(cat.description || '');
    setParentId(cat.parentId || null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setIcon('Folder');
    setDescription('');
    setParentId(null);
  };

  const handleSaveItem = () => {
    if (!name.trim()) return;

    if (editingId) {
      // update existing
      const updated = categories.map((c) =>
        c.id === editingId
          ? { ...c, name: name.trim(), icon: icon.trim(), description: description.trim(), parentId }
          : c
      );
      onSaveCategories(updated);
    } else {
      // create new
      const newCat: Category = {
        id: 'cat-' + Date.now(),
        name: name.trim(),
        icon: icon.trim(),
        description: description.trim(),
        order: categories.length + 1,
        parentId,
      };
      onSaveCategories([...categories, newCat]);
    }
    handleCancelEdit();
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= categories.length) return;

    const list = [...categories];
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    // re-assign orders
    const reordered = list.map((item, idx) => ({ ...item, order: idx + 1 }));
    onSaveCategories(reordered);
  };

  const handleDelete = (catId: string) => {
    // Find all descendant categories to be deleted recursively
    const getDescendantCats = (id: string): string[] => {
      const children = categories.filter(c => c.parentId === id);
      const childIds = children.map(c => c.id);
      children.forEach(c => {
        childIds.push(...getDescendantCats(c.id));
      });
      return childIds;
    };
    
    const descendantIds = [catId, ...getDescendantCats(catId)];
    const affectedBookmarks = bookmarks.filter(b => descendantIds.includes(b.categoryId));
    
    const descCount = descendantIds.length - 1;
    let confirmMsg = '';
    if (descCount > 0) {
      confirmMsg = `该分类包含 ${descCount} 个子分类和共计 ${affectedBookmarks.length} 个书签。删除后它们都将被一并清空，确定要继续吗？`;
    } else if (affectedBookmarks.length > 0) {
      confirmMsg = `该分类下含有 ${affectedBookmarks.length} 个书签。删除后这些书签也将一并删除，确定要继续吗？`;
    } else {
      confirmMsg = `确定要删除该分类 [${categories.find(c => c.id === catId)?.name}] 吗？`;
    }

    if (!window.confirm(confirmMsg)) {
      return;
    }

    const filteredCats = categories.filter((c) => !descendantIds.includes(c.id));
    const updatedBookmarks = bookmarks.filter((b) => !descendantIds.includes(b.categoryId));
    onSaveCategories(filteredCats, updatedBookmarks);
  };

  return (
    <div
      id="modal-category-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="modal-category-content"
        className="w-full max-w-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/60 dark:border-white/10 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              分类管理
            </h2>
            <p className="text-xs text-slate-400">添加、重命名、排序或删除导航分类</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Add / Edit Input Group */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {editingId ? '编辑分类' : '新建分类'}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">分类名称 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如: 常用工具"
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">上级分类</label>
                <select
                  value={parentId || ''}
                  onChange={(e) => setParentId(e.target.value || null)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100"
                >
                  <option value="">无 (作为一级分类)</option>
                  {categories
                    .filter((c) => c.id !== editingId && !isDescendantOf(editingId, c.id))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">图标 (选择或输入)</label>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-blue-600 shrink-0">
                    <DynamicIcon name={icon} className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    placeholder="Code, Cloud, Star 等"
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Quick Icon Selector */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">常用图标候选:</label>
              <div className="flex flex-wrap gap-1">
                {COMMON_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={`p-1.5 rounded-md border text-xs transition-colors ${
                      icon === ic
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/40 text-blue-600'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-white dark:hover:bg-slate-700'
                    }`}
                    title={ic}
                  >
                    <DynamicIcon name={ic} className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">描述说明 (可选)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="一句话介绍该分类..."
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-1 text-xs text-slate-500 hover:text-slate-700"
                >
                  取消
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveItem}
                disabled={!name.trim()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
              >
                {editingId ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                <span>{editingId ? '更新分类' : '添加分类'}</span>
              </button>
            </div>
          </div>

          {/* Existing Categories List */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              现有分类列表 ({categories.length})
            </span>
 
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
              {(() => {
                const result: { cat: Category; depth: number }[] = [];
                const addChildren = (parentId: string | null, depth: number) => {
                  const children = categories.filter(c => (parentId === null ? !c.parentId : c.parentId === parentId));
                  children.sort((a, b) => a.order - b.order);
                  children.forEach(child => {
                    result.push({ cat: child, depth });
                    addChildren(child.id, depth + 1);
                  });
                };
                addChildren(null, 0);
                // Orphans
                categories.forEach(c => {
                  if (c.parentId && !categories.some(parent => parent.id === c.parentId) && !result.some(r => r.cat.id === c.id)) {
                    result.push({ cat: c, depth: 0 });
                    addChildren(c.id, 1);
                  }
                });

                return result.map(({ cat, depth }) => {
                  const count = bookmarks.filter((b) => b.categoryId === cat.id).length;
                  const originalIdx = categories.findIndex(c => c.id === cat.id);
                  const parentCat = cat.parentId ? categories.find(c => c.id === cat.parentId) : null;
                  
                  return (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      style={{ paddingLeft: `${depth * 20 + 12}px` }}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex items-center shrink-0">
                          {depth > 0 && (
                            <span className="text-slate-300 dark:text-slate-700 text-xs font-mono select-none mr-1.5">
                              └─
                            </span>
                          )}
                          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <DynamicIcon name={cat.icon} className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {cat.name}
                            </span>
                            <span className="text-[10px] text-slate-400 px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded-full shrink-0">
                              {count} 项
                            </span>
                            {parentCat && (
                              <span className="text-[10px] text-slate-400/80 dark:text-slate-500 border border-slate-200 dark:border-slate-800 px-1 py-0.2 rounded shrink-0">
                                隶属: {parentCat.name}
                              </span>
                            )}
                          </div>
                          {cat.description && (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                              {cat.description}
                            </p>
                          )}
                        </div>
                      </div>
 
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          onClick={() => handleMove(originalIdx, 'up')}
                          disabled={originalIdx <= 0}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 rounded"
                          title="上移"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMove(originalIdx, 'down')}
                          disabled={originalIdx === -1 || originalIdx === categories.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 rounded"
                          title="下移"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleStartEdit(cat)}
                          className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded"
                          title="编辑"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
                          className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-200"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
