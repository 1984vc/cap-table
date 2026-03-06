// app/src/library/financial-toolkit/calculators/OperationsKPICalculator.ts
/**
 * Operations KPI Calculator - PRODUCTION VERSION
 * Industry-specific operational metrics tracking and benchmarking
 * MIT Licensed
 */

import type {
  OperationsKPI,
  OperationsKPIInput,
  KPIValue,
  KPISummary,
  ValidationResult,
  ValidationError
} from '../types/phase2-types';

export class OperationsKPICalculator {
  /**
   * Calculate operations KPIs with performance analysis
   */
  static calculate(input: OperationsKPIInput): OperationsKPI {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Enhance KPIs with performance assessment
    const kpisWithPerformance: KPISummary[] = input.kpis.map(kpi => {
      // Determine performance vs target
      let performance: 'exceeds' | 'meets' | 'below' | 'critical' = 'meets';
      let percentOfTarget: number | undefined;
      let status: 'green' | 'yellow' | 'red' = 'yellow';

      if (kpi.target !== undefined) {
        const isHigherBetter = this.isHigherBetter(kpi.name, kpi.category);
        percentOfTarget = (kpi.value / kpi.target) * 100;

        if (isHigherBetter) {
          // Higher values are better (e.g., revenue, efficiency %)
          if (kpi.value >= kpi.target * 1.1) {
            performance = 'exceeds';
            status = 'green';
          } else if (kpi.value >= kpi.target * 0.95) {
            performance = 'meets';
            status = 'green';
          } else if (kpi.value >= kpi.target * 0.8) {
            performance = 'below';
            status = 'yellow';
          } else {
            performance = 'critical';
            status = 'red';
          }
        } else {
          // Lower values are better (e.g., defect rate, costs)
          if (kpi.value <= kpi.target * 0.9) {
            performance = 'exceeds';
            status = 'green';
          } else if (kpi.value <= kpi.target * 1.05) {
            performance = 'meets';
            status = 'green';
          } else if (kpi.value <= kpi.target * 1.2) {
            performance = 'below';
            status = 'yellow';
          } else {
            performance = 'critical';
            status = 'red';
          }
        }
      }

      // Performance vs benchmark
      let percentOfBenchmark: number | undefined;
      if (kpi.benchmark !== undefined) {
        percentOfBenchmark = (kpi.value / kpi.benchmark) * 100;
      }

      return {
        ...kpi,
        performance,
        percentOfTarget,
        percentOfBenchmark,
        status
      };
    });

    // Organize by category
    const kpisByCategory = kpisWithPerformance.reduce((acc, kpi) => {
      if (!acc[kpi.category]) {
        acc[kpi.category] = [];
      }
      acc[kpi.category].push(kpi);
      return acc;
    }, {} as Record<string, KPISummary[]>);

    // Calculate overall performance
    const meetsTarget = kpisWithPerformance.filter(
      kpi => kpi.performance === 'exceeds' || kpi.performance === 'meets'
    ).length;

    const percentMeetingTarget = kpisWithPerformance.length > 0 
      ? (meetsTarget / kpisWithPerformance.length) * 100 
      : 0;

    let overallStatus: 'excellent' | 'good' | 'needs-improvement' | 'poor';
    if (percentMeetingTarget >= 90) {
      overallStatus = 'excellent';
    } else if (percentMeetingTarget >= 75) {
      overallStatus = 'good';
    } else if (percentMeetingTarget >= 50) {
      overallStatus = 'needs-improvement';
    } else {
      overallStatus = 'poor';
    }

    // Top performers (exceeds target)
    const topPerformers = kpisWithPerformance
      .filter(kpi => kpi.performance === 'exceeds')
      .sort((a, b) => (b.percentOfTarget || 0) - (a.percentOfTarget || 0))
      .slice(0, 5);

    // Needs attention (below or critical)
    const needsAttention = kpisWithPerformance
      .filter(kpi => kpi.performance === 'below' || kpi.performance === 'critical')
      .sort((a, b) => (a.percentOfTarget || 0) - (b.percentOfTarget || 0))
      .slice(0, 5);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      kpisWithPerformance,
      input.industry,
      overallStatus
    );

    const now = Date.now();

    return {
      id: this.generateId(),
      companyId: input.companyId,
      period: input.period,
      industry: input.industry,
      currency: 'KES',
      
      kpisByCategory,
      
      performance: {
        totalKPIs: kpisWithPerformance.length,
        meetsTarget,
        percentMeetingTarget,
        overallStatus
      },
      
      topPerformers,
      needsAttention,
      recommendations,
      
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Determine if higher values are better for this KPI
   */
  private static isHigherBetter(name: string, category: string): boolean {
    const lowerName = name.toLowerCase();
    
    // Lower is better keywords
    const lowerIsBetter = [
      'defect', 'scrap', 'waste', 'cost', 'downtime', 'late', 'overdue',
      'churn', 'attrition', 'days', 'time', 'error', 'complaint', 'return'
    ];

    if (lowerIsBetter.some(keyword => lowerName.includes(keyword))) {
      return false;
    }

    // Higher is better keywords
    const higherIsBetter = [
      'revenue', 'profit', 'margin', 'efficiency', 'quality', 'satisfaction',
      'on-time', 'utilization', 'productivity', 'growth', 'retention', 'nps'
    ];

    if (higherIsBetter.some(keyword => lowerName.includes(keyword))) {
      return true;
    }

    // Default by category
    if (category === 'quality' || category === 'production') {
      return true; // Assume higher is better for most quality/production metrics
    }

    return true; // Default: higher is better
  }

  /**
   * Generate industry-specific recommendations
   */
  private static generateRecommendations(
    kpis: KPISummary[],
    industry: string,
    overallStatus: string
  ): string[] {
    const recommendations: string[] = [];

    // Overall status recommendation
    if (overallStatus === 'poor') {
      recommendations.push('🚨 CRITICAL: Majority of KPIs below target - comprehensive operational review needed');
    } else if (overallStatus === 'needs-improvement') {
      recommendations.push('⚠️ WARNING: Many KPIs need attention - prioritize bottom performers');
    } else if (overallStatus === 'excellent') {
      recommendations.push('✅ Excellent operational performance - maintain current processes');
    }

    // Critical KPIs
    const critical = kpis.filter(kpi => kpi.performance === 'critical');
    if (critical.length > 0) {
      recommendations.push(`\nCritical KPIs requiring immediate action (${critical.length}):`);
      critical.forEach(kpi => {
        recommendations.push(`   • ${kpi.name}: ${kpi.value}${kpi.unit} (target: ${kpi.target}${kpi.unit})`);
      });
    }

    // Industry-specific recommendations
    if (industry === 'automotive') {
      const quality = kpis.find(k => k.name.toLowerCase().includes('defect') || k.name.toLowerCase().includes('ppm'));
      if (quality && quality.performance !== 'exceeds' && quality.performance !== 'meets') {
        recommendations.push('\nAutomotive Quality: Implement 6-sigma methodology to reduce defects');
      }

      const otd = kpis.find(k => k.name.toLowerCase().includes('on-time delivery'));
      if (otd && otd.performance !== 'exceeds' && otd.performance !== 'meets') {
        recommendations.push('Delivery Performance: Review supply chain and production scheduling');
      }
    } else if (industry === 'saas') {
      const churn = kpis.find(k => k.name.toLowerCase().includes('churn'));
      if (churn && churn.performance !== 'exceeds' && churn.performance !== 'meets') {
        recommendations.push('\nSaaS Churn: Implement customer success program and improve onboarding');
      }

      const nps = kpis.find(k => k.name.toLowerCase().includes('nps'));
      if (nps && nps.value < 30) {
        recommendations.push('NPS Score: Below industry standard - gather customer feedback and address pain points');
      }
    } else if (industry === 'manufacturing') {
      const oee = kpis.find(k => k.name.toLowerCase().includes('oee') || k.name.toLowerCase().includes('efficiency'));
      if (oee && oee.value < 75) {
        recommendations.push('\nManufacturing Efficiency: OEE below 75% - analyze downtime and quality losses');
      }
    }

    // Benchmark comparisons
    const belowBenchmark = kpis.filter(kpi => 
      kpi.benchmark !== undefined && kpi.percentOfBenchmark !== undefined && kpi.percentOfBenchmark < 90
    );

    if (belowBenchmark.length > 0) {
      recommendations.push(`\n${belowBenchmark.length} KPIs below industry benchmark - review best practices`);
    }

    return recommendations;
  }

  /**
   * Validate operations KPI input
   */
  static validate(input: OperationsKPIInput): ValidationResult {
    const errors: ValidationError[] = [];

    if (!input.companyId) {
      errors.push({ field: 'companyId', message: 'Company ID is required', code: 'REQUIRED' });
    }

    if (!input.period) {
      errors.push({ field: 'period', message: 'Period is required', code: 'REQUIRED' });
    }

    if (!input.industry) {
      errors.push({ field: 'industry', message: 'Industry is required', code: 'REQUIRED' });
    }

    if (!Array.isArray(input.kpis) || input.kpis.length === 0) {
      errors.push({ 
        field: 'kpis', 
        message: 'At least one KPI is required', 
        code: 'REQUIRED' 
      });
      return { valid: false, errors };
    }

    // Validate each KPI
    input.kpis.forEach((kpi, index) => {
      if (!kpi.name?.trim()) {
        errors.push({ 
          field: `kpis[${index}].name`, 
          message: `KPI ${index + 1}: Name is required`, 
          code: 'REQUIRED' 
        });
      }

      if (typeof kpi.value !== 'number') {
        errors.push({ 
          field: `kpis[${index}].value`, 
          message: `KPI ${index + 1}: Value must be a number`, 
          code: 'INVALID_TYPE' 
        });
      }

      if (!kpi.unit?.trim()) {
        errors.push({ 
          field: `kpis[${index}].unit`, 
          message: `KPI ${index + 1}: Unit is required`, 
          code: 'REQUIRED' 
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get insights and summary
   */
  static getInsights(kpi: OperationsKPI): string[] {
    const insights: string[] = [];

    // Overall performance
    insights.push(`📊 Operations Performance - ${kpi.industry.toUpperCase()}`);
    insights.push(`Period: ${kpi.period}`);
    insights.push(`Status: ${kpi.performance.overallStatus.toUpperCase()}`);
    insights.push(`${kpi.performance.meetsTarget}/${kpi.performance.totalKPIs} KPIs meeting or exceeding target (${kpi.performance.percentMeetingTarget.toFixed(0)}%)`);

    // Top performers
    if (kpi.topPerformers.length > 0) {
      insights.push(`\n✅ Top Performers:`);
      kpi.topPerformers.forEach(k => {
        insights.push(`   ${k.name}: ${k.value}${k.unit} (${k.percentOfTarget?.toFixed(0)}% of target)`);
      });
    }

    // Needs attention
    if (kpi.needsAttention.length > 0) {
      insights.push(`\n🎯 Needs Attention:`);
      kpi.needsAttention.forEach(k => {
        const emoji = k.performance === 'critical' ? '🚨' : '⚠️';
        insights.push(`   ${emoji} ${k.name}: ${k.value}${k.unit} (${k.percentOfTarget?.toFixed(0)}% of target)`);
      });
    }

    // By category
    insights.push(`\n📈 By Category:`);
    Object.entries(kpi.kpisByCategory).forEach(([category, kpis]) => {
      const green = kpis.filter(k => k.status === 'green').length;
      const total = kpis.length;
      insights.push(`   ${category}: ${green}/${total} green`);
    });

    return insights;
  }

  /**
   * Get industry-specific KPI template
   */
  static getIndustryTemplate(industry: string): KPIValue[] {
    const templates: Record<string, KPIValue[]> = {
      automotive: [
        { name: 'OEE (Overall Equipment Effectiveness)', category: 'production', value: 0, unit: '%', target: 85, benchmark: 80 },
        { name: 'PPM (Parts Per Million Defects)', category: 'quality', value: 0, unit: 'ppm', target: 100, benchmark: 150 },
        { name: 'First Pass Yield', category: 'quality', value: 0, unit: '%', target: 98, benchmark: 95 },
        { name: 'On-Time Delivery', category: 'delivery', value: 0, unit: '%', target: 98, benchmark: 95 },
        { name: 'Scrap Rate', category: 'quality', value: 0, unit: '%', target: 1.5, benchmark: 2.0 },
        { name: 'Production per FTE', category: 'efficiency', value: 0, unit: 'units/day', target: 20, benchmark: 18 }
      ],
      saas: [
        { name: 'MRR Growth', category: 'growth', value: 0, unit: '%', target: 10, benchmark: 8 },
        { name: 'Churn Rate', category: 'engagement', value: 0, unit: '%', target: 5, benchmark: 7 },
        { name: 'NPS Score', category: 'engagement', value: 0, unit: 'score', target: 50, benchmark: 40 },
        { name: 'CAC Payback', category: 'efficiency', value: 0, unit: 'months', target: 12, benchmark: 18 },
        { name: 'LTV:CAC Ratio', category: 'efficiency', value: 0, unit: 'ratio', target: 3, benchmark: 3 },
        { name: 'Rule of 40', category: 'growth', value: 0, unit: '%', target: 40, benchmark: 40 }
      ],
      manufacturing: [
        { name: 'OEE', category: 'production', value: 0, unit: '%', target: 80, benchmark: 75 },
        { name: 'Cycle Time', category: 'efficiency', value: 0, unit: 'days', target: 5, benchmark: 7 },
        { name: 'Quality Yield', category: 'quality', value: 0, unit: '%', target: 95, benchmark: 90 },
        { name: 'Downtime', category: 'efficiency', value: 0, unit: '%', target: 5, benchmark: 10 },
        { name: 'Capacity Utilization', category: 'production', value: 0, unit: '%', target: 85, benchmark: 80 }
      ],
      retail: [
        { name: 'Sales per Sqft', category: 'efficiency', value: 0, unit: '$/sqft', target: 500, benchmark: 400 },
        { name: 'Inventory Turnover', category: 'efficiency', value: 0, unit: 'turns/year', target: 8, benchmark: 6 },
        { name: 'Customer Satisfaction', category: 'engagement', value: 0, unit: '%', target: 90, benchmark: 85 },
        { name: 'Same-Store Sales Growth', category: 'growth', value: 0, unit: '%', target: 5, benchmark: 3 }
      ]
    };

    return templates[industry] || [];
  }

  /**
   * Helper: Generate unique ID
   */
  private static generateId(): string {
    return `opskpi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
