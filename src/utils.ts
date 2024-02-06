import {Client} from "viem";
import {deployments} from "@spherity/trusted-hint-registry";

export function getDeployment(client: Client, type: string) {
  const chainId = client.chain?.id;
  if (!chainId) {
    throw new Error(`No chainId found in provided readClient`)
  }

  const deployment = deployments.find(d => d.chainId === chainId && d.type === type);
  if (!deployment) {
    throw new Error(`No deployment found for chainId ${chainId} and type ${type}`)
  }
  return deployment;
}

export enum SignedDataType {
  SetHintSigned,
  SetHintSignedMetadata,
  SetHintsSigned,
  SetHintsSignedMetadata,
  SetHintDelegatedSigned,
  SetHintDelegatedSignedMetadata,
  SetHintsDelegatedSigned,
  SetHintsDelegatedSignedMetadata,
  AddListDelegateSigned,
  RemoveListDelegateSigned,
  SetListStatusSigned,
  SetListOwnerSigned,
  SetMetadataSigned,
  SetMetadataDelegatedSigned
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
    case SignedDataType.SetHintsSigned:
      return {
        SetHintsSigned: [
          {name: 'namespace', type: 'address'},
          {name: 'list', type: 'bytes32'},
          {name: 'keys', type: 'bytes32[]'},
          {name: 'values', type: 'bytes32[]'},
          {name: 'signer', type: 'address'},
          {name: 'nonce', type: 'uint256'},
        ],
      }
    case SignedDataType.SetHintsSignedMetadata:
      return {
        SetHintsSigned: [
          {name: 'namespace', type: 'address'},
          {name: 'list', type: 'bytes32'},
          {name: 'keys', type: 'bytes32[]'},
          {name: 'values', type: 'bytes32[]'},
          {name: 'metadata', type: 'bytes[]'},
          {name: 'signer', type: 'address'},
          {name: 'nonce', type: 'uint256'},
        ],
      }
    case SignedDataType.SetHintDelegatedSigned:
      return {
        SetHintDelegatedSigned: [
          {name: 'namespace', type: 'address'},
          {name: 'list', type: 'bytes32'},
          {name: 'key', type: 'bytes32'},
          {name: 'value', type: 'bytes32'},
          {name: 'signer', type: 'address'},
          {name: 'nonce', type: 'uint256'},
        ],
      }
    case SignedDataType.SetHintDelegatedSignedMetadata:
      return {
        SetHintDelegatedSigned: [
          {name: 'namespace', type: 'address'},
          {name: 'list', type: 'bytes32'},
          {name: 'key', type: 'bytes32'},
          {name: 'value', type: 'bytes32'},
          {name: 'metadata', type: 'bytes'},
          {name: 'signer', type: 'address'},
          {name: 'nonce', type: 'uint256'},
        ],
      }
    case SignedDataType.SetHintsDelegatedSigned:
      return {
        SetHintsDelegatedSigned: [
          {name: 'namespace', type: 'address'},
          {name: 'list', type: 'bytes32'},
          {name: 'keys', type: 'bytes32[]'},
          {name: 'values', type: 'bytes32[]'},
          {name: 'signer', type: 'address'},
          {name: 'nonce', type: 'uint256'},
        ],
      }
    case SignedDataType.SetHintsDelegatedSignedMetadata:
      return {
        SetHintsDelegatedSigned: [
          {name: 'namespace', type: 'address'},
          {name: 'list', type: 'bytes32'},
          {name: 'keys', type: 'bytes32[]'},
          {name: 'values', type: 'bytes32[]'},
          {name: 'metadata', type: 'bytes[]'},
          {name: 'signer', type: 'address'},
          {name: 'nonce', type: 'uint256'},
        ],
      }
    case SignedDataType.AddListDelegateSigned:
      return {
        AddListDelegateSigned: [
          {name: 'namespace', type: 'address'},
          {name: 'list', type: 'bytes32'},
          {name: 'delegate', type: 'address'},
          {name: 'untilTimestamp', type: 'uint256'},
          {name: 'signer', type: 'address'},
          {name: 'nonce', type: 'uint256'},
        ],
      }
    case SignedDataType.RemoveListDelegateSigned:
      return {
        RemoveListDelegateSigned: [
          {name: 'namespace', type: 'address'},
          {name: 'list', type: 'bytes32'},
          {name: 'delegate', type: 'address'},
          {name: 'signer', type: 'address'},
          {name: 'nonce', type: 'uint256'},
        ],
      }
    case SignedDataType.SetListStatusSigned:
      return {
        SetListStatusSigned: [
          {name: 'namespace', type: 'address'},
          {name: 'list', type: 'bytes32'},
          {name: 'revoked', type: 'bool'},
          {name: 'signer', type: 'address'},
          {name: 'nonce', type: 'uint256'},
        ],
      }
    case SignedDataType.SetListOwnerSigned:
      return {
        SetListOwnerSigned: [
          {name: 'namespace', type: 'address'},
          {name: 'list', type: 'bytes32'},
          {name: 'newOwner', type: 'address'},
          {name: 'signer', type: 'address'},
          {name: 'nonce', type: 'uint256'},
        ],
      }
    case SignedDataType.SetMetadataSigned:
      return {
        SetMetadataSigned: [
          {name: 'namespace', type: 'address'},
          {name: 'list', type: 'bytes32'},
          {name: 'key', type: 'bytes32'},
          {name: 'value', type: 'bytes32'},
          {name: 'metadata', type: 'bytes'},
          {name: 'signer', type: 'address'},
          {name: 'nonce', type: 'uint256'},
        ],
      }
    case SignedDataType.SetMetadataDelegatedSigned:
      return {
        SetMetadataDelegatedSigned: [
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