import { chains } from "../chains";
import { Commitment } from "../types";

export const validate = async (commitment: Commitment) => {
  // Validate the origins
  for (const origin of commitment.origins) {
    const chain = chains[origin.chain];
  }
};
