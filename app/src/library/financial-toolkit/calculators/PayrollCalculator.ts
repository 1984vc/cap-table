import {
  PayrollInput,
  PayrollOutput,
  EmployeePayrollOutput,
} from '../types';
import { IdGenerator, CalcUtils, Validator, StatusDeterminer } from '../utils/shared';

export class PayrollCalculator {
  // Kenya PAYE 2024 tax bands (monthly gross → monthly tax)
  private calculatePAYE(grossSalary: number): number {
    const annual = grossSalary * 12;
    let annualTax: number;

    if (annual <= 288000) {
      annualTax = annual * 0.1;
    } else if (annual <= 388000) {
      annualTax = 28800 + (annual - 288000) * 0.25;
    } else if (annual <= 6000000) {
      annualTax = 53800 + (annual - 388000) * 0.3;
    } else if (annual <= 9600000) {
      annualTax = 1737400 + (annual - 6000000) * 0.325;
    } else {
      annualTax = 2907400 + (annual - 9600000) * 0.35;
    }

    // Personal relief: KES 2,400/month
    const monthlyTax = CalcUtils.round(annualTax / 12) - 2400;
    return Math.max(0, monthlyTax);
  }

  // Kenya NHIF 2024 contribution table
  private calculateNHIF(grossSalary: number): number {
    if (grossSalary <= 5999) return 150;
    if (grossSalary <= 7999) return 300;
    if (grossSalary <= 11999) return 400;
    if (grossSalary <= 14999) return 500;
    if (grossSalary <= 19999) return 600;
    if (grossSalary <= 24999) return 750;
    if (grossSalary <= 29999) return 850;
    if (grossSalary <= 34999) return 900;
    if (grossSalary <= 39999) return 950;
    if (grossSalary <= 44999) return 1000;
    if (grossSalary <= 49999) return 1100;
    if (grossSalary <= 59999) return 1200;
    if (grossSalary <= 69999) return 1300;
    if (grossSalary <= 79999) return 1400;
    if (grossSalary <= 89999) return 1500;
    if (grossSalary <= 99999) return 1600;
    return 1700;
  }

  calculate(input: PayrollInput): PayrollOutput {
    const currency = input.currency || 'KES';

    if (!input.employees || input.employees.length === 0) {
      throw new Error('At least one employee is required');
    }

    const employees: EmployeePayrollOutput[] = input.employees.map((emp) => {
      if (!Validator.isPositive(emp.grossSalary)) {
        throw new Error(
          `Employee "${emp.name}" must have a positive gross salary`
        );
      }

      const paye = this.calculatePAYE(emp.grossSalary);
      const nhif =
        emp.nhifContribution !== undefined
          ? emp.nhifContribution
          : this.calculateNHIF(emp.grossSalary);

      // NSSF: 6% of gross, employee max KES 1,080
      const nssf =
        emp.nssfContribution !== undefined
          ? emp.nssfContribution
          : CalcUtils.round(Math.min(emp.grossSalary * 0.06, 1080));
      const employerNssf = CalcUtils.round(
        Math.min(emp.grossSalary * 0.06, 1080)
      );

      const allowances = emp.allowances || 0;
      const otherDeductions = emp.otherDeductions || 0;
      const totalDeductions = CalcUtils.round(paye + nhif + nssf + otherDeductions);
      const netPay = CalcUtils.round(emp.grossSalary + allowances - totalDeductions);
      const totalEmployerCost = CalcUtils.round(
        emp.grossSalary + allowances + employerNssf
      );

      return {
        name: emp.name,
        grossSalary: emp.grossSalary,
        paye,
        nhif,
        nssf,
        otherDeductions,
        allowances,
        totalDeductions,
        netPay,
        employerNssf,
        totalEmployerCost,
      };
    });

    const totalGrossSalary = CalcUtils.round(
      CalcUtils.sum(employees.map((e) => e.grossSalary))
    );
    const totalPaye = CalcUtils.round(CalcUtils.sum(employees.map((e) => e.paye)));
    const totalNhif = CalcUtils.round(CalcUtils.sum(employees.map((e) => e.nhif)));
    const totalNssf = CalcUtils.round(CalcUtils.sum(employees.map((e) => e.nssf)));
    const totalNetPay = CalcUtils.round(
      CalcUtils.sum(employees.map((e) => e.netPay))
    );
    const totalEmployerCost = CalcUtils.round(
      CalcUtils.sum(employees.map((e) => e.totalEmployerCost))
    );
    const totalDeductions = CalcUtils.round(
      CalcUtils.sum(employees.map((e) => e.totalDeductions))
    );

    const payrollMonth =
      input.month ||
      new Date().toLocaleString('en-KE', { month: 'long', year: 'numeric' });

    return {
      id: IdGenerator.generate('payroll'),
      currency,
      period: input.period,
      status: StatusDeterminer.fromRatio(totalNetPay, {
        good: 1,
        warning: 0.01,
      }),
      timestamp: new Date().toISOString(),
      employees,
      totalGrossSalary,
      totalPaye,
      totalNhif,
      totalNssf,
      totalNetPay,
      totalEmployerCost,
      totalDeductions,
      payrollMonth,
    };
  }
}
