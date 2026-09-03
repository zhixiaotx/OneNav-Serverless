import React from 'react';
import * as LucideIcons from 'lucide-react';

interface DynamicIconProps {
  name?: string;
  className?: string;
  fallback?: string;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({
  name,
  className = 'w-4 h-4',
  fallback = 'Folder',
}) => {
  if (!name) {
    const FallbackIcon = (LucideIcons as any)[fallback] || LucideIcons.Folder;
    return <FallbackIcon className={className} />;
  }

  // Handle raw SVG string
  if (name.trim().startsWith('<svg')) {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 ${className}`}
        dangerouslySetInnerHTML={{ __html: name }}
      />
    );
  }

  // Handle emoji or single non-alphabet string
  if (name.length <= 4 && !/^[a-zA-Z0-9]+$/.test(name)) {
    return (
      <span className={`inline-flex items-center justify-center shrink-0 ${className}`}>
        {name}
      </span>
    );
  }

  // Check if direct icon exists
  const IconComponent = (LucideIcons as any)[name];
  if (IconComponent) {
    return <IconComponent className={className} />;
  }

  // Common aliases
  const aliasMap: Record<string, string> = {
    folder: 'Folder',
    code: 'Code',
    cloud: 'Cloud',
    cpu: 'Cpu',
    wrench: 'Wrench',
    tool: 'Wrench',
    tools: 'Wrench',
    palette: 'Palette',
    design: 'Palette',
    doc: 'BookMarked',
    docs: 'BookMarked',
    book: 'BookOpen',
    search: 'Search',
    globe: 'Globe',
    github: 'Github',
    star: 'Star',
    link: 'Link',
    zap: 'Zap',
    server: 'Server',
    database: 'Database',
    terminal: 'Terminal',
    heart: 'Heart',
    bookmark: 'Bookmark',
  };

  const resolved = aliasMap[name.toLowerCase()] || fallback;
  const ResolvedIcon = (LucideIcons as any)[resolved] || LucideIcons.Folder;

  return <ResolvedIcon className={className} />;
};
