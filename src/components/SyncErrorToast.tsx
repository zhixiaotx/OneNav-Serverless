import React from 'react';
import { SyncConfig, SyncProvider } from '../types';
import { AlertTriangle, RefreshCw, Settings, X, Database, Zap, Github, Server, CloudOff } from 'lucide-react';

interface SyncErrorToastProps {
  syncConfig: SyncConfig;
  onDismiss: () => void;
  onRetry: () => void;
  onOpenSettings: (provider?: SyncProvider) => void;
}

export const SyncErrorToast: React.FC<SyncErrorToastProps> = ({
  syncConfig,
  onDismiss,
  onRetry,
  onOpenSettings,
}) => {
  // Only show when there is an active error and provider is configured
  if (syncConfig.lastSyncStatus !== 'error' || !syncConfig.lastSyncError) {
    return null;
  }

  const getProviderInfo = (provider: SyncProvider) => {
    switch (provider) {
      case 'cloudflare_d1':
        return {
          name: 'Cloudflare D1',
          icon: <Database className="w-4 h-4 text-orange-500 shrink-0" />,
          color: 'border-orange-500/40 bg-orange-950/20 text-orange-300',
          badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        };
      case 'cloudflare_kv':
        return {
          name: 'Cloudflare KV',
          icon: <Zap className="w-4 h-4 text-amber-500 shrink-0" />,
          color: 'border-amber-500/40 bg-amber-950/20 text-amber-300',
          badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        };
      case 'gist':
        return {
          name: 'GitHub Gist',
          icon: <Github className="w-4 h-4 text-blue-400 shrink-0" />,
          color: 'border-blue-500/40 bg-blue-950/20 text-blue-300',
          badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        };
      case 'github_repo':
      case 'webdav':
        return {
          name: provider === 'webdav' ? 'WebDAV' : 'GitHub Repo',
          icon: <Server className="w-4 h-4 text-purple-400 shrink-0" />,
          color: 'border-purple-500/40 bg-purple-950/20 text-purple-300',
          badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        };
      default:
        return {
          name: '云同步',
          icon: <CloudOff className="w-4 h-4 text-red-400 shrink-0" />,
          color: 'border-red-500/40 bg-red-950/20 text-red-300',
          badge: 'bg-red-500/20 text-red-400 border-red-500/30',
        };
    }
  };

  const providerInfo = getProviderInfo(syncConfig.provider);

  return (
    <div
      id="sync-error-toast"
      role="alert"
      className="fixed bottom-6 right-4 sm:right-6 z-50 max-w-md w-[calc(100vw-2rem)] sm:w-auto animate-in slide-in-from-bottom-5 fade-in duration-200"
    >
      <div className="bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-100 rounded-2xl p-4 shadow-2xl border border-red-500/40 dark:border-red-500/30 flex flex-col gap-3 ring-1 ring-red-500/20">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-red-400">同步发生异常</span>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${providerInfo.badge}`}
                >
                  {providerInfo.icon}
                  <span>{providerInfo.name}</span>
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                {syncConfig.lastSyncTime
                  ? `最近同步尝试: ${new Date(syncConfig.lastSyncTime).toLocaleTimeString()}`
                  : '未完成同步'}
              </span>
            </div>
          </div>

          <button
            id="btn-dismiss-sync-error"
            onClick={onDismiss}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="关闭提示"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error message detail */}
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300 font-mono break-all max-h-24 overflow-y-auto leading-relaxed">
          {syncConfig.lastSyncError}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            id="btn-retry-sync"
            onClick={onRetry}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5 border border-slate-700 hover:border-slate-600"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>立即重试</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              id="btn-open-sync-config"
              onClick={() => onOpenSettings(syncConfig.provider)}
              className="px-3 py-1.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>排查凭证与设置</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
