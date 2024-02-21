import {describe, vi, beforeAll, afterEach, it, expect} from "vitest";
import { TrustedHintController } from "../../src";
import {createPublicClient, createWalletClient} from "viem";
import {BytesHex} from "../../src/TrustedHintController";

const mocks = vi.hoisted(() => {
  return {
    viem: {
      createPublicClient: vi.fn(() => ({
        chain: {
          id: 0,
        },
      })),
      createWalletClient: vi.fn(() => ({
        chain: {
          id: 0,
        },
        account: {
          address: "0x0",
        },
        signTypedData: vi.fn(),
      })),
      getContract: vi.fn(() => ({
        address: "0x0",
        read: {
          getHint: vi.fn(),
          getMetadata: vi.fn(),
          revokedLists: vi.fn(),
          version: vi.fn(),
          nonces: vi.fn(),
          identityIsOwner: vi.fn(),
          identityIsDelegate: vi.fn(),
        },
        write: {
          setHint: vi.fn(),
          setHintSigned: vi.fn(),
          setHints: vi.fn(),
          setHintsSigned: vi.fn(),
          setHintDelegated: vi.fn(),
          setHintDelegatedSigned: vi.fn(),
          setHintsDelegated: vi.fn(),
          setHintsDelegatedSigned: vi.fn(),
          addListDelegate: vi.fn(),
          addListDelegateSigned: vi.fn(),
          removeListDelegate: vi.fn(),
          removeListDelegateSigned: vi.fn(),
          setListStatus: vi.fn(),
          setListStatusSigned: vi.fn(),
          setListOwner: vi.fn(),
          setListOwnerSigned: vi.fn(),
          setMetadata: vi.fn(),
          setMetadataSigned: vi.fn(),
          setMetadataDelegated: vi.fn(),
          setMetadataDelegatedSigned: vi.fn(),
        }
      })),
      keccak256: vi.fn(),
      encodePacked: vi.fn(),
    },
    utils: {
      getDeployment: vi.fn(() => ({
        registry: "0x0"
      })),
      getSignedDataType: vi.fn(),
      SignedDataType: {
        SetHintSigned: 0,
        SetHintSignedMetadata: 1,
      }
    }
  }
})

vi.mock("viem", () => mocks.viem);
vi.mock("../../src/utils.ts", () => mocks.utils);

describe("TrustedHintController", () => {
  let controller: TrustedHintController;

  beforeAll(() => {
    controller = new TrustedHintController({
      walletClient: createWalletClient({} as any),
      metaTransactionWalletClient: createWalletClient({} as any),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should get a hint", async () => {
    const result = "0x0"
    vi.spyOn(controller.contract.read, "getHint").mockImplementationOnce(async () => result);

    const hint = await controller.getHint("0x0", "0x0", "0x0");

    expect(controller.contract.read.getHint).toHaveBeenCalledWith(["0x0", "0x0", "0x0"]);
    expect(hint).toBe(result);
  });

  describe("set hint" , () => {
    it("should set a hint", async () => {
      const result = "0x0"
      vi.spyOn(controller.contract.write, "setHint").mockImplementationOnce(async () => result);
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => true);

      const hint = await controller.setHint("0x0", "0x0", "0x0", "0x0");

      expect(controller.contract.write.setHint).toHaveBeenCalledWith(["0x0", "0x0", "0x0", "0x0"], {
        chain: mocks.viem.createWalletClient().chain,
        account: mocks.viem.createWalletClient().account,
      });
      expect(hint).toBe(result);
    })
    it("should set a hint with metadata", async () => {
      const result = "0x0"
      vi.spyOn(controller.contract.write, "setHint").mockImplementationOnce(async () => result);
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => true);

      const hint = await controller.setHint("0x0", "0x0", "0x0", "0x0", "0x0");

      expect(controller.contract.write.setHint).toHaveBeenCalledWith(["0x0", "0x0", "0x0", "0x0", "0x0"], {
        chain: mocks.viem.createWalletClient().chain,
        account: mocks.viem.createWalletClient().account,
      });
      expect(hint).toBe(result);
    })
    it("should throw if no wallet client is set", async () => {
      const controllerWithoutWallet = new TrustedHintController({
        readClient: createPublicClient({} as any),
      });
      await expect(controllerWithoutWallet.setHint("0x0", "0x0", "0x0", "0x0"))
        .rejects.toThrow("WalletClient must have a chain and account set.");
    })
    it("should throw if caller is not the owner of the namespace", async () => {
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => false);
      await expect(controller.setHint("0x0", "0x0", "0x0", "0x0"))
        .rejects.toThrow("Failed to set hint: Provided WalletClient must be the owner of the namespace.");
    })
  })

  describe("set hint signed" , () => {
    it("should set a hint signed", async () => {
      const result = "0x0"
      const version = "1.0.0"
      const nonce = BigInt(1)
      vi.spyOn(controller.contract.write, "setHintSigned").mockImplementationOnce(async () => result);
      vi.spyOn(controller.contract.read, "version").mockImplementationOnce(async () => version);
      vi.spyOn(controller.contract.read, "nonces").mockImplementationOnce(async () => nonce);
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => true);

      const hint = await controller.setHintSigned("0x0", "0x0", "0x0", "0x0");

      expect(controller.contract.write.setHintSigned).toHaveBeenCalledWith(["0x0", "0x0", "0x0", "0x0", "0x0", undefined], {
        chain: mocks.viem.createWalletClient().chain,
        account: mocks.viem.createWalletClient().account,
      });
      expect(hint).toBe(result);
    })
    it("should throw if no meta transaction wallet client is set", async () => {
      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
      });
      await expect(controllerWithoutWallet.setHintSigned("0x0", "0x0", "0x0", "0x0"))
        .rejects.toThrow("metaTransactionWalletClient must be set when creating a TrustedHintController instance");
    })
    it("should throw if no wallet client is set", async () => {
      vi.spyOn(mocks.viem, "createWalletClient").mockImplementationOnce(() => ({
        signTypedData: vi.fn(),
      } as any));
      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
        metaTransactionWalletClient: createWalletClient({} as any),
      });
      await expect(controllerWithoutWallet.setHintSigned("0x0", "0x0", "0x0", "0x0"))
        .rejects.toThrow("WalletClient must have a chain and account set.");
    })
    it("should throw if wallet client and meta transaction wallet client are not on the same chain", async () => {
      vi.spyOn(mocks.viem, "createWalletClient").mockImplementationOnce(() => ({
        chain: {
          id: 7777777777,
        },
        account: {
          address: "0x0",
        }
      } as any));
      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
        metaTransactionWalletClient: createWalletClient({} as any),
      });
      await expect(controllerWithoutWallet.setHintSigned("0x0", "0x0", "0x0", "0x0"))
        .rejects.toThrow("Provided WalletClient and MetaTransactionWalletClient must be on the same chain.");
    })
    it("should throw if meta transaction wallet client is not the owner of the namespace", async () => {
      vi.spyOn(mocks.viem, "createWalletClient").mockImplementationOnce(() => ({
        chain: {
          id: 0,
        },
        account: {
          address: "0x0",
        }
      } as any));
      vi.spyOn(mocks.viem, "createPublicClient").mockImplementationOnce(() => ({
        chain: {
          id: 0,
        },
      } as any));
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => false);

      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
        metaTransactionWalletClient: createWalletClient({} as any),
      });

      await expect(controllerWithoutWallet.setHintSigned("0x0", "0x0", "0x0", "0x0"))
        .rejects.toThrow("Provided MetaTransactionWalletClient must be the owner of the namespace.");
    })
  })

  describe("set hints", () => {
    it("should set hints", async () => {
      const result = "0x0"
      const keys: BytesHex[] = ["0x0", "0x0", "0x0", "0x0"]
      const values: BytesHex[] = ["0x0", "0x0", "0x0", "0x0"]

      vi.spyOn(controller.contract.write, "setHints").mockImplementationOnce(async () => result);
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => true);

      const hint = await controller.setHints("0x0", "0x0", keys, values);

      expect(controller.contract.write.setHints).toHaveBeenCalledWith(["0x0", "0x0", keys, values], {
        chain: mocks.viem.createWalletClient().chain,
        account: mocks.viem.createWalletClient().account,
      });
      expect(hint).toBe(result);
    })
    it("should set hints with metadata", async () => {
      const result = "0x0"
      const keys: BytesHex[] = ["0x0", "0x0", "0x0", "0x0"]
      const values: BytesHex[] = ["0x0", "0x0", "0x0", "0x0"]
      const metadata: BytesHex[] = ["0x0", "0x0", "0x0", "0x0"]

      vi.spyOn(controller.contract.write, "setHints").mockImplementationOnce(async () => result);
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => true);

      const hint = await controller.setHints("0x0", "0x0", keys, values, metadata);

      expect(controller.contract.write.setHints).toHaveBeenCalledWith(["0x0", "0x0", keys, values, metadata], {
        chain: mocks.viem.createWalletClient().chain,
        account: mocks.viem.createWalletClient().account,
      });
      expect(hint).toBe(result);
    })
    it("should throw if no wallet client is set", async () => {
      const controllerWithoutWallet = new TrustedHintController({
        readClient: createPublicClient({} as any),
      });
      await expect(controllerWithoutWallet.setHints("0x0", "0x0", ["0x0"], ["0x0"]))
        .rejects.toThrow("WalletClient must have a chain and account set.");
    })
    it("should throw if caller is not the owner of the namespace", async () => {
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => false);
      await expect(controller.setHints("0x0", "0x0", ["0x0"], ["0x0"]))
        .rejects.toThrow("Failed to set hints: Provided WalletClient must be the owner of the namespace.");
    })
  })

  describe("set hints signed", () => {
    it("should set hints signed", async () => {
      const result = "0x0"
      const version = "1.0.0"
      const nonce = BigInt(1)
      const keys: BytesHex[] = ["0x0", "0x0", "0x0", "0x0"]
      const values: BytesHex[] = ["0x0", "0x0", "0x0", "0x0"]

      vi.spyOn(controller.contract.write, "setHintsSigned").mockImplementationOnce(async () => result);
      vi.spyOn(controller.contract.read, "version").mockImplementationOnce(async () => version);
      vi.spyOn(controller.contract.read, "nonces").mockImplementationOnce(async () => nonce);
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => true);
      // @ts-ignore
      vi.spyOn(controller.metaTransactionWalletClient, "signTypedData").mockImplementationOnce(async () => "0x0");

      const hint = await controller.setHintsSigned("0x0", "0x0", keys, values);

      expect(controller.contract.write.setHintsSigned).toHaveBeenCalledWith(["0x0", "0x0", keys, values, "0x0", "0x0"], {
        chain: mocks.viem.createWalletClient().chain,
        account: mocks.viem.createWalletClient().account,
      });
      expect(hint).toBe(result);
    })
    it("should set hints signed with metadata", async () => {
      const result = "0x0"
      const version = "1.0.0"
      const nonce = BigInt(1)
      const keys: BytesHex[] = ["0x0", "0x0", "0x0", "0x0"]
      const values: BytesHex[] = ["0x0", "0x0", "0x0", "0x0"]
      const metadata: BytesHex[] = ["0x0", "0x0", "0x0", "0x0"]

      vi.spyOn(controller.contract.write, "setHintsSigned").mockImplementationOnce(async () => result);
      vi.spyOn(controller.contract.read, "version").mockImplementationOnce(async () => version);
      vi.spyOn(controller.contract.read, "nonces").mockImplementationOnce(async () => nonce);
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => true);
      // @ts-ignore
      vi.spyOn(controller.metaTransactionWalletClient, "signTypedData").mockImplementationOnce(async () => "0x0");

      const hint = await controller.setHintsSigned("0x0", "0x0", keys, values, metadata);

      expect(controller.contract.write.setHintsSigned).toHaveBeenCalledWith(["0x0", "0x0", keys, values, metadata, "0x0", "0x0"], {
        chain: mocks.viem.createWalletClient().chain,
        account: mocks.viem.createWalletClient().account,
      });
      expect(hint).toBe(result);
    })
  })

  describe("set hint delegated", () => {
    it("should set a hint delegated", async () => {
      const result = "0x0"

      vi.spyOn(controller.contract.read, "identityIsDelegate").mockImplementationOnce(async () => true);
      vi.spyOn(controller.contract.write, "setHintDelegated").mockImplementationOnce(async () => result);

      const hint = await controller.setHintDelegated("0x0", "0x0", "0x0", "0x0");

      expect(controller.contract.write.setHintDelegated).toHaveBeenCalledWith(["0x0", "0x0", "0x0", "0x0"], {
        chain: mocks.viem.createWalletClient().chain,
        account: mocks.viem.createWalletClient().account,
      });
      expect(hint).toBe(result);
    })
    it("should set hint delegated with metadata", async () => {
      const result = "0x0"

      vi.spyOn(controller.contract.read, "identityIsDelegate").mockImplementationOnce(async () => true);
      vi.spyOn(controller.contract.write, "setHintDelegated").mockImplementationOnce(async () => result);

      const hint = await controller.setHintDelegated("0x0", "0x0", "0x0", "0x0", "0x0");

      expect(controller.contract.write.setHintDelegated).toHaveBeenCalledWith(["0x0", "0x0", "0x0", "0x0", "0x0"], {
        chain: mocks.viem.createWalletClient().chain,
        account: mocks.viem.createWalletClient().account,
      });
      expect(hint).toBe(result);
    })
    it("should throw if no wallet client is set", async () => {
      const controllerWithoutWallet = new TrustedHintController({
        readClient: createPublicClient({} as any),
      });
      await expect(controllerWithoutWallet.setHintDelegated("0x0", "0x0", "0x0", "0x0"))
        .rejects.toThrow("WalletClient must have a chain and account set.");
    })
    it("should throw if caller is not a delegate of the namespace", async () => {
      vi.spyOn(controller.contract.read, "identityIsDelegate").mockImplementationOnce(async () => false);
      await expect(controller.setHintDelegated("0x0", "0x0", "0x0", "0x0"))
        .rejects.toThrow("Failed to set hint delegated: Provided WalletClient must be a delegate of the namespace.");
    })
  })

  describe("set hint delegated signed", () => {
    it("should set a hint delegated signed", async () => {
      const result = "0x0"
      const version = "1.0.0"
      const nonce = BigInt(1)

      vi.spyOn(controller.contract.read, "version").mockImplementationOnce(async () => version);
      vi.spyOn(controller.contract.read, "nonces").mockImplementationOnce(async () => nonce);
      vi.spyOn(controller.contract.read, "identityIsDelegate").mockImplementationOnce(async () => true);
      vi.spyOn(controller.contract.write, "setHintDelegatedSigned").mockImplementationOnce(async () => result);
      // @ts-ignore
      vi.spyOn(controller.metaTransactionWalletClient, "signTypedData").mockImplementationOnce(async () => "0x0");

      const hint = await controller.setHintDelegatedSigned("0x0", "0x0", "0x0", "0x0");

      expect(controller.contract.write.setHintDelegatedSigned).toHaveBeenCalledWith(["0x0", "0x0", "0x0", "0x0", "0x0", "0x0"], {
        chain: mocks.viem.createWalletClient().chain,
        account: mocks.viem.createWalletClient().account,
      });
      expect(hint).toBe(result);
    })
    it("should set hint delegated signed with metadata", async () => {
      const result = "0x0"
      const version = "1.0.0"
      const nonce = BigInt(1)

      vi.spyOn(controller.contract.read, "version").mockImplementationOnce(async () => version);
      vi.spyOn(controller.contract.read, "nonces").mockImplementationOnce(async () => nonce);
      vi.spyOn(controller.contract.read, "identityIsDelegate").mockImplementationOnce(async () => true);
      vi.spyOn(controller.contract.write, "setHintDelegatedSigned").mockImplementationOnce(async () => result);
      // @ts-ignore
      vi.spyOn(controller.metaTransactionWalletClient, "signTypedData").mockImplementationOnce(async () => "0x0");

      const hint = await controller.setHintDelegatedSigned("0x0", "0x0", "0x0", "0x0", "0x0");

      expect(controller.contract.write.setHintDelegatedSigned).toHaveBeenCalledWith(["0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0"], {
        chain: mocks.viem.createWalletClient().chain,
        account: mocks.viem.createWalletClient().account,
      });
      expect(hint).toBe(result);
    })
    it("should throw if no meta transaction wallet client is set", async () => {
      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
      });
      await expect(controllerWithoutWallet.setHintDelegatedSigned("0x0", "0x0", "0x0", "0x0"))
        .rejects.toThrow("metaTransactionWalletClient must be set when creating a TrustedHintController instance");
    })
    it("should throw if no wallet client is set", async () => {
      vi.spyOn(mocks.viem, "createWalletClient").mockImplementationOnce(() => ({
        signTypedData: vi.fn(),
      } as any));
      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
        metaTransactionWalletClient: createWalletClient({} as any),
      });
      await expect(controllerWithoutWallet.setHintDelegatedSigned("0x0", "0x0", "0x0", "0x0"))
        .rejects.toThrow("WalletClient must have a chain and account set.");
    })
    it("should throw if wallet client and meta transaction wallet client are not on the same chain", async () => {
      vi.spyOn(mocks.viem, "createWalletClient").mockImplementationOnce(() => ({
        chain: {
          id: 7777777777,
        },
        account: {
          address: "0x0",
        }
      } as any));
      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
        metaTransactionWalletClient: createWalletClient({} as any),
      });
      await expect(controllerWithoutWallet.setHintDelegatedSigned("0x0", "0x0", "0x0", "0x0"))
        .rejects.toThrow("Provided WalletClient and MetaTransactionWalletClient must be on the same chain.");
    })
    it("should throw if meta transaction wallet client is not a delegate of the namespace", async () => {
      vi.spyOn(mocks.viem, "createWalletClient").mockImplementationOnce(() => ({
        chain: {
          id: 0,
        },
        account: {
          address: "0x0",
        }
      } as any));
      vi.spyOn(mocks.viem, "createPublicClient").mockImplementationOnce(() => ({
        chain: {
          id: 0,
        },
      } as any));
      vi.spyOn(controller.contract.read, "identityIsDelegate").mockImplementationOnce(async () => false);

      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
        metaTransactionWalletClient: createWalletClient({} as any),
      });

      await expect(controllerWithoutWallet.setHintDelegatedSigned("0x0", "0x0", "0x0", "0x0"))
        .rejects.toThrow("Provided MetaTransactionWalletClient must be a delegate of the namespace.");
    })
    it("should throw if meta transaction wallet client is not the owner of the namespace", async () => {
      vi.spyOn(mocks.viem, "createWalletClient").mockImplementationOnce(() => ({
        chain: {
          id: 0,
        },
        account: {
          address: "0x0",
        }
      } as any));
      vi.spyOn(mocks.viem, "createPublicClient").mockImplementationOnce(() => ({
        chain: {
          id: 0,
        },
      } as any));
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => false);

      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
        metaTransactionWalletClient: createWalletClient({} as any),
      });

      await expect(controllerWithoutWallet.setHintDelegatedSigned("0x0", "0x0", "0x0", "0x0"))
        .rejects.toThrow("Failed to set hint delegate signed: Provided MetaTransactionWalletClient must be a delegate of the namespace.");
    })
  })

  describe("set hints delegated", () => {
    it("should set hints delegated", async () => {
      const result = "0x0"
      const keys: BytesHex[] = ["0x0", "0x0", "0x0", "0x0"]
      const values: BytesHex[] = ["0x0", "0x0", "0x0", "0x0"]

      vi.spyOn(controller.contract.write, "setHintsDelegated").mockImplementationOnce(async () => result);
      vi.spyOn(controller.contract.read, "identityIsDelegate").mockImplementationOnce(async () => true);

      const hint = await controller.setHintsDelegated("0x0", "0x0", keys, values);

      expect(controller.contract.write.setHintsDelegated).toHaveBeenCalledWith(["0x0", "0x0", keys, values], {
        chain: mocks.viem.createWalletClient().chain,
        account: mocks.viem.createWalletClient().account,
      });
      expect(hint).toBe(result);
    })
    it("should set hints delegated with metadata", async () => {
      const result = "0x0"
      const keys: BytesHex[] = ["0x0", "0x0", "0x0", "0x0"]
      const values: BytesHex[] = ["0x0", "0x0", "0x0", "0x0"]
      const metadata: BytesHex[] = ["0x0", "0x0", "0x0", "0x0"]

      vi.spyOn(controller.contract.write, "setHintsDelegated").mockImplementationOnce(async () => result);
      vi.spyOn(controller.contract.read, "identityIsDelegate").mockImplementationOnce(async () => true);

      const hint = await controller.setHintsDelegated("0x0", "0x0", keys, values, metadata);

      expect(controller.contract.write.setHintsDelegated).toHaveBeenCalledWith(["0x0", "0x0", keys, values, metadata], {
        chain: mocks.viem.createWalletClient().chain,
        account: mocks.viem.createWalletClient().account,
      });
      expect(hint).toBe(result);
    })
    it("should throw if no wallet client is set", async () => {
      const controllerWithoutWallet = new TrustedHintController({
        readClient: createPublicClient({} as any),
      });
      await expect(controllerWithoutWallet.setHintsDelegated("0x0", "0x0", ["0x0"], ["0x0"]))
        .rejects.toThrow("WalletClient must have a chain and account set.");
    })
    it("should throw if caller is not a delegate of the namespace", async () => {
      vi.spyOn(controller.contract.read, "identityIsDelegate").mockImplementationOnce(async () => false);
      await expect(controller.setHintsDelegated("0x0", "0x0", ["0x0"], ["0x0"]))
        .rejects.toThrow("Failed to set hints delegated: Provided WalletClient must be a delegate of the namespace.");
    })
  })

  describe("set hints delegated signed", () => {
    it("should set hints delegated signed", async () => {
      const result = "0x0"
      const version = "1.0.0"
      const nonce = BigInt(1)
      const keys: BytesHex[] = ["0x0", "0x0", "0x0", "0x0"]
      const values: BytesHex[] = ["0x0", "0x0", "0x0", "0x0"]

      vi.spyOn(controller.contract.write, "setHintsDelegatedSigned").mockImplementationOnce(async () => result);
      vi.spyOn(controller.contract.read, "version").mockImplementationOnce(async () => version);
      vi.spyOn(controller.contract.read, "nonces").mockImplementationOnce(async () => nonce);
      vi.spyOn(controller.contract.read, "identityIsDelegate").mockImplementationOnce(async () => true);
      // @ts-ignore
      vi.spyOn(controller.metaTransactionWalletClient, "signTypedData").mockImplementationOnce(async () => "0x0");

      const hint = await controller.setHintsDelegatedSigned("0x0", "0x0", keys, values);

      expect(controller.contract.write.setHintsDelegatedSigned).toHaveBeenCalledWith(["0x0", "0x0", keys, values, "0x0", "0x0"], {
        chain: mocks.viem.createWalletClient().chain,
        account: mocks.viem.createWalletClient().account,
      });
      expect(hint).toBe(result);
    })
    it("should set hints delegated signed with metadata", async () => {
      const result = "0x0"
      const version = "1.0.0"
      const nonce = BigInt(1)
      const keys: BytesHex[] = ["0x0", "0x0", "0x0", "0x0"]
      const values: BytesHex[] = ["0x0", "0x0", "0x0", "0x0"]
      const metadata: BytesHex[] = ["0x0", "0x0", "0x0", "0x0"]

      vi.spyOn(controller.contract.write, "setHintsDelegatedSigned").mockImplementationOnce(async () => result);
      vi.spyOn(controller.contract.read, "version").mockImplementationOnce(async () => version);
      vi.spyOn(controller.contract.read, "nonces").mockImplementationOnce(async () => nonce);
      vi.spyOn(controller.contract.read, "identityIsDelegate").mockImplementationOnce(async () => true);
      // @ts-ignore
      vi.spyOn(controller.metaTransactionWalletClient, "signTypedData").mockImplementationOnce(async () => "0x0");

      const hint = await controller.setHintsDelegatedSigned("0x0", "0x0", keys, values, metadata);

      expect(controller.contract.write.setHintsDelegatedSigned).toHaveBeenCalledWith(["0x0", "0x0", keys, values, metadata, "0x0", "0x0"], {
        chain: mocks.viem.createWalletClient().chain,
        account: mocks.viem.createWalletClient().account,
      });
      expect(hint).toBe(result);
    })
  })

  it("should return if an identity is a list delegate", async () => {
    const result = true
    vi.spyOn(controller.contract.read, "identityIsDelegate").mockImplementationOnce(async () => result);

    const hint = await controller.isListDelegate("0x0", "0x0", "0x0");

    expect(controller.contract.read.identityIsDelegate).toHaveBeenCalledWith(["0x0", "0x0", "0x0"]);
    expect(hint).toBe(result);
  })

  it("should return if an identity is a list owner", async () => {
    const result = true
    vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => result);

    const hint = await controller.isListOwner("0x0", "0x0", "0x0");

    expect(controller.contract.read.identityIsOwner).toHaveBeenCalledWith(["0x0", "0x0", "0x0"]);
    expect(hint).toBe(result);
  })

  it("should return if a list is revoked", async () => {
    const result = true
    vi.spyOn(mocks.viem, "keccak256").mockImplementation(() => "0x0");
    vi.spyOn(mocks.viem, "encodePacked").mockImplementation(() => "0x0");
    vi.spyOn(controller.contract.read, "revokedLists").mockImplementationOnce(async () => result);

    const hint = await controller.isListRevoked("0x0", "0x0");

    expect(controller.contract.read.revokedLists).toHaveBeenCalledWith(["0x0"]);
    expect(hint).toBe(result);
  })

  describe("add list delegate", () => {
    it("should add a list delegate", async () => {
      const result = "0x0"
      vi.spyOn(controller.contract.write, "addListDelegate").mockImplementationOnce(async () => result);
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => true);

      const hint = await controller.addListDelegate("0x0", "0x0", "0x0", 0);

      expect(controller.contract.write.addListDelegate).toHaveBeenCalledWith(["0x0", "0x0", "0x0", 0n], {
        chain: mocks.viem.createWalletClient().chain,
        account: mocks.viem.createWalletClient().account,
      });
      expect(hint).toBe(result);
    })
    it("should throw if no wallet client is set", async () => {
      const controllerWithoutWallet = new TrustedHintController({
        readClient: createPublicClient({} as any),
      });
      await expect(controllerWithoutWallet.addListDelegate("0x0", "0x0", "0x0", 0))
        .rejects.toThrow("WalletClient must have a chain and account set.");
    })
    it("should throw if caller is not the owner of the namespace", async () => {
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => false);
      await expect(controller.addListDelegate("0x0", "0x0", "0x0", 0))
        .rejects.toThrow("Failed to add list delegate: Provided WalletClient must be the owner of the namespace.");
    })
  })

  describe("add list delegate signed", () => {
    it("should add a list delegate signed", async () => {
      const result = "0x0"
      const version = "1.0.0"
      const nonce = BigInt(1)

      vi.spyOn(controller.contract.read, "version").mockImplementationOnce(async () => version);
      vi.spyOn(controller.contract.read, "nonces").mockImplementationOnce(async () => nonce);
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => true);
      vi.spyOn(controller.contract.write, "addListDelegateSigned").mockImplementationOnce(async () => result);
      // @ts-ignore
      vi.spyOn(controller.metaTransactionWalletClient, "signTypedData").mockImplementationOnce(async () => "0x0");

      const hint = await controller.addListDelegateSigned("0x0", "0x0", "0x0", 0);

      expect(controller.contract.write.addListDelegateSigned).toHaveBeenCalledWith(["0x0", "0x0", "0x0", 0n, "0x0", "0x0"], {
        chain: mocks.viem.createWalletClient().chain,
        account: mocks.viem.createWalletClient().account,
      });
      expect(hint).toBe(result);
    })
    it("should throw if no meta transaction wallet client is set", async () => {
      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
      });
      await expect(controllerWithoutWallet.addListDelegateSigned("0x0", "0x0", "0x0", 0))
        .rejects.toThrow("metaTransactionWalletClient must be set when creating a TrustedHintController instance");
    })
    it("should throw if no wallet client is set", async () => {
      vi.spyOn(mocks.viem, "createWalletClient").mockImplementationOnce(() => ({
        signTypedData: vi.fn(),
      } as any));
      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
        metaTransactionWalletClient: createWalletClient({} as any),
      });
      await expect(controllerWithoutWallet.addListDelegateSigned("0x0", "0x0", "0x0", 0))
        .rejects.toThrow("WalletClient must have a chain and account set.");
    })
    it("should throw if wallet client and meta transaction wallet client are not on the same chain", async () => {
      vi.spyOn(mocks.viem, "createWalletClient").mockImplementationOnce(() => ({
        chain: {
          id: 7777777777,
        },
        account: {
          address: "0x0",
        }
      } as any));
      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
        metaTransactionWalletClient: createWalletClient({} as any),
      });
      await expect(controllerWithoutWallet.addListDelegateSigned("0x0", "0x0", "0x0", 0))
        .rejects.toThrow("Provided WalletClient and MetaTransactionWalletClient must be on the same chain.");
    })
    it("should throw if meta transaction wallet client is not the owner of the namespace", async () => {
      vi.spyOn(mocks.viem, "createWalletClient").mockImplementationOnce(() => ({
        chain: {
          id: 0,
        },
        account: {
          address: "0x0",
        }
      } as any));
      vi.spyOn(mocks.viem, "createPublicClient").mockImplementationOnce(() => ({
        chain: {
          id: 0,
        },
      } as any));
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => false);

      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
        metaTransactionWalletClient: createWalletClient({} as any),
      });

      await expect(controllerWithoutWallet.addListDelegateSigned("0x0", "0x0", "0x0", 0))
        .rejects.toThrow("Failed to add list delegate signed: Provided MetaTransactionWalletClient must be the owner of the namespace.");
    })
  })

  describe("remove list delegate", () => {
    it("should remove a list delegate", async () => {
      const result = "0x0"
      vi.spyOn(controller.contract.write, "removeListDelegate").mockImplementationOnce(async () => result);
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => true);

      const hint = await controller.removeListDelegate("0x0", "0x0", "0x0");

      expect(controller.contract.write.removeListDelegate).toHaveBeenCalledWith(["0x0", "0x0", "0x0"], {
        chain: mocks.viem.createWalletClient().chain,
        account: mocks.viem.createWalletClient().account,
      });
      expect(hint).toBe(result);
    })
    it("should throw if no wallet client is set", async () => {
      const controllerWithoutWallet = new TrustedHintController({
        readClient: createPublicClient({} as any),
      });
      await expect(controllerWithoutWallet.removeListDelegate("0x0", "0x0", "0x0"))
        .rejects.toThrow("WalletClient must have a chain and account set.");
    })
    it("should throw if caller is not the owner of the namespace", async () => {
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => false);
      await expect(controller.removeListDelegate("0x0", "0x0", "0x0"))
        .rejects.toThrow("Failed to remove list delegate: Provided WalletClient must be the owner of the namespace.");
    })
  })

  describe("remove list delegate signed", () => {
    it("should remove a list delegate signed", async () => {
      const result = "0x0"
      const version = "1.0.0"
      const nonce = BigInt(1)

      vi.spyOn(controller.contract.read, "version").mockImplementationOnce(async () => version);
      vi.spyOn(controller.contract.read, "nonces").mockImplementationOnce(async () => nonce);
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => true);
      vi.spyOn(controller.contract.write, "removeListDelegateSigned").mockImplementationOnce(async () => result);
      // @ts-ignore
      vi.spyOn(controller.metaTransactionWalletClient, "signTypedData").mockImplementationOnce(async () => "0x0");

      const hint = await controller.removeListDelegateSigned("0x0", "0x0", "0x0");

      expect(controller.contract.write.removeListDelegateSigned).toHaveBeenCalledWith(["0x0", "0x0", "0x0", "0x0", "0x0"], {
        chain: mocks.viem.createWalletClient().chain,
        account: mocks.viem.createWalletClient().account,
      });
      expect(hint).toBe(result);
    })
    it("should throw if no meta transaction wallet client is set", async () => {
      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
      });
      await expect(controllerWithoutWallet.removeListDelegateSigned("0x0", "0x0", "0x0"))
        .rejects.toThrow("metaTransactionWalletClient must be set when creating a TrustedHintController instance");
    })
    it("should throw if no wallet client is set", async () => {
      vi.spyOn(mocks.viem, "createWalletClient").mockImplementationOnce(() => ({
        signTypedData: vi.fn(),
      } as any));
      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
        metaTransactionWalletClient: createWalletClient({} as any),
      });
      await expect(controllerWithoutWallet.removeListDelegateSigned("0x0", "0x0", "0x0"))
        .rejects.toThrow("WalletClient must have a chain and account set.");
    })
    it("should throw if wallet client and meta transaction wallet client are not on the same chain", async () => {
      vi.spyOn(mocks.viem, "createWalletClient").mockImplementationOnce(() => ({
        chain: {
          id: 7777777777,
        },
        account: {
          address: "0x0",
        }
      } as any));
      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
        metaTransactionWalletClient: createWalletClient({} as any),
      });
      await expect(controllerWithoutWallet.removeListDelegateSigned("0x0", "0x0", "0x0"))
        .rejects.toThrow("Provided WalletClient and MetaTransactionWalletClient must be on the same chain.");
    })
    it("should throw if meta transaction wallet client is not the owner of the namespace", async () => {
      vi.spyOn(mocks.viem, "createWalletClient").mockImplementationOnce(() => ({
        chain: {
          id: 0,
        },
        account: {
          address: "0x0",
        }
      } as any));
      vi.spyOn(mocks.viem, "createPublicClient").mockImplementationOnce(() => ({
        chain: {
          id: 0,
        },
      } as any));
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => false);

      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
        metaTransactionWalletClient: createWalletClient({} as any),
      });

      await expect(controllerWithoutWallet.removeListDelegateSigned("0x0", "0x0", "0x0"))
        .rejects.toThrow("Failed to remove list delegate signed: Provided MetaTransactionWalletClient must be the owner of the namespace.");
    })
  })

  describe("set list status", () => {
    it("should set list status", async () => {
      const result = "0x0"
      vi.spyOn(controller.contract.write, "setListStatus").mockImplementationOnce(async () => result);
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => true);

      const hint = await controller.setListStatus("0x0", "0x0", true);

      expect(controller.contract.write.setListStatus).toHaveBeenCalledWith(["0x0", "0x0", true], {
        chain: mocks.viem.createWalletClient().chain,
        account: mocks.viem.createWalletClient().account,
      });
      expect(hint).toBe(result);
    })
    it("should throw if no wallet client is set", async () => {
      const controllerWithoutWallet = new TrustedHintController({
        readClient: createPublicClient({} as any),
      });
      await expect(controllerWithoutWallet.setListStatus("0x0", "0x0", true))
        .rejects.toThrow("WalletClient must have a chain and account set.");
    })
    it("should throw if caller is not the owner of the namespace", async () => {
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => false);
      await expect(controller.setListStatus("0x0", "0x0", true))
        .rejects.toThrow("Failed to set list status: Provided WalletClient must be the owner of the namespace.");
    })
  })

  describe("set list status signed", () => {
    it("should set list status signed", async () => {
      const result = "0x0"
      const version = "1.0.0"
      const nonce = BigInt(1)

      vi.spyOn(controller.contract.read, "version").mockImplementationOnce(async () => version);
      vi.spyOn(controller.contract.read, "nonces").mockImplementationOnce(async () => nonce);
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => true);
      vi.spyOn(controller.contract.write, "setListStatusSigned").mockImplementationOnce(async () => result);
      // @ts-ignore
      vi.spyOn(controller.metaTransactionWalletClient, "signTypedData").mockImplementationOnce(async () => "0x0");

      const hint = await controller.setListStatusSigned("0x0", "0x0", true);

      expect(controller.contract.write.setListStatusSigned).toHaveBeenCalledWith(["0x0", "0x0", true, "0x0", "0x0"], {
        chain: mocks.viem.createWalletClient().chain,
        account: mocks.viem.createWalletClient().account,
      });
      expect(hint).toBe(result);
    })
    it("should throw if no meta transaction wallet client is set", async () => {
      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
      });
      await expect(controllerWithoutWallet.setListStatusSigned("0x0", "0x0", true))
        .rejects.toThrow("metaTransactionWalletClient must be set when creating a TrustedHintController instance");
    })
    it("should throw if no wallet client is set", async () => {
      vi.spyOn(mocks.viem, "createWalletClient").mockImplementationOnce(() => ({
        signTypedData: vi.fn(),
      } as any));
      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
        metaTransactionWalletClient: createWalletClient({} as any),
      });
      await expect(controllerWithoutWallet.setListStatusSigned("0x0", "0x0", true))
        .rejects.toThrow("WalletClient must have a chain and account set.");
    })
    it("should throw if wallet client and meta transaction wallet client are not on the same chain", async () => {
      vi.spyOn(mocks.viem, "createWalletClient").mockImplementationOnce(() => ({
        chain: {
          id: 7777777777,
        },
        account: {
          address: "0x0",
        }
      } as any));
      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
        metaTransactionWalletClient: createWalletClient({} as any),
      });
      await expect(controllerWithoutWallet.setListStatusSigned("0x0", "0x0", true))
        .rejects.toThrow("Provided WalletClient and MetaTransactionWalletClient must be on the same chain.");
    })
  })

  describe("set list owner", () => {
    it("should set list owner", async () => {
      const result = "0x0"
      vi.spyOn(controller.contract.write, "setListOwner").mockImplementationOnce(async () => result);
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => true);

      const hint = await controller.setListOwner("0x0", "0x0", "0x0");

      expect(controller.contract.write.setListOwner).toHaveBeenCalledWith(["0x0", "0x0", "0x0"], {
        chain: mocks.viem.createWalletClient().chain,
        account: mocks.viem.createWalletClient().account,
      });
      expect(hint).toBe(result);
    })
    it("should throw if no wallet client is set", async () => {
      const controllerWithoutWallet = new TrustedHintController({
        readClient: createPublicClient({} as any),
      });
      await expect(controllerWithoutWallet.setListOwner("0x0", "0x0", "0x0"))
        .rejects.toThrow("WalletClient must have a chain and account set.");
    })
    it("should throw if caller is not the owner of the namespace", async () => {
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => false);
      await expect(controller.setListOwner("0x0", "0x0", "0x0"))
        .rejects.toThrow("Failed to set list owner: Provided WalletClient must be the owner of the namespace.");
    })
  })

  describe("set list owner signed", () => {
    it("should set list owner signed", async () => {
      const result = "0x0"
      const version = "1.0.0"
      const nonce = BigInt(1)

      vi.spyOn(controller.contract.read, "version").mockImplementationOnce(async () => version);
      vi.spyOn(controller.contract.read, "nonces").mockImplementationOnce(async () => nonce);
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => true);
      vi.spyOn(controller.contract.write, "setListOwnerSigned").mockImplementationOnce(async () => result);
      // @ts-ignore
      vi.spyOn(controller.metaTransactionWalletClient, "signTypedData").mockImplementationOnce(async () => "0x0");

      const hint = await controller.setListOwnerSigned("0x0", "0x0", "0x0");

      expect(controller.contract.write.setListOwnerSigned).toHaveBeenCalledWith(["0x0", "0x0", "0x0", "0x0", "0x0"], {
        chain: mocks.viem.createWalletClient().chain,
        account: mocks.viem.createWalletClient().account,
      });
      expect(hint).toBe(result);
    })
    it("should throw if no meta transaction wallet client is set", async () => {
      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
      });
      await expect(controllerWithoutWallet.setListOwnerSigned("0x0", "0x0", "0x0"))
        .rejects.toThrow("metaTransactionWalletClient must be set when creating a TrustedHintController instance");
    })
    it("should throw if no wallet client is set", async () => {
      vi.spyOn(mocks.viem, "createWalletClient").mockImplementationOnce(() => ({
        signTypedData: vi.fn(),
      } as any));
      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
        metaTransactionWalletClient: createWalletClient({} as any),
      });
      await expect(controllerWithoutWallet.setListOwnerSigned("0x0", "0x0", "0x0"))
        .rejects.toThrow("WalletClient must have a chain and account set.");
    })
    it("should throw if wallet client and meta transaction wallet client are not on the same chain", async () => {
      vi.spyOn(mocks.viem, "createWalletClient").mockImplementationOnce(() => ({
        chain: {
          id: 7777777777,
        },
        account: {
          address: "0x0",
        }
      } as any));
      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
        metaTransactionWalletClient: createWalletClient({} as any),
      });
      await expect(controllerWithoutWallet.setListOwnerSigned("0x0", "0x0", "0x0"))
        .rejects.toThrow("Provided WalletClient and MetaTransactionWalletClient must be on the same chain.");
    })
    it("should throw if meta transaction wallet client is not the owner of the namespace", async () => {
      vi.spyOn(mocks.viem, "createWalletClient").mockImplementationOnce(() => ({
        chain: {
          id: 0,
        },
        account: {
          address: "0x0",
        }
      } as any));
      vi.spyOn(mocks.viem, "createPublicClient").mockImplementationOnce(() => ({
        chain: {
          id: 0,
        },
      } as any));
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => false);

      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
        metaTransactionWalletClient: createWalletClient({} as any),
      });

      await expect(controllerWithoutWallet.setListOwnerSigned("0x0", "0x0", "0x0"))
        .rejects.toThrow("Failed to set list owner signed: Provided MetaTransactionWalletClient must be the owner of the namespace.");
    })
  })

  it("should get metatadata of a hint", async () => {
    const result = "0x0"
    vi.spyOn(controller.contract.read, "getMetadata").mockImplementationOnce(async () => result);

    const hint = await controller.getMetadata("0x0", "0x0", "0x0", "0x0");

    expect(controller.contract.read.getMetadata).toHaveBeenCalledWith(["0x0", "0x0", "0x0", "0x0"]);
    expect(hint).toBe(result);
  })

  describe("set metadata on a hint", () => {
    it("should set metadata on a hint", async () => {
      const result = "0x0"
      vi.spyOn(controller.contract.write, "setMetadata").mockImplementationOnce(async () => result);
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => true);

      const hint = await controller.setMetadata("0x0", "0x0", "0x0", "0x0", "0x0");

      expect(controller.contract.write.setMetadata).toHaveBeenCalledWith(["0x0", "0x0", "0x0", "0x0", "0x0"], {
        chain: mocks.viem.createWalletClient().chain,
        account: mocks.viem.createWalletClient().account,
      });
      expect(hint).toBe(result);
    })
    it("should throw if no wallet client is set", async () => {
      const controllerWithoutWallet = new TrustedHintController({
        readClient: createPublicClient({} as any),
      });
      await expect(controllerWithoutWallet.setMetadata("0x0", "0x0", "0x0", "0x0", "0x0"))
        .rejects.toThrow("WalletClient must have a chain and account set.");
    })
    it("should throw if caller is not the owner of the namespace", async () => {
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => false);
      await expect(controller.setMetadata("0x0", "0x0", "0x0", "0x0", "0x0"))
        .rejects.toThrow("Failed to set metadata: Provided WalletClient must be the owner of the namespace.");
    })
  })

  describe("set metadata on a hint signed", () => {
    it("should set metadata on a hint signed", async () => {
      const result = "0x0"
      const version = "1.0.0"
      const nonce = BigInt(1)

      vi.spyOn(controller.contract.read, "version").mockImplementationOnce(async () => version);
      vi.spyOn(controller.contract.read, "nonces").mockImplementationOnce(async () => nonce);
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => true);
      vi.spyOn(controller.contract.write, "setMetadataSigned").mockImplementationOnce(async () => result);
      // @ts-ignore
      vi.spyOn(controller.metaTransactionWalletClient, "signTypedData").mockImplementationOnce(async () => "0x0");

      const hint = await controller.setMetadataSigned("0x0", "0x0", "0x0", "0x0", "0x0");

      expect(controller.contract.write.setMetadataSigned).toHaveBeenCalledWith(["0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0"], {
        chain: mocks.viem.createWalletClient().chain,
        account: mocks.viem.createWalletClient().account,
      });
      expect(hint).toBe(result);
    })
    it("should throw if no meta transaction wallet client is set", async () => {
      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
      });
      await expect(controllerWithoutWallet.setMetadataSigned("0x0", "0x0", "0x0", "0x0", "0x0"))
        .rejects.toThrow("metaTransactionWalletClient must be set when creating a TrustedHintController instance");
    })
    it("should throw if no wallet client is set", async () => {
      vi.spyOn(mocks.viem, "createWalletClient").mockImplementationOnce(() => ({
        signTypedData: vi.fn(),
      } as any));
      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
        metaTransactionWalletClient: createWalletClient({} as any),
      });
      await expect(controllerWithoutWallet.setMetadataSigned("0x0", "0x0", "0x0", "0x0", "0x0"))
        .rejects.toThrow("WalletClient must have a chain and account set.");
    })
    it("should throw if wallet client and meta transaction wallet client are not on the same chain", async () => {
      vi.spyOn(mocks.viem, "createWalletClient").mockImplementationOnce(() => ({
        chain: {
          id: 7777777777,
        },
        account: {
          address: "0x0",
        }
      } as any));
      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
        metaTransactionWalletClient: createWalletClient({} as any),
      });
      await expect(controllerWithoutWallet.setMetadataSigned("0x0", "0x0", "0x0", "0x0", "0x0"))
        .rejects.toThrow("Provided WalletClient and MetaTransactionWalletClient must be on the same chain.");
    })
    it("should throw if meta transaction wallet client is not the owner of the namespace", async () => {
      vi.spyOn(mocks.viem, "createWalletClient").mockImplementationOnce(() => ({
        chain: {
          id: 0,
        },
        account: {
          address: "0x0",
        }
      } as any));
      vi.spyOn(mocks.viem, "createPublicClient").mockImplementationOnce(() => ({
        chain: {
          id: 0,
        },
      } as any));
      vi.spyOn(controller.contract.read, "identityIsOwner").mockImplementationOnce(async () => false);

      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
        metaTransactionWalletClient: createWalletClient({} as any),
      });

      await expect(controllerWithoutWallet.setMetadataSigned("0x0", "0x0", "0x0", "0x0", "0x0"))
        .rejects.toThrow("Failed to set metadata signed: Provided MetaTransactionWalletClient must be the owner of the namespace.");
    })
  })

  describe("set metadata delegated", () => {
    it("should set metadata delegated", async () => {
      const result = "0x0"
      vi.spyOn(controller.contract.write, "setMetadataDelegated").mockImplementationOnce(async () => result);
      vi.spyOn(controller.contract.read, "identityIsDelegate").mockImplementationOnce(async () => true);

      const hint = await controller.setMetadataDelegated("0x0", "0x0", "0x0", "0x0", "0x0");

      expect(controller.contract.write.setMetadataDelegated).toHaveBeenCalledWith(["0x0", "0x0", "0x0", "0x0", "0x0"], {
        chain: mocks.viem.createWalletClient().chain,
        account: mocks.viem.createWalletClient().account,
      });
      expect(hint).toBe(result);
    })
    it("should throw if no wallet client is set", async () => {
      const controllerWithoutWallet = new TrustedHintController({
        readClient: createPublicClient({} as any),
      });
      await expect(controllerWithoutWallet.setMetadataDelegated("0x0", "0x0", "0x0", "0x0", "0x0"))
        .rejects.toThrow("WalletClient must have a chain and account set.");
    })
    it("should throw if caller is not a delegate of the namespace", async () => {
      vi.spyOn(controller.contract.read, "identityIsDelegate").mockImplementationOnce(async () => false);
      await expect(controller.setMetadataDelegated("0x0", "0x0", "0x0", "0x0", "0x0"))
        .rejects.toThrow("Failed to set metadata delegated: Provided WalletClient must be a delegate of the namespace.");
    })
  })

  describe("set metadata delegated signed", () => {
    it("should set metadata delegated signed", async () => {
      const result = "0x0"
      const version = "1.0.0"
      const nonce = BigInt(1)

      vi.spyOn(controller.contract.read, "version").mockImplementationOnce(async () => version);
      vi.spyOn(controller.contract.read, "nonces").mockImplementationOnce(async () => nonce);
      vi.spyOn(controller.contract.read, "identityIsDelegate").mockImplementationOnce(async () => true);
      vi.spyOn(controller.contract.write, "setMetadataDelegatedSigned").mockImplementationOnce(async () => result);
      // @ts-ignore
      vi.spyOn(controller.metaTransactionWalletClient, "signTypedData").mockImplementationOnce(async () => "0x0");

      const hint = await controller.setMetadataDelegatedSigned("0x0", "0x0", "0x0", "0x0", "0x0");

      expect(controller.contract.write.setMetadataDelegatedSigned).toHaveBeenCalledWith(["0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0"], {
        chain: mocks.viem.createWalletClient().chain,
        account: mocks.viem.createWalletClient().account,
      });
      expect(hint).toBe(result);
    })
    it("should throw if no meta transaction wallet client is set", async () => {
      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
      });
      await expect(controllerWithoutWallet.setMetadataDelegatedSigned("0x0", "0x0", "0x0", "0x0", "0x0"))
        .rejects.toThrow("metaTransactionWalletClient must be set when creating a TrustedHintController instance");
    })
    it("should throw if no wallet client is set", async () => {
      vi.spyOn(mocks.viem, "createWalletClient").mockImplementationOnce(() => ({
        signTypedData: vi.fn(),
      } as any));
      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
        metaTransactionWalletClient: createWalletClient({} as any),
      });
      await expect(controllerWithoutWallet.setMetadataDelegatedSigned("0x0", "0x0", "0x0", "0x0", "0x0"))
        .rejects.toThrow("WalletClient must have a chain and account set.");
    })
    it("should throw if wallet client and meta transaction wallet client are not on the same chain", async () => {
      vi.spyOn(mocks.viem, "createWalletClient").mockImplementationOnce(() => ({
        chain: {
          id: 7777777777,
        },
        account: {
          address: "0x0",
        }
      } as any));
      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
        metaTransactionWalletClient: createWalletClient({} as any),
      });
      await expect(controllerWithoutWallet.setMetadataDelegatedSigned("0x0", "0x0", "0x0", "0x0", "0x0"))
        .rejects.toThrow("Provided WalletClient and MetaTransactionWalletClient must be on the same chain.");
    })
  })
})
