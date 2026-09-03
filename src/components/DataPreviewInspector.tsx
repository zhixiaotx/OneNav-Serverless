import React, { useState } from 'react';
import { CloudflareD1Config, OneNavSyncPayload } from '../types';
import { fetchFromCloudflareD1 } from '../services/cloudflareService';
import {
  Code,
  Copy,
  Check,
  RefreshCw,
  Database,
  Layers,
  Bookmark as BookmarkIcon,
  Clock,
  Eye,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  FileJson,
  CheckCircle2,
} from 'lucide-react';

interface DataPreviewInspectorProps {
  d1Config: CloudflareD1Config;
  currentLocalData?: OneNavSyncPayload;
}

export const DataPreviewInspector: React.FC<DataPreviewInspectorProps> = ({
  d1Config,
  currentLocalData,
}) => {
  const [remotePayload, setRemotePayload] = useState<OneNavSyncPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'formatted' | 'tree' | 'raw'>('formatted');
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  const handleFetchPreview = async () => {
    if (!d1Config.accountId || !d1Config.databaseId || !d1Config.apiToken) {
      setError('请先配置完整的 Cloudflare Account ID、D1 Database ID 与 API 令牌');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetchFromCloudflareD1(d1Config);
      setLoading(false);
      if (res.success && res.data) {
        setRemotePayload(res.data);
        setLatencyMs(res.latencyMs || null);
      } else {
        setError(res.message || '获取 D1 数据失败');
        setRemotePayload(null);
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || '网络请求错误');
      setRemotePayload(null);
    }
  };

  const handleCopyJson = () => {
    const dataToCopy = remotePayload || currentLocalData;
    if (!dataToCopy) return;
    navigator.clipboard.writeText(JSON.stringify(dataToCopy, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleCategory = (catId: string) => {
    setExpandedCats((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const activeData = remotePayload || currentLocalData;
  const jsonString = activeData ? JSON.stringify(activeData, null, 2) : '';
  const dataSizeKb = jsonString ? (new Blob([jsonString]).size / 1024).toFixed(2) : '0';

  return (
    <div
      id="cloudflare-d1-data-preview-inspector"
      className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 overflow-hidden text-xs transition-all"
    >
      {/* Inspector Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-100/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Cloudflare D1 原始数据排查与结构预览
              </span>
              {remotePayload ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>已拉取云端 D1 最新结构</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {currentLocalData ? '展示本地待同步结构' : '等待拉取'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              开发者可直接查阅 D1 SQLite 数据库中存储的真实 JSON Payload，排查数据层级与时间戳
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-fetch-d1-preview"
            type="button"
            onClick={handleFetchPreview}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? '正在读取 D1...' : '从 D1 读取并预览'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title={isExpanded ? '折叠预览区域' : '展开预览区域'}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {/* Metadata Bar */}
          {activeData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400">分类总数</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {activeData.categories?.length || 0} 个
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <BookmarkIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400">书签总数</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {activeData.bookmarks?.length || 0} 个
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400">数据时间戳</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {activeData.updatedAt
                      ? new Date(activeData.updatedAt).toLocaleTimeString()
                      : '未知'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <FileJson className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400">Payload 体积 {latencyMs ? `· 延迟` : ''}</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {dataSizeKb} KB {latencyMs ? `(${latencyMs}ms)` : ''}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message if fetch failed */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">读取失败: </span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Control view mode and copy */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500">查看模式:</span>
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setViewMode('formatted')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    viewMode === 'formatted'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  格式化高亮 JSON
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('tree')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    viewMode === 'tree'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  分类树状节点
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('raw')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    viewMode === 'raw'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  压缩紧凑行
                </button>
              </div>
            </div>

            <button
              id="btn-copy-d1-json"
              type="button"
              onClick={handleCopyJson}
              disabled={!activeData}
              className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">已复制 JSON</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>复制原始 JSON</span>
                </>
              )}
            </button>
          </div>

          {/* Render Active View Mode */}
          {activeData ? (
            <div className="relative">
              {viewMode === 'formatted' && (
                <pre className="p-3.5 rounded-xl bg-slate-900 dark:bg-slate-950 text-slate-200 font-mono text-[11px] max-h-72 overflow-y-auto leading-relaxed border border-slate-800 select-text selection:bg-orange-500/30">
                  <code>{jsonString}</code>
                </pre>
              )}

              {viewMode === 'raw' && (
                <textarea
                  readOnly
                  value={JSON.stringify(activeData)}
                  className="w-full p-3 rounded-xl bg-slate-900 dark:bg-slate-950 text-slate-200 font-mono text-[11px] h-32 leading-relaxed border border-slate-800 select-all resize-none focus:outline-none"
                />
              )}

              {viewMode === 'tree' && (
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 max-h-72 overflow-y-auto space-y-2">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2">
                    结构概览 (共 {activeData.categories?.length || 0} 个分类):
                  </div>
                  {activeData.categories?.map((cat) => {
                    const catBookmarks = (activeData.bookmarks || []).filter(
                      (b) => b.categoryId === cat.id
                    );
                    const isOpen = expandedCats[cat.id] ?? false;

                    return (
                      <div
                        key={cat.id}
                        className="border border-slate-200 dark:border-slate-700/60 rounded-lg p-2 bg-slate-50/50 dark:bg-slate-900/40"
                      >
                        <div
                          onClick={() => toggleCategory(cat.id)}
                          className="flex items-center justify-between cursor-pointer hover:text-orange-600 transition-colors"
                        >
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                            {isOpen ? (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <span>{cat.name}</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({cat.id})
                            </span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                            {catBookmarks.length} 个书签
                          </span>
                        </div>

                        {isOpen && (
                          <div className="mt-2 pl-4 border-l-2 border-orange-300 dark:border-orange-800/60 space-y-1.5 text-[11px]">
                            {catBookmarks.length === 0 ? (
                              <div className="text-slate-400 italic">该分类下暂无书签</div>
                            ) : (
                              catBookmarks.map((bm) => (
                                <div
                                  key={bm.id}
                                  className="flex items-center justify-between text-slate-600 dark:text-slate-300 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800/60 px-1 rounded"
                                >
                                  <span className="font-medium truncate max-w-[200px]">
                                    {bm.title}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono truncate max-w-[220px]">
                                    {bm.url}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center rounded-xl bg-slate-100/50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 text-slate-400">
              <FileJson className="w-8 h-8 mx-auto mb-2 opacity-50 text-orange-500" />
              <p className="font-medium text-slate-600 dark:text-slate-300">暂未拉取 D1 远端数据</p>
              <p className="text-[11px] mt-0.5">
                点击上方「从 D1 读取并预览」或「推送到 D1 保存」后即可在此检查原始结构
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
