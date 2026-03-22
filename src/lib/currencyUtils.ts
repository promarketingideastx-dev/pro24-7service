export const getCurrencySymbol = (currencyCode: string): string => {
    if (!currencyCode) return '$';
    const symbols: Record<string, string> = { 
        HNL: 'L.', USD: '$', CAD: 'C$', GTQ: 'Q.', MXN: '$', COP: '$', 
        PEN: 'S/', BOB: 'Bs.', CRC: '₡', NIO: 'C$', PAB: 'B/.', ARS: '$', 
        CLP: '$', UYU: '$', PYG: '₲', EUR: '€', BRL: 'R$'
    };
    return symbols[currencyCode.toUpperCase()] || currencyCode;
};

/**
 * Returns a globally consistent formatted price based on the explicit currency.
 * It prevents dynamic locale conversion rules from distorting the currency appearance. 
 */
export const formatPrice = (amount: number, currency: string): string => {
    const code = (currency || 'USD').toUpperCase();
    const symbol = getCurrencySymbol(code);
    
    // We use standard comma for thousands and dot for decimals to keep
    // simple, strictly readable amounts globally, e.g. "L. 1,500.00"
    const formattedAmount = Number(amount).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });

    return `${symbol} ${formattedAmount}`;
};
