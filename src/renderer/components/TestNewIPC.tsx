/**
 * IPC 系统测试组件
 *
 * 用于验证新旧 IPC 系统都正常工作
 * 只在开发环境显示
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

      const resultText = `✅ 新 API 成功！

时间: ${duration}ms
返回数据: ${JSON.stringify(settings, null, 2)}`;

      setResult(resultText);
      logger.info('New API test successful', { settings, duration });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setResult(`❌ 新 API 失败: ${errorMessage}`);
      logger.error('New API test failed', error as Error);
    } finally {
      setLoading(false);
    }
  };

  const testOldAPI = async () => {
    setLoading(true);
    logger.info('Testing old Settings API...');

    try {
      const startTime = Date.now();

      // 测试旧 API
      const settings = await window.electron.settingBridge.getSetting();

      const duration = Date.now() - startTime;

      const resultText = `✅ 旧 API 成功！

时间: ${duration}ms
返回数据: ${JSON.stringify(settings, null, 2)}`;

      setResult(resultText);
      logger.info('Old API test successful', { settings, duration });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setResult(`❌ 旧 API 失败: ${errorMessage}`);
      logger.error('Old API test failed', error as Error);
    } finally {
      setLoading(false);
    }
  };

  const testBothAPIs = async () => {
    setLoading(true);
    logger.info('Testing both APIs...');

    try {
      const startTime = Date.now();

      // 并行测试两个 API
      const [newResult, oldResult] = await Promise.all([
        ipcApi.settingsV2.get({ settingName: undefined }),
        window.electron.settingBridge.getSetting(),
      ]);

      const duration = Date.now() - startTime;

      const resultText = `✅ 两个 API 都成功！

总时间: ${duration}ms

新 API 结果:
${JSON.stringify(newResult, null, 2)}

旧 API 结果:
${JSON.stringify(oldResult, null, 2)}

✅ 数据一致性: ${JSON.stringify(newResult) === JSON.stringify(oldResult) ? '通过' : '⚠️ 不一致'}`;

      setResult(resultText);
      logger.info('Both APIs test successful', {
        newResult,
        oldResult,
        duration,
        consistent: JSON.stringify(newResult) === JSON.stringify(oldResult),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setResult(`❌ 测试失败: ${errorMessage}`);
      logger.error('Both APIs test failed', error as Error);
    } finally {
      setLoading(false);
    }
  };

  const testLogger = () => {
    logger.debug('This is a DEBUG message', { testData: 'debug' });
    logger.info('This is an INFO message', { testData: 'info' });
    logger.warn('This is a WARN message', { testData: 'warn' });
    logger.error('This is an ERROR message', new Error('Test error'), { testData: 'error' });

    setResult(`✅ Logger 测试完成！

请查看：
1. 浏览器控制台（应该看到彩色日志）
2. Main Process 控制台（应该看到所有日志）
3. 日志文件（在 userData/logs/ 目录）

在控制台输入以下命令查看日志文件位置：
window.electron.ipcRenderer.invoke('settings-v2/get', {}).then(() => console.log('Check logs!'))
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
        🧪 IPC 系统测试面板
      </h2>

      <div style={{ marginBottom: '20px', fontSize: '14px', color: '#666' }}>
        <p><strong>说明：</strong>这个测试面板用于验证新旧 IPC 系统都正常工作。</p>
        <ul>
          <li>✅ 新 API：使用类型安全的 <code>ipcApi.settingsV2.get()</code></li>
          <li>✅ 旧 API：使用原有的 <code>settingBridge.getSetting()</code></li>
          <li>🔍 两个系统应该返回相同的数据</li>
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
          {loading ? '测试中...' : '测试新 API'}
        </button>

        <button
          onClick={testOldAPI}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#ff9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          {loading ? '测试中...' : '测试旧 API'}
        </button>

        <button
          onClick={testBothAPIs}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          {loading ? '测试中...' : '测试两个 API'}
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
          测试 Logger
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
        {result || '👆 点击按钮开始测试...'}
      </div>

      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
        <strong>💡 提示：</strong>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>打开浏览器开发者工具 (F12) 查看详细日志</li>
          <li>查看 Main Process 控制台查看服务端日志</li>
          <li>日志文件位置会在 Main Process 控制台显示</li>
        </ul>
      </div>
    </div>
  );
}
