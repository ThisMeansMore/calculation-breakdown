import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    CalculationBreakdownBuilder,
    toPresentation,
} from '../dist/index.js';

describe('CalculationBreakdownBuilder.toPresentation', () => {
    it('turns a result group and its nested result groups into a section', () => {
        type Semantic =
            | 'credit'
            | 'currentPlanCredit'
            | 'carryOverCredit'
            | 'downgradeFee'
            | 'totalCredit';

        const builder = new CalculationBreakdownBuilder<Semantic>()
            .breakdown(({ add, constant, group, money, subtract }) => {
                const term = (
                    id: string,
                    semantic: Semantic,
                    amount: string,
                ) =>
                    group(constant('0'), {
                        id,
                        semantic,
                        result: money(semantic, amount, 'EUR'),
                    });

                return group(
                    subtract(
                        add(
                            term('current', 'currentPlanCredit', '179.97'),
                            term('carry-over', 'carryOverCredit', '0.00'),
                        ),
                        term('fee', 'downgradeFee', '0.00'),
                    ),
                    {
                        id: 'credit',
                        semantic: 'credit',
                        result: money('totalCredit', '179.97', 'EUR'),
                    },
                );
            })
            .result(({ money }) => money('totalCredit', '179.97', 'EUR'));

        const expected = {
            sections: [
                {
                    id: 'credit',
                    rows: [
                        {
                            id: 'current',
                            money: { amount: '179.97', currency: 'EUR' },
                        },
                        {
                            id: 'carry-over',
                            operator: 'add',
                            money: { amount: '0.00', currency: 'EUR' },
                        },
                        {
                            id: 'fee',
                            operator: 'subtract',
                            money: { amount: '0.00', currency: 'EUR' },
                        },
                    ],
                    result: {
                        id: 'totalCredit',
                        operator: 'equals',
                        money: { amount: '179.97', currency: 'EUR' },
                    },
                },
            ],
        };

        const calculation = builder.build();
        const presentation = toPresentation(calculation);
        assert.deepEqual(presentation, expected);
        assert.ok(Object.isFrozen(presentation));
        assert.ok(Object.isFrozen(presentation.sections[0]?.rows[0]));
        assert.deepEqual(builder.toPresentation(), expected);
        assert.deepEqual(
            new CalculationBreakdownBuilder(calculation).toPresentation(),
            expected,
        );
    });

    it('creates a fallback section and preserves presentation value metadata', () => {
        const calculation = new CalculationBreakdownBuilder<'period'>()
            .breakdown(({ duration }) =>
                duration('period', '271.65', 'days'),
            )
            .result(({ duration }) =>
                duration('period', '271.7', 'days', {
                    rounding: 'up',
                    step: 0.1,
                }),
            )
            .build();

        assert.deepEqual(
            new CalculationBreakdownBuilder(calculation).toPresentation(),
            {
                sections: [
                    {
                        id: 'period',
                        rows: [
                            {
                                id: 'period',
                                duration: { amount: '271.65', unit: 'days' },
                            },
                        ],
                        result: {
                            id: 'period',
                            operator: 'equals',
                            duration: {
                                amount: '271.7',
                                unit: 'days',
                                rounding: 'up',
                                step: 0.1,
                            },
                        },
                    },
                ],
            },
        );
    });

    it('represents numbers and percentages with one typed property', () => {
        const calculation = new CalculationBreakdownBuilder<'count' | 'rate'>()
            .breakdown(({ add, number, percent }) =>
                add(number('count', '2'), percent('rate', '0.20')),
            )
            .result(({ number }) => number('count', '2'))
            .build();

        assert.deepEqual(
            new CalculationBreakdownBuilder(calculation).toPresentation()
                .sections[0]?.rows,
            [
                { id: 'count', number: { value: '2' } },
                { id: 'rate', operator: 'add', percent: { value: '0.20' } },
            ],
        );
    });
});
