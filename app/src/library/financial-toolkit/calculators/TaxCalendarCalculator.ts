import {
  TaxCalendarInput,
  TaxCalendarOutput,
  TaxObligation,
} from '../types';
import { IdGenerator, CalcUtils, Validator, StatusDeterminer } from '../utils/shared';

export class TaxCalendarCalculator {
  calculate(input: TaxCalendarInput): TaxCalendarOutput {
    const currency = input.currency || 'KES';
    const taxYear = input.taxYear || new Date().getFullYear();
    const now = new Date();

    if (!Validator.isPositive(input.annualRevenue)) {
      throw new Error('Annual revenue must be positive');
    }

    const corpTaxRate = input.corporateTaxRate ?? 0.3;
    const vatRate = input.vatRate ?? 0.16;
    const obligations: TaxObligation[] = [];

    // ── Corporate / Installment Tax ─────────────────────────────────────────────
    if (
      input.businessType === 'limited-company' ||
      input.businessType === 'sme'
    ) {
      const estimatedProfit = input.annualRevenue * 0.2;
      const annualCIT = CalcUtils.round(estimatedProfit * corpTaxRate);
      const quarterlyInstallment = CalcUtils.round(annualCIT / 4);

      // KRA installment due dates: Apr 20, Jun 20, Sep 20, Dec 20
      const installmentDates = [
        { month: 4, label: 'Q1' },
        { month: 6, label: 'Q2' },
        { month: 9, label: 'Q3' },
        { month: 12, label: 'Q4' },
      ];

      installmentDates.forEach(({ month, label }) => {
        const dueDate = `${taxYear}-${String(month).padStart(2, '0')}-20`;
        obligations.push({
          taxType: 'Installment Tax',
          description: `${label} corporate tax installment`,
          dueDate,
          estimatedAmount: quarterlyInstallment,
          frequency: 'quarterly',
          isOverdue: new Date(dueDate) < now,
        });
      });

      // Annual CIT return: due 6 months after year end
      const annualDue = `${taxYear + 1}-06-30`;
      obligations.push({
        taxType: 'Corporate Income Tax',
        description: `Annual CIT return for ${taxYear}`,
        dueDate: annualDue,
        estimatedAmount: annualCIT,
        frequency: 'annually',
        isOverdue: new Date(annualDue) < now,
      });
    }

    // ── VAT (Monthly) ────────────────────────────────────────────────────────────
    if (input.hasVATRegistration) {
      const monthlyVAT = CalcUtils.round((input.annualRevenue / 12) * vatRate);
      for (let month = 1; month <= 12; month++) {
        const dueDate = `${taxYear}-${String(month).padStart(2, '0')}-20`;
        const monthName = new Date(taxYear, month - 1).toLocaleString('en-KE', {
          month: 'long',
        });
        obligations.push({
          taxType: 'VAT',
          description: `VAT return for ${monthName} ${taxYear}`,
          dueDate,
          estimatedAmount: monthlyVAT,
          frequency: 'monthly',
          isOverdue: new Date(dueDate) < now,
        });
      }
    }

    // ── PAYE (Monthly, 9th of following month) ───────────────────────────────────
    if (input.hasEmployees) {
      const estimatedMonthlyPaye = CalcUtils.round(input.annualRevenue * 0.005);
      for (let month = 1; month <= 12; month++) {
        const nextMonth = month === 12 ? 1 : month + 1;
        const dueYear = month === 12 ? taxYear + 1 : taxYear;
        const dueDate = `${dueYear}-${String(nextMonth).padStart(2, '0')}-09`;
        const monthName = new Date(taxYear, month - 1).toLocaleString('en-KE', {
          month: 'long',
        });
        obligations.push({
          taxType: 'PAYE',
          description: `PAYE for ${monthName} ${taxYear}`,
          dueDate,
          estimatedAmount: estimatedMonthlyPaye,
          frequency: 'monthly',
          isOverdue: new Date(dueDate) < now,
        });
      }
    }

    const totalAnnualTax = CalcUtils.round(
      CalcUtils.sum(
        obligations
          .filter((o) => o.frequency === 'annually')
          .map((o) => o.estimatedAmount)
      ) +
        CalcUtils.sum(
          obligations
            .filter((o) => o.frequency === 'quarterly')
            .map((o) => o.estimatedAmount)
        ) +
        CalcUtils.sum(
          obligations
            .filter((o) => o.frequency === 'monthly')
            .slice(0, 12)
            .map((o) => o.estimatedAmount)
        )
    );

    const monthlyTaxProvision = CalcUtils.round(totalAnnualTax / 12);

    const upcomingObligations = obligations
      .filter((o) => !o.isOverdue)
      .sort(
        (a, b) =>
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      )
      .slice(0, 5);

    const nextDueTax = upcomingObligations[0] ?? null;
    const overdueCount = obligations.filter((o) => o.isOverdue).length;

    return {
      id: IdGenerator.generate('tax-calendar'),
      currency,
      period: input.period,
      status: StatusDeterminer.fromRatio(
        overdueCount,
        { good: 0, warning: 1 },
        false
      ),
      timestamp: new Date().toISOString(),
      obligations,
      totalAnnualTax,
      monthlyTaxProvision,
      nextDueTax,
      upcomingObligations,
      taxYear,
    };
  }
}
