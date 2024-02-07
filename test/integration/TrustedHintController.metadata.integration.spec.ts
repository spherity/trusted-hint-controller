import {ALICE, BOB} from "./setup/constants";
import {aliceWalletClient, bobWalletClient} from "./setup/utils";
import {beforeAll, describe, expect, it} from "vitest";
import {TrustedHintController} from "../../src";
import {bytesToHex, stringToBytes} from "viem";

describe("TrustedHintController (Metadata)", () => {
  let controller: TrustedHintController;

  beforeAll(async () => {
    controller = new TrustedHintController({
      walletClient: aliceWalletClient,
    });
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

  it("should set a hint with a delegate and metadata", async () => {
    const list = bytesToHex(stringToBytes("list"), {size: 32})
    const key = bytesToHex(stringToBytes("key"), {size : 32})
    const value = bytesToHex(stringToBytes("value"), {size: 32})
    const metadata = bytesToHex(stringToBytes("metadata"))
    const delegate = BOB
    const delegateUntil = new Date().getTime() + 9999

    const delegateController = new TrustedHintController({
      walletClient: bobWalletClient,
    });

    await controller.addListDelegate(ALICE, list, delegate, delegateUntil);
    const hint = await delegateController.setHintDelegated(ALICE, list, key, value, metadata);
    const newlySetHint = await delegateController.getHint(ALICE, list, key);
    const newlySetHintMetadata = await delegateController.contract.read.getMetadata([ALICE, list, key, value]);

    expect(hint).toBeDefined();
    expect(newlySetHint).toBe(value);
    expect(newlySetHintMetadata).toBe(metadata);
  })

  it("should set multiple hints with a delegate in a batch with metadata", async () => {
    const list = bytesToHex(stringToBytes("list"), {size: 32})
    const keys = Array.from(Array(3)).map((_, index) => bytesToHex(stringToBytes(`key_${index}`), {size: 32}));
    const values = Array.from(Array(3)).map((_, index) => bytesToHex(stringToBytes(`value_${index}`), {size: 32}));
    const metadata = Array.from(Array(3)).map((_, index) => bytesToHex(stringToBytes(`metadata_${index}`), {size: 32}));

    const delegate = BOB
    const delegateUntil = new Date().getTime() + 9999

    const delegateController = new TrustedHintController({
      walletClient: bobWalletClient,
    });

    await controller.addListDelegate(ALICE, list, delegate, delegateUntil);
    const hint = await delegateController.setHintsDelegated(ALICE, list, keys, values, metadata);
    const newlySetHints = await Promise.all(keys.map((key) => delegateController.getHint(ALICE, list, key)));
    const newlySetHintsMetadata = await Promise.all(keys.map((key, index) => delegateController.contract.read.getMetadata([ALICE, list, key, values[index]!])));

    expect(hint).toBeDefined();
    expect(newlySetHints).toEqual(values);
    expect(newlySetHintsMetadata).toEqual(metadata);
  })
});