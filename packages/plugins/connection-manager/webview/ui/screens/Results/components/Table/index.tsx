import React, { useCallback, useMemo, useState, useEffect } from 'react';
import Paper from '@material-ui/core/Paper';
import {
  SortingState,
  IntegratedSorting,
  FilteringState,
  IntegratedFiltering,
  DataTypeProvider,
  PagingState,
  CustomPaging,
  PagingStateProps,
  SelectionState,
  TableColumnResizingProps,
  Filter,
} from '@devexpress/dx-react-grid';

import {
  Grid,
  VirtualTable,
  TableHeaderRow,
  TableFilterRow,
  TableColumnResizing,
  PagingPanel,
  TableSelection,
} from '@devexpress/dx-react-grid-material-ui';
import { availableFilterOperations, MenuActions } from '../../constants';
import TableFilterRowCell from './TableFilterRowCell';
import PagingPanelContainer from './PagingPanelContainer';
import FilterIcon from './FilterIcon';
import TableCell from './TableCell';
import computeColumnWidths from './computeColumnWidths';
import sendMessage from '../../../../lib/messages';
import TableRow from './TableRow';
import style from './style.m.scss';
import { UIAction } from '../../actions';
import { filterPredicate } from '../../lib/filterPredicate';
import SortLabel from './SortLabel';
import { toRegEx, clipboardInsert } from '../../../../lib/utils';
import GridRoot from './GridRoot';
import QueryError from '../QueryError';
import { MenuProvider } from '../../context/MenuContext';
import useCurrentResult from '../../hooks/useCurrentResult';
import useContextAction from '../../hooks/useContextAction';
import useResultsContext from '../../hooks/useResultsContext';
import SqlSummary from '../SqlSummary';
import FooterActions from '../FooterActions';

const compareNumericOrString = (a: any, b: any) => {
  if (a === b) return 0;
  const aValid = a !== null && a !== undefined && a !== '';
  const bValid = b !== null && b !== undefined && b !== '';
  if (!aValid && !bValid) return 0;
  if (!aValid) return 1;
  if (!bValid) return -1;

  const numA = Number(a);
  const numB = Number(b);
  if (!isNaN(numA) && !isNaN(numB)) {
    return numA - numB;
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
};

const QuerySuccess = ({ messages, colsCount }: { messages: any[], colsCount: number }) => {
  const isSelectEmpty = colsCount > 0;
  
  const messageText = isSelectEmpty
    ? 'No results found.'
    : (messages && messages.length 
        ? messages.map(m => (m as any).message || m.toString()).join('\n')
        : 'Query executed successfully.');

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--vscode-editor-background, #1e1e1e)',
      color: 'var(--vscode-foreground, #cccccc)',
      fontFamily: 'var(--vscode-font-family, inherit)',
      fontSize: '13px',
      flex: 1
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '24px',
        flex: 1,
        justifyContent: 'center',
        flexDirection: 'column',
        textAlign: 'center'
      }}>
        {isSelectEmpty ? (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--vscode-descriptionForeground, #858585)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        ) : (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--vscode-charts-green, #4caf50)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', flexShrink: 0 }}>
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        )}
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4', fontWeight: 500 }}>
          {messageText}
        </div>
      </div>
      <FooterActions />
    </div>
  );
};

const Table = ({ setContextState }) => {
  const [filters, setFilters] = useState<(Filter & { regex?: RegExp })[]>([]);
  const [selection, setSelection] = useState<Array<number | string>>([]);
  const { exportResults, reRunQuery } = useContextAction();
  const { result } = useCurrentResult();
  const { edits, saving, setSaving, toast, setToast } = useResultsContext();
  const { results: rows = [], cols = [], error, messages = [], page, pageSize, total, queryType, queryParams, requestId, resultId, tableName, primaryKeys, connId } = result || {};

  const sortingExtensions = useMemo(() => cols.map(columnName => ({
    columnName,
    compare: compareNumericOrString
  })), [cols]);

  const getRowData = useCallback((idx: number) => {
    const originalRow = rows[idx];
    if (!originalRow || !resultId || !edits[resultId]?.[idx]) return originalRow;
    return { ...originalRow, ...edits[resultId][idx] };
  }, [rows, edits, resultId]);


  const pendingEditsCount = useMemo(() => {
    if (!resultId || !edits[resultId]) return 0;
    let count = 0;
    const rowIndexes = Object.keys(edits[resultId]);
    for (const r of rowIndexes) {
      count += Object.keys(edits[resultId][r] || {}).length;
    }
    return count;
  }, [edits, resultId]);

  const handleSave = useCallback(() => {
    if (pendingEditsCount === 0 || !resultId) return;
    
    const resultEdits = edits[resultId];
    const rowIndexes = Object.keys(resultEdits).map(Number);
    
    const serializedEdits = rowIndexes.map(rIndex => {
      const originalRow = rows[rIndex];
      const modifiedValues = resultEdits[rIndex];
      
      const keys: Record<string, any> = {};
      const pkeys = primaryKeys || [];
      
      pkeys.forEach(pk => {
        keys[pk] = originalRow[pk];
      });
      
      return {
        keys,
        original: originalRow,
        modified: modifiedValues
      };
    });

    setSaving(true);
    sendMessage(UIAction.CALL, {
      command: `${process.env.EXT_NAMESPACE}.updateRows`,
      args: [{
        connId,
        tableName,
        primaryKeys,
        edits: serializedEdits,
        resultId,
        requestId
      }]
    });
  }, [pendingEditsCount, resultId, edits, rows, primaryKeys, connId, setSaving, requestId]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast, setToast]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (pendingEditsCount > 0 && !saving) {
          handleSave();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [pendingEditsCount, saving, handleSave]);

  const columnExtensions = useMemo(() => cols.map(columnName => ({ columnName, predicate: filterPredicate })), [cols]);

  const showPagination = useMemo(() => Math.max(total ?? 0, rows.length) > pageSize, [total, rows]);

  const { columnObjNames, columnNames } = useMemo(() => {
    const columnNames = cols.length > 0 ? cols : [''];
    return { columnNames, columnObjNames: cols.map(title => ({ name: title, title })) };
  }, [cols]);

  const changePage = (page: number) => {
    setContextState({ loading: true });
    sendMessage(UIAction.CALL, {
      command: `${process.env.EXT_NAMESPACE}.${queryType}`,
      args: [queryParams, { page, pageSize: pageSize ?? 50, requestId }],
    });
  };

  const changeFilters = useCallback((newFilters: typeof filters = []) => {
    newFilters = newFilters.map(filter => {
      if (filter.operation === 'regex')
        filter.regex = toRegEx(filter.value);
      return filter;
    });
    setFilters(newFilters);
  }, [setFilters]);

  const onMenuOpen = useCallback(({ rowindex }) => {
    rowindex = Number(rowindex);
    if (isNaN(rowindex) || rowindex < 0) return;
    setSelection(selection.includes(rowindex) ? selection : (rowindex >= 0 ? [rowindex] : []));
  }, [JSON.stringify(selection)]);

  const defaultColumnWidths = useMemo(() => computeColumnWidths(cols ?? [], rows ?? []), [...cols, rows && rows.length]);
  const [columnWidthOverrides, setColumnWidthOverrides] = useState<Record<string, string | number>>({});
  const updateWidths: TableColumnResizingProps["onColumnWidthsChange"] = useCallback((newColsInfo) =>
    setColumnWidthOverrides(oldOverrides => {
      const newOverrides = { ...oldOverrides };
      for (const { columnName, width } of newColsInfo) {
        if (width !== defaultColumnWidths[columnName] || columnName in oldOverrides)
          newOverrides[columnName] = width;
      }
      return newOverrides;
    }), [defaultColumnWidths]);
  const columnWidths = Object.entries({ ...defaultColumnWidths, ...columnWidthOverrides })
    .map(([columnName, width]) => ({ columnName, width }));

  const menuActions = {
    [MenuActions.ReRunQueryOption]: reRunQuery,
    [MenuActions.SaveCSVOption]: exportResults,
    [MenuActions.SaveJSONOption]: exportResults,
  }

  const onMenuSelect = useCallback((choice: string, { rowindex, colname }) => {
    rowindex = Number(rowindex);
    let selectedRows: any[] | any = selection.map(index => getRowData(index as number));
    selectedRows = selectedRows.length === 1 ? selectedRows[0] : selectedRows;
    const cellValue = (getRowData(rowindex) ?? {})[colname];
    switch (choice) {
      case MenuActions.FilterByValueOption:
        const newFilters = [...filters];
        const filterIndex = newFilters.findIndex(filter => filter.columnName === colname);
        if (filterIndex !== -1) newFilters.splice(filterIndex, 1);
        newFilters.push({
          columnName: colname,
          operation: 'equal',
          value: cellValue,
        });
        setFilters(newFilters);
        return setSelection([]);
      case MenuActions.CopyCellOption:
      case MenuActions.CopyRowOption:
        return clipboardInsert(choice === MenuActions.CopyCellOption ? cellValue : selectedRows);
      case MenuActions.ClearFiltersOption:
        setFilters([]);
      case MenuActions.ClearSelection:
        return setSelection([]);
      case MenuActions.OpenEditorWithValueOption:
      case MenuActions.OpenEditorWithRowOption:
        return sendMessage(UIAction.CALL, {
          command: `${process.env.EXT_NAMESPACE}.insertText`,
          args: [choice === MenuActions.OpenEditorWithValueOption ? `${cellValue}` : JSON.stringify(selectedRows, null, 2)],
        });
      case MenuActions.ReRunQueryOption:
      case MenuActions.SaveCSVOption:
      case MenuActions.SaveJSONOption:
        return menuActions[choice](choice);
    }
  }, [JSON.stringify(selection), JSON.stringify(filters), getRowData]);

  const getMenuOptions = useCallback(({ colname, rowindex }) => {
    rowindex = Number(rowindex);
    const row = getRowData(rowindex);
    const cellOptions = [];
    const filterOptions = [];
    const queryOptions = [MenuActions.ReRunQueryOption];
    const newSelection = selection.includes(rowindex) ? selection : (rowindex >= 0 ? [rowindex] : []);
    const isMultiSelection = newSelection.length > 1;
    const rowOptions = row ? [
      MenuActions.CopyRowOption,
      MenuActions.OpenEditorWithRowOption,
    ] : [];
    const resultOptions = newSelection.length > 0 ? [
      MenuActions.SaveCSVOption,
      MenuActions.SaveJSONOption,
    ] : [];

    if (row) {
      let cellValue = row[colname];
      const cellValueIsObject = cellValue && (Array.isArray(cellValue) ?? cellValue.toString() === '[object Object]');
      const replaceString = cellValueIsObject ? 'Cell Value' : `'${cellValue}'`;
      if (typeof cellValue !== 'undefined' && !cellValueIsObject) {
        cellOptions.push({
          label: MenuActions.FilterByValueOption.replace('{contextAction}', replaceString),
          value: MenuActions.FilterByValueOption,
        });
      }
      cellOptions.push(
        {
          label: MenuActions.CopyCellOption.replace('{contextAction}', replaceString),
          value: MenuActions.CopyCellOption,
        },
        {
          label: MenuActions.OpenEditorWithValueOption.replace('{contextAction}', replaceString),
          value: MenuActions.OpenEditorWithValueOption,
        },
      );
    }
    if (filters.length > 0) {
      filterOptions.push(MenuActions.ClearFiltersOption);
    }
    if (isMultiSelection) {
      filterOptions.push(MenuActions.ClearSelection);
    }

    let options = [];
    if (cellOptions.length > 0) {
      options = options.concat(cellOptions);
      options.push(MenuActions.Divider);
    }
    if (filterOptions.length > 0) {
      options = options.concat(filterOptions);
      options.push(MenuActions.Divider);
    }
    if (rowOptions.length > 0) {
      options = options.concat(rowOptions);
      options.push(MenuActions.Divider);
    }
    if (queryOptions.length > 0) {
      options = options.concat(queryOptions);
      options.push(MenuActions.Divider);
    }
    if (resultOptions.length > 0) {
      options = options.concat(resultOptions);
    }
    if (options[options.length - 1] === MenuActions.Divider) {
      options.pop()
    }
    return options;
  }, [JSON.stringify(selection), JSON.stringify(filters), getRowData]);

  let pagingProps: PagingStateProps = {};
  if (typeof page === 'number') {
    pagingProps = {
      currentPage: page,
      onCurrentPageChange: changePage
    };
  } else {
    pagingProps = {
      defaultCurrentPage: 0
    };
  }
  if (!result) return null;

  return (
    <MenuProvider
      onOpen={onMenuOpen}
      getOptions={getMenuOptions}
      onSelect={onMenuSelect}
    >
      <Paper square elevation={0} className="result" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <SqlSummary />
        {toast && (
          <div className={`${style.toast} ${style[toast.type]}`}>
            {toast.message}
          </div>
        )}
        {error && <QueryError messages={messages} />}
        {!error && (rows.length === 0 || cols.length === 0) && <QuerySuccess messages={messages} colsCount={cols.length} />}
        {!error && rows.length > 0 && cols.length > 0 && (
          <Grid rows={rows} columns={columnObjNames} rootComponent={GridRoot}>
            <DataTypeProvider for={columnNames} availableFilterOperations={availableFilterOperations} />
            <SortingState />
            <IntegratedSorting columnExtensions={sortingExtensions} />
            <FilteringState filters={filters} onFiltersChange={changeFilters} />
            <IntegratedFiltering columnExtensions={columnExtensions} />
            <PagingState pageSize={pageSize ?? 50} {...pagingProps} />
            <CustomPaging totalCount={total ?? rows.length} />
            <SelectionState selection={selection} onSelectionChange={setSelection} />
            <VirtualTable cellComponent={TableCell} />
            <TableColumnResizing columnWidths={columnWidths} onColumnWidthsChange={updateWidths} />
            <TableHeaderRow showSortingControls sortLabelComponent={SortLabel} />
            <TableSelection
              selectByRowClick
              highlightRow
              showSelectionColumn={false}
              rowComponent={TableRow.Selected}
            />
            <TableFilterRow
              cellComponent={TableFilterRowCell}
              showFilterSelector
              iconComponent={FilterIcon}
              messages={{ regex: 'RegEx' } as any}
            />
            {<PagingPanel containerComponent={PagingPanelContainer(showPagination)} />}
          </Grid>
        )}
      </Paper>
    </MenuProvider>
  );
}


export default Table;