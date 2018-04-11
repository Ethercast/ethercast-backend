import { DecodedLog, DecodedTransaction, Log, Transaction } from '@ethercast/model';
import { Abi, ContractMember } from '../debt/etherscan-model';
import * as _ from 'underscore';

export const EMPTY_LOG: Log = {
  'address': '0x0000000000000000000000000000000000000000',
  'topics': [
    '0x0000000000000000000000000000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000000000000000000000000000'
  ],
  'data': '0x',
  'blockNumber': '0x0',
  'transactionHash': '0x0000000000000000000000000000000000000000000000000000000000000000',
  'transactionIndex': '0x0',
  'blockHash': '0x0000000000000000000000000000000000000000000000000000000000000000',
  'logIndex': '0x0',
  'removed': false
};

export const EMPTY_TRANSACTION: Transaction = {
  'blockHash': '0x0000000000000000000000000000000000000000000000000000000000000000',
  'blockNumber': '0x0',
  'from': '0x0000000000000000000000000000000000000000',
  'gas': '0x0',
  'gasPrice': '0x0',
  'hash': '0x0000000000000000000000000000000000000000000000000000000000000000',
  'input': '0x',
  'nonce': '0x0',
  'r': '0x0000000000000000000000000000000000000000000000000000000000000000',
  's': '0x0000000000000000000000000000000000000000000000000000000000000000',
  'to': '0x0000000000000000000000000000000000000000',
  'transactionIndex': '0x0',
  'v': '0x00',
  'value': '0x0'
};

function joinStrings(original: any, additional: any, separator: string = '|'): string {
  if (typeof original !== 'string') {
    original = '';
  }

  if (typeof additional !== 'string') {
    return original;
  }

  return _.chain(original.split(separator))
    .concat([ additional ])
    .filter(s => typeof s === 'string')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .uniq()
    .value()
    .join(` ${separator} `);
}

export function createExampleLog(abis: { [ address: string ]: Abi | null }): DecodedLog | Log {
  const possibleEvents: ContractMember[] = _.chain(abis)
    .values()
    .flatten(true)
    .filter(a => a !== null)
    .filter((a: ContractMember) => Boolean(a.type && a.type.toLowerCase() === 'event'))
    .value();

  if (possibleEvents.length === 0) {
    return EMPTY_LOG;
  }

  return _.reduce<ContractMember, DecodedLog>(
    possibleEvents,
    (log, event) => {
      return {
        ...log,
        ethercast: {
          eventName: joinStrings(log.ethercast.eventName, event.name),
          parameters: event.inputs && event.inputs.length ? {
            ..._.reduce(
              event.inputs,
              (parameters, input, index) => {
                return {
                  ...parameters,
                  [ index ]: joinStrings(parameters[ index ], input.type),
                  [ input.name ]: joinStrings(parameters[ input.name ], input.type)
                };
              },
              log.ethercast.parameters
            )
          } : log.ethercast.parameters
        }
      };
    },
    { ...EMPTY_LOG, ethercast: { eventName: '', parameters: {} } }
  );
}

export function createExampleTransaction(abis: { [ address: string ]: Abi | null }): DecodedTransaction | Transaction {
  const possibleMethods: ContractMember[] = _.chain(abis)
    .values()
    .flatten(true)
    .filter(a => a !== null)
    .filter((a: ContractMember) => Boolean(a.type && a.type.toLowerCase() === 'function' && a.constant !== true))
    .value();

  if (possibleMethods.length === 0) {
    return EMPTY_TRANSACTION;
  }

  return _.reduce<ContractMember, DecodedTransaction>(
    possibleMethods,
    (transaction, method) => {
      return {
        ...transaction,
        ethercast: {
          methodName: joinStrings(transaction.ethercast.methodName, method.name),
          parameters: method.inputs && method.inputs.length ? {
            ..._.reduce(
              method.inputs,
              (parameters, input, index) => {
                return {
                  ...parameters,
                  [ index ]: joinStrings(parameters[ index ], input.type),
                  [ input.name ]: joinStrings(parameters[ input.name ], input.type)
                };
              },
              transaction.ethercast.parameters
            )
          } : transaction.ethercast.parameters
        }
      };
    },
    { ...EMPTY_TRANSACTION, ethercast: { methodName: '', parameters: {} } }
  );
}