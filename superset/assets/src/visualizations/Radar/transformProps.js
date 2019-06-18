export default function transformProps(chartProps) {
  const { width, height, formData, payload } = chartProps;
  const { colorScheme, numberFormat, radarScale, radarFillArea, radarLineSmooth,radarShowLegend, radarLevels, radarLabelDist, radarLabelWrap} = formData;

  return {
    width,
    height,
    data: payload.data,
    colorScheme,
    numberFormat,
    radarScale,
    radarFillArea, 
    radarLineSmooth,
    radarShowLegend,
    radarLevels,
    radarLabelDist,
    radarLabelWrap,
    chartId:formData.sliceId,
  };
}