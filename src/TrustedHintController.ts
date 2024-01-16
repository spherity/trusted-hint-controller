import {createPublicClient, http, PublicClient, WalletClient} from "viem";
import {getChain} from "./util";

interface WalletOnly {
  wallet: WalletClient;
  nodeConnection?: never;
}

interface NodeConnectionOnly {
  wallet?: never;
  nodeConnection: NodeConnectionInstruction;
}

interface NodeConnectionInstruction {
  rpcUrl: string;
  chainId: number;
}

type TrustedHintControllerConfig = WalletOnly | NodeConnectionOnly;

export class TrustedHintController {
  private readonly client: PublicClient | WalletClient;
  constructor(config: TrustedHintControllerConfig) {
    if (config.wallet) {
      this.client = config.wallet;
    } else {
      this.client = createPublicClient({
        chain: getChain(config.nodeConnection?.chainId),
        transport: http(config.nodeConnection?.rpcUrl)
      })
    }
  }
  public test() {
    console.log(this.client);
    return true;
  }
}