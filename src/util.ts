import * as chains from "viem/chains";

export function getChain(chainId: number): chains.Chain {
  for (const chain of Object.values(chains)) {
    if (chain.id === chainId) {
      return chain;
    }
  }
  throw new Error(`Chain with id ${chainId} not found`);
}