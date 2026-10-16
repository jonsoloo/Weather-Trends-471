const margin = { top: 80, right: 60, bottom: 60, left: 100 };
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

let allData = []
// let xVar, yVar, sizeVar, targetYear
let xVar = 'latitude', yVar = 'TMAX', sizeVar = 'PRCP'
let xScale, yScale, sizeScale
let slider
let selectedRegion = null
let selectedState = null
let selectedStation = null
let barVar = 'TMAX'

// Rickyt Extension: user-friendly names shown in the dropdowns and axis labels
const parseDate = d3.utcParse('%Y%m%d')
const formatDate = d3.utcFormat('%b %d, %Y')
const formatValue = d3.format(',.2~f')
let targetDate = parseDate('20170101')

const regions = ['West', 'Midwest', 'South', 'Northeast']
const regionOf = {
    AK: 'West', AZ: 'West', CA: 'West', CO: 'West', HI: 'West', ID: 'West', MT: 'West',
    NV: 'West', NM: 'West', OR: 'West', UT: 'West', WA: 'West', WY: 'West',
    IA: 'Midwest', IL: 'Midwest', IN: 'Midwest', KS: 'Midwest', MI: 'Midwest', MN: 'Midwest',
    MO: 'Midwest', ND: 'Midwest', NE: 'Midwest', OH: 'Midwest', SD: 'Midwest', WI: 'Midwest',
    AL: 'South', AR: 'South', DC: 'South', DE: 'South', FL: 'South', GA: 'South', KY: 'South',
    LA: 'South', MD: 'South', MS: 'South', NC: 'South', OK: 'South', SC: 'South', TN: 'South',
    TX: 'South', VA: 'South', WV: 'South',
    CT: 'Northeast', MA: 'Northeast', ME: 'Northeast', NH: 'Northeast', NJ: 'Northeast',
    NY: 'Northeast', PA: 'Northeast', RI: 'Northeast', VT: 'Northeast'
}
const colorScale = d3.scaleOrdinal(regions, d3.schemeSet2); // d3.schemeSet2 is

const options = ['TMAX', 'TMIN', 'PRCP', 'SNOW', 'AWND', 'latitude', 'longitude', 'elevation']
const barOptions = ['TMAX', 'TMIN', 'PRCP', 'SNOW', 'AWND']
// user-friendly names shown in the dropdowns, axis labels, and tooltip
const optionLabels = {
    TMAX: 'Max Temperature (°F)',
    TMIN: 'Min Temperature (°F)',
    PRCP: 'Precipitation (in)',
    SNOW: 'Snowfall (in)',
    AWND: 'Avg Wind Speed (mph)',
    latitude: 'Latitude',
    longitude: 'Longitude',
    elevation: 'Elevation (m)'
}


const t = 1000; // 1000ms = 1 second


// Create SVG
const svg = d3.select('#vis')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

// Second SVG for the bar chart (same setup as Lab 2)
const barHeight = 200
const barSvg = d3.select('#bars')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', barHeight + 40 + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},40)`);

function init(){
    d3.csv("./data/weather.csv", d => ({
        // Besides converting the types, we also simpilify the variable names here. 
        station: d.station,
        state: d.state,
        region: regionOf[d.state],
        date: parseDate(d.date),
        latitude: +d.latitude, // using + to convert to numbers; same below
        longitude: +d.longitude,
        elevation: +d.elevation,
        TMAX: d.TMAX === '' ? NaN : +d.TMAX,
        TMIN: d.TMIN === '' ? NaN : +d.TMIN,
        PRCP: d.PRCP === '' ? NaN : +d.PRCP,
        SNOW: d.SNOW === '' ? NaN : +d.SNOW,
        AWND: d.AWND === '' ? NaN : +d.AWND
    }))
    .then(data => {
            // console.log(data)
            // remove broken temp readings
            allData = data.filter(d => d.region
                && !(d.TMAX > 130 || d.TMAX < -80 || d.TMIN < -80))
            selectedStation = allData.filter(d => d.station === 'BALTIMORE WASH INTL AP')[0]
            setupSelector()
            
            // Initial rendering steps:
            // P.S. You could move these into setupSelector(), 
            // but calling them separately makes the flow clearer.
            updateAxes()
            updateVis()
            addLegend()
        })
    .catch(error => console.error('Error loading data:', error));
}

// Here’s what each function is responsible for:

function setupSelector(){
  // Handles UI changes (sliders, dropdowns)
  // Anytime the user tweaks something, this function reacts.
  // May need to call updateAxes() and updateVis() here when needed!

  slider = d3
    .sliderHorizontal()
    .min(d3.min(allData, d => d.date)) // setup the range
    .max(d3.max(allData, d => d.date)) // setup the range
    .step(1000 * 60 * 60 * 24) // one day in ms
    .width(width)
    .displayValue(false)
    .default(targetDate) // start the slider at the initial day
    .tickFormat(d3.utcFormat('%b'))
    .on('onchange', (val) => {
        targetDate = val // Update the day
        d3.select('#dateLabel').text(formatDate(targetDate))
        svg.selectAll('.annotation').remove() // the Harvey note only fits Aug 27
        updateVis() // Refresh the chart
    });

    d3.select('#slider')
        .append('svg')
        .attr('width', width + 60)
        .attr('height', 100)
        .append('g')
        .attr('transform', 'translate(30,30)')
        .call(slider);

    d3.select('#dateLabel').text(formatDate(targetDate))

    d3.selectAll('.variable')
    // loop over each dropdown button
        .each(function() {
            d3.select(this).selectAll('myOptions')
            .data(options)
            .enter()
            .append('option')
            .text(d => optionLabels[d]) // The displayed text
            .attr("value",d => d) // The actual value used in the code
        })
        .on("change", function (event) {
            // identify which dropdown was changed
            // console.log(d3.select(this).property("id"))
            // console.log(d3.select(this).property("value"))
            let id = d3.select(this).property("id")
            let value = d3.select(this).property("value")
            if (id === "xVariable") {
                xVar = value
            } else if (id === "yVariable") {
                yVar = value
            } else if (id === "sizeVariable") {
                sizeVar = value
            }

            // update chart
            updateAxes();
            updateVis();
        })

    d3.select('#xVariable').property('value', xVar)
    d3.select('#yVariable').property('value', yVar)
    d3.select('#sizeVariable').property('value', sizeVar)

    // dropdown for the bar chart
    d3.select('#barVariable')
        .selectAll('myOptions')
        .data(barOptions)
        .enter()
        .append('option')
        .text(d => optionLabels[d])
        .attr("value", d => d)

    d3.select('#barVariable')
        .property('value', barVar)
        .on("change", function (event) {
            barVar = d3.select(this).property("value")
            updateBars()
        })

    d3.select('#harveyButton').on('click', function () {
        // switch to a map view: longitude on x, latitude on y, bubble size = rain
        xVar = 'longitude'
        yVar = 'latitude'
        sizeVar = 'PRCP'
        d3.select('#xVariable').property('value', xVar)
        d3.select('#yVariable').property('value', yVar)
        d3.select('#sizeVariable').property('value', sizeVar)

        selectedRegion = null
        selectedState = 'TX'

        // show Houston's rain in the bar chart
        selectedStation = allData.filter(d => d.station === 'HOUSTON INTERCONT AP')[0]
        barVar = 'PRCP'
        d3.select('#barVariable').property('value', barVar)

        updateAxes()
        slider.value(parseDate('20170827')) // moves the slider
        updateVis()
        addHarveyNote()
    })

    d3.select('#resetButton').on('click', function () {
        selectedRegion = null
        selectedState = null
        svg.selectAll('.annotation').remove()
        updateHighlight()
    })
}

function updateAxes(){
  // Draws the x-axis and y-axis
  // Adds ticks, labels, and makes sure everything lines up nicely
    svg.selectAll('.axis').remove()
    svg.selectAll('.labels').remove()
    svg.selectAll('.annotation').remove()

    xScale = d3.scaleLinear()
        .domain([d3.min(allData, d => d[xVar]), d3.max(allData, d => d[xVar])])
        .range([0, width]);
    const xAxis = d3.axisBottom(xScale)
        .ticks(6) // Extension: fewer ticks so labels don't crowd

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`) // Position at the bottom
        .call(xAxis);

    yScale = d3.scaleLinear()
        .domain([d3.min(allData, d => d[yVar]), d3.max(allData, d => d[yVar])])
        .range([height, 0]);
    const yAxis = d3.axisLeft(yScale)
        .ticks(6)

    svg.append("g")
        .attr("class", "axis")
        .call(yAxis);

    sizeScale = d3.scaleSqrt()
        .domain([d3.min(allData, d => d[sizeVar]), d3.max(allData, d => d[sizeVar])]) // Largest bubble = largest data point
        .range([3, 15]); // Feel free to tweak these values if you want bigger or smaller bubbles

    // X-axis label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 20)
        .attr("text-anchor", "middle")
        .text(optionLabels[xVar]) // Displays the current x-axis variable
        .attr('class', 'labels')

    // Y-axis label (rotated)
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 40)
        .attr("text-anchor", "middle")
        .text(optionLabels[yVar]) // Displays the current y-axis variable
        .attr('class', 'labels')
}

function updateVis(){
  // Draws (or updates) the bubbles
  // Only stations that reported all three chosen variables on this day
    let currentData = allData.filter(d => d.date.getTime() === targetDate.getTime()
        && !isNaN(d[xVar]) && !isNaN(d[yVar]) && !isNaN(d[sizeVar]))

    svg.selectAll('.points')
        .data(currentData, d => d.station + d.state)
        .join(
            // When we have new data points
           // Enter: When new bubbles are added
            function (enter) {
                return enter
                    .append('circle')
                    .attr('class', 'points')
                    .attr('cx', d => xScale(d[xVar]))
                    .attr('cy', d => yScale(d[yVar]))
                    .style('fill', d => colorScale(d.region))
                    .style('opacity', .5)
                    .attr('r', 0) // before transition r = 0
                    .on('mouseover', function (event, d) {
                        d3.select(this)
                            .style('stroke', 'black')
                            .style('stroke-width', '2px')
                        d3.select('#tooltip')
                            .style("display", 'block') // Make the tooltip visible
                            .html(`<strong>${d.station}, ${d.state}</strong><br/>
                            ${formatDate(d.date)}<br/>
                            ${optionLabels[xVar]}: ${formatValue(d[xVar])}<br/>
                            ${optionLabels[yVar]}: ${formatValue(d[yVar])}<br/>
                            ${optionLabels[sizeVar]}: ${formatValue(d[sizeVar])}`)
                            .style("left", (event.pageX + 20) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function (event, d) {
                        d3.select(this)
                            .style('stroke', 'none') // Remove the highlight
                        d3.select('#tooltip')
                            .style('display', 'none') // Hide tooltip when cursor leaves
                    })
                    .on('click', function (event, d) {
                        selectedStation = d // show this station in the bar chart
                        updateBars()
                    })
                    .transition().duration(t) // Animate the transition
                    .attr('r', d => sizeScale(d[sizeVar])) // Expand to target size
            },
            // Update: When existing bubbles need to move or resize
            function (update) {
                return update
                    // Smoothly move to new positions/sizes
                    .transition().duration(t)
                    .attr('cx', d => xScale(d[xVar]))
                    .attr('cy', d => yScale(d[yVar]))
                    .attr('r', d => sizeScale(d[sizeVar]))

            },
            // Exit: When bubbles need to be removed
            function (exit) {
                exit
                .transition().duration(t)
                .attr('r', 0)  // Shrink to radius 0
                .remove()  // Then remove the bubble
            }
        )

    updateHighlight() // keep the faded bubbles faded after the update
    updateBars() // so the black bar follows the slider
}

function updateBars(){
  // Bar chart of one station, one bar per day from Lab 2 and Lab 5 as referencing point as needed to debug
    let stationData = allData.filter(d => d.station === selectedStation.station
        && d.state === selectedStation.state && !isNaN(d[barVar]))
    stationData.sort((a, b) => a.date - b.date) // the CSV is not in date order

    d3.select('#barTitle')
        .text(`${selectedStation.station}, ${selectedStation.state}: ${optionLabels[barVar]} each day`)

    barSvg.selectAll('.axis').remove()
    barSvg.selectAll('.labels').remove()

    let barX = d3.scaleBand()
        .domain(stationData.map(d => d.date))
        .range([0, width])
        .padding(0.2)

    // start at 0 unless the station has values below 0
    let barY = d3.scaleLinear()
        .domain([Math.min(0, d3.min(stationData, d => d[barVar])), d3.max(stationData, d => d[barVar])])
        .range([barHeight, 0])

    // only label the 1st of each month, otherwise 260 labels pile up
    let barXAxis = d3.axisBottom(barX)
        .tickValues(stationData.map(d => d.date).filter(date => date.getUTCDate() === 1))
        .tickFormat(d3.utcFormat('%b'))

    barSvg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${barHeight})`)
        .call(barXAxis);

    barSvg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(barY).ticks(5));

    // Y-axis label (rotated)
    barSvg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -barHeight / 2)
        .attr("y", -margin.left + 40)
        .attr("text-anchor", "middle")
        .text(optionLabels[barVar])
        .attr('class', 'labels')

    // the day picked on the slider is black
    let barColor = d => d.date.getTime() === targetDate.getTime() ? 'black' : colorScale(d.region)

    barSvg.selectAll('.bar')
        .data(stationData, d => d.date)
        .join(
            // Enter: new bars start flat and grow
            function (enter) {
                return enter
                    .append('rect')
                    .attr('class', 'bar')
                    .attr('x', d => barX(d.date))
                    .attr('width', barX.bandwidth())
                    .attr('y', barY(0))
                    .attr('height', 0)
                    .style('fill', d => barColor(d))
                    .transition().duration(t)
                    .attr('y', d => d[barVar] > 0 ? barY(d[barVar]) : barY(0))
                    .attr('height', d => Math.abs(barY(d[barVar]) - barY(0)))
            },
            // Update: bars move to the new station's values
            function (update) {
                return update
                    .style('fill', d => barColor(d))
                    .transition().duration(t)
                    .attr('x', d => barX(d.date))
                    .attr('width', barX.bandwidth())
                    .attr('y', d => d[barVar] > 0 ? barY(d[barVar]) : barY(0))
                    .attr('height', d => Math.abs(barY(d[barVar]) - barY(0)))
            },
            // Exit: days this station has no data for
            function (exit) {
                exit
                .transition().duration(t)
                .attr('height', 0)
                .remove()
            }
        )
}

function updateHighlight(){
  // Fades out every bubble that is not picked
    svg.selectAll('.points')
        .style('opacity', d => {
            if (selectedState !== null) {
                return d.state === selectedState ? .8 : .05
            }
            if (selectedRegion !== null) {
                return d.region === selectedRegion ? .8 : .05
            }
            return .5
        })
}

function clickRegion(region){
    // clicking the same region again turns the highlight off
    if (selectedRegion === region) {
        selectedRegion = null
    } else {
        selectedRegion = region
    }
    selectedState = null
    svg.selectAll('.annotation').remove()
    updateHighlight()
}

function addHarveyNote(){
    let x = xScale(-95.4)
    let y = yScale(29.8)

    svg.append('line')
        .attr('class', 'annotation')
        .attr('x1', x)
        .attr('y1', y + 8)
        .attr('x2', x)
        .attr('y2', y + 40)
        .style('stroke', 'black')

    svg.append('text')
        .attr('class', 'annotation')
        .attr('x', x)
        .attr('y', y + 55)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .text('Hurricane Harvey wass about 16 inches of rain in Houston on Aug 27!')
}

function addLegend(){
    let size = 10  // Size of the legend squares

    // Your turn, draw a set of rectangles using D3
    svg.selectAll('regionSquare')
    .data(regions)
    .enter()
    .append('rect')
    .attr('y', -margin.top/2)
    .attr('x', (d, i) => i * (size + 100) + 100)
    .attr('width', size)
    .attr('height', size)
    .style("fill", d => colorScale(d))
    .style('cursor', 'pointer')
    .on('click', (event, d) => clickRegion(d))

    svg.selectAll("regionName")
        .data(regions)
        .enter()
        .append("text")
        .attr("y", -margin.top/2 + size) // Align vertically with the square
        .attr("x", (d, i) => i * (size + 100) + 120)
        .style("fill", d => colorScale(d))  // Match text color to the square
        .text(d => d) // The actual region name
        .attr("text-anchor", "left")
        .style('font-size', '13px')
        .style('cursor', 'pointer')
        .on('click', (event, d) => clickRegion(d))

    // hint so people know the legend can be clicked
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top/2 + size + 20)
        .attr("text-anchor", "middle")
        .style('font-size', '11px')
        .style("fill", "gray")
        .text("click a region to highlight it, click it again to undo")
}

window.addEventListener('load', init);
