const paystackFeeRates = {
  getTransferFee: (country: string, method: 'bank' | 'mobile', amount: number): number => {
    if (country === 'KENYA') {
      if (method === 'mobile') {
        if (amount <= 1500) return 20;
        if (amount <= 20000) return 40;
        return 60;
      } else { // bank
        return 80; // example flat fee
      }
    }
    return 0;
  }
};

export default paystackFeeRates;
