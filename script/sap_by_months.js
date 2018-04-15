function setGraph(){
    h = 600
    w = 1000

    var svg = d3.select("#graph")
        .attr("width" , w)
        .attr("height", h);

    svg.append("text")
        .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
        .attr("transform", "translate(100,15)")  // text is drawn off the screen top left, move down and out and rotate
		.attr("font-size",22)
		.text("Flux de sève");
	svg.append("text")
        .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
        .attr("transform", "translate(100,35)")  // text is drawn off the screen top left, move down and out and rotate
		.attr("font-size",22)
		.text("(mmol H2O m-2 s-1)");

    svg.append("text")
        .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
        .attr("transform", "translate(500,500)")  // centre below axis
		.attr("font-size",22)
        .text("Heure");
}

function updateOnMonthsList(){
    // met à jour les courbes en fonction des checkbox cochées
    d3.selectAll(".monthsList").each(function(d){ // parcourt les checkbox
        list = d3.select(this);
        if(list.property("checked")){ // vérifie les checkbox cochées
            var elementToCreate = document.getElementById(list.property("value"));
            if(!elementToCreate){
                drawMulti(list.property("value")); // trace les courbes
            }
        }
        if(!list.property("checked")){ // vérifie les checkbox non cochées
            var elementToErase = document.getElementById(list.property("value"));
            if(elementToErase){
                elementToErase.remove(); // efface les courbes
            }
        }
    })
}

function drawMulti(months){
    d3.csv("data/puechabon/month/Puechabon_mean_per_month.csv", function(error, data){
        var date = []
        var sap = []

        data.forEach(function (d){
            if(d.mois == months){
                date.push(d.heure_solaire);
                sap.push(d.SAP_FLOW);
            }
        })

        var scaleX = d3.scaleLinear()
            .domain([0,24])
            .range([0,1000]);

        var scaleY = d3.scaleLinear()
            .domain([d3.min(data, function(d){
                return d.SAP_FLOW;
            }),d3.max(data, function(d){
                return d.SAP_FLOW;
            })])
            .range([500,0]);

        var axisX = d3.axisBottom(scaleX);

        var axisY = d3.axisLeft(scaleY);

        var svg = d3.select("#graph");
        
        svg.select("#axisX")
            .call(axisX.ticks(24))
            .attr("transform","translate(100,560)")
            .attr("font-size",25);

        svg.select("#axisY")
            .call(axisY)
            .attr("transform","translate(90,50)")
            .attr("font-size",25);
                            
        var Lvalues = d3.line()
            .x(function(d,i){
                return scaleX(i)/2
            })
            .y(function(d,i){
                return scaleY(sap[i])
            })
            .curve(d3.curveBasis);
        
        var colors = d3.schemeCategory10; // attention, il n'y a que 10 couleurs !

        svg.select("#curves")
            .append("path")
            .attr("id",months)
            .attr("transform", "translate(100,50)")          
            .attr("stroke",colors[months-4])
            .attr("stroke-width",2 )
            .attr("fill","none")
            .transition()
            .duration(500)
            .attr("d", Lvalues(date));
    
    })
}