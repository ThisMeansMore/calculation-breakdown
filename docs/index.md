---
title: calculation-breakdown
---

<!-- Generated from README.md. Do not edit directly. -->

# calculation-breakdown

Typed, serializable breakdowns of calculations performed elsewhere.

Use `calculation-breakdown` to record how an authoritative result was produced without coupling that record to a particular UI, locale, or business domain. A breakdown can describe invoice totals, taxes, discounts, fees, credits, exchange-rate conversions, usage charges, allocations, prorations, and other financial calculations.

The package has no runtime dependencies and supports browsers and Node.js 18+. **It does not perform arithmetic or calculate results.** Your application supplies every value and the authoritative result. The package only creates a structured record that other systems can render, localize, store, or audit.

## Why use it?

- Keep calculation traces typed alongside financial domain code.
- Serialize breakdowns as plain JSON for APIs, ledgers, invoices, logs, and audit records.
- Render the same calculation differently for customers, finance teams, and internal tools.
- Preserve decimal inputs exactly by representing monetary and numeric values as strings.
- Attach domain-specific semantic labels without embedding presentation text.

## Install

```sh
npm install calculation-breakdown
```

[Open the interactive playground](https://thismeansmore.github.io/calculation-breakdown/playground/).

## Usage

```ts
import {
    CalculationBreakdownBuilder,
    toHumanString,
} from 'calculation-breakdown';

type TSemantic =
    | 'invoiceSubtotal'
    | 'taxRate'
    | 'invoiceTotal';

const builder = new CalculationBreakdownBuilder<TSemantic>();

const breakdown = builder
    .breakdown(({ money, percent, add, multiply }) =>
        add(
            money('invoiceSubtotal', '125.00', 'USD'),
            multiply(
                money('invoiceSubtotal', '125.00', 'USD'),
                percent('taxRate', '0.20'),
            ),
        ),
    )
    .result(({ money }) => money('invoiceTotal', '150.00', 'USD'))
    .build();

const english = toHumanString(breakdown, {
    locale: 'en',
    includeNames: true,
    dictionary: {
        en: {
            invoiceSubtotal: { name: 'subtotal' },
            taxRate: {
                name: 'tax rate',
                description: 'The percentage applied to the subtotal.',
            },
            invoiceTotal: { name: 'invoice total' },
        },
    },
});
```

The resulting JSON describes:

```text
125.00 USD subtotal + (125.00 USD subtotal × 20% tax rate) = 150.00 USD invoice total
```

Values use decimal strings so their exact representation survives JSON serialization. The generic semantic union prevents unknown domain keys during type checking. Consumers can map each value's `type` to formatting and its `semantic` to localized labels, ledger concepts, or reporting categories.

Set `includeNames: false` to render only formatted values. It defaults to `true`.

## Builders

- `money(semantic, amount, currency)`
- `duration(semantic, amount, unit, options?)`
- `number(semantic, value)`
- `percent(semantic, value)` for fractional values (`'0.20'` renders as `20%`)
- `constant(value)` for semantic-free numeric constants
- `group(expression, options?)` for explicit brackets and optional `wrap`,
  `semantic`, authoritative grouped `result` metadata (for example, a line
  subtotal), a semantic `role` (`detail` by default or `summary`), and an
  `orientation` hint (`horizontal` by default or `vertical`)
- `operator(left, operator, right)`
- Helpers: `add`, `subtract`, `multiply`, `divide`, `minimum`, `maximum`
- Decimal.js-style aliases: `sub`, `mul`, `div`, `min`, `max`

For inferred tables, detail groups expose their semantic values as columns. A
`role: 'summary'` group renders as `group name | group result`. Formula renderers
still retain the complete expression; the role describes meaning rather than a
universal visual layout.

Detail groups default to `orientation: 'horizontal'`, allowing compatible groups
to share inferred columns. Use `orientation: 'vertical'` to retain every detail as
stacked `semantic name | value` rows. Orientation does not remove formula details.

Decimal.js-style names are also accepted by `operator`. They normalize to the
long-form names in the serialized output, so both naming styles produce the
same stable schema.

## Human-readable output

Use the exported `toHumanString` helper to render any plain breakdown, including
one restored from JSON. The builder exposes the same formatter as a convenience:

```ts
const czech = builder.toHumanString({
    locale: 'cs',
    dictionary: {
        cs: {
            invoiceSubtotal: { name: 'mezisoučet' },
            taxRate: {
                name: 'sazba daně',
                description: 'Procentní sazba použitá pro výpočet daně.',
            },
            invoiceTotal: { name: 'celkem' },
        },
    },
});
```

Any BCP 47 locale supported by the host's `Intl` implementation can control decimal
separators and duration-unit names; the dictionary groups domain-specific labels
by locale. The playground demonstrates English and Czech. Each semantic requires
`{ name, description? }`, with optional
explanatory copy for richer UIs. Missing dictionary entries fall back to their
semantic keys. Rendering does not modify the calculation, and `build()` continues
to return detached, deeply frozen plain JSON data.

Duration rounding metadata accepts `rounding: 'up' | 'down' | 'nearest'` and a positive numeric `step`. For example, steps `0.1`, `1`, and `10` mean tenths, whole units, and multiples of ten.

The built output is detached and deeply frozen. It contains no localized text, HTML, CSS, colors, or executable calculation logic, making it suitable for transport and storage across financial applications.
