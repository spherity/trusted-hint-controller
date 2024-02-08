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
          version: vi.fn(),
          nonces: vi.fn(),
          identityIsOwner: vi.fn(),
        },
        write: {
          setHint: vi.fn(),
          setHintSigned: vi.fn(),
          setHints: vi.fn(),
          setHintsSigned: vi.fn(),
          addListDelegate: vi.fn(),
        }
      })),
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
});
