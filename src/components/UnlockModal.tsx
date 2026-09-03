import React, { useState } from 'react';
import { AppSettings } from '../types';
import { hashPassword, setPrivateUnlockedSession } from '../utils/storage';
import { Lock, Unlock, KeyRound, X, Check, AlertCircle } from 'lucide-react';

interface UnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onUnlockedSuccess: () => void;
}

export const UnlockModal: React.FC<UnlockModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onUnlockedSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSettingNew, setIsSettingNew] = useState(false);

  if (!isOpen) return null;

  const hasPassword = Boolean(settings.masterPasswordHash);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError('请输入密码');
      return;
    }

    const hashed = await hashPassword(password);
    if (hashed === settings.masterPasswordHash) {
      setPrivateUnlockedSession(true);
      onUnlockedSuccess();
      onClose();
      setPassword('');
    } else {
      setError('密码不正确，请重试');
    }
  };

  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError('请输入密码');
      return;
    }
    if (password.length < 4) {
      setError('密码长度至少为 4 位');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    const hashed = await hashPassword(password);
    onUpdateSettings({ masterPasswordHash: hashed });
    setPrivateUnlockedSession(true);
    onUnlockedSuccess();
    onClose();
    setPassword('');
    setConfirmPassword('');
    setIsSettingNew(false);
  };

  const handleRemovePassword = () => {
    if (window.confirm('确定要清除密码锁吗？清除后所有私密书签将公开显示。')) {
      onUpdateSettings({ masterPasswordHash: null });
      setPrivateUnlockedSession(false);
      onClose();
    }
  };

  return (
    <div
      id="modal-unlock-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="modal-unlock-content"
        className="w-full max-w-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/60 dark:border-white/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {hasPassword && !isSettingNew ? '解锁私密书签' : '设置访问密码锁'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {hasPassword && !isSettingNew ? (
          <form onSubmit={handleUnlock} className="p-6 space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              输入您设置的主密码以在当前浏览器会话中查看并访问受保护的私密书签。
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                主密码
              </label>
              <input
                id="input-unlock-password"
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码..."
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleRemovePassword}
                className="text-xs text-slate-400 hover:text-red-600"
              >
                清除密码
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
                >
                  解锁
                </button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCreatePassword} className="p-6 space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              设置主密码后，所有被标记为「私密」的书签将默认隐藏，只有输入密码后才会在前台展示。
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                设置新密码 *
              </label>
              <input
                id="input-new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 4 位字符"
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                确认新密码 *
              </label>
              <input
                id="input-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入密码"
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
              >
                确认启用密码锁
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
