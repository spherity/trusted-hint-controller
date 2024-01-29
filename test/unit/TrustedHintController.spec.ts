import {describe, vi, beforeAll, it, expect} from "vitest";
import { TrustedHintController } from "../../src";
import {createPublicClient, createWalletClient} from "viem";

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
        }
      })),
    },
    utils: {
      getDeployment: vi.fn(() => ({
        registry: "0x0"
      }))
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

      const hint = await controller.setHint("0x0", "0x0", "0x0", "0x0");

      expect(controller.contract.write.setHint).toHaveBeenCalledWith(["0x0", "0x0", "0x0", "0x0"], {
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
      const controllerWithoutWallet = new TrustedHintController({
        walletClient: createWalletClient({} as any),
        metaTransactionWalletClient: createWalletClient({} as any),
      });
      await expect(controllerWithoutWallet.setHintSigned("0x0", "0x0", "0x0", "0x0"))
        .rejects.toThrow("Provided MetaTransactionWalletClient must be the owner of the namespace.");
    })
  })

});
