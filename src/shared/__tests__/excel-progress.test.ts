import {
  classifyProgressMessage,
  shouldLogClassifyProgress,
} from '../excel-progress';

describe('classifyProgressMessage', () => {
  it('組出帶 current/total 的中文進度字串', () => {
    expect(classifyProgressMessage(35, 120)).toBe('智能辨識中 35/120 筆…');
  });
});

describe('shouldLogClassifyProgress', () => {
  it('第一筆要記', () => {
    expect(shouldLogClassifyProgress(1, 100)).toBe(true);
  });

  it('最後一筆要記', () => {
    expect(shouldLogClassifyProgress(100, 100)).toBe(true);
  });

  it('每 interval 筆記一次（預設 25）', () => {
    expect(shouldLogClassifyProgress(25, 100)).toBe(true);
    expect(shouldLogClassifyProgress(50, 100)).toBe(true);
  });

  it('其餘不記', () => {
    expect(shouldLogClassifyProgress(2, 100)).toBe(false);
    expect(shouldLogClassifyProgress(26, 100)).toBe(false);
  });

  it('可自訂 interval', () => {
    expect(shouldLogClassifyProgress(10, 100, 10)).toBe(true);
    expect(shouldLogClassifyProgress(5, 100, 10)).toBe(false);
  });
});
