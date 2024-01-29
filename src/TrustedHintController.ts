import {Address, getContract, GetContractReturnType, PublicClient, WalletClient} from "viem";
import {TRUSTED_HINT_REGISTRY_ABI} from "@spherity/trusted-hint-registry";
import {getDeployment, getSignedDataType, SignedDataType} from "./utils";

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

type BytesHex = `0x${string}`;

export class TrustedHintController {
  readonly readClient?: PublicClient;
  readonly walletClient?: WalletClient;
  readonly metaTransactionWalletClient?: WalletClient;
  readonly contract: GetContractReturnType<
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
   * @returns The transaction hash of the meta transaction.
   */
  async getHint(namespace: Address, list: BytesHex, key: BytesHex): Promise<BytesHex> {
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
   * @returns The transaction hash of the meta transaction.
   */
  async setHint(namespace: Address, list: BytesHex, key: BytesHex, value: BytesHex) {
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
   * @returns The transaction hash of the meta transaction.
   */
  async setHintSigned(namespace: Address, list: BytesHex, key: BytesHex, value: BytesHex, metadata?: BytesHex) {
    if (!this.metaTransactionWalletClient || !this.metaTransactionWalletClient.account) {
      throw new Error(`metaTransactionWalletClient must be set when creating a TrustedHintController instance`)
    }
    if (!this.walletClient?.chain || !this.walletClient?.account) {
      throw new Error(`WalletClient must have a chain and account set.`)
    }
    if (this.metaTransactionWalletClient.chain?.id != this.walletClient.chain?.id) {
      throw new Error(`Provided WalletClient and MetaTransactionWalletClient must be on the same chain.`)
    }

    try {
      const metaSigner = this.metaTransactionWalletClient.account
      const signerIsOwner = await this.contract.read.identityIsOwner([
        namespace,
        list,
        metaSigner.address
      ])
      if (!signerIsOwner) {
        throw new Error(`Provided MetaTransactionWalletClient must be the owner of the namespace.`)
      }

      const signerNonce = await this.contract.read.nonces([metaSigner.address])
      const type = metadata
        ? getSignedDataType(SignedDataType.SetHintSignedMetadata)
        : getSignedDataType(SignedDataType.SetHintSigned)
      const message = metadata
        ? { namespace, list, key, value, metadata, signer: metaSigner.address, nonce: signerNonce }
        : { namespace, list, key, value, signer: metaSigner.address, nonce: signerNonce }

      const domain = await this.getEIP712Domain()
      const signature = await this.metaTransactionWalletClient.signTypedData({
        account: metaSigner,
        domain,
        types: type,
        primaryType: 'SetHintSigned',
        message: message
      })

      if (metadata) {
        return this.contract.write.setHintSigned(
          [namespace, list, key, value, metadata, metaSigner.address, signature],
          { chain: this.walletClient.chain, account: this.walletClient.account }
        )
      } else {
        return this.contract.write.setHintSigned(
          [namespace, list, key, value, metaSigner.address, signature],
          { chain: this.walletClient.chain, account: this.walletClient.account }
        )
      }
    } catch (e: any) {
      throw new Error(`Failed to set hint signed: ${e.message}`)
    }
  }
}

