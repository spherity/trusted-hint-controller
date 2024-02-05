import {ALICE, BOB} from "./setup/constants";
import {aliceWalletClient, bobWalletClient, caroWalletClient} from "./setup/utils";
import {beforeAll, describe, expect, it} from "vitest";
import {TrustedHintController} from "../../src";
import {bytesToHex, keccak256, stringToBytes, toHex} from "viem";

describe("TrustedHintController Metatxn (Integration)", () => {
  let controller: TrustedHintController;

  beforeAll(async () => {
    controller = new TrustedHintController({
      walletClient: aliceWalletClient,
    });
  })

  it("should set a hint signed from bobs account with signed payload from alice", async () => {
    const metaTxSupportedController = new TrustedHintController({
      walletClient: bobWalletClient,
      metaTransactionWalletClient: aliceWalletClient,
    });

    const list = bytesToHex(stringToBytes("list"), {size: 32})
    const key = bytesToHex(stringToBytes("key"), {size: 32})
    const value = bytesToHex(stringToBytes("value"), {size: 32})
    const hint = await metaTxSupportedController.setHintSigned(ALICE, list, key, value);
    expect(hint).toBeDefined();

    const newlySetHint = await controller.getHint(ALICE, list, key);
    expect(newlySetHint).toBe(value);
  })

  it("should set a hint signed from bobs account with signed payload from alice with metadata", async () => {
    const metaTxSupportedController = new TrustedHintController({
      walletClient: bobWalletClient,
      metaTransactionWalletClient: aliceWalletClient,
    });

    const list = keccak256(toHex("list"))
    const key = keccak256(toHex("key"))
    const value = keccak256(toHex("value"))
    const metadata = toHex("test,test")

    const hint = await metaTxSupportedController.setHintSigned(ALICE, list, key, value, metadata);
    const newlySetHint = await controller.getHint(ALICE, list, key);
    const newlySetHintMetadata = await controller.contract.read.getMetadata([ALICE, list, key, value]);

    expect(hint).toBeDefined();
    expect(newlySetHint).toBe(value);
    expect(newlySetHintMetadata).toBe(metadata);
  })

  it("should set multiple hints in a batch from bobs account with signed payload from alice", async () => {
    const metaTxSupportedController = new TrustedHintController({
      walletClient: bobWalletClient,
      metaTransactionWalletClient: aliceWalletClient,
    });

    const list = bytesToHex(stringToBytes("list"), {size: 32})
    const keys = Array.from(Array(3)).map((_, index) => bytesToHex(stringToBytes(`key_${index}`), {size: 32}));
    const values = Array.from(Array(3)).map((_, index) => bytesToHex(stringToBytes(`value_${index}`), {size: 32}));

    const hint = await metaTxSupportedController.setHintsSigned(ALICE, list, keys, values);
    const newlySetHints = await Promise.all(keys.map((key) => controller.getHint(ALICE, list, key)));

    expect(hint).toBeDefined();
    expect(newlySetHints).toEqual(values);
  })

  it("should set multiple hints in a batch from bobs account with signed payload from alice with metadata", async () => {
    const metaTxSupportedController = new TrustedHintController({
      walletClient: bobWalletClient,
      metaTransactionWalletClient: aliceWalletClient,
    });

    const list = bytesToHex(stringToBytes("list"), {size: 32})
    const keys = Array.from(Array(3)).map((_, index) => bytesToHex(stringToBytes(`key_${index}`), {size: 32}));
    const values = Array.from(Array(3)).map((_, index) => bytesToHex(stringToBytes(`value_${index}`), {size: 32}));
    const metadata = Array.from(Array(3)).map((_, index) => bytesToHex(stringToBytes(`metadata_${index}`), {size: 32}));

    const hint = await metaTxSupportedController.setHintsSigned(ALICE, list, keys, values, metadata);
    const newlySetHints = await Promise.all(keys.map((key) => controller.getHint(ALICE, list, key)));
    const newlySetHintsMetadata = await Promise.all(keys.map((key, index) => controller.contract.read.getMetadata([ALICE, list, key, values[index]!])));

    expect(hint).toBeDefined();
    expect(newlySetHints).toEqual(values);
    expect(newlySetHintsMetadata).toEqual(metadata);
  })

  it("should add a delegate to a list with a meta-transaction", async () => {
    const list = bytesToHex(stringToBytes("list"), {size: 32})
    const delegate = BOB
    const delegateUntil = new Date().getTime() + 9999

    const metaTxSupportedController = new TrustedHintController({
      walletClient: bobWalletClient,
      metaTransactionWalletClient: aliceWalletClient,
    });

    const hint = await metaTxSupportedController.addListDelegateSigned(ALICE, list, delegate, delegateUntil);
    const isNowDelegate = await controller.isListDelegate(ALICE, list, delegate);

    expect(hint).toBeDefined();
    expect(isNowDelegate).toBeTruthy();
  })

  it("should remove a delegate from a list with a meta-transaction", async () => {
    const list = bytesToHex(stringToBytes("list"), {size: 32})
    const delegate = BOB
    const delegateUntil = new Date().getTime() + 9999

    await controller.addListDelegate(ALICE, list, delegate, delegateUntil);
    const isNowDelegate1 = await controller.isListDelegate(ALICE, list, delegate);

    const metaTxSupportedController = new TrustedHintController({
      walletClient: bobWalletClient,
      metaTransactionWalletClient: aliceWalletClient,
    });

    const hint = await metaTxSupportedController.removeListDelegateSigned(ALICE, list, delegate);
    const isNowDelegate2 = await controller.isListDelegate(ALICE, list, delegate);

    expect(hint).toBeDefined();
    expect(isNowDelegate1).toBeTruthy();
    expect(isNowDelegate2).toBeFalsy();
  })

  it("should add a hint signed by a delegate via a meta-transaction", async () => {
    const namespace = ALICE
    const list = bytesToHex(stringToBytes("list"), {size: 32})
    const key = bytesToHex(stringToBytes("key"), {size: 32})
    const value = bytesToHex(stringToBytes("value"), {size: 32})
    const delegate = BOB
    const delegateUntil = new Date().getTime() + 9999

    const metaTxSupportedController = new TrustedHintController({
      walletClient: caroWalletClient,
      metaTransactionWalletClient: bobWalletClient,
    });

    await controller.addListDelegate(ALICE, list, delegate, delegateUntil);
    const hint = await metaTxSupportedController.setHintDelegatedSigned(namespace, list, key, value);
    const newlySetHint = await controller.getHint(ALICE, list, key);

    expect(hint).toBeDefined();
    expect(newlySetHint).toBe(value);
  })

  it("should add a hint with metadata signed by a delegate via a meta-transaction", async () => {
    const namespace = ALICE
    const list = bytesToHex(stringToBytes("list"), {size: 32})
    const key = bytesToHex(stringToBytes("key"), {size : 32})
    const value = bytesToHex(stringToBytes("value"), {size: 32})
    const metadata = toHex("test,test")
    const delegate = BOB
    const delegateUntil = new Date().getTime() + 9999

    const metaTxSupportedController = new TrustedHintController({
      walletClient: caroWalletClient,
      metaTransactionWalletClient: bobWalletClient,
    });

    await controller.addListDelegate(ALICE, list, delegate, delegateUntil);
    const hint = await metaTxSupportedController.setHintDelegatedSigned(namespace, list, key, value, metadata);
    const newlySetHint = await controller.getHint(ALICE, list, key);
    const newlySetHintMetadata = await controller.contract.read.getMetadata([ALICE, list, key, value]);

    expect(hint).toBeDefined();
    expect(newlySetHint).toBe(value);
    expect(newlySetHintMetadata).toBe(metadata);
  })
});