import {
    CalculationBreakdownBuilder,
    toHumanString,
} from '../dist/index.js';

const DEFAULT_BUILDER_WITH_LOCALE = `// Derive calendar-day counts in UTC to avoid daylight-saving offsets.
const helper = {
  now: new Date(),
  get year() { return this.now.getFullYear(); },
  day(month, date) { return Date.UTC(this.year, month, date); },
  daysBetween(from, to) { return Math.round((to - from) / 86400000); },
  get nextYear() { return Date.UTC(this.year + 1, 0, 1); },
  get daysInYear() { return this.daysBetween(this.day(0, 1), this.nextYear); },
  get remainingDays() {
    return this.daysBetween(
      this.day(this.now.getMonth(), this.now.getDate()),
      this.nextYear,
    );
  },
  moneyValue(value) { return value.toFixed(2); },
};
// Supply authoritative business amounts calculated by the host application.
const annualInsurancePrice = 444;
const iphoneAfterDiscountAmount = 759.05;
const airpodsAfterDiscountAmount = 45;
const insuranceAmount = annualInsurancePrice / helper.daysInYear * helper.remainingDays;
const subtotalAmount = iphoneAfterDiscountAmount + airpodsAfterDiscountAmount + insuranceAmount;
const taxAmount = subtotalAmount * 0.20;
const invoiceTotalAmount = subtotalAmount + taxAmount;
// Build the complete invoice calculation tree.
const invoice = new CalculationBreakdownBuilder()
  .breakdown(({ money, number, duration, percent, add, subtract, multiply, divide, group }) => {
    // Reuse one calculation shape for every discounted item line.
    const discountedItem = ({ semantic, unitPrice, quantity, discount, subtotal }) => {
      const beforeDiscount = multiply(
        money('itemUnitPrice', unitPrice, 'USD'),
        number('itemQuantity', quantity),
      );

      return group(
        subtract(
          group(beforeDiscount),
          multiply(group(beforeDiscount), percent('itemDiscount', discount)),
        ),
        {
          wrap: true,
          semantic,
          result: money('itemSubtotal', subtotal, 'USD'),
        },
      );
    };

    // Combine compatible item groups under one identity-column semantic.
    const itemLines = group(
      add(
        discountedItem({
          semantic: 'iphoneLine',
          unitPrice: '799.00',
          quantity: '1',
          discount: '0.05',
          subtotal: helper.moneyValue(iphoneAfterDiscountAmount),
        }),
        discountedItem({
          semantic: 'airpodsLine',
          unitPrice: '25.00',
          quantity: '2',
          discount: '0.10',
          subtotal: helper.moneyValue(airpodsAfterDiscountAmount),
        }),
      ),
      { semantic: 'itemName' },
    );

    // Preserve every insurance detail in a vertical structured view.
    const insuranceLine = group(
      multiply(
        group(
          divide(
            money('insuranceAnnualPrice', helper.moneyValue(annualInsurancePrice), 'USD'),
            duration('insuranceYearLength', String(helper.daysInYear), 'days'),
          ),
        ),
        duration('insuranceRemainingDays', String(helper.remainingDays), 'days'),
      ),
      {
        wrap: true,
        semantic: 'insuranceLine',
        orientation: 'vertical',
        result: money('insuranceSubtotal', helper.moneyValue(insuranceAmount), 'USD'),
      },
    );

    // Combine all detailed invoice lines before calculating summaries.
    const linesBeforeTax = add(
      itemLines,
      insuranceLine,
    );
    // Expose the tax rate as an explicit authoritative summary.
    const taxRate = percent('taxRate', '0.20');
    const tax = multiply(
      money('subtotalBeforeTax', helper.moneyValue(subtotalAmount), 'USD'),
      group(taxRate, {
        semantic: 'taxRate',
        role: 'summary',
        result: taxRate,
      }),
    );

    // Return the before-tax and after-tax roll-ups.
    return add(
      group(linesBeforeTax, {
        semantic: 'beforeTaxLine',
        role: 'summary',
        result: money('subtotalBeforeTax', helper.moneyValue(subtotalAmount), 'USD'),
      }),
      group(tax, {
        wrap: true,
        semantic: 'afterTaxLine',
        role: 'summary',
        result: money('invoiceTotal', helper.moneyValue(invoiceTotalAmount), 'USD'),
      }),
    );
  })
  // Attach the authoritative result independently from the explanatory tree.
  .result(({ money }) => money('invoiceTotal', helper.moneyValue(invoiceTotalAmount), 'USD'))
  .build();

// Optional localized title; comment out its return property below to disable it.
const title = { en: 'Invoice calculation', cs: 'Výpočet faktury' };

// Optional semantic dictionary; comment out its return property below to disable it.
const dictionary = {
    // Define English names and tooltip descriptions.
    en: {
      iphoneLine: { name: 'iPhone', description: 'Item quantity with a line discount.' },
      airpodsLine: { name: 'AirPods', description: 'Item quantity with a line discount.' },
      itemName: { name: 'Item name', description: 'Name of the invoiced item.' },
      insuranceLine: { name: 'Insurance', description: 'Annual insurance prorated from today through December 31.' },
      beforeTaxLine: { name: 'Before tax', description: 'Line subtotals combined before tax.' },
      afterTaxLine: { name: 'After tax', description: 'Total before tax with 20% tax applied.' },
      itemUnitPrice: { name: 'unit price', description: 'Price for one Item.' },
      itemQuantity: { name: 'quantity', description: 'Number of Items invoiced.' },
      itemDiscount: { name: 'discount', description: 'Discount applied to the Item line total.' },
      itemSubtotal: { name: 'subtotal', description: 'Item line total after discount.' },
      insuranceAnnualPrice: { name: 'annual price', description: 'Price of insurance coverage for the entire current year.' },
      insuranceYearLength: { name: 'days in current year', description: 'Calendar length used to derive the exact daily insurance price.' },
      insuranceRemainingDays: { name: 'remaining days', description: 'Coverage from ' + helper.now.toLocaleDateString('en-US') + ' through December 31.' },
      insuranceSubtotal: { name: 'subtotal', description: 'Prorated insurance total for the remaining calendar year.' },
      subtotalBeforeTax: { name: 'subtotal before tax', description: 'Item subtotals plus prorated insurance: ' + helper.moneyValue(subtotalAmount) + ' USD.' },
      taxRate: { name: 'tax rate', description: 'Tax applied to the subtotal before tax.' },
      invoiceTotal: { name: 'total after tax', description: 'Authoritative invoice amount after tax.' },
    },
    // Define Czech names and tooltip descriptions.
    cs: {
      iphoneLine: { name: 'iPhone', description: 'Množství položky se slevou na řádku.' },
      airpodsLine: { name: 'AirPods', description: 'Množství položky se slevou na řádku.' },
      itemName: { name: 'Název položky', description: 'Název fakturované položky.' },
      insuranceLine: { name: 'Pojištění', description: 'Roční pojištění poměrně ode dneška do 31. prosince.' },
      beforeTaxLine: { name: 'Před zdaněním', description: 'Součet řádkových mezisoučtů před daní.' },
      afterTaxLine: { name: 'Po zdanění', description: 'Celková částka před daní se sazbou daně 20 %.' },
      itemUnitPrice: { name: 'jednotková cena', description: 'Cena za jednu položku.' },
      itemQuantity: { name: 'množství', description: 'Počet fakturovaných položek.' },
      itemDiscount: { name: 'sleva', description: 'Sleva z celkové ceny řádku položky.' },
      itemSubtotal: { name: 'mezisoučet', description: 'Celková cena řádku položky po slevě.' },
      insuranceAnnualPrice: { name: 'roční cena', description: 'Cena pojistného krytí za celý aktuální rok.' },
      insuranceYearLength: { name: 'počet dní v roce', description: 'Délka kalendářního roku použitá pro výpočet přesné denní ceny.' },
      insuranceRemainingDays: { name: 'zbývající dny', description: 'Krytí od ' + helper.now.toLocaleDateString('cs-CZ') + ' do 31. prosince.' },
      insuranceSubtotal: { name: 'mezisoučet', description: 'Poměrná cena pojištění pro zbytek kalendářního roku.' },
      subtotalBeforeTax: { name: 'mezisoučet před daní', description: 'Mezisoučty položek plus poměrná část pojištění: ' + helper.moneyValue(subtotalAmount).replace('.', ',') + ' USD.' },
      taxRate: { name: 'sazba daně', description: 'Daň uplatněná na mezisoučet před daní.' },
      invoiceTotal: { name: 'celkem po zdanění', description: 'Výsledná částka faktury po zdanění.' },
    },
};

// Return the calculation plus any optional presentation metadata you want to use.
return {
  calculation: invoice,
  title,      // Optional: comment out this line to use the default title.
  dictionary, // Optional: comment out this line to use semantic keys directly.
};`;

const localeMetadataStart = DEFAULT_BUILDER_WITH_LOCALE.indexOf(
    '\n// Optional localized title',
);
const DEFAULT_BUILDER_CORE = DEFAULT_BUILDER_WITH_LOCALE.slice(
    0,
    localeMetadataStart,
);
const DEFAULT_LOCALE_METADATA = DEFAULT_BUILDER_WITH_LOCALE.slice(
    localeMetadataStart,
);
const DEFAULT_MINIMAL_EXPORT = `

// Export only the calculation; renderers fall back to its semantic keys.
return { calculation: invoice };`;
const DEFAULT_BUILDER = `${DEFAULT_BUILDER_CORE}${DEFAULT_MINIMAL_EXPORT}`;

function setBuilderLocaleMode(source, useLocale) {
    const localizedStart = source.indexOf('\n// Optional localized title');
    const hasMinimalExport = source.endsWith(DEFAULT_MINIMAL_EXPORT);
    const core = localizedStart >= 0
        ? source.slice(0, localizedStart)
        : hasMinimalExport
            ? source.slice(0, -DEFAULT_MINIMAL_EXPORT.length)
            : source;

    if (localizedStart < 0 && !hasMinimalExport) return source;
    return `${core}${useLocale ? DEFAULT_LOCALE_METADATA : DEFAULT_MINIMAL_EXPORT}`;
}

const DEFAULT_CSS = `.calculation-card__expression {
  font: 650 14px/1.45 Inter, system-ui, sans-serif;
  white-space: nowrap;
}

.calculation-group--multiline {
  display: block;
}

.calculation-line {
  display: block;
  margin: .32em 0;
}

.calculation-line--detail {
  margin-left: .75em;
  padding-left: .9em;
  border-left: 1px solid #d9dfc2;
}

.calculation-line__content {
  white-space: nowrap;
}

.calculation-bracket {
  color: var(--bracket-color);
  background: color-mix(in srgb, var(--bracket-color), transparent 88%);
  border-radius: 3px;
  font-weight: 850;
}

.calculation-line--summary {
  margin-top: .75em;
  padding-top: .75em;
  border-top: 2px solid #c7ccb8;
}

.calculation-table-section + .calculation-table-section {
  margin-top: 1.25em;
}

.calculation-table-section {
  border: 1px solid #d9dfc2;
  border-radius: 12px;
}

.calculation-table {
  width: 100%;
  border-collapse: collapse;
  white-space: nowrap;
  font-size: 14px;
}

.calculation-table th,
.calculation-table td {
  padding: .65em .8em;
  border-bottom: 1px solid #d9dfc2;
  text-align: var(--cell-align, left);
}

.calculation-table tbody tr:last-child td {
  border-bottom: 0;
}

.calculation-table th {
  color: #637236;
  font-size: 10px;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.calculation-table--totals {
  width: 100%;
  margin-left: auto;
}

.calculation-table--results td:first-child {
  color: #637236;
}

.calculation-table--vertical caption {
  padding: .65em .8em;
  text-align: left;
}

.calculation-table--vertical td:first-child {
  color: #637236;
}

.calculation-table__emphasis td {
  border-top: 2px solid #1c2114;
  font-weight: 850;
}

.semantic-token {
  position: relative;
  color: var(--semantic-color);
  text-decoration: none;
  cursor: help;
  outline: none;
}

.semantic-token:hover {
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;
}

.semantic-token:focus-visible {
  border-radius: 2px;
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

.semantic-tooltip {
  position: fixed;
  z-index: 100;
  width: max-content;
  max-width: 240px;
  padding: 9px 11px;
  border-radius: 8px;
  background: #1c2114;
  color: #f7f8f1;
  box-shadow: 0 8px 28px rgba(0, 0, 0, .28);
  font: 500 12px/1.4 Inter, system-ui, sans-serif;
  white-space: normal;
  pointer-events: none;
}

.group-label {
  margin-right: .55em;
  color: #1c2114;
  font-weight: 850;
  text-decoration: none;
}`;

const elements = {
    builder: document.querySelector('#builder'),
    builderHighlight: document.querySelector('#builder-highlight'),
    css: document.querySelector('#css'),
    cssHighlight: document.querySelector('#css-highlight'),
    preview: document.querySelector('#preview'),
    template: document.querySelector('#preview-template'),
    status: document.querySelector('#status'),
    run: document.querySelector('#run'),
    reset: document.querySelector('#reset'),
    useLocale: document.querySelector('#use-locale'),
};

let updateTimer;
let selectedLocale = 'en';
let selectedView = 'table';
let showNames = false;
const SEMANTIC_COLORS = [
    '#6650d8',
    '#b84d15',
    '#08776d',
    '#a72e63',
    '#55750e',
    '#2563a6',
    '#8a4f00',
    '#7040a0',
    '#287044',
];
const BRACKET_COLORS = ['#e63946', '#0081a7', '#f77f00', '#7b2cbf'];

function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

function highlight(source, language) {
    const pattern =
        language === 'typescript'
            ? /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)|(\b(?:const|let|var|return|new|typeof|instanceof|if|else|for|of|in|true|false|null|undefined|as|type|interface|extends|readonly)\b)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)(?=\s*\()/g
            : /(\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")|(@[\w-]+)|(#(?:[\da-fA-F]{3,8})\b)|(\b\d+(?:\.\d+)?(?:px|rem|em|vw|vh|fr|%|s|ms)?\b)|((?:--)?[\w-]+)(?=\s*:)|([^{}]+)(?=\s*\{)/g;
    let output = '';
    let cursor = 0;

    for (const match of source.matchAll(pattern)) {
        output += escapeHtml(source.slice(cursor, match.index));
        const className = language === 'typescript'
            ? match[1] ? 'comment'
                : match[2] ? 'string'
                    : match[3] ? 'keyword'
                        : match[4] ? 'number'
                            : 'function'
            : match[1] ? 'comment'
                : match[2] ? 'string'
                    : match[3] ? 'atrule'
                        : match[4] ? 'color'
                            : match[5] ? 'number'
                                : match[6] ? 'property'
                                    : 'selector';
        output += `<span class="token-${className}">${escapeHtml(match[0])}</span>`;
        cursor = match.index + match[0].length;
    }
    return `${output}${escapeHtml(source.slice(cursor))}\n`;
}

function updateHighlight(editor, layer, language) {
    layer.innerHTML = highlight(editor.value, language);
    layer.scrollTop = editor.scrollTop;
    layer.scrollLeft = editor.scrollLeft;
}

function updateHighlights() {
    updateHighlight(elements.builder, elements.builderHighlight, 'typescript');
    updateHighlight(elements.css, elements.cssHighlight, 'css');
}

let activeTooltip;

function hideTooltip() {
    activeTooltip?.remove();
    activeTooltip = undefined;
}

function showTooltip(token) {
    hideTooltip();
    const card = token.closest('.calculation-card');
    if (!card || !token.dataset.tooltip) return;

    const tooltip = document.createElement('div');
    tooltip.className = 'semantic-tooltip';
    tooltip.textContent = token.dataset.tooltip;
    document.body.append(tooltip);

    const tokenRect = token.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const inset = 8;
    const preferredLeft =
        tokenRect.left + tokenRect.width / 2 - tooltipRect.width / 2;
    const left = Math.min(
        Math.max(preferredLeft, cardRect.left + inset),
        cardRect.right - tooltipRect.width - inset,
    );
    const spaceAbove = tokenRect.top - cardRect.top;
    const preferredTop =
        spaceAbove >= tooltipRect.height + 10
            ? tokenRect.top - tooltipRect.height - 10
            : tokenRect.bottom + 10;
    const top = Math.min(
        Math.max(preferredTop, cardRect.top + inset),
        cardRect.bottom - tooltipRect.height - inset,
    );

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    activeTooltip = tooltip;
}

function installTooltips(container) {
    for (const token of container.querySelectorAll('.semantic-token')) {
        token.addEventListener('pointerenter', () => showTooltip(token));
        token.addEventListener('pointerleave', hideTooltip);
        token.addEventListener('focus', () => showTooltip(token));
        token.addEventListener('blur', hideTooltip);
    }
    for (const card of container.querySelectorAll('.calculation-card')) {
        card.addEventListener('scroll', hideTooltip, { passive: true });
    }
}

function evaluateBuilder(source) {
    const execute = new Function(
        'CalculationBreakdownBuilder',
        'toHumanString',
        `"use strict";\n${source}`,
    );
    const output = execute(CalculationBreakdownBuilder, toHumanString);
    if (
        !output ||
        (!output.calculation && !output.examples?.length)
    ) {
        throw new Error(
            'Builder code must return { calculation, dictionary } or { examples, dictionary }.',
        );
    }
    return output;
}

function collectSemantics(calculation) {
    const semantics = [];
    const visit = (node) => {
        if ('semantic' in node && !semantics.includes(node.semantic)) {
            semantics.push(node.semantic);
        }
        if (node.type === 'operation') {
            node.operands.forEach(visit);
        } else if (node.type === 'group') {
            visit(node.expression);
            if (node.result) visit(node.result);
        }
    };

    visit(calculation.breakdown);
    visit(calculation.result);
    return semantics;
}

function createSemanticEntries(output, calculation, locale) {
    const semantics = collectSemantics(calculation);
    return semantics.map((semantic, index) => {
        const entry = output.dictionary?.[locale]?.[semantic];
        return {
            semantic,
            label: entry?.name ?? semantic,
            explanation: entry?.description ?? `Semantic key: ${semantic}`,
            color: SEMANTIC_COLORS[index % SEMANTIC_COLORS.length],
        };
    });
}

function useDescriptionOnlyTooltip(container, cell, entries) {
    for (const token of container.querySelectorAll('.semantic-token')) {
        const semantic = token.dataset.semantic ?? cell?.semantic;
        const entry = entries.find((candidate) => candidate.semantic === semantic);
        if (entry) token.dataset.tooltip = entry.explanation;
    }
}

function collectResultGroups(node, groups = [], headingSemantic) {
    if (node.type === 'operation') {
        node.operands.forEach((operand) =>
            collectResultGroups(operand, groups, headingSemantic),
        );
    } else if (node.type === 'group') {
        const nestedHeading = node.result
            ? headingSemantic
            : (node.semantic ?? headingSemantic);
        collectResultGroups(node.expression, groups, nestedHeading);
        if (node.semantic && node.result) {
            groups.push({ ...node, tableHeadingSemantic: headingSemantic });
        }
    }
    return groups;
}

function collectUniqueValues(node, values = [], seen = new Set()) {
    if (node.type === 'operation') {
        node.operands.forEach((operand) => collectUniqueValues(operand, values, seen));
    } else if (node.type === 'group') {
        collectUniqueValues(node.expression, values, seen);
    } else if (node.type !== 'constant' && !seen.has(node.semantic)) {
        seen.add(node.semantic);
        values.push(node);
    }
    return values;
}

function groupValues(group) {
    const values = collectUniqueValues(group.expression);
    if (!values.some(({ semantic }) => semantic === group.result.semantic)) {
        values.push(group.result);
    }
    return values;
}

function valueSignature(group) {
    return groupValues(group).map(({ semantic }) => semantic).join('|');
}

function appendValueCell(container, value, entries, locale, dictionary) {
    appendAnnotatedNode(container, value, entries, locale, dictionary);
    useDescriptionOnlyTooltip(container, value, entries);
}

function createTable(className = 'calculation-table') {
    const sectionContainer = document.createElement('div');
    sectionContainer.className = 'calculation-table-section';
    const table = document.createElement('table');
    table.className = className;
    sectionContainer.append(table);
    return { sectionContainer, table };
}

function appendColumnSection(container, groups, entries, locale, dictionary) {
    const { sectionContainer, table } = createTable();
    const values = groupValues(groups[0]);
    const head = table.createTHead();
    const headingRow = head.insertRow();
    const identityHeading = document.createElement('th');
    identityHeading.scope = 'col';
    if (groups[0].tableHeadingSemantic) {
        identityHeading.textContent = entries.find(
            ({ semantic }) =>
                semantic === groups[0].tableHeadingSemantic,
        )?.label ?? groups[0].tableHeadingSemantic;
    }
    headingRow.append(identityHeading);
    for (const value of values) {
        const heading = document.createElement('th');
        heading.scope = 'col';
        heading.textContent = entries.find(
            ({ semantic }) => semantic === value.semantic,
        )?.label ?? value.semantic;
        heading.style.setProperty('--cell-align', 'right');
        headingRow.append(heading);
    }
    const body = table.createTBody();
    for (const group of groups) {
        const tableRow = body.insertRow();
        const labelCell = tableRow.insertCell();
        appendGroupLabel(labelCell, group.semantic, entries);
        useDescriptionOnlyTooltip(labelCell, group, entries);
        for (const value of groupValues(group)) {
            const tableCell = tableRow.insertCell();
            tableCell.style.setProperty('--cell-align', 'right');
            appendValueCell(tableCell, value, entries, locale, dictionary);
        }
    }
    container.append(sectionContainer);
}

function appendResultsSection(container, groups, entries, locale, dictionary) {
    const { sectionContainer, table } = createTable(
        'calculation-table calculation-table--results',
    );
    const body = table.createTBody();
    for (const group of groups) {
        const row = body.insertRow();
        const labelCell = row.insertCell();
        appendGroupLabel(labelCell, group.semantic, entries);
        useDescriptionOnlyTooltip(labelCell, group, entries);
        const valueCell = row.insertCell();
        valueCell.style.setProperty('--cell-align', 'right');
        appendValueCell(valueCell, group.result, entries, locale, dictionary);
    }
    if (body.rows.length) {
        body.rows.item(body.rows.length - 1).className =
            'calculation-table__emphasis';
    }
    container.append(sectionContainer);
}

function appendVerticalDetailSection(
    container,
    group,
    entries,
    locale,
    dictionary,
) {
    const { sectionContainer, table } = createTable(
        'calculation-table calculation-table--vertical',
    );
    const caption = table.createCaption();
    appendGroupLabel(caption, group.semantic, entries);
    useDescriptionOnlyTooltip(caption, group, entries);
    const body = table.createTBody();
    for (const value of groupValues(group)) {
        const row = body.insertRow();
        const labelCell = row.insertCell();
        labelCell.textContent = entries.find(
            ({ semantic }) => semantic === value.semantic,
        )?.label ?? value.semantic;
        const valueCell = row.insertCell();
        valueCell.style.setProperty('--cell-align', 'right');
        appendValueCell(valueCell, value, entries, locale, dictionary);
    }
    container.append(sectionContainer);
}

function appendTableView(container, calculation, entries, locale, dictionary) {
    const groups = collectResultGroups(calculation.breakdown);
    const summaries = groups.filter((group) => group.role === 'summary');
    const summarySet = new Set(summaries);
    const details = groups.filter((group) => !summarySet.has(group));

    for (let index = 0; index < details.length; ) {
        const group = details[index];
        if (group.orientation === 'vertical') {
            appendVerticalDetailSection(
                container,
                group,
                entries,
                locale,
                dictionary,
            );
            index += 1;
            continue;
        }
        const signature = valueSignature(group);
        const section = [group];
        index += 1;
        while (
            index < details.length &&
            details[index].orientation !== 'vertical' &&
            details[index].tableHeadingSemantic ===
                group.tableHeadingSemantic &&
            valueSignature(details[index]) === signature
        ) {
            section.push(details[index]);
            index += 1;
        }
        appendColumnSection(container, section, entries, locale, dictionary);
    }
    if (summaries.length) {
        appendResultsSection(container, summaries, entries, locale, dictionary);
    }
}

function localizeConstant(value, locale) {
    return locale === 'cs' ? value.replace('.', ',') : value;
}

function containsWrappedGroup(node) {
    if (node.type === 'group') {
        return node.wrap === true || containsWrappedGroup(node.expression);
    }
    return node.type === 'operation'
        ? node.operands.some(containsWrappedGroup)
        : false;
}

function sameValue(left, right) {
    if (left.type !== right.type || left.semantic !== right.semantic) return false;
    if (left.type === 'number' || left.type === 'percent') {
        return left.value === right.value;
    }
    if (left.type === 'money') {
        return left.amount === right.amount && left.currency === right.currency;
    }
    return left.amount === right.amount && left.unit === right.unit;
}

function containsMatchingGroupResult(node, result) {
    if (node.type === 'group') {
        return Boolean(
            (node.result && sameValue(node.result, result)) ||
            containsMatchingGroupResult(node.expression, result),
        );
    }
    return node.type === 'operation'
        ? node.operands.some((operand) =>
              containsMatchingGroupResult(operand, result),
          )
        : false;
}

function appendCalculationLine(
    container,
    node,
    entries,
    locale,
    dictionary,
) {
    const line = document.createElement('span');
    line.className = node.role === 'summary'
        ? 'calculation-line'
        : 'calculation-line calculation-line--detail';
    const content = document.createElement('span');
    content.className = 'calculation-line__content';
    appendAnnotatedNode(content, node, entries, locale, dictionary);
    line.append(content);
    container.append(line);
}

function appendTrailingOperator(container, operator) {
    const lines = container.querySelectorAll('.calculation-line__content');
    const target = lines.item(lines.length - 1);
    if (target) {
        target.append(` ${operator}`);
    } else {
        container.append(` ${operator}`);
    }
}

function formatSemanticValue(value, locale, dictionary) {
    const entry = dictionary[locale]?.[value.semantic];
    const label = entry?.name ?? value.semantic;
    if (value.type === 'money') {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: value.currency,
            currencyDisplay: 'narrowSymbol',
        }).format(value.amount);
    }
    const rendered = toHumanString(
        { breakdown: value, result: value },
        { locale, dictionary },
    ).split(' = ')[0];
    return rendered.endsWith(` ${label}`)
        ? rendered.slice(0, -(label.length + 1))
        : rendered;
}

function appendGroupLabel(container, semantic, entries) {
    if (!semantic) return;
    const entry = entries.find((candidate) => candidate.semantic === semantic);
    const label = document.createElement('strong');
    label.className = 'semantic-token group-label';
    label.textContent = entry.label;
    label.dataset.semantic = semantic;
    label.dataset.tooltip = entry.explanation;
    label.tabIndex = 0;
    label.setAttribute('aria-label', `${entry.label}. ${entry.explanation}`);
    container.append(label);
}

function appendBracket(container, character, depth) {
    const bracket = document.createElement('span');
    bracket.className = 'calculation-bracket';
    bracket.style.setProperty(
        '--bracket-color',
        BRACKET_COLORS[depth % BRACKET_COLORS.length],
    );
    bracket.textContent = character;
    container.append(bracket);
}

function appendGroupResultExpression(
    container,
    node,
    entries,
    locale,
    dictionary,
) {
    if (node.type === 'group' && node.result) {
        appendAnnotatedNode(
            container,
            node.result,
            entries,
            locale,
            dictionary,
        );
        return;
    }
    if (node.type === 'group') {
        appendGroupResultExpression(
            container,
            node.expression,
            entries,
            locale,
            dictionary,
        );
        return;
    }
    if (node.type === 'operation') {
        const [left, right] = node.operands;
        appendGroupResultExpression(container, left, entries, locale, dictionary);
        if (node.operator === 'minimum' || node.operator === 'maximum') {
            container.append(node.operator === 'minimum' ? ' min ' : ' max ');
        } else {
            const operator = {
                add: ' + ',
                subtract: ' − ',
                multiply: ' × ',
                divide: ' ÷ ',
            }[node.operator];
            container.append(operator);
        }
        appendGroupResultExpression(container, right, entries, locale, dictionary);
        return;
    }
    appendAnnotatedNode(container, node, entries, locale, dictionary);
}

function appendAnnotatedNode(
    container,
    node,
    entries,
    locale,
    dictionary,
    nested = false,
    bracketDepth = 0,
) {
    if (node.type === 'constant') {
        container.append(localizeConstant(node.value, locale));
        return;
    }
    if (node.type === 'group') {
        const groupContainer = document.createElement('span');
        const multiline = containsWrappedGroup(node.expression);
        const showParentheses = !multiline && node.wrap !== true;
        const summarizesWrappedGroups = Boolean(
            node.result && containsWrappedGroup(node.expression),
        );
        groupContainer.className = multiline
            ? 'calculation-group calculation-group--multiline'
            : 'calculation-group';
        if (!summarizesWrappedGroups) {
            appendGroupLabel(groupContainer, node.semantic, entries);
        }
        if (showParentheses) {
            appendBracket(groupContainer, '(', bracketDepth);
            groupContainer.append(' ');
        }
        appendAnnotatedNode(
            groupContainer,
            node.expression,
            entries,
            locale,
            dictionary,
            false,
            bracketDepth + 1,
        );
        if (summarizesWrappedGroups) {
            const summaryLine = document.createElement('span');
            summaryLine.className =
                'calculation-line calculation-line--summary';
            const summaryContent = document.createElement('span');
            summaryContent.className = 'calculation-line__content';
            appendGroupLabel(summaryContent, node.semantic, entries);
            appendGroupResultExpression(
                summaryContent,
                node.expression,
                entries,
                locale,
                dictionary,
            );
            summaryContent.append(' = ');
            appendAnnotatedNode(
                summaryContent,
                node.result,
                entries,
                locale,
                dictionary,
            );
            summaryLine.append(summaryContent);
            groupContainer.append(summaryLine);
        } else if (
            node.result &&
            !sameValue(node.expression, node.result)
        ) {
            groupContainer.append(' = ');
            appendAnnotatedNode(
                groupContainer,
                node.result,
                entries,
                locale,
                dictionary,
            );
        }
        if (showParentheses) {
            groupContainer.append(' ');
            appendBracket(groupContainer, ')', bracketDepth);
        }
        container.append(groupContainer);
        return;
    }
    if (node.type !== 'operation') {
        const entry = entries.find(({ semantic }) => semantic === node.semantic);
        const token = document.createElement('span');
        token.className = 'semantic-token';
        token.dataset.semantic = node.semantic;
        token.style.setProperty('--semantic-color', entry.color);
        token.dataset.tooltip = showNames
            ? entry.explanation
            : `${entry.label} — ${entry.explanation}`;
        token.tabIndex = 0;
        const formattedValue = formatSemanticValue(node, locale, dictionary);
        token.setAttribute(
            'aria-label',
            showNames
                ? `${formattedValue} ${entry.label}. ${entry.explanation}`
                : `${formattedValue}: ${entry.label}. ${entry.explanation}`,
        );
        token.append(formattedValue);
        if (showNames) token.append(` ${entry.label}`);
        container.append(token);
        return;
    }

    const [left, right] = node.operands;
    if (node.operator === 'minimum' || node.operator === 'maximum') {
        container.append(node.operator === 'minimum' ? 'min(' : 'max(');
        appendAnnotatedNode(
            container,
            left,
            entries,
            locale,
            dictionary,
            false,
            bracketDepth + 1,
        );
        container.append(', ');
        appendAnnotatedNode(
            container,
            right,
            entries,
            locale,
            dictionary,
            false,
            bracketDepth + 1,
        );
        container.append(')');
        return;
    }

    const leftWraps = left.type === 'group' && left.wrap === true;
    const rightWraps = right.type === 'group' && right.wrap === true;
    if (leftWraps || rightWraps) {
        if (leftWraps) {
            appendCalculationLine(
                container,
                left,
                entries,
                locale,
                dictionary,
            );
        } else {
            appendAnnotatedNode(
                container,
                left,
                entries,
                locale,
                dictionary,
                false,
                bracketDepth,
            );
        }
        const operator = {
            add: '+',
            subtract: '−',
            multiply: '×',
            divide: '÷',
        }[node.operator];
        const leftIsSummary =
            left.type === 'group' &&
            left.result &&
            containsWrappedGroup(left.expression);
        if (!leftIsSummary) {
            appendTrailingOperator(container, operator);
        }
        if (rightWraps) {
            appendCalculationLine(
                container,
                right,
                entries,
                locale,
                dictionary,
            );
        } else {
            container.append(' ');
            appendAnnotatedNode(
                container,
                right,
                entries,
                locale,
                dictionary,
                false,
                bracketDepth,
            );
        }
        return;
    }

    if (nested) {
        appendBracket(container, '(', bracketDepth);
        container.append(' ');
    }
    appendAnnotatedNode(
        container,
        left,
        entries,
        locale,
        dictionary,
        true,
        bracketDepth + 1,
    );
    const operator = {
        add: ' + ',
        subtract: ' − ',
        multiply: ' × ',
        divide: ' ÷ ',
    }[node.operator];
    container.append(operator);
    appendAnnotatedNode(
        container,
        right,
        entries,
        locale,
        dictionary,
        true,
        bracketDepth + 1,
    );
    if (nested) {
        container.append(' ');
        appendBracket(container, ')', bracketDepth);
    }
}

function appendAnnotatedCalculation(
    container,
    calculation,
    entries,
    locale,
    dictionary,
) {
    appendAnnotatedNode(
        container,
        calculation.breakdown,
        entries,
        locale,
        dictionary,
    );
    if (containsWrappedGroup(calculation.breakdown)) {
        if (!containsMatchingGroupResult(calculation.breakdown, calculation.result)) {
            appendTrailingOperator(container, '=');
            const lines = container.querySelectorAll(
                '.calculation-line__content',
            );
            const target = lines.item(lines.length - 1) ?? container;
            target.append(' ');
            appendAnnotatedNode(
                target,
                calculation.result,
                entries,
                locale,
                dictionary,
            );
        }
    } else {
        container.append(' = ');
        appendAnnotatedNode(
            container,
            calculation.result,
            entries,
            locale,
            dictionary,
        );
    }
}

function render() {
    try {
        hideTooltip();
        const output = evaluateBuilder(elements.builder.value);
        const locale = selectedLocale;
        const useLocale = elements.useLocale.checked;
        const dictionary = useLocale ? output.dictionary ?? {} : {};
        const hasLocalization = useLocale && Boolean(
            output.title || output.dictionary,
        );
        const examples = output.examples ?? [
            {
                title: useLocale
                    ? output.title ?? { en: 'Calculation', cs: 'Výpočet' }
                    : undefined,
                calculation: output.calculation,
            },
        ];
        const list = document.createElement('div');
        list.className = 'preview-list';

        for (const example of examples) {
            const fragment = elements.template.content.cloneNode(true);
            const calculation = example.calculation;
            const entries = createSemanticEntries(output, calculation, locale);
            const languageSwitcher = fragment.querySelector(
                '.language-switcher',
            );
            languageSwitcher.hidden = !hasLocalization;

            for (const button of fragment.querySelectorAll('[data-locale]')) {
                const isActive = button.dataset.locale === locale;
                button.setAttribute('aria-pressed', String(isActive));
                button.addEventListener('click', () => {
                    selectedLocale = button.dataset.locale;
                    render();
                });
            }
            for (const button of fragment.querySelectorAll('[data-view]')) {
                const isActive = button.dataset.view === selectedView;
                button.setAttribute('aria-pressed', String(isActive));
                button.addEventListener('click', () => {
                    selectedView = button.dataset.view;
                    showNames = selectedView === 'formula-names';
                    render();
                });
            }

            fragment.querySelector('[data-title]').textContent =
                example.title?.[locale] ?? 'Calculation';
            const expression = fragment.querySelector('[data-expression]');
            if (selectedView === 'table') {
                appendTableView(
                    expression,
                    calculation,
                    entries,
                    locale,
                    dictionary,
                );
            } else {
                appendAnnotatedCalculation(
                    expression,
                    calculation,
                    entries,
                    locale,
                    dictionary,
                );
            }
            fragment.querySelector('[data-result-type]').textContent =
                calculation.result.type;
            const includeNames = selectedView === 'formula-names';
            const command = useLocale
                ? `toHumanString(calculation, { locale: '${locale}', dictionary, includeNames: ${includeNames} })`
                : `toHumanString(calculation, { includeNames: ${includeNames} })`;
            const commandElement = fragment.querySelector('[data-command]');
            commandElement.hidden = selectedView === 'table';
            commandElement.innerHTML = highlight(
                command,
                'typescript',
            ).trimEnd();
            fragment.querySelector('[data-json]').textContent = JSON.stringify(
                calculation,
                null,
                2,
            );
            list.append(fragment);
        }

        elements.preview.replaceChildren(list);
        installTooltips(list);
        let customStyle = document.querySelector('#custom-preview-css');
        if (!customStyle) {
            customStyle = document.createElement('style');
            customStyle.id = 'custom-preview-css';
            document.head.append(customStyle);
        }
        customStyle.textContent = elements.css.value;
        elements.status.textContent = 'Live';
        elements.status.dataset.state = 'success';
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const errorBox = document.createElement('div');
        errorBox.className = 'preview-error';
        errorBox.textContent = message;
        elements.preview.replaceChildren(errorBox);
        elements.status.textContent = 'Error';
        elements.status.dataset.state = 'error';
    }
}

function scheduleRender() {
    updateHighlights();
    clearTimeout(updateTimer);
    updateTimer = setTimeout(render, 250);
}

function reset() {
    elements.useLocale.checked = false;
    elements.builder.value = DEFAULT_BUILDER;
    elements.css.value = DEFAULT_CSS;
    selectedLocale = 'en';
    selectedView = 'table';
    showNames = false;
    updateHighlights();
    render();
}

for (const editor of [elements.builder, elements.css]) {
    editor.addEventListener('input', scheduleRender);
    editor.addEventListener('keydown', (event) => {
        if (event.key === 'Tab') {
            event.preventDefault();
            const start = editor.selectionStart;
            editor.setRangeText('  ', start, editor.selectionEnd, 'end');
            scheduleRender();
        }
    });
    editor.addEventListener('scroll', () => {
        const layer =
            editor === elements.builder
                ? elements.builderHighlight
                : elements.cssHighlight;
        layer.scrollTop = editor.scrollTop;
        layer.scrollLeft = editor.scrollLeft;
    });
}

elements.run.addEventListener('click', render);
elements.reset.addEventListener('click', reset);
elements.useLocale.addEventListener('change', () => {
    selectedLocale = 'en';
    elements.builder.value = setBuilderLocaleMode(
        elements.builder.value,
        elements.useLocale.checked,
    );
    updateHighlights();
    render();
});
elements.preview.addEventListener('scroll', hideTooltip, { passive: true });
window.addEventListener('resize', hideTooltip, { passive: true });

reset();
