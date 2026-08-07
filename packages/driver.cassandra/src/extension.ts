import { IExtension, IExtensionPlugin, IDriverExtensionApi } from '@sqltools/types';
import { ExtensionContext, extensions } from 'vscode';
import { DRIVER_ALIASES } from './constants';
const { publisher, name } = require('../package.json');

const driverName = 'Cassandra';

export async function activate(extContext: ExtensionContext): Promise<IDriverExtensionApi> {
  const sqltools = extensions.getExtension<IExtension>('bshashikiran.vscode-datagrip');
  if (!sqltools) {
    throw new Error('SQLTools not installed');
  }
  await sqltools.activate();

  const api = sqltools.exports;

  const extensionId = `${publisher}.${name}`;
  const plugin: IExtensionPlugin = {
    extensionId,
    name: `${driverName} Plugin`,
    type: 'driver',
    async register(extension) {
      extension.resourcesMap().set(`driver/${DRIVER_ALIASES[0].value}/icons`, {
        active: extContext.asAbsolutePath('icons/active.png'),
        default: extContext.asAbsolutePath('icons/default.png'),
        inactive: extContext.asAbsolutePath('icons/inactive.png'),
      });
      DRIVER_ALIASES.forEach(({ value }) => {
        extension.resourcesMap().set(`driver/${value}/extension-id`, extensionId);
        extension.resourcesMap().set(`driver/${value}/connection-schema`, extContext.asAbsolutePath('connection.schema.json'));
        extension.resourcesMap().set(`driver/${value}/ui-schema`, extContext.asAbsolutePath('ui.schema.json'));
      });
      await extension.client.sendRequest('ls/RegisterPlugin', { path: extContext.asAbsolutePath('out/ls/plugin.js') });
    }
  };
  api.registerPlugin(plugin);
  return {
    driverName,
    parseBeforeSaveConnection: ({ connInfo }) => {
      const formData = { ...connInfo };
      delete formData.connectionMethod;
      return formData;
    },
    parseBeforeEditConnection: ({ connInfo }) => {
      const formData = { ...connInfo };
      delete formData.connectionMethod;
      return formData;
    },
    driverAliases: DRIVER_ALIASES,
  }
}

export function deactivate() {}
