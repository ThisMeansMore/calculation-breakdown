import {
    CalculationBreakdownBuilder,
    toHumanString,
} from 'calculation-breakdown';

type Semantic = 'price' | 'period' | 'coverage';

const builder = new CalculationBreakdownBuilder<Semantic>();

builder.breakdown(({ money, duration, divide }) => {
    return divide(
        money('price', '100.00', 'EUR'),
        duration('period', '30', 'days'),
    );
});

builder.result(({ duration }) => duration('coverage', '10', 'days')).build();

const calculation = builder.build();
toHumanString(calculation, {
    locale: 'en',
    includeNames: false,
    dictionary: {
        en: {
            price: { name: 'price' },
            period: { name: 'period', description: 'Billing period.' },
        },
    },
});
builder.toHumanString({
    locale: 'cs',
    dictionary: {
        cs: { price: { name: 'cena' }, coverage: { name: 'pokrytí' } },
    },
});

toHumanString(calculation, {
    locale: 'en',
    dictionary: {
        en: {
            // @ts-expect-error dictionary entries require an object with a name
            price: 'price',
        },
    },
});

new CalculationBreakdownBuilder<Semantic>()
    .breakdown(({ percent }) => percent('price', '0.20'))
    .result(({ percent }) => percent('price', '0.20'))
    .build();

new CalculationBreakdownBuilder<Semantic>()
    .breakdown(({ constant, group }) =>
        group(constant('1'), {
            wrap: true,
            semantic: 'price',
            role: 'summary',
            orientation: 'vertical',
        }),
    )
    .result(({ number }) => number('price', '1'))
    .build();

builder.breakdown(({ constant, operator, sub, mul, div, min, max }) => {
    const left = constant('10');
    const right = constant('2');
    operator(left, 'div', right);
    sub(left, right);
    mul(left, right);
    div(left, right);
    min(left, right);
    return max(left, right);
});

new CalculationBreakdownBuilder<Semantic>().breakdown(({ money }) => {
    // @ts-expect-error unknown semantic
    return money('unknown', '1.00', 'EUR');
});

new CalculationBreakdownBuilder<Semantic>().breakdown(({ constant }) => {
    // Constants intentionally require no semantic.
    return constant('1');
});
