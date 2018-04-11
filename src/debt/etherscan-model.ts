// this needs to go into a separate module for the ethercsan client
export interface Input {
  name: string;
  type: string;
  indexed?: boolean;
}

export interface Output {
  name: string;
  type: string;
}

export interface Tuple extends Output {
  type: 'tuple',
  components: Output[]
}

export interface ContractMember {
  constant?: boolean;
  inputs?: Input[];
  name?: string;
  outputs?: (Output | Tuple)[];
  type: string;
  payable?: boolean;
  stateMutability?: string;
  anonymous?: boolean;
}

export type Abi = ContractMember[];
