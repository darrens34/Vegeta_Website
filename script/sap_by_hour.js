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
		sliders(nomX);
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
						dataX.push(Donnee[nomX[j]][i]);	
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
	gyAxis.attr("font-size",24);
	gyAxis.attr("transform","translate(50,50)");
	
	// scaleX
	var scaleX = d3.scaleLinear();
	scaleX.domain([0,24]);
	scaleX.range([0,800]);
	
	// Axe X
	var xAxis = d3.axisBottom(scaleX);
	var gxAxis = svg.select("#axisY");
	gxAxis.call(xAxis.ticks(24));
	gxAxis.attr("font-size",24);
	gxAxis.attr("transform","translate(50,550)");
	
	// Ajout titres des axes
	var tmp ="";
	tmp +='<text x="450" y="620" font-size="28" fill="black" style="text-anchor: middle"  >Heure</text>';
	tmp += ' <text x="100" y="0" font-size="28" fill="black" style="text-anchor: middle"  >Flux de sève (mm/h)</text>';
	var titre_axes = document.getElementById("texte");
	titre_axes.innerHTML = tmp;	

	// line
	var lValues = d3.line();
	lValues.x(function(d,i) { return scaleX(i/2) });
	lValues.y(function(d) { return scaleY(d)});
	var gLine = svg.select(".courbe")
	.attr("transform", "translate(50,50)")
	.attr("stroke", "green")
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
			cir +=' <circle transform = "translate(50,50)" onmouseover="drawInfoBox('+Y[j]+','+j+','+scaleX(j)+','+scaleY(Y[j])+')" onmouseleave="removeInfoBox()" 	cx="'+scaleX(j/2)+'" cy="'+scaleY(Y[j])+'" r="5" fill="green" />' ;
		}
		var gPoints = document.getElementById("points");
		gPoints.innerHTML = cir  ;		
	})
	.attr("d", lValues(Y));		
}


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
dicoNom = {
	"PPFD_IN_1h":"Densité de Flux Photon Photosynthétique (μmol m"+"-2".sup()+" s"+"-1".sup()+")",
	"TA":"Température de l'air (°C)",
	"TS":"Température du sol (°C)",
	"WD_1h30":"Direction du vent (Degré)",
	"CO2":"Concentration de CO2 (ppm)",
	"FC_1h":"Flux CO2 (μmolCO"+"2".sub()+" m"+"-2".sup()+" s"+"-1".sup()+")",
	"LE_30m":"Flux de chaleur latente (W m"+"-2".sup()+")",
	"SH_3h":"Flux de stockage de chaleur sensible (W m"+"-2".sup()+")",
	"ZL_3h":"Paramètre de stabilité (sans unité)",
	"VPD":"Déficit de pression de vapeur (kPa)"
	}

function sliders(nomX) {

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

		var ID="";
		var ID2 ="";
		var sliderSX ="";
			for (a=0;a<=4;a++) {
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
				var ID = "VAL"+a;
				var ID2 = "value"+a;
				var b = (a+1);
				printValue = parseFloat(minVal[a])+ parseFloat(rangeValues.indexOf(parseFloat(factMult[a]))*(maxVal[a] - minVal[a])/numberValues) // opération de translation
				printValue = parseFloat(printValue.toFixed(2));
				sliderSX +='<p>'+dicoNom[nomX[b]]+' :  <span id="'+ID2+'">'+ printValue +'</span></p><div class="slidecontainer"><p class ="baliseInf">'+minVal[a]+'</p><input oninput="Change('+ID+','+ID2+','+a+')"  type="range" min="'+minFact[a]+'" max="'+maxFact[a]+'" step="'+step[a]+'" value="'+factMult[a]+'" class="slider" id="'+ID+'"><p class = "baliseSup">'+maxVal[a]+'</p></div>';
				var sliderS1 = document.getElementById("sliderS1");
				sliderS1.innerHTML = sliderSX ;
			}
		var sliderSX ="";
			for (a=5;a<=9;a++) {
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
				var ID = "VAL"+a;
				var ID2 = "value"+a;
				var b = (a+1);
				printValue = parseFloat(minVal[a])+ parseFloat(rangeValues.indexOf(parseFloat(factMult[a]))*(maxVal[a] - minVal[a])/numberValues)
				printValue = parseFloat(printValue.toFixed(2));
				sliderSX +='<p>'+dicoNom[nomX[b]]+' :  <span id="'+ID2+'">'+ printValue +'</span></p><div class="slidecontainer"><p class ="baliseInf">'+minVal[a]+'</p><input oninput="Change('+ID+','+ID2+','+a+')"  type="range" min="'+minFact[a]+'" max="'+maxFact[a]+'" step="'+step[a]+'" value="'+factMult[a]+'" class="slider" id="'+ID+'"><p class = "baliseSup">'+maxVal[a]+'</p></div>';
				var sliderS2 = document.getElementById("sliderS2");
				sliderS2.innerHTML = sliderSX ;
			}
		})
}

function Change(ID,ID2,a) {
	var VAL = ID.value; // valeur qu'on récuper
	var VAL2= ID2 ; // et ou est ce qu'on l'affiche 
	VAL2.innerHTML = VAL ;
	factMult[a]=VAL ;
	readTextFile(factMult);
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