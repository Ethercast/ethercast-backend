import { expect } from 'chai';
import { createExampleLog, createExampleTransaction, EMPTY_LOG, EMPTY_TRANSACTION } from '../src/util/create-examples';
import * as cryptoKittiesAbi from './cryptokitties-core-abi.json';
import * as etherdeltaAbi from './etherdelta-abi.json';
import * as priceFeedAbi from './price-feed-abis.json';

describe('#createExampleLog', () => {
  it('returns an empty log by default', () => {
    expect(createExampleLog({})).to.eq(EMPTY_LOG);
  });

  it('pulls in the events from the passed in abis', () => {
    expect(createExampleLog({ '0x06012c8cf97bead5deae237070f9587f8e7a266d': cryptoKittiesAbi }))
      .to.deep
      .eq({
        ...EMPTY_LOG,
        'ethercast': {
          'eventName': 'Pregnant | Transfer | Approval | Birth | ContractUpgrade',
          'parameters': {
            '0': 'address',
            '1': 'uint256 | address',
            '2': 'uint256',
            '3': 'uint256',
            '4': 'uint256',
            'approved': 'address',
            'cooldownEndBlock': 'uint256',
            'from': 'address',
            'genes': 'uint256',
            'kittyId': 'uint256',
            'matronId': 'uint256',
            'newContract': 'address',
            'owner': 'address',
            'sireId': 'uint256',
            'to': 'address',
            'tokenId': 'uint256'
          }
        }
      });
  });

  it('works with multiple contracts', () => {
    expect(createExampleLog({
      '0x06012c8cf97bead5deae237070f9587f8e7a266d': cryptoKittiesAbi,
      '0x4aea7cf559f67cedcad07e12ae6bc00f07e8cf65': etherdeltaAbi
    })).to.deep.eq({
      ...EMPTY_LOG,
      'ethercast': {
        'eventName': 'Pregnant | Transfer | Approval | Birth | ContractUpgrade | Order | Cancel | Trade | Deposit | Withdraw',
        'parameters': {
          '0': 'address',
          '1': 'uint256 | address',
          '2': 'uint256 | address',
          '3': 'uint256',
          '4': 'uint256 | address',
          '5': 'uint256 | address',
          '6': 'address',
          '7': 'uint8',
          '8': 'bytes32',
          '9': 'bytes32',
          'amount': 'uint256',
          'amountGet': 'uint256',
          'amountGive': 'uint256',
          'approved': 'address',
          'balance': 'uint256',
          'cooldownEndBlock': 'uint256',
          'expires': 'uint256',
          'from': 'address',
          'genes': 'uint256',
          'get': 'address',
          'give': 'address',
          'kittyId': 'uint256',
          'matronId': 'uint256',
          'newContract': 'address',
          'nonce': 'uint256',
          'owner': 'address',
          'r': 'bytes32',
          's': 'bytes32',
          'sireId': 'uint256',
          'to': 'address',
          'token': 'address',
          'tokenGet': 'address',
          'tokenGive': 'address',
          'tokenId': 'uint256',
          'user': 'address',
          'v': 'uint8'
        }
      }
    });
  });

  it('works for broken kovan abi', () => {
    expect(createExampleLog(priceFeedAbi))
      .to.deep.eq({
      ...EMPTY_LOG,
      'ethercast': {
        'eventName': 'PriceUpdated',
        'parameters': {
          '0': 'uint256',
          'timestamp': 'uint256'
        }
      }
    });
  });
});

describe('#createExampleTransaction', () => {
  it('returns an empty tx by default', () => {
    expect(createExampleTransaction({})).to.eq(EMPTY_TRANSACTION);
  });

  it('pulls in the functions passed in abis', () => {
    expect(createExampleTransaction({ '0x06012c8cf97bead5deae237070f9587f8e7a266d': cryptoKittiesAbi }))
      .to.deep
      .eq({
        ...EMPTY_TRANSACTION,
        ethercast: {
          'methodName': 'approve | setSiringAuctionAddress | transferFrom | setGeneScienceAddress | setCEO | setCOO | createSaleAuction | unpause | createSiringAuction | setAutoBirthFee | approveSiring | setCFO | createPromoKitty | setSecondsPerBlock | withdrawBalance | setSaleAuctionAddress | setNewAddress | pause | giveBirth | withdrawAuctionBalances | transfer | createGen0Auction | setMetadataAddress | bidOnSiringAuction | breedWithAuto',
          'parameters': {
            '0': 'address | uint256',
            '1': 'uint256 | address',
            '2': 'uint256',
            '3': 'uint256',
            '_addr': 'address',
            '_address': 'address',
            '_contractAddress': 'address',
            '_duration': 'uint256',
            '_endingPrice': 'uint256',
            '_from': 'address',
            '_genes': 'uint256',
            '_kittyId': 'uint256',
            '_matronId': 'uint256',
            '_newCEO': 'address',
            '_newCFO': 'address',
            '_newCOO': 'address',
            '_owner': 'address',
            '_sireId': 'uint256',
            '_startingPrice': 'uint256',
            '_to': 'address',
            '_tokenId': 'uint256',
            '_v2Address': 'address',
            'secs': 'uint256',
            'val': 'uint256'
          }
        }
      });
  });

  it('works with multiple contracts', () => {
    expect(createExampleTransaction({
      '0x06012c8cf97bead5deae237070f9587f8e7a266d': cryptoKittiesAbi,
      '0x4aea7cf559f67cedcad07e12ae6bc00f07e8cf65': etherdeltaAbi
    })).to.deep.eq({
      ...EMPTY_TRANSACTION,
      'ethercast': {
        'methodName': 'approve | setSiringAuctionAddress | transferFrom | setGeneScienceAddress | setCEO | setCOO | createSaleAuction | unpause | createSiringAuction | setAutoBirthFee | approveSiring | setCFO | createPromoKitty | setSecondsPerBlock | withdrawBalance | setSaleAuctionAddress | setNewAddress | pause | giveBirth | withdrawAuctionBalances | transfer | createGen0Auction | setMetadataAddress | bidOnSiringAuction | breedWithAuto | trade | cancelOrder | withdraw | depositToken | order | withdrawToken | deposit',
        'parameters': {
          '0': 'address | uint256',
          '1': 'uint256 | address',
          '2': 'uint256 | address',
          '3': 'uint256',
          '4': 'uint256',
          '5': 'uint256',
          '6': 'address | uint8',
          '7': 'uint8 | bytes32',
          '8': 'bytes32',
          '9': 'bytes32',
          '10': 'uint256',
          '_addr': 'address',
          '_address': 'address',
          '_contractAddress': 'address',
          '_duration': 'uint256',
          '_endingPrice': 'uint256',
          '_from': 'address',
          '_genes': 'uint256',
          '_kittyId': 'uint256',
          '_matronId': 'uint256',
          '_newCEO': 'address',
          '_newCFO': 'address',
          '_newCOO': 'address',
          '_owner': 'address',
          '_sireId': 'uint256',
          '_startingPrice': 'uint256',
          '_to': 'address',
          '_tokenId': 'uint256',
          '_v2Address': 'address',
          'amount': 'uint256',
          'amountGet': 'uint256',
          'amountGive': 'uint256',
          'expires': 'uint256',
          'nonce': 'uint256',
          'r': 'bytes32',
          's': 'bytes32',
          'secs': 'uint256',
          'token': 'address',
          'tokenGet': 'address',
          'tokenGive': 'address',
          'user': 'address',
          'v': 'uint8',
          'val': 'uint256'
        }
      }
    });
  });
});