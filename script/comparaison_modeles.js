//////////////////////////////////////////////// LM ////////////////////////////////////////////////////////

var dataDict = {};
var nomX=[];
var betaDict = {};
var factMult=[1,1,1,1,1,1,1,1,1,1,1]; // Facteur multiplicatif des X
var nbBeta = 11;

// Fonction qui récupère les bétas
function readBetaFile(){
	var xhttp2 = new XMLHttpRequest();
	xhttp2.open("GET","data/puechabon/reg_lin/beta_eq.csv", true);
	xhttp2.onreadystatechange = function (){
		if(xhttp2.readyState === 4){
			var data2 = xhttp2.responseText;
			var allTextLines2 = data2.match(/[^(\r\n|\t|,)]+/g);
			for(i=0;i<(nbBeta*2);i+=2){
				betaDict[allTextLines2[i]]= [allTextLines2[i+1]];	
			}
			
		}
	}
	xhttp2.send();
}

// fonction qui récupère les données .CSV 
// qui les nettoie, pour avoir un  un tableau des X variables pour chaque demi-heure 
// et le nom des variables X 
// et qui appelle la fonction EQ et Sliders
function readTextFile(){
	var xhttp = new XMLHttpRequest();
	xhttp.open("GET", "data/puechabon/reg_lin/X_par_heure.csv", true);
	xhttp.onreadystatechange = function (){
		if(xhttp.readyState === 4){
				var data = xhttp.responseText;
				var allTextLines = data.match(/[^(\r\n|\t|,)]+/g);
				for(i=0;i<nbBeta;i++){
					for(j=1;j<=48;j++){
						if ( !dataDict[allTextLines[(i*49)]]){
							dataDict[allTextLines[(i*49)]]= [];
						}
						dataDict[allTextLines[(i*49)]].push(allTextLines[((i)*49)+j]);
					}
					nomX.push(allTextLines[(i*49)]);
				}
        EQ(dataDict,nomX,betaDict,factMult);
        sliders();
		}
	}
	xhttp.send();
}

// Fonction qui calcule les Y avec l'equation du modèle
// qui prend comme entrée un tableau des X variables pour chaque demi heure 
// qui prend comme 2ème entrée le nom des variables X
function EQ(Donnee,nomX,betaDict,factMult){

	d3.csv("data/puechabon/sliders/factMult.csv", function(error,data){
		minFact = [];
		maxFact = [];
		step = [];
		minVal = [];
		maxVal = [];

		data.forEach(function (d){
			minFact.push(d.factMultMin);
			maxFact.push(d.factMultMax);
			step.push(d.step);
			minVal.push(d.minVal);
			maxVal.push(d.maxVal)
		})

		var dataX=[];
		var Y=[];
		for (i=0;i<48 ;i++) {
			
			dataX=[];
			for (j=1;j<nomX.length;j++) {
                if(nomX[j] in Donnee){		
                    dataX.push(Donnee[nomX[j]][i]);	
                }
			}
			
			values = []
			for(k=0;k<factMult.length;k++){
				if(dataX[k]*factMult[k] < minVal[k]){
					values.push(minVal[k]);
				}
				else if(dataX[k]*factMult[k] > maxVal[k]){
					values.push(maxVal[k]);
				}
				else{
					values.push(dataX[k]*factMult[k])
				}
			}
			
			// Equation automatique :
			Y[i]=(Number(betaDict["beta0"][0])+
			betaDict[nomX[1]][0]*values[0]+
			betaDict[nomX[2]][0]*values[1]+
			betaDict[nomX[3]][0]*values[2]+
			betaDict[nomX[4]][0]*values[3]+
			betaDict[nomX[5]][0]*values[4]+
			betaDict[nomX[6]][0]*values[5]+
			betaDict[nomX[7]][0]*values[6]+
			betaDict[nomX[8]][0]*values[7]+
			betaDict[nomX[9]][0]*values[8]+
			betaDict[nomX[10]][0]*values[9]) ;
			
			if(Y[i] < 0){Y[i] = 0}; // Limite à O min
			if(values[0] < 10){Y[i] = 0}; // Met a 0 qd pas de lumiere
			Y[i]  = Y[i]*0.065; //Changement unités
		}
		Courbe(Y);
	})
}

// Fonction qui trace la courbe "line" + les points "cir"
function Courbe(Y){	
	// Remise à zero de la courbe : 
	var svg = d3.select("#graph");

	// scaleY
	var scaleY = d3.scaleLinear();
	// J'inverse min et max car pour Y c'est inversé
	scaleY.domain([1,0]);
	scaleY.range([0,500]);

	// Axe Y
	var yAxis = d3.axisLeft(scaleY);
	var gyAxis = svg.select("#axisX");
	gyAxis.call(yAxis);
	gyAxis.attr("font-size",28);
	gyAxis.attr("transform","translate(50,50)");
	
	// scaleX
	var scaleX = d3.scaleLinear();
	scaleX.domain([0,24]);
	scaleX.range([0,1000]);
	
	// Axe X
	var xAxis = d3.axisBottom(scaleX);
	var gxAxis = svg.select("#axisY");
	gxAxis.call(xAxis.ticks(24));
	gxAxis.attr("font-size",28);
	gxAxis.attr("transform","translate(50,550)");
	
	// Ajout titres des axes
	var tmp ="";
	tmp +='<text x="550" y="620" font-size="28" fill="black" style="text-anchor: middle"  >Heure</text>';
	tmp += ' <text x="100" y="0" font-size="28" fill="black" style="text-anchor: middle"  >Flux de sève (mm/h)</text>';
	var titre_axes = document.getElementById("texte");
	titre_axes.innerHTML = tmp;	

	// line
	var lValues = d3.line();
	lValues.x(function(d,i) { return scaleX(i/2) });
	lValues.y(function(d) { return scaleY(d)});
	var gLine = svg.select(".courbe")
		.attr("transform", "translate(50,50)")
		.attr("stroke", "black")
		.attr("stroke-width",2 )
		.attr("fill", "none")
		.transition()
		.duration(500)
		.on("start", function(d){
			var gPoints = document.getElementById("points");
			gPoints.innerHTML = ""  ;	
		})
		.on("end", function(d){
			// Ajout des points
			cir ="";
			for (j=0;j<Y.length;j++) {
				cir +=' <circle transform = "translate(50,50)" onmouseover="drawInfoBox('+Y[j]+','+j+','+scaleX(j)+','+scaleY(Y[j])+')" onmouseleave="removeInfoBox()" 	cx="'+scaleX(j/2)+'" cy="'+scaleY(Y[j])+'" r="5" fill="black" />' ;
			}
			var gPoints = document.getElementById("points");
			gPoints.innerHTML = cir  ;		
		})
		.attr("d", lValues(Y));	
		
	//legende	
	var legend = svg.append("g")
	  .attr("class", "legend")
	  .attr("transform", "translate(50,50)")
	  .attr("height", 100)
	  .attr("width", 100);

	legend.append("line")
		.attr("transform", "translate(540,50)")
		.attr("x1", 5)
		.attr("y1", 0)
		.attr("x2", 50)
		.attr("y2", 0)
		.attr("stroke-width", 2)
		.attr("stroke", "black");

	legend.append("line")
		.attr("transform", "translate(540,70)")
		.attr("x1", 5)
		.attr("y1", 0)
		.attr("x2", 50)
		.attr("y2", 0)
		.attr("stroke-width", 2)
		.attr("stroke", "blue");

	legend.append("line")
		.attr("transform", "translate(540,90)")
		.attr("x1", 5)
		.attr("y1", 0)
		.attr("x2", 50)
		.attr("y2", 0)
		.attr("stroke-width", 2)
		.attr("stroke", "red");
		
	legend.append("text")
	  .attr("transform", "translate(600,50)")
	  .text("LM simple");
	legend.append("text")
	  .attr("transform", "translate(600,70)")
	  .text("LM avec transformation");
	legend.append("text")
	  .attr("transform", "translate(600,90)")
	  .text("PCR");
}

function saveCurve(){
    // garde la trace de la courbe sélectionnée
    var dupplicated = false; // devient true si la courbe a déjà été sauvegardée
	var graph = document.getElementById("courbes");
    var curves = document.getElementsByClassName("courbe");
    var oldCurve = curves[0].cloneNode(false); // courbe actuellement dessinée par l'utilisateur
    for(i=1;i<curves.length;i++){ // i débute à 1 pour ignorer la courbe que l'on souhaite sauvegarder pendant la vérification
        if(curves[i].getAttribute('d') == oldCurve.getAttribute('d')){
            dupplicated = true
        }
    }
    if(!dupplicated){
        graph.innerHTML += oldCurve.outerHTML;
		curves = document.getElementsByClassName("courbe");
        for(i=1;i<curves.length;i++){
            curves[i].setAttribute("opacity",i/curves.length)
        }
    }
}

function resetCurve(){
    // supprime les traces d'anciennes courbes en supprimant tous les enfants de la balise g, sauf la courbe actuellement dessinée
    graph = document.getElementById("courbes");
    while (graph.childNodes.length > 2) { // 2 car le saut à la ligne compte comme un child
        graph.removeChild(graph.lastChild);
    }  
}

//////////////////////////////////////////////// TRANS ////////////////////////////////////////////////////////

var dataDictTrans = {};
var nomXTrans=[];
var betaDictTrans = {};
var factMultTrans=[1,1,1,1,1,1,1,1,1,1,1,1,1]; // Facteur multiplicatif des X
var nbBeta = 13;

// Fonction qui récupère les bétas
function readBetaFile_trans(){
	var xhttp2 = new XMLHttpRequest();
	xhttp2.open("GET","data/puechabon/reg_non_lin/beta_eq.csv", true);
	xhttp2.onreadystatechange = function (){
		if(xhttp2.readyState === 4){
			var data2 = xhttp2.responseText;
			var allTextLines2 = data2.match(/[^(\r\n|\t|,)]+/g);
			for(i=0;i<(nbBeta*2);i+=2){
				betaDictTrans[allTextLines2[i]]= [allTextLines2[i+1]];	
			}
			
		}
	}
	xhttp2.send();
}

// fonction qui récupère les données .CSV 
// qui les nettoie, pour avoir un  un tableau des X variables pour chaque demi-heure 
// et le nom des variables X 
// et qui appelle la fonction EQ et Sliders
function readTextFile_trans(){
    nomXTrans = [];
	var xhttp = new XMLHttpRequest();
	xhttp.open("GET", "data/puechabon/reg_non_lin/X_par_heure.csv", true);
	xhttp.onreadystatechange = function (){
		if(xhttp.readyState === 4){
				var data = xhttp.responseText;
				var allTextLines = data.match(/[^(\r\n|\t|,)]+/g);
				for(i=0;i<nbBeta;i++){
					for(j=1;j<=48;j++){
						if ( !dataDictTrans[allTextLines[(i*49)]]){
							dataDictTrans[allTextLines[(i*49)]]= [];
						}
						dataDictTrans[allTextLines[(i*49)]].push(allTextLines[((i)*49)+j]);
                    }
					nomXTrans.push(allTextLines[(i*49)]);
				}
		EQ_trans(dataDictTrans,nomXTrans,betaDictTrans,factMultTrans);
		sliders();
		}
	}
	xhttp.send();
}

// Fonction qui calcule les Y avec l'equation du modèle
// qui prend comme entrée un tableau des X variables pour chaque demi heure 
// qui prend comme 2ème entrée le nom des variables X
function EQ_trans(Donnee,nomXTrans,betaDictTrans,factMultTrans){

	d3.csv("data/puechabon/sliders/factMult_mod_nonlin.csv", function(error,data){
		minFact = [];
		maxFact = [];
		step = [];
		minVal = [];
		maxVal = [];

		data.forEach(function (d){
			minFact.push(d.factMultMin);
			maxFact.push(d.factMultMax);
			step.push(d.step);
			minVal.push(Number(d.minVal));
			maxVal.push(Number(d.maxVal));
		})

		var dataX=[];
		var Y=[];
		for (i=0;i<48 ;i++) {
			
			dataX=[];
			for (j=1;j<nomXTrans.length;j++) {	
                if(nomXTrans[j] in Donnee){		
                        dataX.push(Number(Donnee[nomXTrans[j]][i]));	
                }
			}
			
			// X maj apres les sliders (factMult)
			values = []
			for(k=0;k<factMultTrans.length;k++){
				if(dataX[k]*factMultTrans[k] < minVal[k]){
					values.push(minVal[k]);
				}
				else if(dataX[k]*factMultTrans[k] > maxVal[k]){
					values.push(maxVal[k]);
				}
				else{
					values.push(dataX[k]*factMultTrans[k])
				}
				
			}
			

		
			// Equation automatique :
			Y[i]=(Number(betaDictTrans["beta0"][0])+
			betaDictTrans[nomXTrans[1]][0]*values[0]+
			betaDictTrans[nomXTrans[2]][0]*values[1]+
			betaDictTrans[nomXTrans[3]][0]*values[2]+
			betaDictTrans[nomXTrans[4]][0]*values[3]+
			betaDictTrans[nomXTrans[5]][0]*values[4]+
			betaDictTrans[nomXTrans[6]][0]*(0.00000000002 * Math.exp (10000/values[5]))+
			betaDictTrans[nomXTrans[7]][0]*( 9 / ( 1 + Math.exp ((92-values[6]) / 34)))+
			betaDictTrans[nomXTrans[8]][0]*(9.5 / ( 1 + Math.exp ((8-values[7]) / 4)))+
			betaDictTrans[nomXTrans[9]][0]*values[8]+
			betaDictTrans[nomXTrans[10]][0]*values[9]+
			betaDictTrans[nomXTrans[11]][0]*values[10]+
			betaDictTrans[nomXTrans[12]][0]*(9 / ( 1 + Math.exp ((1.06-values[11]) / 0.33))) );
			
			if(Y[i] < 0){Y[i] = 0}; // Limite à O min
			if(values[1] < 10){Y[i] = 0}; // Met a 0 qd pas de lumiere
			Y[i]  = Y[i]*0.065; //Changement unités
		}

		// Tracer la courbe :
		Courbe_trans(Y);
	})
}

// Fonction qui trace la courbe "line" + les points "cir"
function Courbe_trans(Y){	
	// Remise à zero de la courbe : 
	var svg = d3.select("#graph");

	// scaleY
	var scaleY = d3.scaleLinear();
	// J'inverse min et max car pour Y c'est inversé
	scaleY.domain([1,0]);
	scaleY.range([0,500]);

	// Axe Y
	var yAxis = d3.axisLeft(scaleY);
	var gyAxis = svg.select("#axisX");
	gyAxis.call(yAxis);
	gyAxis.attr("font-size",28);
	gyAxis.attr("transform","translate(50,50)");
	
	// scaleX
	var scaleX = d3.scaleLinear();
	scaleX.domain([0,24]);
	scaleX.range([0,1000]);
	
	// Axe X
	var xAxis = d3.axisBottom(scaleX);
	var gxAxis = svg.select("#axisY");
	gxAxis.call(xAxis.ticks(24));
	gxAxis.attr("font-size",28);
	gxAxis.attr("transform","translate(50,550)");
	
	// Ajout titres des axes
	var tmp ="";
	tmp +='<text x="550" y="620" font-size="28" fill="black" style="text-anchor: middle"  >Heure</text>';
	tmp += ' <text x="100" y="0" font-size="28" fill="black" style="text-anchor: middle"  >Flux de sève (mm/h)</text>';
	var titre_axes = document.getElementById("texte");
	titre_axes.innerHTML = tmp;	

	// line
	var lValues = d3.line();
	lValues.x(function(d,i) { return scaleX(i/2) });
	lValues.y(function(d) { return scaleY(d)});
	var gLine = svg.select(".courbe_trans")
		.attr("transform", "translate(50,50)")
		.attr("stroke", "blue")
		.attr("stroke-width",2 )
		.attr("fill", "none")
		.transition()
		.duration(500)
		.on("start", function(d){
			var gPoints = document.getElementById("points_trans");
			gPoints.innerHTML = ""  ;	
		})
		.on("end", function(d){
			// Ajout des points
			cir ="";
			for (j=0;j<Y.length;j++) {
				cir +=' <circle transform = "translate(50,50)" onmouseover="drawInfoBox('+Y[j]+','+j+','+scaleX(j)+','+scaleY(Y[j])+')" onmouseleave="removeInfoBox()" 	cx="'+scaleX(j/2)+'" cy="'+scaleY(Y[j])+'" r="5" fill="blue" />' ;
			}
			var gPoints = document.getElementById("points_trans");
			gPoints.innerHTML = cir  ;		
		})
		.attr("d", lValues(Y));
}

function saveCurve_trans(){
    // garde la trace de la courbe sélectionnée
    var dupplicated = false; // devient true si la courbe a déjà été sauvegardée
	var graph = document.getElementById("courbes_trans");
    var curves = document.getElementsByClassName("courbe_trans");
    var oldCurve = curves[0].cloneNode(false); // courbe actuellement dessinée par l'utilisateur
    for(i=1;i<curves.length;i++){ // i débute à 1 pour ignorer la courbe que l'on souhaite sauvegarder pendant la vérification
        if(curves[i].getAttribute('d') == oldCurve.getAttribute('d')){
            dupplicated = true
        }
    }
    if(!dupplicated){
        graph.innerHTML += oldCurve.outerHTML;
		curves = document.getElementsByClassName("courbe_trans");
        for(i=1;i<curves.length;i++){
            curves[i].setAttribute("opacity",i/curves.length)
        }
    }
}

function resetCurve_trans(){
    // supprime les traces d'anciennes courbes en supprimant tous les enfants de la balise g, sauf la courbe actuellement dessinée
    graph = document.getElementById("courbes_trans");
    while (graph.childNodes.length > 2) { // 2 car le saut à la ligne compte comme un child
        graph.removeChild(graph.lastChild);
    }  
}

///////////////////////////////////////////////////ACP//////////////////////////////////////////////////////////////////

var factMult_acp=[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]; // Facteur multiplicatif des X
var dataDict_acp = {};
var nomX_acp=[];
var betaDict_acp = {};
var nbBeta_acp = 29;

function setGraph_acp(){
	var X_par_heure = [];
	var data_stand = [];
	var vec_propre = [];
	var beta_eq = [];
	var factMult_origin = [];

	d3.csv("data/puechabon/acp/X_par_heure.csv", function(error, data){
        data.forEach(function (d){ X_par_heure.push(d3.values(d))});	
		d3.csv("data/puechabon/acp/data_stand.csv", function(error, data){
			data.forEach(function (d){ data_stand.push(d3.values(d))});
			d3.csv("data/puechabon/acp/vec_propre.csv", function(error, data){
				data.forEach(function (d){ vec_propre.push(d3.values(d))});	
				d3.csv("data/puechabon/acp/beta_eq.csv", function(error, data){
					data.forEach(function (d){ beta_eq.push(d3.values(d))});	
					d3.csv("data/puechabon/sliders/factMult_origin.csv", function(error, data){
						data.forEach(function (d){ factMult_origin.push(d3.values(d))});			

						calcul(X_par_heure,data_stand,vec_propre,beta_eq,factMult_origin);
					})
				})
			})
		})
	})
}
   
function calcul(X_par_heure,data_stand,vec_propre,beta_eq,factMult_origin){ 

		for  (var i=0;i<28;i++) {
			for  (var j=1;j<49;j++) {
				
				var ValueModif=Number(X_par_heure[i][j])*factMult[i];

				
				if (ValueModif<factMult_origin[i][4]) {
				X_par_heure[i][j]=Number(factMult_origin[i][4]);
				}	
				
				else if (ValueModif>factMult_origin[i][5]) {
				X_par_heure[i][j]=Number(factMult_origin[i][5]);
				}
				
				else {
				X_par_heure[i][j]=ValueModif;
				}
		}}
	// TRANSPOSE############
	var transpose=d3.transpose(X_par_heure); 
	//NORMALISE ############   
	var data=[];
	for (var TIME=1;TIME<49;TIME++) {
		var dim1=[];
		var dim2=[];
		var dim3=[];
		transpose[TIME].forEach(
			function NORM(value,i){
				var CR=(value-data_stand[i][1])/data_stand[i][2] ; //CENTRER REDUIT
				dim1.push(CR*vec_propre[i][1]);
				dim2.push(CR*vec_propre[i][2]);
				dim3.push(CR*vec_propre[i][3]);
		});
		
		var data_DIM=[];
		data_DIM.push(d3.sum(dim1),d3.sum(dim2),d3.sum(dim3));
		var Y=Number(beta_eq[0][1])+data_DIM[0]*beta_eq[1][1]+data_DIM[1]*beta_eq[2][1]+data_DIM[2]*beta_eq[3][1];
		
		if (Y<0) { // limite à 0
			Y=0;
		}
		if (transpose[TIME][4] <10){Y=0}; // Met 0 qd pas de lumiere
		Y = Y * 0.065; //Changement unités
		
		data.push(Y);

	}
	for(i=0;i<nbBeta_acp;i++){
		nomX_acp.push(X_par_heure[i][0]);}
		sliders();
		Courbe_acp(data);
}



// Fonction qui trace la courbe "line" + les points "cir"
function Courbe_acp(Y){	
	// Remise à zero de la courbe : 
	var svg = d3.select("#graph");

	// scaleY
	var scaleY = d3.scaleLinear();
	// J'inverse min et max car pour Y c'est inversé
	scaleY.domain([1,0]);
	scaleY.range([0,500]);

	// Axe Y
	var yAxis = d3.axisLeft(scaleY);
	var gyAxis = svg.select("#axisX");
	gyAxis.call(yAxis);
	gyAxis.attr("font-size",28);
	gyAxis.attr("transform","translate(50,50)");
	
	// scaleX
	var scaleX = d3.scaleLinear();
	scaleX.domain([0,24]);
	scaleX.range([0,1000]);
	
	// Axe X
	var xAxis = d3.axisBottom(scaleX);
	var gxAxis = svg.select("#axisY");
	gxAxis.call(xAxis.ticks(24));
	gxAxis.attr("font-size",28);
	gxAxis.attr("transform","translate(50,550)");
	
	// Ajout titres des axes
	var tmp ="";
	tmp +='<text x="550" y="620" font-size="28" fill="black" style="text-anchor: middle"  >Heure</text>';
	tmp += ' <text x="100" y="0" font-size="28" fill="black" style="text-anchor: middle"  >Flux de sève (mm/h)</text>';
	var titre_axes = document.getElementById("texte");
	titre_axes.innerHTML = tmp;	

	// line
	var lValues = d3.line();
	lValues.x(function(d,i) { return scaleX(i/2) });
	lValues.y(function(d) { return scaleY(d)});
	var gLine = svg.select(".courbe_acp")
	.attr("transform", "translate(50,50)")
	.attr("stroke", "red")
	.attr("stroke-width",2 )
	.attr("fill", "none")
	.transition()
	.duration(500)
	.on("start", function(d){
		var gPoints = document.getElementById("points_acp");
		gPoints.innerHTML = ""  ;	
	})
	.on("end", function(d){
		// Ajout des points
		cir ="";
		for (j=0;j<Y.length;j++) {
			cir +=' <circle transform = "translate(50,50)" onmouseover="drawInfoBox('+Y[j]+','+j+','+scaleX(j)+','+scaleY(Y[j])+')" onmouseleave="removeInfoBox()" 	cx="'+scaleX(j/2)+'" cy="'+scaleY(Y[j])+'" r="5" fill="red" />' ;
		}
		var gPoints = document.getElementById("points_acp");
		gPoints.innerHTML = cir  ;		
		
	})
	.attr("d", lValues(Y));		
}

function saveCurve_acp(){
    // garde la trace de la courbe sélectionnée
    var dupplicated = false; // devient true si la courbe a déjà été sauvegardée
	var graph = document.getElementById("courbes_acp");
    var curves = document.getElementsByClassName("courbe_acp");
    var oldCurve = curves[0].cloneNode(false); // courbe actuellement dessinée par l'utilisateur
    for(i=1;i<curves.length;i++){ // i débute à 1 pour ignorer la courbe que l'on souhaite sauvegarder pendant la vérification
        if(curves[i].getAttribute('d') == oldCurve.getAttribute('d')){
            dupplicated = true
        }
    }
    if(!dupplicated){
        graph.innerHTML += oldCurve.outerHTML;
		curves = document.getElementsByClassName("courbe_acp");
        for(i=1;i<curves.length;i++){
            curves[i].setAttribute("opacity",i/curves.length)
        }
    }
}

function resetCurve_acp(){
    // supprime les traces d'anciennes courbes en supprimant tous les enfants de la balise g, sauf la courbe actuellement dessinée
    graph = document.getElementById("courbes_acp");
    while (graph.childNodes.length > 2) { // 2 car le saut à la ligne compte comme un child
        graph.removeChild(graph.lastChild);
    }  
}

////////////////////////////////////// COMMUN //////////////////////////////////////////

// Info box
function drawInfoBox(datay,datax,X,Y){
	var info = '<rect  x=500 y=100 height="70" width="250" fill="grey" opacity=0.5 "/>'
	info += '<text  y=130 x =570 font-size="20" fill="black">'+'A '+(datax/2)+' Heure </text> ';
	info += '<text  y=160 x=550 font-size="20" fill="black">Flux de sève = '+Math.round(datay*100)/100+'</text> ';
	var monSVGinfo = document.getElementById("infobox");
	monSVGinfo.innerHTML = info  ; 	
	//monSVGinfo.setAttribute("transform","translate("+(X-200)+","+(Y+100)+")");	
}
function removeInfoBox(){
	var info="";
	var monSVGinfo = document.getElementById("infobox");
	monSVGinfo.innerHTML = info  ; 	
}

// Fonction pour choisir le facteur multiplicatif associé a chaque X. De 0 à 4 (0.25 : divisé par 4 à 4 : multiplié par 4)	
// Fonction qui créer les SLIDERS
dicoNomTotal = {
	"NETRAD_1h30":"Radiation nette (W m"+"-2".sup()+")",
	"P_1h":"Précipitation (mm)",
	"PA_3h":"Pression athmosphérique (kPa)",
	"PPFD_DIF_1h": "Densité de Flux Photon Photosynthetique diffuse incidente (μmol m"+"-2".sup()+" s"+"-1".sup()+")",
	"PPFD_IN_1h":"Densité de Flux Photon Photosynthetique (μmol m"+"-2".sup()+" s"+"-1".sup()+")",
	"PPFD_OUT_1h":"Densité de Flux Photon Photosynthetique réflechi (μmol m"+"-2".sup()+" s"+"-1".sup()+")",
	"RH":"Humidité relative (%)",
	"SW_IN_1h":"Radiations des ondes courtes incidentes (W m"+"-2".sup()+")",
	"SW_OUT_30m":"Radiations des ondes courtes sortantes (W m"+"-2".sup()+")",
	"TA":"Température de l'air (°C)",
	"TS":"Température du sol (°C)",
	"TS_2": "Température du sol (°C) après 2h",
	"TS_3":"Température du sol (°C) après 3h",
	"WD_1h30":"Direction du vent (Degré)",
	"WS": "Vitesse du vent (m s"+"-1".sup()+")",
	"CO2":"Concentration de CO"+"2".sub()+" (ppm)",
	"FC_1h":"Flux CO"+"2".sub()+" (μmol CO"+"2".sub()+" m"+"-2".sup()+" s"+"-1".sup()+")",
	"H_1h30":"Flux de chaleur sensible (W m"+"-2".sup()+")",
	"H2O_3h":"Eau (mmol H"+"2".sub()+"O m"+"-2".sup()+"s"+"-1".sup()+")",
	"LE_30m":"Flux de chaleur latente (W m"+"-2".sup()+")",
	"SB":"Stock de chaleur dans la biomasse (W m"+"-2".sup()+")",
	"SC_3h":"Flux de Stockage de CO"+"2".sub()+" (μmol CO"+"2".sub()+" m"+"-2".sup()+" s"+"-1".sup()+")",
	"SH_3h":"Flux de Stockage de chaleur sensible (W m"+"-2".sup()+")",
	"SLE_3h":"Flux de stockage de chaleur latente (W m"+"-2".sup()+")",
	"TAU_30m": "Momentum flux (Kg m"+"-1".sup()+"s"+"-2".sup()+")",
	"USTAR_30m":"Vitesse de frottement (m s"+"-1".sup()+")",
	"ZL_3h":"Paramètre de stabilité (sans unité)",
	"G":"Flux de chaleur du sol (W m"+"-2".sup()+")",
	"VPD":"Déficit de pression de vapeur (kPa)"}
	
function sliders() {

	d3.csv("data/puechabon/sliders/factMult_origin.csv", function(error,data){
		minFact = [];
		maxFact = [];
		step = [];
		minVal = [];
		maxVal = [];

		data.forEach(function (d){
			minFact.push(d.factMultMin);
			maxFact.push(d.factMultMax);
			step.push(d.step);
			minVal.push(d.minVal);
			maxVal.push(d.maxVal)
		})

		var ID="";
		var ID2 ="";
		var sliderSX ="";
			for (a=0;a<=13;a++) {
				// pour transposer les valeurs des facteurs multiplicateurs dans le même ordre de grandeur que celui des modalités sans modifier les sliders (pour bien recupérer le facteur multiplicateur utilisé par l'équation)
				// ... je dois stocker les différentes valeurs constitutant le slider dans un tableau, avec son minimum, son maximum, et toutes ses valeurs intérmédiaires qui dépendent du pas.
				// cela me permettra de récupérer l'indice du tableau correspondant à chaque valeur, et de l'utiliser comme coefficient multiplicateur.
				// Ex : mon slider part de 0.95 à 1.05 avec un pas de 0.025. Je veux afficher des valeurs qui vont de 390 à 450. 
				// (1.05 - 0.95) / 0.25 = 4, soit l'indice maximal de mon tableau (soit la taille du tableau - 1).
				// Je recrée les valeurs constitutant le slider en partant de la valeur de départ, et on ajoutant le pas à chaque fois, cela me donne le tableau suivant : [0.95, 0.975, 1, 1.025, 1.05].
				// Selon la position du slider, j'utiliserai l'indice du tableau pour transposer ma valeur dans le plan d'arrivée. Par example, si le slider retourne 1.025, je détermine l'indice du tableau correspondant : ici 3.
				// J'effectue ensuite l'opération suivante : 390 + 3 * (450 - 390)/4 => 435.
				// Un facteur multiplicateur de 1.025 correspond donc à 435 dans mes données.

				var rangeValues = []; // tableau qui va contenir les valeurs du sliders
				var numberValues = (maxFact[a] - minFact[a])/step[a]; // nombre de valeurs intermédiaire du range
				var i = 0;
				var value = parseFloat(minFact[a]); // min du slider converti en float
				while(i<=numberValues){
					rangeValues.push(parseFloat(value));
					value += parseFloat(step[a]); // ajout du pas à chaque itération, tant que i < valeur du slider maximum
					value = parseFloat(value.toFixed(3)); 
					i++;
                }
                if(nomX.indexOf(Object.keys(dicoNomTotal)[a])!= -1){
                    valueToPrint = factMult[nomX.indexOf(Object.keys(dicoNomTotal)[a])-1] ;
                } else if(nomXTrans.indexOf(Object.keys(dicoNomTotal)[a])!= -1){
                    valueToPrint = factMultTrans[nomXTrans.indexOf(Object.keys(dicoNomTotal)[a])-1] ;
				} else {
					valueToPrint = factMult_acp[nomX_acp.indexOf(Object.keys(dicoNomTotal)[a])-1]
				}
				var ID = "VAL"+a;
				var ID2 = "value"+a;
				printValue = parseFloat(minVal[a])+ parseFloat(rangeValues.indexOf(parseFloat(valueToPrint))*(maxVal[a] - minVal[a])/numberValues) // opération de translation
				printValue = parseFloat(printValue.toFixed(2));
				sliderSX +='<p>'+dicoNomTotal[Object.keys(dicoNomTotal)[a]]+' :  <span id="'+ID2+'">'+ printValue +'</span></p><div class="slidecontainer"><p class ="baliseInf">'+minVal[a]+'</p><input oninput="Change('+ID+','+ID2+','+a+');Change_trans('+ID+','+ID2+','+a+');Change_acp('+ID+','+ID2+','+a+')"  type="range" min="'+minFact[a]+'" max="'+maxFact[a]+'" step="'+step[a]+'" value="'+valueToPrint+'" class="slider" id="'+ID+'"><p class = "baliseSup">'+maxVal[a]+'</p></div>';
				var sliderS1 = document.getElementById("sliderS1");
				sliderS1.innerHTML = sliderSX ;
			}
		var sliderSX ="";
			for (a=14;a<=28;a++) {
				var rangeValues = [];
				var numberValues = (maxFact[a] - minFact[a])/step[a];
				var i = 0;
				var value = parseFloat(minFact[a]);
				while(i<=numberValues){
					rangeValues.push(parseFloat(value));
					value += parseFloat(step[a]);
					value = parseFloat(value.toFixed(3));
					i++;
                }
                if(nomX.indexOf(Object.keys(dicoNomTotal)[a])!= -1){
                    valueToPrint = factMult[nomX.indexOf(Object.keys(dicoNomTotal)[a])-1] ;
                } else if(nomXTrans.indexOf(Object.keys(dicoNomTotal)[a])!= -1){
                    valueToPrint = factMultTrans[nomXTrans.indexOf(Object.keys(dicoNomTotal)[a])-1] ;
                } else {
					valueToPrint = factMult_acp[nomX_acp.indexOf(Object.keys(dicoNomTotal)[a])-1]
				}
				var ID = "VAL"+a;
				var ID2 = "value"+a;
				printValue = parseFloat(minVal[a])+ parseFloat(rangeValues.indexOf(parseFloat(valueToPrint))*(maxVal[a] - minVal[a])/numberValues)
                printValue = parseFloat(printValue.toFixed(2));
                sliderSX +='<p>'+dicoNomTotal[Object.keys(dicoNomTotal)[a]]+' :  <span id="'+ID2+'">'+ printValue +'</span></p><div class="slidecontainer"><p class ="baliseInf">'+minVal[a]+'</p><input oninput="Change('+ID+','+ID2+','+a+');Change_trans('+ID+','+ID2+','+a+');Change_acp('+ID+','+ID2+','+a+')"  type="range" min="'+minFact[a]+'" max="'+maxFact[a]+'" step="'+step[a]+'" value="'+valueToPrint+'" class="slider" id="'+ID+'"><p class = "baliseSup">'+maxVal[a]+'</p></div>';
				var sliderS2 = document.getElementById("sliderS2");
				sliderS2.innerHTML = sliderSX ;
			}
		})
}

function Change(ID,ID2,a) {
	var VAL = ID.value; // valeur qu'on récuper
	var VAL2= ID2 ; // et ou est ce qu'on l'affiche 
	VAL2.innerHTML = VAL ;
    if(nomX.indexOf(Object.keys(dicoNomTotal)[a])!= -1){
		factMult[nomX.indexOf(Object.keys(dicoNomTotal)[a])-1]=VAL ;
		readTextFile();
    }
} 

function Change_trans(ID,ID2,a) {
    var VAL = ID.value; // valeur qu'on récuper
    var VAL2= ID2 ; // et ou est ce qu'on l'affiche 
    VAL2.innerHTML = VAL ;
    if(nomXTrans.indexOf(Object.keys(dicoNomTotal)[a])!= -1){
		factMultTrans[nomXTrans.indexOf(Object.keys(dicoNomTotal)[a])-1]=VAL ;
		readTextFile_trans();
    }
} 

function Change_acp(ID,ID2,a) {
	var VAL = ID.value; // valeur qu'on récuper
	var VAL2= ID2 ; // et ou est ce qu'on l'affiche 
	VAL2.innerHTML = VAL ;
	factMult[a]=VAL ;
	if(nomX_acp.indexOf(Object.keys(dicoNomTotal)[a])!= -1){
		factMult_acp[nomX_acp.indexOf(Object.keys(dicoNomTotal)[a])-1]=VAL ;
		setGraph_acp();
    }
} 