import {Address, getContract, GetContractReturnType, PublicClient, WalletClient} from "viem";
import {TRUSTED_HINT_REGISTRY_ABI} from "@spherity/trusted-hint-registry";
import {getDeployment} from "./utils";

interface WalletClientOnly {
  walletClient: WalletClient;
  readClient?: never;
  registryAddress?: Address;
  metaTransactionWalletClient?: WalletClient;
}

interface ReadClientOnly {
  walletClient?: never;
  readClient: PublicClient;
  registryAddress?: Address;
  metaTransactionWalletClient?: WalletClient;
}

type TrustedHintControllerConfig = WalletClientOnly | ReadClientOnly;

type Bytes32Hex = `0x${string}`;

export class TrustedHintController {
  readonly readClient?: PublicClient;
  readonly walletClient?: WalletClient;
  readonly metaTransactionWalletClient?: WalletClient;
  private readonly contract: GetContractReturnType<
    typeof TRUSTED_HINT_REGISTRY_ABI,
    { public: PublicClient, wallet: WalletClient }
  >

  constructor(config: TrustedHintControllerConfig) {
    let deploymentAddress: Address;
    this.readClient = config.readClient;
    this.walletClient = config.walletClient;
    this.metaTransactionWalletClient = config.metaTransactionWalletClient;

    if (!this.readClient && !this.walletClient) {
      throw new Error(`Either readClient or walletClient must be provided`)
    }

    if (!config.registryAddress) {
      const deployment = getDeployment(this.readClient ?? this.walletClient!, 'proxy')
      deploymentAddress = deployment.registry as Address;
    } else {
      deploymentAddress = config.registryAddress;
    }

    this.contract = getContract({
      address: deploymentAddress,
      abi: TRUSTED_HINT_REGISTRY_ABI,
      client: this.readClient ?? this.walletClient!,
    })
  }

  private async getEIP712Domain() {
    if (!this.metaTransactionWalletClient?.chain) {
      throw new Error(`WalletClient must have a chain set.`)
    }
    return {
      name: 'TrustedHintRegistry',
      version: await this.contract.read.version(),
      chainId: this.metaTransactionWalletClient?.chain?.id,
      verifyingContract: this.contract.address
    }
  }

  /**
   * Returns the hint value for the given namespace, list and key.
   * @param namespace The namespace of the hint.
   * @param list The list of the hint.
   * @param key The key of the hint.
   */
  async getHint(namespace: Address, list: Bytes32Hex, key: Bytes32Hex): Promise<Bytes32Hex> {
    return this.contract.read.getHint([
      namespace,
      list,
      key
    ])
  }

  /**
   * Sets the hint value for the given namespace, list and key.
   * This is a write operation and requires a wallet client to be set.
   * @param namespace The namespace of the hint.
   * @param list The list of the hint.
   * @param key The key of the hint.
   * @param value The value of the hint.
   */
  async setHint(namespace: Address, list: Bytes32Hex, key: Bytes32Hex, value: Bytes32Hex) {
    if (!this.walletClient?.chain || !this.walletClient?.account) {
      throw new Error(`WalletClient must have a chain and account set.`)
    }
    return this.contract.write.setHint([namespace, list, key, value], {
      chain: this.walletClient.chain,
      account: this.walletClient.account,
    })
  }

  /**
   * Sets the hint value for the given namespace, list and key via a meta transaction.
   * This is a write operation and requires a wallet client and a meta transaction wallet client to be set. The meta
   * transaction wallet client provides a signed EIP712 signature to the wallet client to carry out the transaction for
   * it.
   * @param namespace The namespace of the hint.
   * @param list The list of the hint.
   * @param key The key of the hint.
   * @param value The value of the hint.
   */
  async setHintSigned(namespace: Address, list: Bytes32Hex, key: Bytes32Hex, value: Bytes32Hex) {
    if (!this.metaTransactionWalletClient || !this.metaTransactionWalletClient.account) {
      throw new Error(`metaTransactionWalletClient must be set when creating a TrustedHintController instance`)
    }
    if (!this.walletClient?.chain || !this.walletClient?.account) {
      throw new Error(`WalletClient must have a chain and account set.`)
    }
    if (this.metaTransactionWalletClient.chain !== this.walletClient.chain) {
      throw new Error(`Provided WalletClient and MetaTransactionWalletClient must be on the same chain.`)
    }

    const signature = await this.metaTransactionWalletClient.signTypedData({
      account: this.metaTransactionWalletClient.account,
      domain: await this.getEIP712Domain(),
      types: {
        SetHintSigned: [
          {name: 'namespace', type: 'address'},
          {name: 'list', type: 'bytes32'},
          {name: 'key', type: 'bytes32'},
          {name: 'metadata', type: 'bytes'},
          {name: 'signer', type: 'address'},
          {name: 'nonce', type: 'uint256'},
        ],
      },
      primaryType: 'SetHintSigned',
      message: {
        namespace,
        list,
        key,
        metadata: value,
        signer: this.metaTransactionWalletClient.account.address,
        nonce: await this.contract.read.nonces([this.metaTransactionWalletClient.account.address])
      }
    })

    return this.contract.write.setHintSigned([namespace, list, key, value, this.metaTransactionWalletClient.account.address, signature], {
      chain: this.walletClient.chain,
      account: this.walletClient.account,
    })
  }
}

