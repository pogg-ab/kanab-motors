const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

const SCALES = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

function convertGroup(val: number): string {
  let result = '';
  const hundreds = Math.floor(val / 100);
  const remainder = val % 100;

  if (hundreds > 0) {
    result += ONES[hundreds] + ' Hundred';
    if (remainder > 0) {
      result += ' ';
    }
  }

  if (remainder > 0) {
    if (remainder < 20) {
      result += ONES[remainder];
    } else {
      const tens = Math.floor(remainder / 10);
      const ones = remainder % 10;
      result += TENS[tens];
      if (ones > 0) {
        result += '-' + ONES[ones];
      }
    }
  }

  return result;
}

export function numberToWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Zero';

  const isNegative = amount < 0;
  let absoluteValue = Math.abs(amount);
  const integerPart = Math.floor(absoluteValue);

  if (integerPart === 0) return 'Zero';

  let remaining = integerPart;
  let scaleIndex = 0;
  const parts: string[] = [];

  while (remaining > 0) {
    const chunk = remaining % 1000;
    if (chunk > 0) {
      const chunkWords = convertGroup(chunk);
      const scale = SCALES[scaleIndex];
      parts.unshift(scale ? `${chunkWords} ${scale}` : chunkWords);
    }
    remaining = Math.floor(remaining / 1000);
    scaleIndex++;
  }

  const words = parts.join(' ');
  return isNegative ? 'Negative ' + words : words;
}

export function formatAmountInWords(amount: number, currency: string = 'USD'): string {
  const normCurrency = currency.toUpperCase();
  const absoluteValue = Math.abs(amount);
  const integerPart = Math.floor(absoluteValue);
  const centsPart = Math.round((absoluteValue - integerPart) * 100);

  const mainWords = numberToWords(integerPart);

  let currencyName = 'Dollars';
  let subunitName = 'Cents';

  if (normCurrency === 'EUR') {
    currencyName = 'Euros';
    subunitName = 'Cents';
  } else if (normCurrency === 'ETB') {
    currencyName = 'Ethiopian Birr';
    subunitName = 'Santim';
  } else if (normCurrency === 'GBP') {
    currencyName = 'Pounds Sterling';
    subunitName = 'Pence';
  } else if (normCurrency === 'JPY') {
    currencyName = 'Japanese Yen';
    subunitName = 'Sen';
  } else if (normCurrency === 'AED') {
    currencyName = 'UAE Dirhams';
    subunitName = 'Fils';
  } else if (normCurrency === 'CNY') {
    currencyName = 'Chinese Yuan';
    subunitName = 'Fen';
  } else if (normCurrency === 'INR') {
    currencyName = 'Indian Rupees';
    subunitName = 'Paise';
  }

  let result = `${normCurrency} ${mainWords} ${currencyName}`;
  if (centsPart > 0) {
    result += ` and ${centsPart}/100 ${subunitName}`;
  } else {
    result += ' Only';
  }

  return result;
}

