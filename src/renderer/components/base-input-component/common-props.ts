// src/renderer/components/CommonProps.ts
export interface CommonProps {
  label?: string;
  validationFn?: (value: string) => string | null; // 返回 null 表示沒有錯誤
}
