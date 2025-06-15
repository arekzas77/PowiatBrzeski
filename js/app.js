const map = L.map('map',{
  zoomSnap: 0.5,	
  maxZoom:16,
	minZoom:10,
	zoomSnap:1,
  zoomControl:false});

map.setView([50, 20.65], 10);

//Extend ZoomBar - Adbutton "Start map"
L.Control.MyZoomBar = L.Control.Zoom.extend({
	onAdd: function(map) {
				const container = L.Control.Zoom.prototype.onAdd.call(this, map);
				// Dodaj nowy przycisk
				const startMap = L.DomUtil.create('a', 'leaflet-control-zoom-bar', container);
				startMap.innerHTML = '<img src="css/images/home.png" style="margin-top:2px">';
				startMap.href = '#';
				startMap.title = 'Mapa startowa';
				L.DomEvent.on(startMap, 'click', this._zoomToStart, this);
				container.prepend(startMap);
				return container;
			},
	_zoomToStart: function(e) {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
        map.setView([50, 20.65], 10);
    }
});
	
map.addControl(new L.Control.MyZoomBar());
L.control.measure().addTo(map);  //pomiar odleglosci powierzchni
L.control.scale({imperial:false}).addTo(map);

const obreby=L.tileLayer('tiles/obreby/{z}/{x}/{y}.png',{maxNativeZoom:14,maxZoom:16,minZoom:13,transparent:true}).addTo(map);
const jednostkiEwidencyjne=L.tileLayer('tiles/JE/{z}/{x}/{y}.png',{maxNativeZoom:13,maxZoom:14,minZoom:11,transparent:true}).addTo(map);
const powiat=L.tileLayer('tiles/powiat/{z}/{x}/{y}.png',{maxNativeZoom:11,maxZoom:12,minZoom:10,transparent:true}).addTo(map);


const googleHybrid = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',{
	maxZoom: 18,
	subdomains:['mt0','mt1','mt2','mt3'],
	attribution: '&copy; <a href="https://www.google.com/intl/pl_pl/help/terms_maps/">Dane mapy Google 2024</a>'
	});			
const googleStreets = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{
	maxZoom: 18,
	subdomains:['mt0','mt1','mt2','mt3'],
	attribution: '&copy; <a href="https://www.google.com/intl/pl_pl/help/terms_maps/">Dane mapy Google 2024</a>'
	});
const openStreet=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 18,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
const beztla = L.tileLayer('',{maxZoom: 18});

const baseMaps = {
	'Google zdjęcia':googleHybrid,
	'Google mapa':googleStreets,
 	'OpenStreet': openStreet,
 	'Brak': beztla};

	 const overlayMap={
		"<img src='css/images/obreby_legend.png' align=top style='margin:4px 4px 2px 0px'>Obręby":obreby,
		"<img src='css/images/je_legend.png' align=top style='margin:4px 4px 2px 0px'>Jednostki ewidencyjne":jednostkiEwidencyjne,
		"<img src='css/images/pow_legend.png' align=top style='margin:4px 4px 2px 0px'>Powiaty":powiat
	}


const layerControl = L.control.layers(baseMaps,overlayMap).addTo(map);
map.on("zoom",()=>{let currentzoom = map.getZoom();
	console.log(currentzoom)});

getCommunities();

//Popup for Obreby GeoJson
async function renderObrebyGeoJson() {
  const url = 'GeoJson/obreby_labels.geojson';
  const response = await fetch(url);
  const obreby = await response.json();
	obreby.features.forEach((feature)=>{feature.properties['TERYT_OBREB']=`${feature.properties.JPT_KOD_JE} ${feature.properties.JPT_NAZWA_}`});
	
  const layerGeojsonObreby=L.geoJson(obreby,{
		onEachFeature: function(feature,layer){
			layer.on("mouseover",()=>addTextToDiv(`<b>TERYT: </b>${feature.properties.JPT_KOD_JE}<br><b>Jednostka: </b>${feature.properties.JE_NAZWA}<br><b>Obręb: <span style='color:red'>${feature.properties.JPT_NAZWA_}</b></span>`))
			layer.on("mouseout",()=>{const markerPlace = document.querySelector(".info-marker-position"); markerPlace.style.display='none'})
			layer.bindPopup(`<b>TERYT: </b>${feature.properties.JPT_KOD_JE}<br><b>Jednostka: </b>${feature.properties.JE_NAZWA}<br><b>Obręb: <span style='color:red'>${feature.properties.JPT_NAZWA_}</b></span>`)
		},	
		style: {color:"transparent",opacity:0}
	}).addTo(map);
	putObrebyToControlSearch(layerGeojsonObreby)
} 
renderObrebyGeoJson();

//hover gmina => attributes in div
function addTextToDiv(text) {
	const mediaQuery = window.matchMedia('(min-width: 720px)')
  const markerPlace = document.querySelector(".info-marker-position");
	if(map.getZoom()>10 && mediaQuery.matches){markerPlace.style.display='block';
  markerPlace.innerHTML = text;}
	else{markerPlace.style.display='none'}
}


//Popup for JE GeoJson
async function renderJednostkiGeoJson() {
  const url = 'GeoJson/JE_labels.geojson';
  const response = await fetch(url);
  const gminy = await response.json();
	gminy.features.forEach((feature)=>{feature.properties['TERYT_GMINA']=`${feature.properties.JPT_KOD_JE} ${feature.properties.JPT_NAZWA_}`})
	function checkStatus(status){
		if (status==='W TRAKCIE REALIZACJI'){
			return 'blue'}
		else if(status==='AKCEPTACJA SP'){
			return 'green'}
		else if(status==='NIE ZACZĘTE'){
			return 'red'}
		else if(status==='KONTROLA SP'){
			return 'darkorange'}	
	}
	
	
  const layerGeojsonGminy=L.geoJson(gminy,{
		onEachFeature: function(feature,layerGminy){
			layerGminy.on("mouseover",()=>addTextToDiv(`<b>TERYT: </b>${feature.properties.JPT_KOD_JE}<br><b>Jednostka: <span style='color:${checkStatus(feature.properties.STATUS)}'>${feature.properties.JPT_NAZWA_}</b></span><br><b>Ilość obrębów: </b>${feature.properties.Ilosc_obr}<br><b>WYSYŁKA: <span style='color:${checkStatus(feature.properties.STATUS)}'>${feature.properties.Termin}</span></b><br><b>STATUS: <span style='color:${checkStatus(feature.properties.STATUS)}'>${feature.properties.STATUS}</span></b>`))
			layerGminy.on("mouseout",()=>{const markerPlace = document.querySelector(".info-marker-position"); markerPlace.style.display='none'})
			layerGminy.bindPopup(`<b>TERYT: </b>${feature.properties.JPT_KOD_JE}<br><b>Jednostka: <span style='color:${checkStatus(feature.properties.STATUS)}'>${feature.properties.JPT_NAZWA_}</b></span><br><b>Ilość obrębów: </b>${feature.properties.Ilosc_obr}<br><b>WYSYŁKA: <span style='color:${checkStatus(feature.properties.STATUS)}'>${feature.properties.Termin}</span></b><br><b>STATUS: <span style='color:${checkStatus(feature.properties.STATUS)}'>${feature.properties.STATUS}</span></b>`)
		},	
		style: {color:'transparent', opacity: 0}
}).addTo(map);
	//putGminyToControlSearch(layerGeojsonGminy)
} 
renderJednostkiGeoJson();

//Search HTML
const formEl=document.querySelector('.js-search');
const searchBtnEl=document.querySelector('.js-search-btn');
const selectCommunityEl=document.querySelector('#js-community');
selectCommunityEl.addEventListener('change',getDistrictsCadastral);
searchBtnEl.addEventListener('click',()=>{(layerGeojson)?layerGeojson.remove():null;toggleContainer(formEl)});

function toggleContainer(container){
	container.classList.toggle("show")
}

async function getCommunities(){
	const selectCommunityEl= document.querySelector('#js-community');
	const selectDistrictCadastralEl= document.querySelector('#js-district-cadastral');
	selectDistrictCadastralEl.innerHTML='<option value="initial">Wybierz obręb</option>';
	selectDistrictCadastralEl.disabled=true;
	const url='GeoJson/JE_centroidy.geojson'
	const response=await fetch(url);	
	const jsonres=await response.json();
	const communityArr= jsonres.features.map((item)=>item.properties).sort((a,b)=>a.JPT_NAZWA_>b.JPT_NAZWA_);
	let communityOptionsHtml='<option value="initial">Wybierz JE</option>';
	const selectedCommunityEl=document.querySelector('#js-community').value;
	for(const item of communityArr){
		communityOptionsHtml+=`<option value="${item.JPT_KOD_JE}">${item.JPT_NAZWA_}</option>`;
	}
	selectCommunityEl.innerHTML=communityOptionsHtml;
	selectCommunityEl==='initial'?selectCommunityEl.disabled=true:selectCommunityEl.removeAttribute('disabled');
}

async function getDistrictsCadastral(){
	const url='GeoJson/obreby_centroidy.geojson'
	const response= await fetch(url);
	const jsonres=await response.json();
	const districtCadastralArr= jsonres.features.map((item)=>item.properties).sort((a,b)=>a.JPT_NAZWA_>b.JPT_NAZWA_);
	let districtsCadastralOptionsHtml='<option value="initial">Wybierz obręb</option>';
	const selectDistrictCadastralEl= document.querySelector('#js-district-cadastral');
	const selectedCommunityEl=document.querySelector('#js-community').value;
		for(const item of districtCadastralArr){
		item.KOD_JE==selectedCommunityEl?districtsCadastralOptionsHtml+=`<option value="${item.JPT_KOD_JE}">${item.JPT_NAZWA_}</option>`:null;
	}
	selectDistrictCadastralEl.innerHTML=districtsCadastralOptionsHtml;
	selectedCommunityEl==='initial'?selectDistrictCadastralEl.disabled=true:selectDistrictCadastralEl.removeAttribute('disabled');
}	

//get geometries communities for markers
let layerGeojson;
const btnCommunityEl=document.querySelector('.js-community-btn');
btnCommunityEl.addEventListener('click', ()=>{event.preventDefault();getGeometryCommunity()});
async function getGeometryCommunity(){
	(layerGeojson)?layerGeojson.remove():null;
	let selectedGeometry;
	const selectedDistrictEl=document.querySelector('#js-community').value;
	const res=await fetch('GeoJson/JE_centroidy.geojson');
	const resJson=await res.json();
	for(const element of resJson.features){
		if(element.properties.JPT_KOD_JE==selectedDistrictEl){
			selectedGeometry=element;
			break;
			}
		}
		layerGeojson=L.geoJson(selectedGeometry).bindPopup(`<b>Gmina:</b> ${selectedGeometry.properties.JPT_NAZWA_}`).addTo(map);
		map.setView(layerGeojson.getBounds().getCenter(),12);
		console.log(layerGeojson);
		
};

const btnDistrictCadastralEl=document.querySelector('.js-district-cadastral-btn');
btnDistrictCadastralEl.addEventListener('click', ()=>{event.preventDefault();getGeometryDistrictCadastral()});
async function getGeometryDistrictCadastral(){
	(layerGeojson)?layerGeojson.remove():null;
	let selectedGeometry;
	const selectedDistrictCadastralEl=document.querySelector('#js-district-cadastral').value;
	const res=await fetch('GeoJson/obreby_centroidy.geojson');
	const resJson=await res.json();
	for(const element of resJson.features){
		if(element.properties.JPT_KOD_JE==selectedDistrictCadastralEl){
			selectedGeometry=element;
			break;
			}
		}
		layerGeojson=L.geoJson(selectedGeometry).bindPopup(`<b>Obręb:</b> ${selectedGeometry.properties.JPT_NAZWA_}`).addTo(map);
		map.setView(layerGeojson.getBounds().getCenter(),14);
		console.log(layerGeojson);
};


//support for coordinate systems
map.on("mousemove", function (e) {
	const markerPlaceWGS84 = document.querySelector(".wgs84");
	const markerPlacePozostale = document.querySelector(".pozostaleWSP");
	const crs1992proj = "+proj=tmerc +lat_0=0 +lon_0=19 +k=0.9993 +x_0=500000 +y_0=-5300000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
	let crs1992 = proj4(crs1992proj, [e.latlng.lng, e.latlng.lat]);
	const crs2000s6proj = "+proj=tmerc +lat_0=0 +lon_0=18 +k=0.999923 +x_0=6500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
	let crs2000s6 = proj4(crs2000s6proj, [e.latlng.lng, e.latlng.lat]);
	const crs2000s7proj = "+proj=tmerc +lat_0=0 +lon_0=21 +k=0.999923 +x_0=7500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
	let crs2000s7 = proj4(crs2000s7proj, [e.latlng.lng, e.latlng.lat]);
	const crs1965s1proj = "+proj=sterea +lat_0=50.625 +lon_0=21.08333333333333 +k=0.9998 +x_0=4637000 +y_0=5467000 +ellps=krass +towgs84=33.4,-146.6,-76.3,-0.359,-0.053,0.844,-0.84 +units=m +no_defs";
	let crs1965s1 = proj4(crs1965s1proj, [e.latlng.lng, e.latlng.lat]);
	let x = e.latlng.lat;
	let y = e.latlng.lng;
	let selectedUkladEl = document.querySelector(".js-wybierzUklad").value;
	if (selectedUkladEl == 'PUWG1992') {
		markerPlacePozostale.innerHTML = crs1992[0].toFixed(2) + ', ' + crs1992[1].toFixed(2)
	}
	else if (selectedUkladEl == '2000s6') {
		markerPlacePozostale.innerHTML = crs2000s6[0].toFixed(2) + ',  ' + crs2000s6[1].toFixed(2)
	}
	else if (selectedUkladEl == '2000s7') {
		markerPlacePozostale.innerHTML = crs2000s7[0].toFixed(2) + ',  ' + crs2000s7[1].toFixed(2)
	}
	else if (selectedUkladEl == '1965s1') {
		markerPlacePozostale.innerHTML = crs1965s1[0].toFixed(2) + ',  ' + crs1965s1[1].toFixed(2)
	}
	markerPlaceWGS84.innerHTML = '<span style="font-weight:700">WGS 84	</span>' + '<span style="font-weight:700">X: </span>' + x.toFixed(6) + '<span style="font-weight:700"> Y: </span>' + y.toFixed(6)})


//Control Search for obręby
const initialObreb={
	"type": "FeatureCollection",
	"name": "obreby",
	"crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
	"features": [
{ "type": "Feature", "properties": { "JPT_NAZWA_": "Wyszukaj obręb..." }, "geometry": { "type": "Point", "coordinates": [ 20.65, 50 ] } },
	]
};
const testObreb= new L.geoJson(initialObreb);

function putObrebyToControlSearch(layer){
	const controlSearch= new L.Control.Search({
		layer: layer,
		collapsed: false,
		initial: false,
		hideMarkerOnCollapse: true,
		container:"js-search",
		textPlaceholder: "Wyszukaj obreb",
		propertyName: 'TERYT_OBREB'});
	map.addControl(controlSearch);
}


				