# 🌟 OneNav Serverless - 极简现代化免服务器个人书签导航

[![Deploy to GitHub Pages](https://github.com/peaceiris/actions-gh-pages/actions/workflows/deploy.yml/badge.svg)](https://github.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

> **OneNav Serverless** 是一款专为数字极客、极简主义者与多设备办公族打造的**零成本、免服务器个人书签导航系统**。
> 本项目采用 100% 纯前端静态构建，无需购买云服务器与昂贵的独立数据库，即可一键免费托管于 **GitHub Pages、Cloudflare Pages、Vercel、Netlify** 等全球高速静态网络中。支持通过 **GitHub Gist、Cloudflare KV / D1、WebDAV** 实现多端毫秒级无感云同步，数据完全由您个人掌控！

---

## 📸 核心特性一览

* 🌳 **多级层级树分类导航（Multi-Level Category Tree）：** 侧边分类栏完美支持无限层级的子分类展示，支持自定义深度缩进对齐与 `Chevron` 展开/折叠。父级分类可智能合并统计其下属所有子分类的书签总数，大幅提升导航组织条理。
* 🎨 **晶莹毛玻璃质感 (Glassmorphism)：** 基于现代高斯模糊微光设计风格，完美支持自适应深色/浅色（Dark/Light）模式，与高分辨率背景壁纸自然互融。
* 🔍 **智能多功能搜索栏：**
  * **站内极速搜索**：支持拼音、中文、描述、网址及 `#tag` 标签的实时全文检索（支持快捷键 `/` 或 `Ctrl/Cmd + K` 唤醒）。
  * **站外聚合引擎**：内置百度、谷歌、Bing、GitHub、DeepSeek、Bilibili 等，支持无缝引擎切换、回车即达，并带有百度/谷歌实时搜索联想词下拉推荐。
* 📱 **极致的多端响应式适配：** 专为大屏、折叠屏、平板、各类手机进行视觉与手势重构，菜单及工具栏支持触控大尺寸操作。
* 🌐 **网站 Logo 自动抓取：** 智能分析提取目标站点域名，利用多源高清 Favicon API + 域名自适应嗅探。对于内网或无图标网站，自动触发 CDN 回退策略，最终以 Lucide 精美矢量分类图标兜底，确保页面永不碎图。
* 🖼️ **沉浸式壁纸控制中心：** 支持 Bing 每日壁纸、Unsplash 随机美图、渐变色/纯色背景，支持自定义图床外链及本地壁纸上传。提供可调节的背景毛玻璃虚化度（Blur）及遮罩透明度（Opacity），保障书签卡片文字的高对比度清晰阅读。
* ☁️ **全能云同步备份生态：**
  * **GitHub Gist**：简单稳定，仅需配置个人私有 Token，实现私有化静默自动同步。
  * **Cloudflare KV**：依托 Cloudflare 全球边缘网络，毫秒级快速读取数据。
  * **WebDAV 协议**：支持坚果云（Jianguoyun）、Nextcloud、群晖 NAS 等私有协议备份。
  * **本地安全导入导出**：支持标准 JSON 数据一键下载，完美兼容 Chrome/Edge 浏览器原生 HTML 书签树的双向递归解析导入。
* 🔒 **管理员锁定与凭证加密：** 独创本地临时口令锁机制，支持凭证 AES-256 高级对称加密保存，防止在公共设备上泄露同步 Token 或被旁人误删数据。

---

## 📂 项目结构与所有文件作用详解 (小白必读)

为了让编程初学者也能够轻松理清项目架构、定制个人功能，这里将本项目的所有重要文件和目录作用进行白话梳理：

```text
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions 自动化部署工作流脚本（推送 main 自动打包部署到 gh-pages）
├── public/                     # 静态公共资源目录
│   ├── favicon.ico             # 浏览器标签页小图标
│   └── logo.png                # 应用系统默认品牌 Logo 图片
├── src/                        # 核心源代码目录
│   ├── components/             # UI 视图组件库
│   │   ├── AddEditBookmarkModal.tsx  # 添加/编辑书签弹窗（支持多级分类选择、自定义图标）
│   │   ├── BookmarkCard.tsx    # 网址卡片主组件（已调大 Logo，支持标准/极简/紧凑三种布局样式）
│   │   ├── BookmarkGrid.tsx    # 书签瀑布流网格，实现多级分类级联过滤与聚合显示
│   │   ├── CategoryModal.tsx   # 分类管理面板（支持无限级父子分类关联配置、拖拽排序、防循环嵌套校验）
│   │   ├── DataPreviewInspector.tsx  # 云同步数据差异对比组件（拉取云端时，可视合并/覆盖本地冲突）
│   │   ├── DynamicIcon.tsx     # 动态 Lucide 矢量图标渲染器，支持输入图标字符串直接渲染
│   │   ├── Navbar.tsx          # 顶部毛玻璃导航条（控制视图切换、同步弹窗、管理员解锁、壁纸管理）
│   │   ├── SearchHeader.tsx    # 胶囊智能搜索条（管理搜索引擎、搜索词自动联想推荐）
│   │   ├── Sidebar.tsx         # 左侧分类树（完美适配多级折叠展示，折叠时悬浮提示面包屑路径）
│   │   ├── SidebarStats.tsx    # 侧边栏底部统计卡片组件
│   │   ├── SortableBookmarkCard.tsx  # 基于 @dnd-kit 拖拽框架的拖拽卡片容器包裹
│   │   ├── SyncErrorToast.tsx  # 当云同步网络超时或配置失效时，弹出优雅的提示框与一键诊断
│   │   ├── SyncSettingsModal.tsx  # 多端同步与系统设置控制台（核心后台，包含导入、导出、各同步平台认证）
│   │   ├── UnlockModal.tsx     # 访客与管理员权限解锁口令输入框
│   │   └── WallpaperModal.tsx  # 壁纸遮罩与毛玻璃虚化度滑动调节控制板
│   ├── services/               # 业务逻辑与网络服务层（封装复杂 API 通信）
│   │   ├── bookmarkParser.ts   # 浏览器原生 HTML 书签与 JSON 双向转换引擎（保留树形目录结构）
│   │   ├── cloudflareService.ts# 封装 Cloudflare KV 全球边缘存储读写交互
│   │   ├── faviconService.ts   # 多重线路智能提取 Favicon 网页图标服务（带容灾回退策略）
│   │   ├── searchService.ts    # 维护搜索词输入框，抓取百度/谷歌联想联词建议
│   │   ├── syncService.ts      # 负责与 GitHub Gist、WebDAV 备份的接口请求与数据拉取/上传
│   │   └── wallpaperService.ts # 提取 Bing 每日壁纸与 Unsplash 4K 壁纸图源
│   ├── utils/                  # 通用工具函数
│   │   └── storage.ts          # 处理 LocalStorage 安全读写、凭据的本地 AES 加密解密
│   ├── App.tsx                 # 前端应用唯一的根组件，负责串联所有的全局状态（States）
│   ├── index.css               # 全局样式表，导入 TailwindCSS 及配置平滑过渡、毛玻璃动效
│   ├── main.tsx                # React 框架启动的渲染入口（将 App 挂载至真实 DOM）
│   └── types.ts                # 统一的 TypeScript 类型定义声明（定义 Bookmark、Category、Settings 格式）
├── .env.example                # 环境变量配置文件模板（部署 Cloudflare/Gist 必要参数参考）
├── index.html                  # 页面初始 HTML 主文件（在这里可以修改页面默认的 <title>）
├── metadata.json               # 平台配置文件，用于声明应用能力与特殊硬件权限
├── netlify.toml                # Netlify 平台的重定向与构建全局规则配置文件
├── package.json                # 项目依赖清单与编译、开发脚本指令集
├── tsconfig.json               # TypeScript 类型检查编译参数配置文件
├── vercel.json                 # Vercel 静态单页路由与重定向规则配置文件
└── vite.config.ts              # Vite 构建引擎的核心配置（已配置相对路径构建 base: './'）
```

---

## 🚀 多平台零成本保姆级部署教程

本项目输出的是全静态 HTML/JS 代码。在打包配置中已设置 `base: './'` 相对路径模式，这保证了您即使将其部署到服务器的任何深层子目录、或域名下的二级目录，也绝对不会出现加载 404 的问题。

### 📌 平台一：GitHub Pages 自动化静态托管（最推荐 ⭐⭐⭐⭐⭐）

本项目预装了极简的 GitHub Actions 脚本。只需配置一次权限，往后您只需修改代码推送到 GitHub，几秒内就会全自动构建并发布到您的域名网站。

#### 第一步：准备代码仓库
1. 登录 GitHub，点击右上角 `+` -> **Import repository**，将本项目导入或直接在个人主页点击 **Fork** 按钮。
2. 将代码克隆到您的电脑进行自定义，或直接在 GitHub 网页上进行文件修改。

#### 第二步：配置 GitHub Actions 工作流写权限 (核心踩坑点 ⚠️)
由于 GitHub Pages 默认处于安全锁限制状态，我们需要将其打开以允许自动化打包推送：
1. 打开您的 GitHub 仓库主页。
2. 点击顶部栏中的 ⚙️ **Settings**。
3. 在左侧菜单栏中找到并点击 **Actions** -> **General**。
4. 滚动到页面底部，找到 **Workflow permissions** 部分。
5. 将默认的 *Read repository contents and packages permissions* 改选为 **Read and write permissions**。
6. 点击 **Save**（保存）按钮。

#### 第三步：一键打包推送部署
1. 只要往 `main` 或 `master` 分支推送（git push）或修改任意内容。
2. 系统会自动启动 `.github/workflows/deploy.yml` 构建脚本，自动拉取项目、执行 `npm run build`、并把生成的全套静态文件一键推送到您的仓库的独立 `gh-pages` 分支。
3. 工作流运行成功后，进入仓库的 **Settings** -> **Pages**。
4. 在 **Build and deployment** 下方的 **Branch** 里，确认已被自动设置为 `gh-pages`，目录为 `/ (root)`，点击保存。
5. 等待顶部生成绿色的访问域名（通常是 `https://<您的用户名>.github.io/<仓库名>/`），即可点击访问！

---

### 📌 平台二：Cloudflare Pages 全球 CDN 部署（强烈推荐 ⭐⭐⭐⭐⭐）

Cloudflare 拥有全球顶级的加速 CDN，对静态网站的托管完全免费、不限流量，在国内访问也极为迅速。

1. 注册并登录 [Cloudflare 控制台](https://dash.cloudflare.com/)。
2. 在左侧边栏点击 **Workers & Pages** -> **Create Application**。
3. 选择 **Pages** 选项卡，并点击 **Connect to Git**（连接到 Git，并绑定您的 GitHub 账号）。
4. 选择刚才导入或 Fork 的 `OneNav` 仓库。
5. 在 **Set up builds and deployments** 配置页，按以下内容填写：
   * **Framework preset (框架预设)**：选择 `Vite`（若无则保持默认）
   * **Build command (构建命令)**：`npm run build`
   * **Build output directory (输出目录)**：输入 `dist`
6. 点击 **Save and Deploy**（保存并部署）。
7. Cloudflare 将在 1 分钟内完成全自动构建，并提供一个免费的 `*.pages.dev` 访问域名。您还可以在设置中自由绑定您的个人独有域名，CF 会为您自动申请免费的 HTTPS 证书。

---

### 📌 平台三：Vercel 极速免运维发布（精品之选 ⭐⭐⭐⭐⭐）

Vercel 是前端托管领域的标杆，部署极速、控制台功能强大：

1. 登录 [Vercel 官网](https://vercel.com/)，点击右上角的 **Add New...** -> **Project**。
2. 找到您的 GitHub `OneNav` 仓库，点击 **Import** 按钮。
3. 构建参数保持项目配置原样（无需修改）：
   * **Framework Preset**：`Vite`
   * **Build Command**：`npm run build`
   * **Output Directory**：`dist`
4. 点击下方大蓝按钮 **Deploy**（部署）。
5. 部署完成后，点击控制台的预览卡片，即可跳转到您的专属导航站！

---

### 📌 平台四：Netlify 简易发布（⭐⭐⭐⭐）

1. 登录 [Netlify 官网](https://www.netlify.com/)，选择 **Add new site** -> **Import an existing project**。
2. 选择 **GitHub** 授权并选择项目仓库。
3. 平台会自动读取项目根目录下的 `netlify.toml`，自动填充构建命令 `npm run build` 与输出文件夹 `dist`。
4. 点击 **Deploy**，部署即刻完成！

---

## 🎨 沉浸式壁纸自定义设置完全指南

OneNav 提供了超越常规导航站的沉浸式壁纸管理器。您可以按以下步骤轻松切换、自定义以及调教出最护眼的毛玻璃毛胚：

### 1. 唤醒壁纸设置
点击网页右上角的 **「调色画板 (壁纸)」图标**，页面侧方会平滑拉出美观的壁纸选项抽屉。

### 2. 丰富背景源自由挑选
* 📅 **Bing 每日高清壁纸**：由微软官方 Bing 驱动，每天零点自适应拉取最新世界各地风光，并保存至本地。
* 🌌 **Unsplash 4K 推荐池**：内置“自然风光”、“暗黑极简”、“宇宙星空”、“日系清新”四大高分辨率精选分类，支持点击换一张。
* 🎨 **微光渐变 & 纯色背景**：适合需要极限专注，不想被背景干扰的商务人士，提供多款温润雅致的高阶莫兰迪渐变色调。
* 🔗 **自定义网络图片 URL**：您可以输入任意网络上搜到的壁纸链接（支持微博图床、阿里图床、GitHub 等外链）。
* 📤 **本地壁纸直接上传**：支持将电脑/手机里的美照、摄影图，直接拖入或上传。图片会被自适应压缩转存到浏览器的沙盒中，即使离线也能照常打开。

### 3. 毛玻璃与遮罩微调（极客护眼设置 ⚠️）
在壁纸选项下，拖动两组精密的滑块：
* **背景虚化度 (Blur Slider)**：控制壁纸的高斯模糊半径（`0px` - `30px`）。数值调大，背景会呈现唯美的朦胧感，能隐藏背景噪点，使主体书签卡片极具立体感。
* **遮罩透明度 (Mask Opacity Slider)**：在壁纸和书签卡片之间增加了一层自适应深浅的半透明膜（`0%` - `90%`）。如果您的壁纸偏白或杂乱，建议将此值拉高至 `40%~60%`，能瞬间拉高文字对比度，消除视觉疲劳，确保即使是强白光壁纸也不会晃眼。

---

## ☁️ 多端云同步完全配置保姆级教程

如果您有两台电脑（如公司与家里）、或者希望在手机/平板上访问并修改同一份书签，云同步是不可或缺的灵魂。OneNav 贴心提供了三种不同的低门槛云同步服务，完美兼顾速度、稳定性与私密性：

### 📌 同步方案一：GitHub Gist 备份同步（零门槛，全平台通用 ⭐⭐⭐⭐⭐）

这是最稳定、限制最少、数据隐私度最高的通用方案，100% 依托 GitHub 提供的免费私密存储：

#### 第一步：在 GitHub 申请个人凭证（Token）
1. 登录你的 GitHub 账号，打开 [GitHub 个人 Token 申请直达链接](https://github.com/settings/tokens/new)。
2. 在 **Note** 输入框填入 `onenav-sync-token`（以便日后分辨）。
3. **关键步骤 ⚠️**：在下方的权限复选框中，找到并**勾选第 5 行的 `gist` 项**。
4. 滚动到页面最底端，点击绿色的 **Generate token** 按钮。
5. **极其重要 ⚠️**：生成后会显示一串以 `ghp_` 开头的超长密钥，**请立即复制并妥善保存好**。因为此页面一旦关闭，密钥将永远无法再次查看！

#### 第二步：在 OneNav 配置并完成首次同步
1. 打开您的 OneNav 导航站，点击右上角 ⚙️ **设置（齿轮）图标**。
2. 切换到 **「数据同步」** 控制面板选项卡。
3. 同步服务提供商（Sync Provider）下拉菜单，选择 **GitHub Gist**。
4. 将刚才申请到的 `ghp_...` 密钥粘贴进 **GitHub Personal Access Token** 输入框。
5. 点击下方的 **「初始化并创建全新私有 Gist」** 按钮。
6. 系统会自动和 GitHub 握手，并生成一个完全加密、他人不可见的个人 Gist 容器，生成后会自动在 **Gist ID** 框内回填一串 32 位的字母数字组合。
7. 点击 **「立即上传本地数据至云端」**，进度条提示绿色的成功后，您的书签数据便在云端安全落地！
8. **跨设备同步**：在您的新设备、手机上打开您自己的 OneNav，只需在同步界面里填入相同的 **Token** 和 **Gist ID**，点击 **「立即拉取云端数据并覆盖」** 即可。

---

### 📌 同步方案二：Cloudflare D1 关系数据库同步（边缘关系型 SQLite · 强烈推荐 ⭐⭐⭐⭐⭐）

Cloudflare D1 是构建在 Cloudflare 全球边缘网络上的原生 Serverless 关系型 SQL 数据库，具备极佳的事务一致性、零成本自动备份、极低延迟以及高度的拓展性。

1. **创建 D1 关系数据库**：
   - 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)。
   - 在左侧边栏点击 **Workers & Pages** -> **D1** -> **Create Database**。
   - 输入数据库名称（例如 `onenav_db`），创建成功后，记录并复制该 D1 数据库的 **Database ID (UUID 串)**。
2. **在 Cloudflare 部署中绑定你的 D1 实例**：
   - 前往您的 Pages 部署项目详情。
   - 点击 **Settings** -> **Functions** -> **D1 database bindings** -> 点击 **Add binding**。
   - 变量名（Variable Name）设为 `DB`，并选择刚才创建的 D1 数据库。
3. **申请 CF 写入权限 API 令牌（Token）**：
   - 前往 Cloudflare 个人账户中心 -> **My Profile** -> **API Tokens** -> 点击 **Create Token**。
   - 选用自定义令牌或编辑 Workers 模板，权限必须赋予：**Account -> D1 -> Edit**。保存并复制获得的超长 API 令牌。
4. **导航站配置一键同步**：
   - 打开导航站 -> 设置 -> 数据同步 -> 选项卡选择 **Cloudflare D1**。
   - 填入您的 Cloudflare 账户 ID（Account ID）、D1 数据库 ID 与 API 令牌。
   - 点击 **「一键初始化并测试 D1 数据库表」**，系统会在您的边缘 SQLite 中全自动建表。然后点击 **「推送到 D1 保存」** 完成首次全量同步！

---

### 📌 同步方案三：Cloudflare KV 边缘分布式云同步（极速，适合开发者 ⭐⭐⭐⭐⭐）

如果您希望建立全球范围内的极速键值对同步，可以选择 Cloudflare KV 作为存储介质：

1. **创建 KV 命名空间**：
   - 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)，在左侧点击 **Workers & Pages** -> **KV** -> **Create a namespace**。
   - 命名为 `ONENAV_STORE`，创建并复制该 KV 的 Namespace ID。
2. **在 Cloudflare 部署中进行绑定**：
   - 进入您 Pages 的项目详情页，点击 **Settings** -> **Functions** -> **KV namespace bindings** -> **Add binding**。
   - 变量名称设为 `ONENAV_KV`，并绑定您刚才创建的 `ONENAV_STORE`。
3. **获取 API Token 凭证**：
   - 前往 Cloudflare 个人账户中心 -> **My Profile** -> **API Tokens** -> **Create Token**。
   - 选用 `Edit Cloudflare Workers` 模板（需赋予 Workers/KV 的 Read & Write 写入读取权限），生成并记录生成的 API 密钥。
4. **绑定配置**：
   - 打开导航站 -> 设置 -> 数据同步 -> 选择 **Cloudflare KV**。
   - 填入您的 Cloudflare 账户 ID（Account ID）、Namespace ID 和 API 凭证。点击上传同步。

---

### 📌 同步方案四：GitHub 独立代码仓库文件同步（增量备份文件托管 ⭐⭐⭐⭐⭐）

除了 Gist 之外，OneNav 还支持将数据直接保存为您 GitHub 某个独立代码仓库（Repository）下的一个指定 JSON 文件（例如 `data/onenav.json`），这极度方便配合 CI/CD 或版本历史回溯。

1. **生成 GitHub Token 密钥**：
   - 同样前往 [GitHub Developer Settings Token 申请](https://github.com/settings/tokens/new)。
   - 此次需要勾选 **`repo`** 完整权限，然后生成并保存该 Token 密钥。
2. **在 OneNav 绑定目标仓库**：
   - 进入设置 -> 数据同步 -> 选择 **Git / WebDAV** 面板。
   - 勾选同步源为 **GitHub 仓库**。
   - **Repository Owner**：填入您的 GitHub 账户用户名。
   - **Repository Name**：填入用来存放书签的仓库名称（可以是您部署 OneNav 网页的仓库，也可以新建一个全新的私有仓库）。
   - **Branch**：默认输入 `main` 或 `master`。
   - **File Relative Path**：输入在仓库中存放该 JSON 的相对路径（例如：`data/onenav.json`）。
3. **上传备份**：
   - 点击保存连接并上传，系统会自动在您的 GitHub 指定仓库分支中，提交（Commit）该 JSON 书签文件。每次上传都会自动追加版本记录！

---

### 📌 同步方案五：坚果云 / 自建 WebDAV 协议同步（安全私密 ⭐⭐⭐⭐）

如果您不习惯使用 GitHub，坚果云、Nextcloud 或是群晖 NAS 提供的 WebDAV 服务是极佳的选择。

#### 以国内常用的坚果云（Jianguoyun）为例：
1. 注册并登录坚果云网页版，点击右上角账户 -> **账户信息** -> **安全设置**。
2. 在 **第三方应用管理** 下方，点击 **添加应用**。输入应用名称 `OneNav`，点击生成。
3. 坚果云会为您提供一个独立的“应用密码”和官方服务器 URL：`https://dav.jianguoyun.com/dav/`。
4. 打开 OneNav 设置 -> **数据同步** -> 选择 **WebDAV**：
   * **WebDAV URL (服务器地址)**：输入 `https://dav.jianguoyun.com/dav/`
   * **账号**：填入坚果云的注册邮箱
   * **密码**：填入坚果云刚才独立为您生成的“应用密码”（而不是您的坚果云登录主密码！⚠️）
   * **云端存储相对路径**：默认输入 `/onenav/bookmarks.json`。
5. 点击**「连接测试并保存」**，后续您便可以通过点击“立即上传/下载”实现数据交互。

---

## 💾 配置信息持久化与环境变量配置指南 (小白必看 ⭐⭐⭐⭐⭐)

为了让您在日常使用、刷新页面、甚至清除缓存后**配置信息永远不会丢失**，OneNav 支持**双重配置保存机制**：

### 一、 默认：浏览器本地持久化保存（无需写代码）
* **即时自动保存**：当您在 OneNav 网页的 **「设置 -> 数据同步」** 或 **「通用设置」** 中填写好您的 WebDAV 账号密码、Gist Token 等同步参数时，系统会在您输入的瞬间**自动安全地保存在浏览器的本地存储 (`localStorage`) 中**。
* **刷新/重开不丢失**：即使您随意刷新页面、关闭浏览器标签页、或隔几天再次打开，配置信息都会完美保留，**不需要每次都重新填写**。

---

### 二、 进阶：通过环境变量（.env）一键预设配置（适合极客与云端部署）
如果您希望在项目部署时就内置好同步配置（例如多团队共享、或每次重新部署免手动填表），您可以通过 **环境变量** 来进行配置。

#### 1. 如何在本地配置（保姆级步骤）
1. 在项目根目录下，找到名为 `.env.example` 的文件，将其复制一份并重命名为 **`.env`**（如果没有 `.env` 的话，直接新建一个）。
2. 打开 `.env` 文件，根据您的需要填入对应参数（参考下方完整示例）。

#### 2. `.env` 配置完整示例
```env
# 1. 选择默认的同步服务商 ('webdav' | 'gist' | 'github_repo' | 'custom_api' | 'cloudflare_kv' | 'cloudflare_d1' | 'none')
VITE_SYNC_PROVIDER="webdav"

# 2. 是否开启自动同步 (true / false)
VITE_AUTO_SYNC="true"
VITE_SYNC_INTERVAL_MINUTES="10"

# 3. 方案 A：WebDAV 同步配置（以坚果云为例）
VITE_WEBDAV_URL="https://dav.jianguoyun.com/dav/"
VITE_WEBDAV_USERNAME="your-email@example.com"
VITE_WEBDAV_PASSWORD="your-app-password"
VITE_WEBDAV_PATH="/onenav/bookmarks.json"

# 4. 方案 B：GitHub Gist 同步配置
# VITE_SYNC_PROVIDER="gist"
# VITE_GIST_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"
# VITE_GIST_ID="your_gist_id_here"
# VITE_GIST_FILENAME="onenav-bookmarks.json"

# 5. 方案 C：Cloudflare KV 边缘存储配置
# VITE_SYNC_PROVIDER="cloudflare_kv"
# VITE_CLOUDFLARE_KV_ACCOUNT_ID="your_account_id"
# VITE_CLOUDFLARE_KV_NAMESPACE_ID="your_namespace_id"
# VITE_CLOUDFLARE_KV_API_TOKEN="your_api_token"
```

#### 3. 云端托管平台（如 Vercel / Cloud Run / Netlify）如何配置环境变量？
如果您将本项目托管部署到云端：
1. 登录您所使用的托管平台控制面板（如 Vercel 后台、Cloud Run 环境变量设置）。
2. 找到 **Environment Variables（环境变量）** 设置页面。
3. 逐个添加上述以 `VITE_` 开头的变量名与对应密钥。
4. 重新触发部署（Redeploy）后，您的云端导航站就会自动加载这些配置，实现真正的**免手动配置、开箱即用**！

---

## 🔒 导出数据安全认证与权限拦截机制

为了防止任何人在公共或未锁定设备上通过一键点击「导出 JSON」或「导出 HTML 书签」恶意窃取、拷贝您的私密与敏感网址数据，OneNav 本地内置了严密的**导出安全认证门禁**：

* **🔒 权限拦截**：无论在「书签管理中心」的哪个区域触发数据导出下载，均会无缝弹出「导出数据安全验证」毛玻璃密码框，阻止匿名瞬间下载。
* **🔑 默认管理员凭证**：
  * **管理员账号 (Username)**：`admin`
  * **安全验证密码 (Password)**：`123456`
* **✨ 绝佳体验**：密码验证框支持键盘回车（Enter）一键秒验，支持点击小眼睛图标明文查看输入，极大兼顾了高安全度与客制化交互。

---

---

## 📱 极致的多设备适配与响应式优化

为了让用户在任何环境下都有完美的使用感受，项目针对移动端和桌面宽屏实施了大量数学级别的排版与交互调优：

1. **📐 触摸热区（Touch Targets）舒适化：**
   - 移动端下，所有书签卡片的间距与按钮点击面积均扩增至 **44px 以上**（符合 Apple iOS 人机交互指南）。
   - 编辑与删除按钮在手机触控屏上常态化显示，无需像 PC 端一样依赖悬停（Hover）触发，单手即可完成高频操作。
2. **📱 侧边栏自动收缩与手势：**
   - 屏幕宽度低于 `768px` 时，左侧分类树自动折叠，采用滑出式抽屉布局，通过点击顶部毛玻璃标题或滑动操作即可无感唤出。
3. **🔄 自适应网格（Adaptive Grid Math）：**
   - 系统会自动检测屏幕宽度，在 2K 宽屏上自适应渲染为 `6-7 列` Bento 网格，iPad 渲染为 `3-4 列`，大屏手机渲染为 `2 列`，老旧小屏手机则自适应退化为精致的单列列表，告别横向溢出。
4. **🔒 极低延迟与防止布局断层（White-space control）：**
   - 使用 CSS 的 `white-space: nowrap` 与 `text-overflow: ellipsis` 数学计算，保证网站名称和标签无论在多短的移动机型上都绝不断行或溢出到卡片外部，界面永远干净整洁。

---

## 🛠️ 编程与部署避坑实录（踩坑指南 ⚠️）

开发者在维护、二次开发、部署本项目时，可能会遭遇以下常见的“深坑”，请务必提前查阅：

### 1. 坑点：打包后静态资源加载 404（尤其在 GitHub Pages）
* **陷阱表现 🕳️**：在本地开发 `npm run dev` 完美无瑕，推送到 GitHub Pages 后直接一空白页，控制台报错：`GET /assets/index.js 404 Not Found`。
* **避坑钥匙 🔑**：因为很多脚手架默认将打包路径设为绝对路径 `/`，这要求项目必须放在域名的根目录下。而 GitHub Pages 往往自带子路径（如 `username.github.io/my-onenav/`）。
* **已为您解决 ✅**：本项目在 `vite.config.ts` 里严格指定了相对路径构建 `base: './'`，这让所有图片、JS、CSS 的相对引用都能够完美解析到当前目录层级下，无论部署在域名的什么子文件夹都能秒开。

### 2. 坑点：GitHub Pages 自动化构建提示失败或权限拒绝
* **陷阱表现 🕳️**：Actions 运行到最后一步打包推送时，高亮报错 `Permission to ... denied to github-actions[bot]`，工作流中断。
* **避坑钥匙 🔑**：自 2023 年起，GitHub 新仓库的 Actions 默认写权限是被锁死的（只读）。必须手动按照上文【多平台零成本部署教程】里的说明，到 `Settings -> Actions -> General -> Workflow permissions` 下将只读改为 **Read and write permissions** 才能正常打包。

### 3. 坑点：本地调试时出现 WebSocket Connection 连接失败报错
* **陷阱表现 🕳️**：在一些类似 AI Studio 预览环境、容器、或是沙盒沙箱 iFrame 中开发时，控制台狂刷 `failed to connect to websocket`。
* **避坑钥匙 🔑**：因为这类集成开发沙箱对端口转发有限制（仅映射 3000 主端口），而 Vite 默认的 HMR 机制会去尝试直连一个高位调试 Websocket 端口，导致阻断报错。这纯属开发环境阻断，不带有任何程序 BUG，一经打包上线即可瞬间消失，无需专门去修改 Vite 配置，忽略即可。

### 4. 坑点：WebDAV 在公网上跨域（CORS）与混合内容拒绝加载
* **陷阱表现 🕳️**：在 Chrome 里使用 WebDAV 备份，填入服务器地址后测试连接报错 `Blocked a frame with origin...`。
* **避坑钥匙 🔑**：
  * **混合内容拦截**：若你的 OneNav 书签导航网使用的是 HTTPS（安全连接），但你的私有群晖 NAS WebDAV 服务器是 HTTP 连接，浏览器为防止中间人截获，会坚决拦截该请求（Mixed Content 限制）。**解决方案：强烈建议给 WebDAV 服务端配上 HTTPS 证书**。
  * **CORS 跨域阻断**：部分自建 Nextcloud 没有对您的导航站域名放行 OPTIONS 跨域预检。**解决方案：坚果云官方 WebDAV 服务原生自带 CORS 全域放行支持，这也是推荐小白使用坚果云的原因。**

### 5. 坑点：LocalStorage 本地同步时数据太大被清空
* **陷阱表现 🕳️**：书签加到了几千个，突然页面打不开、或报错写入异常。
* **避坑钥匙 🔑**：浏览器自带的本地 `localStorage` 写入上限一般是固定的 `5MB`，如果保存的壁纸大图直接转为 Base64 写进里面，很容易挤爆。
* **已为您解决 ✅**：本项目的壁纸模块采用了沙箱级优化与 URL 外链模式，仅在上传本地图片时进行深度轻量化压缩。为了安全与长效存放，强烈建议书签一旦变多，随时随手开启 GitHub Gist 自动云备份！

---

## ☁️ Cloudflare KV / D1 边缘存储与后端接口配置指南（保姆级教程 ⭐⭐⭐⭐⭐）

如果您希望使用 **Cloudflare KV** 或 **Cloudflare D1** 作为云端书签同步数据库，由于 Cloudflare 官方 REST API 限制了浏览器跨域请求（在网页直接连会报错 `Failed to fetch`），**本项目已完美内置了 Cloudflare Pages Serverless 后端接口**。

通过该后端接口，所有对 KV 或 D1 的读写请求都会通过 Cloudflare 服务器端转发，**彻底绕过浏览器的跨域拦截**！

---

### 一、 项目中已内置的后端接口代码 (`/functions/api/sync.ts`)

在本项目源码中，后端接口已经为您写好并放置于 `/functions/api/sync.ts`，代码如下（无需您手动修改）：

```ts
// /functions/api/sync.ts (内置的 Cloudflare Pages Function)
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  try {
    // 1. 优先从 D1 关系型数据库读取
    if (env.DB) {
      const result = await env.DB.prepare(
        "SELECT data, updated_at FROM onenav_sync WHERE id = 'main_data' LIMIT 1"
      ).first<{ data: string; updated_at: number }>();
      if (result?.data) {
        return new Response(result.data, { headers: { 'Content-Type': 'application/json' } });
      }
    }
    // 2. 其次从 KV 存储读取
    if (env.ONENAV_KV) {
      const value = await env.ONENAV_KV.get('onenav_bookmarks');
      if (value) {
        return new Response(value, { headers: { 'Content-Type': 'application/json' } });
      }
    }
    return new Response(JSON.stringify({ error: 'No data stored yet' }), { status: 404 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  try {
    const rawData = await request.text();
    JSON.parse(rawData); // 校验 JSON 格式

    // 1. 写入 D1
    if (env.DB) {
      await env.DB.exec(
        "CREATE TABLE IF NOT EXISTS onenav_sync (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER NOT NULL);"
      );
      await env.DB.prepare(
        "INSERT OR REPLACE INTO onenav_sync (id, data, updated_at) VALUES ('main_data', ?, ?);"
      )
        .bind(rawData, Date.now())
        .run();
    }
    // 2. 写入 KV
    if (env.ONENAV_KV) {
      await env.ONENAV_KV.put('onenav_bookmarks', rawData);
    }
    return new Response(JSON.stringify({ success: true, message: 'Saved to Cloudflare storage' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
```

---

### 二、 如何在 Cloudflare Pages 中配置生效（保姆级零基础操作步骤）

如果您希望将 OneNav 部署到 Cloudflare Pages 并完美启用 KV / D1 同步，请按以下步骤操作：

#### 步骤 1：准备 Cloudflare 存储资源
1. 登录 [Cloudflare Dashboard 控制面板](https://dash.cloudflare.com/)。
2. **如果您使用 KV**：
   - 在左侧菜单点击 **Workers & Pages** -> **KV**。
   - 点击 **Create namespace**，命名空间名称输入 `ONENAV_KV`，点击创建。
3. **如果您使用 D1**：
   - 点击 **Workers & Pages** -> **D1 SQL Database**。
   - 点击 **Create database**，数据库名称输入 `onenav-db`，点击创建。

#### 步骤 2：在 Cloudflare Pages 中绑定存储
1. 进入您的 Cloudflare Pages 项目控制面板。
2. 点击顶部标签页的 **Settings（设置）** -> **Functions（函数）**。
3. 向下滚动找到 **KV namespace bindings** 区域：
   - 点击 **Add binding**：
     - **Variable name (变量名)**：填写 `ONENAV_KV`（**支持自定义变量名**，如 `MY_KV`、`BOOKMARK_KV` 等）
     - **KV namespace**：下拉选择您刚刚创建的 KV 命名空间。
4. 如果您使用的是 D1 数据库，在 **D1 database bindings** 区域：
   - 点击 **Add binding**：
     - **Variable name (变量名)**：填写 `DB`（**支持任意自定义变量名**，系统会自动智能识别匹配，如 `MY_DB`、`BOOKMARK_DB` 等）
     - **D1 database**：下拉选择您的 D1 数据库。
5. 点击页面下方的 **Save（保存）**。

#### 步骤 3：重新部署
1. 进入 Pages 项目的 **Deployments** 页面。
2. 点击最新一次部署右侧的 `...` 菜单，选择 **Redeploy（重新部署）**。
3. 等待约 30 秒部署完成后，您的 OneNav 就可以直接无缝通过内置的 `/api/sync` 边缘接口与 Cloudflare 存储高速、安全、跨域无阻地同步了！

> 💡 **重要排错提示（关于 `KV / D1 读取异常: Failed to fetch` 跨域报错）**：
> 无论是 **Cloudflare KV** 还是 **Cloudflare D1**，如果您在网页端设置中直接填入了 Account ID、API 令牌、Database ID 等敏感凭证，浏览器会尝试直接请求 Cloudflare 官方 API，从而遭到严格的 **CORS 跨域安全拦截**，提示 `Failed to fetch`。
> **正确做法**：当项目成功部署到 Cloudflare Pages 并通过后台绑定好 `ONENAV_KV` 或 `DB` 后，在网页端的前端设置面板中**完全无需填写 Account ID、Token 或 Database ID 等凭证**！系统会自动优先通过内置的 `/api/sync` 边缘接口在服务器端与 KV / D1 进行安全通信，完美解决跨域问题！

> 💡 **本地开发与 AI Studio 预览环境的专属福利（内置代理）**：
> 如果您是在本地运行 `npm run dev`，或在 AI Studio 中直接预览测试（尚未部署到 Cloudflare Pages），此时没有后端的 `/api/sync` 接口，怎么办？
> 别担心！本项目在开发环境的 `vite.config.ts` 中已经为您内置了 `/api/cloudflare` 本地跨域反向代理。
> **测试技巧**：在本地预览时，您可以毫无顾忌地在设置面板中填入 Account ID、API 令牌和 Database ID 等凭证，前端会智能地将请求发给本地代理服务器，从而**完全绕过浏览器的跨域拦截**，让您在本地就能完美顺畅地调试云端 KV 和 D1 数据库！但在最终上线部署到 Cloudflare Pages 时，请记得清空这些凭证，使用更安全的后台变量绑定方案。


---

## 📄 开源许可证

本项目基于 **[MIT License](https://opensource.org/licenses/MIT)** 协议开源，这意味着您可以完全自由地 Fork 源码、根据个人喜好进行各种客制化改动、部署私用、甚至将其分发，无任何拘束。如果您喜欢这个作品，欢迎在 GitHub 上为它点亮一颗 **🌟 Star**！
