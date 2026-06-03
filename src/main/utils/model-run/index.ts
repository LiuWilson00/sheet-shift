import path from 'path';
import { app } from 'electron';
import tokenizer from './tokenizer.json';
import idToCategory from './id_to_category.json';

const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, '../../../../assets');

// 定義BERT特殊標記的ID
const CLS_TOKEN_ID = 101;
const SEP_TOKEN_ID = 102;
const MASK_VALUE = 1;

// 延遲載入 ONNX Runtime，避免 DLL 缺失時 App 無法啟動
let ort: any = null;
let _session: any = null;
let _loadError: Error | null = null;

/**
 * 延遲載入 ONNX Runtime（僅在首次使用時載入）
 *
 * 若用戶系統缺少 VC++ Runtime 或 DirectX 12 元件，
 * DLL 初始化會失敗，此處捕獲錯誤避免影響 App 啟動。
 */
function getOrt() {
  if (_loadError) throw _loadError;
  if (!ort) {
    try {
      // eslint-disable-next-line global-require
      ort = require('onnxruntime-node');
    } catch (error) {
      _loadError = error as Error;
      // eslint-disable-next-line no-console
      console.error(
        '[ModelRun] ONNX Runtime 載入失敗，產品分類功能將無法使用:',
        (error as Error).message,
      );
      throw _loadError;
    }
  }
  return ort;
}

// 定義tokenize函數
async function tokenize(
  text: string,
  tokenMap: Record<string, any>,
): Promise<{ inputIds: number[]; attentionMask: number[] }> {
  const tokens = [
    CLS_TOKEN_ID,
    ...text.split('').map((char) => tokenMap[char] ?? 0),
    SEP_TOKEN_ID,
  ];
  const attentionMask = [
    MASK_VALUE,
    ...text.split('').map(() => MASK_VALUE),
    MASK_VALUE,
  ];

  return {
    inputIds: tokens,
    attentionMask,
  };
}

// 將普通數組轉換為BigInt64Array
function toBigInt64Arr(arr: number[]): BigInt64Array {
  return BigInt64Array.from(arr.map((n) => BigInt(n)));
}

const getSession = async () => {
  if (!_session) {
    const ortModule = getOrt();
    _session = await ortModule.InferenceSession.create(
      `${RESOURCES_PATH}/model.onnx`,
    );
  }

  return _session;
};

// 封裝為 runClassifier 函數
export async function runClassifier(inputText: string): Promise<string> {
  try {
    const ortModule = getOrt();

    // 加載ONNX模型
    const session = await getSession();

    // 準備輸入數據
    const tokenMap = tokenizer.model.vocab;
    const { inputIds, attentionMask } = await tokenize(inputText, tokenMap);

    // 創建輸入tensors
    const tensorInputIds = new ortModule.Tensor(
      'int64',
      toBigInt64Arr(inputIds),
      [1, inputIds.length],
    );
    const tensorAttentionMask = new ortModule.Tensor(
      'int64',
      toBigInt64Arr(attentionMask),
      [1, attentionMask.length],
    );
    const tensorInput3 = new ortModule.Tensor(
      'int64',
      toBigInt64Arr(new Array(inputIds.length).fill(0)),
      [1, inputIds.length],
    );

    // 準備feeds
    const feeds = {
      input_ids: tensorInputIds,
      attention_mask: tensorAttentionMask,
      'input.3': tensorInput3,
    };

    // 運行模型
    const results = await session.run(feeds);

    // 處理輸出
    const logits = results.logits.data as any;
    const predictedClass = logits.indexOf(Math.max(...logits));
    const _idToCategory = idToCategory as Record<string, string>;
    const result = _idToCategory[predictedClass.toString()];
    return result ?? '';
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[ModelRun] 產品分類失敗:', (error as Error).message);
    return '';
  }
}

/** 檢查 ONNX Runtime 是否可用 */
export function isModelAvailable(): boolean {
  if (_loadError) return false;
  try {
    getOrt();
    return true;
  } catch {
    return false;
  }
}
