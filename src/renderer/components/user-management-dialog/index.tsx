import React, { useCallback, useEffect, useState } from 'react';
import './style.css';
import ipcApi from '../../api/ipc-api';
import { useLoading } from '../../contexts/loading.context';
import { useDialog } from '../../contexts/dialog.context';
import {
  EXPORT_PERMISSION_ITEMS,
  ExportPermissionKey,
  UserRecord,
  UserRole,
} from '../../../shared/permission.types';

interface UserManagementDialogProps {
  isVisible: boolean;
  onClose: () => void;
  /** 操作者帳號（用於後端 admin 驗證） */
  operatorAccount: string;
}

/** 編輯中的使用者草稿 */
interface EditingUser {
  name: string;
  account: string;
  password: string;
  role: UserRole;
  /** null = 全部可見 */
  permissions: ExportPermissionKey[] | null;
  /** 是否為新增（決定帳號是否可編輯） */
  isNew: boolean;
}

const createEmptyDraft = (): EditingUser => ({
  name: '',
  account: '',
  password: '',
  role: 'user',
  permissions: null,
  isNew: true,
});

/** 將權限陣列轉為顯示文字 */
const formatPermissions = (
  permissions: ExportPermissionKey[] | null,
): string => {
  if (permissions === null) return '（全部）';
  if (permissions.length === 0) return '（無）';
  return EXPORT_PERMISSION_ITEMS.filter((item) =>
    permissions.includes(item.key),
  )
    .map((item) => item.label)
    .join('、');
};

export const UserManagementDialog: React.FC<UserManagementDialogProps> = ({
  isVisible,
  onClose,
  operatorAccount,
}) => {
  const { showLoading, hideLoading } = useLoading();
  const { showDialog, hideDialog } = useDialog();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [editing, setEditing] = useState<EditingUser | null>(null);

  const loadUsers = useCallback(async () => {
    showLoading();
    try {
      const list = await ipcApi.users.list({ operatorAccount });
      setUsers(list);
    } catch (e) {
      showDialog({ content: '載入使用者失敗', onConfirm: hideDialog });
    } finally {
      hideLoading();
    }
  }, [operatorAccount, showLoading, hideLoading, showDialog, hideDialog]);

  useEffect(() => {
    if (isVisible) {
      setEditing(null);
      loadUsers();
    }
  }, [isVisible, loadUsers]);

  if (!isVisible) return null;

  const startAdd = () => setEditing(createEmptyDraft());

  const startEdit = (u: UserRecord) =>
    setEditing({
      name: u.name,
      account: u.account,
      password: u.password,
      role: u.role,
      permissions: u.permissions,
      isNew: false,
    });

  /** 切換「全部可見」 */
  const toggleAllVisible = (checked: boolean) => {
    if (!editing) return;
    setEditing({ ...editing, permissions: checked ? null : [] });
  };

  /** 切換單一按鈕權限 */
  const togglePermission = (key: ExportPermissionKey, checked: boolean) => {
    if (!editing) return;
    const base = editing.permissions ?? [];
    const next = checked ? [...base, key] : base.filter((k) => k !== key);
    setEditing({ ...editing, permissions: next });
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.account.trim() || !editing.name.trim()) {
      showDialog({ content: '帳號與姓名為必填', onConfirm: hideDialog });
      return;
    }
    showLoading();
    try {
      await ipcApi.users.save({
        operatorAccount,
        user: {
          name: editing.name.trim(),
          account: editing.account.trim(),
          password: editing.password,
          role: editing.role,
          // admin 一律全部可見
          permissions: editing.role === 'admin' ? null : editing.permissions,
        },
      });
      setEditing(null);
      await loadUsers();
    } catch (e) {
      showDialog({ content: '儲存失敗，請稍後再試', onConfirm: hideDialog });
    } finally {
      hideLoading();
    }
  };

  const handleDelete = (account: string) => {
    if (account.toLowerCase() === operatorAccount.toLowerCase()) {
      showDialog({ content: '無法刪除自己的帳號', onConfirm: hideDialog });
      return;
    }
    showDialog({
      content: `確定要刪除帳號「${account}」嗎？`,
      showCancel: true,
      onCancel: hideDialog,
      onConfirm: async () => {
        hideDialog();
        showLoading();
        try {
          await ipcApi.users.delete({ operatorAccount, account });
          await loadUsers();
        } catch (e) {
          showDialog({
            content: '刪除失敗，請稍後再試',
            onConfirm: hideDialog,
          });
        } finally {
          hideLoading();
        }
      },
    });
  };

  const isAllVisible = editing?.permissions === null;

  return (
    <div className="user-mgmt-mask">
      <div className="user-mgmt-dialog">
        <div className="user-mgmt-dialog__header">
          <h2>使用者管理</h2>
          <button
            type="button"
            className="user-mgmt-dialog__close"
            onClick={onClose}
            title="關閉"
          >
            ✕
          </button>
        </div>

        {editing ? (
          /* ===== 編輯 / 新增表單 ===== */
          <div className="user-mgmt-form">
            <label className="user-mgmt-form__row">
              <span>姓名</span>
              <input
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
            </label>
            <label className="user-mgmt-form__row">
              <span>帳號</span>
              <input
                value={editing.account}
                disabled={!editing.isNew}
                onChange={(e) =>
                  setEditing({ ...editing, account: e.target.value })
                }
              />
            </label>
            <label className="user-mgmt-form__row">
              <span>密碼</span>
              <input
                value={editing.password}
                onChange={(e) =>
                  setEditing({ ...editing, password: e.target.value })
                }
              />
            </label>
            <div className="user-mgmt-form__row">
              <span>角色</span>
              <div className="user-mgmt-form__radios">
                <label>
                  <input
                    type="radio"
                    name="role"
                    checked={editing.role === 'user'}
                    onChange={() => setEditing({ ...editing, role: 'user' })}
                  />
                  一般使用者
                </label>
                <label>
                  <input
                    type="radio"
                    name="role"
                    checked={editing.role === 'admin'}
                    onChange={() => setEditing({ ...editing, role: 'admin' })}
                  />
                  管理員
                </label>
              </div>
            </div>

            <div className="user-mgmt-form__perms">
              <span className="user-mgmt-form__perms-label">可見匯出按鈕</span>
              {editing.role === 'admin' ? (
                <p className="user-mgmt-form__hint">管理員一律可見全部按鈕</p>
              ) : (
                <>
                  <label className="user-mgmt-form__perm-item">
                    <input
                      type="checkbox"
                      checked={isAllVisible}
                      onChange={(e) => toggleAllVisible(e.target.checked)}
                    />
                    全部可見
                  </label>
                  <div className="user-mgmt-form__perm-grid">
                    {EXPORT_PERMISSION_ITEMS.map((item) => (
                      <label
                        key={item.key}
                        className="user-mgmt-form__perm-item"
                      >
                        <input
                          type="checkbox"
                          disabled={isAllVisible}
                          checked={
                            !isAllVisible &&
                            (editing.permissions ?? []).includes(item.key)
                          }
                          onChange={(e) =>
                            togglePermission(item.key, e.target.checked)
                          }
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="user-mgmt-form__actions">
              <button type="button" onClick={() => setEditing(null)}>
                取消
              </button>
              <button
                type="button"
                className="user-mgmt-form__save"
                onClick={handleSave}
              >
                儲存
              </button>
            </div>
          </div>
        ) : (
          /* ===== 使用者列表 ===== */
          <>
            <div className="user-mgmt-toolbar">
              <button
                type="button"
                className="user-mgmt-toolbar__add"
                onClick={startAdd}
              >
                ＋ 新增使用者
              </button>
            </div>
            <div className="user-mgmt-table-wrap">
              <table className="user-mgmt-table">
                <thead>
                  <tr>
                    <th>姓名</th>
                    <th>帳號</th>
                    <th>角色</th>
                    <th>可見匯出按鈕</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.account}>
                      <td>{u.name}</td>
                      <td>{u.account}</td>
                      <td>{u.role === 'admin' ? '管理員' : '一般使用者'}</td>
                      <td>
                        {u.role === 'admin'
                          ? '（全部）'
                          : formatPermissions(u.permissions)}
                      </td>
                      <td className="user-mgmt-table__ops">
                        <button
                          type="button"
                          onClick={() => startEdit(u)}
                          title="編輯"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(u.account)}
                          title="刪除"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="user-mgmt-table__empty">
                        尚無使用者
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserManagementDialog;
