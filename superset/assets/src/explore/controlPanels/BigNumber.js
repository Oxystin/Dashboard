import { t } from '@superset-ui/translation';

export default {
  controlPanelSections: [
    {
      label: t('Query'),
      expanded: true,
      controlSetRows: [
        ['metric'],
        ['adhoc_filters'],
      ],
    },
    {
      label: t('Chart Options'),
      expanded: true,
      controlSetRows: [
        ['compare_lag', 'compare_suffix'],
        ['y_axis_format', 'date_time_format'],
        ['show_trend_line', 'select_chart'],
        ['start_y_axis_at_zero', 'show_perc'],
        ['color_picker', 'fill_color_picker', 'fill_background'],
      ],
    },
  ],
  controlOverrides: {
    y_axis_format: {
      label: t('Number format'),
    },
    color_picker: {
      label: t('Positive Value'),
      description: t('Positive Value Color'),
      default: {r: 84, g: 160, b: 92, a: 1},
    },
    fill_color_picker: {
      label: t('Negative Value'),
      description: t('Negative Value Color'),
      default: {r: 214, g: 63, b: 43, a: 1},
    },
    show_perc: {
      label: t('Show delta'),
      description: t('Show delta value'),
      default: true,
    },
    start_y_axis_at_zero: {
      default: false,
    },
  },
};
