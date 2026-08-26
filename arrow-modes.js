/**
 * Single source of truth for arrow polarity per metric, per domain.
 * Loaded by inflation.html, labor.html, economy.html, consumer.html (each sets
 * window.ARROW_MODE from the matching key here) and by index.html (which reads
 * across all four directly, since its headline cards span multiple domains).
 * Metrics not listed default to 'up-good'.
 */
window.ARROW_MODES = {
  inflation: {
    cpi_yoy:'down-good', cpi_mom:'down-good', core_cpi_yoy:'down-good', core_cpi_mom:'down-good',
    ppi_mom:'down-good', ppi_yoy:'down-good', core_ppi_mom:'down-good', core_ppi_yoy:'down-good',
    core_pce_mom:'down-good', core_pce_yoy:'down-good', prelim_uom:'down-good', uom:'down-good',
    eci_qoq:'down-good', avg_hourly_mom:'down-good', import_mom:'down-good', export_mom:'down-good',
    ism_mfg:'down-good', ism_svc:'down-good',
    advance_gdp_pi:'down-good', prelim_gdp_pi:'down-good', final_gdp_pi:'down-good'
  },
  labor: {
    u3_rate:'down-good', u6_rate:'down-good', u3_u6_gap:'down-good',
    unemployed:'down-good', total_sep:'down-good', quits:'down-good', layoffs:'down-good', other_sep:'down-good',
    unemployment_claims:'down-good', claims_4wk_ma:'down-good'
  },
  consumer: {
    debt_to_gdp:'down-good', consumer_credit:'down-good', debt_service_dpi:'down-good', consumer_debt_service:'down-good',
    mortgage_debt_service:'down-good', cc_delinquency:'down-good', mortgage_delinquency:'down-good', all_loans_delinquency:'down-good'
  },
  economy: {
    inflation_drag:'down-good',
    diagnostic:'none', diagnostic_chg:'none', organic_score:'none', noncore_diverge:'none',
    inventories_flag:'none', net_export_flag:'none', govt_spend_flag:'none',
    inventories_contribution:'none', net_exports_contribution:'none', govt_spend_contribution:'none'
  }
};
