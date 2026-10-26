import { CalculationBreakdownError } from './calculation-breakdown.error.js';
import { toHumanString, } from './calculation-breakdown-human-string.js';
const DECIMAL_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const DURATION_UNITS = new Set([
    'milliseconds',
    'seconds',
    'minutes',
    'hours',
    'days',
]);
const ROUNDING_MODES = new Set([
    'up',
    'down',
    'nearest',
]);
const GROUP_ROLES = new Set([
    'detail',
    'summary',
]);
const GROUP_ORIENTATIONS = new Set([
    'horizontal',
    'vertical',
]);
const OPERATORS = new Set([
    'add',
    'subtract',
    'multiply',
    'divide',
    'minimum',
    'maximum',
]);
const OPERATOR_ALIASES = {
    sub: 'subtract',
    mul: 'multiply',
    div: 'divide',
    min: 'minimum',
    max: 'maximum',
};
function assertSemantic(semantic) {
    if (semantic.trim().length === 0) {
        throw new CalculationBreakdownError('INVALID_SEMANTIC', 'Semantic must be a non-empty string.');
    }
}
function assertDecimal(value) {
    if (!DECIMAL_PATTERN.test(value)) {
        throw new CalculationBreakdownError('INVALID_DECIMAL', `Invalid decimal string: ${value}`);
    }
}
function assertDurationOptions(options) {
    if (!options)
        return;
    const hasRounding = options.rounding !== undefined;
    const hasStep = options.step !== undefined;
    const step = options.step;
    if (hasRounding &&
        !ROUNDING_MODES.has(options.rounding)) {
        throw new CalculationBreakdownError('INVALID_ROUNDING', `Invalid rounding mode: ${String(options.rounding)}`);
    }
    if (hasRounding !== hasStep) {
        throw new CalculationBreakdownError('INVALID_ROUNDING_STEP', 'Rounding and step must be provided together.');
    }
    if (hasStep &&
        (step === undefined || !Number.isFinite(step) || step <= 0)) {
        throw new CalculationBreakdownError('INVALID_ROUNDING_STEP', 'Rounding step must be a positive finite number.');
    }
}
function deepFreeze(value) {
    if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
        return value;
    }
    Object.freeze(value);
    for (const child of Object.values(value))
        deepFreeze(child);
    return value;
}
function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}
/**
 * Records a typed, serializable breakdown of a calculation performed elsewhere.
 *
 * This builder does not evaluate operations or calculate the result. The calling
 * application supplies every value, including the authoritative result.
 *
 * @typeParam Semantic - String union used to label the domain meaning of values.
 *
 * @example
 * ```ts
 * const breakdown = new CalculationBreakdownBuilder<'price' | 'total'>()
 *     .breakdown(({ money, constant, multiply }) =>
 *         multiply(money('price', '100.00', 'USD'), constant('0.9')),
 *     )
 *     .result(({ money }) => money('total', '90.00', 'USD'))
 *     .build();
 * ```
 */
export class CalculationBreakdownBuilder {
    breakdownValue;
    resultValue;
    nodeBuilder = {
        money: (semantic, amount, currency) => this.createMoney(semantic, amount, currency),
        duration: (semantic, amount, unit, options) => this.createDuration(semantic, amount, unit, options),
        number: (semantic, value) => this.createNumber(semantic, value),
        percent: (semantic, value) => this.createPercent(semantic, value),
        constant: (value) => this.createConstant(value),
        group: (expression, options) => this.createGroup(expression, options),
        operator: (left, operator, right) => this.createOperation(left, operator, right),
        add: (left, right) => this.createOperation(left, 'add', right),
        subtract: (left, right) => this.createOperation(left, 'subtract', right),
        sub: (left, right) => this.createOperation(left, 'sub', right),
        multiply: (left, right) => this.createOperation(left, 'multiply', right),
        mul: (left, right) => this.createOperation(left, 'mul', right),
        divide: (left, right) => this.createOperation(left, 'divide', right),
        div: (left, right) => this.createOperation(left, 'div', right),
        minimum: (left, right) => this.createOperation(left, 'minimum', right),
        min: (left, right) => this.createOperation(left, 'min', right),
        maximum: (left, right) => this.createOperation(left, 'maximum', right),
        max: (left, right) => this.createOperation(left, 'max', right),
    };
    /**
     * Creates an empty builder or restores one from a previously built object.
     *
     * Restored nodes are reconstructed through the same runtime validation as
     * newly authored nodes and do not retain references to the supplied object.
     */
    constructor(calculation) {
        if (calculation === undefined)
            return;
        if (!calculation || typeof calculation !== 'object') {
            throw this.invalidNode(calculation);
        }
        this.breakdownValue = this.hydrateNode(calculation.breakdown);
        this.resultValue = this.hydrateValue(calculation.result);
    }
    /**
     * Sets the root node that describes the calculation.
     *
     * @param create - Callback that describes the calculation using typed factories.
     * @returns This builder for fluent chaining.
     */
    breakdown(create) {
        this.breakdownValue = create(this.nodeBuilder);
        return this;
    }
    /**
     * Sets the authoritative result calculated by the calling application.
     *
     * @param create - Callback that constructs a money, duration, or number value.
     * @returns This builder for fluent chaining.
     */
    result(create) {
        this.resultValue = create(this.nodeBuilder);
        return this;
    }
    /**
     * Produces a detached, deeply frozen calculation breakdown.
     *
     * @throws {CalculationBreakdownError} If either the breakdown or result is missing.
     */
    build() {
        if (!this.breakdownValue) {
            throw new CalculationBreakdownError('MISSING_BREAKDOWN', 'A breakdown is required before building.');
        }
        if (!this.resultValue) {
            throw new CalculationBreakdownError('MISSING_RESULT', 'A result is required before building.');
        }
        return deepFreeze(cloneJson({
            breakdown: this.breakdownValue,
            result: this.resultValue,
        }));
    }
    /** Builds and renders the calculation using localized semantic labels. */
    toHumanString(options) {
        return toHumanString(this.build(), options);
    }
    hydrateNode(node) {
        if (!node || typeof node !== 'object') {
            throw this.invalidNode(node);
        }
        if (node.type === 'money' ||
            node.type === 'duration' ||
            node.type === 'number' ||
            node.type === 'percent') {
            return this.hydrateValue(node);
        }
        if (node.type === 'constant')
            return this.createConstant(node.value);
        if (node.type === 'operation') {
            if (!Array.isArray(node.operands) || node.operands.length !== 2) {
                throw this.invalidNode(node);
            }
            return this.createOperation(this.hydrateNode(node.operands[0]), node.operator, this.hydrateNode(node.operands[1]));
        }
        if (node.type === 'group') {
            return this.createGroup(this.hydrateNode(node.expression), {
                ...(node.wrap !== undefined ? { wrap: node.wrap } : {}),
                ...(node.semantic !== undefined
                    ? { semantic: node.semantic }
                    : {}),
                ...(node.result !== undefined
                    ? { result: this.hydrateValue(node.result) }
                    : {}),
                ...(node.role !== undefined ? { role: node.role } : {}),
                ...(node.orientation !== undefined
                    ? { orientation: node.orientation }
                    : {}),
            });
        }
        throw this.invalidNode(node);
    }
    hydrateValue(value) {
        if (!value || typeof value !== 'object') {
            throw this.invalidNode(value);
        }
        if (value.type === 'money') {
            return this.createMoney(value.semantic, value.amount, value.currency);
        }
        if (value.type === 'duration') {
            return this.createDuration(value.semantic, value.amount, value.unit, {
                ...(value.rounding !== undefined
                    ? { rounding: value.rounding }
                    : {}),
                ...(value.step !== undefined ? { step: value.step } : {}),
            });
        }
        if (value.type === 'number') {
            return this.createNumber(value.semantic, value.value);
        }
        if (value.type === 'percent') {
            return this.createPercent(value.semantic, value.value);
        }
        throw this.invalidNode(value);
    }
    invalidNode(value) {
        const type = typeof value === 'object' && value !== null && 'type' in value
            ? String(value.type)
            : String(value);
        return new CalculationBreakdownError('INVALID_NODE', `Unsupported calculation node: ${type}`);
    }
    createMoney(semantic, amount, currency) {
        assertSemantic(semantic);
        assertDecimal(amount);
        if (!CURRENCY_PATTERN.test(currency)) {
            throw new CalculationBreakdownError('INVALID_CURRENCY', `Currency must be a three-letter uppercase code: ${currency}`);
        }
        return deepFreeze({ type: 'money', semantic, amount, currency });
    }
    createDuration(semantic, amount, unit, options) {
        assertSemantic(semantic);
        assertDecimal(amount);
        if (!DURATION_UNITS.has(unit)) {
            throw new CalculationBreakdownError('INVALID_DURATION_UNIT', `Unsupported duration unit: ${unit}`);
        }
        assertDurationOptions(options);
        return deepFreeze({
            type: 'duration',
            semantic,
            amount,
            unit,
            ...(options?.rounding ? { rounding: options.rounding } : {}),
            ...(options?.step !== undefined ? { step: options.step } : {}),
        });
    }
    createNumber(semantic, value) {
        assertSemantic(semantic);
        assertDecimal(value);
        return deepFreeze({ type: 'number', semantic, value });
    }
    createPercent(semantic, value) {
        assertSemantic(semantic);
        assertDecimal(value);
        return deepFreeze({ type: 'percent', semantic, value });
    }
    createConstant(value) {
        assertDecimal(value);
        return deepFreeze({ type: 'constant', value });
    }
    createGroup(expression, options) {
        if (options?.semantic !== undefined) {
            assertSemantic(options.semantic);
        }
        if (options?.role !== undefined &&
            !GROUP_ROLES.has(options.role)) {
            throw new CalculationBreakdownError('INVALID_GROUP_ROLE', `Unsupported group role: ${String(options.role)}`);
        }
        if (options?.orientation !== undefined &&
            !GROUP_ORIENTATIONS.has(options.orientation)) {
            throw new CalculationBreakdownError('INVALID_GROUP_ORIENTATION', `Unsupported group orientation: ${String(options.orientation)}`);
        }
        return deepFreeze({
            type: 'group',
            expression,
            ...(options?.wrap === true ? { wrap: true } : {}),
            ...(options?.semantic !== undefined
                ? { semantic: options.semantic }
                : {}),
            ...(options?.result !== undefined
                ? { result: options.result }
                : {}),
            ...(options?.role !== undefined
                ? { role: options.role }
                : {}),
            ...(options?.orientation !== undefined
                ? { orientation: options.orientation }
                : {}),
        });
    }
    createOperation(left, operator, right) {
        const normalizedOperator = OPERATOR_ALIASES[operator] ?? operator;
        if (!OPERATORS.has(normalizedOperator)) {
            throw new CalculationBreakdownError('INVALID_OPERATOR', `Unsupported operator: ${operator}`);
        }
        return deepFreeze({
            type: 'operation',
            operator: normalizedOperator,
            operands: [left, right],
        });
    }
}
//# sourceMappingURL=calculation-breakdown-builder.js.map