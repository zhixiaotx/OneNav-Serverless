import { Bookmark, Category, OneNavSyncPayload } from '../types';

/**
 * Parses Chrome / Firefox HTML bookmark files (Netscape Bookmark Format)
 */
export function parseHtmlBookmarks(htmlString: string): { categories: Category[]; bookmarks: Bookmark[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  const categories: Category[] = [];
  const bookmarks: Bookmark[] = [];
  const catMap = new Map<string, string>(); // name -> id

  const dls = doc.querySelectorAll('dl');
  if (dls.length === 0) {
    // try finding links directly
    const links = doc.querySelectorAll('a');
    const defaultCatId = 'cat-imported-' + Date.now();
    categories.push({
      id: defaultCatId,
      name: '导入的书签',
      icon: 'Folder',
      order: 1,
    });

    links.forEach((a, index) => {
      const url = a.getAttribute('href');
      const title = a.textContent?.trim() || '未命名书签';
      const icon = a.getAttribute('icon') || undefined;
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        bookmarks.push({
          id: 'bm-import-' + Math.random().toString(36).substring(2, 9),
          categoryId: defaultCatId,
          title,
          url,
          icon,
          order: index + 1,
          clicks: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    });

    return { categories, bookmarks };
  }

  // Traverse headers and links
  let currentCatId = 'cat-imported-default';
  let catOrder = 1;
  let bmOrder = 1;

  // Add default category first
  categories.push({
    id: currentCatId,
    name: '常用收藏',
    icon: 'Folder',
    order: catOrder++,
  });

  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
  let currentNode: Node | null = walker.currentNode;

  while (currentNode) {
    const el = currentNode as HTMLElement;
    const tagName = el.tagName.toLowerCase();

    if (tagName === 'h3') {
      const catName = el.textContent?.trim();
      if (catName) {
        if (!catMap.has(catName)) {
          const newId = 'cat-import-' + Math.random().toString(36).substring(2, 8);
          catMap.set(catName, newId);
          categories.push({
            id: newId,
            name: catName,
            icon: 'Folder',
            order: catOrder++,
          });
          currentCatId = newId;
          bmOrder = 1;
        } else {
          currentCatId = catMap.get(catName)!;
        }
      }
    } else if (tagName === 'a') {
      const url = el.getAttribute('href');
      const title = el.textContent?.trim() || '未命名书签';
      const icon = el.getAttribute('icon') || undefined;

      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        bookmarks.push({
          id: 'bm-import-' + Math.random().toString(36).substring(2, 9),
          categoryId: currentCatId,
          title,
          url,
          icon,
          order: bmOrder++,
          clicks: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    currentNode = walker.nextNode();
  }

  return { categories, bookmarks };
}

/**
 * Generates Chrome / Firefox Netscape standard HTML bookmarks file
 */
export function exportToHtmlBookmarks(categories: Category[], bookmarks: Bookmark[]): string {
  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`;

  categories.forEach((cat) => {
    html += `    <DT><H3>${escapeHtml(cat.name)}</H3>\n    <DL><p>\n`;
    const catBookmarks = bookmarks.filter((bm) => bm.categoryId === cat.id);
    catBookmarks.forEach((bm) => {
      const iconAttr = bm.icon ? ` ICON="${escapeHtml(bm.icon)}"` : '';
      html += `        <DT><A HREF="${escapeHtml(bm.url)}"${iconAttr}>${escapeHtml(bm.title)}</A>\n`;
    });
    html += `    </DL><p>\n`;
  });

  html += `</DL><p>\n`;
  return html;
}

/**
 * Parse OneNav standard JSON format
 */
export function parseOneNavJson(jsonString: string): { categories: Category[]; bookmarks: Bookmark[] } | null {
  try {
    const data = JSON.parse(jsonString);

    // If it is OneNav Serverless payload format
    if (data.categories && data.bookmarks) {
      return {
        categories: data.categories,
        bookmarks: data.bookmarks,
      };
    }

    // If it is original OneNav PHP export format (list of links with category string)
    if (Array.isArray(data)) {
      const catMap = new Map<string, Category>();
      const bookmarks: Bookmark[] = [];
      let catOrder = 1;

      data.forEach((item: any, idx: number) => {
        const catName = item.category_name || item.category || '默认分类';
        if (!catMap.has(catName)) {
          catMap.set(catName, {
            id: 'cat-onenav-' + catOrder,
            name: catName,
            icon: 'Folder',
            order: catOrder++,
          });
        }
        const cat = catMap.get(catName)!;

        bookmarks.push({
          id: 'bm-onenav-' + (item.id || idx + 1),
          categoryId: cat.id,
          title: item.title || item.name || '书签',
          url: item.url || item.link || '',
          description: item.description || item.desc || '',
          icon: item.icon || undefined,
          isPrivate: Boolean(item.private || item.is_private),
          order: idx + 1,
          clicks: Number(item.clicks || 0),
          createdAt: item.add_time ? new Date(item.add_time).getTime() : Date.now(),
          updatedAt: Date.now(),
        });
      });

      return {
        categories: Array.from(catMap.values()),
        bookmarks: bookmarks.filter((b) => Boolean(b.url)),
      };
    }

    return null;
  } catch (e) {
    console.error('Parse OneNav JSON failed:', e);
    return null;
  }
}

/**
 * Export full JSON payload
 */
export function exportOneNavJson(payload: OneNavSyncPayload): string {
  return JSON.stringify(payload, null, 2);
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
