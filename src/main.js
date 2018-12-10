/**
 * @author Cameron Hejna / https://www.camhejna.com
 * 07.07.2017
 *
 * TODO--->
 * 
 * fix the buildings!
 *
 * add fog
 *
 * in Lower Right corner, add link to Fair Use (c) block (SOMEWHERE, maybe index.html as well)
 * 
 */

//used simples: 

/*---CHECKS---*/
//webGL check
if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

//mobile check
console.log(isMobile);
//console.log(Date.now());

/*---DECLARATIONS---*/
//basic variables
var scene, camera, renderer;
var mouse;
var renderSize;
var time, lookAt;

//geometry variables
var backgroundLoader, backgroundTexture;
var sphere, sphereGeometry, sphereMaterial;
var rain, rainMaterial, rainMap, rainCount;
//var city, cityGeo, cityMatLoader, cityMatTex, cityMat, cityCount;
var city, cityLoader;
var pointLight;

//DEBUG
var grid, gridMaterial, gridGeometry;

//animate variables
var mover, positions, numPos, stage;

//audio variables
//var center = document.getElementById("center");
var lower = document.getElementById("lower");
var upper = document.getElementById("upper");
var left = document.getElementById("left");
var right = document.getElementById("right");
//var right2 = document.getElementById("right2");

/*---FUNCTIONS---*/

//Initialize & related
function init(){
	//basics
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 1500 );
	camera.position.set(0, 385, 400);
	lookAt = new THREE.Object3D();
	lookAt.position.set(0, 25, 0);
	camera.lookAt( lookAt );
	renderer = new THREE.WebGLRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
	setRenderSize();
	document.body.appendChild( renderer.domElement );
	mouse = new THREE.Vector2(0.0, 0.0);
	renderSize = new THREE.Vector2(0.0, 0.0);
	time = 0.0;
	
	//DEBUG
	//controls
	//var controls = new THREE.OrbitControls( camera, renderer.domElement );
	
	//background
	backgroundLoader = new THREE.TextureLoader();
	backgroundLoader.setPath( 'textures/' );
	backgroundTexture = backgroundLoader.load( 'background.png' );
	scene.background = backgroundTexture;
	
	//DEBUG
	//grid init
	/*
	grid = [];
	gridGeometry = new THREE.BoxGeometry( 1000, 5, 5 );
	gridMaterial = new THREE.MeshBasicMaterial( {color: 0xffffff} );
	for(var a = 0; a < 11; a++){
		grid[a] = new THREE.Mesh( gridGeometry, gridMaterial);
		grid[a].position.x = 0;
		grid[a].position.y = 20;
		grid[a].position.z = 500 - a * 100;
		scene.add(grid[a]);
	}
	//gridGeometry = new THREE.PlaneGeometry( 1, 250 );
	for( var b = 11; b < 22; b++){
		grid[b] = new THREE.Mesh( gridGeometry, gridMaterial);
		grid[b].rotation.y = 1.57;
		grid[b].position.x = 500 - (b-11)*100; //+ b * 25;
		grid[b].position.y = 20;
		grid[b].position.z = 0;
		scene.add(grid[b]);	
	}
	*/
	
	//mover init
	mover = new THREE.Object3D();
	mover.position.set( 0, 0, 0 );
	positions = {
		moverPos: [
			new THREE.Vector3( 0, 50, 0 ),
			new THREE.Vector3( 260, 25, -120 ),
			new THREE.Vector3( -200, 15, 0 )
		],
		cameraPos: [
			new THREE.Vector3( 50, 200, 100 ),
			new THREE.Vector3( 160, 225, -250 ),
			new THREE.Vector3( -300, 75, 0 )
		],
		totalStages: 3,
		currentStage: 0,
	};
	
	console.log(positions.moverPos.length);
	
	console.log(positions);
	
	console.log( positions.moverPos[0].distanceTo( positions.moverPos[1] ) );
		
	//rain init
	rainCount = 10000;
	rainMap = new THREE.TextureLoader().load( "textures/spark1.png" );
	rainMaterial = new THREE.SpriteMaterial({map: rainMap, color: 0xffffff});
	rain = [];
	for( var i = 0; i < rainCount; i++ ){
		rain[i] = new THREE.Sprite( rainMaterial );
		rain[i].scale.y = 10;
		rain[i].scale.x = 0.5
		rain[i].position.x = 1000 * Math.random() - 500;
		rain[i].position.y = window.innerHeight * Math.random() + 200;
		rain[i].position.z = 1000 * Math.random() - 500;
		//rain[i].position.z = (camera.position.z * 0.9) * Math.random( - camera.position.z/2);
		rain[i].originalY = rain[i].position.y;
		scene.add(rain[i]);
		//var loc = new THREE.Vector3( rain[i].position.x, rain[i].position.y, rain[i].position.z);
		//console.log(loc);
	}
	
	//city init
	var city = [];
	var cityLoader = [];
	
	//backend...
	//adjust this as necessary...
	for(var k = 0; k < 4; k++){
		city[k] = [];
	}
	cityLoader[0] = new THREE.OBJLoader();
	cityLoader[1] = new THREE.MTLLoader();	
	cityLoader[2] = new THREE.TDSLoader();
	cityLoader[3] = new THREE.TextureLoader();
	//add more loaders here when necessary
	
	//[0]. bungalows
	cityLoader[1].load( 
		'models/bungalow/bg4_obj.mtl',
		function( bungalowMat ){
			
			cityLoader[0].setMaterials( bungalowMat );
			//console.log(bungalowMat);
			
			cityLoader[0].load(
				'models/bungalow/bg4_obj.obj',
				function( bungalow ) {
					//DEBUG
					//bungalow.position.set( 300, 200, 300 );
					//scene.add(bungalow);
					for(var j = 0; j < 50; j++){
						
						city[0][j] = new THREE.Object3D();
						city[0][j].copy( bungalow, true );
						
						//generate coordinates
						city[0][j].genX = 300 * Math.random() + 50;
						if( Math.round( Math.random() ) ){
							city[0][j].genX *= -1;
						}
						//console.log(city[0][j].genX);
						city[0][j].genZ = 300 * Math.random() + 50;
						if( Math.round( Math.random() ) ){
							city[0][j].genZ *= -1;
						}
						city[0][j].position.set( city[0][j].genX, -6 * Math.random() - 2, city[0][j].genZ );
						
						city[0][j].rotateX( 0.26166 * Math.random() );
						city[0][j].rotateY( 3.14 * Math.random() );
						city[0][j].rotateZ( 0.26166 * Math.random() );
						
						scene.add(city[0][j]);
					}
				}
			);
		}
	);
	
	//[1]. skycraper #1
	cityLoader[1].load( 
		'models/skyscraper1/skyscraper.mtl',
		function( s1Mat ){
			
			cityLoader[0].setMaterials( s1Mat );
			//console.log(s1Mat);
			
			cityLoader[0].load(
				'models/skyscraper1/skyscraper.obj',
				function( s1 ) {
					for(var k = 0; k < 20; k++){
						
						city[1][k] = new THREE.Object3D();
						city[1][k].copy( s1, true );
						
						//generate coordinate
						city[1][k].genX = 350 * Math.random() + 50;
						if( Math.round( Math.random() ) ){
							city[1][k].genX *= -1;	
						}
						city[1][k].genZ = 350 * Math.random() + 50;
						if( Math.round( Math.random() ) ){
							city[1][k].genZ *= -1;	
						}
						city[1][k].position.set( city[1][k].genX, -6 * Math.random() - 2, city[1][k].genZ );
						
						city[1][k].rotateX( 0.26166 * Math.random() );
						city[1][k].rotateY( 3.14 * Math.random() );
						city[1][k].rotateZ( 0.26166 * Math.random() );
						
						var sky1Scale = 10 * Math.random() + 7;
						city[1][k].scale.set( sky1Scale, sky1Scale, sky1Scale);
						
						scene.add(city[1][k]);
					}
				}
			);
		} 
	);
	
	//[2]. skyscraper #2
	cityLoader[2].load(
		'models/skyscraper2/SkyA.3DS',
		function( s2 ){
			s2.scale.set( 0.3, 0.3, 0.3 );
			s2.rotateX(-1.57);
			scene.add(s2);
		}
	);
	
	//Water init
	initWater(renderer, scene, camera);
	
	//Glboal Lights
	light = new THREE.PointLight( 0xffffff, 1, 0, 2);
	light.position.set( 0, 500, 100);
	scene.add( light );
	
	//listener events
	document.addEventListener("mousemove", onMouseMove, false);
	window.addEventListener("resize", onWindowResize, false);	
	
	//DEBUG
	document.addEventListener("keydown", onKey, false);
	
	Pace.on( 'done', function(){
		Pace.stop;
		render();
		//
		console.log("loaded");
	});
}

//Event Listeners
function onWindowResize(event){
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

function onMouseMove(event){
	//mouse x & y should have a range of 0 to 1
	mouse.x = event.clientX / window.innerWidth;  
    mouse.y = event.clientY / window.innerHeight;
}

//DEBUG
function onKey(event){
	//press 'c'
	if(event.keyCode == 67 ){
		console.log(camera.position);
	}
	//press 'r'
	if(event.keyCode == 82){
		console.log(camera.rotation);
	}
}

//miscellaneous	
function setRenderSize(){
    renderSize = new THREE.Vector2(window.innerWidth, window.innerHeight);
}

//Handlers
function handleAudio(){

	
	lower.volume = mouse.y;
	upper.volume = 1.0 - mouse.y;
	left.volume = 1.0 - mouse.x;
	right.volume = mouse.x;

	lower.play();
	upper.play();
	left.play();
	right.play();
}

function handleAudioWorkAround(){
	if(lower.paused){
		lower.play();	
	}
	if(upper.paused){
		upper.play();	
	}
	if(left.paused){
		left.play();
	}
	if(right.paused){
		right.play();	
	}
	
	console.log("extra handler fired");
}
		
function handleRain(){
	for( var r = 0; r < rainCount; r++) {
		if( ! (rain[r].position.y <= -(rain[r].originalY) ) ){ 
			rain[r].position.y -= 5; 
		} else {
			rain[r].position.y = rain[r].originalY;
		}	
	}	
}

function handleMover(){
	
	camera.position.x = 500 * Math.sin( time * 0.001 );
	camera.position.z = 500 * Math.cos( time * 0.001 );
	
	camera.lookAt( lookAt.position );
	
	//console.log( camera.position );
}

function render(){
	requestAnimationFrame( render );
	renderer.render( scene, camera );
	setRenderSize();
	
	// Do the gpu computation
	gpuCompute.compute();

	// Get compute output in custom uniform
	waterUniforms.heightmap.value = gpuCompute.getCurrentRenderTarget( heightmapVariable ).texture;

	handleAudio();
	handleRain();
	handleMover();
	
	time++;
}

/*---RUN---*/
init();

/*---EOF---*/