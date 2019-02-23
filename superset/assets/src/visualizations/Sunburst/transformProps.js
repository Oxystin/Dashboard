export default function transformProps(chartProps) {
  const { width, height, formData, payload } = chartProps;
  const { colorScheme, metric, secondaryMetric, compareSuffix, numberFormat} = formData;

  return {
    width,
    height,
    data: payload.data,
    colorScheme,
    metrics: [metric, secondaryMetric],
    compareSuffix,
    numberFormat,
  };
}
