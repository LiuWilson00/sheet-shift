type GroupedResult<T> = Map<string, T[]>;

export function jsonGroupBy<T, U = T>(
  jsonData: T[],
  keys: (keyof T)[],
  groupHandler: (items: T[]) => U,
): U[] {
  if (keys.length === 0) {
    return [groupHandler(jsonData)];
  }

  const key = keys[0];
  const nextKeys = keys.slice(1);
  const groupedData: GroupedResult<T> = new Map();

  // 分組
  jsonData.forEach((item) => {
    const keyValue = String(item[key]);
    if (!groupedData.has(keyValue)) {
      groupedData.set(keyValue, []);
    }
    groupedData.get(keyValue)!.push(item);
  });

  const resultArray: U[] = [];
  groupedData.forEach((groupItems, groupKey) => {
    resultArray.push(...jsonGroupBy(groupItems, nextKeys, groupHandler));
  });

  return resultArray;
}

type DataType = { [key: string]: any };
export function getDistinctValuesForKey<T>(data: DataType[], key: string): T[] {
  const valueSet = new Set<T>();

  for (const item of data) {
    if (item.hasOwnProperty(key)) {
      valueSet.add(item[key]);
    }
  }

  return [...valueSet];
}
export function findAllIndex<T>(
  array: T[],
  filter: (item: T) => boolean,
): number[] {
  const result: number[] = [];

  for (let i = 0; i < array.length; i++) {
    if (filter(array[i])) {
      result.push(i);
    }
  }

  return result;
}
export function getRandomIntBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}
