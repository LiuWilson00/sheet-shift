/**
 * IPC 系统测试组件
 *
 * 用于验证新 IPC 系统正常工作
 * 只在开发环境显示
 *
 * 注意：舊 API 已被移除，此組件現在只測試新 API
 */

import { useState } from 'react';
import ipcApi from '../api/ipc-api';
import { logger } from '../utils/logger.tool';

export function TestNewIPC() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const testNewAPI = async () => {
    setLoading(true);
    logger.info('Testing new Settings V2 API...');

    try {
      const startTime = Date.now();

      // 测试新 API
      const settings = await ipcApi.settingsV2.get({ settingName: undefined });

      const duration = Date.now() - startTime;

      const resultText = `✅ API 測試成功！

時間: ${duration}ms
返回數據: ${JSON.stringify(settings, null, 2)}`;

      setResult(resultText);
      logger.info('New API test successful', { settings, duration });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setResult(`❌ API 測試失敗: ${errorMessage}`);
      logger.error('New API test failed', error as Error);
    } finally {
      setLoading(false);
    }
  };

  const testLogger = () => {
    logger.debug('This is a DEBUG message', { testData: 'debug' });
    logger.info('This is an INFO message', { testData: 'info' });
    logger.warn('This is a WARN message', { testData: 'warn' });
    logger.error('This is an ERROR message', new Error('Test error'), { testData: 'error' });

    setResult(`✅ Logger 測試完成！

請查看：
1. 瀏覽器控制台（應該看到彩色日誌）
2. Main Process 控制台（應該看到所有日誌）
3. 日誌文件（在 userData/logs/ 目錄）
    `);
  };

  return (
    <div
      style={{
        padding: '20px',
        border: '3px solid #4caf50',
        borderRadius: '8px',
        margin: '20px',
        backgroundColor: '#f9f9f9',
      }}
    >
      <h2 style={{ color: '#4caf50', marginTop: 0 }}>
        IPC 系統測試面板
      </h2>

      <div style={{ marginBottom: '20px', fontSize: '14px', color: '#666' }}>
        <p><strong>說明：</strong>此測試面板用於驗證新 IPC 系統正常工作。</p>
        <ul>
          <li>使用類型安全的 <code>ipcApi.settingsV2.get()</code></li>
        </ul>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={testNewAPI}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          {loading ? '測試中...' : '測試 API'}
        </button>

        <button
          onClick={testLogger}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#9c27b0',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          測試 Logger
        </button>
      </div>

      <div
        style={{
          backgroundColor: '#fff',
          padding: '15px',
          borderRadius: '4px',
          border: '1px solid #ddd',
          minHeight: '200px',
          fontFamily: 'monospace',
          fontSize: '12px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {result || '點擊按鈕開始測試...'}
      </div>

      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
        <strong>提示：</strong>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>打開瀏覽器開發者工具 (F12) 查看詳細日誌</li>
          <li>查看 Main Process 控制台查看服務端日誌</li>
          <li>日誌文件位置會在 Main Process 控制台顯示</li>
        </ul>
      </div>
    </div>
  );
}
