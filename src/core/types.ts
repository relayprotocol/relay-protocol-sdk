export type Commitment = {
  origins: {
    paymentTo: string;
    paymentCurrency: string;
    paymentAmount: string;
  }[];
  destination: {
    // Calls or intents?
  };
};
