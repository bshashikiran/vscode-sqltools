import { Client, auth, ClientOptions } from 'cassandra-driver';
import AbstractDriver from '@sqltools/base-driver';
import queries from './queries';
import { IConnectionDriver, MConnectionExplorer, NSDatabase, ContextValue, Arg0 } from '@sqltools/types';
import { parse as queryParse } from '@sqltools/util/query';
import generateId from '@sqltools/util/internal-id';

export default class Cassandra extends AbstractDriver<Client, ClientOptions> implements IConnectionDriver {

  queries = queries;

  public async open() {
    if (this.connection) {
      return this.connection;
    }

    const clientOptions: ClientOptions = {
      contactPoints: [this.credentials.server],
      keyspace: this.credentials.database ? this.credentials.database : undefined,
      protocolOptions: {
        port: this.credentials.port || 9042,
      },
      socketOptions: {
        connectTimeout: parseInt(`${this.credentials.connectionTimeout || 5}`, 10) * 1_000,
      },
    };

    if ((this.credentials as any).localDataCenter) {
      clientOptions.localDataCenter = (this.credentials as any).localDataCenter;
    }

    if (this.credentials.username && this.credentials.password) {
      clientOptions.authProvider = new auth.PlainTextAuthProvider(
        this.credentials.username,
        this.credentials.password
      );
    }

    const client = new Client(clientOptions);
    await client.connect();

    this.connection = Promise.resolve(client);
    return this.connection;
  }

  public async close() {
    if (!this.connection) return Promise.resolve();
    const client = await this.connection;
    await client.shutdown();
    this.connection = null;
  }

  public query: (typeof AbstractDriver)['prototype']['query'] = async (query, opt = {}) => {
    const client = await this.open();
    const { requestId } = opt;
    const queries = queryParse(query.toString()).filter(Boolean);
    const resultsAgg: NSDatabase.IResult[] = [];

    for (let q of queries) {
      const trimmedQuery = q.trim();
      if (!trimmedQuery) continue;

      try {
        const result = await client.execute(trimmedQuery, [], { prepare: true });
        const cols = result.columns ? result.columns.map(c => c.name) : [];
        const rows = result.rows || [];
        const messages = [];

        if (trimmedQuery.toLowerCase().indexOf('select') !== 0) {
          messages.push(this.prepareMessage(`${rows.length} rows affected.`));
        }

        resultsAgg.push(<NSDatabase.IResult>{
          requestId,
          resultId: generateId(),
          connId: this.getId(),
          cols,
          messages,
          query: trimmedQuery,
          results: rows,
        });
      } catch (err) {
        resultsAgg.push(<NSDatabase.IResult>{
          requestId,
          resultId: generateId(),
          connId: this.getId(),
          cols: [],
          messages: [
            this.prepareMessage([
              (err && err.message || err.toString()),
            ].filter(Boolean).join(' '))
          ],
          error: true,
          rawError: err,
          query: trimmedQuery,
          results: [],
        });
      }
    }

    return resultsAgg;
  }

  public async testConnection() {
    await this.open();
    await this.query('SELECT keyspace_name FROM system_schema.keyspaces LIMIT 1', {});
  }

  public async getChildrenForItem({ item, parent }: Arg0<IConnectionDriver['getChildrenForItem']>) {
    switch (item.type) {
      case ContextValue.CONNECTION:
      case ContextValue.CONNECTED_CONNECTION:
        return this.queryResults(this.queries.fetchDatabases(item));
      case ContextValue.DATABASE:
        return <MConnectionExplorer.IChildItem[]>[
          { label: 'Tables', type: ContextValue.RESOURCE_GROUP, iconId: 'folder', childType: ContextValue.TABLE },
          { label: 'Views', type: ContextValue.RESOURCE_GROUP, iconId: 'folder', childType: ContextValue.VIEW },
        ];
      case ContextValue.TABLE:
      case ContextValue.VIEW:
        return this.getColumns(item as NSDatabase.ITable);
      case ContextValue.RESOURCE_GROUP:
        return this.getChildrenForGroup({ item, parent });
    }
    return [];
  }

  private async getChildrenForGroup({ parent, item }: Arg0<IConnectionDriver['getChildrenForItem']>) {
    switch (item.childType) {
      case ContextValue.TABLE:
        return this.queryResults(this.queries.fetchTables(parent as NSDatabase.ISchema));
      case ContextValue.VIEW:
        return this.queryResults(this.queries.fetchViews(parent as NSDatabase.ISchema));
    }
    return [];
  }

  private async getColumns(parent: NSDatabase.ITable): Promise<NSDatabase.IColumn[]> {
    const results = await this.queryResults(this.queries.fetchColumns(parent));
    return results.map((obj) => {
      const isPk = !!obj.isPk;
      const isFk = !!obj.isFk;
      return <NSDatabase.IColumn>{
        ...obj,
        isPk,
        isFk,
        isNullable: !isPk,
        iconName: isPk ? 'pk' : (isFk ? 'fk' : null),
        childType: ContextValue.NO_CHILD,
        table: parent
      };
    });
  }

  public async getDefinitionForItem({ item }: Arg0<IConnectionDriver['getDefinitionForItem']>) {
    if (item.type === ContextValue.TABLE || item.type === ContextValue.VIEW) {
      const columns = await this.getColumns(item as NSDatabase.ITable);
      const colDefs = columns.map(c => `  ${c.label} ${c.dataType}${c.isPk ? ' PRIMARY KEY' : ''}`).join(',\n');
      return `CREATE TABLE ${item.database}.${item.label} (\n${colDefs}\n);`;
    }
    return '';
  }

  public searchItems(itemType: ContextValue, search: string, extraParams: any = {}): Promise<NSDatabase.SearchableItem[]> {
    switch (itemType) {
      case ContextValue.TABLE:
        return this.queryResults(this.queries.searchTables({ search, ...extraParams }));
      case ContextValue.COLUMN:
        return this.queryResults(this.queries.searchColumns({ search, ...extraParams }));
    }
    return Promise.resolve([]);
  }
}
