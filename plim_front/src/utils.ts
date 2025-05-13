export const containsAtLeastOne = (filterString: string, array: string[], suffixValues: any) => {
    return array?.some(substring => filterString.includes(substring+":"+suffixValues[substring]));
}

export const clearBreakets = (stringWithBreakets: string) => {
    return stringWithBreakets.replace(/\[[^\]]*\]/g, '');
}