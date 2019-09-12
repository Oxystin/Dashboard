import { t } from '@superset-ui/translation';
import { NVD3TimeSeries, annotations } from './sections';
import { D3_TIME_FORMAT_OPTIONS } from '../controls';

export default {
  requiresTime: true,
  controlPanelSections: [
    NVD3TimeSeries[0],
    {
      label: t('Chart Options'),
      expanded: true,
      controlSetRows: [
        ['number_format'],
        ['waterfall_color_total','waterfall_color_positive','waterfall_color_negative'],
      ],
    },
  ],
};
