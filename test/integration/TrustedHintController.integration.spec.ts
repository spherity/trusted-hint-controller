import {ALICE} from "./setup/constants";
import {aliceWalletClient, bobWalletClient} from "./setup/utils";
import {expect, it, describe, beforeAll} from "vitest";
import {TrustedHintController} from "../../src";
import {bytesToHex, stringToBytes} from "viem";

describe("TrustedHintController (Integration)", () => {
  let controller: TrustedHintController;

  beforeAll(async () => {
    controller = new TrustedHintController({
      walletClient: aliceWalletClient,
    });
  })

  it("should get a hint", async () => {
    const list = bytesToHex(stringToBytes("list"), { size: 32 })
    const key = bytesToHex(stringToBytes("key"), { size: 32 })
    const hint = await controller.getHint(ALICE, list, key);
    const expectedResult = "0x0000000000000000000000000000000000000000000000000000000000000000"
    expect(hint).toBe(expectedResult);
  })

  it("should set a hint", async () => {
    const list = bytesToHex(stringToBytes("list"), { size: 32 })
    const key = bytesToHex(stringToBytes("key"), { size: 32 })
    const value = bytesToHex(stringToBytes("value"), { size: 32 })
    const hint = await controller.setHint(ALICE, list, key, value);
    expect(hint).toBeDefined();

    const newlySetHint = await controller.getHint(ALICE, list, key);
    expect(newlySetHint).toBe(value);
  })

  it.only("should set a hint signed from bobs account with signed payload from alice", async () => {
    const metaTxSupportedController = new TrustedHintController({
      walletClient: bobWalletClient,
      metaTransactionWalletClient: aliceWalletClient,
    });

    const list = bytesToHex(stringToBytes("list"), { size: 32 })
    const key = bytesToHex(stringToBytes("key"), { size: 32 })
    const value = bytesToHex(stringToBytes("value"), { size: 32 })
    const hint = await metaTxSupportedController.setHintSigned(ALICE, list, key, value);
    expect(hint).toBeDefined();

    const newlySetHint = await controller.getHint(ALICE, list, key);
    expect(newlySetHint).toBe(value);
  })
});