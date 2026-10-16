const margin = { top: 80, right: 60, bottom: 60, left: 100 };
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

let allData = []
// let xVar, yVar, sizeVar, targetYear
let xVar = 'income', yVar = 'lifeExp', sizeVar = 'population', targetYear = 2000
let xScale, yScale, sizeScale
const continents = ['Africa', 'Asia', 'Oceania', 'Americas', 'Europe']
const colorScale = d3.scaleOrdinal(continents, d3.schemeSet2); // d3.schemeSet2 is

const options = ['income', 'lifeExp', 'gdp', 'population', 'childDeaths']
// Rickyt Extension: user-friendly names shown in the dropdowns and axis labels
const optionLabels = {
    income: 'Income per Person',
    lifeExp: 'Life Expectancy',
    gdp: 'GDP per Capita',
    population: 'Population',
    childDeaths: 'Child Deaths'
}


const t = 1000; // 1000ms = 1 second


// Create SVG
const svg = d3.select('#vis')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

function init(){
    d3.csv("./data/gapminder_subset.csv", d => ({
        // Besides converting the types, we also simpilify the variable names here. 
        country: d.country,
        continent: d.continent,
        year: +d.year, // using + to convert to numbers; same below
        lifeExp: +d.life_expectancy, 
        income: +d.income_per_person, 
        gdp: +d.gdp_per_capita, 
        childDeaths: +d.number_of_child_deaths,
        population: +d.population
    }))
    .then(data => {
            // console.log(data)
            allData = data
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

  let slider = d3
    .sliderHorizontal()
    .min(d3.min(allData.map(d => +d.year))) // setup the range
    .max(d3.max(allData.map(d => +d.year))) // setup the range
    .step(1)
    .width(width)
    .displayValue(false)
    .default(targetYear) // start the slider at the initial year
    .tickFormat(d3.format('d'))
    .on('onchange', (val) => {
        targetYear = +val // Update the year
        updateVis() // Refresh the chart
    });

    d3.select('#slider')
        .append('svg')
        .attr('width', width)
        .attr('height', 100)
        .append('g')
        .attr('transform', 'translate(30,30)')
        .call(slider);

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
}

function updateAxes(){
  // Draws the x-axis and y-axis
  // Adds ticks, labels, and makes sure everything lines up nicely
    svg.selectAll('.axis').remove()
    svg.selectAll('.labels').remove()

    xScale = d3.scaleLinear()
        .domain([0, d3.max(allData, d => d[xVar])])
        .range([0, width]);
    const xAxis = d3.axisBottom(xScale)
        .ticks(6) // Extension: fewer ticks so labels don't crowd
        .tickFormat(d3.format('~s')) // Extension: 160,000 -> 160k

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`) // Position at the bottom
        .call(xAxis);

    yScale = d3.scaleLinear()
        .domain([0, d3.max(allData, d => d[yVar])])
        .range([height, 0]);
    const yAxis = d3.axisLeft(yScale)
        .ticks(6)
        .tickFormat(d3.format('~s'))

    svg.append("g")
        .attr("class", "axis")
        .call(yAxis);

    sizeScale = d3.scaleSqrt()
        .domain([0, d3.max(allData, d => d[sizeVar])]) // Largest bubble = largest data point
        .range([5, 20]); // Feel free to tweak these values if you want bigger or smaller bubbles

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
    let currentData = allData.filter(d => d.year === targetYear)

    svg.selectAll('.points')
        .data(currentData, d => d.country)
        .join(
            // When we have new data points
           // Enter: When new bubbles are added
            function (enter) {
                return enter
                    .append('circle')
                    .attr('class', 'points')
                    .attr('cx', d => xScale(d[xVar]))
                    .attr('cy', d => yScale(d[yVar]))
                    .style('fill', d => colorScale(d.continent))
                    .style('opacity', .5)
                    .attr('r', 0) // before transition r = 0
                    .on('mouseover', function (event, d) {
                        d3.select(this) 
                            .style('stroke', 'black')
                            .style('stroke-width', '4px')
                        d3.select('#tooltip')
                            .style("display", 'block') // Make the tooltip visible
                            .html(`<strong>${d.country}</strong><br/>
                            Continent: ${d.continent}`)
                            .style("left", (event.pageX + 20) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function (event, d) {
                        d3.select(this)
                            .style('stroke', 'none') // Remove the highlight
                        d3.select('#tooltip')
                            .style('display', 'none') // Hide tooltip when cursor leaves
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
}

function addLegend(){
    let size = 10  // Size of the legend squares

    // Your turn, draw a set of rectangles using D3
    svg.selectAll('continentSquare')
    .data(continents)
    .enter()
    .append('rect')
    .attr('y', -margin.top/2)
    .attr('x', (d, i) => i * (size + 100) + 100)
    .attr('width', size)
    .attr('height', size)
    .style("fill", d => colorScale(d))

    svg.selectAll("continentName")
        .data(continents)
        .enter()
        .append("text")
        .attr("y", -margin.top/2 + size) // Align vertically with the square
        .attr("x", (d, i) => i * (size + 100) + 120)  
        .style("fill", d => colorScale(d))  // Match text color to the square
        .text(d => d) // The actual continent name
        .attr("text-anchor", "left")
        .style('font-size', '13px')
}

window.addEventListener('load', init);