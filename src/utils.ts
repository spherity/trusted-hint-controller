import {Client} from "viem";
import {deployments} from "@spherity/trusted-hint-registry";

export function getDeployment(client: Client, type: string) {
  const chainId = client.chain?.id;
  if (!chainId) {
    throw new Error(`No chainId found in provided readClient`)
  }

  const deployment =  deployments.find(d => d.chainId === chainId && d.type === type);
  if (!deployment) {
    throw new Error(`No deployment found for chainId ${chainId} and type ${type}`)
  }
  return deployment;
}

export enum SignedDataType {
  SetHintSigned,
  SetHintSignedMetadata
}

export function getSignedDataType(type: SignedDataType) {
  switch (type) {
    case SignedDataType.SetHintSigned:
      return {
        SetHintSigned: [
          {name: 'namespace', type: 'address'},
          {name: 'list', type: 'bytes32'},
          {name: 'key', type: 'bytes32'},
          {name: 'value', type: 'bytes32'},
          {name: 'signer', type: 'address'},
          {name: 'nonce', type: 'uint256'},
        ],
      }
    case SignedDataType.SetHintSignedMetadata:
      return {
        SetHintSigned: [
          {name: 'namespace', type: 'address'},
          {name: 'list', type: 'bytes32'},
          {name: 'key', type: 'bytes32'},
          {name: 'value', type: 'bytes32'},
          {name: 'metadata', type: 'bytes'},
          {name: 'signer', type: 'address'},
          {name: 'nonce', type: 'uint256'},
        ],
      }
    default:
      throw new Error(`Unknown signed data type ${type}`)
  }
}