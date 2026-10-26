import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    CalculationBreakdownBuilder,
    CalculationBreakdownError,
    toHumanString,
} from '../dist/index.js';
import type { ICalculationBreakdownOperation } from '../dist/index.js';

describe('CalculationBreakdownBuilder', () => {
    it('builds a nested calculation breakdown', () => {
        const builder = new CalculationBreakdownBuilder();
        const breakdown = builder
            .breakdown(({ money, duration, divide, group }) =>
                divide(
                    money('remainingCurrentPlanCredit', '47.00', 'USD'),
                    group(
                        divide(
                            money('newPlanRecurringPrice', '80.00', 'USD'),
                            duration('newPlanPeriod', '31', 'days'),
                        ),
                    ),
                ),
            )
            .result(({ duration }) =>
                duration('creditedCoverage', '18.3', 'days', {
                    rounding: 'up',
                    step: 0.1,
                }),
            )
            .build();

        assert.deepEqual(breakdown, {
            breakdown: {
                type: 'operation',
                operator: 'divide',
                operands: [
                    {
                        type: 'money',
                        semantic: 'remainingCurrentPlanCredit',
                        amount: '47.00',
                        currency: 'USD',
                    },
                    {
                        type: 'group',
                        expression: {
                            type: 'operation',
                            operator: 'divide',
                            operands: [
                                {
                                    type: 'money',
                                    semantic: 'newPlanRecurringPrice',
                                    amount: '80.00',
                                    currency: 'USD',
                                },
                                {
                                    type: 'duration',
                                    semantic: 'newPlanPeriod',
                                    amount: '31',
                                    unit: 'days',
                                },
                            ],
                        },
                    },
                ],
            },
            result: {
                type: 'duration',
                semantic: 'creditedCoverage',
                amount: '18.3',
                unit: 'days',
                rounding: 'up',
                step: 0.1,
            },
        });
    });

    it('builds aliases identically to generic operators', () => {
        const builder = new CalculationBreakdownBuilder();
        let aliasExpression;
        let genericExpression;

        builder.breakdown(({ constant, divide, operator, number }) => {
            const left = number('credit', '10');
            const right = constant('2');
            aliasExpression = divide(left, right);
            genericExpression = operator(left, 'divide', right);
            return aliasExpression;
        });

        assert.deepEqual(aliasExpression, genericExpression);
        const built = builder
            .result(({ number }) => number('result', '5'))
            .build();
        assert.equal(built.result.type, 'number');
        assert.equal(built.result.value, '5');
    });

    it('supports Decimal.js-style operator aliases', () => {
        const aliases = [
            ['sub', 'subtract'],
            ['mul', 'multiply'],
            ['div', 'divide'],
            ['min', 'minimum'],
            ['max', 'maximum'],
        ] as const;

        for (const [alias, canonical] of aliases) {
            const builder = new CalculationBreakdownBuilder();
            let helperExpression: ICalculationBreakdownOperation<string> | undefined;
            let genericExpression: ICalculationBreakdownOperation<string> | undefined;

            builder.breakdown((factories) => {
                const left = factories.constant('10');
                const right = factories.constant('2');
                helperExpression = factories[alias](left, right);
                genericExpression = factories.operator(left, alias, right);
                return helperExpression;
            });

            assert.deepEqual(helperExpression, genericExpression);
            assert.equal(
                (helperExpression as ICalculationBreakdownOperation<string> | undefined)
                    ?.operator,
                canonical,
            );
        }
    });

    it('records optional group presentation metadata and a result', () => {
        const calculation = new CalculationBreakdownBuilder<
            'result' | 'section' | 'subtotal'
        >()
            .breakdown(({ constant, group, number }) =>
                group(constant('10'), {
                    wrap: true,
                    semantic: 'section',
                    role: 'summary',
                    orientation: 'vertical',
                    result: number('subtotal', '10'),
                }),
            )
            .result(({ number }) => number('result', '10'))
            .build();

        assert.deepEqual(calculation.breakdown, {
            type: 'group',
            expression: { type: 'constant', value: '10' },
            wrap: true,
            semantic: 'section',
            role: 'summary',
            orientation: 'vertical',
            result: {
                type: 'number',
                semantic: 'subtotal',
                value: '10',
            },
        });
        assert.equal(
            toHumanString(calculation, {
                locale: 'en',
                dictionary: {
                    en: {
                        subtotal: { name: 'subtotal' },
                        result: { name: 'result' },
                    },
                },
            }),
            '(10 = 10 subtotal) = 10 result',
        );
    });

    it('renders English and Czech human-readable strings', () => {
        type Semantic = 'subtotal' | 'taxRate' | 'total';
        const builder = new CalculationBreakdownBuilder<Semantic>()
            .breakdown(({ money, percent, add, multiply }) =>
                add(
                    money('subtotal', '125.00', 'USD'),
                    multiply(
                        money('subtotal', '125.00', 'USD'),
                        percent('taxRate', '0.20'),
                    ),
                ),
            )
            .result(({ money }) => money('total', '150.00', 'USD'));
        const calculation = builder.build();

        const english = {
            locale: 'en',
            dictionary: {
                en: {
                    subtotal: { name: 'subtotal' },
                    taxRate: {
                        name: 'tax rate',
                        description: 'The percentage applied to the subtotal.',
                    },
                    total: { name: 'invoice total' },
                },
            },
        } as const;
        const czech = {
            locale: 'cs',
            dictionary: {
                cs: {
                    subtotal: { name: 'mezisoučet' },
                    taxRate: { name: 'sazba daně' },
                    total: { name: 'celkem' },
                },
            },
        } as const;

        assert.equal(
            toHumanString(calculation, english),
            '125.00 USD subtotal + (125.00 USD subtotal × 20% tax rate) = 150.00 USD invoice total',
        );
        assert.equal(
            toHumanString(calculation, {
                ...english,
                includeNames: false,
            }),
            '125.00 USD + (125.00 USD × 20%) = 150.00 USD',
        );
        assert.equal(
            builder.toHumanString(czech),
            '125,00 USD mezisoučet + (125,00 USD mezisoučet × 20% sazba daně) = 150,00 USD celkem',
        );
    });

    it('stores percentages as exact fractions and renders percentage notation', () => {
        const builder = new CalculationBreakdownBuilder<'rate'>()
            .breakdown(({ percent }) => percent('rate', '0.0025'))
            .result(({ percent }) => percent('rate', '-0.20'));
        const calculation = builder.build();

        assert.deepEqual(calculation.breakdown, {
            type: 'percent',
            semantic: 'rate',
            value: '0.0025',
        });
        assert.equal(
            builder.toHumanString({
                locale: 'cs',
                dictionary: { cs: { rate: { name: 'sazba' } } },
            }),
            '0,25% sazba = -20% sazba',
        );
    });

    it('localizes duration units and falls back to semantic keys', () => {
        const calculation = new CalculationBreakdownBuilder<'period'>()
            .breakdown(({ duration }) => duration('period', '2', 'days'))
            .result(({ duration }) => duration('period', '1', 'days'))
            .build();

        assert.equal(
            toHumanString(calculation, { locale: 'en', dictionary: {} }),
            '2 days period = 1 day period',
        );
        assert.equal(
            toHumanString(calculation, { locale: 'cs', dictionary: {} }),
            '2 dny period = 1 den period',
        );
    });

    it('localizes every duration unit with the platform Intl data', () => {
        const units = [
            ['milliseconds', 'milliseconds', 'milisekundy'],
            ['seconds', 'seconds', 'sekundy'],
            ['minutes', 'minutes', 'minuty'],
            ['hours', 'hours', 'hodiny'],
            ['days', 'days', 'dny'],
        ] as const;

        for (const [unit, english, czech] of units) {
            const calculation = new CalculationBreakdownBuilder<'period'>()
                .breakdown(({ duration }) => duration('period', '2', unit))
                .result(({ duration }) => duration('period', '2', unit))
                .build();

            assert.equal(
                toHumanString(calculation, {
                    locale: 'en',
                    dictionary: {},
                }),
                `2 ${english} period = 2 ${english} period`,
            );
            assert.equal(
                toHumanString(calculation, {
                    locale: 'cs',
                    dictionary: {},
                }),
                `2 ${czech} period = 2 ${czech} period`,
            );
        }
    });

    it('supports rounding steps of 0.1, 1, and 10', () => {
        for (const step of [0.1, 1, 10]) {
            const builder = new CalculationBreakdownBuilder();
            builder.breakdown(({ duration }) =>
                duration('coverage', '20', 'days'),
            );
            const built = builder
                .result(({ duration }) =>
                    duration('coverage', '20', 'days', {
                        rounding: 'up',
                        step,
                    }),
                )
                .build();
            assert.equal(built.result.type, 'duration');
            assert.equal(built.result.step, step);
        }
    });

    it('returns deeply frozen detached output', () => {
        const builder = new CalculationBreakdownBuilder();
        builder.breakdown(({ constant, add }) =>
            add(constant('1'), constant('1')),
        );

        const first = builder
            .result(({ number }) => number('total', '2'))
            .build();
        const second = builder.build();

        assert.notEqual(first, second);
        assert.ok(Object.isFrozen(first));
        assert.ok(Object.isFrozen(first.breakdown));
        assert.throws(() => {
            // @ts-expect-error Verify that readonly output is also immutable at runtime.
            first.result.value = '3';
        }, TypeError);
    });

    it('round-trips through JSON', () => {
        const builder = new CalculationBreakdownBuilder();
        builder.breakdown(({ money, constant, multiply }) =>
            multiply(money('originalPrice', '100.00', 'EUR'), constant('0.9')),
        );

        const breakdown = builder
            .result(({ money }) => money('discountedPrice', '90.00', 'EUR'))
            .build();
        assert.deepEqual(JSON.parse(JSON.stringify(breakdown)), breakdown);
    });

    it('requires a breakdown and result', () => {
        assert.throws(
            () => new CalculationBreakdownBuilder().build(),
            (error) =>
                error instanceof CalculationBreakdownError &&
                error.code === 'MISSING_BREAKDOWN',
        );

        assert.throws(
            () =>
                new CalculationBreakdownBuilder()
                    .breakdown(({ constant }) => constant('1'))
                    .build(),
            (error) =>
                error instanceof CalculationBreakdownError &&
                error.code === 'MISSING_RESULT',
        );
    });

    it('validates runtime inputs', () => {
        const cases: Array<{ code: string; run: (builder: any) => any }> = [
            {
                code: 'INVALID_SEMANTIC',
                run: ({ number }) => number('', '1'),
            },
            {
                code: 'INVALID_DECIMAL',
                run: ({ constant }) => constant('1e2'),
            },
            {
                code: 'INVALID_CURRENCY',
                run: ({ money }) => money('price', '1', 'eur'),
            },
            {
                code: 'INVALID_OPERATOR',
                run: ({ constant, operator }) =>
                    operator(constant('1'), 'power', constant('2')),
            },
            {
                code: 'INVALID_GROUP_ROLE',
                run: ({ constant, group }) =>
                    group(constant('1'), { role: 'heading' }),
            },
            {
                code: 'INVALID_GROUP_ORIENTATION',
                run: ({ constant, group }) =>
                    group(constant('1'), { orientation: 'diagonal' }),
            },
            {
                code: 'INVALID_ROUNDING_STEP',
                run: ({ duration }) =>
                    duration('period', '1', 'days', { rounding: 'up' }),
            },
            {
                code: 'INVALID_ROUNDING_STEP',
                run: ({ duration }) =>
                    duration('period', '1', 'days', {
                        rounding: 'up',
                        step: 0,
                    }),
            },
        ];

        for (const testCase of cases) {
            assert.throws(
                () => new CalculationBreakdownBuilder().breakdown(testCase.run),
                (error) =>
                    error instanceof CalculationBreakdownError &&
                    error.code === testCase.code,
            );
        }
    });
});
