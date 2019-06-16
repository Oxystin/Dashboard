import { t } from '@superset-ui/translation';
import { ChartMetadata, ChartPlugin } from '@superset-ui/chart';
import transformProps from './transformProps';
import thumbnail from './images/thumbnail.png';

const metadata = new ChartMetadata({
  name: t('Radar Chart'),
  description: '',
  credits: ['https://www.visualcinnamon.com/2015/10/different-look-d3-radar-chart.html'],
  thumbnail,
});

export default class RadarChartPlugin extends ChartPlugin {
  constructor() {
    super({
      metadata,
      transformProps,
      loadChart: () => import('./ReactRadar.js'),
    });
  }
}