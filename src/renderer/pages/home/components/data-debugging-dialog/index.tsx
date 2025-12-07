import { FC, useCallback, useEffect, useState } from 'react';
import Dialog from '../../../../components/dialog';
import {
  ExcelColumnKeys,
  ProductNameMapping,
  ProductNameMappingColumnKeys,
  ProductTariffCodeMap,
  SheetData,
} from '../../../../utils/excel.interface';
import Input from '../../../../components/input';
import './style.css';
import { useDialog } from '../../../../contexts/dialog.context';
import { useLoading } from '../../../../contexts/loading.context';
import ipcApi from '../../../../api/ipc-api';
import { logger } from '../../../../utils/logger.tool';

// 建立 DataDebuggingDialog 專用的 logger
const dialogLogger = logger.createChildLogger('DataDebuggingDialog');

interface DataDebuggingDialogProps {
  show: boolean;
  setShow: (show: boolean) => void;
  wrongData: SheetData[];
  setWrongData: (wrongData: SheetData[]) => void;
  isNeedAI: boolean;
}

interface DebugItemProps {
  data: SheetData;
  onChange: (data: ProductNameMapping) => void;
  productNameMap: ProductTariffCodeMap[];
  isNeedAI: boolean;
}

function DebugItem({
  data,
  onChange,
  productNameMap,
  isNeedAI,
}: DebugItemProps) {
  const [correctProductName, setCorrectProductName] = useState<string>('');

  const [tariffCode, setTariffCode] = useState<string>('');
  const tryToClassify = async () => {
    if (!isNeedAI) return;
    const classifyData = await ipcApi.excel.classifyProductName({
      productName: data[ExcelColumnKeys.ProductName] as string,
    });
    if (classifyData.isError) return;
    setCorrectProductName(classifyData.data?.realProductName || '');
    setTariffCode(classifyData.data?.tariffcode || '');
  };

  useEffect(() => {
    setCorrectProductName(data[ExcelColumnKeys.RealProductName] as string);
  }, [data[ExcelColumnKeys.RealProductName]]);

  useEffect(() => {
    setTariffCode(data[ExcelColumnKeys.ProductClassNumber] as string);
  }, [data[ExcelColumnKeys.ProductClassNumber]]);

  useEffect(() => {
    onChange({
      [ProductNameMappingColumnKeys.OriginalProductName]: data[
        ExcelColumnKeys.ProductName
      ] as string,
      [ProductNameMappingColumnKeys.CorrectProductName]: correctProductName,
      [ProductNameMappingColumnKeys.TariffCode]: tariffCode,
    });
  }, [tariffCode, correctProductName]);

  return (
    <div className="data-debugging-item">
      <div className="data-debugging-item__wrapper">
        {/* <div className="data-debugging-item__title">
          {data[ExcelColumnKeys.ShippingOrderNumber]}
        </div> */}

        <div className="data-debugging-item__content">
          {data[ExcelColumnKeys.ProductName]}
        </div>
        <div className="data-debugging-item__input">
          <Input
            onChange={(event) => {
              setCorrectProductName(event.target.value);
            }}
            defaultValue={data[ExcelColumnKeys.RealProductName] as string}
            onFocus={tryToClassify}
            searchHandler={(inputValue) => {
              const result = productNameMap
                .filter((map) => {
                  if (
                    map[ProductNameMappingColumnKeys.CorrectProductName] ===
                      '' ||
                    map[ProductNameMappingColumnKeys.CorrectProductName] ===
                      undefined
                  )
                    return false;

                  return map[ProductNameMappingColumnKeys.CorrectProductName]
                    .toLowerCase()
                    .includes(inputValue.toLowerCase());
                })
                .map((map) => {
                  return map[ProductNameMappingColumnKeys.CorrectProductName];
                });
              return result;
            }}
            name={ProductNameMappingColumnKeys.CorrectProductName}
            optionClickHandler={(selectedValue) => {
              const tariffCode = productNameMap.find(
                (map) =>
                  map[ProductNameMappingColumnKeys.CorrectProductName] ===
                  selectedValue,
              )?.[ProductNameMappingColumnKeys.TariffCode];
              if (!tariffCode) return;
              setTariffCode(tariffCode);
            }}
            value={correctProductName}
          ></Input>
        </div>
        <div className="data-debugging-item__input">
          <Input
            onChange={(event) => {
              setTariffCode(event.target.value);
            }}
            defaultValue={data[ExcelColumnKeys.ProductClassNumber] as string}
            value={tariffCode}
            name={ProductNameMappingColumnKeys.TariffCode}
          ></Input>
        </div>
      </div>
    </div>
  );
}

export const DataDebuggingDialog: FC<DataDebuggingDialogProps> = ({
  show,
  setShow,
  wrongData,
  setWrongData,
  isNeedAI,
}) => {
  const { showDialog, hideDialog } = useDialog();
  const { showLoading, hideLoading } = useLoading();
  const [correctDataMaps, setCorrectDataMaps] = useState<ProductNameMapping[]>(
    [],
  );
  const [productNameMap, setProductNameMap] = useState<ProductTariffCodeMap[]>(
    [],
  );

  useEffect(() => {
    dialogLogger.info('Dialog show 狀態變更', { show, wrongDataLength: wrongData.length });

    if (!show) return;

    dialogLogger.debug('開始載入 ProductMap');
    ipcApi.excel
      .getProductMap()
      .then((result) => {
        if (result.isError) {
          dialogLogger.warn('getProductMap 回傳錯誤');
          return;
        }
        dialogLogger.info('ProductMap 載入成功', {
          count: result.data?.length ?? 0,
        });
        setProductNameMap(result.data);
      })
      .catch((err) => {
        dialogLogger.error('getProductMap 發生錯誤', err);
      });
  }, [show, wrongData.length]);

  const debuggingContentRender = useCallback(() => {
    dialogLogger.debug('debuggingContentRender 被呼叫', {
      wrongDataLength: wrongData.length,
      productNameMapLength: productNameMap.length,
    });

    return (
      <div className="data-debugging-items">
        <div className="data-debugging-items__title">
          <div className="data-debugging-items__title__content">
            <div className="data-debugging-items__title__content__name">
              商品名稱
            </div>
            <div className="data-debugging-items__title__content__input">
              實際商品名稱
            </div>
            <div className="data-debugging-items__title__content__input">
              商品分類編號
            </div>
          </div>
        </div>
        {wrongData.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
            沒有需要處理的資料
          </div>
        )}
        {wrongData.map((data, index) => (
          <DebugItem
            onChange={(correctDataMap) => {
              if (correctDataMap[ExcelColumnKeys.RealProductName] === '')
                return;
              setCorrectDataMaps((prevMaps) => {
                const newMaps = [...prevMaps];
                newMaps[index] = correctDataMap;
                return newMaps;
              });
            }}
            productNameMap={productNameMap}
            data={data}
            key={data[ExcelColumnKeys.ProductName] || index}
            isNeedAI={isNeedAI}
          ></DebugItem>
        ))}
      </div>
    );
  }, [wrongData, correctDataMaps, productNameMap, isNeedAI]);
  useEffect(() => {
    if (show) setCorrectDataMaps([]);
  }, [show]);

  return (
    <>
      {show && (
        <Dialog
          showMask={true}
          showCancel={true}
          contentRender={debuggingContentRender}
          onConfirm={async () => {
            showLoading();
            const result = await ipcApi.excel.addProductMap({
              mappings: correctDataMaps,
            });
            hideLoading();
            if (result.isError) {
              showDialog({
                content: '新增失敗，請確認連線及資料是否正確。',
                onConfirm: () => {
                  hideDialog();
                },
              });
            }

            setShow(false);
          }}
          onCancel={() => setShow(false)}
        ></Dialog>
      )}
    </>
  );
};
