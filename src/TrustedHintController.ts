import {
  Address, encodePacked,
  getContract,
  GetContractReturnType, keccak256,
  PublicClient,
  WalletClient
} from "viem";
import {TRUSTED_HINT_REGISTRY_ABI} from "@spherity/trusted-hint-registry";
import {getDeployment, getSignedDataType, SignedDataType} from "./utils";
import {
  ClientMisconfiguredError,
  ClientNotSetError,
  DelegateManagementError,
  HintSetError, ListOwnerError, ListStatusError, MetadataOperationError,
  NotDelegateError,
  NotOwnerError
} from "./errors";

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

export type TrustedHintControllerConfig = WalletClientOnly | ReadClientOnly;

export type BytesHex = `0x${string}`;

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
      throw new ClientNotSetError('WalletClient or ReadClient')
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
      throw new ClientMisconfiguredError(`WalletClient must have a chain set.`)
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
   * Sets the hint value for the given namespace, list and key. Optionally, a metadata value can be provided.
   *
   * This is a write operation and requires a wallet client to be set.
   * @param namespace The namespace of the hint.
   * @param list The list of the hint.
   * @param key The key of the hint.
   * @param value The value of the hint.
   * @param [metadata] The optional metadata value of the hint.
   * @returns The transaction hash of the meta transaction.
   */
  async setHint(namespace: Address, list: BytesHex, key: BytesHex, value: BytesHex, metadata?: BytesHex) {
    if (!this.walletClient?.chain || !this.walletClient?.account) {
      throw new ClientMisconfiguredError(`WalletClient must have a chain and account set.`)
    }

    try {
      const isOwner = await this.isListOwner(namespace, list, this.walletClient.account.address)
      if (!isOwner) {
        throw new NotOwnerError("WalletClient")
      }

      if (metadata) {
        return this.contract.write.setHint([namespace, list, key, value, metadata], {
          chain: this.walletClient.chain,
          account: this.walletClient.account,
        })
      } else {
        return this.contract.write.setHint([namespace, list, key, value], {
          chain: this.walletClient.chain,
          account: this.walletClient.account,
        })
      }
    } catch (e: any) {
      throw new HintSetError(e.message);
    }
  }

  /**
   * Sets the hint value for the given namespace, list and key via a meta transaction. Optionally, a metadata value can
   * be provided.
   *
   * This is a write operation and requires a wallet client and a meta transaction wallet client to be set. The meta
   * transaction wallet client provides a signed EIP712 signature to the wallet client to carry out the transaction for
   * it.
   * @param namespace The namespace of the hint.
   * @param list The list of the hint.
   * @param key The key of the hint.
   * @param value The value of the hint.
   * @param [metadata] The optional metadata value of the hint.
   * @returns The transaction hash of the meta transaction.
   */
  async setHintSigned(namespace: Address, list: BytesHex, key: BytesHex, value: BytesHex, metadata?: BytesHex) {
    if (!this.metaTransactionWalletClient || !this.metaTransactionWalletClient.account) {
      throw new ClientNotSetError("MetaTransactionWalletClient")
    }
    if (!this.walletClient?.chain || !this.walletClient?.account) {
      throw new ClientMisconfiguredError(`WalletClient must have a chain and account set.`)
    }
    if (this.metaTransactionWalletClient.chain?.id != this.walletClient.chain?.id) {
      throw new ClientMisconfiguredError(`Provided WalletClient and MetaTransactionWalletClient must be on the same chain.`)
    }

    try {
      const metaSigner = this.metaTransactionWalletClient.account
      const signerIsOwner = await this.isListOwner(namespace, list, metaSigner.address)
      if (!signerIsOwner) {
        throw new NotOwnerError("MetaTransactionWalletClient")
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
      throw new HintSetError(`Failed to set hint signed: ${e.message}`)
    }
  }

  /**
   * Batch sets the hint values for the given namespace, list and keys. Optionally, an array of metadata values can be
   * provided.
   *
   * This is a write operation and requires a wallet client.
   * @param namespace The namespace of the hint.
   * @param list The list of the hint.
   * @param keys The keys of the hint.
   * @param values The values of the hint.
   * @param [metadata] The optional metadata values of the hint.
   * @returns The transaction hash of the meta transaction.
   */
  async setHints(namespace: Address, list: BytesHex, keys: BytesHex[], values: BytesHex[], metadata?: BytesHex[]) {
    if (!this.walletClient?.chain || !this.walletClient?.account) {
      throw new ClientMisconfiguredError(`WalletClient must have a chain and account set.`)
    }

    try {
      const isOwner = await this.isListOwner(namespace, list, this.walletClient.account.address)
      if (!isOwner) {
        throw new NotOwnerError("WalletClient")
      }

      if (metadata) {
        return this.contract.write.setHints([namespace, list, keys, values, metadata], {
          chain: this.walletClient.chain,
          account: this.walletClient.account,
        })
      } else {
        return this.contract.write.setHints([namespace, list, keys, values], {
          chain: this.walletClient.chain,
          account: this.walletClient.account,
        })
      }
    } catch (e: any) {
      throw new HintSetError(`Failed to set hints: ${e.message}`)
    }
  }

  /**
   * Batch sets the hint values for the given namespace, list and keys via a meta transaction. Optionally, an array of
   * metadata values can be provided.
   *
   * This is a write operation and requires a wallet client and a meta transaction wallet client to be set. The meta
   * transaction wallet client provides a signed EIP712 signature to the wallet client to carry out the transaction for
   * it.
   * @param namespace The namespace of the hint.
   * @param list The list of the hint.
   * @param keys The keys of the hint.
   * @param values The values of the hint.
   * @param [metadata] The optional metadata values of the hint.
   * @returns The transaction hash of the meta transaction.
   */
  async setHintsSigned(namespace: Address, list: BytesHex, keys: BytesHex[], values: BytesHex[], metadata?: BytesHex[]) {
    if (!this.metaTransactionWalletClient || !this.metaTransactionWalletClient.account) {
      throw new ClientNotSetError("MetaTransactionWalletClient")
    }
    if (!this.walletClient?.chain || !this.walletClient?.account) {
      throw new ClientMisconfiguredError(`WalletClient must have a chain and account set.`)
    }
    if (this.metaTransactionWalletClient.chain?.id != this.walletClient.chain?.id) {
      throw new ClientMisconfiguredError(`Provided WalletClient and MetaTransactionWalletClient must be on the same chain.`)
    }

    try {
      const metaSigner = this.metaTransactionWalletClient.account
      const signerIsOwner = await this.isListOwner(namespace, list, metaSigner.address)
      if (!signerIsOwner) {
        throw new NotOwnerError("MetaTransactionWalletClient")
      }

      const signerNonce = await this.contract.read.nonces([metaSigner.address])
      const type = metadata
        ? getSignedDataType(SignedDataType.SetHintsSignedMetadata)
        : getSignedDataType(SignedDataType.SetHintsSigned)
      const message = metadata
        ? { namespace, list, keys, values, metadata, signer: metaSigner.address, nonce: signerNonce }
        : { namespace, list, keys, values, signer: metaSigner.address, nonce: signerNonce }

      const domain = await this.getEIP712Domain()
      const signature = await this.metaTransactionWalletClient.signTypedData({
        account: metaSigner,
        domain,
        types: type,
        primaryType: 'SetHintsSigned',
        message: message
      })

      if (metadata) {
        return this.contract.write.setHintsSigned(
          [namespace, list, keys, values, metadata, metaSigner.address, signature],
          { chain: this.walletClient.chain, account: this.walletClient.account }
        )
      } else {
        return this.contract.write.setHintsSigned(
          [namespace, list, keys, values, metaSigner.address, signature],
          { chain: this.walletClient.chain, account: this.walletClient.account }
        )
      }
    } catch (e: any) {
      throw new HintSetError(`Failed to set hints signed: ${e.message}`)
    }
  }

  /**
   * Sets the hint value for the given namespace, list and key as a delegate. Optionally, a metadata value can be
   * provided.
   *
   * This is a write operation and requires a wallet client to be set. The wallet client must be a delegate of the
   * namespace.
   * @param namespace The namespace of the hint.
   * @param list The list of the hint.
   * @param key The key of the hint.
   * @param value The value of the hint.
   * @param [metadata] The optional metadata value of the hint.
   * @returns The transaction hash of the meta transaction.
   */
  async setHintDelegated(namespace: Address, list: BytesHex, key: BytesHex, value: BytesHex, metadata?: BytesHex) {
    if (!this.walletClient?.chain || !this.walletClient?.account) {
      throw new ClientMisconfiguredError(`WalletClient must have a chain and account set.`)
    }

    try {
      const isDelegate = await this.isListDelegate(namespace, list, this.walletClient.account.address)
      if (!isDelegate) {
        throw new NotDelegateError("WalletClient")
      }

      if (metadata) {
        return this.contract.write.setHintDelegated([namespace, list, key, value, metadata], {
          chain: this.walletClient.chain,
          account: this.walletClient.account,
        })
      } else {
        return this.contract.write.setHintDelegated([namespace, list, key, value], {
          chain: this.walletClient.chain,
          account: this.walletClient.account,
        })
      }
    } catch (e: any) {
      throw new HintSetError(`Failed to set hint delegated: ${e.message}`)
    }
  }

  /**
   * Sets the hint value for the given namespace, list and key as a delegate via a meta transaction. Optionally, a
   * metadata value can be provided.
   *
   * This is a write operation and requires a wallet client and a meta transaction wallet client to be set. The meta
   * transaction wallet client provides a signed EIP712 signature to the wallet client to carry out the transaction for
   * it.
   * @param namespace The namespace of the hint.
   * @param list The list of the hint.
   * @param key The key of the hint.
   * @param value The value of the hint.
   * @param [metadata] The optional metadata value of the hint.
   * @returns The transaction hash of the meta transaction.
   */
  async setHintDelegatedSigned(namespace: Address, list: BytesHex, key: BytesHex, value: BytesHex, metadata?: BytesHex) {
    if (!this.metaTransactionWalletClient || !this.metaTransactionWalletClient.account) {
      throw new ClientNotSetError("MetaTransactionWalletClient")
    }
    if (!this.walletClient?.chain || !this.walletClient?.account) {
      throw new ClientMisconfiguredError(`WalletClient must have a chain and account set.`)
    }
    if (this.metaTransactionWalletClient.chain?.id != this.walletClient.chain?.id) {
      throw new ClientMisconfiguredError(`Provided WalletClient and MetaTransactionWalletClient must be on the same chain.`)
    }

    try {
      const metaSigner = this.metaTransactionWalletClient.account
      const signerIsDelegate = await this.isListDelegate(namespace, list, metaSigner.address)
      if (!signerIsDelegate) {
        throw new NotDelegateError("MetaTransactionWalletClient")
      }

      const signerNonce = await this.contract.read.nonces([metaSigner.address])
      const type = metadata
        ? getSignedDataType(SignedDataType.SetHintDelegatedSignedMetadata)
        : getSignedDataType(SignedDataType.SetHintDelegatedSigned)
      const message = metadata
        ? { namespace, list, key, value, metadata, signer: metaSigner.address, nonce: signerNonce }
        : { namespace, list, key, value, signer: metaSigner.address, nonce: signerNonce }

      const domain = await this.getEIP712Domain()
      const signature = await this.metaTransactionWalletClient.signTypedData({
        account: metaSigner,
        domain,
        types: type,
        primaryType: 'SetHintDelegatedSigned',
        message: message
      })

      if (metadata) {
        return this.contract.write.setHintDelegatedSigned(
          [namespace, list, key, value, metadata, metaSigner.address, signature],
          { chain: this.walletClient.chain, account: this.walletClient.account }
        )
      } else {
        return this.contract.write.setHintDelegatedSigned(
          [namespace, list, key, value, metaSigner.address, signature],
          { chain: this.walletClient.chain, account: this.walletClient.account }
        )
      }
    } catch (e: any) {
      throw new HintSetError(`Failed to set hint delegate signed: ${e.message}`)
    }
  }

  /**
   * Batch sets the hint values for the given namespace, list and keys as a delegate. Optionally, an array of metadata
   * values can be provided.
   *
   * This is a write operation and requires a wallet client to be set. The wallet client must be a delegate of the
   * namespace.
   * @param namespace The namespace of the hint.
   * @param list The list of the hint.
   * @param keys The keys of the hint.
   * @param values The values of the hint.
   * @param [metadata] The optional metadata values of the hint.
   * @returns The transaction hash of the meta transaction.
   */
  async setHintsDelegated(namespace: Address, list: BytesHex, keys: BytesHex[], values: BytesHex[], metadata?: BytesHex[]) {
    if (!this.walletClient?.chain || !this.walletClient?.account) {
      throw new ClientMisconfiguredError(`WalletClient must have a chain and account set.`)
    }

    try {
      const isDelegate = await this.isListDelegate(namespace, list, this.walletClient.account.address)
      if (!isDelegate) {
        throw new NotDelegateError("WalletClient")
      }

      if (metadata) {
        return this.contract.write.setHintsDelegated([namespace, list, keys, values, metadata], {
          chain: this.walletClient.chain,
          account: this.walletClient.account,
        })
      } else {
        return this.contract.write.setHintsDelegated([namespace, list, keys, values], {
          chain: this.walletClient.chain,
          account: this.walletClient.account,
        })
      }
    } catch (e: any) {
      throw new HintSetError(`Failed to set hints delegated: ${e.message}`)
    }
  }

  /**
   * Batch sets the hint values for the given namespace, list and keys as a delegate via a meta transaction. Optionally,
   * an array of metadata values can be provided.
   *
   * This is a write operation and requires a wallet client and a meta transaction wallet client to be set. The meta
   * transaction wallet client provides a signed EIP712 signature to the wallet client to carry out the transaction for
   * it.
   * @param namespace The namespace of the hint.
   * @param list The list of the hint.
   * @param keys The keys of the hint.
   * @param values The values of the hint.
   * @param [metadata] The optional metadata values of the hint.
   */
  async setHintsDelegatedSigned(namespace: Address, list: BytesHex, keys: BytesHex[], values: BytesHex[], metadata?: BytesHex[]) {
    if (!this.metaTransactionWalletClient || !this.metaTransactionWalletClient.account) {
      throw new ClientNotSetError(`MetaTransactionWalletClient`)
    }
    if (!this.walletClient?.chain || !this.walletClient?.account) {
      throw new ClientMisconfiguredError(`WalletClient must have a chain and account set.`)
    }
    if (this.metaTransactionWalletClient.chain?.id != this.walletClient.chain?.id) {
      throw new ClientMisconfiguredError(`Provided WalletClient and MetaTransactionWalletClient must be on the same chain.`)
    }

    try {
      const metaSigner = this.metaTransactionWalletClient.account
      const signerIsDelegate = await this.isListDelegate(namespace, list, metaSigner.address)
      if (!signerIsDelegate) {
        throw new NotDelegateError("MetaTransactionWalletClient")
      }

      const signerNonce = await this.contract.read.nonces([metaSigner.address])
      const type = metadata
        ? getSignedDataType(SignedDataType.SetHintsDelegatedSignedMetadata)
        : getSignedDataType(SignedDataType.SetHintsDelegatedSigned)
      const message = metadata
        ? { namespace, list, keys, values, metadata, signer: metaSigner.address, nonce: signerNonce }
        : { namespace, list, keys, values, signer: metaSigner.address, nonce: signerNonce }

      const domain = await this.getEIP712Domain()
      const signature = await this.metaTransactionWalletClient.signTypedData({
        account: metaSigner,
        domain,
        types: type,
        primaryType: 'SetHintsDelegatedSigned',
        message: message
      })

      if (metadata) {
        return this.contract.write.setHintsDelegatedSigned(
          [namespace, list, keys, values, metadata, metaSigner.address, signature],
          { chain: this.walletClient.chain, account: this.walletClient.account }
        )
      } else {
        return this.contract.write.setHintsDelegatedSigned(
          [namespace, list, keys, values, metaSigner.address, signature],
          { chain: this.walletClient.chain, account: this.walletClient.account }
        )
      }
    } catch (e: any) {
      throw new HintSetError(`Failed to set hints delegate signed: ${e.message}`)
    }
  }

  ///////////////////////////////////////// LIST MANAGEMENT /////////////////////////////////////////

  /**
   * Check the delegate status of an address in a list.
   * @param namespace The namespace of the list.
   * @param list The list.
   * @param delegate The delegate in question.
   * @returns A boolean indicating whether the given address is a delegate of the given list in the namespace.
   */
  async isListDelegate(namespace: Address, list: BytesHex, delegate: Address): Promise<boolean> {
    return this.contract.read.identityIsDelegate([namespace, list, delegate])
  }

  /**
   * Check the owner status of an address in a list.
   * @param namespace The namespace of the list.
   * @param list The list.
   * @param owner The owner in question.
   * @returns A boolean indicating whether the given address is the owner of the given list in the namespace.
   */
  async isListOwner(namespace: Address, list: BytesHex, owner: Address): Promise<boolean> {
    return this.contract.read.identityIsOwner([namespace, list, owner])
  }

  /**
   * Check if a list is revoked.
   * @param namespace The namespace of the list.
   * @param list The list.
   * @returns A boolean indicating whether the given list is revoked in the namespace.
   */
  async isListRevoked(namespace: Address, list: BytesHex): Promise<boolean> {
    const listLocationHash = keccak256(encodePacked(['address', 'bytes32'], [namespace, list]))
    return this.contract.read.revokedLists([listLocationHash])
  }

  /**
   * Add a delegate to a list.
   * @param namespace The namespace of the list.
   * @param list The list.
   * @param delegate The delegate to add.
   * @param delegateUntil The timestamp until which the delegate is valid.
   * @returns The transaction hash of the meta transaction.
   */
  async addListDelegate(namespace: Address, list: BytesHex, delegate: Address, delegateUntil: number | bigint) {
    if (!this.walletClient?.chain || !this.walletClient?.account) {
      throw new ClientMisconfiguredError(`WalletClient must have a chain and account set.`)
    }

    try {
      const isOwner = await this.isListOwner(namespace, list, this.walletClient.account.address)
      if (!isOwner) {
        throw new NotOwnerError("WalletClient")
      }

      return this.contract.write.addListDelegate([namespace, list, delegate, BigInt(delegateUntil)], {
        chain: this.walletClient.chain,
        account: this.walletClient.account,
      })
    } catch (e: any) {
      throw new DelegateManagementError("add", e.message)
    }
  }

  /**
   * Add a delegate to a list via a meta transaction.
   *
   * This is a write operation and requires a wallet client and a meta transaction wallet client to be set. The meta
   * transaction wallet client provides a signed EIP712 signature to the wallet client to carry out the transaction for
   * it.
   * @param namespace The namespace of the list.
   * @param list The list.
   * @param delegate The delegate to add.
   * @param delegateUntil The timestamp until which the delegate is valid.
   * @returns The transaction hash of the meta transaction.
   */
  async addListDelegateSigned(namespace: Address, list: BytesHex, delegate: Address, delegateUntil: number | bigint) {
    if (!this.metaTransactionWalletClient || !this.metaTransactionWalletClient.account) {
      throw new ClientNotSetError("MetaTransactionWalletClient")
    }
    if (!this.walletClient?.chain || !this.walletClient?.account) {
      throw new ClientMisconfiguredError(`WalletClient must have a chain and account set.`)
    }
    if (this.metaTransactionWalletClient.chain?.id != this.walletClient.chain?.id) {
      throw new ClientMisconfiguredError(`Provided WalletClient and MetaTransactionWalletClient must be on the same chain.`)
    }

    try {
      const metaSigner = this.metaTransactionWalletClient.account
      const signerIsOwner = await this.isListOwner(namespace, list, metaSigner.address)
      if (!signerIsOwner) {
        throw new NotOwnerError("MetaTransactionWalletClient")
      }

      const signerNonce = await this.contract.read.nonces([metaSigner.address])
      const type = getSignedDataType(SignedDataType.AddListDelegateSigned)
      const message = { namespace, list, delegate, untilTimestamp: delegateUntil, signer: metaSigner.address, nonce: signerNonce }

      const domain = await this.getEIP712Domain()
      const signature = await this.metaTransactionWalletClient.signTypedData({
        account: metaSigner,
        domain,
        types: type,
        primaryType: 'AddListDelegateSigned',
        message: message
      })

      return this.contract.write.addListDelegateSigned(
        [namespace, list, delegate, BigInt(delegateUntil), metaSigner.address, signature],
        { chain: this.walletClient.chain, account: this.walletClient.account }
      )
    } catch (e: any) {
      throw new DelegateManagementError("add", e.message)
    }
  }

  /**
   * Remove a delegate from a list.
   * @param namespace The namespace of the list.
   * @param list The list.
   * @param delegate The delegate to remove.
   * @returns The transaction hash of the meta transaction.
   */
  async removeListDelegate(namespace: Address, list: BytesHex, delegate: Address) {
    if (!this.walletClient?.chain || !this.walletClient?.account) {
      throw new ClientMisconfiguredError(`WalletClient must have a chain and account set.`)
    }

    try {
      const isOwner = await this.isListOwner(namespace, list, this.walletClient.account.address)
      if (!isOwner) {
        throw new NotOwnerError("WalletClient")
      }

      return this.contract.write.removeListDelegate([namespace, list, delegate], {
        chain: this.walletClient.chain,
        account: this.walletClient.account,
      })
    } catch (e: any) {
      throw new DelegateManagementError("remove", e.message)
    }
  }

  /**
   * Remove a delegate from a list via a meta transaction.
   *
   * This is a write operation and requires a wallet client and a meta transaction wallet client to be set. The meta
   * transaction wallet client provides a signed EIP712 signature to the wallet client to carry out the transaction for
   * it.
   * @param namespace The namespace of the list.
   * @param list The list.
   * @param delegate The delegate to remove.
   * @returns The transaction hash of the meta transaction.
   */
  async removeListDelegateSigned(namespace: Address, list: BytesHex, delegate: Address) {
    if (!this.metaTransactionWalletClient || !this.metaTransactionWalletClient.account) {
      throw new ClientNotSetError("MetaTransactionWalletClient")
    }
    if (!this.walletClient?.chain || !this.walletClient?.account) {
      throw new ClientMisconfiguredError(`WalletClient must have a chain and account set.`)
    }
    if (this.metaTransactionWalletClient.chain?.id != this.walletClient.chain?.id) {
      throw new ClientMisconfiguredError(`Provided WalletClient and MetaTransactionWalletClient must be on the same chain.`)
    }

    try {
      const metaSigner = this.metaTransactionWalletClient.account
      const signerIsOwner = await this.isListOwner(namespace, list, metaSigner.address)
      if (!signerIsOwner) {
        throw new NotOwnerError("MetaTransactionWalletClient")
      }

      const signerNonce = await this.contract.read.nonces([metaSigner.address])
      const type = getSignedDataType(SignedDataType.RemoveListDelegateSigned)
      const message = {namespace, list, delegate, signer: metaSigner.address, nonce: signerNonce}

      const domain = await this.getEIP712Domain()
      const signature = await this.metaTransactionWalletClient.signTypedData({
        account: metaSigner,
        domain,
        types: type,
        primaryType: 'RemoveListDelegateSigned',
        message: message
      })

      return this.contract.write.removeListDelegateSigned(
        [namespace, list, delegate, metaSigner.address, signature],
        {chain: this.walletClient.chain, account: this.walletClient.account}
      )
    } catch (e: any) {
      throw new DelegateManagementError("remove", e.message)
    }
  }

  /**
   * Set the status of a list. If revoked is true, the list is revoked. If revoked is false, the list is active.
   *
   * This is a write operation and requires a wallet client to be set. The wallet client must be the owner of the
   * namespace.
   * @param namespace The namespace of the list.
   * @param list The list.
   * @param revoked The new status of the list.
   * @returns The transaction hash of the meta transaction.
   */
  async setListStatus(namespace: Address, list: BytesHex, revoked: boolean) {
    if (!this.walletClient?.chain || !this.walletClient?.account) {
      throw new ClientMisconfiguredError(`WalletClient must have a chain and account set.`)
    }

    try {
      const isOwner = await this.isListOwner(namespace, list, this.walletClient.account.address)
      if (!isOwner) {
        throw new NotOwnerError("WalletClient")
      }

      return this.contract.write.setListStatus([namespace, list, revoked], {
        chain: this.walletClient.chain,
        account: this.walletClient.account,
      })
    } catch (e: any) {
      throw new ListStatusError(e.message)
    }
  }

  /**
   * Set the status of a list via a meta transaction. If revoked is true, the list is revoked. If revoked is false, the
   * list is active.
   *
   * This is a write operation and requires a wallet client and a meta transaction wallet client to be set. The meta
   * transaction wallet client provides a signed EIP712 signature to the wallet client to carry out the transaction for
   * it.
   * @param namespace The namespace of the list.
   * @param list The list.
   * @param revoked The new status of the list.
   * @returns The transaction hash of the meta transaction.
   */
  async setListStatusSigned(namespace: Address, list: BytesHex, revoked: boolean) {
    if (!this.metaTransactionWalletClient || !this.metaTransactionWalletClient.account) {
      throw new ClientNotSetError("MetaTransactionWalletClient")
    }
    if (!this.walletClient?.chain || !this.walletClient?.account) {
      throw new ClientMisconfiguredError(`WalletClient must have a chain and account set.`)
    }
    if (this.metaTransactionWalletClient.chain?.id != this.walletClient.chain?.id) {
      throw new ClientMisconfiguredError(`Provided WalletClient and MetaTransactionWalletClient must be on the same chain.`)
    }

    try {
      const metaSigner = this.metaTransactionWalletClient.account
      const signerIsOwner = await this.isListOwner(namespace, list, metaSigner.address)
      if (!signerIsOwner) {
        throw new NotOwnerError("MetaTransactionWalletClient")
      }

      const signerNonce = await this.contract.read.nonces([metaSigner.address])
      const type = getSignedDataType(SignedDataType.SetListStatusSigned)
      const message = {namespace, list, revoked, signer: metaSigner.address, nonce: signerNonce}

      const domain = await this.getEIP712Domain()
      const signature = await this.metaTransactionWalletClient.signTypedData({
        account: metaSigner,
        domain,
        types: type,
        primaryType: 'SetListStatusSigned',
        message: message
      })

      return this.contract.write.setListStatusSigned(
        [namespace, list, revoked, metaSigner.address, signature],
        {chain: this.walletClient.chain, account: this.walletClient.account}
      )
    } catch (e: any) {
      throw new ListStatusError(e.message)
    }
  }

  /**
   * Set the owner of a list.
   *
   * This is a write operation and requires a wallet client to be set. The wallet client must be the owner of the
   * namespace.
   * @param namespace The namespace of the list.
   * @param list The list.
   * @param newOwner The new owner of the list.
   * @returns The transaction hash of the meta transaction.
   */
  async setListOwner(namespace: Address, list: BytesHex, newOwner: Address) {
    if (!this.walletClient?.chain || !this.walletClient?.account) {
      throw new ClientMisconfiguredError(`WalletClient must have a chain and account set.`)
    }

    try {
      const isOwner = await this.isListOwner(namespace, list, this.walletClient.account.address)
      if (!isOwner) {
        throw new NotOwnerError("WalletClient")
      }

      return this.contract.write.setListOwner([namespace, list, newOwner], {
        chain: this.walletClient.chain,
        account: this.walletClient.account,
      })
    } catch (e: any) {
      throw new ListOwnerError(e.message)
    }
  }

  /**
   * Set a new owner of a list via a meta transaction.
   *
   * This is a write operation and requires a wallet client and a meta transaction wallet client to be set. The meta
   * transaction wallet client provides a signed EIP712 signature to the wallet client to carry out the transaction for
   * it.
   * @param namespace The namespace of the list.
   * @param list The list.
   * @param newOwner The new owner of the list.
   * @returns The transaction hash of the meta transaction.
   */
  async setListOwnerSigned(namespace: Address, list: BytesHex, newOwner: Address) {
    if (!this.metaTransactionWalletClient || !this.metaTransactionWalletClient.account) {
      throw new ClientNotSetError("MetaTransactionWalletClient")
    }
    if (!this.walletClient?.chain || !this.walletClient?.account) {
      throw new ClientMisconfiguredError(`WalletClient must have a chain and account set.`)
    }
    if (this.metaTransactionWalletClient.chain?.id != this.walletClient.chain?.id) {
      throw new ClientMisconfiguredError(`Provided WalletClient and MetaTransactionWalletClient must be on the same chain.`)
    }

    try {
      const metaSigner = this.metaTransactionWalletClient.account
      const signerIsOwner = await this.isListOwner(namespace, list, metaSigner.address)
      if (!signerIsOwner) {
        throw new NotOwnerError("MetaTransactionWalletClient")
      }

      const signerNonce = await this.contract.read.nonces([metaSigner.address])
      const type = getSignedDataType(SignedDataType.SetListOwnerSigned)
      const message = {namespace, list, newOwner, signer: metaSigner.address, nonce: signerNonce}

      const domain = await this.getEIP712Domain()
      const signature = await this.metaTransactionWalletClient.signTypedData({
        account: metaSigner,
        domain,
        types: type,
        primaryType: 'SetListOwnerSigned',
        message: message
      })

      return this.contract.write.setListOwnerSigned(
        [namespace, list, newOwner, metaSigner.address, signature],
        {chain: this.walletClient.chain, account: this.walletClient.account}
      )
    } catch (e: any) {
      throw new ListOwnerError(e.message)
    }
  }

  ///////////////////////////////////////// METADATA MANAGEMENT /////////////////////////////////////////

  /**
   * Returns the metadata value for the given namespace, list, key and value combination.
   * @param namespace The namespace of the metadata.
   * @param list The list of the metadata.
   * @param key The key of the metadata.
   * @param value The value of the metadata.
   * @returns The raw bytes metadata value.
   */
  async getMetadata(namespace: Address, list: BytesHex, key: BytesHex, value: BytesHex): Promise<BytesHex> {
    return this.contract.read.getMetadata([
      namespace,
      list,
      key,
      value
    ])
  }

  /**
   * Sets the metadata value for the given namespace, list, key and value combination.
   *
   * This is a write operation and requires a wallet client to be set. The wallet client must be the owner of the
   * namespace.
   * @param namespace The namespace of the metadata.
   * @param list The list of the metadata.
   * @param key The key of the metadata.
   * @param value The value of the metadata.
   * @param metadata The metadata value.
   * @returns The transaction hash of the meta transaction.
   */
  async setMetadata(namespace: Address, list: BytesHex, key: BytesHex, value: BytesHex, metadata: BytesHex) {
    if (!this.walletClient?.chain || !this.walletClient?.account) {
      throw new ClientMisconfiguredError(`WalletClient must have a chain and account set.`)
    }

    try {
      const isOwner = await this.isListOwner(namespace, list, this.walletClient.account.address)
      if (!isOwner) {
        throw new NotOwnerError("WalletClient")
      }

      return this.contract.write.setMetadata([namespace, list, key, value, metadata], {
        chain: this.walletClient.chain,
        account: this.walletClient.account,
      })
    } catch (e: any) {
      throw new MetadataOperationError(e.message)
    }
  }

  /**
   * Sets the metadata value for the given namespace, list, key and value combination via a meta transaction.
   *
   * This is a write operation and requires a wallet client and a meta transaction wallet client to be set. The meta
   * transaction wallet client provides a signed EIP712 signature to the wallet client to carry out the transaction for
   * it.
   * @param namespace The namespace of the metadata.
   * @param list The list of the metadata.
   * @param key The key of the metadata.
   * @param value The value of the metadata.
   * @param metadata The metadata value.
   * @returns The transaction hash of the meta transaction.
   */
  async setMetadataSigned(namespace: Address, list: BytesHex, key: BytesHex, value: BytesHex, metadata: BytesHex) {
    if (!this.metaTransactionWalletClient || !this.metaTransactionWalletClient.account) {
      throw new ClientNotSetError("MetaTransactionWalletClient")
    }
    if (!this.walletClient?.chain || !this.walletClient?.account) {
      throw new ClientMisconfiguredError(`WalletClient must have a chain and account set.`)
    }
    if (this.metaTransactionWalletClient.chain?.id != this.walletClient.chain?.id) {
      throw new ClientMisconfiguredError(`Provided WalletClient and MetaTransactionWalletClient must be on the same chain.`)
    }

    try {
      const metaSigner = this.metaTransactionWalletClient.account
      const signerIsOwner = await this.isListOwner(namespace, list, metaSigner.address)
      if (!signerIsOwner) {
        throw new NotOwnerError("MetaTransactionWalletClient")
      }

      const signerNonce = await this.contract.read.nonces([metaSigner.address])
      const type = getSignedDataType(SignedDataType.SetMetadataSigned)
      const message = {namespace, list, key, value, metadata, signer: metaSigner.address, nonce: signerNonce}

      const domain = await this.getEIP712Domain()
      const signature = await this.metaTransactionWalletClient.signTypedData({
        account: metaSigner,
        domain,
        types: type,
        primaryType: 'SetMetadataSigned',
        message: message
      })

      return this.contract.write.setMetadataSigned(
        [namespace, list, key, value, metadata, metaSigner.address, signature],
        {chain: this.walletClient.chain, account: this.walletClient.account}
      )
    } catch (e: any) {
      throw new MetadataOperationError(e.message)
    }
  }

  /**
   * Sets the metadata value for the given namespace, list, key and value combination as a delegate.
   *
   * This is a write operation and requires a wallet client to be set. The wallet client must be a delegate of the
   * namespace.
   * @param namespace The namespace of the metadata.
   * @param list The list of the metadata.
   * @param key The key of the metadata.
   * @param value The value of the metadata.
   * @param metadata The metadata value.
   * @returns The transaction hash of the meta transaction.
   */
  async setMetadataDelegated(namespace: Address, list: BytesHex, key: BytesHex, value: BytesHex, metadata: BytesHex) {
    if (!this.walletClient?.chain || !this.walletClient?.account) {
      throw new ClientMisconfiguredError(`WalletClient must have a chain and account set.`)
    }

    try {
      const isDelegate = await this.isListDelegate(namespace, list, this.walletClient.account.address)
      if (!isDelegate) {
        throw new NotDelegateError("WalletClient")
      }

      return this.contract.write.setMetadataDelegated([namespace, list, key, value, metadata], {
        chain: this.walletClient.chain,
        account: this.walletClient.account,
      })
    } catch (e: any) {
      throw new MetadataOperationError(e.message)
    }
  }

  /**
   * Sets the metadata value for the given namespace, list, key and value combination as a delegate via a meta
   * transaction.
   *
   * This is a write operation and requires a wallet client and a meta transaction wallet client to be set. The meta
   * transaction wallet client provides a signed EIP712 signature to the wallet client to carry out the transaction for
   * it.
   * @param namespace The namespace of the metadata.
   * @param list The list of the metadata.
   * @param key The key of the metadata.
   * @param value The value of the metadata.
   * @param metadata The metadata value.
   * @returns The transaction hash of the meta transaction.
   */
  async setMetadataDelegatedSigned(namespace: Address, list: BytesHex, key: BytesHex, value: BytesHex, metadata: BytesHex) {
    if (!this.metaTransactionWalletClient || !this.metaTransactionWalletClient.account) {
      throw new ClientNotSetError("MetaTransactionWalletClient")
    }
    if (!this.walletClient?.chain || !this.walletClient?.account) {
      throw new ClientMisconfiguredError(`WalletClient must have a chain and account set.`)
    }
    if (this.metaTransactionWalletClient.chain?.id != this.walletClient.chain?.id) {
      throw new ClientMisconfiguredError(`Provided WalletClient and MetaTransactionWalletClient must be on the same chain.`)
    }

    try {
      const metaSigner = this.metaTransactionWalletClient.account
      const signerIsDelegate = await this.isListDelegate(namespace, list, metaSigner.address)
      if (!signerIsDelegate) {
        throw new NotDelegateError("MetaTransactionWalletClient")
      }

      const signerNonce = await this.contract.read.nonces([metaSigner.address])
      const type = getSignedDataType(SignedDataType.SetMetadataDelegatedSigned)
      const message = {namespace, list, key, value, metadata, signer: metaSigner.address, nonce: signerNonce}

      const domain = await this.getEIP712Domain()
      const signature = await this.metaTransactionWalletClient.signTypedData({
        account: metaSigner,
        domain,
        types: type,
        primaryType: 'SetMetadataDelegatedSigned',
        message: message
      })

      return this.contract.write.setMetadataDelegatedSigned(
        [namespace, list, key, value, metadata, metaSigner.address, signature],
        {chain: this.walletClient.chain, account: this.walletClient.account}
      )
    } catch (e: any) {
      throw new MetadataOperationError(e.message)
    }
  }
}

