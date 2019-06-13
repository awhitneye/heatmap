function calendarHeatmap() {
	// defaults
	var width = 700;
	var height = 220;
	var legendWidth = 200;
	var selector = 'body';
	var SQUARE_LENGTH = 24;
	var SQUARE_PADDING = 2;
	var MONTH_LABEL_PADDING = 10;
	var now = moment().endOf('day').toDate();
	var yearAgo = moment().startOf('day').subtract(1, 'year').toDate();
	var startDate = null;
	var endDate = null;
	var counterMap = {};
	var data = [];
	var max = null;
	var colorRange = [];
	var tooltipEnabled = true;
	var tooltipUnit = '';
	var legendEnabled = true;
	var onClick = null;
	var weekStart = 0; //0 for Sunday, 1 for Monday
	var locale = {
		months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
		days: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
		No: 'Null',
		on: 'on',
		Less: 'Less',
		More: 'More'
	};
	var v = Number(d3.version.split('.')[0]);

	// setters and getters
	chart.data = function (value) {
		if (!arguments.length) {
			return data;
		}
		data = value;

		counterMap = {};

		data.forEach(function (element, index) {
			var key = moment(element.date).format('YYYY-MM-DD');
			var counter = counterMap[key] || 0;
			counterMap[key] = counter + element.count;
		});

		return chart;
	};

	chart.max = function (value) {
		if (!arguments.length) {
			return max;
		}
		max = value;
		return chart;
	};

	chart.selector = function (value) {
		if (!arguments.length) {
			return selector;
		}
		selector = value;
		return chart;
	};

	chart.startDate = function (value) {
		if (!arguments.length) {
			return startDate;
		}
		yearAgo = value;
		return chart;
	};

	chart.endDate = function (value) {
		if (!arguments.length) {
			return endDate;
		}
		now = value;
		return chart;
	};

	chart.colorRange = function (value) {
		if (!arguments.length) {
			return colorRange;
		}
		colorRange = value;
		return chart;
	};

	chart.tooltipEnabled = function (value) {
		if (!arguments.length) {
			return tooltipEnabled;
		}
		tooltipEnabled = value;
		return chart;
	};

	chart.tooltipUnit = function (value) {
		if (!arguments.length) {
			return tooltipUnit;
		}
		tooltipUnit = value;
		return chart;
	};

	chart.legendEnabled = function (value) {
		if (!arguments.length) {
			return legendEnabled;
		}
		legendEnabled = value;
		return chart;
	};

	chart.onClick = function (value) {
		if (!arguments.length) {
			return onClick();
		}
		onClick = value;
		return chart;
	};

	chart.locale = function (value) {
		if (!arguments.length) {
			return locale;
		}
		locale = value;
		return chart;
	};

	function chart() {
		d3.select(chart.selector()).selectAll('svg.calendar-heatmap').remove(); // remove the existing chart, if it exists
		var q = 0;
		var q1 = 0;
		var q2 = 0;
		var q3 = 0;
		var min = 0;
		var dateRange = ((d3.time && d3.time.days) || d3.timeDays)(yearAgo, now); // generates an array of date objects within the specified range
		var monthRange = ((d3.time && d3.time.months) || d3.timeMonths)(moment(yearAgo).startOf('month').toDate(), now); // it ignores the first month if the 1st date is after the start of the month

		// won't show the first month label if there's no enough space
		if (moment(dateRange[14]).month() !== moment(dateRange[0]).month()) {
			monthRange.shift();
		}

		var firstDate = moment(dateRange[0]);
		if (chart.data().length == 0) {
			max = 0;

		} else if (max === null) {
			max = d3.max(chart.data(), function (d) {
				return d.count;
			}); // max data value
			min = d3.min(chart.data(), function (d) {
				return d.count;
			}); // max data value
			q = parseFloat((max - min) / 4);
			q1 = parseFloat(min + q);
			q2 = parseFloat(min + 2 * q);
			q3 = parseFloat(min + 3 * q);
		}

		// color range
		var color = ((d3.scale && d3.scale.linear) || d3.scaleLinear)()
			.range(chart.colorRange())
			.domain([min, q1, q2, q3, max]);

		var tooltip;
		var dayRects;

		drawChart();

		function drawChart() {
			var svg = d3.select(chart.selector())
				.style('position', 'relative')
				.append('svg')
				.attr('width', width)
				.attr('class', 'calendar-heatmap')
				.attr('height', height)
				.style('padding', '36px');

			dayRects = svg.selectAll('.day-cell')
				.data(dateRange);  //  array of days for the last yr

			var enterSelection = dayRects.enter().append('rect')
				.attr('class', 'day-cell')
				.attr('width', SQUARE_LENGTH)
				.attr('height', SQUARE_LENGTH)
				.attr('fill', function (d) {
					return color(countForDate(d));
				})
				.attr('x', function (d, i) {
					var cellDate = moment(d);
					var result = cellDate.week() - firstDate.week() + (firstDate.weeksInYear() * (cellDate.weekYear() - firstDate.weekYear()));
					return result * (SQUARE_LENGTH + SQUARE_PADDING);
				})
				.attr('y', function (d, i) {
					return MONTH_LABEL_PADDING + formatWeekday(d.getDay()) * (SQUARE_LENGTH + SQUARE_PADDING);
				});

			if (typeof onClick === 'function') {
				(v === 3 ? enterSelection : enterSelection.merge(dayRects)).on('click', function (d) {
					var count = countForDate(d);
					onClick({date: d, count: count});
				});
			}

			if (chart.tooltipEnabled()) {
				(v === 3 ? enterSelection : enterSelection.merge(dayRects)).on('mouseover', function (d, i) {
					tooltip = d3.select(chart.selector())
						.append('div')
						.attr('class', 'day-cell-tooltip')
						.html(tooltipHTMLForDate(d))
						.style('left', function () {
							return Math.floor(i / 7) * SQUARE_LENGTH + 'px';
						})
						.style('top', function () {
							return formatWeekday(d.getDay()) * (SQUARE_LENGTH + SQUARE_PADDING) + MONTH_LABEL_PADDING * 2 + 'px';
						});
				}).on('mouseout', function (d, i) {
					tooltip.remove();
				});
			}

			if (chart.legendEnabled()) {
				var colorRange = [color(min), color(q1), color(q2), color(q3), color(max)];
				var legendGroup = svg.append('g');
				legendGroup.selectAll('.calendar-heatmap-legend')
					.data(colorRange)
					.enter()
					.append('rect')
					.attr('class', 'calendar-heatmap-legend')
					.attr('width', SQUARE_LENGTH)
					.attr('height', SQUARE_LENGTH)
					.attr('x', function (d, i) {
						return (width - legendWidth) + (i + 1) * SQUARE_LENGTH;
					})
					.attr('y', height + SQUARE_PADDING)
					.attr('fill', function (d) {
						return d;
					});

				var lessTextLength = 10;
				if (locale.Less) {
					lessTextLength = locale.Less.toString().length * 4;
				}

				legendGroup.append('text')
					.attr('class', 'calendar-heatmap-legend-text calendar-heatmap-legend-text-less')
					.attr('x', width - legendWidth - lessTextLength)
					.attr('y', height + Math.floor(SQUARE_LENGTH * 3 / 4))
					.text(locale.Less);

				legendGroup.append('text')
					.attr('class', 'calendar-heatmap-legend-text calendar-heatmap-legend-text-more')
					.attr('x', (width - legendWidth + SQUARE_PADDING) + (colorRange.length + 1) * SQUARE_LENGTH)
					.attr('y', height + Math.floor(SQUARE_LENGTH * 3 / 4))
					.text(locale.More);
			}

			dayRects.exit().remove();
			var monthLabels = svg.selectAll('.month')
				.data(monthRange)
				.enter().append('text')
				.attr('class', 'month-name')
				.text(function (d) {
					return locale.months[d.getMonth()];
				})
				.attr('x', function (d, i) {
					var matchIndex = 0;
					_.find(dateRange, function (element, index) {
						matchIndex = index;
						return moment(d).isSame(element, 'month') && moment(d).isSame(element, 'year');
					});

					return Math.floor(matchIndex / 7) * (SQUARE_LENGTH + SQUARE_PADDING);
				})
				.attr('y', 0);  // fix these to the top

			locale.days.forEach(function (day, index) {
				index = formatWeekday(index);
				svg.append('text')
					.attr('class', 'day-initial')
					.attr('transform', 'translate(-16,' + (SQUARE_LENGTH + SQUARE_PADDING) * (index + 1) + ')')
					.style('text-anchor', 'middle')
					.attr('dy', '2')
					.text(day);
			});
		}

		function pluralizedTooltipUnit(count) {
			if ('string' === typeof tooltipUnit) {
				return (tooltipUnit + (count === 1 ? '' : ''));
			}
			for (var i in tooltipUnit) {
				var _rule = tooltipUnit[i];
				var _min = _rule.min;
				var _max = _rule.max || _rule.min;
				_max = _max === 'Infinity' ? Infinity : _max;
				if (count >= _min && count <= _max) {
					return _rule.unit;
				}
			}
		}

		function tooltipHTMLForDate(d) {
			var dateStr = moment(d).format('ddd, MMM Do YYYY');
			var count = countForDate(d);
			return '<span><strong>' + (count ? count : locale.No) + ' ' + pluralizedTooltipUnit(count) + '</strong> ' + locale.on + ' ' + dateStr + '</span>';
		}

		function countForDate(d) {
			var key = moment(d).format('YYYY-MM-DD');
			return counterMap[key] // || 0;
		}

		function formatWeekday(weekDay) {
			if (weekStart === 1) {
				if (weekDay === 0) {
					return 6;
				} else {
					return weekDay - 1;
				}
			}
			return weekDay;
		}
	}

	return chart;
}

looker.plugins.visualizations.add({
	id: "calendar-heatmap",
	label: "Calendar Heatmap",
	options: {
		colorMin: {
			label: 'Color Min',
			default: '#D8E6E7',
			type: 'string',
			display: 'color',
			display_size: "half",
			order: 1
		},
		colorQ1: {
			label: 'Color Q1',
			default: '#AA3311',
			type: 'string',
			display: 'color',
			display_size: "half",
			order: 2
		},
		colorQ2: {
			label: 'Color Q2',
			default: '#AA3311',
			type: 'string',
			display: 'color',
			display_size: "half",
			order: 3
		},
		colorQ3: {
			label: 'Color Q3',
			default: '#AA3311',
			type: 'string',
			display: 'color',
			display_size: "half",
			order: 4
		},
		colorMax: {
			label: "Color Max",
			type: "string",
			display: "color",
			default: "#218380",
			display_size: "half",
			order: 5
		},
		textMinMaxToggle: {
			type: "string",
			label: "Select Text or Min/Max Value for Legend",
			display: "radio",
			default: "Text",
			values: [
				{"Min/Max Values": "Min/Max Values"},
				{"Text": "Text"}
			],
			order: 6
		},
		lessText: {
			type: "string",
			label: "Legend min label",
			default: "Less",
			hidden: function (config, queryResponse) {
				return config.textMinMaxToggle === "Min/Max Values";
			},
			order: 7
		},
		moreText: {
			type: "string",
			label: "Legend max label",
			default: "More",
			hidden: function (config, queryResponse) {
				return config.textMinMaxToggle === "Min/Max Values";
			},
			order: 8
		},
	},
	create: function (element, config) {
		var css = element.innerHTML = `
      <style>
        .container {
          display: flex;
          justify-content: center;
        }
        text.month-name,
        text.calendar-heatmap-legend-text,
        text.day-initial {
          font-size: 14px;
          fill: inherit;
          font-family: Helvetica, arial, 'Open Sans', sans-serif;
        }
		text.month-name {
          font-size: 12px;
		}
        rect.day-cell:hover {
          stroke: #555555;
          stroke-width: 1px;
        }
        .day-cell-tooltip {
          position: absolute;
          z-index: 9999;
          padding: 5px 9px;
          color: #bbbbbb;
          font-size: 16px;
          background: rgba(0, 0, 0, 0.85);
          border-radius: 3px;
          text-align: center;
        }
        .day-cell-tooltip > span {
          font-family: Helvetica, arial, 'Open Sans', sans-serif
        }
        .calendar-heatmap {
          box-sizing: initial;
          overflow: inherit;
        }
      </style>
    `;

		var container = element.appendChild(document.createElement("div"));
		container.className = "container";

		// lookup the container we want the Grid to use
		var eGridDiv = document.querySelector('#myGrid');
	},
	updateAsync: function (data, element, config, queryResponse, details, done) {

		var now = moment().endOf('day').toDate();
		var yearAgo = moment().startOf('day').subtract(1, 'year').toDate();
		var chartData = d3.timeDays(yearAgo, now).map(function (dateElement) {
			return {
				date: dateElement,
				count: (dateElement.getDay() !== 0 && dateElement.getDay() !== 6) ? Math.floor(Math.random() * 60) : Math.floor(Math.random() * 10)
			};
		});


		var dimension_name = queryResponse.fields.dimensions[0].name;
		var tablecalc_name = queryResponse.fields.table_calculations[0].name;

		var data_m = _.map(data, function (value, key) {
			var obj = {};
			var newRow = _.map(value, function (objectValue, objectKey) {
				// var new_name = objectKey.split(".");
				if (objectKey == dimension_name) {
					obj["date"] = moment(objectValue.value, 'YYYY-MM-DD').toDate();
				} else if (objectKey == tablecalc_name) {
					obj["count"] = objectValue.value && Math.floor(objectValue.value * 100) / 100;
				}
			});
			return obj;
		});

		data_m = _.sortBy(data_m, 'date');

		var data_min_max = _.sortBy(data, function (o) {
			return o[tablecalc_name].value
		});
		var data_minimum = data_min_max[0][tablecalc_name].rendered;
		var data_maximum = data_min_max.slice(-1)[0][tablecalc_name].rendered;

		less_min = function (value) {
			if (value == "Text") {
				return config.lessText;
			} else if (value == "Min/Max Values") {
				return data_minimum;
			}
		};

		more_max = function (value) {
			if (value == "Text") {
				return config.moreText;
			} else if (value == "Min/Max Values") {
				return data_maximum;
			}
		};

		function formatMonthLabel() {
			// append YY to months depends on data
			var map = {};
			var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

			for (var i = 0; i < data_m.length; i++) {
				var month = moment(data_m[i].date).month();

				if (map[month]) {
					continue;
				}

				map[month] = moment(data_m[i].date).format("YY")
			}

			for (var j = 0; j < months.length; j++) {
				if (map[j]) {
					months[j] += map[j];
				}
			}

			return months;
		}

		var heatmap = calendarHeatmap()
			.data(data_m)
			.selector('.container')
			.tooltipEnabled(true)
			.colorRange([config.colorMin, config.colorQ1, config.colorQ2, config.colorQ3, config.colorMax])
			.startDate(_.first(data_m).date)
			.endDate(moment(_.last(data_m).date).add(1, "day"))
			.locale({
				months: formatMonthLabel(),
				days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
				No: 'N/A',
				on: 'on',
				Less: less_min(config.textMinMaxToggle),
				More: more_max(config.textMinMaxToggle)
			});
		heatmap();  // render the chart
		done()

	}
});