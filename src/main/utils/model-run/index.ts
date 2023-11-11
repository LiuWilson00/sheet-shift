const ort = require('onnxruntime-node');
import tokenizer from './tokenizer.json';
import path from 'path';
import idToCategory from './id_to_category.json';

import { app } from 'electron';
const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, '../../../../assets');
// 定義BERT特殊標記的ID
const CLS_TOKEN_ID = 101;
const SEP_TOKEN_ID = 102;
const MASK_VALUE = 1;

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
    attentionMask: attentionMask,
  };
}

// 將普通數組轉換為BigInt64Array
function toBigInt64Arr(arr: number[]): BigInt64Array {
  return BigInt64Array.from(arr.map((n) => BigInt(n)));
}

// 封裝為 runClassifier 函數
export async function runClassifier(inputText: string): Promise<string> {
  // 加載ONNX模型
  const session = await ort.InferenceSession.create(
    `${RESOURCES_PATH}/model.onnx`,
  );

  // 準備輸入數據
  const tokenMap = tokenizer.model.vocab;
  const { inputIds, attentionMask } = await tokenize(inputText, tokenMap);

  // 創建輸入tensors
  const tensorInputIds = new ort.Tensor('int64', toBigInt64Arr(inputIds), [
    1,
    inputIds.length,
  ]);
  const tensorAttentionMask = new ort.Tensor(
    'int64',
    toBigInt64Arr(attentionMask),
    [1, attentionMask.length],
  );
  const tensorInput3 = new ort.Tensor(
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
  const logits = results.logits.data as number[];
  const predictedClass = logits.indexOf(Math.max(...logits));
  const _idToCategory = idToCategory as Record<string, string>;
  const result = _idToCategory[predictedClass.toString()];
  return result ?? '';
}
