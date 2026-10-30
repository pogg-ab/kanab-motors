import { formatAmountInWords, numberToWords } from './amount-in-words';

describe('Amount in Words Utility (POX-06)', () => {
  it('should convert standard integers into words', () => {
    expect(numberToWords(0)).toBe('Zero');
    expect(numberToWords(5)).toBe('Five');
    expect(numberToWords(19)).toBe('Nineteen');
    expect(numberToWords(45)).toBe('Forty-Five');
    expect(numberToWords(100)).toBe('One Hundred');
    expect(numberToWords(125)).toBe('One Hundred Twenty-Five');
    expect(numberToWords(1000)).toBe('One Thousand');
    expect(numberToWords(45250)).toBe('Forty-Five Thousand Two Hundred Fifty');
    expect(numberToWords(1250000)).toBe('One Million Two Hundred Fifty Thousand');
  });

  it('should format currency amount in words with cents', () => {
    const usdResult = formatAmountInWords(45250.75, 'USD');
    expect(usdResult).toBe('USD Forty-Five Thousand Two Hundred Fifty Dollars and 75/100 Cents');

    const eurResult = formatAmountInWords(120000, 'EUR');
    expect(eurResult).toBe('EUR One Hundred Twenty Thousand Euros Only');

    const etbResult = formatAmountInWords(500000.5, 'ETB');
    expect(etbResult).toBe('ETB Five Hundred Thousand Ethiopian Birr and 50/100 Santim');
  });
});

