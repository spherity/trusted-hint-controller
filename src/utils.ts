import {Client} from "viem";
import {deployments} from "@spherity/trusted-hint-registry";

export function getDeployment(client: Client, type: string) {
  const chainId = client.chain?.id;
  if (!chainId) {
    throw new Error(`No chainId found in provided readClient`)
  }

  const deployment =  deployments.find(d => d.chainId === chainId && d.type === type);
  if (!deployment) {
    throw new Error(`No deployment found for chainId ${chainId} and type ${type}`)
  }
  return deployment;
}