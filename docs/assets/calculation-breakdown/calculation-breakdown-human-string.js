const INFIX_OPERATORS = {
    add: '+',
    subtract: '−',
    multiply: '×',
    divide: '÷',
};
function localizeDecimal(value, locale) {
    const separator = new Intl.NumberFormat(locale, {
        useGrouping: false,
        maximumFractionDigits: 1,
    })
        .formatToParts(1.1)
        .find((part) => part.type === 'decimal')?.value;
    return separator && separator !== '.'
        ? value.replace('.', separator)
        : value;
}
function decimalToPercent(value) {
    const negative = value.startsWith('-');
    const unsigned = negative ? value.slice(1) : value;
    const [whole = '0', fraction = ''] = unsigned.split('.');
    const digits = `${whole}${fraction}`;
    const decimalIndex = whole.length + 2;
    const padded = digits.padEnd(decimalIndex, '0');
    const integer = padded
        .slice(0, decimalIndex)
        .replace(/^0+(?=\d)/, '');
    const decimals = padded.slice(decimalIndex).replace(/0+$/, '');
    return `${negative ? '-' : ''}${integer}${decimals ? `.${decimals}` : ''}`;
}
function localizeDurationUnit(amount, unit, locale) {
    const singularUnit = unit.slice(0, -1);
    const unitPart = new Intl.NumberFormat(locale, {
        style: 'unit',
        unit: singularUnit,
        unitDisplay: 'long',
        useGrouping: false,
    })
        .formatToParts(Number(amount))
        .find((part) => part.type === 'unit');
    if (!unitPart) {
        throw new Error(`Unable to localize duration unit: ${unit}`);
    }
    return unitPart.value;
}
function labelValue(value, semantic, options) {
    if (options.includeNames === false)
        return value;
    const entry = options.dictionary[options.locale]?.[semantic];
    const label = entry?.name ?? semantic;
    return `${value} ${label}`;
}
function renderValue(value, options) {
    const rawDecimal = value.type === 'number' || value.type === 'percent'
        ? value.value
        : value.amount;
    const decimal = localizeDecimal(rawDecimal, options.locale);
    if (value.type === 'money') {
        return labelValue(`${decimal} ${value.currency}`, value.semantic, options);
    }
    if (value.type === 'duration') {
        return labelValue(`${decimal} ${localizeDurationUnit(value.amount, value.unit, options.locale)}`, value.semantic, options);
    }
    if (value.type === 'percent') {
        return labelValue(`${localizeDecimal(decimalToPercent(value.value), options.locale)}%`, value.semantic, options);
    }
    return labelValue(decimal, value.semantic, options);
}
function renderNode(node, options, nested = false) {
    if (node.type === 'constant') {
        return localizeDecimal(node.value, options.locale);
    }
    if (node.type === 'group') {
        const result = node.result
            ? ` = ${renderValue(node.result, options)}`
            : '';
        return `(${renderNode(node.expression, options)}${result})`;
    }
    if (node.type !== 'operation') {
        return renderValue(node, options);
    }
    const [left, right] = node.operands;
    if (node.operator === 'minimum' || node.operator === 'maximum') {
        const functionName = node.operator === 'minimum' ? 'min' : 'max';
        return `${functionName}(${renderNode(left, options)}, ${renderNode(right, options)})`;
    }
    const rendered = `${renderNode(left, options, true)} ${INFIX_OPERATORS[node.operator]} ${renderNode(right, options, true)}`;
    return nested ? `(${rendered})` : rendered;
}
/** Renders a plain calculation breakdown without changing its serialized form. */
export function toHumanString(calculation, options) {
    return `${renderNode(calculation.breakdown, options)} = ${renderValue(calculation.result, options)}`;
}
//# sourceMappingURL=calculation-breakdown-human-string.js.map