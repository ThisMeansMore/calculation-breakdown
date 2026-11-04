function deepFreeze(value) {
    if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
        return value;
    }
    Object.freeze(value);
    for (const child of Object.values(value))
        deepFreeze(child);
    return value;
}
function presentationValue(value) {
    if (value.type === 'money') {
        return { money: { amount: value.amount, currency: value.currency } };
    }
    if (value.type === 'duration') {
        return {
            duration: {
                amount: value.amount,
                unit: value.unit,
                ...(value.rounding !== undefined
                    ? { rounding: value.rounding }
                    : {}),
                ...(value.step !== undefined ? { step: value.step } : {}),
            },
        };
    }
    if (value.type === 'number') {
        return { number: { value: value.value } };
    }
    return { percent: { value: value.value } };
}
function row(id, value, operator) {
    return {
        id,
        ...(operator !== undefined ? { operator } : {}),
        ...presentationValue(value),
    };
}
function collectRows(node, rows, seen, operator) {
    if (node.type === 'operation') {
        collectRows(node.operands[0], rows, seen, operator);
        const rightOperator = node.operator === 'add'
            ? 'add'
            : node.operator === 'subtract'
                ? 'subtract'
                : undefined;
        collectRows(node.operands[1], rows, seen, rightOperator);
        return;
    }
    if (node.type === 'group') {
        if (node.semantic !== undefined && node.result !== undefined) {
            const id = node.id ?? node.semantic;
            if (!seen.has(id)) {
                seen.add(id);
                rows.push(row(id, node.result, operator));
            }
            return;
        }
        collectRows(node.expression, rows, seen, operator);
        return;
    }
    if (node.type === 'constant' || seen.has(node.semantic))
        return;
    seen.add(node.semantic);
    rows.push(row(node.semantic, node, operator));
}
function sectionFromGroup(group) {
    const rows = [];
    collectRows(group.expression, rows, new Set());
    return {
        id: group.id ?? group.semantic,
        rows,
        result: row(group.result.semantic, group.result, 'equals'),
    };
}
function collectSections(node, sections) {
    if (node.type === 'operation') {
        node.operands.forEach((operand) => collectSections(operand, sections));
        return;
    }
    if (node.type !== 'group')
        return;
    if (node.semantic !== undefined && node.result !== undefined) {
        sections.push(sectionFromGroup(node));
        return;
    }
    collectSections(node.expression, sections);
}
/** Creates a compact, framework-independent representation for UI rendering. */
export function toPresentation(calculation) {
    const sections = [];
    collectSections(calculation.breakdown, sections);
    if (sections.length === 0) {
        const rows = [];
        collectRows(calculation.breakdown, rows, new Set());
        sections.push({
            id: calculation.result.semantic,
            rows,
            result: row(calculation.result.semantic, calculation.result, 'equals'),
        });
    }
    return deepFreeze({ sections });
}
//# sourceMappingURL=calculation-breakdown-presentation.js.map