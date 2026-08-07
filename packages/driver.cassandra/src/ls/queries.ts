import { IBaseQueries, ContextValue } from '@sqltools/types';
import queryFactory from '@sqltools/base-driver/dist/lib/factory';

const describeTable: IBaseQueries['describeTable'] = queryFactory`
SELECT * FROM system_schema.columns
WHERE keyspace_name = '${p => p.database}'
  AND table_name = '${p => p.label}'
`;

const fetchColumns: IBaseQueries['fetchColumns'] = queryFactory`
SELECT column_name AS label,
  column_name AS name,
  type AS dataType,
  kind,
  keyspace_name AS database,
  table_name AS "table",
  (kind = 'partition_key') AS isPk,
  (kind = 'clustering') AS isFk,
  '${ContextValue.COLUMN}' AS type
FROM system_schema.columns
WHERE keyspace_name = '${p => p.database}'
  AND table_name = '${p => p.label || p.table}'
`;

const fetchRecords: IBaseQueries['fetchRecords'] = queryFactory`
SELECT * FROM ${p => p.table.database}.${p => p.table.label}
LIMIT ${p => p.limit || 50}
`;

const countRecords: IBaseQueries['countRecords'] = queryFactory`
SELECT count(1) AS total FROM ${p => p.table.database}.${p => p.table.label}
`;

const fetchTables: IBaseQueries['fetchTables'] = queryFactory`
SELECT table_name AS label,
  '${ContextValue.TABLE}' AS type
FROM system_schema.tables
WHERE keyspace_name = '${p => p.database}'
`;

const fetchViews: IBaseQueries['fetchTables'] = queryFactory`
SELECT view_name AS label,
  '${ContextValue.VIEW}' AS type
FROM system_schema.views
WHERE keyspace_name = '${p => p.database}'
`;

const fetchDatabases: IBaseQueries['fetchDatabases'] = queryFactory`
SELECT keyspace_name AS label,
  keyspace_name AS database,
  '${ContextValue.DATABASE}' AS type
FROM system_schema.keyspaces
`;

const searchTables: IBaseQueries['searchTables'] = queryFactory`
SELECT table_name AS label,
  'table' AS type
FROM system_schema.tables
${p => p.search ? `WHERE table_name LIKE '%${p.search}%' ALLOW FILTERING` : ''}
`;

const searchColumns: IBaseQueries['searchColumns'] = queryFactory`
SELECT column_name AS label,
  table_name AS "table",
  type AS dataType,
  keyspace_name AS database,
  '${ContextValue.COLUMN}' AS type
FROM system_schema.columns
${p => p.search ? `WHERE column_name LIKE '%${p.search}%' ALLOW FILTERING` : ''}
`;

export default {
  describeTable,
  fetchColumns,
  fetchRecords,
  countRecords,
  fetchTables,
  fetchViews,
  fetchDatabases,
  searchTables,
  searchColumns
};
