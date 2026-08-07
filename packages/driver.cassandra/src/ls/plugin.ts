import { ILanguageServerPlugin } from '@sqltools/types';
import Cassandra from './driver';
import { DRIVER_ALIASES } from './../constants';

const CassandraDriverPlugin: ILanguageServerPlugin = {
  register(server) {
    DRIVER_ALIASES.forEach(({ value }) => {
      server.getContext().drivers.set(value, Cassandra as any);
    });
  }
}

export default CassandraDriverPlugin;
