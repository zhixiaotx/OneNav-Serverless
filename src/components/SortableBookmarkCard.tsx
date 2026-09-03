import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Bookmark, CardLayout } from '../types';
import { BookmarkCard } from './BookmarkCard';

interface SortableBookmarkCardProps {
  bookmark: Bookmark;
  layout: CardLayout;
  showClicks: boolean;
  showDesc: boolean;
  openInNewTab: boolean;
  disabled?: boolean;
  onBookmarkClick: (bookmark: Bookmark) => void;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (bookmarkId: string) => void;
  onTogglePin: (bookmark: Bookmark) => void;
  onTagClick?: (tag: string) => void;
}

export const SortableBookmarkCard: React.FC<SortableBookmarkCardProps> = ({
  bookmark,
  layout,
  showClicks,
  showDesc,
  openInNewTab,
  disabled = false,
  onBookmarkClick,
  onEdit,
  onDelete,
  onTogglePin,
  onTagClick,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: bookmark.id,
    disabled,
    data: {
      bookmark,
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="h-full touch-manipulation">
      <BookmarkCard
        bookmark={bookmark}
        layout={layout}
        showClicks={showClicks}
        showDesc={showDesc}
        openInNewTab={openInNewTab}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
        onBookmarkClick={onBookmarkClick}
        onEdit={onEdit}
        onDelete={onDelete}
        onTogglePin={onTogglePin}
        onTagClick={onTagClick}
      />
    </div>
  );
};
