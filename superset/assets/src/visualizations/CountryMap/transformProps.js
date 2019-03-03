export default function transformProps(chartProps) {
  const { width, height, formData, payload, datasource } = chartProps;
  const {
    metric,
    linearColorScheme,
    numberFormat,
    selectCountry,
  } = formData;

  const name = datasource.verboseMap[metric];

  return {
    width,
    height,
    data: payload.data,
    country: selectCountry,
    linearColorScheme,
    numberFormat,
    metric_name: datasource.verboseMap[metric] || metric.label || 'Metric',
  };
}
