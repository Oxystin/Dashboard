import d3 from 'd3';

// -------------- RU LOCALISATION START---------------------
var RU = d3.locale({
  "decimal": ".",
  "thousands": " ",
  "grouping": [3],
  "currency": ["₽", ""],
  "dateTime": "%A, %e %B %Y г.",
  "date": "%d.%m.%Y",
  "time": "%H:%M:%S",
  "periods": ["AM", "PM"],
  "days": ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"],
  "shortDays": ["вс", "пн", "вт", "ср", "чт", "пт", "сб"],
  "months": ["1Q", "1Q", "1Q", "2Q", "2Q", "2Q", "3Q", "3Q", "3Q", "4Q", "4Q", "4Q"],
  "shortMonths": ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]
});

d3.time.format = RU.timeFormat;
d3.format = RU.numberFormat;

export function d3LocaleTimeFormat (format) {
  if (format === 'smart_date' || !format) {
    format = '%m/%y';
  } 
  const f = d3.time.format(format);
  return function (dttm) {
    const d = new Date(dttm);
    return f(d);
  };
};

// -------------- RU LOCALISATION END ---------------------