import {ALICE, BOB} from "./setup/constants";
import {aliceWalletClient} from "./setup/utils";
import {beforeAll, describe, expect, it} from "vitest";
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
    const list = bytesToHex(stringToBytes("list"), {size: 32})
    const key = bytesToHex(stringToBytes("key"), {size: 32})
    const hint = await controller.getHint(ALICE, list, key);
    const expectedResult = "0x0000000000000000000000000000000000000000000000000000000000000000"
    expect(hint).toBe(expectedResult);
  })

  it("should set a hint", async () => {
    const list = bytesToHex(stringToBytes("list"), {size: 32})
    const key = bytesToHex(stringToBytes("key"), {size: 32})
    const value = bytesToHex(stringToBytes("value"), {size: 32})
    const hint = await controller.setHint(ALICE, list, key, value);
    expect(hint).toBeDefined();

    const newlySetHint = await controller.getHint(ALICE, list, key);
    expect(newlySetHint).toBe(value);
  })

  it("should set a hint with metadata", async () => {
    const list = bytesToHex(stringToBytes("list"), {size: 32})
    const key = bytesToHex(stringToBytes("key"), {size: 32})
    const value = bytesToHex(stringToBytes("value"), {size: 32})
    const metadata = bytesToHex(stringToBytes("metadata"))
    const hint = await controller.setHint(ALICE, list, key, value, metadata);
    const newlySetHint = await controller.getHint(ALICE, list, key);
    const newlySetHintMetadata = await controller.contract.read.getMetadata([ALICE, list, key, value]);

    expect(hint).toBeDefined();
    expect(newlySetHint).toBe(value);
    expect(newlySetHintMetadata).toBe(metadata);
  })

  it("should set multiple hints in a batch", async () => {
    const list = bytesToHex(stringToBytes("list"), {size: 32})
    const keys = Array.from(Array(3)).map((_, index) => bytesToHex(stringToBytes(`key_${index}`), {size: 32}));
    const values = Array.from(Array(3)).map((_, index) => bytesToHex(stringToBytes(`value_${index}`), {size: 32}));

    const hint = await controller.setHints(ALICE, list, keys, values);
    expect(hint).toBeDefined();

    const newlySetHints = await Promise.all(keys.map((key) => controller.getHint(ALICE, list, key)));
    expect(newlySetHints).toEqual(values);
  })

  it("should set multiple hints in a batch with metadata", async () => {
    const list = bytesToHex(stringToBytes("list"), {size: 32})
    const keys = Array.from(Array(3)).map((_, index) => bytesToHex(stringToBytes(`key_${index}`), {size: 32}));
    const values = Array.from(Array(3)).map((_, index) => bytesToHex(stringToBytes(`value_${index}`), {size: 32}));
    const metadata = Array.from(Array(3)).map((_, index) => bytesToHex(stringToBytes(`metadata_${index}`), {size: 32}));

    const hint = await controller.setHints(ALICE, list, keys, values, metadata);
    expect(hint).toBeDefined();

    const newlySetHints = await Promise.all(keys.map((key) => controller.getHint(ALICE, list, key)));
    const newlySetHintsMetadata = await Promise.all(keys.map((key, index) => controller.contract.read.getMetadata([ALICE, list, key, values[index]!])));

    expect(newlySetHints).toEqual(values);
    expect(newlySetHintsMetadata).toEqual(metadata);
  })

  it("should add a delegate to a list", async () => {
    const list = bytesToHex(stringToBytes("list"), {size: 32})
    const delegate = BOB
    const delegateUntil = new Date().getTime() + 9999

    const hint = await controller.addListDelegate(ALICE, list, delegate, delegateUntil);
    const isNowDelegate = await controller.isListDelegate(ALICE, list, delegate);

    expect(hint).toBeDefined();
    expect(isNowDelegate).toBeTruthy();
  })

  it("should remove a delegate from a list", async () => {
    const list = bytesToHex(stringToBytes("list"), {size: 32})
    const delegate = BOB
    const delegateUntil = new Date().getTime() + 9999

    await controller.addListDelegate(ALICE, list, delegate, delegateUntil);
    const isNowDelegate1 = await controller.isListDelegate(ALICE, list, delegate);
    const hint = await controller.removeListDelegate(ALICE, list, delegate);
    const isNowDelegate2 = await controller.isListDelegate(ALICE, list, delegate);

    expect(hint).toBeDefined();
    expect(isNowDelegate1).toBeTruthy();
    expect(isNowDelegate2).toBeFalsy();
  })
});