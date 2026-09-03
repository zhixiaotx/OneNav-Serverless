import { WallpaperConfig, WallpaperPreset } from '../types';

export const DEFAULT_WALLPAPER_CONFIG: WallpaperConfig = {
  type: 'none',
  url: '',
  gradient: '',
  name: '纯净原生',
  blur: 0,
  opacity: 25,
  brightness: 100,
  cardGlassmorphism: true,
  cardOpacity: 90,
  dailyAutoRefresh: false,
};

// Bing Daily Wallpaper Endpoint
export const BING_TODAY_URL = 'https://bing.biturl.top/?resolution=1920&format=image&index=0&mkt=zh-CN';
export const BING_UHD_URL = 'https://bing.biturl.top/?resolution=3840&format=image&index=0&mkt=zh-CN';

// Pre-curated High Quality Presets
export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  // 1. Bing 每日壁纸专题
  {
    id: 'bing-today',
    name: 'Bing 必应今日高清',
    type: 'bing',
    category: 'bing',
    thumbnail: 'https://bing.biturl.top/?resolution=1920&format=image&index=0&mkt=zh-CN',
    url: 'https://bing.biturl.top/?resolution=1920&format=image&index=0&mkt=zh-CN',
    author: 'Microsoft Bing',
  },
  {
    id: 'bing-yesterday',
    name: 'Bing 昨日风景',
    type: 'bing',
    category: 'bing',
    thumbnail: 'https://bing.biturl.top/?resolution=1920&format=image&index=1&mkt=zh-CN',
    url: 'https://bing.biturl.top/?resolution=1920&format=image&index=1&mkt=zh-CN',
    author: 'Microsoft Bing',
  },
  {
    id: 'bing-day-before',
    name: 'Bing 前日精选',
    type: 'bing',
    category: 'bing',
    thumbnail: 'https://bing.biturl.top/?resolution=1920&format=image&index=2&mkt=zh-CN',
    url: 'https://bing.biturl.top/?resolution=1920&format=image&index=2&mkt=zh-CN',
    author: 'Microsoft Bing',
  },

  // 2. 绝美风景与自然
  {
    id: 'scenery-mountain-lake',
    name: '雪山与静谧湖泊',
    type: 'unsplash',
    category: 'scenery',
    thumbnail: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2560&q=90',
    author: 'Bailey Zindel',
  },
  {
    id: 'scenery-aurora-night',
    name: '极光与挪威峡湾',
    type: 'unsplash',
    category: 'scenery',
    thumbnail: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=400&q=80',
    url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=2560&q=90',
    author: 'Vincent Guth',
  },
  {
    id: 'scenery-misty-forest',
    name: '晨曦迷雾幽静森林',
    type: 'unsplash',
    category: 'scenery',
    thumbnail: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=400&q=80',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=2560&q=90',
    author: 'Sebastian Unrau',
  },
  {
    id: 'scenery-fuji-sunset',
    name: '富士山落日余晖',
    type: 'unsplash',
    category: 'scenery',
    thumbnail: 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?auto=format&fit=crop&w=400&q=80',
    url: 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?auto=format&fit=crop&w=2560&q=90',
    author: 'Tirachard Kumsumritprom',
  },

  // 3. 极简与设计空间
  {
    id: 'minimal-zen-dune',
    name: '极简金黄沙漠弧线',
    type: 'unsplash',
    category: 'minimal',
    thumbnail: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=400&q=80',
    url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=2560&q=90',
    author: 'Jeremy Bishop',
  },
  {
    id: 'minimal-concrete-arch',
    name: '光影清水混凝土空间',
    type: 'unsplash',
    category: 'minimal',
    thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2560&q=90',
    author: 'R ARCH',
  },
  {
    id: 'minimal-dark-waves',
    name: '黑金暗流丝滑波纹',
    type: 'unsplash',
    category: 'minimal',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=2560&q=90',
    author: 'Milad Fakurian',
  },

  // 4. 炫酷赛博与都市夜景
  {
    id: 'cyber-tokyo-night',
    name: '霓虹闪烁东京雨夜',
    type: 'unsplash',
    category: 'cyberpunk',
    thumbnail: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=400&q=80',
    url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=2560&q=90',
    author: 'Aleksandar Pasaric',
  },
  {
    id: 'cyber-futuristic-grid',
    name: '深邃赛博光流矩阵',
    type: 'unsplash',
    category: 'cyberpunk',
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=80',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=2560&q=90',
    author: 'Markus Spiske',
  },

  // 5. 动漫与艺术插画
  {
    id: 'anime-shrine-clouds',
    name: '青空与鸟居云海',
    type: 'unsplash',
    category: 'anime',
    thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=400&q=80',
    url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=2560&q=90',
    author: 'Manuel Cosentino',
  },
  {
    id: 'anime-starry-night',
    name: '仰望星辰与深空银河',
    type: 'unsplash',
    category: 'anime',
    thumbnail: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=400&q=80',
    url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=2560&q=90',
    author: 'Benjamin Davies',
  },

  // 6. Mesh Gradient 现代精美渐变
  {
    id: 'grad-aurora',
    name: '极光绮丽 (Aurora Glow)',
    type: 'gradient',
    category: 'gradient',
    thumbnail: '',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #064e3b 40%, #0284c7 70%, #6366f1 100%)',
  },
  {
    id: 'grad-sunset',
    name: '暮光微醺 (Sunset Radiance)',
    type: 'gradient',
    category: 'gradient',
    thumbnail: '',
    gradient: 'linear-gradient(135deg, #1e1b4b 0%, #831843 35%, #ea580c 70%, #facc15 100%)',
  },
  {
    id: 'grad-ocean',
    name: '深蓝秘境 (Deep Ocean)',
    type: 'gradient',
    category: 'gradient',
    thumbnail: '',
    gradient: 'linear-gradient(135deg, #020617 0%, #0f172a 30%, #1e3a8a 65%, #06b6d4 100%)',
  },
  {
    id: 'grad-cyber',
    name: '赛博霓虹 (Cyber Neon)',
    type: 'gradient',
    category: 'gradient',
    thumbnail: '',
    gradient: 'linear-gradient(135deg, #18181b 0%, #4c1d95 40%, #db2777 75%, #06b6d4 100%)',
  },
  {
    id: 'grad-emerald',
    name: '青提森林 (Emerald Frost)',
    type: 'gradient',
    category: 'gradient',
    thumbnail: '',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #047857 40%, #10b981 70%, #34d399 100%)',
  },
  {
    id: 'grad-lavender',
    name: '薰衣草梦境 (Lavender Dream)',
    type: 'gradient',
    category: 'gradient',
    thumbnail: '',
    gradient: 'linear-gradient(135deg, #312e81 0%, #6d28d9 45%, #c084fc 80%, #fbcfe8 100%)',
  },
  {
    id: 'grad-dark-slate',
    name: '极简黑曜石 (Obsidian Slate)',
    type: 'gradient',
    category: 'gradient',
    thumbnail: '',
    gradient: 'linear-gradient(135deg, #090d16 0%, #1e293b 50%, #0f172a 100%)',
  },
];

// Fetch random online high resolution wallpapers
export function getRandomWallpaperUrl(): string {
  const sources = [
    'https://bing.biturl.top/?resolution=1920&format=image&index=random&mkt=zh-CN',
    'https://api.kdcc.cn/img/rand.php',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2560&q=90',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=2560&q=90',
    'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=2560&q=90',
    'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?auto=format&fit=crop&w=2560&q=90',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=2560&q=90',
  ];
  const idx = Math.floor(Math.random() * sources.length);
  return sources[idx];
}

// Compress and convert image File to Base64 data URL
export function convertFileToBase64(file: File, maxWidth = 1920, maxHeight = 1080): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Use webp or jpeg for compact base64 size
        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        resolve(compressed);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
