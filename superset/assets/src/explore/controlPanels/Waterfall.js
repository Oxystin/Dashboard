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
        ['date_time_format'],
        ['waterfall_label_rotate', 'waterfall_time_shift'],
        ['waterfall_hide_control'],
        ['waterfall_color_total','waterfall_color_positive','waterfall_color_negative'],
      ],
    },
  ],
  controlOverrides: {
    date_time_format: {
      default: '%b %y',
    },
  },
};
